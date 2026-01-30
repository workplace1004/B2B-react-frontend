import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { Coins, CreditCard, TrendingUp, Calendar, Search, MoreVertical, ChevronDown, Inbox } from 'lucide-react';
import Chart from 'react-apexcharts';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { SkeletonStatsCard } from '../components/Skeleton';

ChartJS.register(ArcElement, Tooltip, Legend);

// Custom plugin to add center text to doughnut chart
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart: any) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    // Calculate total
    const dataset = chart.data.datasets[0];
    const total = dataset.data.reduce((acc: number, val: number) => acc + val, 0);

    // Check if dark mode
    const isDark = document.documentElement.classList.contains('dark');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Total value
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = isDark ? '#fff' : '#000';
    ctx.fillText(total.toString(), centerX, centerY - 5);

    // Label below
    ctx.font = '14px sans-serif';
    ctx.fillStyle = isDark ? '#9ca3af' : '#999';
    ctx.fillText('Sources', centerX, centerY + 18);

    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

export default function FinanceDashboard() {
  const [selectedYear, setSelectedYear] = useState('This Year');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const [transactionSearch, setTransactionSearch] = useState('');

  // Get date range based on selected year
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    if (selectedYear === 'This Year') {
      startDate.setMonth(0, 1); // January 1st
      startDate.setHours(0, 0, 0, 0);
    } else if (selectedYear === 'Last Year') {
      startDate.setFullYear(endDate.getFullYear() - 1, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setFullYear(endDate.getFullYear() - 1, 11, 31);
      endDate.setHours(23, 59, 59, 999);
    }
    
    return { 
      startDate: startDate.toISOString().split('T')[0], 
      endDate: endDate.toISOString().split('T')[0] 
    };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch finance data
  const { isLoading: dashboardLoading } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    },
  });

  // Fetch sales report for charts and transactions
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['analytics', 'sales', startDate, endDate, selectedYear],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const queryString = params.toString();
        const response = await api.get(`/analytics/sales${queryString ? `?${queryString}` : ''}`);
        return response.data;
      } catch (error) {
        return { orders: [], totalRevenue: 0, orderCount: 0 };
      }
    },
  });

  const isLoading = dashboardLoading || salesLoading;

  // Process orders data for charts - group by month
  const processOrdersForChart = () => {
    const orders = salesReport?.orders || [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Group orders by month
    const monthlyData: Record<string, number> = {};
    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += Number(order.totalAmount || 0);
    });

    // Get last 8 months of data
    const sortedMonths = Object.keys(monthlyData).sort().slice(-8);
    const revenueData = sortedMonths.map(key => monthlyData[key]);
    const categories = sortedMonths.map(key => {
      const [, month] = key.split('-');
      return monthNames[parseInt(month)];
    });

    return { revenueData, categories, maxValue: Math.max(...revenueData, 0) };
  };

  const chartData = processOrdersForChart();

  // Revenue vs Expenses Chart
  const revenueExpensesChartConfig = {
    series: [
      {
        name: 'Revenue',
        data: chartData.revenueData.length > 0 ? chartData.revenueData : [0],
      },
      {
        name: 'Expenses',
        data: new Array(chartData.revenueData.length || 1).fill(0), // Expenses would need separate endpoint
      },
    ],
    chart: {
      height: 300,
      type: 'line' as const,
      zoom: { enabled: false },
      toolbar: { show: false },
    },
    colors: ['#5955D1', '#6c757d'], // Revenue: primary (purple), Expenses: secondary (grey)
    dataLabels: { enabled: false },
    stroke: {
      width: [2, 2],
      curve: 'smooth' as const,
      dashArray: [0, 8], // Revenue: solid (0), Expenses: dashed (8)
    },
    markers: {
      size: 0,
      hover: { sizeOffset: 6 },
    },
    yaxis: {
      min: 0,
      max: chartData.maxValue > 0 ? chartData.maxValue * 1.2 : 100000,
      tickAmount: 5,
      labels: {
        formatter: (value: number) => `${(value / 1000).toFixed(0)}K`,
        style: {
          colors: 'var(--bs-body-color)',
          fontSize: '13px',
          fontFamily: 'var(--bs-body-font-family)',
        },
      },
    },
    xaxis: {
      categories: chartData.categories.length > 0 ? chartData.categories : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      axisBorder: { color: 'var(--bs-border-color)' },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: 'var(--bs-body-color)',
          fontSize: '13px',
          fontFamily: 'var(--bs-body-font-family)',
        },
      },
    },
    tooltip: {
      y: [
        {
          title: {
            formatter: (val: string) => `${val} per session`,
          },
        },
        {
          title: {
            formatter: (val: string) => val,
          },
        },
      ],
    },
    grid: {
      borderColor: 'var(--bs-border-color)',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    legend: {
      show: true,
      position: 'bottom' as const,
      horizontalAlign: 'center' as const,
      markers: { strokeWidth: 0 },
      labels: {
        colors: 'var(--bs-body-color)',
        fontSize: '12px',
        fontWeight: '600',
        fontFamily: 'var(--bs-body-font-family)',
      },
    },
  };

  // Expense Breakdown Chart (Doughnut) - Using placeholder data since expenses endpoint doesn't exist
  const expenseChartData = {
    labels: ['Salaries', 'Rent', 'Software', 'Marketing'],
    datasets: [
      {
        data: [0, 0, 0, 0], // Would need expenses data from API
        backgroundColor: ['#5955D1', '#ACAAE8', '#d1d0f7', '#DEDDF6'],
        borderRadius: 3,
        spacing: 0,
        hoverOffset: 5,
        borderWidth: 3,
        borderColor: '#fff',
        hoverBorderColor: '#fff',
      },
    ],
  };

  const expenseChartOptions = {
    cutout: '65%',
    devicePixelRatio: 2,
    layout: { padding: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ${context.formattedValue}`,
        },
      },
    },
  };

  // Monthly Status Chart
  const monthlyStatusChartConfig = {
    series: [92],
    chart: {
      type: 'radialBar' as const,
      offsetY: 0,
      height: 350,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -95,
        endAngle: 95,
        track: {
          background: 'rgba(255, 255, 255, 0.3)',
          strokeWidth: '100%',
          margin: 25,
        },
        dataLabels: {
          name: { show: false },
          value: {
            show: true,
            offsetY: -35,
            fontSize: '28px',
            fontFamily: 'var(--bs-body-font-family)',
            fontWeight: 600,
            color: '#000000',
            formatter: () => '75K',
          },
        },
      },
    },
    grid: {
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    },
    fill: {
      colors: ['#FFFFFF'],
    },
  };

  // Transform orders to transactions format
  const transactions = (salesReport?.orders || []).slice(0, 10).map((order: any) => {
    const orderDate = order.orderDate || order.createdAt;
    const date = new Date(orderDate);
    const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    return {
      name: order.customer?.name || 'Unknown Customer',
      date: formattedDate,
      description: `Order #${order.id}`,
      category: 'Revenue',
      amount: `+$${Number(order.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      status: order.status || 'Completed',
    };
  });

  const filteredTransactions = transactions.filter((tx: any) =>
    tx.name.toLowerCase().includes(transactionSearch.toLowerCase()) ||
    tx.description.toLowerCase().includes(transactionSearch.toLowerCase()) ||
    tx.category.toLowerCase().includes(transactionSearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    const statusMap: Record<string, { bg: string; text: string }> = {
      completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      processing: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
      failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    };
    const style = statusMap[statusLower] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status || 'Pending'}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate stats from real data
  const totalRevenue = salesReport?.totalRevenue || 0;
  const totalExpenses = 0; // Expenses would need a separate endpoint
  const netProfit = totalRevenue - totalExpenses;
  const pendingInvoices = (salesReport?.orders || []).filter((o: any) => 
    ['pending', 'processing'].includes((o.status || '').toLowerCase())
  ).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
          </div>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatsCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            {totalRevenue === 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Revenue</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">{formatCurrency(totalRevenue)}</h2>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            {totalExpenses === 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Expenses</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">{formatCurrency(totalExpenses)}</h2>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            {netProfit === 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Net Profit</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">{formatCurrency(netProfit)}</h2>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            {pendingInvoices === 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Pending Invoices</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">{pendingInvoices}</h2>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Revenue vs Expenses, Expense Breakdown, and Monthly Target - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          {/* Revenue vs Expenses Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Revenue vs Expenses</h6>
                <div className="relative" ref={yearDropdownRef}>
                  <button
                    onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[120px] justify-between"
                  >
                    <span>{selectedYear}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isYearDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-full min-w-[120px] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => {
                          setSelectedYear('This Year');
                          setIsYearDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                          selectedYear === 'This Year'
                            ? 'bg-primary text-white font-medium'
                            : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        This Year
                      </button>
                      <button
                        onClick={() => {
                          setSelectedYear('Last Year');
                          setIsYearDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                          selectedYear === 'Last Year'
                            ? 'bg-primary text-white font-medium'
                            : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        Last Year
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {chartData.revenueData.length === 0 || chartData.revenueData.every((val: number) => val === 0) ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">No Data Available</span>
                </div>
              ) : (
                <div className="p-2">
                  <Chart type="line" height={300} series={revenueExpensesChartConfig.series} options={revenueExpensesChartConfig} />
                </div>
              )}
            </div>

            {/* Expense Breakdown */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="border-b border-gray-200 dark:border-gray-700 mb-4 pb-4">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Expense Breakdown</h6>
              </div>
              {expenseChartData.datasets[0].data.every((val: number) => val === 0) ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">No Data Available</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="max-w-[175px] w-full aspect-square">
                    <Doughnut data={expenseChartData} options={expenseChartOptions} />
                  </div>
                <div className="w-full space-y-2">
                  {[
                    { label: 'Salaries', value: '40%', opacity: 'opacity-10' },
                    { label: 'Rent', value: '30%', opacity: 'opacity-25' },
                    { label: 'Software', value: '20%', opacity: 'opacity-50' },
                    { label: 'Marketing', value: '10%', opacity: 'opacity-75' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 bg-primary ${item.opacity} rounded`}></div>
                        <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                      </div>
                      <strong className="text-gray-900 dark:text-white font-semibold text-sm">{item.value}</strong>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </div>

            {/* Monthly Target */}
            <div className="lg:col-span-1 flex">
              <div className="bg-primary rounded-lg shadow-sm border-0 overflow-hidden relative w-full flex flex-col" style={{
            backgroundImage: 'linear-gradient(135deg, rgba(89, 85, 209, 0.1) 0%, rgba(112, 8, 231, 0.1) 100%)',
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between relative z-10">
              <h6 className="text-sm font-semibold text-white mb-0">Monthly Target</h6>
              <button className="p-1 hover:bg-white/20 rounded transition-colors">
                <MoreVertical className="w-4 h-4 text-white" />
              </button>
            </div>
            {totalRevenue === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 flex-1">
                <Inbox className="w-12 h-12 text-white/50 mb-3" />
                <span className="text-sm text-white/70">No Data Available</span>
              </div>
            ) : (
              <div className="p-4 pt-2 pb-0 flex-1 flex flex-col">
                <div className="flex gap-2 items-center mb-3">
                  <h2 className="mb-0 text-white text-2xl font-bold">92%</h2>
                  <span className="text-white text-sm">+15% vs last month</span>
                </div>
                <div className="mb-5 relative -z-10 flex-1 flex items-center justify-center">
                  <Chart type="radialBar" height={350} series={monthlyStatusChartConfig.series} options={monthlyStatusChartConfig} />
                  <div className="-mt-10 text-center text-white font-semibold">673 Orders</div>
                </div>
                <div className="text-center px-3 mb-4">
                  <p className="text-white mb-0 text-sm">
                    You earn <strong className="text-yellow-300">$7540</strong> today, its higher than last month keep up your good trends!
                  </p>
                </div>
              </div>
            )}
            <div className="p-4 border-t border-white/10 pt-3">
              <div className="bg-white dark:bg-gray-800 py-3 px-3 rounded-lg flex">
                <div className="text-center flex-1 py-2">
                  <h4 className="mb-0 text-gray-900 dark:text-white">$75K</h4>
                  <span className="text-primary text-xs font-semibold block">Target</span>
                </div>
                <div className="w-px bg-gray-300 dark:bg-gray-600 opacity-50"></div>
                <div className="text-center flex-1 py-2">
                  <h4 className="mb-0 text-gray-900 dark:text-white">$15k</h4>
                  <span className="text-primary text-xs font-semibold block">Revenue</span>
                </div>
                <div className="w-px bg-gray-300 dark:bg-gray-600 opacity-50"></div>
                <div className="text-center flex-1 py-2">
                  <h4 className="mb-0 text-gray-900 dark:text-white">$8.5k</h4>
                  <span className="text-primary text-xs font-semibold block">Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="mt-5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between">
          <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Recent Transactions</h6>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={transactionSearch}
              onChange={(e) => setTransactionSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[150px]">Name</th>
                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[150px]">Date</th>
                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[200px]">Description</th>
                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">Amount</th>
                <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                        {tx.name.charAt(0)}
                      </div>
                      <span className="text-gray-900 dark:text-white">{tx.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{tx.date}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{tx.description}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{tx.category}</td>
                  <td className={`px-4 py-3 font-bold ${tx.amount.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {tx.amount}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

