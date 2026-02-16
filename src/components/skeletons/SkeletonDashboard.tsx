import React from 'react';

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Balance Card Skeleton */}
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32 w-full"></div>
      
      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"></div>
        ))}
      </div>
      
      {/* Recent Transactions Skeleton */}
      <div className="space-y-3">
        <div className="bg-gray-200 dark:bg-gray-700 rounded h-6 w-48"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-16"></div>
        ))}
      </div>
    </div>
  );
};
