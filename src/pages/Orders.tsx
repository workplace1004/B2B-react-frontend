import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect, useMemo } from 'react';
import api from '../lib/api';
import {
  ShoppingCart,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  AlertTriangle,
  ChevronDown,
  Search,
  Package,
  Clock,
  Eye,
  Settings,
  Calendar,
  User,
  Truck,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

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

// Custom Select Component
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  error?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(options[highlightedIndex].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={selectRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 9999 : 'auto' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isOpen ? 'ring-2 ring-primary-500' : ''}`}
        style={{
          padding: '0.532rem 0.8rem 0.532rem 1.2rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.6,
        }}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-auto custom-dropdown-menu"
          style={{
            zIndex: 10001,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            position: 'absolute',
            maxHeight: '400px',
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                } ${index === 0 ? 'rounded-t-lg' : ''} ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  width: '100%',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


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

  return (
    <div>
      <Breadcrumb currentPage="Orders" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage DTC, POS, and B2B orders with allocation rules and fulfillment tracking
            </p>
          </div>
        </div>
            </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
                    <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
                    </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
                    <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">DTC</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.dtc}
              </p>
                    </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
                  <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">POS</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.pos}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
                    </div>
                  </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
                  <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">B2B</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.b2b}
              </p>
                          </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          </div>
                          </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pending}
              </p>
                      </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
          </div>
                  </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
                  <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pre-Orders</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.preOrderCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
                  </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
                  <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Backorders</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.backorderCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
                  </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
                  <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Partial Shipments</p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {summaryMetrics.partialShipmentCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
                  </div>
                </div>
              </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
                <button
              onClick={() => {
                setActiveTab('inbox');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'inbox'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Order Inbox
              </div>
                </button>
                <button
              onClick={() => {
                setActiveTab('allocation-rules');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'allocation-rules'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Allocation Rules
              </div>
                </button>
            <button
              onClick={() => {
                setActiveTab('pre-orders');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'pre-orders'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Pre-Orders
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('backorders');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'backorders'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Backorders
              </div>
            </button>
              <button
              onClick={() => {
                setActiveTab('partial-shipments');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'partial-shipments'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Partial Shipments
              </div>
              </button>
          </nav>
            </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by order number, customer name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                    </div>
                    <div>
                      <CustomSelect
                    value={channelFilter}
                    onChange={(value) => {
                      setChannelFilter(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Channels' },
                      { value: 'DTC', label: 'DTC' },
                      { value: 'POS', label: 'POS' },
                      { value: 'B2B', label: 'B2B' },
                    ]}
                      />
                    </div>
                  <div>
                    <CustomSelect
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'CONFIRMED', label: 'Confirmed' },
                      { value: 'PROCESSING', label: 'Processing' },
                      { value: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
                      { value: 'FULFILLED', label: 'Fulfilled' },
                      { value: 'SHIPPED', label: 'Shipped' },
                      { value: 'DELIVERED', label: 'Delivered' },
                    ]}
                  />
                </div>
                  </div>

              {/* Orders Table */}
              {paginatedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery || channelFilter !== 'all' || statusFilter !== 'all'
                      ? 'No matching orders found'
                      : 'No orders found'}
                  </p>
                          </div>
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
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalOrders)}</span> of{' '}
                        <span className="font-medium">{totalOrders}</span> orders
                  </div>
                      <div className="flex items-center gap-2">
                <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300 px-4">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-4 h-4 -rotate-90" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
          </div>
                  )}
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
