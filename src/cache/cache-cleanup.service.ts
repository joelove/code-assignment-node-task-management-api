import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheCleanupService implements OnApplicationShutdown {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async onApplicationShutdown() {
    const anyCache = this.cache as unknown as { store?: any };
    const client: { quit?: () => Promise<void>; disconnect?: () => void } | undefined =
      anyCache?.store?.client ?? anyCache?.store?._redisClient;

    if (client?.quit) {
      try {
        await client.quit();
      } catch {
        // ignore
      }
      return;
    }

    if (client?.disconnect) {
      try {
        client.disconnect();
      } catch {
        // ignore
      }
    }
  }
}


