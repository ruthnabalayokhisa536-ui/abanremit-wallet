import type { IRoutePrefetcher, ICacheManager } from './interfaces';
import type { Priority, PredictedRoute, PrefetchQueueItem } from './types';
import {
  HOVER_PREFETCH_DELAY_MS,
  PREFETCH_RETRY_MAX_ATTEMPTS,
  PREFETCH_RETRY_BASE_DELAY_MS,
  CACHE_MAX_SIZE_BYTES,
} from './constants';

export class RoutePrefetcher implements IRoutePrefetcher {
  private cacheManager: ICacheManager;
  private prefetchQueue: Map<string, PrefetchQueueItem> = new Map();
  private hoverTimers: Map<string, NodeJS.Timeout> = new Map();
  private prefetchedRoutes: Set<string> = new Set();

  constructor(cacheManager: ICacheManager) {
    this.cacheManager = cacheManager;
  }

  async prefetchRoute(path: string, priority: Priority): Promise<void> {
    // Check if already prefetched
    if (this.prefetchedRoutes.has(path)) {
      return;
    }

    // Check memory constraints
    if (this.cacheManager.getSize() >= CACHE_MAX_SIZE_BYTES) {
      console.warn(`[RoutePrefetcher] Memory limit reached, skipping prefetch for ${path}`);
      return;
    }

    // Add to queue
    const queueItem: PrefetchQueueItem = {
      route: path,
      priority,
      type: 'route',
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };
    this.prefetchQueue.set(path, queueItem);

    try {
      queueItem.status = 'loading';
      
      // Dynamic import to prefetch the route
      // This will be implemented with actual route imports
      await this.loadRouteModule(path);
      
      // Store in cache
      this.cacheManager.set(`route:${path}`, { prefetched: true, path }, 300000); // 5 min TTL
      
      queueItem.status = 'complete';
      this.prefetchedRoutes.add(path);
      
      console.log(`[RoutePrefetcher] Successfully prefetched ${path}`);
    } catch (error) {
      console.error(`[RoutePrefetcher] Failed to prefetch ${path}:`, error);
      queueItem.status = 'failed';
      
      // Retry with exponential backoff
      if (queueItem.retries < PREFETCH_RETRY_MAX_ATTEMPTS) {
        const delay = PREFETCH_RETRY_BASE_DELAY_MS * Math.pow(2, queueItem.retries);
        queueItem.retries++;
        
        setTimeout(() => {
          this.prefetchRoute(path, priority);
        }, delay);
      }
    }
  }

  prefetchOnHover(path: string, delay: number = HOVER_PREFETCH_DELAY_MS): void {
    // Clear any existing timer for this path
    const existingTimer = this.hoverTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.prefetchRoute(path, 'high');
      this.hoverTimers.delete(path);
    }, delay);

    this.hoverTimers.set(path, timer);
  }

  cancelHoverPrefetch(path: string): void {
    const timer = this.hoverTimers.get(path);
    if (timer) {
      clearTimeout(timer);
      this.hoverTimers.delete(path);
    }
  }

  prefetchOnFocus(path: string): void {
    // Immediate prefetch on focus (keyboard navigation)
    this.prefetchRoute(path, 'critical');
  }

  async prefetchBatch(routes: PredictedRoute[]): Promise<void> {
    // Sort by priority
    const sortedRoutes = [...routes].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Prefetch in order
    for (const route of sortedRoutes) {
      await this.prefetchRoute(route.path, route.priority);
    }
  }

  isPrefetched(path: string): boolean {
    return this.prefetchedRoutes.has(path) || this.cacheManager.has(`route:${path}`);
  }

  private async loadRouteModule(path: string): Promise<void> {
    try {
      // Map routes to their lazy-loaded modules
      // This is a placeholder - actual implementation will use React.lazy
      const routeModules: Record<string, () => Promise<any>> = {
        '/dashboard': () => import('../../pages/dashboard/UserDashboard').catch(() => ({})),
        '/dashboard/deposit': () => import('../../pages/dashboard/user/DepositPage').catch(() => ({})),
        '/dashboard/withdraw': () => import('../../pages/dashboard/user/WithdrawPage').catch(() => ({})),
        '/dashboard/send': () => import('../../pages/dashboard/user/SendMoneyPageNew').catch(() => ({})),
        '/dashboard/statements': () => import('../../pages/dashboard/user/StatementsPage').catch(() => ({})),
        '/dashboard/profile': () => import('../../pages/dashboard/user/ProfilePage').catch(() => ({})),
        '/dashboard/airtime': () => import('../../pages/dashboard/user/BuyAirtimePage').catch(() => ({})),
        '/dashboard/notifications': () => import('../../pages/dashboard/user/NotificationsPage').catch(() => ({})),
        '/dashboard/agent': () => import('../../pages/dashboard/AgentDashboard').catch(() => ({})),
        '/dashboard/admin': () => import('../../pages/dashboard/AdminDashboard').catch(() => ({})),
        '/login': () => import('../../pages/Login').catch(() => ({})),
        '/register': () => import('../../pages/RegisterWithOTP').catch(() => ({})),
      };

      const loader = routeModules[path];
      if (loader) {
        await loader();
      }
    } catch (error) {
      // Silently fail - prefetching is optional
      console.debug(`[RoutePrefetcher] Could not load module for ${path}`);
    }
  }

  // Get queue status (for debugging/monitoring)
  getQueueStatus(): PrefetchQueueItem[] {
    return Array.from(this.prefetchQueue.values());
  }

  // Clear all prefetch data
  clear(): void {
    this.prefetchQueue.clear();
    this.prefetchedRoutes.clear();
    this.hoverTimers.forEach(timer => clearTimeout(timer));
    this.hoverTimers.clear();
  }
}
