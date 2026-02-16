import React from 'react';

export const SkeletonForm: React.FC = () => {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="bg-gray-200 dark:bg-gray-700 rounded h-8 w-64"></div>
      
      {/* Form Fields Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-24"></div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded h-10 w-full"></div>
          </div>
        ))}
      </div>
      
      {/* Button Skeleton */}
      <div className="bg-gray-200 dark:bg-gray-700 rounded h-12 w-full"></div>
    </div>
  );
};
