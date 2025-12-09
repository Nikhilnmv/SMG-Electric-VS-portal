import { createClient, ClickHouseClient } from '@clickhouse/client';

let clickhouseClient: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (!clickhouseClient) {
    const host = process.env.CLICKHOUSE_HOST || 'localhost';
    const port = process.env.CLICKHOUSE_PORT || '8123';
    const database = process.env.CLICKHOUSE_DB || 'default';
    const username = process.env.CLICKHOUSE_USER || 'default';
    // Use empty string if password is not set or is explicitly empty
    const password = process.env.CLICKHOUSE_PASSWORD === undefined 
      ? '' 
      : (process.env.CLICKHOUSE_PASSWORD || '');

    console.log(`[ClickHouse] Connecting to ${host}:${port}, database: ${database}, user: ${username}`);

    try {
      // ClickHouse client configuration
      // Use 'url' instead of deprecated 'host' parameter
      const url = `http://${host}:${port}`;
      const clientConfig: any = {
        url, // Use 'url' instead of 'host' (fixes deprecation warning)
        database,
        username,
      };
      
      // Handle password - ClickHouse client needs empty string for no password, not undefined
      // If password is not set or empty in env, use empty string
      if (password && password.trim().length > 0) {
        clientConfig.password = password;
      } else {
        // Use empty string for no password (ClickHouse allows empty password)
        clientConfig.password = '';
      }
      
      console.log(`[ClickHouse] Creating client with config:`, {
        url: clientConfig.url,
        database: clientConfig.database,
        username: clientConfig.username,
        hasPassword: clientConfig.password !== undefined,
      });
      
      clickhouseClient = createClient(clientConfig);

      // Test connection immediately
      testConnection().catch((err) => {
        console.error('[ClickHouse] Initial connection test failed:', err);
        console.error('[ClickHouse] This might be OK if ClickHouse is still starting up');
      });

      // Initialize tables on first connection
      initializeTables().catch((err) => {
        console.error('[ClickHouse] Failed to initialize ClickHouse tables:', err);
        // Don't throw - allow retry on next connection
      });
    } catch (error: any) {
      console.error('[ClickHouse] Failed to create client:', error);
      throw new Error(`ClickHouse connection failed: ${error.message}. Please check ClickHouse is running and credentials are correct.`);
    }
  }

  return clickhouseClient;
}

