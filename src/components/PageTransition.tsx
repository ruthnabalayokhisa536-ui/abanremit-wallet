import React, { useEffect, useState } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition Component
 * Provides smooth fade-in transitions for page changes
 * Prevents white flashing and blinking during navigation
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in after component mounts
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`page-transition ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        transition: 'opacity 0.15s ease-in-out',
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
