import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description,
  className = '' 
}: EmptyStateProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          {description}
        </p>
      </div>
    </div>
  );
}

