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
    
    // Support both HTTP and HTTPS protocols (for cloud services)
    const protocol = process.env.CLICKHOUSE_PROTOCOL || 'http';
    const useHttps = protocol.toLowerCase() === 'https';

    console.log(`[ClickHouse] Connecting to ${protocol}://${host}:${port}, database: ${database}, user: ${username}`);

    try {
      // ClickHouse client configuration
      // For ClickHouse Cloud, use the full URL with protocol
      const url = `${protocol}://${host}:${port}`;
      const clientConfig: any = {
        url, // Use 'url' instead of 'host' (fixes deprecation warning)
        database,
        username,
      };
      
      // Handle password - ensure it's properly trimmed and set
      // ClickHouse Cloud requires the password to be set explicitly
      const trimmedPassword = password ? password.trim() : '';
      if (trimmedPassword.length > 0) {
        clientConfig.password = trimmedPassword;
      } else {
        // Use empty string for no password (ClickHouse allows empty password)
        clientConfig.password = '';
      }
      
      // For HTTPS connections, configure SSL/TLS
      if (useHttps) {
        clientConfig.request_timeout = 30000; // 30 seconds timeout for cloud connections
        // ClickHouse client automatically handles HTTPS when URL uses https://
        // For cloud services, we may need to disable SSL verification in some cases
        // but it's better to use proper certificates
      }
      
      // Log configuration (without exposing full password)
      console.log(`[ClickHouse] Creating client with config:`, {
        url: clientConfig.url,
        database: clientConfig.database,
        username: clientConfig.username,
        hasPassword: clientConfig.password !== undefined && clientConfig.password.length > 0,
        passwordLength: clientConfig.password ? clientConfig.password.length : 0,
        protocol: protocol,
      });
      
      // Additional debug: log first and last character of password (for troubleshooting)
      if (trimmedPassword.length > 0) {
        console.log(`[ClickHouse] Password check: length=${trimmedPassword.length}, startsWith=${trimmedPassword.substring(0, 2)}...`);
      }
      
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
          lessonId String,
          eventType String,
          timestamp DateTime DEFAULT now(),
          currentTime Float32,
          fullDuration Float32,
          device String,
          categoryRole String,
          sessionId UUID,
          playbackQuality String
        ) ENGINE = MergeTree()
        ORDER BY (videoId, lessonId, timestamp)
        PARTITION BY toYYYYMM(timestamp)
      `,
    });
    console.log('ClickHouse events_raw table initialized');
    
    // Try to add lessonId column if it doesn't exist (for existing tables)
    // ClickHouse doesn't support IF NOT EXISTS for ALTER TABLE, so we check first
    try {
      // Check if lessonId column exists by trying to query it
      await client.query({
        query: `SELECT lessonId FROM events_raw LIMIT 0`,
        format: 'JSONEachRow',
      });
      console.log('ClickHouse events_raw table already has lessonId column');
    } catch (e: any) {
      // Column doesn't exist, try to add it
      if (e?.message?.includes('Missing columns') || e?.message?.includes('lessonId')) {
        try {
          await client.exec({
            query: `ALTER TABLE events_raw ADD COLUMN lessonId String DEFAULT ''`,
          });
          console.log('ClickHouse events_raw table: Added lessonId column');
        } catch (alterError) {
          console.warn('Could not add lessonId column to events_raw table:', alterError);
        }
      }
    }

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
    // Drop existing view if it has the wrong structure
    try {
      await client.exec({
        query: `DROP VIEW IF EXISTS video_statistics_daily_mv`,
      });
    } catch (e) {
      // Ignore if view doesn't exist
    }
    
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
          COALESCE(
            (countIf(eventType = 'VIDEO_COMPLETE') * 100.0 / 
             nullIf(countIf(eventType = 'VIDEO_OPENED'), 0)),
            0.0
          ) as completionRate
        FROM events_raw
        WHERE eventType IN ('VIDEO_OPENED', 'VIDEO_PROGRESS', 'VIDEO_COMPLETE')
        GROUP BY videoId, toDate(timestamp)
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
          hour DateTime,
          bufferingEvents UInt32,
          avgQuality String,
          lastTimestamp DateTime
        ) ENGINE = MergeTree()
        ORDER BY (videoId, hour)
        PARTITION BY toYYYYMM(hour)
      `,
    });
    console.log('ClickHouse playback_quality_metrics table initialized');

    // 7. Materialized view for playback quality
    // Drop existing view if it has the wrong structure
    try {
      await client.exec({
        query: `DROP VIEW IF EXISTS playback_quality_metrics_mv`,
      });
    } catch (e) {
      // Ignore if view doesn't exist
    }
    
    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS playback_quality_metrics_mv
        TO playback_quality_metrics
        AS SELECT
          videoId,
          userId,
          toStartOfHour(timestamp) as hour,
          countIf(eventType = 'VIDEO_BUFFER') as bufferingEvents,
          argMaxIf(playbackQuality, timestamp, playbackQuality != '') as avgQuality,
          max(timestamp) as lastTimestamp
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

