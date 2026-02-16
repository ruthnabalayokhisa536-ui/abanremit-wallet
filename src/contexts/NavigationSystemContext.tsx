import React, { createContext, useEffect, useMemo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { CacheManager } from '../lib/navigation/CacheManager';
import { RoutePredictor } from '../lib/navigation/RoutePredictor';
import { RoutePrefetcher } from '../lib/navigation/RoutePrefetcher';
import { DataPrefetcher } from '../lib/navigation/DataPrefetcher';
import type { Priority } from '../lib/navigation/types';

interface NavigationSystemContextValue {
  prefetchRoute: (path: string, priority: Priority) => void;
  cancelPrefetch: (path: string) => void;
  isPrefetched: (path: string) => boolean;
  prefetchData: (path: string) => void;
  isDataReady: (path: string) => boolean;
}

export const NavigationSystemContext = createContext<NavigationSystemContextValue | null>(null);

interface NavigationSystemProviderProps {
  children: ReactNode;
}

export const NavigationSystemProvider: React.FC<NavigationSystemProviderProps> = ({ children }) => {
  const location = useLocation();
  
  // Initialize navigation system components
  const { cacheManager, routePredictor, routePrefetcher, dataPrefetcher } = useMemo(() => {
    try {
      const cache = new CacheManager();
      const predictor = new RoutePredictor();
      const prefetcher = new RoutePrefetcher(cache);
      const dataFetcher = new DataPrefetcher(cache);
      
      return {
        cacheManager: cache,
        routePredictor: predictor,
        routePrefetcher: prefetcher,
        dataPrefetcher: dataFetcher,
      };
    } catch (error) {
      console.error('Failed to initialize navigation system:', error);
      // Return minimal fallback implementations
      const cache = new CacheManager();
      return {
        cacheManager: cache,
        routePredictor: new RoutePredictor(),
        routePrefetcher: new RoutePrefetcher(cache),
        dataPrefetcher: new DataPrefetcher(cache),
      };
    }
  }, []);

  // Prefetch predicted routes when location changes
  // DISABLED: Automatic prefetching causes errors in production
  // Manual prefetching via hover/focus still works
  useEffect(() => {
    // Intentionally empty - automatic prefetching disabled
    // This prevents crashes during initialization
  }, [location.pathname]);

  const contextValue: NavigationSystemContextValue = {
    prefetchRoute: (path: string, priority: Priority) => {
      try {
        routePrefetcher.prefetchRoute(path, priority);
        dataPrefetcher.prefetchData(path);
      } catch (error) {
        console.error('Prefetch route error:', error);
      }
    },
    cancelPrefetch: (path: string) => {
      try {
        routePrefetcher.cancelHoverPrefetch(path);
      } catch (error) {
        console.error('Cancel prefetch error:', error);
      }
    },
    isPrefetched: (path: string) => {
      try {
        return routePrefetcher.isPrefetched(path);
      } catch (error) {
        console.error('Check prefetch error:', error);
        return false;
      }
    },
    prefetchData: (path: string) => {
      try {
        dataPrefetcher.prefetchData(path);
      } catch (error) {
        console.error('Prefetch data error:', error);
      }
    },
    isDataReady: (path: string) => {
      try {
        return dataPrefetcher.isDataReady(path);
      } catch (error) {
        console.error('Check data ready error:', error);
        return false;
      }
    },
  };

  return (
    <NavigationSystemContext.Provider value={contextValue}>
      {children}
    </NavigationSystemContext.Provider>
  );
};
