import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Clock,
  TrendingDown,
  Percent,
  DollarSign,
  Package,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'aging' | 'slow-movers' | 'markdown-scenarios' | 'recovery-tracking';

export default function DeadStockMarkdown() {
  const [activeTab, setActiveTab] = useState<TabType>('aging');

  const tabs = [
    { id: 'aging' as TabType, label: 'Aging Inventory', icon: Clock },
    { id: 'slow-movers' as TabType, label: 'Slow Movers / Dead Stock', icon: TrendingDown },
    { id: 'markdown-scenarios' as TabType, label: 'Markdown Scenarios', icon: Percent },
    { id: 'recovery-tracking' as TabType, label: 'Recovery Tracking', icon: BarChart3 },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Dead Stock & Markdown" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Dead Stock & Markdown</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage aging inventory, identify slow movers, plan markdowns, and track recovery
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
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

      {/* Tab Content */}
      <div>
        {activeTab === 'aging' && <AgingInventorySection />}
        {activeTab === 'slow-movers' && <SlowMoversSection />}
        {activeTab === 'markdown-scenarios' && <MarkdownScenariosSection />}
        {activeTab === 'recovery-tracking' && <RecoveryTrackingSection />}
      </div>
    </div>
  );
}

// Aging Inventory Section
function AgingInventorySection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('age-desc');

  // Fetch inventory with products
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', 'aging'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for last sale date calculation
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'aging'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const inventory = inventoryData || [];
  const orders = ordersData || [];

  // Calculate aging inventory
  const agingInventory = useMemo(() => {
    const now = new Date();

    return inventory
      .map((item: any) => {
        // Find last sale date for this product
        const productOrders = orders.filter((order: any) =>
          order.orderLines?.some((line: any) => line.productId === item.productId)
        );

        let lastSaleDate: Date | null = null;
        if (productOrders.length > 0) {
          const sortedOrders = productOrders.sort(
            (a: any, b: any) =>
              new Date(b.orderDate || b.createdAt).getTime() -
              new Date(a.orderDate || a.createdAt).getTime()
          );
          lastSaleDate = new Date(sortedOrders[0].orderDate || sortedOrders[0].createdAt);
        }

        // Use received date or created date as fallback
        const receivedDate = item.receivedDate
          ? new Date(item.receivedDate)
          : item.createdAt
          ? new Date(item.createdAt)
          : null;

        // Calculate age in days
        const referenceDate = lastSaleDate || receivedDate || new Date(item.createdAt || now);
        const ageInDays = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate inventory value
        const unitPrice = item.product?.price || item.product?.basePrice || 0;
        const inventoryValue = (item.availableQty || item.quantity || 0) * parseFloat(unitPrice);

        return {
          ...item,
          ageInDays,
          lastSaleDate,
          receivedDate,
          inventoryValue,
          ageCategory:
            ageInDays >= 180
              ? 'critical'
              : ageInDays >= 90
              ? 'high'
              : ageInDays >= 60
              ? 'medium'
              : 'low',
        };
      })
      .filter((item: any) => {
        // Filter by age
        if (ageFilter === 'critical') return item.ageCategory === 'critical';
        if (ageFilter === 'high') return item.ageCategory === 'high';
        if (ageFilter === 'medium') return item.ageCategory === 'medium';
        if (ageFilter === 'low') return item.ageCategory === 'low';
        return true;
      })
      .filter((item: any) => {
        // Filter by search
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.product?.name?.toLowerCase().includes(query) ||
          item.product?.sku?.toLowerCase().includes(query) ||
          item.product?.style?.toLowerCase().includes(query)
        );
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'age-desc') return b.ageInDays - a.ageInDays;
        if (sortBy === 'age-asc') return a.ageInDays - b.ageInDays;
        if (sortBy === 'value-desc') return b.inventoryValue - a.inventoryValue;
        if (sortBy === 'value-asc') return a.inventoryValue - b.inventoryValue;
        return 0;
      });
  }, [inventory, orders, ageFilter, searchQuery, sortBy]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const critical = agingInventory.filter((item: any) => item.ageCategory === 'critical');
    const high = agingInventory.filter((item: any) => item.ageCategory === 'high');
    const totalValue = agingInventory.reduce((sum: number, item: any) => sum + item.inventoryValue, 0);
    const avgAge = agingInventory.length > 0
      ? agingInventory.reduce((sum: number, item: any) => sum + item.ageInDays, 0) / agingInventory.length
      : 0;

    return {
      totalItems: agingInventory.length,
      criticalCount: critical.length,
      highCount: high.length,
      totalValue,
      avgAge: Math.round(avgAge),
    };
  }, [agingInventory]);

  if (inventoryLoading) {
    return <SkeletonPage />;
  }

  const getAgeColor = (ageCategory: string) => {
    switch (ageCategory) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalItems}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical (180+ days)</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.criticalCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalValue.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Age</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.avgAge} days
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Ages</option>
              <option value="critical">Critical (180+ days)</option>
              <option value="high">High (90-179 days)</option>
              <option value="medium">Medium (60-89 days)</option>
              <option value="low">Low (&lt;60 days)</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="age-desc">Age: High to Low</option>
              <option value="age-asc">Age: Low to High</option>
              <option value="value-desc">Value: High to Low</option>
              <option value="value-asc">Value: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aging Inventory Table */}
      {agingInventory.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No aging inventory found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || ageFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All inventory items are relatively fresh.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Inventory Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Age (Days)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Last Sale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {agingInventory.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product?.name || '-'}
                      </div>
                      {item.product?.style && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Style: {item.product.style}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.product?.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.availableQty || item.quantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      ${(item.product?.price || item.product?.basePrice || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${item.inventoryValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          item.ageInDays >= 180
                            ? 'text-red-600 dark:text-red-400'
                            : item.ageInDays >= 90
                            ? 'text-orange-600 dark:text-orange-400'
                            : item.ageInDays >= 60
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {item.ageInDays} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.lastSaleDate
                        ? new Date(item.lastSaleDate).toLocaleDateString()
                        : item.receivedDate
                        ? new Date(item.receivedDate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getAgeColor(
                          item.ageCategory
                        )}`}
                      >
                        {item.ageCategory.charAt(0).toUpperCase() + item.ageCategory.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Slow Movers / Dead Stock Identification Section
function SlowMoversSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch products with inventory
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'slow-movers'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', 'slow-movers'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for sales analysis
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'slow-movers'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  const inventory = inventoryData || [];
  const orders = ordersData || [];

  // Calculate slow movers and dead stock
  const slowMovers = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return products
      .map((product: any) => {
        // Get inventory for this product
        const productInventory = inventory.filter((inv: any) => inv.productId === product.id);
        const totalQuantity = productInventory.reduce(
          (sum: number, inv: any) => sum + (inv.quantity || 0),
          0
        );
        const totalAvailable = productInventory.reduce(
          (sum: number, inv: any) => sum + (inv.availableQty || inv.quantity || 0),
          0
        );

        // Get sales in different periods
        const getSalesInPeriod = (startDate: Date) => {
          const recentOrders = orders.filter((order: any) => {
            const orderDate = new Date(order.orderDate || order.createdAt);
            return orderDate >= startDate;
          });

          const quantity = recentOrders.reduce((sum: number, order: any) => {
            return (
              sum +
              (order.orderLines?.reduce((lineSum: number, line: any) => {
                return lineSum + (line.productId === product.id ? line.quantity || 0 : 0);
              }, 0) || 0)
            );
          }, 0);

          const revenue = recentOrders.reduce((sum: number, order: any) => {
            return (
              sum +
              (order.orderLines?.reduce((lineSum: number, line: any) => {
                return lineSum + (line.productId === product.id ? parseFloat(line.totalPrice || 0) : 0);
              }, 0) || 0)
            );
          }, 0);

          return { quantity, revenue };
        };

        const sales30d = getSalesInPeriod(thirtyDaysAgo);
        const sales60d = getSalesInPeriod(sixtyDaysAgo);
        const sales90d = getSalesInPeriod(ninetyDaysAgo);

        // Calculate velocity metrics
        const dailyVelocity30d = sales30d.quantity / 30;
        const dailyVelocity60d = sales60d.quantity / 60;
        const daysOfStock = dailyVelocity30d > 0 ? totalAvailable / dailyVelocity30d : totalAvailable > 0 ? 999 : 0;

        // Determine status
        let status = 'normal';
        if (totalAvailable === 0) {
          status = 'out-of-stock';
        } else if (sales30d.quantity === 0 && totalAvailable > 0) {
          status = 'dead-stock';
        } else if (daysOfStock > 90) {
          status = 'dead-stock';
        } else if (daysOfStock > 60 || sales30d.quantity < 5) {
          status = 'slow-mover';
        } else if (daysOfStock > 30) {
          status = 'at-risk';
        }

        // Calculate inventory value
        const unitPrice = parseFloat(product.price || product.basePrice || 0);
        const inventoryValue = totalAvailable * unitPrice;

        return {
          ...product,
          totalQuantity,
          totalAvailable,
          sales30d: sales30d.quantity,
          sales60d: sales60d.quantity,
          sales90d: sales90d.quantity,
          revenue30d: sales30d.revenue,
          dailyVelocity30d,
          dailyVelocity60d,
          daysOfStock: daysOfStock === 999 ? null : Math.round(daysOfStock),
          status,
          inventoryValue,
          currentPrice: unitPrice,
        };
      })
      .filter((p: any) => {
        if (filterStatus === 'dead-stock') return p.status === 'dead-stock';
        if (filterStatus === 'slow-mover') return p.status === 'slow-mover';
        if (filterStatus === 'at-risk') return p.status === 'at-risk';
        if (filterStatus === 'normal') return p.status === 'normal';
        return true;
      })
      .filter((p: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.style?.toLowerCase().includes(query)
        );
      })
      .sort((a: any, b: any) => {
        // Sort by priority: dead stock first, then by days of stock
        if (a.status === 'dead-stock' && b.status !== 'dead-stock') return -1;
        if (a.status !== 'dead-stock' && b.status === 'dead-stock') return 1;
        const daysA = a.daysOfStock || 999;
        const daysB = b.daysOfStock || 999;
        return daysB - daysA;
      });
  }, [products, inventory, orders, filterStatus, searchQuery]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const deadStock = slowMovers.filter((p: any) => p.status === 'dead-stock');
    const slowMoversList = slowMovers.filter((p: any) => p.status === 'slow-mover');
    const atRisk = slowMovers.filter((p: any) => p.status === 'at-risk');
    const totalValue = slowMovers.reduce((sum: number, p: any) => sum + p.inventoryValue, 0);
    const deadStockValue = deadStock.reduce((sum: number, p: any) => sum + p.inventoryValue, 0);

    return {
      totalProducts: slowMovers.length,
      deadStockCount: deadStock.length,
      slowMoversCount: slowMoversList.length,
      atRiskCount: atRisk.length,
      totalValue,
      deadStockValue,
    };
  }, [slowMovers]);

  const isLoading = productsLoading || inventoryLoading;

  if (isLoading) {
    return <SkeletonPage />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'dead-stock':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'slow-mover':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'out-of-stock':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'dead-stock':
        return 'Dead Stock';
      case 'slow-mover':
        return 'Slow Mover';
      case 'at-risk':
        return 'At Risk';
      case 'out-of-stock':
        return 'Out of Stock';
      default:
        return 'Normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dead Stock Items</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.deadStockCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${summaryMetrics.deadStockValue.toFixed(2)} value
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Slow Movers</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.slowMoversCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">At Risk Items</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.atRiskCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalValue.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="dead-stock">Dead Stock</option>
              <option value="slow-mover">Slow Movers</option>
              <option value="at-risk">At Risk</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Slow Movers Table */}
      {slowMovers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <TrendingDown className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No slow movers found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All products are moving well!'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Inventory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    30d Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Daily Velocity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Days of Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {slowMovers.map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                      {product.style && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">Style: {product.style}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${product.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{product.totalAvailable}</div>
                      {product.totalQuantity > product.totalAvailable && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {product.totalQuantity - product.totalAvailable} reserved
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{product.sales30d}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${product.revenue30d.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {product.dailyVelocity30d.toFixed(2)}/day
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.daysOfStock !== null ? (
                        <span
                          className={`text-sm font-medium ${
                            product.daysOfStock > 90
                              ? 'text-red-600 dark:text-red-400'
                              : product.daysOfStock > 60
                              ? 'text-orange-600 dark:text-orange-400'
                              : product.daysOfStock > 30
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {product.daysOfStock} days
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">No sales</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(product.status)}`}
                      >
                        {getStatusLabel(product.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Markdown Scenarios & Recommendations Section
function MarkdownScenariosSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch products with inventory
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'markdown-scenarios'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', 'markdown-scenarios'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for sales analysis
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'markdown-scenarios'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Get markdown plans from localStorage
  const [markdownPlans, setMarkdownPlans] = useState<any[]>(() => {
    const stored = localStorage.getItem('markdown-plans');
    return stored ? JSON.parse(stored) : [];
  });

  const products = productsData || [];
  const inventory = inventoryData || [];
  const orders = ordersData || [];

  // Calculate markdown candidates
  const markdownCandidates = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return products
      .map((product: any) => {
        // Get inventory for this product
        const productInventory = inventory.filter((inv: any) => inv.productId === product.id);
        const totalAvailable = productInventory.reduce(
          (sum: number, inv: any) => sum + (inv.availableQty || inv.quantity || 0),
          0
        );

        // Get sales in last 30 days
        const recentOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.orderDate || order.createdAt);
          return orderDate >= thirtyDaysAgo;
        });

        const salesQuantity = recentOrders.reduce((sum: number, order: any) => {
          return (
            sum +
            (order.orderLines?.reduce((lineSum: number, line: any) => {
              return lineSum + (line.productId === product.id ? line.quantity || 0 : 0);
            }, 0) || 0)
          );
        }, 0);

        const dailyVelocity = salesQuantity / 30;
        const daysOfStock = dailyVelocity > 0 ? totalAvailable / dailyVelocity : totalAvailable > 0 ? 999 : 0;

        // Check if product has existing markdown plan
        const existingPlan = markdownPlans.find((plan) => plan.productId === product.id);

        // Generate markdown scenarios
        const currentPrice = parseFloat(product.price || product.basePrice || 0);
        const scenarios = [
          {
            discount: 10,
            newPrice: currentPrice * 0.9,
            expectedSales: Math.min(totalAvailable, Math.ceil(salesQuantity * 1.2)),
            revenue: currentPrice * 0.9 * Math.min(totalAvailable, Math.ceil(salesQuantity * 1.2)),
            recommendation: daysOfStock > 120 ? 'high' : daysOfStock > 90 ? 'medium' : 'low',
          },
          {
            discount: 20,
            newPrice: currentPrice * 0.8,
            expectedSales: Math.min(totalAvailable, Math.ceil(salesQuantity * 1.5)),
            revenue: currentPrice * 0.8 * Math.min(totalAvailable, Math.ceil(salesQuantity * 1.5)),
            recommendation: daysOfStock > 90 ? 'high' : daysOfStock > 60 ? 'medium' : 'low',
          },
          {
            discount: 30,
            newPrice: currentPrice * 0.7,
            expectedSales: Math.min(totalAvailable, Math.ceil(salesQuantity * 2)),
            revenue: currentPrice * 0.7 * Math.min(totalAvailable, Math.ceil(salesQuantity * 2)),
            recommendation: daysOfStock > 60 ? 'high' : 'medium',
          },
          {
            discount: 50,
            newPrice: currentPrice * 0.5,
            expectedSales: Math.min(totalAvailable, Math.ceil(salesQuantity * 3)),
            revenue: currentPrice * 0.5 * Math.min(totalAvailable, Math.ceil(salesQuantity * 3)),
            recommendation: daysOfStock > 90 ? 'high' : 'medium',
          },
        ];

        // Find best scenario
        const bestScenario = scenarios.reduce((best, current) => {
          if (current.recommendation === 'high' && best.recommendation !== 'high') return current;
          if (current.recommendation === 'high' && best.recommendation === 'high') {
            return current.revenue > best.revenue ? current : best;
          }
          if (current.recommendation === 'medium' && best.recommendation === 'low') return current;
          if (current.recommendation === 'medium' && best.recommendation === 'medium') {
            return current.revenue > best.revenue ? current : best;
          }
          return best;
        }, scenarios[0]);

        return {
          ...product,
          totalAvailable,
          salesQuantity,
          dailyVelocity,
          daysOfStock: daysOfStock === 999 ? null : Math.round(daysOfStock),
          currentPrice,
          existingPlan,
          scenarios,
          bestScenario,
          isDeadStock: totalAvailable > 0 && (salesQuantity === 0 || daysOfStock > 90),
        };
      })
      .filter((p: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.style?.toLowerCase().includes(query)
        );
      })
      .filter((p: any) => p.isDeadStock || p.daysOfStock > 60)
      .sort((a: any, b: any) => {
        const scoreA = a.daysOfStock || 999;
        const scoreB = b.daysOfStock || 999;
        return scoreB - scoreA;
      });
  }, [products, inventory, orders, markdownPlans, searchQuery]);

  const saveMarkdownPlan = (plan: any) => {
    const updated = markdownPlans.some((p) => p.productId === plan.productId)
      ? markdownPlans.map((p) => (p.productId === plan.productId ? plan : p))
      : [...markdownPlans, plan];
    setMarkdownPlans(updated);
    localStorage.setItem('markdown-plans', JSON.stringify(updated));
    toast.success(plan.id ? 'Markdown plan updated!' : 'Markdown plan created!');
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const isLoading = productsLoading || inventoryLoading;

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Markdown Candidates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {markdownCandidates.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Percent className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Plans</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {markdownPlans.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Potential Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                $
                {markdownCandidates
                  .reduce((sum: number, p: any) => sum + (p.bestScenario?.revenue || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex-1 relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Markdown Candidates Table */}
      {markdownCandidates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Percent className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No markdown candidates found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'All products are moving well. No markdowns needed.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {markdownCandidates.map((product: any) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {product.name}
                    </h3>
                    {product.existingPlan && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Plan Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    SKU: {product.sku} | Inventory: {product.totalAvailable} | 30d Sales:{' '}
                    {product.salesQuantity} | Days of Stock: {product.daysOfStock || 'N/A'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  {product.existingPlan ? 'Edit Plan' : 'Create Plan'}
                </button>
              </div>

              {/* Scenarios */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                {product.scenarios.map((scenario: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      scenario.recommendation === 'high'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : scenario.recommendation === 'medium'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {scenario.discount}% OFF
                      </span>
                      {scenario.recommendation === 'high' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-600 text-white">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="text-gray-600 dark:text-gray-400">
                        New Price: <span className="font-semibold">${scenario.newPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Expected Sales: <span className="font-semibold">{scenario.expectedSales}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Potential Revenue:{' '}
                        <span className="font-semibold">${scenario.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Markdown Plan Modal */}
      {isModalOpen && selectedProduct && (
        <MarkdownPlanModal
          product={selectedProduct}
          plan={selectedProduct.existingPlan}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onSave={saveMarkdownPlan}
        />
      )}
    </div>
  );
}

// Markdown Plan Modal Component
function MarkdownPlanModal({
  product,
  plan,
  onClose,
  onSave,
}: {
  product: any;
  plan?: any;
  onClose: () => void;
  onSave: (plan: any) => void;
}) {
  const [formData, setFormData] = useState({
    id: plan?.id || `plan-${Date.now()}`,
    productId: product.id,
    discountPercent: plan?.discountPercent || product.bestScenario?.discount || 20,
    newPrice: plan?.newPrice || product.bestScenario?.newPrice || product.currentPrice * 0.8,
    startDate: plan?.startDate || new Date().toISOString().split('T')[0],
    endDate: plan?.endDate || '',
    reason: plan?.reason || 'Dead stock clearance',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {plan ? 'Edit Markdown Plan' : 'Create Markdown Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product
            </label>
            <div className="text-sm text-gray-900 dark:text-white">
              {product.name} (SKU: {product.sku})
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Current Price: ${product.currentPrice.toFixed(2)} | Inventory: {product.totalAvailable}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Discount Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.discountPercent}
              onChange={(e) => {
                const discount = parseFloat(e.target.value);
                const newPrice = product.currentPrice * (1 - discount / 100);
                setFormData({ ...formData, discountPercent: discount, newPrice });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Price
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.newPrice}
              onChange={(e) => {
                const newPrice = parseFloat(e.target.value);
                const discount = ((product.currentPrice - newPrice) / product.currentPrice) * 100;
                setFormData({ ...formData, newPrice, discountPercent: discount });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="Dead stock clearance">Dead stock clearance</option>
              <option value="Seasonal clearance">Seasonal clearance</option>
              <option value="End of season sale">End of season sale</option>
              <option value="Promotional discount">Promotional discount</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Recovery Tracking Section
function RecoveryTrackingSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<string>('30d');

  // Get markdown plans from localStorage
  const [markdownPlans] = useState<any[]>(() => {
    const stored = localStorage.getItem('markdown-plans');
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch orders for recovery analysis
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'recovery-tracking'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products', 'recovery-tracking'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];
  const products = productsData || [];

  // Calculate recovery metrics
  const recoveryData = useMemo(() => {
    let daysBack = 30;
    if (timeRange === '7d') daysBack = 7;
    else if (timeRange === '30d') daysBack = 30;
    else if (timeRange === '60d') daysBack = 60;
    else if (timeRange === '90d') daysBack = 90;

    return markdownPlans
      .map((plan: any) => {
        const product = products.find((p: any) => p.id === plan.productId);
        if (!product) return null;

        const planStartDate = new Date(plan.startDate);
        const planEndDate = plan.endDate ? new Date(plan.endDate) : null;

        // Get orders before markdown (baseline)
        const baselineOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.orderDate || order.createdAt);
          return orderDate < planStartDate && orderDate >= new Date(planStartDate.getTime() - daysBack * 24 * 60 * 60 * 1000);
        });

        const baselineSales = baselineOrders.reduce((sum: number, order: any) => {
          return (
            sum +
            (order.orderLines?.reduce((lineSum: number, line: any) => {
              return lineSum + (line.productId === product.id ? line.quantity || 0 : 0);
            }, 0) || 0)
          );
        }, 0);

        const baselineRevenue = baselineOrders.reduce((sum: number, order: any) => {
          return (
            sum +
            (order.orderLines?.reduce((lineSum: number, line: any) => {
              return lineSum + (line.productId === product.id ? parseFloat(line.totalPrice || 0) : 0);
            }, 0) || 0)
          );
        }, 0);

        // Get orders during markdown period
        const markdownOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.orderDate || order.createdAt);
          if (planEndDate) {
            return orderDate >= planStartDate && orderDate <= planEndDate;
          }
          return orderDate >= planStartDate;
        });

        const markdownSales = markdownOrders.reduce((sum: number, order: any) => {
          return (
            sum +
            (order.orderLines?.reduce((lineSum: number, line: any) => {
              return lineSum + (line.productId === product.id ? line.quantity || 0 : 0);
            }, 0) || 0)
          );
        }, 0);

        const markdownRevenue = markdownOrders.reduce((sum: number, order: any) => {
          return (
            sum +
            (order.orderLines?.reduce((lineSum: number, line: any) => {
              return lineSum + (line.productId === product.id ? parseFloat(line.totalPrice || 0) : 0);
            }, 0) || 0)
          );
        }, 0);

        // Calculate recovery metrics
        const salesIncrease = baselineSales > 0 ? ((markdownSales - baselineSales) / baselineSales) * 100 : markdownSales > 0 ? 100 : 0;
        const revenueChange = markdownRevenue - baselineRevenue;
        const revenueChangePercent = baselineRevenue > 0 ? (revenueChange / baselineRevenue) * 100 : markdownRevenue > 0 ? 100 : 0;

        // Determine effectiveness
        let effectiveness = 'poor';
        if (salesIncrease > 50 && revenueChangePercent > -10) {
          effectiveness = 'excellent';
        } else if (salesIncrease > 25 && revenueChangePercent > -20) {
          effectiveness = 'good';
        } else if (salesIncrease > 0 && revenueChangePercent > -30) {
          effectiveness = 'fair';
        }

        return {
          ...plan,
          product,
          baselineSales,
          baselineRevenue,
          markdownSales,
          markdownRevenue,
          salesIncrease,
          revenueChange,
          revenueChangePercent,
          effectiveness,
          planStartDate,
          planEndDate,
        };
      })
      .filter((item: any) => item !== null)
      .filter((item: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.product?.name?.toLowerCase().includes(query) ||
          item.product?.sku?.toLowerCase().includes(query)
        );
      })
      .sort((a: any, b: any) => {
        // Sort by effectiveness
        const effectivenessOrder = { excellent: 0, good: 1, fair: 2, poor: 3 };
        return effectivenessOrder[a.effectiveness as keyof typeof effectivenessOrder] - effectivenessOrder[b.effectiveness as keyof typeof effectivenessOrder];
      });
  }, [markdownPlans, orders, products, timeRange, searchQuery]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const excellent = recoveryData.filter((item: any) => item.effectiveness === 'excellent');
    const good = recoveryData.filter((item: any) => item.effectiveness === 'good');
    const fair = recoveryData.filter((item: any) => item.effectiveness === 'fair');
    const poor = recoveryData.filter((item: any) => item.effectiveness === 'poor');

    const totalRevenueChange = recoveryData.reduce((sum: number, item: any) => sum + item.revenueChange, 0);
    const avgSalesIncrease = recoveryData.length > 0
      ? recoveryData.reduce((sum: number, item: any) => sum + item.salesIncrease, 0) / recoveryData.length
      : 0;

    return {
      totalPlans: recoveryData.length,
      excellentCount: excellent.length,
      goodCount: good.length,
      fairCount: fair.length,
      poorCount: poor.length,
      totalRevenueChange,
      avgSalesIncrease: Math.round(avgSalesIncrease),
    };
  }, [recoveryData]);

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case 'excellent':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Plans</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalPlans}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Excellent Results</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.excellentCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Sales Increase</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.avgSalesIncrease}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <ArrowUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Revenue Change</p>
              <p className={`text-2xl font-bold mt-1 ${
                summaryMetrics.totalRevenueChange >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                ${summaryMetrics.totalRevenueChange >= 0 ? '+' : ''}
                {summaryMetrics.totalRevenueChange.toFixed(2)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              summaryMetrics.totalRevenueChange >= 0
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {summaryMetrics.totalRevenueChange >= 0 ? (
                <ArrowUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="60d">Last 60 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recovery Tracking Table */}
      {recoveryData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No recovery data found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {markdownPlans.length === 0
                ? 'Create markdown plans to track recovery effectiveness.'
                : 'No orders found for markdown plans in the selected time range.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Markdown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Baseline Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Markdown Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Sales Increase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Revenue Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Effectiveness
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recoveryData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product?.name || '-'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        SKU: {item.product?.sku || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {item.discountPercent}% OFF
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${item.newPrice?.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.baselineSales} units
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${item.baselineRevenue.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.markdownSales} units
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${item.markdownRevenue.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          item.salesIncrease > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.salesIncrease >= 0 ? '+' : ''}
                        {item.salesIncrease.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          item.revenueChange >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.revenueChange >= 0 ? '+' : ''}${item.revenueChange.toFixed(2)}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ({item.revenueChangePercent >= 0 ? '+' : ''}
                        {item.revenueChangePercent.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getEffectivenessColor(
                          item.effectiveness
                        )}`}
                      >
                        {item.effectiveness.charAt(0).toUpperCase() + item.effectiveness.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}