import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  Award,
  Star,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Search,
  X,
  Truck,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { useLocation } from 'react-router-dom';

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';

interface Order {
  id: string | number;
  orderNumber: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  itemsCount: number;
  shippingAddress?: string;
  paymentMethod?: string;
  trackingNumber?: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string | number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface LoyaltyStatus {
  tier: LoyaltyTier;
  points: number;
  pointsToNextTier?: number;
  totalSpent: number;
  totalOrders: number;
  joinDate: string;
  nextTier?: LoyaltyTier;
}

export default function CustomerProfile() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const customerId = searchParams.get('id');

  const { data, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      try {
        const response = await api.get(`/customers/${customerId}`);
        return response.data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!customerId,
  });

  // Fetch customer orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      try {
        const response = await api.get(`/orders?customerId=${customerId}&skip=0&take=1000`);
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!customerId,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (isLoading) {
    return <SkeletonPage />;
  }

  if (!customerId || !data) {
    return (
      <div>
        <Breadcrumb currentPage="Customer Profile" />
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Customer Profile</h1>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customer selected</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Please select a customer to view their profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!ordersData) return [];
    
    let filtered = ordersData as Order[];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.trackingNumber?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const cutoff = new Date();
      switch (dateRangeFilter) {
        case '7d':
          cutoff.setDate(cutoff.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(cutoff.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(cutoff.getDate() - 90);
          break;
        case '1y':
          cutoff.setFullYear(cutoff.getFullYear() - 1);
          break;
      }
      filtered = filtered.filter((order) => new Date(order.orderDate) >= cutoff);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [ordersData, searchQuery, statusFilter, dateRangeFilter]);

  // Calculate order statistics
  const orderStats = useMemo(() => {
    if (!ordersData) {
      return {
        total: 0,
        totalSpent: 0,
        averageOrder: 0,
        pending: 0,
        completed: 0,
      };
    }

    const orders = ordersData as Order[];
    const total = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrder = total > 0 ? totalSpent / total : 0;
    const pending = orders.filter((o) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === 'DELIVERED').length;

    return { total, totalSpent, averageOrder, pending, completed };
  }, [ordersData]);

  // Generate loyalty status (mock data for now)
  const loyaltyStatus: LoyaltyStatus = useMemo(() => {
    const totalSpent = orderStats.totalSpent;
    const totalOrders = orderStats.total;
    
    let tier: LoyaltyTier = 'BRONZE';
    let nextTier: LoyaltyTier | undefined = 'SILVER';
    let pointsToNextTier: number | undefined = 0;

    if (totalSpent >= 10000) {
      tier = 'VIP';
      nextTier = undefined;
      pointsToNextTier = undefined;
    } else if (totalSpent >= 5000) {
      tier = 'PLATINUM';
      nextTier = 'VIP';
      pointsToNextTier = 10000 - totalSpent;
    } else if (totalSpent >= 2500) {
      tier = 'GOLD';
      nextTier = 'PLATINUM';
      pointsToNextTier = 5000 - totalSpent;
    } else if (totalSpent >= 1000) {
      tier = 'SILVER';
      nextTier = 'GOLD';
      pointsToNextTier = 2500 - totalSpent;
    } else {
      tier = 'BRONZE';
      nextTier = 'SILVER';
      pointsToNextTier = 1000 - totalSpent;
    }

    return {
      tier,
      points: Math.floor(totalSpent / 10), // 1 point per $10 spent
      pointsToNextTier,
      totalSpent,
      totalOrders,
      joinDate: data?.createdAt || new Date().toISOString(),
      nextTier,
    };
  }, [orderStats, data?.createdAt]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getLoyaltyTierColor = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'VIP':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PLATINUM':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'GOLD':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'SILVER':
        return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-300';
      case 'BRONZE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getLoyaltyTierIcon = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'VIP':
        return Crown;
      case 'PLATINUM':
      case 'GOLD':
        return Award;
      case 'SILVER':
      case 'BRONZE':
        return Star;
      default:
        return Star;
    }
  };

  return (
    <div>
      <Breadcrumb currentPage="Customer Profile" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Customer Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              View customer details, order history, and loyalty status
            </p>
          </div>
        </div>
      </div>

      {/* Customer Information Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-[24px] font-bold text-gray-900 dark:text-white">{data?.name || 'N/A'}</h2>
              {data?.segment && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  data.segment === 'VIP' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                  data.segment === 'B2B' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {data?.segment === 'VIP' && <Crown className="w-3 h-3" />}
                  {data?.segment}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data?.email || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data?.phone || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data?.companyName || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data?.city || 'N/A'}, {data?.country || ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty Status Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Loyalty Status
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">Current Tier</p>
              {(() => {
                const TierIcon = getLoyaltyTierIcon(loyaltyStatus.tier);
                return <TierIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
              })()}
            </div>
            <p className={`text-2xl font-bold ${getLoyaltyTierColor(loyaltyStatus.tier).split(' ')[1]}`}>
              {loyaltyStatus.tier}
            </p>
            {loyaltyStatus.nextTier && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Next: {loyaltyStatus.nextTier}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Loyalty Points</p>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-[24px] font-bold text-gray-900 dark:text-white">
              {loyaltyStatus.points.toLocaleString()}
            </p>
            {loyaltyStatus.pointsToNextTier !== undefined && loyaltyStatus.pointsToNextTier > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.ceil(loyaltyStatus.pointsToNextTier / 10)} points to next tier
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Spent</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-[24px] font-bold text-gray-900 dark:text-white">
              ${loyaltyStatus.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {loyaltyStatus.totalOrders} order{loyaltyStatus.totalOrders !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Member Since</p>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {new Date(loyaltyStatus.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Math.floor((new Date().getTime() - new Date(loyaltyStatus.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
            </p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {loyaltyStatus.nextTier && loyaltyStatus.pointsToNextTier !== undefined && loyaltyStatus.pointsToNextTier > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress to {loyaltyStatus.nextTier}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ${Math.ceil(loyaltyStatus.pointsToNextTier).toLocaleString()} remaining
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((loyaltyStatus.totalSpent - (loyaltyStatus.totalSpent - loyaltyStatus.pointsToNextTier)) / loyaltyStatus.pointsToNextTier) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {orderStats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                ${orderStats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Order</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${orderStats.averageOrder.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {orderStats.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {orderStats.completed}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Order History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Order History
            </h3>
            {ordersLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tracking
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p>{ordersLoading ? 'Loading orders...' : 'No orders found'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: Order) => {
                  const orderDate = new Date(order.orderDate);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          #{order.orderNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{orderDate.toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Package className="w-4 h-4" />
                          <span>{order.itemsCount || 0} item{(order.itemsCount || 0) !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${(order.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status === 'DELIVERED' && <CheckCircle className="w-3 h-3" />}
                          {order.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                          {order.status === 'REFUNDED' && <AlertCircle className="w-3 h-3" />}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.trackingNumber ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Truck className="w-4 h-4" />
                            <span className="font-mono">{order.trackingNumber}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loyalty Status Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Loyalty Status
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">Current Tier</p>
              {(() => {
                const TierIcon = getLoyaltyTierIcon(loyaltyStatus.tier);
                return <TierIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
              })()}
            </div>
            <p className={`text-2xl font-bold ${getLoyaltyTierColor(loyaltyStatus.tier).split(' ')[1]}`}>
              {loyaltyStatus.tier}
            </p>
            {loyaltyStatus.nextTier && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                Next: {loyaltyStatus.nextTier}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Loyalty Points</p>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-[24px] font-bold text-gray-900 dark:text-white">
              {loyaltyStatus.points.toLocaleString()}
            </p>
            {loyaltyStatus.pointsToNextTier !== undefined && loyaltyStatus.pointsToNextTier > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.ceil(loyaltyStatus.pointsToNextTier / 10)} points to next tier
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Spent</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-[24px] font-bold text-gray-900 dark:text-white">
              ${loyaltyStatus.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {loyaltyStatus.totalOrders} order{loyaltyStatus.totalOrders !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Member Since</p>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {new Date(loyaltyStatus.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Math.floor((new Date().getTime() - new Date(loyaltyStatus.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
            </p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {loyaltyStatus.nextTier && loyaltyStatus.pointsToNextTier !== undefined && loyaltyStatus.pointsToNextTier > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress to {loyaltyStatus.nextTier}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ${Math.ceil(loyaltyStatus.pointsToNextTier).toLocaleString()} remaining
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((loyaltyStatus.totalSpent - (loyaltyStatus.totalSpent - loyaltyStatus.pointsToNextTier)) / loyaltyStatus.pointsToNextTier) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {orderStats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                ${orderStats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Order</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${orderStats.averageOrder.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {orderStats.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {orderStats.completed}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Order History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Order History
            </h3>
            {ordersLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tracking
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p>{ordersLoading ? 'Loading orders...' : 'No orders found'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: Order) => {
                  const orderDate = new Date(order.orderDate);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          #{order.orderNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{orderDate.toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Package className="w-4 h-4" />
                          <span>{order.itemsCount || 0} item{(order.itemsCount || 0) !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${(order.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status === 'DELIVERED' && <CheckCircle className="w-3 h-3" />}
                          {order.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                          {order.status === 'REFUNDED' && <AlertCircle className="w-3 h-3" />}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.trackingNumber ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Truck className="w-4 h-4" />
                            <span className="font-mono">{order.trackingNumber}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
              onClick={() => setSelectedOrder(null)}
            ></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Order Details
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Order #{selectedOrder.orderNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Order Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Order Number
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono">
                      #{selectedOrder.orderNumber}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Order Date
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                      {new Date(selectedOrder.orderDate).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status === 'DELIVERED' && <CheckCircle className="w-3 h-3" />}
                        {selectedOrder.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                        {selectedOrder.status === 'REFUNDED' && <AlertCircle className="w-3 h-3" />}
                        {selectedOrder.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Total Amount
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm font-semibold text-gray-900 dark:text-white">
                      ${(selectedOrder.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  {selectedOrder.trackingNumber && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tracking Number
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono">
                        {selectedOrder.trackingNumber}
                      </div>
                    </div>
                  )}
                  {selectedOrder.paymentMethod && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Payment Method
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                        {selectedOrder.paymentMethod}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shipping Address */}
                {selectedOrder.shippingAddress && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Shipping Address</h4>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                      {selectedOrder.shippingAddress}
                    </div>
                  </div>
                )}

                {/* Order Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Order Items</h4>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.productName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Quantity: {item.quantity} × ${item.unitPrice.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              ${item.totalPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
