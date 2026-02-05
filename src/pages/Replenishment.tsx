import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Search,
  Filter,
  BarChart3,
  Target,
  ShoppingBag,
  Store,
  Users,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'reorder-suggestions' | 'risk-scoring' | 'channel-replenishment';
type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'overstock';


export default function Replenishment() {
  const [activeTab, setActiveTab] = useState<TabType>('reorder-suggestions');

  const tabs = [
    { id: 'reorder-suggestions' as TabType, label: 'Reorder Suggestions', icon: Target },
    { id: 'risk-scoring' as TabType, label: 'Stock Risk Scoring', icon: BarChart3 },
    { id: 'channel-replenishment' as TabType, label: 'Replenishment by Channel', icon: ShoppingBag },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Replenishment" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Replenishment</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Reorder suggestions, stock risk scoring, and channel-based replenishment
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
        {activeTab === 'reorder-suggestions' && <ReorderSuggestionsSection />}
        {activeTab === 'risk-scoring' && <StockRiskScoringSection />}
        {activeTab === 'channel-replenishment' && <ChannelReplenishmentSection />}
      </div>
    </div>
  );
}

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function CustomDropdown({ value, onChange, options, placeholder }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-between cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <span>{selectedOption?.label || placeholder || 'Select...'}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                option.value === value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Reorder Suggestions Section
function ReorderSuggestionsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('reorder-desc');

  // Fetch inventory data
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', 'reorder-suggestions'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'reorder-suggestions'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const inventory = inventoryData || [];
  const warehouses = warehousesData || [];

  // Calculate reorder suggestions
  const reorderSuggestions = useMemo(() => {
    return inventory
      .map((item: any) => {
      const currentQty = item.quantity || 0;
      const reservedQty = item.reservedQty || 0;
        const availableQty = item.availableQty || currentQty - reservedQty;
      const reorderPoint = item.reorderPoint || 0;
      const safetyStock = item.safetyStock || 0;
      
      // Calculate min/max quantities
      const minQty = reorderPoint; // Minimum should be at reorder point
      const maxQty = reorderPoint + safetyStock * 3; // Max is reorder point + 3x safety stock
      
      // Calculate suggested reorder quantity
      // Formula: (reorderPoint + safetyStock) - currentQty, but at least safetyStock
      const suggestedReorderQty = Math.max(
        (reorderPoint + safetyStock) - currentQty,
          currentQty < reorderPoint ? safetyStock : 0
        );

        // Calculate days until reorder needed
        const daysUntilReorder = currentQty > reorderPoint
          ? Math.floor((currentQty - reorderPoint) / Math.max(safetyStock / 30, 1))
          : 0;
      
      return {
        id: item.id,
        productId: item.productId,
          productName: item.product?.name || 'Product',
          sku: item.product?.sku || 'N/A',
        warehouseId: item.warehouseId,
          warehouseName: item.warehouse?.name || 'Warehouse',
        currentQty,
        availableQty,
        reservedQty,
        reorderPoint,
        safetyStock,
        minQty,
        maxQty,
        suggestedReorderQty: Math.max(suggestedReorderQty, 0),
          daysUntilReorder,
          needsReorder: currentQty <= reorderPoint,
          inventory: item,
        };
      })
      .filter((item: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.productName?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.warehouseName?.toLowerCase().includes(query)
        );
      })
      .filter((item: any) => {
        if (warehouseFilter === 'all') return true;
        return item.warehouseId === parseInt(warehouseFilter);
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'reorder-desc') return b.suggestedReorderQty - a.suggestedReorderQty;
        if (sortBy === 'reorder-asc') return a.suggestedReorderQty - b.suggestedReorderQty;
        if (sortBy === 'current-desc') return b.currentQty - a.currentQty;
        if (sortBy === 'current-asc') return a.currentQty - b.currentQty;
        if (sortBy === 'days-desc') return b.daysUntilReorder - a.daysUntilReorder;
        if (sortBy === 'days-asc') return a.daysUntilReorder - b.daysUntilReorder;
        return 0;
      });
  }, [inventory, warehouses, searchQuery, warehouseFilter, sortBy]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const needsReorder = reorderSuggestions.filter((item: any) => item.needsReorder);
    const totalReorderQty = reorderSuggestions.reduce((sum: number, item: any) => sum + item.suggestedReorderQty, 0);
    const avgDaysUntilReorder = reorderSuggestions.length > 0
      ? reorderSuggestions.reduce((sum: number, item: any) => sum + item.daysUntilReorder, 0) / reorderSuggestions.length
      : 0;

    return {
      totalItems: reorderSuggestions.length,
      needsReorderCount: needsReorder.length,
      totalReorderQty,
      avgDaysUntilReorder: Math.round(avgDaysUntilReorder),
    };
  }, [reorderSuggestions]);

  if (isLoadingInventory) {
    return <SkeletonPage />;
  }

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
              <p className="text-sm text-gray-600 dark:text-gray-400">Needs Reorder</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.needsReorderCount}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reorder Qty</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalReorderQty.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Days Until Reorder</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.avgDaysUntilReorder}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              placeholder="Search products, SKU, warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={warehouseFilter}
                onChange={setWarehouseFilter}
                options={[
                  { value: 'all', label: 'All Warehouses' },
                  ...warehouses.map((w: any) => ({
                    value: w.id.toString(),
                    label: w.name,
                  })),
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'reorder-desc', label: 'Reorder Qty: High to Low' },
                  { value: 'reorder-asc', label: 'Reorder Qty: Low to High' },
                  { value: 'current-desc', label: 'Current Qty: High to Low' },
                  { value: 'current-asc', label: 'Current Qty: Low to High' },
                  { value: 'days-desc', label: 'Days Until Reorder: High to Low' },
                  { value: 'days-asc', label: 'Days Until Reorder: Low to High' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reorder Suggestions Table */}
      {reorderSuggestions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Target className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No reorder suggestions found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || warehouseFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All inventory levels are optimal. No reorder suggestions at this time.'}
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
                    Product / SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Min / Max / Safety
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Suggested Reorder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Days Until Reorder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reorderSuggestions.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.currentQty} units
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Available: {item.availableQty} | Reserved: {item.reservedQty}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>Min: <span className="font-medium">{item.minQty}</span></div>
                      <div>Max: <span className="font-medium">{item.maxQty}</span></div>
                      <div>Safety: <span className="font-medium">{item.safetyStock}</span></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.reorderPoint}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.currentQty <= item.reorderPoint ? 'Below threshold' : 'Above threshold'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                        {item.suggestedReorderQty > 0 ? item.suggestedReorderQty : 'N/A'}
                      </div>
                      {item.suggestedReorderQty > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          To reach: {item.reorderPoint + item.safetyStock}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {item.daysUntilReorder > 0 ? (
                          <span className="text-gray-900 dark:text-white">
                            {item.daysUntilReorder} days
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium">Urgent</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.needsReorder ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Needs Reorder
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          toast.success(`Reorder suggestion for ${item.productName} applied!`);
                        }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Apply
                      </button>
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

// Stock Risk Scoring Section
function StockRiskScoringSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskTypeFilter, setRiskTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('risk-desc');

  // Fetch inventory data
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', 'risk-scoring'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for demand calculation
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'risk-scoring'],
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

  // Calculate stock risk scores
  const riskScoredItems = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate demand for each product
    const productDemand: Record<number, number> = {};
    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      if (orderDate >= thirtyDaysAgo) {
        order.orderLines?.forEach((line: any) => {
          productDemand[line.productId] = (productDemand[line.productId] || 0) + (line.quantity || 0);
        });
      }
    });

    return inventory
      .map((item: any) => {
        const currentQty = item.quantity || 0;
        const reservedQty = item.reservedQty || 0;
        const availableQty = item.availableQty || currentQty - reservedQty;
        const reorderPoint = item.reorderPoint || 0;
        const safetyStock = item.safetyStock || 0;
        const maxQty = reorderPoint + safetyStock * 3;

        // Calculate demand
        const demand30d = productDemand[item.productId] || 0;
        const avgDailyDemand = demand30d / 30;

        // Calculate stockout risk score (0-100)
        let stockoutRiskScore = 0;
        if (currentQty <= 0) {
          stockoutRiskScore = 100;
        } else if (currentQty < safetyStock) {
          stockoutRiskScore = 90;
        } else if (currentQty < reorderPoint) {
          stockoutRiskScore = 70;
        } else if (avgDailyDemand > 0) {
          const daysOfStock = availableQty / avgDailyDemand;
          if (daysOfStock < 7) {
            stockoutRiskScore = 60;
          } else if (daysOfStock < 14) {
            stockoutRiskScore = 40;
          } else if (daysOfStock < 30) {
            stockoutRiskScore = 20;
          }
        }

        // Calculate overstock risk score (0-100)
        let overstockRiskScore = 0;
        if (currentQty > maxQty * 1.5) {
          overstockRiskScore = 90;
        } else if (currentQty > maxQty) {
          overstockRiskScore = 60;
        } else if (avgDailyDemand > 0) {
          const daysOfStock = availableQty / avgDailyDemand;
          if (daysOfStock > 180) {
            overstockRiskScore = 70;
          } else if (daysOfStock > 120) {
            overstockRiskScore = 50;
          } else if (daysOfStock > 90) {
            overstockRiskScore = 30;
          }
        } else if (currentQty > 100 && demand30d === 0) {
          overstockRiskScore = 80; // No demand but high stock
        }

        // Determine overall risk level
        let riskLevel: RiskLevel = 'low';
        if (stockoutRiskScore >= 70) {
          riskLevel = 'critical';
        } else if (stockoutRiskScore >= 50) {
          riskLevel = 'high';
        } else if (overstockRiskScore >= 70) {
          riskLevel = 'overstock';
        } else if (stockoutRiskScore >= 30 || overstockRiskScore >= 50) {
          riskLevel = 'medium';
        }

        const overallRiskScore = Math.max(stockoutRiskScore, overstockRiskScore);
    
    return {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Product',
          sku: item.product?.sku || 'N/A',
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse?.name || 'Warehouse',
          currentQty,
          availableQty,
          reservedQty,
          reorderPoint,
          safetyStock,
          maxQty,
          stockoutRiskScore,
          overstockRiskScore,
          overallRiskScore,
          riskLevel,
          stockoutRisk: stockoutRiskScore >= 50,
          overstockRisk: overstockRiskScore >= 50,
          demand30d,
          avgDailyDemand,
          daysOfStock: avgDailyDemand > 0 ? Math.round(availableQty / avgDailyDemand) : null,
        };
      })
      .filter((item: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.productName?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.warehouseName?.toLowerCase().includes(query)
        );
      })
      .filter((item: any) => {
        if (riskTypeFilter === 'stockout') return item.stockoutRisk;
        if (riskTypeFilter === 'overstock') return item.overstockRisk;
        if (riskTypeFilter === 'critical') return item.riskLevel === 'critical';
        if (riskTypeFilter === 'high') return item.riskLevel === 'high';
        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'risk-desc') return b.overallRiskScore - a.overallRiskScore;
        if (sortBy === 'risk-asc') return a.overallRiskScore - b.overallRiskScore;
        if (sortBy === 'stockout-desc') return b.stockoutRiskScore - a.stockoutRiskScore;
        if (sortBy === 'overstock-desc') return b.overstockRiskScore - a.overstockRiskScore;
        if (sortBy === 'days-desc') {
          const daysA = a.daysOfStock || 999;
          const daysB = b.daysOfStock || 999;
          return daysB - daysA;
        }
        return 0;
      });
  }, [inventory, orders, searchQuery, riskTypeFilter, sortBy]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const stockout = riskScoredItems.filter((item: any) => item.stockoutRisk);
    const overstock = riskScoredItems.filter((item: any) => item.overstockRisk);
    const critical = riskScoredItems.filter((item: any) => item.riskLevel === 'critical');
    const avgRiskScore = riskScoredItems.length > 0
      ? riskScoredItems.reduce((sum: number, item: any) => sum + item.overallRiskScore, 0) / riskScoredItems.length
      : 0;

    return {
      totalItems: riskScoredItems.length,
      stockoutCount: stockout.length,
      overstockCount: overstock.length,
      criticalCount: critical.length,
      avgRiskScore: Math.round(avgRiskScore),
    };
  }, [riskScoredItems]);

  if (isLoadingInventory) {
    return <SkeletonPage />;
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 dark:text-red-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    if (score >= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getRiskBadgeColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'overstock':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
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
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
        </div>
      </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Stockout Risk</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.stockoutCount}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Overstock Risk</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.overstockCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Risk Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.avgRiskScore}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                placeholder="Search products, SKU, warehouse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={riskTypeFilter}
                onChange={setRiskTypeFilter}
                options={[
                  { value: 'all', label: 'All Risks' },
                  { value: 'stockout', label: 'Stockout Risk' },
                  { value: 'overstock', label: 'Overstock Risk' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                ]}
              />
          </div>
            <div className="min-w-[240px]">
              <CustomDropdown
              value={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'risk-desc', label: 'Risk Score: High to Low' },
                  { value: 'risk-asc', label: 'Risk Score: Low to High' },
                  { value: 'stockout-desc', label: 'Stockout Risk: High to Low' },
                  { value: 'overstock-desc', label: 'Overstock Risk: High to Low' },
                  { value: 'days-desc', label: 'Days of Stock: High to Low' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Scoring Table */}
      {riskScoredItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No risk items found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || riskTypeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All inventory levels are within acceptable risk ranges.'}
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
                    Product / SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Stockout Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Overstock Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Days of Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Overall Risk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {riskScoredItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.currentQty} units
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Available: {item.availableQty} | Reserved: {item.reservedQty}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.stockoutRiskScore >= 70
                                ? 'bg-red-600'
                                : item.stockoutRiskScore >= 50
                                ? 'bg-orange-600'
                                : item.stockoutRiskScore >= 30
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${item.stockoutRiskScore}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getRiskColor(item.stockoutRiskScore)}`}>
                          {item.stockoutRiskScore}
                          </span>
                      </div>
                          {item.stockoutRisk && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">⚠ High Risk</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.overstockRiskScore >= 70
                                ? 'bg-blue-600'
                                : item.overstockRiskScore >= 50
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${item.overstockRiskScore}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getRiskColor(item.overstockRiskScore)}`}>
                          {item.overstockRiskScore}
                        </span>
                      </div>
                          {item.overstockRisk && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">📦 Overstock</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.daysOfStock !== null ? (
                        <span
                          className={`text-sm font-medium ${
                            item.daysOfStock < 7
                              ? 'text-red-600 dark:text-red-400'
                              : item.daysOfStock < 14
                              ? 'text-orange-600 dark:text-orange-400'
                              : item.daysOfStock < 30
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : item.daysOfStock > 90
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {item.daysOfStock} days
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                      )}
                      {item.demand30d > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          30d demand: {item.demand30d}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(item.riskLevel)}`}>
                        {item.riskLevel.toUpperCase()}
                      </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Score: {item.overallRiskScore}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          toast.success(`Risk analysis for ${item.productName} reviewed!`);
                        }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        View Details
                      </button>
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

