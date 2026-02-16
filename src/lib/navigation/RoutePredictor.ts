import type { IRoutePredictor } from './interfaces';
import type { NavigationContext, PredictedRoute, Priority, UserRole } from './types';
import { MAX_PREDICTED_ROUTES, SLOW_NETWORK_THRESHOLD_MBPS } from './constants';

interface RouteDefinition {
  path: string;
  roles: UserRole[];
  children?: string[];
}

export class RoutePredictor implements IRoutePredictor {
  private navigationHistory: Array<{ from: string; to: string; role: string; timestamp: number }> = [];
  private routeGraph: Map<string, RouteDefinition> = new Map();

  constructor() {
    this.initializeRouteGraph();
  }

  private initializeRouteGraph(): void {
    // Define route graph with role-based access
    const routes: RouteDefinition[] = [
      // Public routes
      { path: '/', roles: ['user', 'agent', 'admin'], children: ['/login', '/register'] },
      { path: '/login', roles: ['user', 'agent', 'admin'], children: ['/dashboard'] },
      { path: '/register', roles: ['user', 'agent', 'admin'], children: ['/dashboard'] },
      
      // User routes
      { path: '/dashboard', roles: ['user', 'agent', 'admin'], children: ['/dashboard/deposit', '/dashboard/withdraw', '/dashboard/send', '/dashboard/statements', '/dashboard/profile'] },
      { path: '/dashboard/deposit', roles: ['user', 'agent', 'admin'], children: ['/dashboard/statements', '/dashboard'] },
      { path: '/dashboard/withdraw', roles: ['user', 'agent', 'admin'], children: ['/dashboard/statements', '/dashboard'] },
      { path: '/dashboard/send', roles: ['user', 'agent', 'admin'], children: ['/dashboard/statements', '/dashboard'] },
      { path: '/dashboard/statements', roles: ['user', 'agent', 'admin'], children: ['/dashboard', '/dashboard/deposit'] },
      { path: '/dashboard/profile', roles: ['user', 'agent', 'admin'], children: ['/dashboard'] },
      { path: '/dashboard/airtime', roles: ['user', 'agent', 'admin'], children: ['/dashboard/statements', '/dashboard'] },
      { path: '/dashboard/notifications', roles: ['user', 'agent', 'admin'], children: ['/dashboard'] },
      
      // Agent routes
      { path: '/dashboard/agent', roles: ['agent', 'admin'], children: ['/dashboard/agent/deposit', '/dashboard/agent/withdraw', '/dashboard/agent/transfer', '/dashboard/agent/airtime'] },
      { path: '/dashboard/agent/deposit', roles: ['agent', 'admin'], children: ['/dashboard/agent', '/dashboard/statements'] },
      { path: '/dashboard/agent/withdraw', roles: ['agent', 'admin'], children: ['/dashboard/agent', '/dashboard/statements'] },
      { path: '/dashboard/agent/transfer', roles: ['agent', 'admin'], children: ['/dashboard/agent', '/dashboard/statements'] },
      { path: '/dashboard/agent/airtime', roles: ['agent', 'admin'], children: ['/dashboard/agent', '/dashboard/statements'] },
      
      // Admin routes
      { path: '/dashboard/admin', roles: ['admin'], children: ['/dashboard/admin/users', '/dashboard/admin/deposits', '/dashboard/admin/currencies', '/dashboard/admin/sms'] },
      { path: '/dashboard/admin/users', roles: ['admin'], children: ['/dashboard/admin'] },
      { path: '/dashboard/admin/deposits', roles: ['admin'], children: ['/dashboard/admin'] },
      { path: '/dashboard/admin/currencies', roles: ['admin'], children: ['/dashboard/admin'] },
      { path: '/dashboard/admin/sms', roles: ['admin'], children: ['/dashboard/admin'] },
    ];

    routes.forEach(route => {
      this.routeGraph.set(route.path, route);
    });
  }

  predictNextRoutes(context: NavigationContext): PredictedRoute[] {
    const { currentRoute, userRole, recentHistory, timeOnPage } = context;
    
    const predictions: PredictedRoute[] = [];
    const routeDef = this.routeGraph.get(currentRoute);

    if (!routeDef || !routeDef.children) {
      return [];
    }

    // Filter children by role
    const accessibleChildren = routeDef.children.filter(childPath => {
      const childDef = this.routeGraph.get(childPath);
      return childDef && childDef.roles.includes(userRole);
    });

    // Calculate priorities and confidence
    for (const childPath of accessibleChildren) {
      const priority = this.calculatePriority(childPath, context);
      const confidence = this.calculateConfidence(childPath, context);
      
      predictions.push({
        path: childPath,
        priority,
        confidence,
      });
    }

    // Sort by confidence (descending) and take top MAX_PREDICTED_ROUTES
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    // Check network conditions
    const networkSpeed = this.getNetworkSpeed();
    if (networkSpeed < SLOW_NETWORK_THRESHOLD_MBPS) {
      return predictions.slice(0, 1); // Only highest priority on slow network
    }

    return predictions.slice(0, MAX_PREDICTED_ROUTES);
  }

  recordNavigation(from: string, to: string, userRole: string): void {
    this.navigationHistory.push({
      from,
      to,
      role: userRole,
      timestamp: Date.now(),
    });

    // Keep only last 100 entries
    if (this.navigationHistory.length > 100) {
      this.navigationHistory.shift();
    }
  }

  getPriority(route: string, context: NavigationContext): Priority {
    return this.calculatePriority(route, context);
  }

  private calculatePriority(route: string, context: NavigationContext): Priority {
    const { currentRoute, userRole, timeOnPage } = context;

    // Critical: Direct children of current route
    const routeDef = this.routeGraph.get(currentRoute);
    if (routeDef?.children?.includes(route)) {
      return 'critical';
    }

    // High: Common patterns from history
    const patternCount = this.getPatternCount(currentRoute, route);
    if (patternCount > 3) {
      return 'high';
    }

    // Medium: Role-relevant routes
    const targetDef = this.routeGraph.get(route);
    if (targetDef?.roles.includes(userRole)) {
      return 'medium';
    }

    return 'low';
  }

  private calculateConfidence(route: string, context: NavigationContext): number {
    const { currentRoute, recentHistory, timeOnPage } = context;
    
    let confidence = 0.5; // Base confidence

    // Boost for direct children
    const routeDef = this.routeGraph.get(currentRoute);
    if (routeDef?.children?.includes(route)) {
      confidence += 0.3;
    }

    // Boost for historical patterns
    const patternCount = this.getPatternCount(currentRoute, route);
    confidence += Math.min(patternCount * 0.05, 0.2);

    // Boost for time on page (longer = more likely to navigate)
    if (timeOnPage > 5000) {
      confidence += 0.1;
    }

    // Boost if in recent history
    if (recentHistory.includes(route)) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  private getPatternCount(from: string, to: string): number {
    return this.navigationHistory.filter(
      entry => entry.from === from && entry.to === to
    ).length;
  }

  private getNetworkSpeed(): number {
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.downlink) {
        return connection.downlink; // Mbps
      }
    }
    
    // Default to fast network if API not available
    return 10;
  }
}
