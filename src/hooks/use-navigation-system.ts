import { useContext } from 'react';
import { NavigationSystemContext } from '../contexts/NavigationSystemContext';

export const useNavigationSystem = () => {
  const context = useContext(NavigationSystemContext);
  
  if (!context) {
    throw new Error('useNavigationSystem must be used within NavigationSystemProvider');
  }
  
  return context;
};
