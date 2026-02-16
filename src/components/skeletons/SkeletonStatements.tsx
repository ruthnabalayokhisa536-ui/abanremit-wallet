import React from 'react';

export const SkeletonStatements: React.FC = () => {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="bg-gray-200 dark:bg-gray-700 rounded h-8 w-48"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded h-10 w-32"></div>
      </div>
      
      {/* Filters Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded h-10"></div>
        ))}
      </div>
      
      {/* Transactions List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20"></div>
        ))}
      </div>
    </div>
  );
};
