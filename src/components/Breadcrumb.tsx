import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbProps {
  currentPage?: string;
}

// Sidebar items mapping for each navbar category (same as in Layout.tsx)
const sidebarItemsMap: Record<string, Array<{ path: string; label: string }>> = {
  dashboards: [
    { path: '/executive-overview', label: 'Executive Overview' },
    { path: '/product-collection-dashboard', label: 'Product Dashboard' },
    { path: '/sales-dashboard', label: 'Sales Dashboard' },
    { path: '/inventory-fulfillment-dashboard', label: 'Retail Dashboard' },
    { path: '/finance-dashboard', label: 'Marketing Dashboard' },
    { path: '/alerts-exceptions-dashboard', label: 'Operational Dashboard' },
  ],
  product: [
    { path: '/products', label: 'Catalog' },
    { path: '/sku-ean-barcodes', label: 'SKU / EAN / Barcodes' },
    { path: '/bom', label: 'BOM & Costing' },
    { path: '/collections', label: 'Collections & Drops' },
    { path: '/size-fit', label: 'Size & Fit' },
    { path: '/documents', label: 'Assets (DAM)' },
    { path: '/sustainability-compliance', label: 'Sustainability & Compliance' },
  ],
  sales: [
    { path: '/b2b-portal', label: 'B2B Portal' },
    { path: '/quotes-proformas', label: 'Quotes & Proformas' },
    { path: '/sales-reps', label: 'Sales Reps' },
    { path: '/sales-analytics', label: 'Sales Analytics' },
  ],
  marketing: [
    { path: '/campaign-planner', label: 'Campaign Planner' },
    { path: '/assortment-merchandising', label: 'Assortment & Merchandising' },
    { path: '/marketing-insights', label: 'Insights' },
    { path: '/marketing-integrations', label: 'Integrations' },
  ],
  'customer-experience': [
    { path: '/customers', label: 'Customers' },
    { path: '/customer-profile', label: 'Customer Profile' },
    { path: '/b2b-terms', label: 'B2B Terms' },
    { path: '/service', label: 'Service' },
  ],
  operations: [
    { path: '/vendors-factories', label: 'Vendors & Factories' },
    { path: '/production-orders', label: 'Production Orders' },
    { path: '/landed-cost', label: 'Landed Cost' },
    { path: '/warehouses-locations', label: 'Warehouses & Locations' },
    { path: '/stock-control', label: 'Stock Control' },
    { path: '/scanning', label: 'Scanning' },
    { path: '/counting', label: 'Counting' },
    { path: '/orders', label: 'Orders' },
    { path: '/pick-pack-ship', label: 'Pick / Pack / Ship' },
    { path: '/returns-rma', label: 'Returns (RMA)' },
    { path: '/omnichannel', label: 'Omnichannel' },
  ],
  'planning-intelligence': [
    { path: '/forecasting-ai', label: 'Forecasting (AI)' },
    { path: '/replenishment', label: 'Replenishment' },
    { path: '/auto-po-proposals', label: 'Auto PO Proposals' },
    { path: '/open-to-buy', label: 'Open-to-Buy (OTB)' },
    { path: '/dead-stock-markdown', label: 'Dead Stock & Markdown' },
    { path: '/allocation-intelligence', label: 'Allocation Intelligence' },
    { path: '/next-best-actions', label: 'Next Best Actions' },
  ],
  finance: [
    { path: '/invoicing', label: 'Invoicing' },
    { path: '/ar-ap', label: 'AR / AP' },
    { path: '/taxes-vat', label: 'Taxes & VAT' },
    { path: '/multi-currency-fx', label: 'Multi-Currency & FX' },
    { path: '/accounting-integrations', label: 'Accounting Integrations' },
    { path: '/audit-trail', label: 'Audit Trail' },
  ],
  admin: [
    { path: '/users', label: 'Users & Roles' },
    { path: '/organization-settings', label: 'Organization Settings' },
    { path: '/integrations', label: 'Integrations' },
    { path: '/system-settings', label: 'System Settings' },
    { path: '/security', label: 'Security' },
    { path: '/data-exports', label: 'Data & Exports' },
    { path: '/audit-log', label: 'Logs' },
  ],
  // Legacy routes for backward compatibility
  dashboard: [
    { path: '/dashboard', label: 'Overview' },
    { path: '/alerts', label: 'Alerts' },
    { path: '/exceptions', label: 'Exceptions' },
    { path: '/tasks', label: 'My Tasks' },
    { path: '/kpi-reports', label: 'KPI Reports' },
  ],
};

// Navbar category labels
const navbarLabels: Record<string, string> = {
  dashboards: 'DASHBOARDS',
  product: 'PRODUCT',
  sales: 'SALES',
  marketing: 'MARKETING',
  'customer-experience': 'CUSTOMER EXPERIENCE',
  operations: 'OPERATIONS',
  'planning-intelligence': 'PLANNING & INTELLIGENCE (AI)',
  finance: 'FINANCE',
  admin: 'ADMIN',
  // Legacy
  dashboard: 'DASHBOARDS',
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

