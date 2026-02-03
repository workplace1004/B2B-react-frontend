import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Store, Users, ChartBar, Search, Calendar, ArrowUp, ArrowDown, DollarSign, Package, ShoppingCart } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import Chart from 'react-apexcharts';

type TabType = 'sell-in' | 'channel' | 'customer';

export default function SalesAnalytics() {
  const [activeTab, setActiveTab] = useState<TabType>('sell-in');

  const tabs = [
    { id: 'sell-in' as TabType, label: 'Sell-in Performance', icon: TrendingUp },
    { id: 'channel' as TabType, label: 'Channel Performance', icon: Store },
    { id: 'customer' as TabType, label: 'Customer Performance', icon: Users },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Sales Analytics" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sell-in performance, channel performance, and customer performance analytics</p>
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
        {activeTab === 'sell-in' && <SellInPerformanceSection />}
        {activeTab === 'channel' && <ChannelPerformanceSection />}
        {activeTab === 'customer' && <CustomerPerformanceSection />}
      </div>
    </div>
  );
}

// Sell-in Performance Section Component
function SellInPerformanceSection() {
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Fetch orders for sell-in performance
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'sell-in-performance', timeRange],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];

  // Calculate sell-in metrics
  const metrics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= startDate;
    });

    const totalRevenue = filteredOrders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.totalAmount || 0), 0
    );
    
    const totalOrders = filteredOrders.length;
    
    const totalItems = filteredOrders.reduce((sum: number, order: any) => 
      sum + (order.orderLines?.reduce((lineSum: number, line: any) => lineSum + (line.quantity || 0), 0) || 0), 0
    );

    // Previous period comparison
    const previousStartDate = new Date(startDate);
    const periodDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    
    const previousOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= previousStartDate && orderDate < startDate;
    });

    const previousRevenue = previousOrders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.totalAmount || 0), 0
    );
    
    const previousOrdersCount = previousOrders.length;
    
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const ordersChange = previousOrdersCount > 0 ? ((totalOrders - previousOrdersCount) / previousOrdersCount) * 100 : 0;

    // Monthly trend data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthOrders = filteredOrders.filter((order: any) => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      
      monthlyData.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthOrders.reduce((sum: number, order: any) => sum + parseFloat(order.totalAmount || 0), 0),
        orders: monthOrders.length,
      });
    }

    return {
      totalRevenue,
      totalOrders,
      totalItems,
      revenueChange,
      ordersChange,
      monthlyData,
    };
  }, [orders, timeRange]);

  // Chart configuration
  const chartOptions = useMemo(() => ({
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    xaxis: {
      categories: metrics.monthlyData.map((d) => d.month),
      labels: {
        style: {
          colors: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
        formatter: (value: number) => `$${value.toFixed(0)}`,
      },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
    colors: ['#3B82F6', '#10B981'],
    legend: {
      labels: {
        colors: isDarkMode ? '#9CA3AF' : '#6B7280',
      },
    },
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  }), [metrics.monthlyData, isDarkMode]);

  const chartSeries = [
    {
      name: 'Revenue',
      data: metrics.monthlyData.map((d) => d.revenue),
    },
    {
      name: 'Orders',
      data: metrics.monthlyData.map((d) => d.orders * 100), // Scale orders for visibility
    },
  ];

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</span>
          </div>
          <div className="flex items-center gap-2">
            {['7d', '30d', '90d', '6m', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : range === '6m' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${metrics.totalRevenue.toFixed(2)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {metrics.revenueChange >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  metrics.revenueChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {Math.abs(metrics.revenueChange).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs previous period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {metrics.totalOrders}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {metrics.ordersChange >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  metrics.ordersChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {Math.abs(metrics.ordersChange).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs previous period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items Sold</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {metrics.totalItems}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Average: {(metrics.totalOrders > 0 ? (metrics.totalItems / metrics.totalOrders).toFixed(1) : '0')} items/order
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sell-in Performance Trend</h3>
        </div>
        {metrics.monthlyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No data available for the selected period</p>
          </div>
        ) : (
          <Chart options={chartOptions} series={chartSeries} type="line" height={350} />
        )}
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Selling Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Quantity Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Orders</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {(() => {
                // Calculate top products
                const productStats = orders.reduce((acc: any, order: any) => {
                  order.orderLines?.forEach((line: any) => {
                    if (!acc[line.productId]) {
                      acc[line.productId] = {
                        productId: line.productId,
                        product: line.product,
                        quantity: 0,
                        revenue: 0,
                        orders: new Set(),
                      };
                    }
                    acc[line.productId].quantity += line.quantity || 0;
                    acc[line.productId].revenue += parseFloat(line.totalPrice || 0);
                    acc[line.productId].orders.add(order.id);
                  });
                  return acc;
                }, {});

                const topProducts = Object.values(productStats)
                  .map((stat: any) => ({
                    ...stat,
                    orders: stat.orders.size,
                  }))
                  .sort((a: any, b: any) => b.quantity - a.quantity)
                  .slice(0, 10);

                if (topProducts.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No sales data available
                      </td>
                    </tr>
                  );
                }

                return topProducts.map((stat: any) => (
                  <tr key={stat.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {stat.product?.name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {stat.product?.sku || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {stat.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${stat.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {stat.orders}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Channel Performance Section Component
function ChannelPerformanceSection() {
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Fetch orders for channel performance
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'channel-performance', timeRange],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];

  // Calculate channel metrics
  const channelMetrics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= startDate;
    });

    // Group by channel (using customer type as channel for now)
    const channels: any = {};
    
    filteredOrders.forEach((order: any) => {
      const channel = order.customer?.type || 'UNKNOWN';
      if (!channels[channel]) {
        channels[channel] = {
          name: channel,
          orders: 0,
          revenue: 0,
          items: 0,
          customers: new Set(),
        };
      }
      channels[channel].orders += 1;
      channels[channel].revenue += parseFloat(order.totalAmount || 0);
      channels[channel].items += order.orderLines?.reduce((sum: number, line: any) => sum + (line.quantity || 0), 0) || 0;
      if (order.customerId) {
        channels[channel].customers.add(order.customerId);
      }
    });

    const channelArray = Object.values(channels).map((ch: any) => ({
      ...ch,
      customers: ch.customers.size,
      avgOrderValue: ch.orders > 0 ? ch.revenue / ch.orders : 0,
    })).sort((a: any, b: any) => b.revenue - a.revenue);

    const totalRevenue = channelArray.reduce((sum: number, ch: any) => sum + ch.revenue, 0);

    return {
      channels: channelArray,
      totalRevenue,
    };
  }, [orders, timeRange]);

  // Chart configuration for channel performance
  const channelChartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: channelMetrics.channels.map((ch: any) => ch.name),
      labels: {
        style: {
          colors: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
        formatter: (value: number) => `$${value.toFixed(0)}`,
      },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
    colors: ['#3B82F6'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      },
    },
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  }), [channelMetrics.channels, isDarkMode]);

  const channelChartSeries = [
    {
      name: 'Revenue',
      data: channelMetrics.channels.map((ch: any) => ch.revenue),
    },
  ];

  // Pie chart for channel distribution
  const pieChartOptions = useMemo(() => ({
    chart: {
      type: 'pie',
      height: 350,
    },
    labels: channelMetrics.channels.map((ch: any) => ch.name),
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      y: {
        formatter: (value: number) => `$${value.toFixed(2)}`,
      },
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: isDarkMode ? '#9CA3AF' : '#6B7280',
      },
    },
  }), [channelMetrics.channels, isDarkMode]);

  const pieChartSeries = channelMetrics.channels.map((ch: any) => ch.revenue);

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</span>
          </div>
          <div className="flex items-center gap-2">
            {['7d', '30d', '90d', '6m', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : range === '6m' ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Channel Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {channelMetrics.channels.slice(0, 4).map((channel: any, index: number) => (
          <div key={channel.name} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{channel.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ${channel.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {channel.orders} orders • {channel.customers} customers
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                index === 0 ? 'bg-blue-100 dark:bg-blue-900/30' :
                index === 1 ? 'bg-green-100 dark:bg-green-900/30' :
                index === 2 ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                'bg-purple-100 dark:bg-purple-900/30'
              }`}>
                <Store className={`w-6 h-6 ${
                  index === 0 ? 'text-blue-600 dark:text-blue-400' :
                  index === 1 ? 'text-green-600 dark:text-green-400' :
                  index === 2 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-purple-600 dark:text-purple-400'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Channel Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Channel</h3>
          </div>
          {channelMetrics.channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Store className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No channel data available</p>
            </div>
          ) : (
            <Chart options={channelChartOptions} series={channelChartSeries} type="bar" height={350} />
          )}
        </div>

        {/* Channel Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Channel Distribution</h3>
          </div>
          {channelMetrics.channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Store className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No channel data available</p>
            </div>
          ) : (
            <Chart options={pieChartOptions} series={pieChartSeries} type="pie" height={350} />
          )}
        </div>
      </div>

      {/* Channel Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Channel Performance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Customers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Avg Order Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Share</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {channelMetrics.channels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No channel data available
                  </td>
                </tr>
              ) : (
                channelMetrics.channels.map((channel: any) => {
                  const share = channelMetrics.totalRevenue > 0 ? (channel.revenue / channelMetrics.totalRevenue) * 100 : 0;
                  return (
                    <tr key={channel.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {channel.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${channel.revenue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {channel.orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {channel.items}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {channel.customers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        ${channel.avgOrderValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                            {share.toFixed(1)}%
                          </span>
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
    </div>
  );
}

// Customer Performance Section Component
function CustomerPerformanceSection() {
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Fetch orders and customers for customer performance
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'customer-performance', timeRange],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'performance'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];
  const customers = customersData || [];

  // Calculate customer performance metrics
  const customerMetrics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= startDate;
    });

    // Calculate customer performance
    const customerStats: any = {};
    
    filteredOrders.forEach((order: any) => {
      if (!order.customerId) return;
      
      if (!customerStats[order.customerId]) {
        customerStats[order.customerId] = {
          customerId: order.customerId,
          customer: order.customer,
          orders: 0,
          revenue: 0,
          items: 0,
          firstOrderDate: new Date(order.orderDate),
          lastOrderDate: new Date(order.orderDate),
        };
      }
      
      customerStats[order.customerId].orders += 1;
      customerStats[order.customerId].revenue += parseFloat(order.totalAmount || 0);
      customerStats[order.customerId].items += order.orderLines?.reduce((sum: number, line: any) => sum + (line.quantity || 0), 0) || 0;
      
      const orderDate = new Date(order.orderDate);
      if (orderDate < customerStats[order.customerId].firstOrderDate) {
        customerStats[order.customerId].firstOrderDate = orderDate;
      }
      if (orderDate > customerStats[order.customerId].lastOrderDate) {
        customerStats[order.customerId].lastOrderDate = orderDate;
      }
    });

    const customerArray = Object.values(customerStats)
      .map((stat: any) => ({
        ...stat,
        avgOrderValue: stat.orders > 0 ? stat.revenue / stat.orders : 0,
        customerName: stat.customer?.name || 'Unknown Customer',
        customerEmail: stat.customer?.email || '',
        customerType: stat.customer?.type || 'UNKNOWN',
      }))
      .filter((stat: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          stat.customerName.toLowerCase().includes(query) ||
          stat.customerEmail.toLowerCase().includes(query) ||
          stat.customerType.toLowerCase().includes(query)
        );
      })
      .sort((a: any, b: any) => b.revenue - a.revenue);

    // Calculate summary metrics
    const totalCustomers = customerArray.length;
    const totalRevenue = customerArray.reduce((sum: number, c: any) => sum + c.revenue, 0);
    const totalOrders = customerArray.reduce((sum: number, c: any) => sum + c.orders, 0);
    const avgRevenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const avgOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;

    // Top customers
    const topCustomers = customerArray.slice(0, 10);

    // Customer segments (by revenue)
    const segments = {
      high: customerArray.filter((c: any) => c.revenue >= 10000).length,
      medium: customerArray.filter((c: any) => c.revenue >= 5000 && c.revenue < 10000).length,
      low: customerArray.filter((c: any) => c.revenue < 5000).length,
    };

    return {
      customers: customerArray,
      topCustomers,
      totalCustomers,
      totalRevenue,
      totalOrders,
      avgRevenuePerCustomer,
      avgOrdersPerCustomer,
      segments,
    };
  }, [orders, timeRange, searchQuery]);

  // Chart configuration for top customers
  const topCustomersChartOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: customerMetrics.topCustomers.map((c: any) => c.customerName.length > 15 ? c.customerName.substring(0, 15) + '...' : c.customerName),
      labels: {
        style: {
          colors: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
        rotate: -45,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#9CA3AF' : '#6B7280',
        },
        formatter: (value: number) => `$${value.toFixed(0)}`,
      },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      y: {
        formatter: (value: number) => `$${value.toFixed(2)}`,
      },
    },
    colors: ['#10B981'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      },
    },
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  }), [customerMetrics.topCustomers, isDarkMode]);

  const topCustomersChartSeries = [
    {
      name: 'Revenue',
      data: customerMetrics.topCustomers.map((c: any) => c.revenue),
    },
  ];

  // Customer segments pie chart
  const segmentsChartOptions = useMemo(() => ({
    chart: {
      type: 'pie',
      height: 300,
    },
    labels: ['High Value ($10k+)', 'Medium Value ($5k-$10k)', 'Low Value (<$5k)'],
    colors: ['#10B981', '#F59E0B', '#EF4444'],
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: isDarkMode ? '#9CA3AF' : '#6B7280',
      },
    },
  }), [isDarkMode]);

  const segmentsChartSeries = [
    customerMetrics.segments.high,
    customerMetrics.segments.medium,
    customerMetrics.segments.low,
  ];

  const isLoading = ordersLoading || customersLoading;

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</span>
            <div className="flex items-center gap-2">
              {['7d', '30d', '90d', '6m', '1y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    timeRange === range
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : range === '6m' ? '6 Months' : '1 Year'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {customerMetrics.totalCustomers}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${customerMetrics.totalRevenue.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Revenue/Customer</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${customerMetrics.avgRevenuePerCustomer.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Orders/Customer</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {customerMetrics.avgOrdersPerCustomer.toFixed(1)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top 10 Customers by Revenue</h3>
          </div>
          {customerMetrics.topCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No customer data available</p>
            </div>
          ) : (
            <Chart options={topCustomersChartOptions} series={topCustomersChartSeries} type="bar" height={350} />
          )}
        </div>

        {/* Customer Segments Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Segments</h3>
          </div>
          {customerMetrics.totalCustomers === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No customer data available</p>
            </div>
          ) : (
            <Chart options={segmentsChartOptions} series={segmentsChartSeries} type="pie" height={300} />
          )}
        </div>
      </div>

      {/* Customer Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Performance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Avg Order Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Last Order</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {customerMetrics.customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No customers found matching your search' : 'No customer data available'}
                  </td>
                </tr>
              ) : (
                customerMetrics.customers.map((customer: any) => (
                  <tr key={customer.customerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.customerName}
                        </div>
                        {customer.customerEmail && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {customer.customerEmail}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                        {customer.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${customer.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {customer.orders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {customer.items}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      ${customer.avgOrderValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {customer.lastOrderDate.toLocaleDateString()}
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