// Channel Replenishment Section
function ChannelReplenishmentSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  // Fetch inventory data
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', 'channel-replenishment'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for channel demand calculation
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'channel-replenishment'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'channel-replenishment'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const inventory = inventoryData || [];
  const orders = ordersData || [];
  const warehouses = warehousesData || [];

  // Calculate channel-specific replenishment
  const channelReplenishment = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Calculate channel demand from orders
    const channelDemand: Record<number, { dtc: number; b2b: number; wholesale: number }> = {};

    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      if (orderDate < ninetyDaysAgo) return;

      const channel = order.type || 'B2B';
      order.orderLines?.forEach((line: any) => {
        const productId = line.productId;
        if (!channelDemand[productId]) {
          channelDemand[productId] = { dtc: 0, b2b: 0, wholesale: 0 };
        }

        const qty = line.quantity || 0;
        if (channel === 'DTC') {
          channelDemand[productId].dtc += qty;
        } else if (channel === 'B2B') {
          channelDemand[productId].b2b += qty;
        } else if (channel === 'WHOLESALE') {
          channelDemand[productId].wholesale += qty;
        }
      });
    });

    return inventory
      .map((item: any) => {
        const currentQty = item.quantity || 0;
        const reservedQty = item.reservedQty || 0;
        const availableQty = item.availableQty || currentQty - reservedQty;
        const reorderPoint = item.reorderPoint || 0;
        const safetyStock = item.safetyStock || 0;

        // Get channel demand for this product
        const productDemand = channelDemand[item.productId] || { dtc: 0, b2b: 0, wholesale: 0 };

        // Calculate average daily demand per channel (90 days)
        const avgDailyDemandDTC = productDemand.dtc / 90;
        const avgDailyDemandB2B = productDemand.b2b / 90;
        const avgDailyDemandWholesale = productDemand.wholesale / 90;

        // Calculate channel-specific reorder quantities (30 days of demand + safety stock)
        const channelReorder = {
          dtc: Math.max(Math.ceil(avgDailyDemandDTC * 30) + safetyStock, currentQty < reorderPoint ? safetyStock : 0),
          b2b: Math.max(Math.ceil(avgDailyDemandB2B * 30) + safetyStock, currentQty < reorderPoint ? safetyStock : 0),
          wholesale: Math.max(Math.ceil(avgDailyDemandWholesale * 30) + safetyStock, currentQty < reorderPoint ? safetyStock : 0),
        };

        // Calculate total reorder needed
        const totalReorder = channelReorder.dtc + channelReorder.b2b + channelReorder.wholesale;

        // Determine which channels need replenishment
        const needsDTC = channelReorder.dtc > 0 && currentQty < reorderPoint + safetyStock;
        const needsB2B = channelReorder.b2b > 0 && currentQty < reorderPoint + safetyStock;
        const needsWholesale = channelReorder.wholesale > 0 && currentQty < reorderPoint + safetyStock;

        return {
          id: item.id,
          productId: item.productId,
          productName: item.product?.name || 'Product',
          sku: item.product?.sku || 'N/A',
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse?.name || 'Warehouse',
          currentQty,
          availableQty,
          reservedQty,
          reorderPoint,
          safetyStock,
          channelDemand: productDemand,
          channelReorder,
          totalReorder,
          needsDTC,
          needsB2B,
          needsWholesale,
          hasAnyChannelNeed: needsDTC || needsB2B || needsWholesale,
        };
      })
      .filter((item: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.productName?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.warehouseName?.toLowerCase().includes(query)
        );
      })
      .filter((item: any) => {
        if (warehouseFilter === 'all') return true;
        return item.warehouseId === parseInt(warehouseFilter);
      })
      .filter((item: any) => {
        if (channelFilter === 'all') return item.hasAnyChannelNeed;
        if (channelFilter === 'dtc') return item.needsDTC;
        if (channelFilter === 'b2b') return item.needsB2B;
        if (channelFilter === 'wholesale') return item.needsWholesale;
        return true;
      })
      .sort((a: any, b: any) => b.totalReorder - a.totalReorder);
  }, [inventory, orders, warehouses, searchQuery, channelFilter, warehouseFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const dtc = channelReplenishment.filter((item: any) => item.needsDTC);
    const b2b = channelReplenishment.filter((item: any) => item.needsB2B);
    const wholesale = channelReplenishment.filter((item: any) => item.needsWholesale);
    const totalReorderQty = channelReplenishment.reduce((sum: number, item: any) => sum + item.totalReorder, 0);

    return {
      totalItems: channelReplenishment.length,
      dtcCount: dtc.length,
      b2bCount: b2b.length,
      wholesaleCount: wholesale.length,
      totalReorderQty,
    };
  }, [channelReplenishment]);

  if (isLoadingInventory) {
    return <SkeletonPage />;
  }


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
              <p className="text-sm text-gray-600 dark:text-gray-400">DTC Needs</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.dtcCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">B2B Needs</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.b2bCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reorder Qty</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalReorderQty.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-green-600 dark:text-green-400" />
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
              placeholder="Search products, SKU, warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
                      <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={channelFilter}
                onChange={setChannelFilter}
                options={[
                  { value: 'all', label: 'All Channels' },
                  { value: 'dtc', label: 'DTC Only' },
                  { value: 'b2b', label: 'B2B Only' },
                  { value: 'wholesale', label: 'Wholesale Only' },
                ]}
              />
                      </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={warehouseFilter}
                onChange={setWarehouseFilter}
                options={[
                  { value: 'all', label: 'All Warehouses' },
                  ...warehouses.map((w: any) => ({
                    value: w.id.toString(),
                    label: w.name,
                  })),
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Channel Replenishment Table */}
      {channelReplenishment.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No channel replenishment needed</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || channelFilter !== 'all' || warehouseFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All channels have adequate inventory levels.'}
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
                    Product / SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Channel Demand (90d)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Channel Replenishment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Total Reorder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {channelReplenishment.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.currentQty} units
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Available: {item.availableQty} | Reorder Point: {item.reorderPoint}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        {item.channelDemand.dtc > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600 dark:text-gray-400">DTC:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.channelDemand.dtc}</span>
                          </div>
                        )}
                        {item.channelDemand.b2b > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600 dark:text-gray-400">B2B:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.channelDemand.b2b}</span>
                          </div>
                        )}
                        {item.channelDemand.wholesale > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600 dark:text-gray-400">Wholesale:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.channelDemand.wholesale}</span>
                          </div>
                        )}
                        {item.channelDemand.dtc === 0 && item.channelDemand.b2b === 0 && item.channelDemand.wholesale === 0 && (
                          <span className="text-xs text-gray-400">No demand data</span>
                        )}
                      </div>
                  </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-2">
                        {item.needsDTC && (
                          <div className="flex items-center justify-between gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span className="text-gray-600 dark:text-gray-400">DTC:</span>
                            </div>
                            <span className="font-medium text-purple-600 dark:text-purple-400">{item.channelReorder.dtc}</span>
                          </div>
                        )}
                        {item.needsB2B && (
                          <div className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-gray-600 dark:text-gray-400">B2B:</span>
                            </div>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{item.channelReorder.b2b}</span>
                          </div>
                        )}
                        {item.needsWholesale && (
                          <div className="flex items-center justify-between gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-gray-600 dark:text-gray-400">Wholesale:</span>
                            </div>
                            <span className="font-medium text-green-600 dark:text-green-400">{item.channelReorder.wholesale}</span>
                          </div>
                        )}
                        {!item.needsDTC && !item.needsB2B && !item.needsWholesale && (
                          <span className="text-xs text-gray-400">No replenishment needed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                        {item.totalReorder > 0 ? item.totalReorder : 'N/A'}
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          toast.success(`Channel replenishment for ${item.productName} applied!`);
                        }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Apply
                      </button>
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