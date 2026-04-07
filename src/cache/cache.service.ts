import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });
    this.redis.on('error', (err: Error) =>
      this.logger.error(`Redis: ${err.message}`),
    );
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds !== undefined && ttlSeconds > 0) {
        await this.redis.setex(key, Math.floor(ttlSeconds), value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (err) {
      this.logger.warn(`Cache set failed: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      /* ignore */
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
