import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  enabled: (process.env.REDIS_ENABLED ?? 'true').toLowerCase() !== 'false',
  url: process.env.REDIS_URL || undefined,
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),
}));
