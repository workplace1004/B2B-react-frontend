import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import api from '../lib/api';
import { BarChart3, Package, ArrowUp, ArrowDown, TrendingUp, PieChart as PieChartIcon, ShoppingCart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { SkeletonStatsCard, SkeletonChart, SkeletonTable } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function Analytics() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'orders' | 'customers'>('revenue');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch orders data
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: async () => {
      const response = await api.get('/orders?skip=0&take=10000');
      return response.data?.data || [];
    },
  });

  // Fetch sales report for current period
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['analytics', 'sales', startDate, endDate],
    queryFn: async () => {
      try {
        const response = await api.get(`/analytics/sales?startDate=${startDate}&endDate=${endDate}`);
        return response.data;
      } catch (error) {
        return { orders: [], totalRevenue: 0, orderCount: 0 };
      }
    },
  });

  // Fetch previous period data for growth calculation
  const getPreviousPeriodDates = () => {
    const end = new Date(startDate);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    const daysDiff = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    start.setDate(start.getDate() - daysDiff);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
  };

  const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousPeriodDates();

  const { data: prevSalesReport } = useQuery({
    queryKey: ['analytics', 'sales', prevStartDate, prevEndDate],
    queryFn: async () => {
      try {
        const response = await api.get(`/analytics/sales?startDate=${prevStartDate}&endDate=${prevEndDate}`);
        return response.data;
      } catch (error) {
        return { orders: [], totalRevenue: 0, orderCount: 0 };
      }
    },
    enabled: !!startDate && !!endDate,
  });

  // Fetch customers data
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      const response = await api.get('/customers?skip=0&take=10000');
      return response.data?.data || [];
    },
  });

  // Calculate analytics data
  const isLoading = ordersLoading || salesLoading;
  
  const analyticsData = useMemo(() => {
    if (!ordersData || !salesReport) {
      return null;
    }

    const allOrders = ordersData || [];
    const allCustomers = customersData || [];
    
    // Filter orders by date range
    const filteredOrders = allOrders.filter((order: any) => {
      const orderDate = new Date(order.orderDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return orderDate >= start && orderDate <= end;
    });

    // Calculate total revenue
    const totalRevenue = filteredOrders.reduce((sum: number, order: any) => {
      return sum + (typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount || 0));
    }, 0);

    // Calculate order count
    const orderCount = filteredOrders.length;

    // Calculate customer count - use total customers from database, not just those with orders
    const customerCount = allCustomers.length;
    
    // Calculate unique customers who placed orders in this period (for growth calculation)
    const uniqueCustomersWithOrders = new Set(filteredOrders.map((order: any) => order.customerId).filter(Boolean));

    // Calculate average order value
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Calculate growth percentages
    const prevRevenue = prevSalesReport?.totalRevenue || 0;
    const prevOrderCount = prevSalesReport?.orderCount || 0;
    
    // For customer growth, we need to compare total customers
    // Since we don't have previous period customer data easily available, 
    // we'll calculate growth based on customers who placed orders in each period
    // This is a reasonable approximation for customer growth
    const prevUniqueCustomers = prevSalesReport?.orders ? new Set(prevSalesReport.orders.map((o: any) => o.customerId).filter(Boolean)).size : 0;
    const currentUniqueCustomers = uniqueCustomersWithOrders.size;
    
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const orderGrowth = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : 0;
    // For customer growth, we'll show growth based on active customers (those who placed orders)
    // This gives a meaningful metric about customer engagement growth
    const customerGrowth = prevUniqueCustomers > 0 ? ((currentUniqueCustomers - prevUniqueCustomers) / prevUniqueCustomers) * 100 : 0;

    // Calculate daily revenue
    const dailyRevenueMap = new Map<string, { revenue: number; orders: number }>();
    filteredOrders.forEach((order: any) => {
      const date = new Date(order.orderDate).toISOString().split('T')[0];
      const amount = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount || 0);
      const existing = dailyRevenueMap.get(date) || { revenue: 0, orders: 0 };
      dailyRevenueMap.set(date, {
        revenue: existing.revenue + amount,
        orders: existing.orders + 1,
      });
    });
    const dailyRevenue = Array.from(dailyRevenueMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate top products
    const productSalesMap = new Map<string, { name: string; sales: number; quantity: number }>();
    filteredOrders.forEach((order: any) => {
      if (order.orderLines && Array.isArray(order.orderLines)) {
        order.orderLines.forEach((line: any) => {
          const productId = line.productId?.toString() || '';
          const productName = line.product?.name || `Product ${productId}`;
          const quantity = parseInt(line.quantity || 0);
          const unitPrice = parseFloat(line.unitPrice || 0);
          const sales = quantity * unitPrice;
          
          const existing = productSalesMap.get(productId) || { name: productName, sales: 0, quantity: 0 };
          productSalesMap.set(productId, {
            name: productName,
            sales: existing.sales + sales,
            quantity: existing.quantity + quantity,
          });
        });
      }
    });
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Calculate orders by status
    const statusMap = new Map<string, { count: number; value: number }>();
    filteredOrders.forEach((order: any) => {
      const status = order.status || 'PENDING';
      const amount = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount || 0);
      const existing = statusMap.get(status) || { count: 0, value: 0 };
      statusMap.set(status, {
        count: existing.count + 1,
        value: existing.value + amount,
      });
    });
    const ordersByStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      ...data,
    }));

    // Get recent orders
    const recentOrders = filteredOrders
      .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5)
      .map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        customer: order.customer?.name || 'Unknown',
        amount: typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount || 0),
        date: order.orderDate,
        status: order.status || 'PENDING',
      }));

    return {
      totalRevenue,
      orderCount,
      customerCount,
      averageOrderValue,
      revenueGrowth,
      orderGrowth,
      customerGrowth,
      dailyRevenue,
      topProducts,
      ordersByStatus,
      recentOrders,
    };
  }, [ordersData, salesReport, prevSalesReport, customersData, startDate, endDate]);

  const COLORS = [
    '#5955D1', '#8B5CF6', '#A855F7', '#C084FC', 
    '#6366F1', '#818CF8', '#A78BFA', '#C4B5FD',
    '#4F46E5', '#7C3AED', '#9333EA', '#A855F7'
  ];

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 animate-pulse">
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <SkeletonTable />
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${analyticsData?.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      change: analyticsData?.revenueGrowth || 0,
      flaticonClass: 'fi fi-rr-dollar',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Total Orders',
      value: analyticsData?.orderCount?.toLocaleString() || '0',
      change: analyticsData?.orderGrowth || 0,
      flaticonClass: 'fi fi-rr-shopping-cart',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Total Customers',
      value: analyticsData?.customerCount?.toLocaleString() || '0',
      change: analyticsData?.customerGrowth || 0,
      flaticonClass: 'fi fi-rr-users',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Average Order Value',
      value: `$${analyticsData?.averageOrderValue?.toFixed(2) || '0.00'}`,
      change: 5.2,
      flaticonClass: 'fi fi-rr-box',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div>
      {/* Header */}
      <Breadcrumb currentPage="Analytics" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Analytics</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => {
          const isPositive = stat.change >= 0;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <i className={`${stat.flaticonClass} text-2xl ${stat.color}`}></i>
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  {Math.abs(stat.change).toFixed(2)}%
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-white mb-1">{stat.title}</h3>
              <p className="text-[24px] font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
            <div className="flex items-center gap-2">
              {(['revenue', 'orders', 'customers'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    selectedMetric === metric
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {(!analyticsData?.dailyRevenue || analyticsData.dailyRevenue.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-[300px]">
              <TrendingUp className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No revenue data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#5955D1"
                  strokeWidth={2}
                  name="Revenue ($)"
                  dot={{ fill: '#5955D1', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Orders"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Products</h3>
          {(!analyticsData?.topProducts || analyticsData.topProducts.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-[300px]">
              <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No product data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="sales" fill="#5955D1" name="Sales ($)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Orders by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Orders by Status</h3>
          {(!analyticsData?.ordersByStatus || analyticsData.ordersByStatus.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-[400px]">
              <PieChartIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-sm text-gray-500 dark:text-white">No order status data available</p>
            </div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={analyticsData.ordersByStatus}
                  cx="50%"
                  cy="50%"
                    labelLine={true}
                    label={({ status, percent }: any) => {
                      const percentage = ((percent || 0) * 100).toFixed(0);
                      return `${status}: ${percentage}%`;
                    }}
                    outerRadius={140}
                    innerRadius={50}
                  fill="#8884d8"
                  dataKey="count"
                    paddingAngle={3}
                >
                  {analyticsData.ordersByStatus.map((_entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                        strokeWidth={2}
                      />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                      color: isDarkMode ? '#ffffff' : '#1f2937',
                    }}
                    labelStyle={{
                      color: isDarkMode ? '#ffffff' : '#1f2937',
                      fontWeight: '600',
                    }}
                    itemStyle={{
                      color: isDarkMode ? '#ffffff' : '#1f2937',
                    }}
                    formatter={(_value: any, _name: any, props: any) => {
                      return [props.payload.count, props.payload.status || ''];
                    }}
                    labelFormatter={() => {
                      return '';
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Status Summary</h3>
          {(!analyticsData?.ordersByStatus || analyticsData.ordersByStatus.length === 0) ? (
            <div className="flex flex-col items-center justify-center h-[300px]">
              <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No status data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyticsData.ordersByStatus.map((status: any, index: number) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{status.status}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{status.count} orders</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${status.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {(!analyticsData?.recentOrders || analyticsData.recentOrders.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No orders found</p>
                  </td>
                </tr>
              ) : (
                analyticsData.recentOrders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      ${order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : order.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
