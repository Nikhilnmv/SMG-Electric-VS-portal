#!/usr/bin/env tsx
/**
 * Debug Analytics Request
 * 
 * This script helps debug what's being sent to the analytics endpoint.
 * It simulates the request format that the frontend sends.
 */

import { AnalyticsEventRequestSchema } from '../src/schemas/analytics';

console.log('\n=== Testing Analytics Request Formats ===\n');

// Test 1: Lesson event (what should be sent from lesson page)
console.log('Test 1: Lesson event (VIDEO_OPENED)');
const lessonEvent = {
  lessonId: 'cmizwsorr0001mlxqop8qnmmn',
  eventType: 'VIDEO_OPENED',
  currentTime: 0,
  duration: 0,
  sessionId: 'b4212bb5-90d1-4484-b3f9-173c9e01bc61',
};

console.log('Request:', JSON.stringify(lessonEvent, null, 2));
try {
  const result = AnalyticsEventRequestSchema.parse(lessonEvent);
  console.log('✅ Validation passed!\n');
} catch (error: any) {
  console.error('❌ Validation failed!');
  if (error.errors) {
    console.error('Errors:', JSON.stringify(error.errors, null, 2));
  }
  console.error('\n');
}

// Test 2: Event with undefined fields (what might be sent)
console.log('Test 2: Event with undefined fields');
const eventWithUndefined = {
  lessonId: 'cmizwsorr0001mlxqop8qnmmn',
  eventType: 'VIDEO_OPENED',
  currentTime: undefined,
  duration: undefined,
  sessionId: 'b4212bb5-90d1-4484-b3f9-173c9e01bc61',
};

console.log('Request:', JSON.stringify(eventWithUndefined, null, 2));
try {
  const result = AnalyticsEventRequestSchema.parse(eventWithUndefined);
  console.log('✅ Validation passed!\n');
} catch (error: any) {
  console.error('❌ Validation failed!');
  if (error.errors) {
    console.error('Errors:', JSON.stringify(error.errors, null, 2));
  }
  console.error('\n');
}

// Test 3: Event with null fields
console.log('Test 3: Event with null fields');
const eventWithNull = {
  lessonId: 'cmizwsorr0001mlxqop8qnmmn',
  eventType: 'VIDEO_OPENED',
  currentTime: null,
  duration: null,
  sessionId: 'b4212bb5-90d1-4484-b3f9-173c9e01bc61',
};

console.log('Request:', JSON.stringify(eventWithNull, null, 2));
try {
  const result = AnalyticsEventRequestSchema.parse(eventWithNull);
  console.log('✅ Validation passed!\n');
} catch (error: any) {
  console.error('❌ Validation failed!');
  if (error.errors) {
    console.error('Errors:', JSON.stringify(error.errors, null, 2));
  }
  console.error('\n');
}

// Test 4: Event missing lessonId (the actual error case)
console.log('Test 4: Event missing lessonId (the error case)');
const eventMissingId = {
  eventType: 'VIDEO_OPENED',
  currentTime: 0,
  duration: 0,
  sessionId: 'b4212bb5-90d1-4484-b3f9-173c9e01bc61',
};

console.log('Request:', JSON.stringify(eventMissingId, null, 2));
try {
  const result = AnalyticsEventRequestSchema.parse(eventMissingId);
  console.log('✅ Validation passed!\n');
} catch (error: any) {
  console.error('❌ Validation failed!');
  if (error.errors) {
    console.error('Errors:', JSON.stringify(error.errors, null, 2));
  }
  console.error('\n');
}
