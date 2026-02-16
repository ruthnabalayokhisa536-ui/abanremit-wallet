// Core types for instant page navigation system

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type CacheStrategy = 
  | 'cache-first'      // Use cache, fetch in background
  | 'network-first'    // Fetch first, fallback to cache
  | 'cache-only'       // Only use cache
  | 'network-only';    // Always fetch fresh

export type UserRole = 'user' | 'agent' | 'admin';

export interface NavigationContext {
  currentRoute: string;
  userRole: UserRole;
  recentHistory: string[];
  timeOnPage: number;
}

export interface PredictedRoute {
  path: string;
  priority: Priority;
  confidence: number; // 0-1
}

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  strategy: CacheStrategy;
}

export interface PrefetchQueueItem {
  route: string;
  priority: Priority;
  type: 'route' | 'data';
  timestamp: number;
  retries: number;
  status: 'pending' | 'loading' | 'complete' | 'failed';
}

export interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  isNavigating: boolean;
  prefetchedRoutes: Set<string>;
  cachedRoutes: Set<string>;
  navigationHistory: NavigationHistoryEntry[];
}

export interface NavigationHistoryEntry {
  from: string;
  to: string;
  timestamp: number;
  duration: number; // ms
}

export interface RouteParams {
  [key: string]: string | number;
}

export interface DataFetcher {
  key: string;
  fetch: (params?: any) => Promise<any>;
  staleTime: number; // milliseconds
}

export interface NavigationOptions {
  replace?: boolean;
  state?: any;
  skipCache?: boolean;
  forceRefresh?: boolean;
}

export type NavigationHook = (from: string, to: string) => void | Promise<void>;
