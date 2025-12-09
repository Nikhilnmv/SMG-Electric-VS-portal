import { envsafe, str, num, host, port, bool } from 'envsafe';

/**
 * Environment variable validation for worker service
 */
export const env = envsafe({
  // Database
  DATABASE_URL: str({
    desc: 'PostgreSQL database connection string',
    devDefault: 'postgresql://user:password@localhost:5432/vs_platform',
  }),

  // Redis
  REDIS_HOST: host({
    desc: 'Redis host',
    default: 'localhost',
    allowEmpty: false,
  }),
  REDIS_PORT: port({
    desc: 'Redis port',
    default: 6379,
  }),
  REDIS_PASSWORD: str({
    desc: 'Redis password',
    default: '',
    allowEmpty: true,
  }),
  REDIS_DB: num({
    desc: 'Redis database number',
    default: 0,
  }),

  // Storage
  STORAGE_MODE: str({
    desc: 'Storage mode: local or s3',
    choices: ['local', 's3'],
    default: 'local',
  }),

  // AWS S3 (required if STORAGE_MODE=s3)
  AWS_REGION: str({
    desc: 'AWS region',
    default: '',
    allowEmpty: true,
  }),
  AWS_ACCESS_KEY_ID: str({
    desc: 'AWS access key ID',
    default: '',
    allowEmpty: true,
  }),
  AWS_SECRET_ACCESS_KEY: str({
    desc: 'AWS secret access key',
    default: '',
    allowEmpty: true,
  }),
  AWS_S3_BUCKET: str({
    desc: 'AWS S3 bucket name',
    default: '',
    allowEmpty: true,
  }),

  // Worker configuration
  TRANSCODING_CONCURRENCY: num({
    desc: 'Number of concurrent video transcoding jobs',
    default: 2,
  }),
  LIVE_STREAM_CONCURRENCY: num({
    desc: 'Number of concurrent live stream processing jobs',
    default: 1,
  }),

  // Temporary directory
  TEMP_DIR: str({
    desc: 'Temporary directory for video processing',
    default: '/tmp/transcode',
    allowEmpty: true,
  }),

  NODE_ENV: str({
    desc: 'Node environment',
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),
});

// Validate AWS credentials if using S3
if (env.STORAGE_MODE === 's3') {
  if (!env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_S3_BUCKET) {
    throw new Error(
      'AWS credentials are required when STORAGE_MODE=s3. Please set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.'
    );
  }
}

