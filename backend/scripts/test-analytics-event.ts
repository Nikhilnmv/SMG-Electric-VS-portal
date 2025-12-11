#!/usr/bin/env tsx
/**
 * Test Analytics Event Format
 * 
 * This script tests what format the analytics event should be in.
 * Run with: pnpm --filter backend tsx scripts/test-analytics-event.ts
 */

import { AnalyticsEventRequestSchema } from '../src/schemas/analytics';

// Test with a lesson ID (CUID format)
const testEvent = {
  lessonId: 'cmizwsorr0001mlxqop8qnmmn',
  eventType: 'VIDEO_PLAY',
  currentTime: undefined, // This is what frontend sends
  device: undefined,
};

console.log('\n=== Testing Analytics Event Format ===\n');
console.log('Test event:', JSON.stringify(testEvent, null, 2));

try {
  const result = AnalyticsEventRequestSchema.parse(testEvent);
  console.log('\n✅ Validation passed!');
  console.log('Parsed result:', JSON.stringify(result, null, 2));
} catch (error: any) {
  console.error('\n❌ Validation failed!');
  if (error.errors) {
    console.error('Errors:', JSON.stringify(error.errors, null, 2));
  } else {
    console.error('Error:', error.message);
  }
}
