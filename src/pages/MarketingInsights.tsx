import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Package, DollarSign, ShoppingCart, ArrowUp, ArrowDown, Calendar, BarChart3 } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import Chart from 'react-apexcharts';

export default function MarketingInsights() {
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

  // Fetch products
  const { isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'insights'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'insights', timeRange],
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

  // Calculate date range
  const dateRange = useMemo(() => {
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
    return { startDate, endDate: now };
  }, [timeRange]);

  // Calculate top products
  const topProducts = useMemo(() => {
    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });

    const productStats: any = {};
    
    filteredOrders.forEach((order: any) => {
      order.orderLines?.forEach((line: any) => {
        if (!productStats[line.productId]) {
          productStats[line.productId] = {
            productId: line.productId,
            product: line.product,
            quantity: 0,
            revenue: 0,
            orders: new Set(),
            avgPrice: 0,
          };
        }
        productStats[line.productId].quantity += line.quantity || 0;
        productStats[line.productId].revenue += parseFloat(line.totalPrice || 0);
        productStats[line.productId].orders.add(order.id);
        productStats[line.productId].avgPrice = parseFloat(line.unitPrice || 0);
      });
    });

    return Object.values(productStats)
      .map((stat: any) => ({
        ...stat,
        orders: stat.orders.size,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 20);
  }, [orders, dateRange]);

  // Calculate trends
  const trends = useMemo(() => {
    const now = new Date();
    const months: any[] = [];
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      
      const revenue = monthOrders.reduce((sum: number, order: any) => 
        sum + parseFloat(order.totalAmount || 0), 0
      );
      
      const orderCount = monthOrders.length;
      
      const itemsSold = monthOrders.reduce((sum: number, order: any) => 
        sum + (order.orderLines?.reduce((lineSum: number, line: any) => 
          lineSum + (line.quantity || 0), 0) || 0), 0
      );
      
      months.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        orders: orderCount,
        items: itemsSold,
      });
    }

    // Calculate growth rates
    const revenueGrowth = months.length > 1 
      ? ((months[months.length - 1].revenue - months[months.length - 2].revenue) / months[months.length - 2].revenue) * 100
      : 0;
    
    const ordersGrowth = months.length > 1
      ? ((months[months.length - 1].orders - months[months.length - 2].orders) / months[months.length - 2].orders) * 100
      : 0;

    return {
      monthly: months,
      revenueGrowth,
      ordersGrowth,
    };
  }, [orders]);

  // Chart configurations
  const revenueChartOptions = useMemo(() => ({
    chart: {
      type: 'line' as const,
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
    },
    xaxis: {
      categories: trends.monthly.map((m) => m.month),
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
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  }), [trends.monthly, isDarkMode]);

  const revenueChartSeries = [
    {
      name: 'Revenue',
      data: trends.monthly.map((m) => m.revenue),
    },
  ];

  const topProductsChartOptions = useMemo(() => ({
    chart: {
      type: 'bar' as const,
      height: 400,
      toolbar: { show: false },
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: topProducts.slice(0, 10).map((p: any) => 
        p.product?.name?.length > 20 ? p.product.name.substring(0, 20) + '...' : p.product?.name || 'Unknown'
      ),
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
  }), [topProducts, isDarkMode]);

  const topProductsChartSeries = [
    {
      name: 'Revenue',
      data: topProducts.slice(0, 10).map((p: any) => p.revenue),
    },
  ];

  const isLoading = productsLoading || ordersLoading;

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Insights" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Insights</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Top products and sales trends analysis</p>
          </div>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${topProducts.reduce((sum: number, p: any) => sum + p.revenue, 0).toFixed(2)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {trends.revenueGrowth >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  trends.revenueGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {Math.abs(trends.revenueGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs previous month</span>
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
                {orders.filter((order: any) => {
                  const orderDate = new Date(order.orderDate);
                  return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
                }).length}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {trends.ordersGrowth >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  trends.ordersGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {Math.abs(trends.ordersGrowth).toFixed(1)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs previous month</span>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Top Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {topProducts.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Products with sales
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${(() => {
                  const filteredOrders = orders.filter((order: any) => {
                    const orderDate = new Date(order.orderDate);
                    return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
                  });
                  const totalRevenue = filteredOrders.reduce((sum: number, order: any) => 
                    sum + parseFloat(order.totalAmount || 0), 0
                  );
                  return filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(2) : '0.00';
                })()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Per order
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h3>
            <BarChart3 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          {trends.monthly.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No revenue data available</p>
            </div>
          ) : (
            <Chart options={revenueChartOptions} series={revenueChartSeries} type="line" height={350} />
          )}
        </div>

        {/* Top Products Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top 10 Products by Revenue</h3>
            <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No product data available</p>
            </div>
          ) : (
            <Chart options={topProductsChartOptions} series={topProductsChartSeries} type="bar" height={400} />
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Products Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Quantity Sold</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Avg Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No product sales data available for the selected period
                  </td>
                </tr>
              ) : (
                topProducts.map((product: any, index: number) => {
                  // Calculate trend (compare with previous period)
                  const previousPeriod = orders.filter((order: any) => {
                    const orderDate = new Date(order.orderDate);
                    const prevStart = new Date(dateRange.startDate);
                    const periodDays = Math.floor((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
                    prevStart.setDate(prevStart.getDate() - periodDays);
                    return orderDate >= prevStart && orderDate < dateRange.startDate;
                  });

                  const previousRevenue = previousPeriod.reduce((sum: number, order: any) => {
                    return sum + (order.orderLines?.reduce((lineSum: number, line: any) => {
                      return lineSum + (line.productId === product.productId ? parseFloat(line.totalPrice || 0) : 0);
                    }, 0) || 0);
                  }, 0);

                  const currentRevenue = product.revenue;
                  const trend = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

                  return (
                    <tr key={product.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-lg font-bold ${
                            index === 0 ? 'text-yellow-600 dark:text-yellow-400' :
                            index === 1 ? 'text-gray-400 dark:text-gray-500' :
                            index === 2 ? 'text-orange-600 dark:text-orange-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.product?.name || 'Unknown Product'}
                        </div>
                        {product.product?.style && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">Style: {product.product.style}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {product.product?.sku || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                        ${product.revenue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {product.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {product.orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        ${product.avgPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {trend >= 0 ? (
                            <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {Math.abs(trend).toFixed(1)}%
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

