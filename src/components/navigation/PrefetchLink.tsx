import React, { useRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useNavigationSystem } from '../../hooks/use-navigation-system';

interface PrefetchLinkProps extends LinkProps {
  prefetchDelay?: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export const PrefetchLink: React.FC<PrefetchLinkProps> = ({
  to,
  prefetchDelay,
  priority = 'high',
  onMouseEnter,
  onMouseLeave,
  onFocus,
  children,
  ...props
}) => {
  const { prefetchRoute, cancelPrefetch } = useNavigationSystem();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const path = typeof to === 'string' ? to : to.pathname || '';
    
    if (prefetchDelay !== undefined) {
      // Custom delay
      hoverTimeoutRef.current = setTimeout(() => {
        prefetchRoute(path, priority);
      }, prefetchDelay);
    } else {
      // Use default hover prefetch (100ms debounce handled by RoutePrefetcher)
      prefetchRoute(path, priority);
    }

    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const path = typeof to === 'string' ? to : to.pathname || '';
    cancelPrefetch(path);

    onMouseLeave?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLAnchorElement>) => {
    const path = typeof to === 'string' ? to : to.pathname || '';
    
    // Immediate prefetch on focus (keyboard navigation)
    prefetchRoute(path, 'critical');

    onFocus?.(e);
  };

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </Link>
  );
};
