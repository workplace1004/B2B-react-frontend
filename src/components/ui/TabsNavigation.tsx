import type { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabsNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function TabsNavigation({ 
  tabs, 
  activeTab, 
  onTabChange,
  className = '' 
}: TabsNavigationProps) {
  return (
    <div className={`mb-6 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

