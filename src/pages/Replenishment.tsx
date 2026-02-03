import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Plus, AlertTriangle, TrendingUp, TrendingDown, Package, Search, Filter, BarChart3 } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'all' | 'dtc' | 'b2b' | 'wholesale';
type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'overstock';

interface ReplenishmentItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  warehouseId: number;
  warehouseName: string;
  currentQty: number;
  availableQty: number;
  reservedQty: number;
  reorderPoint: number;
  safetyStock: number;
  minQty: number;
  maxQty: number;
  suggestedReorderQty: number;
  riskLevel: RiskLevel;
  riskScore: number;
  stockoutRisk: boolean;
  overstockRisk: boolean;
  channelDemand: {
    dtc: number;
    b2b: number;
    wholesale: number;
  };
  channelReorder: {
    dtc: number;
    b2b: number;
    wholesale: number;
  };
}

export default function Replenishment() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('risk');

  // Fetch inventory data
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', 'replenishment'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for channel demand calculation
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders', 'replenishment'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const inventory = inventoryData || [];
  const orders = ordersData || [];

  // Calculate channel-specific demand from orders (last 90 days)
  const channelDemand = useMemo(() => {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const demand: Record<number, { dtc: number; b2b: number; wholesale: number }> = {};
    
    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      if (orderDate < ninetyDaysAgo) return;
      
      const channel = order.type || 'B2B';
      order.orderLines?.forEach((line: any) => {
        const productId = line.productId;
        if (!demand[productId]) {
          demand[productId] = { dtc: 0, b2b: 0, wholesale: 0 };
        }
        
        const qty = line.quantity || 0;
        if (channel === 'DTC') {
          demand[productId].dtc += qty;
        } else if (channel === 'B2B') {
          demand[productId].b2b += qty;
        } else if (channel === 'WHOLESALE') {
          demand[productId].wholesale += qty;
        }
      });
    });
    
    return demand;
  }, [orders]);

  // Calculate replenishment items with all metrics
  const replenishmentItems = useMemo(() => {
    return inventory.map((item: any): ReplenishmentItem => {
      const productName = item.product?.name || item.product?.sku || 'Product';
      const sku = item.product?.sku || 'N/A';
      const warehouseName = item.warehouse?.name || 'Warehouse';
      const currentQty = item.quantity || 0;
      const reservedQty = item.reservedQty || 0;
      const availableQty = item.availableQty || (currentQty - reservedQty);
      const reorderPoint = item.reorderPoint || 0;
      const safetyStock = item.safetyStock || 0;
      
      // Calculate min/max quantities
      const minQty = reorderPoint; // Minimum should be at reorder point
      const maxQty = reorderPoint + safetyStock * 3; // Max is reorder point + 3x safety stock
      
      // Calculate suggested reorder quantity
      // Formula: (reorderPoint + safetyStock) - currentQty, but at least safetyStock
      const suggestedReorderQty = Math.max(
        (reorderPoint + safetyStock) - currentQty,
        safetyStock
      );
      
      // Get channel demand for this product
      const productDemand = channelDemand[item.productId] || { dtc: 0, b2b: 0, wholesale: 0 };
      
      // Calculate channel-specific reorder quantities
      // Based on 30-day average demand per channel
      const avgDailyDemandDTC = productDemand.dtc / 90;
      const avgDailyDemandB2B = productDemand.b2b / 90;
      const avgDailyDemandWholesale = productDemand.wholesale / 90;
      
      // Reorder quantity per channel (30 days of demand + safety stock)
      const channelReorder = {
        dtc: Math.max(Math.ceil(avgDailyDemandDTC * 30) + safetyStock, safetyStock),
        b2b: Math.max(Math.ceil(avgDailyDemandB2B * 30) + safetyStock, safetyStock),
        wholesale: Math.max(Math.ceil(avgDailyDemandWholesale * 30) + safetyStock, safetyStock),
      };
      
      // Calculate risk score and level
      let riskScore = 0;
      let riskLevel: RiskLevel = 'low';
      let stockoutRisk = false;
      let overstockRisk = false;
      
      if (currentQty <= 0) {
        riskScore = 100;
        riskLevel = 'critical';
        stockoutRisk = true;
      } else if (currentQty < safetyStock) {
        riskScore = 85;
        riskLevel = 'critical';
        stockoutRisk = true;
      } else if (currentQty < reorderPoint) {
        riskScore = 70;
        riskLevel = 'high';
        stockoutRisk = true;
      } else if (currentQty < reorderPoint + safetyStock) {
        riskScore = 40;
        riskLevel = 'medium';
      } else if (currentQty > maxQty) {
        riskScore = 30;
        riskLevel = 'overstock';
        overstockRisk = true;
      } else {
        riskScore = 10;
        riskLevel = 'low';
      }
      
      return {
        id: item.id,
        productId: item.productId,
        productName,
        sku,
        warehouseId: item.warehouseId,
        warehouseName,
        currentQty,
        availableQty,
        reservedQty,
        reorderPoint,
        safetyStock,
        minQty,
        maxQty,
        suggestedReorderQty: Math.max(suggestedReorderQty, 0),
        riskLevel,
        riskScore,
        stockoutRisk,
        overstockRisk,
        channelDemand: productDemand,
        channelReorder,
      };
    });
  }, [inventory, channelDemand]);

  // Filter and sort replenishment items
  const filteredItems = useMemo(() => {
    let filtered = replenishmentItems;

  // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.warehouseName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by risk level
    if (riskFilter !== 'all') {
      filtered = filtered.filter((item) => item.riskLevel === riskFilter);
    }
    
    // Filter by channel tab
    if (activeTab !== 'all') {
      // Show items that need replenishment for the selected channel
      filtered = filtered.filter((item) => {
        if (activeTab === 'dtc') {
          return item.channelReorder.dtc > 0 && (item.stockoutRisk || item.currentQty < item.reorderPoint + item.safetyStock);
        } else if (activeTab === 'b2b') {
          return item.channelReorder.b2b > 0 && (item.stockoutRisk || item.currentQty < item.reorderPoint + item.safetyStock);
        } else if (activeTab === 'wholesale') {
          return item.channelReorder.wholesale > 0 && (item.stockoutRisk || item.currentQty < item.reorderPoint + item.safetyStock);
        }
        return true;
      });
    }
    
    // Sort items
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'risk') {
        return b.riskScore - a.riskScore;
      } else if (sortBy === 'quantity') {
        return a.currentQty - b.currentQty;
      } else if (sortBy === 'reorder') {
        return b.suggestedReorderQty - a.suggestedReorderQty;
      } else if (sortBy === 'product') {
        return a.productName.localeCompare(b.productName);
      }
      return 0;
    });
    
    return filtered;
  }, [replenishmentItems, searchQuery, activeTab, riskFilter, sortBy]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const critical = filteredItems.filter((item) => item.riskLevel === 'critical').length;
    const high = filteredItems.filter((item) => item.riskLevel === 'high').length;
    const medium = filteredItems.filter((item) => item.riskLevel === 'medium').length;
    const low = filteredItems.filter((item) => item.riskLevel === 'low').length;
    const overstock = filteredItems.filter((item) => item.riskLevel === 'overstock').length;
    const totalReorderQty = filteredItems.reduce((sum, item) => sum + item.suggestedReorderQty, 0);
    
    return {
      critical,
      high,
      medium,
      low,
      overstock,
      total: filteredItems.length,
      totalReorderQty,
    };
  }, [filteredItems]);

  const isLoading = isLoadingInventory || isLoadingOrders;

  if (isLoading) {
    return <SkeletonPage />;
  }

  const getRiskBadgeColor = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'overstock':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getRiskIcon = (riskLevel: RiskLevel) => {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return <AlertTriangle className="w-4 h-4" />;
    } else if (riskLevel === 'overstock') {
      return <TrendingDown className="w-4 h-4" />;
    }
    return <TrendingUp className="w-4 h-4" />;
  };

  return (
    <div>
      <Breadcrumb currentPage="Replenishment" />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Replenishment</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Reorder suggestions, stock risk scoring, and channel-based replenishment
            </p>
          </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Replenishment
            </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical Risk</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summaryStats.critical}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">High Risk</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summaryStats.high}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Reorder Qty</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{summaryStats.totalReorderQty.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {(['all', 'dtc', 'b2b', 'wholesale'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'all' ? 'All Channels' : tab.toUpperCase()}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-4 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, SKU, warehouse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Risk Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>
          
          {/* Sort */}
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="risk">Sort by Risk</option>
              <option value="quantity">Sort by Quantity</option>
              <option value="reorder">Sort by Reorder Qty</option>
              <option value="product">Sort by Product</option>
            </select>
          </div>
        </div>
      </div>

      {/* Replenishment Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No replenishments found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || riskFilter !== 'all' || activeTab !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'All inventory levels are optimal.'}
            </p>
          </div>
        ) : (
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
                    Stock Levels
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Min/Max/Safety
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Reorder Suggestions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Channel Replenishment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        SKU: {item.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Current: {item.currentQty}
                          </span>
                          {item.stockoutRisk && (
                            <span className="text-xs text-red-600 dark:text-red-400">⚠ Stockout Risk</span>
                          )}
                          {item.overstockRisk && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">📦 Overstock</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Available: {item.availableQty} | Reserved: {item.reservedQty}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>Min: {item.minQty}</div>
                      <div>Max: {item.maxQty}</div>
                      <div>Safety: {item.safetyStock}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getRiskBadgeColor(item.riskLevel)}`}>
                          {getRiskIcon(item.riskLevel)}
                          {item.riskLevel.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({item.riskScore})
                    </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-primary-600 dark:text-primary-400">
                          {item.suggestedReorderQty > 0 ? item.suggestedReorderQty : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Reorder Point: {item.reorderPoint}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        {item.channelReorder.dtc > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600 dark:text-gray-400">DTC:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.channelReorder.dtc}</span>
                          </div>
                        )}
                        {item.channelReorder.b2b > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600 dark:text-gray-400">B2B:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.channelReorder.b2b}</span>
                          </div>
                        )}
                        {item.channelReorder.wholesale > 0 && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600 dark:text-gray-400">Wholesale:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{item.channelReorder.wholesale}</span>
                          </div>
                        )}
                        {item.channelReorder.dtc === 0 && item.channelReorder.b2b === 0 && item.channelReorder.wholesale === 0 && (
                          <span className="text-xs text-gray-400">No channel data</span>
                        )}
                      </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                        View Details
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
