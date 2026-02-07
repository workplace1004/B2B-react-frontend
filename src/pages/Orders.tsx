import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import {
  ShoppingCart,
  Edit,
  AlertTriangle,
  Package,
  Clock,
  Eye,
  Settings,
  Calendar,
  User,
  Truck,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import {
  PageHeader,
  TabsNavigation,
  SummaryCard,
  SearchAndFilterBar,
  Pagination,
  EmptyState,
} from '../components/ui';

// Types
interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customer?: {
    id: number;
    name: string;
    type: 'RETAILER' | 'B2B' | 'WHOLESALE';
  };
  type: 'DTC' | 'POS' | 'B2B' | 'WHOLESALE';
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  totalAmount: number;
  currency: string;
  orderDate: string;
  requiredDate?: string;
  shippedDate?: string;
  deliveredDate?: string;
  orderLines?: OrderLine[];
  isPreOrder?: boolean;
  isBackorder?: boolean;
  hasPartialShipment?: boolean;
  allocationRuleId?: number;
  notes?: string;
}

interface OrderLine {
  id: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    sku: string;
  };
  quantity: number;
  fulfilledQty: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  color?: string;
  isPreOrder?: boolean;
  isBackorder?: boolean;
  backorderQty?: number;
  preOrderQty?: number;
}

