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
  }, []);

  // Prefetch predicted routes when location changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Get user role from localStorage or context
    const userRole = (localStorage.getItem('userRole') as 'user' | 'agent' | 'admin') || 'user';
    
    // Predict next routes
    const predictions = routePredictor.predictNextRoutes({
      currentRoute: currentPath,
      userRole,
      recentHistory: [],
      timeOnPage: 0,
    });

    // Prefetch predicted routes and their data
    predictions.forEach(prediction => {
      routePrefetcher.prefetchRoute(prediction.path, prediction.priority);
      dataPrefetcher.prefetchData(prediction.path);
    });
  }, [location.pathname, routePredictor, routePrefetcher, dataPrefetcher]);

  const contextValue: NavigationSystemContextValue = {
    prefetchRoute: (path: string, priority: Priority) => {
      routePrefetcher.prefetchRoute(path, priority);
      dataPrefetcher.prefetchData(path);
    },
    cancelPrefetch: (path: string) => {
      routePrefetcher.cancelHoverPrefetch(path);
    },
    isPrefetched: (path: string) => {
      return routePrefetcher.isPrefetched(path);
    },
    prefetchData: (path: string) => {
      dataPrefetcher.prefetchData(path);
    },
    isDataReady: (path: string) => {
      return dataPrefetcher.isDataReady(path);
    },
  };

  return (
    <NavigationSystemContext.Provider value={contextValue}>
      {children}
    </NavigationSystemContext.Provider>
  );
};
