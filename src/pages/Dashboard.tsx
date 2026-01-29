import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Package, ShoppingCart, AlertTriangle, ArrowRight, TrendingUp, MoreVertical, Calendar } from 'lucide-react';
import { SkeletonStatsCard, SkeletonTable } from '../components/Skeleton';
import Chart from 'react-apexcharts';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    },
  });

  // Fetch low stock items directly as fallback if not in dashboard stats
  const hasLowStockInDashboard = dashboardStats?.lowStockItems && Array.isArray(dashboardStats.lowStockItems) && dashboardStats.lowStockItems.length > 0;
  
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory');
        const allInventory = response.data?.data || response.data || [];
        // Filter for low stock items: quantity <= 10 OR quantity <= reorderPoint
        const lowStock = allInventory
          .filter((item: any) => {
            const quantity = item.quantity || 0;
            const reorderPoint = item.reorderPoint || 0;
            // Consider low stock if quantity <= 10 OR quantity <= reorderPoint (if reorderPoint is set)
            return quantity <= 10 || (reorderPoint > 0 && quantity <= reorderPoint);
          })
          .sort((a: any, b: any) => (a.quantity || 0) - (b.quantity || 0)) // Sort by quantity ascending
          .slice(0, 10);
        return lowStock;
      } catch (error) {
        console.error('Error fetching low stock items:', error);
        return [];
      }
    },
    enabled: !isLoading && !hasLowStockInDashboard,
  });

  // Fetch sales report for the selected date range
  const getDateRange = () => {
    if (dateRange === 'all') return { startDate: undefined, endDate: undefined };
    
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
    }
    
    return { 
      startDate: startDate.toISOString().split('T')[0], 
      endDate: endDate.toISOString().split('T')[0] 
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: salesReport } = useQuery({
    queryKey: ['analytics', 'sales', startDate, endDate, dateRange],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (startDate && dateRange !== 'all') params.append('startDate', startDate);
        if (endDate && dateRange !== 'all') params.append('endDate', endDate);
        const queryString = params.toString();
        const response = await api.get(`/analytics/sales${queryString ? `?${queryString}` : ''}`);
        return response.data;
      } catch (error) {
        return { orders: [], totalRevenue: 0, orderCount: 0 };
      }
    },
  });

  // Calculate revenue for the period
  const periodRevenue = salesReport?.totalRevenue || 0;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed' || statusLower === 'delivered') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (statusLower === 'pending' || statusLower === 'processing') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    if (statusLower === 'cancelled' || statusLower === 'failed') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonTable />
          <SkeletonTable />
        </div>
      </div>
    );
  }


  const recentOrders = dashboardStats?.recentOrders || [];
  // Use low stock items from dashboard stats, or fallback to direct query
  // Check if dashboard stats has lowStockItems and it's an array with items
  const dashboardLowStock = dashboardStats?.lowStockItems;
  const lowStockItems = (Array.isArray(dashboardLowStock) && dashboardLowStock.length > 0)
    ? dashboardLowStock 
    : (Array.isArray(lowStockData) && lowStockData.length > 0 ? lowStockData : []);

  // If dashboard stats failed to load, show error state
  if (!isLoading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Failed to load dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to fetch dashboard statistics. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's what's happening with your business.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6">
        {/* Left Column - Main Cards (Cards 1-5) */}
        <div className="lg:col-span-8 xl:col-span-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Total Customers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Total Customers</h6>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4 pb-0 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    {dashboardStats?.totalCustomers?.toLocaleString() || '0'}
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                    +2.57%
                  </span>
                </div>
                <div className="w-[150px] h-[120px] -mt-3 -mb-4">
                  <Chart
                    type="bar"
                    height={120}
                    width={150}
                    series={[{
                      name: 'Customers',
                      data: [120, 350, 450, 300, 120, 250]
                    }]}
                    options={{
                      chart: {
                        toolbar: { show: false },
                        zoom: { enabled: false },
                        sparkline: { enabled: false }
                      },
                      plotOptions: {
                        bar: {
                          horizontal: false,
                          columnWidth: '60%',
                          borderRadius: 2
                        }
                      },
                      colors: ['#5955D1'],
                      dataLabels: { enabled: false },
                      stroke: { show: true },
                      xaxis: {
                        axisBorder: { show: false },
                        axisTicks: { show: false },
                        labels: { show: false }
                      },
                      yaxis: {
                        labels: { show: false }
                      },
                      grid: {
                        borderColor: 'transparent',
                        xaxis: { lines: { show: false } },
                        yaxis: { lines: { show: true } },
                        padding: { top: 0, bottom: 0, left: 0, right: 0 }
                      },
                      fill: {
                        type: 'gradient',
                        gradient: {
                          shade: 'light',
                          type: 'vertical',
                          shadeIntensity: 0.1,
                          gradientToColors: ['#7008E7'],
                          inverseColors: false,
                          opacityFrom: 1,
                          opacityTo: 0.6,
                          stops: [20, 100]
                        }
                      },
                      tooltip: { enabled: false },
                      legend: { show: false }
                    }}
                  />
                </div>
              </div>
              <div className="p-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">Vs last month: 1,195</p>
                  <button
                    onClick={() => navigate('/customers')}
                    className="text-primary hover:text-primary-dark transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Order Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Order Analytics</h6>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4 pt-0">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    {dashboardStats?.totalOrders?.toLocaleString() || '0'}
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                    -2.57%
                  </span>
                </div>
              </div>
              <div className="relative -mx-1 -mb-3" style={{ height: '120px' }}>
                <Chart
                  type="area"
                  height={120}
                  series={[{
                    name: 'Orders',
                    data: [80, 95, 75, 90, 75, 90]
                  }]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      zoom: { enabled: false },
                      sparkline: { enabled: false }
                    },
                    stroke: {
                      curve: 'smooth',
                      width: 2,
                      colors: ['#5955D1']
                    },
                    fill: {
                      type: 'solid',
                      colors: ['rgba(89, 85, 209, 0.1)'],
                      opacity: 1
                    },
                    dataLabels: { enabled: false },
                    markers: {
                      size: 0,
                      colors: ['#FFFFFF'],
                      strokeColors: '#5955D1',
                      strokeWidth: 3,
                      hover: { size: 6 }
                    },
                    xaxis: {
                      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                      labels: { show: false },
                      axisBorder: { show: false },
                      axisTicks: { show: false }
                    },
                    grid: {
                      show: false,
                      padding: { top: 0, right: 0, bottom: -10, left: 0 }
                    },
                    yaxis: {
                      min: 0,
                      max: 100,
                      labels: { show: false }
                    },
                    tooltip: {
                      enabled: true,
                      theme: 'dark',
                      y: { formatter: (val: number) => val + '%' }
                    },
                    legend: { show: false }
                  }}
                />
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center text-xs text-gray-500 dark:text-gray-400 w-full">
                  Compared to Last Month
                </div>
              </div>
            </div>

            {/* Card 3: Tasks Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Tasks Overview</h6>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Tasks Done <span className="text-primary font-semibold">25</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 bg-primary opacity-10 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Follow-ups</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 bg-primary opacity-25 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">In Progress</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 bg-primary opacity-50 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Pending</span>
                    </div>
                  </div>
                  <div className="w-24 h-24">
                    <Doughnut
                      data={{
                        labels: ['Follow-ups', 'In Progress', 'Pending'],
                        datasets: [{
                          data: [5, 6, 4],
                          backgroundColor: ['#5955D1', '#ACAAE8', '#DEDDF6'],
                          borderWidth: 3,
                          borderColor: '#fff',
                          hoverBorderColor: '#fff',
                          borderRadius: 3,
                          spacing: 0,
                          hoverOffset: 5
                        }]
                      }}
                      options={{
                        cutout: '70%',
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: false }
                        },
                        maintainAspectRatio: false
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Active Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Active Orders</h6>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4 pt-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    {dashboardStats?.totalOrders?.toLocaleString() || '0'}
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                    +2.57%
                  </span>
                </div>
              </div>
              <div className="p-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">Vs last month: 1,195</p>
                  <button
                    onClick={() => navigate('/orders')}
                    className="text-primary hover:text-primary-dark transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 5: Revenue */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Revenue</h6>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                    {(['Today', 'Week', 'Month'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setDateRange(tab === 'Today' ? '7d' : tab === 'Week' ? '30d' : '90d')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          (tab === 'Month' && dateRange === '90d') || 
                          (tab === 'Week' && dateRange === '30d') || 
                          (tab === 'Today' && dateRange === '7d')
                            ? 'bg-primary text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="p-4 py-0">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    <span className="text-gray-600 dark:text-gray-400">$</span>
                    {formatCurrency(periodRevenue).replace('$', '').split('.')[0]}.
                    <span className="text-primary">{formatCurrency(periodRevenue).split('.')[1]}</span>
                  </h2>
                  <span className="text-sm text-gray-600 dark:text-gray-400">+20% vs last month</span>
                </div>
              </div>
              <div className="p-4 pt-0">
                <div style={{ height: '280px' }}>
                  <Chart
                    type="bar"
                    height={280}
                    series={[{
                      name: 'Revenue',
                      data: [120, 350, 450, 120, 200, 180, 300, 120, 250, 350, 250, 180]
                    }]}
                    options={{
                      chart: {
                        toolbar: { show: false }
                      },
                      plotOptions: {
                        bar: {
                          horizontal: false,
                          columnWidth: '70%',
                          borderRadius: 4
                        }
                      },
                      colors: ['#5955D1'],
                      dataLabels: { enabled: false },
                      stroke: { show: true },
                      xaxis: {
                        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        axisBorder: { color: '#EEEEF3' },
                        axisTicks: { show: false },
                        labels: {
                          style: {
                            colors: '#696981',
                            fontSize: '13px',
                            fontWeight: 500
                          }
                        }
                      },
                      yaxis: {
                        min: 0,
                        max: 500,
                        tickAmount: 5,
                        labels: {
                          formatter: (val: number) => val + 'K',
                          style: {
                            colors: '#696981',
                            fontSize: '13px',
                            fontWeight: 500
                          }
                        }
                      },
                      grid: {
                        borderColor: '#EEEEF3',
                        strokeDashArray: 5,
                        xaxis: { lines: { show: false } },
                        yaxis: { lines: { show: true } }
                      },
                      fill: {
                        type: 'gradient',
                        gradient: {
                          shade: 'light',
                          type: 'vertical',
                          shadeIntensity: 0.1,
                          gradientToColors: ['#7008E7'],
                          inverseColors: false,
                          opacityFrom: 1,
                          opacityTo: 0.6,
                          stops: [20, 100]
                        }
                      },
                      tooltip: {
                        y: { formatter: (val: number) => '$ ' + val + ' thousands' }
                      },
                      legend: { show: false }
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column - Side Cards (Cards 6-7) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Card 6: Order Sources */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Order Sources</h6>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4 pt-0">
                <div style={{ height: '95px' }} className="my-1">
                  <Chart
                    type="bar"
                    height={95}
                    series={[
                      { name: 'Website', data: [41.5] },
                      { name: 'Phone', data: [27] },
                      { name: 'Email', data: [18] },
                      { name: 'Referral', data: [10.3] },
                      { name: 'Other', data: [3.2] }
                    ]}
                    options={{
                      chart: {
                        type: 'bar',
                        height: 95,
                        stacked: true,
                        stackType: '100%',
                        toolbar: { show: false }
                      },
                      plotOptions: {
                        bar: {
                          horizontal: true,
                          barHeight: '100%',
                          borderRadius: 0
                        }
                      },
                      dataLabels: { enabled: false },
                      stroke: {
                        width: 1,
                        colors: ['#ffffff']
                      },
                      xaxis: {
                        labels: { show: false },
                        axisBorder: { show: false },
                        axisTicks: { show: false }
                      },
                      yaxis: { labels: { show: false } },
                      grid: {
                        show: false,
                        padding: { top: -15, bottom: -15, left: -15, right: 0 }
                      },
                      legend: { show: false },
                      fill: {
                        opacity: 1,
                        colors: [
                          'rgba(89, 85, 209, 0.1)',
                          'rgba(89, 85, 209, 0.25)',
                          'rgba(89, 85, 209, 0.50)',
                          'rgba(89, 85, 209, 0.75)',
                          'rgba(89, 85, 209, 1)'
                        ]
                      },
                      tooltip: {
                        enabled: true,
                        y: { formatter: (val: number) => val + '%' }
                      }
                    }}
                  />
                </div>
                <div className="space-y-1 mt-2">
                  {[
                    { label: 'Website', value: '41.50%', opacity: 'opacity-10' },
                    { label: 'Phone', value: '27%', opacity: 'opacity-25' },
                    { label: 'Email', value: '18%', opacity: 'opacity-50' },
                    { label: 'Referral', value: '10.30%', opacity: 'opacity-75' },
                    { label: 'Other', value: '3.20%', opacity: 'opacity-100' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1 text-xs py-1">
                      <div className={`w-3 h-3 bg-primary ${item.opacity} rounded`}></div>
                      <span className="text-gray-600 dark:text-gray-400 flex-1">{item.label}</span>
                      <strong className="text-gray-900 dark:text-white font-semibold">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-primary/5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Annual report</h6>
                <button className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors flex items-center gap-1">
                  <span>Download</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 7: Customer Retention Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Customer Retention Rate</h6>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4 pb-0 pt-0">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">92%</h2>
                  <span className="text-sm text-gray-600 dark:text-gray-400">+15% vs last month</span>
                </div>
              </div>
              <div className="p-4 pt-1 pb-0">
                <div style={{ height: '295px' }} className="-mt-1">
                  <Chart
                    type="bar"
                    height={295}
                    series={[
                      { name: 'SMEs', data: [40, 80, 70, 20, 20, 25] },
                      { name: 'Startups', data: [20, 25, 25, 50, 20, 20] },
                      { name: 'Enterprises', data: [20, 20, 20, 20, 15, 15] }
                    ]}
                    options={{
                      chart: {
                        type: 'bar',
                        height: 295,
                        stacked: true,
                        toolbar: { show: false },
                        zoom: { enabled: false }
                      },
                      plotOptions: {
                        bar: {
                          horizontal: false,
                          colors: {
                            backgroundBarColors: ['rgba(89, 85, 209, 0.03)'],
                            backgroundBarOpacity: 1
                          }
                        }
                      },
                      yaxis: { show: false },
                      xaxis: {
                        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        axisTicks: { show: false },
                        axisBorder: { show: false },
                        labels: {
                          style: {
                            colors: '#696981',
                            fontSize: '13px',
                            fontWeight: 500
                          }
                        }
                      },
                      legend: {
                        position: 'bottom',
                        offsetY: 0,
                        labels: {
                          colors: '#696981'
                        },
                        markers: { strokeWidth: 0 },
                        fontSize: '12px',
                        fontWeight: 500
                      },
                      grid: {
                        borderColor: 'transparent',
                        xaxis: { lines: { show: false } },
                        yaxis: { lines: { show: true } }
                      },
                      fill: {
                        colors: ['#5955D1', 'rgba(89, 85, 209, 0.4)', 'rgba(89, 85, 209, 0.1)'],
                        opacity: 1
                      },
                      dataLabels: { enabled: false }
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column 2 - Additional Cards (Cards 8-9) */}
        <div className="lg:col-span-6 xl:col-span-3">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Card 8: Total Revenue with Order Status */}
            <div className="bg-primary rounded-lg shadow-sm border-0 overflow-hidden relative" style={{
              backgroundImage: 'linear-gradient(135deg, rgba(89, 85, 209, 0.1) 0%, rgba(112, 8, 231, 0.1) 100%)',
              backgroundPosition: 'center',
              backgroundSize: 'cover'
            }}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between relative z-10">
                <h6 className="text-sm font-semibold text-black mb-0">Total Revenue</h6>
                <button className="p-1 hover:bg-white/20 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-black" />
                </button>
              </div>
              <div className="p-4 pt-0 border-b border-white/10 relative z-10">
                <div className="mb-5 -mt-3 relative" style={{ height: '350px' }}>
                  <Chart
                    type="radialBar"
                    height={350}
                    series={[35]}
                    options={{
                      chart: {
                        type: 'radialBar',
                        offsetY: 0,
                        height: 350,
                        sparkline: { enabled: true }
                      },
                      plotOptions: {
                        radialBar: {
                          startAngle: -95,
                          endAngle: 95,
                          track: {
                            background: 'rgba(255, 255, 255, 0.3)',
                            strokeWidth: '100%',
                            margin: 25
                          },
                          dataLabels: {
                            name: { show: false },
                            value: {
                              show: true,
                              offsetY: -35,
                              fontSize: '28px',
                              fontWeight: 600,
                              color: '#000',
                              formatter: () => formatCurrency(periodRevenue).replace(/\d/g, '').includes('$') 
                                ? formatCurrency(periodRevenue).split('.')[0] + 'm'
                                : '$5.7m'
                            }
                          }
                        }
                      },
                      grid: {
                        padding: { top: 0, bottom: 0, left: 0, right: 0 }
                      },
                      fill: {
                        colors: ['#000000']
                      }
                    }}
                  />
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center text-black font-semibold">
                    {dashboardStats?.totalOrders || 673} Orders
                  </div>
                </div>
                <div className="px-4 mb-3 flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="py-1">
                      <div className="w-3 h-3 bg-black rounded"></div>
                    </div>
                    <div>
                      <h3 className="mb-0 text-black font-bold text-lg">
                        {formatCurrency(periodRevenue * 0.5).split('.')[0]}m
                      </h3>
                      <p className="text-black/50 mb-0 text-sm">245 Pickups</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="p-1">
                      <div className="w-3 h-3 bg-black/50 rounded"></div>
                    </div>
                    <div>
                      <h3 className="mb-0 text-black font-bold text-lg">$65,823</h3>
                      <p className="text-black/50 mb-0 text-sm">120 Shipments</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-0">
                <h6 className="text-sm font-semibold text-black mb-3">Orders Status</h6>
                <div className="flex gap-1 mb-4 bg-transparent">
                  <div className="flex-1 bg-transparent" style={{ width: '70%' }}>
                    <div className="h-2 bg-white rounded"></div>
                  </div>
                  <div className="flex-1 bg-transparent" style={{ width: '25%' }}>
                    <div className="h-2 bg-white/50 rounded"></div>
                  </div>
                  <div className="flex-1 bg-transparent" style={{ width: '5%' }}>
                    <div className="h-2 bg-white/25 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Paid', value: '70%', opacity: 'opacity-100' },
                    { label: 'Cancelled', value: '25%', opacity: 'opacity-50' },
                    { label: 'Refunded', value: '5%', opacity: 'opacity-25' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 bg-black ${item.opacity} rounded`}></div>
                        <h6 className="font-light text-black mb-0 text-sm">{item.label}</h6>
                      </div>
                      <strong className="text-black font-semibold">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 9: Orders By Time */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Orders By Time</h6>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="p-4 p-0">
                <div style={{ height: '250px' }} className="-mt-3 -mb-1">
                  <Chart
                    type="heatmap"
                    height={250}
                    series={[
                      { name: '8am', data: [10, 12, 8, 15, 5, 7, 9] },
                      { name: '10am', data: [20, 25, 18, 30, 12, 15, 10] },
                      { name: '12pm', data: [30, 28, 22, 50, 25, 20, 18] },
                      { name: '2pm', data: [15, 18, 12, 22, 28, 25, 14] },
                      { name: '4pm', data: [10, 14, 9, 18, 20, 15, 12] }
                    ]}
                    options={{
                      chart: {
                        height: 250,
                        type: 'heatmap',
                        toolbar: { show: false }
                      },
                      stroke: {
                        width: 2,
                        colors: ['var(--bs-body-bg)']
                      },
                      dataLabels: { enabled: false },
                      plotOptions: {
                        heatmap: {
                          shadeIntensity: 0.95,
                          radius: 6,
                          distributed: false,
                          colorScale: {
                            ranges: [
                              { from: 0, to: 10, color: '#E0E7FF' },
                              { from: 11, to: 25, color: '#A5B4FC' },
                              { from: 26, to: 50, color: '#6366F1' }
                            ]
                          }
                        }
                      },
                      grid: { show: false },
                      yaxis: {
                        min: 0,
                        max: 500,
                        tickAmount: 5,
                        labels: {
                          style: {
                            colors: '#696981',
                            fontSize: '13px',
                            fontWeight: 500
                          }
                        }
                      },
                      xaxis: {
                        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        axisBorder: { show: false },
                        axisTicks: { show: false },
                        labels: {
                          style: {
                            colors: '#696981',
                            fontSize: '13px',
                            fontWeight: 500
                          }
                        }
                      },
                      legend: { show: false }
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Recent Orders and Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
              <button
                onClick={() => navigate('/orders')}
                className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                    onClick={() => navigate('/orders')}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {order.orderNumber || `ORD-${order.id}`}
                        </p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status || 'PENDING')}`}>
                          {order.status || 'PENDING'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {order.customer?.name || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatDate(order.orderDate || order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount || 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Low Stock Items
              </h2>
              <button
                onClick={() => navigate('/inventory')}
                className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-6">
            {(isLoading || lowStockLoading) ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : lowStockItems && lowStockItems.length > 0 ? (
              <div className="space-y-4">
                {lowStockItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-900/30"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        {item.product?.name || item.productName || 'Unknown Product'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.warehouse?.name || item.warehouseName || 'Unknown Warehouse'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        {item.quantity || 0} left
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Low stock</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">All items are well stocked</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/products')}
            className="flex flex-col items-center justify-center p-4 bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 rounded-lg transition-colors border border-primary/20"
          >
            <Package className="w-6 h-6 text-primary mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Add Product</span>
          </button>
          <button
            onClick={() => navigate('/orders')}
            className="flex flex-col items-center justify-center p-4 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg transition-colors border border-green-200 dark:border-green-800"
          >
            <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">New Order</span>
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="flex flex-col items-center justify-center p-4 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
          >
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">View Analytics</span>
          </button>
          <button
            onClick={() => navigate('/warehouses')}
            className="flex flex-col items-center justify-center p-4 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 rounded-lg transition-colors border border-orange-200 dark:border-orange-800"
          >
            <Package className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-2" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Warehouses</span>
          </button>
        </div>
      </div>
    </div>
  );
}
