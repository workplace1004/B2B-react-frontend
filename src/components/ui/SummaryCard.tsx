import type { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  valueColor?: string;
  className?: string;
}

export default function SummaryCard({
  label,
  value,
  icon: Icon,
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30',
  iconColor = 'text-blue-600 dark:text-blue-400',
  valueColor = 'text-gray-900 dark:text-white',
  className = '',
}: SummaryCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`text-2xl font-bold ${valueColor} mt-1`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