async function initializeTables() {
  const client = getClickHouseClient();
  
  try {
    // 1. events_raw table - main events table
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS events_raw (
          eventId UUID DEFAULT generateUUIDv4(),
          userId String,
          videoId String,
          eventType String,
          timestamp DateTime DEFAULT now(),
          currentTime Float32,
          fullDuration Float32,
          device String,
          categoryRole String,
          sessionId UUID,
          playbackQuality String
        ) ENGINE = MergeTree()
        ORDER BY (videoId, timestamp)
        PARTITION BY toYYYYMM(timestamp)
      `,
    });
    console.log('ClickHouse events_raw table initialized');

    // 2. video_statistics_daily - aggregated video stats
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS video_statistics_daily (
          videoId String,
          date Date,
          views UInt32,
          uniqueViewers UInt32,
          avgWatchTime Float32,
          completionRate Float32
        ) ENGINE = SummingMergeTree()
        ORDER BY (videoId, date)
      `,
    });
    console.log('ClickHouse video_statistics_daily table initialized');

    // 3. Materialized view to populate video_statistics_daily
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS video_statistics_daily_mv
        TO video_statistics_daily
        AS SELECT
          videoId,
          toDate(timestamp) as date,
          countIf(eventType = 'VIDEO_OPENED') as views,
          uniqExact(if(eventType = 'VIDEO_OPENED', userId, NULL)) as uniqueViewers,
          avgIf(currentTime, eventType = 'VIDEO_PROGRESS') as avgWatchTime,
          (countIf(eventType = 'VIDEO_COMPLETE') * 100.0 / 
           nullIf(countIf(eventType = 'VIDEO_OPENED'), 0)) as completionRate
        FROM events_raw
        WHERE eventType IN ('VIDEO_OPENED', 'VIDEO_PROGRESS', 'VIDEO_COMPLETE')
        GROUP BY videoId, date
      `,
    });
    console.log('ClickHouse video_statistics_daily materialized view initialized');

    // 4. user_statistics_daily - user activity stats
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS user_statistics_daily (
          userId String,
          date Date,
          totalWatchTime Float32,
          videosCompleted UInt32,
          focusModeTime Float32
        ) ENGINE = SummingMergeTree()
        ORDER BY (userId, date)
      `,
    });
    console.log('ClickHouse user_statistics_daily table initialized');

    // 5. Materialized view to populate user_statistics_daily
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS user_statistics_daily_mv
        TO user_statistics_daily
        AS SELECT
          userId,
          toDate(timestamp) as date,
          sumIf(currentTime, eventType = 'VIDEO_PROGRESS') as totalWatchTime,
          countIf(eventType = 'VIDEO_COMPLETE') as videosCompleted,
          sumIf(currentTime, eventType = 'FOCUS_MODE_START') as focusModeTime
        FROM events_raw
        WHERE userId != '' AND eventType IN ('VIDEO_PROGRESS', 'VIDEO_COMPLETE', 'FOCUS_MODE_START')
        GROUP BY userId, date
      `,
    });
    console.log('ClickHouse user_statistics_daily materialized view initialized');

    // 6. playback_quality_metrics - quality and buffering stats
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS playback_quality_metrics (
          videoId String,
          userId String,
          bufferingEvents UInt32,
          avgQuality String,
          timestamp DateTime
        ) ENGINE = MergeTree()
        ORDER BY (videoId, timestamp)
        PARTITION BY toYYYYMM(timestamp)
      `,
    });
    console.log('ClickHouse playback_quality_metrics table initialized');

    // 7. Materialized view for playback quality
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS playback_quality_metrics_mv
        TO playback_quality_metrics
        AS SELECT
          videoId,
          userId,
          countIf(eventType = 'VIDEO_BUFFER') as bufferingEvents,
          argMaxIf(playbackQuality, timestamp, playbackQuality != '') as avgQuality,
          max(timestamp) as timestamp
        FROM events_raw
        WHERE eventType IN ('VIDEO_BUFFER', 'VIDEO_PROGRESS')
        GROUP BY videoId, userId, toStartOfHour(timestamp)
      `,
    });
    console.log('ClickHouse playback_quality_metrics materialized view initialized');

    // Legacy table for backward compatibility
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS analytics_events (
          eventId UUID DEFAULT generateUUIDv4(),
          eventTime DateTime DEFAULT now(),
          userId String,
          videoId String,
          eventType String,
          progressSeconds Int32,
          deviceInfo String
        ) ENGINE = MergeTree()
        ORDER BY (eventTime, videoId, userId)
      `,
    });
    console.log('ClickHouse analytics_events table (legacy) initialized');
  } catch (error) {
    console.error('Error initializing ClickHouse tables:', error);
    throw error;
  }
}

async function testConnection() {
  if (!clickhouseClient) {
    return; // Client not created yet
  }
  
  try {
    const result = await clickhouseClient.query({
      query: 'SELECT 1 as test',
      format: 'JSONEachRow',
    });
    const data = await result.json();
    console.log('[ClickHouse] Connection test successful');
    return true;
  } catch (error: any) {
    console.error('[ClickHouse] Connection test failed:', error.message);
    if (error.message && error.message.includes('Authentication failed')) {
      console.error('[ClickHouse] ⚠ AUTHENTICATION ERROR DETECTED:');
      console.error('[ClickHouse] Solutions:');
      console.error('[ClickHouse] 1. Ensure CLICKHOUSE_PASSWORD= is empty in backend/.env');
      console.error('[ClickHouse] 2. Restart ClickHouse: docker restart vs-platform-clickhouse');
      console.error('[ClickHouse] 3. Or reset ClickHouse container (see docs/CLICKHOUSE_SETUP.md)');
    }
    // Don't throw - allow initialization to continue
    return false;
  }
}

export async function closeClickHouseClient() {
  if (clickhouseClient) {
    await clickhouseClient.close();
    clickhouseClient = null;
  }
}

