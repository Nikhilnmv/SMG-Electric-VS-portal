import { envsafe, str, num, url, port, bool } from 'envsafe';

/**
 * Environment variable validation using EnvSafe
 * Throws error if required env vars are missing or invalid
 */
export const env = envsafe({
  // Database
  DATABASE_URL: str({
    desc: 'PostgreSQL database connection string',
    devDefault: 'postgresql://user:password@localhost:5432/vs_platform',
  }),

  // Redis
  REDIS_HOST: str({
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

  // JWT
  JWT_SECRET: str({
    desc: 'Secret key for JWT token signing',
    devDefault: 'dev-secret-key-change-in-production',
  }),
  JWT_EXPIRES_IN: str({
    desc: 'JWT token expiration time',
    default: '7d',
  }),

  // Server
  PORT: port({
    desc: 'Server port',
    default: 3001,
  }),
  NODE_ENV: str({
    desc: 'Node environment',
    choices: ['development', 'production', 'test'],
    default: 'development',
  }),

  // CORS
  FRONTEND_ORIGIN: url({
    desc: 'Frontend origin URL for CORS',
    default: 'http://localhost:3000',
  }),
  ALLOWED_ORIGINS: str({
    desc: 'Comma-separated list of allowed CORS origins',
    default: 'http://localhost:3000',
    allowEmpty: true,
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

  // Optional settings
  TEMP_DIR: str({
    desc: 'Temporary directory for video processing',
    default: '/tmp/transcode',
    allowEmpty: true,
  }),

  // Email (SMTP)
  SMTP_HOST: str({
    desc: 'SMTP server host',
    default: '',
    allowEmpty: true,
  }),
  SMTP_PORT: port({
    desc: 'SMTP server port',
    default: 587,
    allowEmpty: true,
  }),
  SMTP_USER: str({
    desc: 'SMTP username',
    default: '',
    allowEmpty: true,
  }),
  SMTP_PASS: str({
    desc: 'SMTP password',
    default: '',
    allowEmpty: true,
  }),
  SMTP_FROM: str({
    desc: 'Email sender address',
    default: 'noreply@vs-platform.com',
    allowEmpty: true,
  }),
  SMTP_FROM_NAME: str({
    desc: 'Email sender name',
    default: 'VS Platform',
    allowEmpty: true,
  }),

  // Frontend URL for email links
  FRONTEND_URL: url({
    desc: 'Frontend URL for email links',
    default: 'http://localhost:3000',
  }),

  // Password reset token TTL (in seconds)
  PASSWORD_RESET_TOKEN_TTL_SECONDS: num({
    desc: 'Password reset token expiration time in seconds',
    default: 3600, // 1 hour
  }),

  // Bcrypt rounds
  BCRYPT_ROUNDS: num({
    desc: 'Bcrypt salt rounds',
    default: 12,
  }),

  // Dev mode
  DEV_MODE: bool({
    desc: 'Enable development mode features',
    default: false,
  }),
  DEV_EMAIL_DUMP: bool({
    desc: 'Dump emails to console in dev mode',
    default: false,
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

