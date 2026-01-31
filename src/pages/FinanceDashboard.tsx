import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { Coins, CreditCard, TrendingUp, Calendar, Search, MoreVertical, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  // Fetch finance data
  const { isLoading } = useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    },
  });

  // Revenue vs Expenses Chart
  const revenueExpensesChartConfig = {
    series: [
      {
        name: 'Revenue',
        data: [300000, 80000, 300000, 300000, 290000, 210000, 350000, 500000, 380000],
      },
      {
        name: 'Expenses',
        data: [0, 200000, 350000, 180000, 190000, 400000, 400000, 280000, 220000],
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
      max: 500000,
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
      categories: ['Jan', 'Feb', 'Mar', 'May', 'Jun', 'July', 'Aug', 'Sep'],
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

  // Expense Breakdown Chart (Doughnut)
  const expenseChartData = {
    labels: ['Salaries', 'Rent', 'Software', 'Marketing'],
    datasets: [
      {
        data: [800, 600, 400, 200],
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

  // Sample transactions data
  const transactions = [
    { name: 'Emma Johnson', date: '28 Oct 2025', description: 'Client Payment - Project Alpha', category: 'Revenue', amount: '+$2,500', status: 'Completed' },
    { name: 'Liam Anderson', date: '26 Oct 2025', description: 'Office Rent', category: 'Expense', amount: '-$1,200', status: 'Paid' },
    { name: 'Olivia Brown', date: '23 Oct 2025', description: 'Software Subscription', category: 'Expense', amount: '-$89', status: 'Pending' },
    { name: 'Noah Wilson', date: '22 Oct 2025', description: 'Consulting Income', category: 'Revenue', amount: '+$800', status: 'Completed' },
    { name: 'Sophia Taylor', date: '28 Oct 2025', description: 'Client Payment - Project Alpha', category: 'Revenue', amount: '+$2,500', status: 'Completed' },
    { name: 'James Miller', date: '26 Oct 2025', description: 'Office Rent', category: 'Expense', amount: '-$1,200', status: 'Paid' },
  ];

  const [transactionSearch, setTransactionSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('This Year');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  
  // Calendar and date range states
  const [selectedDateRange, setSelectedDateRange] = useState('Month');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  const filteredTransactions = transactions.filter((tx) =>
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
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calendar helper functions
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    setIsCalendarOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      Completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      Paid: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
      Pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
    };
    const style = statusMap[status] || statusMap.Pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

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
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatsCard key={i} />)
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Revenue</span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">$120,540</h2>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Expenses</span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">$84,320</h2>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Net Profit</span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">$36,220</h2>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Pending Invoices</span>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-0 mt-1">12</h2>
                  </div>
                </div>
              </div>
            </>
          )}
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
              <div className="p-2">
                <Chart type="line" height={300} series={revenueExpensesChartConfig.series} options={revenueExpensesChartConfig} />
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="border-b border-gray-200 dark:border-gray-700 mb-4 pb-4">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Expense Breakdown</h6>
              </div>
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
            <div className="p-4 pt-2 pb-0 flex-1 flex flex-col">
              {/* Date Range Selector */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setSelectedDateRange('Today')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedDateRange === 'Today'
                        ? 'bg-primary text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSelectedDateRange('Week')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedDateRange === 'Week'
                        ? 'bg-primary text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setSelectedDateRange('Month')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      selectedDateRange === 'Month'
                        ? 'bg-primary text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Month
                  </button>
                </div>
                <div className="relative" ref={calendarRef}>
                  <button
                    onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    className="p-1.5 border border-white/30 rounded-md hover:bg-white/20 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-white" />
                  </button>
                  {isCalendarOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 p-3">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={() => navigateMonth('prev')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {monthNames[currentMonth]} {currentYear}
                        </h3>
                        <button
                          onClick={() => navigateMonth('next')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        </button>
                      </div>
                      
                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-0.5 mb-1.5">
                        {dayNames.map((day) => (
                          <div
                            key={day}
                            className="text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 py-1"
                          >
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: getFirstDayOfMonth(currentMonth, currentYear) }).map((_, idx) => (
                          <div key={`empty-${idx}`} className="aspect-square" />
                        ))}
                        {Array.from({ length: getDaysInMonth(currentMonth, currentYear) }).map((_, idx) => {
                          const day = idx + 1;
                          const isTodayDate = isToday(day);
                          const isSelectedDate = isSelected(day);
                          return (
                            <button
                              key={day}
                              onClick={() => handleDateSelect(day)}
                              className={`aspect-square rounded-md text-xs font-medium transition-all duration-200 ${
                                isSelectedDate
                                  ? 'bg-primary text-white shadow-md scale-105'
                                  : isTodayDate
                                  ? 'bg-primary/20 text-primary border border-primary'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-1.5">
                        <button
                          onClick={() => {
                            const today = new Date();
                            setCurrentMonth(today.getMonth());
                            setCurrentYear(today.getFullYear());
                            setSelectedDate(today);
                          }}
                          className="flex-1 px-2 py-1.5 text-[10px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => setIsCalendarOpen(false)}
                          className="flex-1 px-2 py-1.5 text-[10px] font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
              {filteredTransactions.map((tx, idx) => (
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

