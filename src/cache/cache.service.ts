import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type MemoryEntry = { value: string; expiresAt?: number };

/**
 * Cache token PI-SPI (et autres clés courtes).
 *
 * - Si Redis est joignable → Redis.
 * - Sinon (Render free sans Redis, Redis down) → fallback mémoire processus
 *   pour éviter le spam d'erreurs et garder l'auth PI-SPI fonctionnelle.
 *
 * Variables :
 * - REDIS_ENABLED=false → mémoire uniquement
 * - REDIS_URL → URL complète (Upstash / Redis Cloud / Render Redis)
 * - sinon REDIS_HOST / PORT / PASSWORD / DB
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private useMemory = false;
  private readonly memory = new Map<string, MemoryEntry>();
  private redisErrorLogged = false;

  constructor(private readonly config: ConfigService) {
    const enabled =
      (this.config.get<string>('REDIS_ENABLED') ?? 'true').toLowerCase() !==
      'false';

    if (!enabled) {
      this.useMemory = true;
      this.logger.warn(
        'Redis désactivé (REDIS_ENABLED=false) — cache mémoire processus.',
      );
      return;
    }

    const url = this.config.get<string>('REDIS_URL')?.trim();
    try {
      this.redis = url
        ? new Redis(url, {
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            lazyConnect: true,
            retryStrategy: (times) => {
              if (times > 3) {
                return null; // stop reconnect
              }
              return Math.min(times * 200, 2000);
            },
          })
        : new Redis({
            host: this.config.get<string>('REDIS_HOST', 'localhost'),
            port: Number(this.config.get('REDIS_PORT') ?? 6379),
            password: this.config.get<string>('REDIS_PASSWORD') || undefined,
            db: Number(this.config.get('REDIS_DB') ?? 0),
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            lazyConnect: true,
            retryStrategy: (times) => {
              if (times > 3) {
                return null;
              }
              return Math.min(times * 200, 2000);
            },
          });

      this.redis.on('error', (err: Error) => {
        if (!this.redisErrorLogged) {
          this.logger.warn(
            `Redis indisponible (${err.message}) — bascule cache mémoire.`,
          );
          this.redisErrorLogged = true;
        }
        this.useMemory = true;
      });

      this.redis.on('connect', () => {
        this.useMemory = false;
        this.redisErrorLogged = false;
        this.logger.log('Redis connecté.');
      });

      void this.redis.connect().catch(() => {
        this.useMemory = true;
        if (!this.redisErrorLogged) {
          this.logger.warn(
            'Impossible de se connecter à Redis — cache mémoire actif.',
          );
          this.redisErrorLogged = true;
        }
      });
    } catch (err) {
      this.useMemory = true;
      this.logger.warn(
        `Init Redis échouée — cache mémoire: ${(err as Error).message}`,
      );
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.useMemory && this.redis) {
      try {
        return await this.redis.get(key);
      } catch {
        this.useMemory = true;
      }
    }
    return this.memoryGet(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.useMemory && this.redis) {
      try {
        if (ttlSeconds !== undefined && ttlSeconds > 0) {
          await this.redis.setex(key, Math.floor(ttlSeconds), value);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch (err) {
        this.useMemory = true;
        this.logger.warn(
          `Cache Redis set failed, mémoire: ${(err as Error).message}`,
        );
      }
    }
    this.memorySet(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.useMemory && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        this.useMemory = true;
      }
    }
    this.memory.delete(key);
  }

  private memoryGet(key: string): string | null {
    const entry = this.memory.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  private memorySet(key: string, value: string, ttlSeconds?: number): void {
    const expiresAt =
      ttlSeconds !== undefined && ttlSeconds > 0
        ? Date.now() + Math.floor(ttlSeconds) * 1000
        : undefined;
    this.memory.set(key, { value, expiresAt });
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
