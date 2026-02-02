import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbProps {
  currentPage?: string;
}

// Sidebar items mapping for each navbar category (same as in Layout.tsx)
const sidebarItemsMap: Record<string, Array<{ path: string; label: string }>> = {
  dashboard: [
    { path: '/dashboard', label: 'Overview' },
    { path: '/alerts', label: 'Alerts' },
    { path: '/exceptions', label: 'Exceptions' },
    { path: '/tasks', label: 'My Tasks' },
    { path: '/kpi-reports', label: 'KPI Reports' },
  ],
  product: [
    { path: '/products', label: 'Catalog' },
    { path: '/bom', label: 'BOM' },
    { path: '/costing', label: 'Costing' },
    { path: '/collections', label: 'Collections' },
    { path: '/drops', label: 'Drops' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/documents', label: 'Assets (DAM)' },
  ],
  sales: [
    { path: '/orders', label: 'Orders' },
    { path: '/customers', label: 'Customers' },
    { path: '/retailers', label: 'Retailers' },
    { path: '/returns', label: 'Returns (RMA)' },
    { path: '/wholesale', label: 'Wholesale (B2B)' },
  ],
  marketing: [
    { path: '/launch-planning', label: 'Launch Planning' },
    { path: '/retailer-enablement', label: 'Retailer Enablement' },
    { path: '/content-readiness', label: 'Content Readiness' },
  ],
  operations: [
    { path: '/inventory', label: 'Inventory' },
    { path: '/fulfillment', label: 'Fulfillment' },
    { path: '/warehouses', label: 'Warehouses' },
    { path: '/receiving', label: 'Receiving' },
    { path: '/purchasing', label: 'Purchasing' },
    { path: '/replenishment', label: 'Replenishment' },
    { path: '/forecast', label: 'Forecast' },
  ],
  admin: [
    { path: '/users', label: 'Users' },
    { path: '/roles', label: 'Roles' },
    { path: '/integrations', label: 'Integrations' },
    { path: '/audit-log', label: 'Audit Log' },
    { path: '/rules', label: 'Rules' },
    { path: '/settings', label: 'Settings' },
  ],
};

// Navbar category labels
const navbarLabels: Record<string, string> = {
  dashboard: 'DASHBOARD / KPIs',
  product: 'PRODUCT',
  sales: 'SALES',
  marketing: 'MARKETING',
  operations: 'OPERATIONS',
  admin: 'ADMIN',
};

export default function Breadcrumb({ currentPage }: BreadcrumbProps) {
  const location = useLocation();

  // Find the current route's navbar category and sidebar item
  const findBreadcrumbPath = () => {
    const path = location.pathname;
    
    // Check each navbar category
    for (const [category, items] of Object.entries(sidebarItemsMap)) {
      const item = items.find(item => item.path === path || path.startsWith(item.path + '/'));
      if (item) {
        return {
          category: navbarLabels[category] || category.toUpperCase(),
          page: item.label,
        };
      }
    }
    
    // Fallback: use currentPage if provided, or extract from path
    return {
      category: null,
      page: currentPage || path.split('/').pop()?.replace(/-/g, ' ') || 'Page',
    };
  };

  const { category, page } = findBreadcrumbPath();

  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="breadcrumb mb-0 flex items-center gap-2 text-sm">
        {category ? (
          <>
            <li className="breadcrumb-item">
              <span className="text-gray-600 dark:text-gray-400">{category}</span>
            </li>
            <li className="breadcrumb-item text-gray-400 dark:text-gray-500">/</li>
            <li className="breadcrumb-item active text-gray-500 dark:text-gray-400" aria-current="page">
              {page}
            </li>
          </>
        ) : (
          <>
            <li className="breadcrumb-item">
              <Link 
                to="/dashboard" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                <i className="fi fi-rr-home text-xs"></i>
                <span>Home</span>
              </Link>
            </li>
            <li className="breadcrumb-item text-gray-400 dark:text-gray-500">/</li>
            <li className="breadcrumb-item active text-gray-500 dark:text-gray-400" aria-current="page">
              {page}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

