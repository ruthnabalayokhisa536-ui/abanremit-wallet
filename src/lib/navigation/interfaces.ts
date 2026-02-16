// Interface definitions for navigation system components

import type {
  Priority,
  CacheStrategy,
  CacheEntry,
  NavigationContext,
  PredictedRoute,
  RouteParams,
  DataFetcher,
  NavigationOptions,
  NavigationHook,
} from './types';

export interface ICacheManager {
  // Cache operations
  set(key: string, value: any, ttl: number): void;
  get(key: string): any | null;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  
  // Memory management
  getSize(): number;
  evictLRU(targetSize: number): void;
  
  // Cache strategies
  setStrategy(key: string, strategy: CacheStrategy): void;
}

export interface IRoutePredictor {
  // Predict next routes based on current context
  predictNextRoutes(context: NavigationContext): PredictedRoute[];
  
  // Update prediction model based on actual navigation
  recordNavigation(from: string, to: string, userRole: string): void;
  
  // Get prefetch priority for a route
  getPriority(route: string, context: NavigationContext): Priority;
}

export interface IRoutePrefetcher {
  // Prefetch a route's code bundle
  prefetchRoute(path: string, priority: Priority): Promise<void>;
  
  // Prefetch on hover with debounce
  prefetchOnHover(path: string, delay: number): void;
  
  // Prefetch on focus (keyboard navigation)
  prefetchOnFocus(path: string): void;
  
  // Prefetch multiple routes in priority order
  prefetchBatch(routes: PredictedRoute[]): Promise<void>;
  
  // Check if route is prefetched
  isPrefetched(path: string): boolean;
}

export interface IDataPrefetcher {
  // Prefetch data for a route
  prefetchData(route: string, params?: RouteParams): Promise<void>;
  
  // Register data requirements for a route
  registerDataRequirements(route: string, fetchers: DataFetcher[]): void;
  
  // Check if data is prefetched and fresh
  isDataReady(route: string, params?: RouteParams): boolean;
  
  // Invalidate prefetched data
  invalidate(route: string): void;
}

export interface INavigationOrchestrator {
  // Navigate to a route
  navigate(path: string, options?: NavigationOptions): void;
  
  // Prepare navigation (prefetch everything)
  prepareNavigation(path: string): Promise<void>;
  
  // Check if navigation is ready
  isNavigationReady(path: string): boolean;
  
  // Register navigation hooks
  onBeforeNavigate(hook: NavigationHook): void;
  onAfterNavigate(hook: NavigationHook): void;
}

export interface IOptimisticUIRenderer {
  // Render optimistic UI for a route
  renderOptimistic(route: string, cachedData?: any): React.ReactElement;
  
  // Register skeleton screens for routes
  registerSkeleton(route: string, skeleton: React.ReactElement): void;
  
  // Update UI with fresh data
  updateWithFreshData(route: string, data: any): void;
}

export interface IServiceWorkerManager {
  // Register service worker
  register(): Promise<ServiceWorkerRegistration | undefined>;
  
  // Update service worker
  update(): Promise<void>;
  
  // Cache routes and assets
  cacheRoutes(routes: string[]): Promise<void>;
  
  // Check if offline
  isOffline(): boolean;
  
  // Handle offline navigation
  handleOfflineNavigation(path: string): Response | null;
}
