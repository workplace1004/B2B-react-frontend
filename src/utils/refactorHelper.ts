// Helper utilities for refactoring pages to use shared components
// This file provides common patterns and replacements

export const COMMON_IMPORTS = {
  ui: `import {
  PageHeader,
  TabsNavigation,
  SummaryCard,
  SearchInput,
  SearchAndFilterBar,
  CustomDropdown,
  Pagination,
  EmptyState,
} from '../components/ui';`,
  
  removeImports: [
    'ChevronDown',
    'ChevronsLeft',
    'ChevronsRight',
    'Search',
    'Filter',
    'createPortal',
  ],
};

export const COMMON_PATTERNS = {
  pageHeader: {
    find: /<Breadcrumb currentPage="([^"]+)" \/>\s*<div className="mb-6">\s*<div className="flex items-center justify-between">\s*<div>\s*<h1 className="text-\[24px\] font-bold[^<]+>([^<]+)<\/h1>\s*(?:<p className="text-gray-500[^<]+>([^<]+)<\/p>)?/s,
    replace: '<PageHeader\n        title="$2"\n        description="$3"\n        breadcrumbPage="$1"\n      />',
  },
};




