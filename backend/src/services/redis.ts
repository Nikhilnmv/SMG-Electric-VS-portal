import { createClient } from 'redis';

// Placeholder Redis client - will be implemented
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

// Connect on module load
redisClient.connect().catch(console.error);

