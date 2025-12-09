import { Pool } from 'pg';

// Placeholder database connection - will be implemented
export const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'vs_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test connection
db.on('connect', () => {
  console.log('Database connected');
});

db.on('error', (err) => {
  console.error('Database connection error:', err);
});

