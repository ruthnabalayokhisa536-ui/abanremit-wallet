import React from 'react';

export const SkeletonPage: React.FC = () => {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="bg-gray-200 dark:bg-gray-700 rounded h-8 w-64"></div>
      
      {/* Content Skeleton */}
      <div className="space-y-4">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-24"></div>
      </div>
    </div>
  );
};