interface AllocationRule {
  id?: string | number;
  name: string;
  priority: number;
  channel?: 'DTC' | 'POS' | 'B2B' | 'WHOLESALE' | 'ALL';
  customerId?: number;
  customerType?: 'RETAILER' | 'B2B' | 'WHOLESALE' | 'ALL';
  warehouseId?: number;
  allocationMethod: 'FIFO' | 'LIFO' | 'PRIORITY' | 'ROUND_ROBIN' | 'PROXIMITY';
  conditions?: {
    minOrderValue?: number;
    maxOrderValue?: number;
    productCategory?: string;
    orderType?: string[];
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PreOrder {
  id?: string | number;
  orderId: number;
  orderNumber?: string;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  expectedDate?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
  createdAt?: string;
}

interface Backorder {
  id?: string | number;
  orderId: number;
  orderNumber?: string;
  orderLineId: number;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  status: 'PENDING' | 'ALLOCATED' | 'FULFILLED' | 'CANCELLED';
  createdAt?: string;
}

interface PartialShipment {
  id?: string | number;
  orderId: number;
  orderNumber?: string;
  shipmentNumber: string;
  items: PartialShipmentItem[];
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  shippedDate?: string;
  trackingNumber?: string;
  createdAt?: string;
}

interface PartialShipmentItem {
  orderLineId: number;
  productId: number;
  quantity: number;
}


export default function Orders() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'allocation-rules' | 'pre-orders' | 'backorders' | 'partial-shipments'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Local storage keys
  const ALLOCATION_RULES_KEY = 'orders_allocation_rules';
  const PRE_ORDERS_KEY = 'orders_pre_orders';
  const BACKORDERS_KEY = 'orders_backorders';
  const PARTIAL_SHIPMENTS_KEY = 'orders_partial_shipments';

  // Fetch orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
  });

  const orders: Order[] = useMemo(() => {
    const data = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
    return data.map((order: any) => ({
      ...order,
      type: order.type || 'B2B',
      isPreOrder: order.isPreOrder || false,
      isBackorder: order.isBackorder || false,
      hasPartialShipment: order.hasPartialShipment || false,
    }));
  }, [ordersData]);

  // Load allocation rules, pre-orders, backorders, and partial shipments from localStorage
  const [, setAllocationRules] = useState<AllocationRule[]>([]);
  const [, setPreOrders] = useState<PreOrder[]>([]);
  const [, setBackorders] = useState<Backorder[]>([]);
  const [, setPartialShipments] = useState<PartialShipment[]>([]);

  useEffect(() => {
    try {
      const storedRules = localStorage.getItem(ALLOCATION_RULES_KEY);
      if (storedRules) {
        setAllocationRules(JSON.parse(storedRules));
      }
    } catch (error) {
      console.error('Error loading allocation rules:', error);
    }

    try {
      const storedPreOrders = localStorage.getItem(PRE_ORDERS_KEY);
      if (storedPreOrders) {
        setPreOrders(JSON.parse(storedPreOrders));
      }
    } catch (error) {
      console.error('Error loading pre-orders:', error);
    }

    try {
      const storedBackorders = localStorage.getItem(BACKORDERS_KEY);
      if (storedBackorders) {
        setBackorders(JSON.parse(storedBackorders));
      }
    } catch (error) {
      console.error('Error loading backorders:', error);
    }

    try {
      const storedPartialShipments = localStorage.getItem(PARTIAL_SHIPMENTS_KEY);
      if (storedPartialShipments) {
        setPartialShipments(JSON.parse(storedPartialShipments));
      }
    } catch (error) {
      console.error('Error loading partial shipments:', error);
    }
  }, []);

  // Filter orders for inbox
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.customer?.name?.toLowerCase().includes(query) ||
          order.customerId.toString().includes(query)
      );
    }

    // Filter by order type is handled by channelFilter

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Filter by channel (for inbox tab)
    if (channelFilter !== 'all' && activeTab === 'inbox') {
      filtered = filtered.filter((order) => {
        if (channelFilter === 'DTC') return order.type === 'DTC';
        if (channelFilter === 'POS') return order.type === 'POS';
        if (channelFilter === 'B2B') return order.type === 'B2B' || order.type === 'WHOLESALE';
        return true;
      });
    }

    return filtered.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, searchQuery, statusFilter, channelFilter, activeTab]);

  // Pagination
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = orders.length;
    const dtc = orders.filter((o) => o.type === 'DTC').length;
    const pos = orders.filter((o) => o.type === 'POS').length;
    const b2b = orders.filter((o) => o.type === 'B2B' || o.type === 'WHOLESALE').length;
    const pending = orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED').length;
    const preOrderCount = orders.filter((o) => o.isPreOrder).length;
    const backorderCount = orders.filter((o) => o.isBackorder).length;
    const partialShipmentCount = orders.filter((o) => o.hasPartialShipment).length;

    return {
      total,
      dtc,
      pos,
      b2b,
      pending,
      preOrderCount,
      backorderCount,
      partialShipmentCount,
    };
  }, [orders]);

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'DTC':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'POS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'B2B':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'WHOLESALE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PARTIALLY_FULFILLED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'FULFILLED':
      case 'SHIPPED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
      case 'RETURNED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoadingOrders) {
    return <SkeletonPage />;
  }

  const tabs = [
    { id: 'inbox', label: 'Order Inbox', icon: ShoppingCart },
    { id: 'allocation-rules', label: 'Allocation Rules', icon: Settings },
    { id: 'pre-orders', label: 'Pre-Orders', icon: Calendar },
    { id: 'backorders', label: 'Backorders', icon: AlertTriangle },
    { id: 'partial-shipments', label: 'Partial Shipments', icon: Truck },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage DTC, POS, and B2B orders with allocation rules and fulfillment tracking"
        breadcrumbPage="Orders"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <SummaryCard
          label="Total Orders"
          value={summaryMetrics.total}
          icon={ShoppingCart}
          className="p-4"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <SummaryCard
          label="DTC"
          value={summaryMetrics.dtc}
          icon={Package}
          className="p-4"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          valueColor="text-blue-600 dark:text-blue-400"
        />
        <SummaryCard
          label="POS"
          value={summaryMetrics.pos}
          icon={ShoppingCart}
          className="p-4"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          valueColor="text-purple-600 dark:text-purple-400"
        />
        <SummaryCard
          label="B2B"
          value={summaryMetrics.b2b}
          icon={User}
          className="p-4"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
          valueColor="text-green-600 dark:text-green-400"
        />
        <SummaryCard
          label="Pending"
          value={summaryMetrics.pending}
          icon={Clock}
          className="p-4"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
          iconColor="text-yellow-600 dark:text-yellow-400"
          valueColor="text-yellow-600 dark:text-yellow-400"
        />
        <SummaryCard
          label="Pre-Orders"
          value={summaryMetrics.preOrderCount}
          icon={Calendar}
          className="p-4"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
          valueColor="text-orange-600 dark:text-orange-400"
        />
        <SummaryCard
          label="Backorders"
          value={summaryMetrics.backorderCount}
          icon={AlertTriangle}
          className="p-4"
          iconBgColor="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          valueColor="text-red-600 dark:text-red-400"
        />
        <SummaryCard
          label="Partial Shipments"
          value={summaryMetrics.partialShipmentCount}
          icon={Truck}
          className="p-4"
          iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
          iconColor="text-indigo-600 dark:text-indigo-400"
          valueColor="text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <TabsNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            setActiveTab(tabId as typeof activeTab);
            setCurrentPage(1);
          }}
          className="border-b border-gray-200 dark:border-gray-700"
        />

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <SearchAndFilterBar
                searchValue={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                searchPlaceholder="Search by order number, customer name..."
                filters={[
                  {
                    value: channelFilter,
                    onChange: (value) => {
                      setChannelFilter(value);
                      setCurrentPage(1);
                    },
                    options: [
                      { value: 'all', label: 'All Channels' },
                      { value: 'DTC', label: 'DTC' },
                      { value: 'POS', label: 'POS' },
                      { value: 'B2B', label: 'B2B' },
                    ],
                  },
                  {
                    value: statusFilter,
                    onChange: (value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    },
                    options: [
                      { value: 'all', label: 'All Status' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'CONFIRMED', label: 'Confirmed' },
                      { value: 'PROCESSING', label: 'Processing' },
                      { value: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
                      { value: 'FULFILLED', label: 'Fulfilled' },
                      { value: 'SHIPPED', label: 'Shipped' },
                      { value: 'DELIVERED', label: 'Delivered' },
                    ],
                  },
                ]}
                className="mb-6"
              />

              {/* Orders Table */}
              {paginatedOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title={searchQuery || channelFilter !== 'all' || statusFilter !== 'all'
                    ? 'No matching orders found'
                    : 'No orders found'}
                  description=""
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Order #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Flags
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {order.orderNumber}
                          </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {order.customer?.name || `Customer #${order.customerId}`}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderTypeColor(order.type)}`}
                              >
                                {order.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {order.currency} {Number(order.totalAmount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                              >
                                {order.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {order.isPreOrder && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" title="Pre-Order">
                                    PO
                                  </span>
                                )}
                                {order.isBackorder && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" title="Backorder">
                                    BO
                                  </span>
                                )}
                                {order.hasPartialShipment && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" title="Partial Shipment">
                                    PS
                                  </span>
                            )}
                          </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                              <button
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                              </button>
                    <button
                                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                                  title="Edit"
                    >
                                  <Edit className="w-4 h-4" />
                    </button>
                  </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalOrders}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
        </div>
          )}

          {activeTab === 'allocation-rules' && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Allocation rules feature coming in next part...</p>
      </div>
          )}

          {activeTab === 'pre-orders' && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Pre-orders feature coming in next part...</p>
                </div>
          )}

          {activeTab === 'backorders' && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Backorders feature coming in next part...</p>
              </div>
          )}

          {activeTab === 'partial-shipments' && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Partial shipments feature coming in next part...</p>
            </div>
          )}
            </div>
          </div>
        </div>
  );
}
