import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Package, ShoppingCart, AlertTriangle, ArrowRight, TrendingUp, Calendar, Search, Plus, Trash2, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { SkeletonStatsCard, SkeletonTable } from '../components/Skeleton';
import Chart from 'react-apexcharts';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

ChartJS.register(ArcElement, Tooltip, Legend);

// Custom plugin to add center text to doughnut chart (without "Sources" label)
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

    // Total value only (no "Sources" label)
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = isDark ? '#fff' : '#000';
    ctx.fillText(total.toString(), centerX, centerY);

    ctx.restore();
  },
};

ChartJS.register(centerTextPlugin);

interface Task {
  id: string;
  text: string;
  completed: boolean;
  time: string;
  color?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    setSelectedDate(selected);
    setIsCalendarOpen(false);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarDate.getMonth() === today.getMonth() &&
      calendarDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      calendarDate.getMonth() === selectedDate.getMonth() &&
      calendarDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const [tasks, setTasks] = useState<Task[]>([]);

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    },
  });

  // Calculate percentage change for display
  const customerChangePercent = dashboardStats?.customerChangePercent || 0;
  const orderChangePercent = dashboardStats?.orderChangePercent || 0;

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

  // Fetch customers for New Customers card
  const customersPerPage = 6;
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'dashboard', customerPage, customerSearch],
    queryFn: async () => {
      const response = await api.get('/customers', {
        params: {
          skip: (customerPage - 1) * customersPerPage,
          take: customersPerPage,
        },
      });
      return response.data;
    },
  });

  // Helper function to calculate days since creation
  const getDaysSince = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours < 12) return '1st Half Day';
      return '2nd Half Day';
    }
    if (diffDays === 1) return '1 Days';
    return `${diffDays} Days`;
  };

  // Task management functions
  const toggleTask = (id: string) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Sortable Task Item Component
  const SortableTaskItem = ({ task }: { task: Task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const bgColorClass = task.completed
      ? task.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10'
        : task.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/10'
          : task.color === 'green' ? 'bg-green-50 dark:bg-green-900/10'
            : task.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/10'
              : 'bg-gray-50/50 dark:bg-gray-900/30'
      : 'bg-gray-50/50 dark:bg-gray-900/30';

    const checkboxColorClass = task.completed
      ? task.color === 'blue' ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
        : task.color === 'purple' ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400'
          : task.color === 'green' ? 'text-green-600 dark:text-green-400 border-green-600 dark:border-green-400'
            : task.color === 'orange' ? 'text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400'
              : 'text-primary border-primary'
      : 'text-gray-400 border-gray-300 dark:border-gray-600';

    return (
      <li
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 px-3 py-2 rounded-md mb-1 ${bgColorClass} ${isDragging ? 'shadow-lg' : ''}`}
      >
        <span
          className="sortable-handle cursor-move flex-shrink-0 touch-none"
          {...attributes}
          {...listeners}
        >
          <svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.9998 3.16667C12.7362 3.16667 13.3332 2.56971 13.3332 1.83333C13.3332 1.09695 12.7362 0.5 11.9998 0.5C11.2635 0.5 10.6665 1.09695 10.6665 1.83333C10.6665 2.56971 11.2635 3.16667 11.9998 3.16667Z" fill="currentColor" className="text-gray-500 dark:text-gray-400" />
            <path d="M11.9998 9.26237C12.7362 9.26237 13.3332 8.66542 13.3332 7.92904C13.3332 7.19266 12.7362 6.5957 11.9998 6.5957C11.2635 6.5957 10.6665 7.19266 10.6665 7.92904C10.6665 8.66542 11.2635 9.26237 11.9998 9.26237Z" fill="currentColor" className="text-gray-500 dark:text-gray-400" />
            <path d="M11.9998 15.3571C12.7362 15.3571 13.3332 14.7601 13.3332 14.0238C13.3332 13.2874 12.7362 12.6904 11.9998 12.6904C11.2635 12.6904 10.6665 13.2874 10.6665 14.0238C10.6665 14.7601 11.2635 15.3571 11.9998 15.3571Z" fill="currentColor" className="text-gray-500 dark:text-gray-400" />
            <path d="M4.7618 3.16667C5.49818 3.16667 6.09513 2.56971 6.09513 1.83333C6.09513 1.09695 5.49818 0.5 4.7618 0.5C4.02542 0.5 3.42847 1.09695 3.42847 1.83333C3.42847 2.56971 4.02542 3.16667 4.7618 3.16667Z" fill="currentColor" className="text-gray-500 dark:text-gray-400" />
            <path d="M4.7618 9.26237C5.49818 9.26237 6.09513 8.66542 6.09513 7.92904C6.09513 7.19266 5.49818 6.5957 4.7618 6.5957C4.02542 6.5957 3.42847 7.19266 3.42847 7.92904C3.42847 8.66542 4.02542 9.26237 4.7618 9.26237Z" fill="currentColor" className="text-gray-500 dark:text-gray-400" />
            <path d="M4.7618 15.3571C5.49818 15.3571 6.09513 14.7601 6.09513 14.0238C6.09513 13.2874 5.49818 12.6904 4.7618 12.6904C4.02542 12.6904 3.42847 13.2874 3.42847 14.0238C3.42847 14.7601 4.02542 15.3571 4.7618 15.3571Z" fill="currentColor" className="text-gray-500 dark:text-gray-400" />
          </svg>
        </span>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleTask(task.id)}
          className={`w-4 h-4 rounded border-2 ${checkboxColorClass} cursor-pointer flex-shrink-0 accent-current`}
          style={{ accentColor: task.completed && task.color ? undefined : 'currentColor' }}
        />
        <span
          className={`flex-1 text-sm ${task.completed
            ? 'line-through text-gray-500 dark:text-gray-400'
            : 'text-gray-900 dark:text-white'
            }`}
        >
          {task.text}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">{task.time}</span>
        <button
          onClick={() => deleteTask(task.id)}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0 ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </button>
      </li>
    );
  };

  // Filter customers by search
  const filteredCustomers = customersData?.data?.filter((customer: any) => {
    if (!customerSearch) return true;
    const searchLower = customerSearch.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const totalCustomers = customersData?.total || 0;
  const totalPages = Math.ceil(totalCustomers / customersPerPage);

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

  // Fetch orders for task statistics
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'task-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch reviews statistics
  const { data: reviewsStats } = useQuery({
    queryKey: ['analytics', 'reviews'],
    queryFn: async () => {
      try {
        const response = await api.get('/analytics/reviews');
        return response.data;
      } catch (error) {
        return null;
      }
    },
  });

  // Calculate task statistics from orders
  const calculateTaskStats = () => {
    const orders = ordersData || [];
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Filter orders for this month and last month
    const thisMonthOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt || order.orderDate);
      return orderDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const lastMonthOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt || order.orderDate);
      return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
    });

    // Categorize orders as tasks (current month)
    const followUps = orders.filter((order: any) => {
      const status = (order.status || '').toUpperCase();
      return ['PENDING', 'CONFIRMED'].includes(status);
    }).length;

    const inProgress = orders.filter((order: any) => {
      const status = (order.status || '').toUpperCase();
      return ['PROCESSING', 'PARTIALLY_FULFILLED', 'SHIPPED', 'IN_TRANSIT'].includes(status);
    }).length;

    const pending = orders.filter((order: any) => {
      const status = (order.status || '').toUpperCase();
      return ['DRAFT'].includes(status);
    }).length;

    const completed = orders.filter((order: any) => {
      const status = (order.status || '').toUpperCase();
      return ['FULFILLED', 'DELIVERED'].includes(status);
    }).length;

    // Calculate last month's completed tasks
    const lastMonthCompleted = lastMonthOrders.filter((order: any) => {
      const status = (order.status || '').toUpperCase();
      return ['FULFILLED', 'DELIVERED'].includes(status);
    }).length;

    const total = orders.length;
    const tasksDone = completed;
    const progressPercent = total > 0 ? (tasksDone / total) * 100 : 0;

    return {
      followUps,
      inProgress,
      pending,
      tasksDone,
      total,
      progressPercent,
      lastMonthTasksDone: lastMonthCompleted,
    };
  };

  const taskStats = calculateTaskStats();

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
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${dateRange === range
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
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Total Customers</h6>
              </div>
              {(dashboardStats?.totalCustomers || 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
                </div>
              ) : (
                <>
                  <div className="p-4 pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                          {dashboardStats?.totalCustomers?.toLocaleString() || '0'}
                        </h2>
                        {customerChangePercent !== 0 && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${customerChangePercent > 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {customerChangePercent > 0 ? '+' : ''}{customerChangePercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-[120px] -mt-2">
                      <Chart
                        type="bar"
                        height={120}
                        series={[{
                          name: 'Customers',
                          data: dashboardStats?.customerTrend || [0, 0, 0, 0, 0, 0]
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
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
                        Vs last month: {dashboardStats?.lastMonthCustomers?.toLocaleString() || '0'}
                      </p>
                      <button
                        onClick={() => navigate('/customers')}
                        className="text-primary hover:text-primary-dark transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Card 2: Order Analytics */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Order Analytics</h6>
              </div>
              {(dashboardStats?.totalOrders || 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
                </div>
              ) : (
                <>
                  <div className="p-4 pt-0">
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                        {dashboardStats?.totalOrders?.toLocaleString() || '0'}
                      </h2>
                      {orderChangePercent !== 0 && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${orderChangePercent > 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {orderChangePercent > 0 ? '+' : ''}{orderChangePercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative -mx-1" style={{ height: '120px', paddingBottom: '20px' }}>
                    <Chart
                      type="area"
                      height={120}
                      series={[{
                        name: 'Orders',
                        data: dashboardStats?.orderTrend || [0, 0, 0, 0, 0, 0]
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
                          padding: { top: 0, right: 0, bottom: 20, left: 0 }
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
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center text-xs text-gray-500 dark:text-gray-400 w-full">
                      Compared to Last Month
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Card 3: Tasks Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Tasks Overview</h6>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Tasks Done <span className="text-primary font-semibold">{taskStats.tasksDone}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, taskStats.progressPercent)}%` }}
                    ></div>
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
                    {taskStats.total > 0 ? (
                      <Doughnut
                        data={{
                          labels: ['Follow-ups', 'In Progress', 'Pending'],
                          datasets: [{
                            data: [taskStats.followUps, taskStats.inProgress, taskStats.pending],
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
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-400">No Data</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Active Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Active Orders</h6>
              </div>
              {(dashboardStats?.totalOrders || 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
                </div>
              ) : (
                <>
                  <div className="p-4 pt-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                        {dashboardStats?.totalOrders?.toLocaleString() || '0'}
                      </h2>
                      {orderChangePercent !== 0 && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${orderChangePercent > 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {orderChangePercent > 0 ? '+' : ''}{orderChangePercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
                        Vs last month: {dashboardStats?.lastMonthOrders?.toLocaleString() || '0'}
                      </p>
                      <button
                        onClick={() => navigate('/orders')}
                        className="text-primary hover:text-primary-dark transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
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
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${(tab === 'Month' && dateRange === '90d') ||
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
                  <div className="relative" ref={calendarRef}>
                    <button
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    {isCalendarOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {/* Calendar Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 to-purple-500/10">
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => navigateMonth('prev')}
                              className="p-1.5 hover:bg-primary/20 dark:hover:bg-primary/30 rounded-lg transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5 text-primary dark:text-primary-300" />
                            </button>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button
                              onClick={() => navigateMonth('next')}
                              className="p-1.5 hover:bg-primary/20 dark:hover:bg-primary/30 rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-5 h-5 text-primary dark:text-primary-300" />
                            </button>
                          </div>
                        </div>

                        {/* Calendar Days */}
                        <div className="p-4">
                          {/* Day names */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                              <div
                                key={day}
                                className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2"
                              >
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, index) => (
                              <div key={`empty-${index}`} className="aspect-square"></div>
                            ))}
                            {Array.from({ length: getDaysInMonth(calendarDate) }, (_, i) => i + 1).map((day) => (
                              <button
                                key={day}
                                onClick={() => handleDateSelect(day)}
                                className={`aspect-square rounded-lg text-sm font-medium transition-all duration-200 ${isSelected(day)
                                  ? 'bg-primary text-white shadow-lg scale-110'
                                  : isToday(day)
                                    ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-300 font-bold border-2 border-primary'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Calendar Footer */}
                        {selectedDate && (
                          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                              Selected: <span className="font-semibold text-gray-900 dark:text-white">
                                {selectedDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 py-0">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    <span className="text-gray-600 dark:text-gray-400">$</span>
                    {formatCurrency(periodRevenue).replace('$', '').split('.')[0]}.
                    <span className="text-primary">{formatCurrency(periodRevenue).split('.')[1]}</span>
                  </h2>
                  {salesReport?.revenueChangePercent !== undefined && (
                    <span className={`text-sm ${salesReport.revenueChangePercent >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                      }`}>
                      {salesReport.revenueChangePercent >= 0 ? '+' : ''}{salesReport.revenueChangePercent.toFixed(0)}% vs last month
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 pt-0">
                {periodRevenue === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12" style={{ height: '280px' }}>
                    <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">No Data Available</span>
                  </div>
                ) : (
                  <div style={{ height: '280px' }}>
                    <Chart
                      type="bar"
                      height={280}
                      series={[{
                        name: 'Revenue',
                        data: salesReport?.monthlyRevenue || Array(12).fill(0)
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
                          max: Math.max(...(salesReport?.monthlyRevenue || [0]), 1) * 1.2,
                          tickAmount: 5,
                          labels: {
                            formatter: (val: number) => (val / 1000).toFixed(0) + 'K',
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
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column - Side Cards (Cards 6-7) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="grid grid-cols-1 gap-6">

            {/* Card 6: Order Sources - Using order types from schema */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Order Types</h6>
              </div>
              <div className="p-4 pt-0">
                {(() => {
                  // Calculate order types breakdown from sales report
                  const orderTypes = salesReport?.orders?.reduce((acc: any, order: any) => {
                    const type = order.type || 'B2B';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {}) || {};
                  const total = Object.values(orderTypes).reduce((sum: number, val: any) => sum + val, 0) || 1;
                  const percentages = Object.entries(orderTypes).map(([type, count]: [string, any]) => ({
                    type,
                    count,
                    percentage: (count / total) * 100
                  }));

                  // Sort by percentage descending
                  percentages.sort((a, b) => b.percentage - a.percentage);

                  const chartData = percentages.map(p => p.percentage);

                  return (
                    <>
                      <div style={{ height: '95px' }} className="my-1">
                        {chartData.length > 0 ? (
                          <Chart
                            type="bar"
                            height={95}
                            series={chartData.map((val, idx) => ({
                              name: percentages[idx].type,
                              data: [val]
                            }))}
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
                                y: { formatter: (val: number) => val.toFixed(1) + '%' }
                              }
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                            No data available
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 mt-2">
                        {percentages.map((item, idx) => {
                          const opacityMap = ['opacity-10', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100'];
                          return (
                            <div key={idx} className="flex items-center gap-1 text-xs py-1">
                              <div className={`w-3 h-3 bg-primary ${opacityMap[idx] || 'opacity-100'} rounded`}></div>
                              <span className="text-gray-600 dark:text-gray-400 flex-1">{item.type}</span>
                              <strong className="text-gray-900 dark:text-white font-semibold">{item.percentage.toFixed(1)}%</strong>
                            </div>
                          );
                        })}
                        {percentages.length === 0 && (
                          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No data available</div>
                        )}
                      </div>
                    </>
                  );
                })()}
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
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Customer Retention Rate</h6>
              </div>
              <div className="p-4 pb-0 pt-0">
                {(() => {
                  const retentionData = dashboardStats?.customerRetention || [];
                  const avgRetention = retentionData.length > 0
                    ? retentionData.reduce((sum: number, val: number) => sum + val, 0) / retentionData.length
                    : 0;
                  const prevRetention = retentionData.length > 1 ? retentionData[retentionData.length - 2] : 0;
                  const change = prevRetention > 0 ? ((avgRetention - prevRetention) / prevRetention) * 100 : 0;

                  // Review statistics
                  const totalReviews = reviewsStats?.totalReviews || 0;
                  const avgRating = reviewsStats?.avgRating || 0;
                  const positiveRatio = reviewsStats?.positiveRatio || 0;

                  return (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        {change !== 0 && (
                          <span className={`text-sm ${change >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                            }`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(0)}% vs last month
                          </span>
                        )}
                      </div>
                      {reviewsStats && (
                        <div className="grid grid-cols-3 gap-3 mb-3 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Reviews</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{totalReviews.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Rating</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{avgRating.toFixed(1)} / 5</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Positive</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{positiveRatio.toFixed(0)}%</p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="p-4 pt-1 pb-0">
                {(() => {
                  // Use review trends data for the chart
                  const reviewTrends = reviewsStats?.reviewTrends || [];
                  const retentionData = dashboardStats?.customerRetention || [];
                  
                  // Use review trends if available, otherwise fall back to retention data
                  let chartData: number[];
                  let chartLabel: string;
                  
                  if (reviewTrends.length > 0) {
                    // Use last 6 months of review trends
                    chartData = reviewTrends.slice(-6);
                    chartLabel = 'Reviews';
                  } else if (retentionData.length > 0) {
                    chartData = retentionData.slice(-6);
                    chartLabel = 'Retention Rate';
                  } else {
                    // Default empty data
                    chartData = [0, 0, 0, 0, 0, 0];
                    chartLabel = 'Retention Rate';
                  }

                  // Ensure we have exactly 6 data points
                  while (chartData.length < 6) {
                    chartData.unshift(0);
                  }
                  chartData = chartData.slice(-6);

                  // Get month labels for the last 6 months
                  const now = new Date();
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const monthLabels: string[] = [];
                  for (let i = 5; i >= 0; i--) {
                    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    monthLabels.push(monthNames[monthDate.getMonth()]);
                  }

                  const maxValue = Math.max(...chartData, 1);

                  return (
                    <div style={{ height: '295px' }} className="-mt-1">
                      <Chart
                        type="bar"
                        height={295}
                        series={[{
                          name: chartLabel,
                          data: chartData
                        }]}
                        options={{
                          chart: {
                            type: 'bar',
                            height: 295,
                            stacked: false,
                            toolbar: { show: false },
                            zoom: { enabled: false }
                          },
                          plotOptions: {
                            bar: {
                              horizontal: false,
                              borderRadius: 4,
                              columnWidth: '60%',
                            }
                          },
                          colors: ['#5955D1'],
                          yaxis: { 
                            show: true,
                            min: 0,
                            max: maxValue > 0 ? maxValue * 1.2 : 100,
                            labels: {
                              style: {
                                colors: '#696981',
                                fontSize: '12px',
                                fontWeight: 500
                              }
                            }
                          },
                          xaxis: {
                            categories: monthLabels,
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
                            show: false
                          },
                          grid: {
                            borderColor: 'transparent',
                            xaxis: { lines: { show: false } },
                            yaxis: { 
                              lines: { 
                                show: true
                              }
                            },
                            strokeDashArray: 4
                          },
                          fill: {
                            colors: ['#5955D1'],
                            opacity: 1
                          },
                          dataLabels: { 
                            enabled: false 
                          },
                          tooltip: {
                            enabled: true,
                            y: {
                              formatter: (val: number) => {
                                return chartLabel === 'Reviews' ? val.toString() : `${val.toFixed(1)}%`;
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  );
                })()}
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
              <div className="p-4 border-b border-white/10 relative z-10">
                <h6 className="text-sm font-semibold text-white mb-0">Total Revenue</h6>
              </div>
              {periodRevenue === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 flex-1" style={{ minHeight: '350px' }}>
                  <Inbox className="w-12 h-12 text-white/50 mb-3" />
                  <span className="text-sm text-white/70">No Data Available</span>
                </div>
              ) : (
                <>
                  <div className="p-4 pt-0 border-b border-white/10 relative z-10">
                    <div className="mb-5 -mt-3 relative" style={{ height: '350px' }}>
                      <Chart
                        type="radialBar"
                        height={350}
                        series={[(() => {
                          // Calculate completion percentage based on order status
                          const statusBreakdown = dashboardStats?.orderStatusBreakdown || [];
                          const completedStatuses = ['FULFILLED', 'DELIVERED', 'SHIPPED'];
                          const completed = statusBreakdown
                            .filter((s: any) => completedStatuses.includes(s.status))
                            .reduce((sum: number, s: any) => sum + s.count, 0);
                          const total = statusBreakdown.reduce((sum: number, s: any) => sum + s.count, 0) || 1;
                          return total > 0 ? (completed / total) * 100 : 0;
                        })()]}
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
                                  color: '#FFFFFF',
                                  formatter: () => {
                                    const revenue = periodRevenue / 1000000;
                                    return revenue > 0 ? `$${revenue.toFixed(1)}m` : '$0m';
                                  }
                                }
                              }
                            }
                          },
                          grid: {
                            padding: { top: 0, bottom: 0, left: 0, right: 0 }
                          },
                          fill: {
                            colors: ['#FFFFFF']
                          }
                        }}
                      />
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center text-white font-semibold">
                        {dashboardStats?.totalOrders || 673} Orders
                      </div>
                    </div>
                    {(() => {
                      // Calculate shipments and pickups from orders
                      const orders = salesReport?.orders || [];
                      const shipments = orders.filter((o: any) =>
                        ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(o.status)
                      ).length;
                      const pickups = orders.filter((o: any) =>
                        ['PICKED', 'PACKED'].includes(o.status)
                      ).length;
                      const shippedRevenue = orders
                        .filter((o: any) => ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(o.status))
                        .reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

                      return (
                        <div className="px-4 mb-3 flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <div className="py-1">
                              <div className="w-3 h-3 bg-white rounded"></div>
                            </div>
                            <div>
                              <h3 className="mb-0 text-white font-bold text-lg">
                                {formatCurrency(shippedRevenue).split('.')[0]}
                              </h3>
                              <p className="text-white/50 mb-0 text-sm">{pickups} Pickups</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="p-1">
                              <div className="w-3 h-3 bg-white/50 rounded"></div>
                            </div>
                            <div>
                              <h3 className="mb-0 text-white font-bold text-lg">
                                {formatCurrency(shippedRevenue).split('.')[0]}
                              </h3>
                              <p className="text-white/50 mb-0 text-sm">{shipments} Shipments</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="p-4 border-0">
                    <h6 className="text-sm font-semibold text-white mb-3">Orders Status</h6>
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
                    {(() => {
                      const statusBreakdown = dashboardStats?.orderStatusBreakdown || [];
                      const total = statusBreakdown.reduce((sum: number, s: any) => sum + s.count, 0) || 1;

                      // Map statuses to display labels
                      const statusMap: Record<string, string> = {
                        'FULFILLED': 'Fulfilled',
                        'DELIVERED': 'Delivered',
                        'SHIPPED': 'Shipped',
                        'CANCELLED': 'Cancelled',
                        'RETURNED': 'Returned',
                        'PENDING': 'Pending',
                        'PROCESSING': 'Processing',
                      };

                      // Get top 3 statuses
                      const topStatuses = statusBreakdown
                        .sort((a: any, b: any) => b.count - a.count)
                        .slice(0, 3);

                      const opacityMap = ['opacity-100', 'opacity-50', 'opacity-25'];

                      return (
                        <div className="space-y-2">
                          {topStatuses.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 bg-white ${opacityMap[idx] || 'opacity-25'} rounded`}></div>
                                <h6 className="font-light text-white mb-0 text-sm">
                                  {statusMap[item.status] || item.status}
                                </h6>
                              </div>
                              <strong className="text-white font-semibold">
                                {((item.count / total) * 100).toFixed(0)}%
                              </strong>
                            </div>
                          ))}
                          {topStatuses.length === 0 && (
                            <div className="text-center text-sm text-white/50 py-2">No data available</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Card 9: Orders By Time */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Orders By Time</h6>
              </div>
              {(dashboardStats?.totalOrders || 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ height: '250px' }}>
                  <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">No Data Available</span>
                </div>
              ) : (
                <div className="p-4 p-0">
                  {(() => {
                    const ordersByTime = dashboardStats?.ordersByTime;
                    const timeSlots = ordersByTime?.timeSlots || ['8am', '10am', '12pm', '2pm', '4pm'];
                    const data = ordersByTime?.data || [];

                    return (
                      <div style={{ height: '250px' }} className="-mt-3 -mb-1">
                        <Chart
                          type="heatmap"
                          height={250}
                          series={timeSlots.map((slot: string, idx: number) => ({
                            name: slot,
                            data: data[idx] || [0, 0, 0, 0, 0, 0, 0]
                          }))}
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
                              categories: ordersByTime?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
                    );
                  })()}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* New Customers and Task Update Cards */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* New Customers Card */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">New Customers</h6>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                onClick={() => navigate('/customers')}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New
              </button>
            </div>
          </div>
          <div className="p-2">
            {customersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : filteredCustomers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-2 py-2 text-left">
                        <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                      </th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[200px]">Name</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[150px]">Phone</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[150px]">Email</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[125px]">Days</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer: any) => (
                      <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 rounded-lg">
                        <td className="px-2 py-3">
                          <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                              {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <span className="text-gray-900 dark:text-white font-medium">{customer.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{customer.phone || 'N/A'}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">{customer.email || 'N/A'}</td>
                        <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                          {customer.createdAt ? getDaysSince(customer.createdAt) : 'N/A'}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${customer.isActive
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                            {customer.isActive ? 'Active' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                <span className="text-sm text-gray-500 dark:text-gray-400">No customers found</span>
              </div>
            )}
          </div>
          {filteredCustomers.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((customerPage - 1) * customersPerPage) + 1} to {Math.min(customerPage * customersPerPage, totalCustomers)} of {totalCustomers} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCustomerPage(1)}
                  disabled={customerPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => setCustomerPage(p => Math.max(1, p - 1))}
                  disabled={customerPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &lt;
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCustomerPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${customerPage === pageNum
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCustomerPage(p => Math.min(totalPages, p + 1))}
                  disabled={customerPage === totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &gt;
                </button>
                <button
                  onClick={() => setCustomerPage(totalPages)}
                  disabled={customerPage === totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Task Update Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Task Update</h6>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/tasks')}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                View All
              </button>
              <button
                onClick={() => {
                  const newTask: Task = {
                    id: Date.now().toString(),
                    text: 'New task',
                    completed: false,
                    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                  };
                  setTasks([newTask, ...tasks]);
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Task
              </button>
            </div>
          </div>
          <div className="p-2 pt-3 overflow-auto" style={{ maxHeight: '385px' }}>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                <span className="text-sm text-gray-500 dark:text-gray-400">No Tasks Found</span>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tasks.map(task => task.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1">
                    {tasks.map((task) => (
                      <SortableTaskItem key={task.id} task={task} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
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
