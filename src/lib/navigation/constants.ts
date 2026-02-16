// Configuration constants for instant page navigation

// Cache configuration
export const CACHE_MAX_SIZE_MB = 100;
export const CACHE_MAX_SIZE_BYTES = CACHE_MAX_SIZE_MB * 1024 * 1024;
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const MEMORY_PRESSURE_REDUCTION_PERCENT = 50;

// Prefetch configuration
export const HOVER_PREFETCH_DELAY_MS = 100;
export const PREFETCH_RADIUS_CLICKS = 2;
export const MAX_PREDICTED_ROUTES = 3;
export const PREFETCH_RETRY_MAX_ATTEMPTS = 3;
export const PREFETCH_RETRY_BASE_DELAY_MS = 1000;

// Performance targets
export const TARGET_NAVIGATION_TIME_MS = 50;
export const TARGET_TRANSITION_TIME_MS = 16; // 60fps
export const TARGET_FIRST_PAINT_MS = 100;
export const TARGET_CACHE_HIT_RATE = 0.8;

// Bundle configuration
export const MAX_CHUNK_SIZE_KB = 50;
export const MAX_TOTAL_PREFETCH_SIZE_KB = 500;

// Memory management
export const IDLE_GC_DELAY_MS = 5000;
export const UNUSED_ENTRY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// Network conditions
export const SLOW_NETWORK_THRESHOLD_MBPS = 1.5;

// Service worker
export const CRITICAL_ROUTES = [
  '/',
  '/login',
  '/register',
  '/dashboard',
];

export const OFFLINE_FALLBACK_TIMEOUT_MS = 50;
