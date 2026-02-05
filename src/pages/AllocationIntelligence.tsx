import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Target,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Zap,
  ShoppingCart,
  Store,
  ChevronDown,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'recommendations' | 'simulator' | 'fulfillment-signals';

export default function AllocationIntelligence() {
  const [activeTab, setActiveTab] = useState<TabType>('recommendations');

  const tabs = [
    { id: 'recommendations' as TabType, label: 'Allocation Recommendations', icon: Target },
    { id: 'simulator' as TabType, label: 'Allocation Simulator', icon: BarChart3 },
    { id: 'fulfillment-signals' as TabType, label: 'Fulfillment Optimization', icon: Zap },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Allocation Intelligence" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Allocation Intelligence</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Optimize stock allocation, simulate scenarios, and optimize fulfillment strategies
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
        {activeTab === 'recommendations' && <AllocationRecommendationsSection />}
        {activeTab === 'simulator' && <AllocationSimulatorSection />}
        {activeTab === 'fulfillment-signals' && <FulfillmentOptimizationSection />}
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
        className={`w-full px-3 py-[10px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-between cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
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

// Allocation Recommendations Section
function AllocationRecommendationsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Fetch pending orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'allocation-recommendations'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'allocation-recommendations'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'allocation-recommendations'],
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
    queryKey: ['warehouses', 'allocation-recommendations'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];
  const customers = customersData || [];
  const inventory = inventoryData || [];
  const warehouses = warehousesData || [];

  // Calculate allocation recommendations
  const allocationRecommendations = useMemo(() => {
    const pendingOrders = orders.filter(
      (order: any) =>
        order.status === 'PENDING' ||
        order.status === 'CONFIRMED' ||
        order.status === 'PROCESSING' ||
        order.status === 'PARTIALLY_FULFILLED'
    );

    return pendingOrders
      .flatMap((order: any) => {
        const customer = customers.find((c: any) => c.id === order.customerId);
        if (!customer) return [];

        // Calculate customer priority score
        const customerPriority = calculateCustomerPriority(customer, orders);

        return (order.orderLines || []).map((line: any) => {
          const product = line.product;
          if (!product) return null;

          // Get available inventory across warehouses
          const productInventory = inventory.filter((inv: any) => inv.productId === product.id);
          const totalAvailable = productInventory.reduce(
            (sum: number, inv: any) => sum + (inv.availableQty || inv.quantity || 0),
            0
          );

          const requestedQty = line.quantity - (line.fulfilledQty || 0);
          if (requestedQty <= 0 || totalAvailable <= 0) return null;

          // Calculate allocation priority score
          const orderValue = parseFloat(line.totalPrice || 0);
          const orderAge = Math.floor(
            (new Date().getTime() - new Date(order.orderDate || order.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // Priority factors
          const priorityScore =
            customerPriority * 0.4 + // Customer importance (40%)
            Math.min(orderValue / 10000, 1) * 0.3 + // Order value (30%)
            Math.min(orderAge / 30, 1) * 0.2 + // Order age (20%)
            (order.type === 'WHOLESALE' ? 0.1 : 0) * 0.1; // Order type (10%)

          // Find best warehouse for allocation
          const warehouseRecommendations = productInventory
            .map((inv: any) => {
              const warehouse = warehouses.find((w: any) => w.id === inv.warehouseId);
              if (!warehouse) return null;

              const available = inv.availableQty || inv.quantity || 0;
              if (available <= 0) return null;

              // Calculate warehouse score (proximity, availability, etc.)
              const warehouseScore = calculateWarehouseScore(
                warehouse,
                customer,
                available,
                requestedQty
              );

              return {
                warehouse,
                inventory: inv,
                available,
                score: warehouseScore,
                recommendedQty: Math.min(available, requestedQty),
              };
            })
            .filter((w: any) => w !== null)
            .sort((a: any, b: any) => b.score - a.score);

          const bestWarehouse = warehouseRecommendations[0];

          return {
            order,
            orderLine: line,
            customer,
            product,
            requestedQty,
            totalAvailable,
            priorityScore,
            orderValue,
            orderAge,
            customerPriority,
            warehouseRecommendations,
            bestWarehouse,
            allocationStatus:
              totalAvailable >= requestedQty
                ? 'fully-allocatable'
                : totalAvailable > 0
                ? 'partially-allocatable'
                : 'unavailable',
          };
        });
      })
      .filter((item: any) => item !== null)
      .filter((item: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.product?.name?.toLowerCase().includes(query) ||
          item.product?.sku?.toLowerCase().includes(query) ||
          item.customer?.name?.toLowerCase().includes(query) ||
          item.order?.orderNumber?.toLowerCase().includes(query)
        );
      })
      .filter((item: any) => {
        if (priorityFilter === 'high') return item.priorityScore >= 0.7;
        if (priorityFilter === 'medium') return item.priorityScore >= 0.4 && item.priorityScore < 0.7;
        if (priorityFilter === 'low') return item.priorityScore < 0.4;
        return true;
      })
      .filter((item: any) => {
        if (productFilter === 'available') return item.allocationStatus !== 'unavailable';
        if (productFilter === 'unavailable') return item.allocationStatus === 'unavailable';
        return true;
      })
      .sort((a: any, b: any) => b.priorityScore - a.priorityScore);
  }, [orders, customers, inventory, warehouses, searchQuery, priorityFilter, productFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const highPriority = allocationRecommendations.filter((item: any) => item.priorityScore >= 0.7);
    const fullyAllocatable = allocationRecommendations.filter(
      (item: any) => item.allocationStatus === 'fully-allocatable'
    );
    const totalValue = allocationRecommendations.reduce((sum: number, item: any) => sum + item.orderValue, 0);
    const totalRequested = allocationRecommendations.reduce(
      (sum: number, item: any) => sum + item.requestedQty,
      0
    );

    return {
      totalRecommendations: allocationRecommendations.length,
      highPriorityCount: highPriority.length,
      fullyAllocatableCount: fullyAllocatable.length,
      totalValue,
      totalRequested,
    };
  }, [allocationRecommendations]);

  if (ordersLoading) {
    return <SkeletonPage />;
  }

  const getPriorityColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 0.7) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Recommendations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalRecommendations}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.highPriorityCount}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Fully Allocatable</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.fullyAllocatableCount}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalValue.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              placeholder="Search orders, products, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[180px]">
              <CustomDropdown
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'high', label: 'High Priority' },
                  { value: 'medium', label: 'Medium Priority' },
                  { value: 'low', label: 'Low Priority' },
                ]}
              />
            </div>
            <div className="min-w-[180px]">
              <CustomDropdown
                value={productFilter}
                onChange={setProductFilter}
                options={[
                  { value: 'all', label: 'All Products' },
                  { value: 'available', label: 'Available' },
                  { value: 'unavailable', label: 'Unavailable' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Recommendations Table */}
      {allocationRecommendations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Target className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No allocation recommendations found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || priorityFilter !== 'all' || productFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No pending orders requiring allocation.'}
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
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Recommended Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {allocationRecommendations.map((item: any, idx: number) => (
                  <tr key={`${item.order.id}-${item.orderLine.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                          item.priorityScore
                        )}`}
                      >
                        {getPriorityLabel(item.priorityScore)}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Score: {(item.priorityScore * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.order.orderNumber}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.orderAge} days old
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.customer.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Priority: {(item.customerPriority * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.requestedQty} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          item.allocationStatus === 'fully-allocatable'
                            ? 'text-green-600 dark:text-green-400'
                            : item.allocationStatus === 'partially-allocatable'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.totalAvailable} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.bestWarehouse ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.bestWarehouse.warehouse.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.bestWarehouse.recommendedQty} units
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">No warehouse</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${item.orderValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          toast.success(`Allocation recommendation for ${item.product.name} applied!`);
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

// Helper function to calculate customer priority
function calculateCustomerPriority(customer: any, allOrders: any[]): number {
  const customerOrders = allOrders.filter((o: any) => o.customerId === customer.id);
  const totalValue = customerOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || 0), 0);
  const orderCount = customerOrders.length;

  // Base priority from customer type
  let priority = 0.5;
  if (customer.type === 'WHOLESALE') priority = 0.8;
  else if (customer.type === 'B2B') priority = 0.6;
  else if (customer.type === 'RETAILER') priority = 0.4;

  // Adjust based on order history
  if (totalValue > 100000) priority += 0.2;
  else if (totalValue > 50000) priority += 0.1;
  else if (totalValue > 10000) priority += 0.05;

  if (orderCount > 50) priority += 0.1;
  else if (orderCount > 20) priority += 0.05;

  return Math.min(priority, 1.0);
}

// Helper function to calculate warehouse score
function calculateWarehouseScore(warehouse: any, customer: any, available: number, requested: number): number {
  let score = 0.5; // Base score

  // Availability score (higher availability = higher score)
  const availabilityRatio = available / requested;
  score += Math.min(availabilityRatio / 2, 0.3);

  // Proximity score (if same country/city, higher score)
  if (warehouse.country && customer.country && warehouse.country === customer.country) {
    score += 0.1;
    if (warehouse.city && customer.city && warehouse.city === customer.city) {
      score += 0.1;
    }
  }

  return Math.min(score, 1.0);
}

// Allocation Simulator Section
function AllocationSimulatorSection() {
  const [serviceLevelTarget, setServiceLevelTarget] = useState<number>(95);
  const [marginTarget, setMarginTarget] = useState<number>(30);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products', 'allocation-simulator'],
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
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'allocation-simulator'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'allocation-simulator'],
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
    queryKey: ['warehouses', 'allocation-simulator'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  const inventory = inventoryData || [];
  const orders = ordersData || [];
  const warehouses = warehousesData || [];

  // Simulate allocation scenarios
  const simulationResults = useMemo(() => {
    const scenarios = [
      { name: 'Service Level Focus', serviceLevelWeight: 0.8, marginWeight: 0.2 },
      { name: 'Balanced', serviceLevelWeight: 0.5, marginWeight: 0.5 },
      { name: 'Margin Focus', serviceLevelWeight: 0.2, marginWeight: 0.8 },
    ];

    return scenarios.map((scenario) => {
      // Calculate metrics for this scenario
      const filteredInventory = selectedProduct !== 'all'
        ? inventory.filter((inv: any) => inv.productId === parseInt(selectedProduct))
        : inventory;

      const filteredWarehouses = selectedWarehouse !== 'all'
        ? filteredInventory.filter((inv: any) => inv.warehouseId === parseInt(selectedWarehouse))
        : filteredInventory;

      const totalInventory = filteredWarehouses.reduce(
        (sum: number, inv: any) => sum + (inv.availableQty || inv.quantity || 0),
        0
      );

      const pendingOrders = orders.filter(
        (order: any) =>
          order.status === 'PENDING' ||
          order.status === 'CONFIRMED' ||
          order.status === 'PROCESSING'
      );

      const totalDemand = pendingOrders.reduce((sum: number, order: any) => {
        return (
          sum +
          (order.orderLines?.reduce((lineSum: number, line: any) => {
            if (selectedProduct !== 'all' && line.productId !== parseInt(selectedProduct)) {
              return lineSum;
            }
            return lineSum + (line.quantity - (line.fulfilledQty || 0));
          }, 0) || 0)
        );
      }, 0);

      const fillRate = totalDemand > 0 ? Math.min((totalInventory / totalDemand) * 100, 100) : 100;
      const serviceLevel = Math.min(fillRate, serviceLevelTarget);

      // Calculate margin impact (simplified)
      const avgMargin = marginTarget;
      const marginImpact = scenario.marginWeight > 0.5 ? avgMargin * 1.1 : avgMargin * 0.95;

      // Calculate overall score
      const serviceLevelScore = (serviceLevel / 100) * scenario.serviceLevelWeight;
      const marginScore = (marginImpact / 100) * scenario.marginWeight;
      const overallScore = (serviceLevelScore + marginScore) * 100;

      return {
        ...scenario,
        totalInventory,
        totalDemand,
        fillRate,
        serviceLevel,
        marginImpact,
        overallScore,
        recommendation: overallScore >= 80 ? 'high' : overallScore >= 60 ? 'medium' : 'low',
      };
    });
  }, [
    inventory,
    orders,
    serviceLevelTarget,
    marginTarget,
    selectedProduct,
    selectedWarehouse,
  ]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Simulation Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Level Target (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={serviceLevelTarget}
              onChange={(e) => setServiceLevelTarget(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Margin Target (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={marginTarget}
              onChange={(e) => setMarginTarget(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product
            </label>
            <CustomDropdown
              value={selectedProduct}
              onChange={setSelectedProduct}
              options={[
                { value: 'all', label: 'All Products' },
                ...products.map((product: any) => ({
                  value: product.id.toString(),
                  label: product.name,
                })),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Warehouse
            </label>
            <CustomDropdown
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              options={[
                { value: 'all', label: 'All Warehouses' },
                ...warehouses.map((warehouse: any) => ({
                  value: warehouse.id.toString(),
                  label: warehouse.name,
                })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Simulation Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {simulationResults.map((result: any, idx: number) => (
          <div
            key={idx}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 p-6 ${
              result.recommendation === 'high'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : result.recommendation === 'medium'
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{result.name}</h3>
              {result.recommendation === 'high' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-600 text-white">
                  Recommended
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Service Level</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {result.serviceLevel.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${result.serviceLevel}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Margin Impact</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {result.marginImpact.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${result.marginImpact}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Overall Score</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {result.overallScore.toFixed(0)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div>Inventory: {result.totalInventory} units</div>
                <div>Demand: {result.totalDemand} units</div>
                <div>Fill Rate: {result.fillRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Fulfillment Optimization Signals Section
function FulfillmentOptimizationSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [signalFilter, setSignalFilter] = useState<string>('all');

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'fulfillment-signals'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'fulfillment-signals'],
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
    queryKey: ['warehouses', 'fulfillment-signals'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];
  const inventory = inventoryData || [];
  const warehouses = warehousesData || [];

  // Generate fulfillment optimization signals
  const fulfillmentSignals = useMemo(() => {
    const signals: any[] = [];

    // BOPIS (Buy Online Pickup In Store) opportunities
    orders.forEach((order: any) => {
      if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
        order.orderLines?.forEach((line: any) => {
          const product = line.product;
          if (!product) return;

          const productInventory = inventory.filter((inv: any) => inv.productId === product.id);
          const availableWarehouses = productInventory.filter(
            (inv: any) => (inv.availableQty || inv.quantity || 0) >= line.quantity
          );

          if (availableWarehouses.length > 0) {
            // Check if customer location matches warehouse location (BOPIS opportunity)
            const customer = order.customer;
            availableWarehouses.forEach((inv: any) => {
              const warehouse = warehouses.find((w: any) => w.id === inv.warehouseId);
              if (warehouse && customer) {
                const isBOPIS = warehouse.city && customer.city && warehouse.city === customer.city;
                const isBORIS = !isBOPIS && warehouse.country === customer.country;

                if (isBOPIS || isBORIS) {
                  signals.push({
                    type: isBOPIS ? 'BOPIS' : 'BORIS',
                    order,
                    orderLine: line,
                    product,
                    warehouse,
                    customer,
                    availableQty: inv.availableQty || inv.quantity || 0,
                    requestedQty: line.quantity,
                    priority: isBOPIS ? 'high' : 'medium',
                    savings: isBOPIS ? 15 : 10, // Estimated shipping cost savings %
                    recommendation: isBOPIS
                      ? 'Enable BOPIS - Customer can pick up from nearby store'
                      : 'Enable BORIS - Reserve for customer pickup',
                  });
                }
              }
            });
          }
        });
      }
    });

    // Remove duplicates and filter
    const uniqueSignals = signals.filter(
      (signal, index, self) =>
        index ===
        self.findIndex(
          (s) =>
            s.order.id === signal.order.id &&
            s.orderLine.id === signal.orderLine.id &&
            s.warehouse.id === signal.warehouse.id
        )
    );

    return uniqueSignals
      .filter((signal: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          signal.product?.name?.toLowerCase().includes(query) ||
          signal.customer?.name?.toLowerCase().includes(query) ||
          signal.order?.orderNumber?.toLowerCase().includes(query) ||
          signal.warehouse?.name?.toLowerCase().includes(query)
        );
      })
      .filter((signal: any) => {
        if (signalFilter === 'BOPIS') return signal.type === 'BOPIS';
        if (signalFilter === 'BORIS') return signal.type === 'BORIS';
        if (signalFilter === 'high') return signal.priority === 'high';
        return true;
      })
      .sort((a: any, b: any) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return b.savings - a.savings;
      });
  }, [orders, inventory, warehouses, searchQuery, signalFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const bopis = fulfillmentSignals.filter((s: any) => s.type === 'BOPIS');
    const boris = fulfillmentSignals.filter((s: any) => s.type === 'BORIS');
    const totalSavings = fulfillmentSignals.reduce((sum: number, s: any) => {
      const orderValue = parseFloat(s.orderLine.totalPrice || 0);
      return sum + (orderValue * s.savings) / 100;
    }, 0);

    return {
      totalSignals: fulfillmentSignals.length,
      bopisCount: bopis.length,
      borisCount: boris.length,
      totalSavings,
    };
  }, [fulfillmentSignals]);

  if (ordersLoading) {
    return <SkeletonPage />;
  }

  const getSignalColor = (type: string) => {
    if (type === 'BOPIS') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Signals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalSignals}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">BOPIS Opportunities</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.bopisCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">BORIS Opportunities</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.borisCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Potential Savings</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                ${summaryMetrics.totalSavings.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
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
              placeholder="Search orders, products, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[180px]">
              <CustomDropdown
                value={signalFilter}
                onChange={setSignalFilter}
                options={[
                  { value: 'all', label: 'All Signals' },
                  { value: 'BOPIS', label: 'BOPIS Only' },
                  { value: 'BORIS', label: 'BORIS Only' },
                  { value: 'high', label: 'High Priority' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fulfillment Signals Table */}
      {fulfillmentSignals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No fulfillment signals found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || signalFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No BOPIS/BORIS opportunities found at this time.'}
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
                    Signal Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Savings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Recommendation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {fulfillmentSignals.map((signal: any, idx: number) => (
                  <tr key={`${signal.order.id}-${signal.orderLine.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSignalColor(signal.type)}`}>
                        {signal.type}
                      </span>
                      {signal.priority === 'high' && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">High Priority</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {signal.order.orderNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {signal.customer.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {signal.customer.city || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {signal.product.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Qty: {signal.requestedQty}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {signal.warehouse.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {signal.warehouse.city || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {signal.savings}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${((parseFloat(signal.orderLine.totalPrice || 0) * signal.savings) / 100).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white max-w-xs">
                        {signal.recommendation}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          toast.success(`${signal.type} signal applied for ${signal.product.name}!`);
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