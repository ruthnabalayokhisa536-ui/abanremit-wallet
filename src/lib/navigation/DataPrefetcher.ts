import type { IDataPrefetcher, ICacheManager } from './interfaces';
import type { RouteParams, DataFetcher } from './types';
import { DEFAULT_CACHE_TTL_MS } from './constants';

export class DataPrefetcher implements IDataPrefetcher {
  private cacheManager: ICacheManager;
  private dataRequirements: Map<string, DataFetcher[]> = new Map();

  constructor(cacheManager: ICacheManager) {
    this.cacheManager = cacheManager;
    this.initializeDataRequirements();
  }

  private initializeDataRequirements(): void {
    // Define data requirements for each route
    this.registerDataRequirements('/dashboard', [
      {
        key: 'balance',
        fetch: async () => {
          // This will be replaced with actual API call
          return { balance: 0, currency: 'USD' };
        },
        staleTime: 30000, // 30 seconds
      },
      {
        key: 'recentTransactions',
        fetch: async () => {
          // This will be replaced with actual API call
          return [];
        },
        staleTime: 60000, // 1 minute
      },
    ]);

    this.registerDataRequirements('/dashboard/statements', [
      {
        key: 'transactions',
        fetch: async () => {
          // This will be replaced with actual API call
          return [];
        },
        staleTime: 60000,
      },
    ]);

    this.registerDataRequirements('/dashboard/profile', [
      {
        key: 'profile',
        fetch: async () => {
          // This will be replaced with actual API call
          return {};
        },
        staleTime: 300000, // 5 minutes
      },
    ]);

    this.registerDataRequirements('/dashboard/notifications', [
      {
        key: 'notifications',
        fetch: async () => {
          // This will be replaced with actual API call
          return [];
        },
        staleTime: 30000,
      },
    ]);
  }

  async prefetchData(route: string, params?: RouteParams): Promise<void> {
    const fetchers = this.dataRequirements.get(route);
    
    if (!fetchers || fetchers.length === 0) {
      return;
    }

    const cacheKey = this.getCacheKey(route, params);

    // Check if data is already cached and fresh
    if (this.isDataReady(route, params)) {
      return;
    }

    try {
      // Fetch all data requirements in parallel
      const results = await Promise.all(
        fetchers.map(async (fetcher) => {
          try {
            const data = await fetcher.fetch(params);
            return { key: fetcher.key, data, staleTime: fetcher.staleTime };
          } catch (error) {
            console.error(`[DataPrefetcher] Failed to fetch ${fetcher.key} for ${route}:`, error);
            return null;
          }
        })
      );

      // Store results in cache
      const dataMap: Record<string, any> = {};
      results.forEach((result) => {
        if (result) {
          dataMap[result.key] = result.data;
        }
      });

      // Use the minimum staleTime from all fetchers
      const minStaleTime = Math.min(...fetchers.map(f => f.staleTime));
      this.cacheManager.set(cacheKey, dataMap, minStaleTime);

      console.log(`[DataPrefetcher] Successfully prefetched data for ${route}`);
    } catch (error) {
      console.error(`[DataPrefetcher] Failed to prefetch data for ${route}:`, error);
    }
  }

  registerDataRequirements(route: string, fetchers: DataFetcher[]): void {
    this.dataRequirements.set(route, fetchers);
  }

  isDataReady(route: string, params?: RouteParams): boolean {
    const cacheKey = this.getCacheKey(route, params);
    return this.cacheManager.has(cacheKey);
  }

  invalidate(route: string): void {
    // Invalidate all cached data for this route
    const cacheKey = this.getCacheKey(route);
    this.cacheManager.delete(cacheKey);
  }

  getData(route: string, params?: RouteParams): any | null {
    const cacheKey = this.getCacheKey(route, params);
    return this.cacheManager.get(cacheKey);
  }

  private getCacheKey(route: string, params?: RouteParams): string {
    if (!params || Object.keys(params).length === 0) {
      return `data:${route}`;
    }
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `data:${route}?${paramStr}`;
  }

  // Get all registered routes
  getRegisteredRoutes(): string[] {
    return Array.from(this.dataRequirements.keys());
  }
}
