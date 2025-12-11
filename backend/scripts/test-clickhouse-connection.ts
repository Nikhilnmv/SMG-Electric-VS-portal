#!/usr/bin/env tsx
/**
 * Test ClickHouse Cloud Connection
 * 
 * This script tests the connection to ClickHouse Cloud with the configured credentials.
 * Run with: pnpm --filter backend tsx scripts/test-clickhouse-connection.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@clickhouse/client';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - try multiple paths
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}`);
  // Try loading from current working directory
  dotenv.config();
}

async function testConnection() {
  console.log('\n=== ClickHouse Cloud Connection Test ===\n');

  // Get configuration from environment
  const protocol = process.env.CLICKHOUSE_PROTOCOL || 'http';
  const host = process.env.CLICKHOUSE_HOST || 'localhost';
  const port = process.env.CLICKHOUSE_PORT || '8123';
  const database = process.env.CLICKHOUSE_DB || 'default';
  const username = process.env.CLICKHOUSE_USER || 'default';
  const password = process.env.CLICKHOUSE_PASSWORD || '';

  // Display configuration (mask password)
  console.log('Configuration:');
  console.log(`  Protocol: ${protocol}`);
  console.log(`  Host: ${host}`);
  console.log(`  Port: ${port}`);
  console.log(`  Database: ${database}`);
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${password ? '***' + password.substring(password.length - 2) : '(empty)'}`);
  console.log(`  Password Length: ${password.length}`);
  console.log(`  Password (raw): ${JSON.stringify(password)}`);
  console.log('');

  // Check if required values are set
  if (!host || host === 'localhost') {
    console.error('❌ ERROR: CLICKHOUSE_HOST is not set or is still localhost');
    console.error('   Please set CLICKHOUSE_HOST in backend/.env');
    process.exit(1);
  }

  if (!password || password.trim().length === 0) {
    console.error('❌ ERROR: CLICKHOUSE_PASSWORD is not set or is empty');
    console.error('   Please set CLICKHOUSE_PASSWORD in backend/.env');
    process.exit(1);
  }

  // Create client
  const url = `${protocol}://${host}:${port}`;
  console.log(`Connecting to: ${url}`);
  console.log('');

  const client = createClient({
    url,
    database,
    username,
    password: password.trim(),
    request_timeout: 30000,
  });

  try {
    // Test 1: Simple query
    console.log('Test 1: Simple SELECT query...');
    const result1 = await client.query({
      query: 'SELECT 1 as test',
      format: 'JSONEachRow',
    });
    const data1 = await result1.json();
    console.log('✅ Test 1 passed:', data1);

    // Test 2: Get ClickHouse version
    console.log('\nTest 2: Get ClickHouse version...');
    const result2 = await client.query({
      query: 'SELECT version() as version',
      format: 'JSONEachRow',
    });
    const data2 = await result2.json();
    console.log('✅ Test 2 passed:', data2);

    // Test 3: List databases
    console.log('\nTest 3: List databases...');
    const result3 = await client.query({
      query: 'SHOW DATABASES',
      format: 'JSONEachRow',
    });
    const data3 = await result3.json();
    console.log('✅ Test 3 passed:', data3);

    console.log('\n✅ All tests passed! ClickHouse Cloud connection is working.\n');
    
    await client.close();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Connection test failed!\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    
    if (error.message.includes('Authentication failed')) {
      console.error('  - Check that CLICKHOUSE_PASSWORD in .env matches your ClickHouse Cloud password');
      console.error('  - Ensure there are no quotes around the password in .env');
      console.error('  - Verify the password in ClickHouse Cloud dashboard');
      console.error('  - Try resetting the password in ClickHouse Cloud if needed');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('  - Check that CLICKHOUSE_HOST is correct');
      console.error('  - Verify CLICKHOUSE_PORT is correct (8443 for HTTPS)');
      console.error('  - Ensure CLICKHOUSE_PROTOCOL is set to "https"');
    } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
      console.error('  - SSL/TLS error - verify protocol is "https"');
    }
    
    console.error('\nCurrent configuration:');
    console.error(`  URL: ${url}`);
    console.error(`  Username: ${username}`);
    console.error(`  Password length: ${password.length}`);
    console.error(`  Password (first 2 chars): ${password.substring(0, 2)}...`);
    
    await client.close().catch(() => {});
    process.exit(1);
  }
}

testConnection();
