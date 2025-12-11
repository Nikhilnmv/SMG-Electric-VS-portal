#!/usr/bin/env tsx
/**
 * Check Analytics Data in ClickHouse
 * 
 * This script checks if analytics events are being stored in ClickHouse.
 * Run with: pnpm --filter backend tsx scripts/check-analytics-data.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { getClickHouseClient } from '../src/services/clickhouse';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkAnalyticsData() {
  console.log('\n=== Checking Analytics Data in ClickHouse ===\n');

  try {
    const client = getClickHouseClient();

    // Check total events
    console.log('1. Checking total events...');
    const totalEventsResult = await client.query({
      query: 'SELECT count() as total FROM events_raw',
      format: 'JSONEachRow',
    });
    const totalEvents = (await totalEventsResult.json() as any[])[0]?.total || 0;
    console.log(`   Total events: ${totalEvents}`);

    if (totalEvents === 0) {
      console.log('\n⚠️  No events found in ClickHouse!');
      console.log('   This means either:');
      console.log('   - Events are being rejected (400 errors)');
      console.log('   - Events are not being sent from frontend');
      console.log('   - ClickHouse connection is failing');
      return;
    }

    // Check recent events
    console.log('\n2. Checking recent events (last 10)...');
    const recentEventsResult = await client.query({
      query: `
        SELECT 
          eventType,
          videoId,
          lessonId,
          userId,
          timestamp,
          currentTime
        FROM events_raw
        ORDER BY timestamp DESC
        LIMIT 10
      `,
      format: 'JSONEachRow',
    });
    const recentEvents = await recentEventsResult.json() as any[];
    console.log(`   Found ${recentEvents.length} recent events:`);
    recentEvents.forEach((event, i) => {
      console.log(`   ${i + 1}. ${event.eventType} - ${event.videoId || event.lessonId || 'N/A'} at ${event.timestamp}`);
    });

    // Check event types distribution
    console.log('\n3. Event types distribution...');
    const eventTypesResult = await client.query({
      query: `
        SELECT 
          eventType,
          count() as count
        FROM events_raw
        GROUP BY eventType
        ORDER BY count DESC
      `,
      format: 'JSONEachRow',
    });
    const eventTypes = await eventTypesResult.json() as any[];
    eventTypes.forEach((et) => {
      console.log(`   ${et.eventType}: ${et.count}`);
    });

    // Check videos/lessons being tracked
    console.log('\n4. Videos/Lessons being tracked...');
    const contentResult = await client.query({
      query: `
        SELECT 
          videoId,
          lessonId,
          count() as eventCount,
          uniqExact(userId) as uniqueUsers
        FROM events_raw
        WHERE videoId != '' OR lessonId != ''
        GROUP BY videoId, lessonId
        ORDER BY eventCount DESC
        LIMIT 10
      `,
      format: 'JSONEachRow',
    });
    const content = await contentResult.json() as any[];
    console.log(`   Tracking ${content.length} videos/lessons:`);
    content.forEach((c, i) => {
      const id = c.videoId || c.lessonId;
      console.log(`   ${i + 1}. ${id}: ${c.eventCount} events from ${c.uniqueUsers} users`);
    });

    // Check time range
    console.log('\n5. Data time range...');
    const timeRangeResult = await client.query({
      query: `
        SELECT 
          min(timestamp) as earliest,
          max(timestamp) as latest
        FROM events_raw
      `,
      format: 'JSONEachRow',
    });
    const timeRange = (await timeRangeResult.json() as any[])[0];
    if (timeRange) {
      console.log(`   Earliest event: ${timeRange.earliest}`);
      console.log(`   Latest event: ${timeRange.latest}`);
    }

    console.log('\n✅ Analytics data check complete!\n');
  } catch (error: any) {
    console.error('\n❌ Error checking analytics data:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check ClickHouse connection is working');
    console.error('  2. Verify backend/.env has correct ClickHouse credentials');
    console.error('  3. Check backend logs for errors');
    process.exit(1);
  }
}

checkAnalyticsData();
