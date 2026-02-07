// Skeleton loading components

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            {[1, 2, 3, 4, 5].map((i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              {[1, 2, 3, 4, 5].map((j) => (
                <td key={j} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SkeletonStatsCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
    </div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
  </div>
);

export const SkeletonChart = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

export const SkeletonList = ({ items = 3 }: { items?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-1"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonPage = () => (
  <div>
    <div className="mb-6 animate-pulse">
      <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
    <SkeletonTable />
  </div>
);

export const SkeletonModal = () => (
  <div className="animate-pulse">
    {/* Modal Header */}
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
    </div>
    
    {/* Modal Body */}
    <div className="px-6 py-6 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      ))}
    </div>
    
    {/* Modal Footer */}
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
    </div>
  </div>
);

export const SkeletonForm = ({ fields = 5 }: { fields?: number }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    ))}
  </div>
);

