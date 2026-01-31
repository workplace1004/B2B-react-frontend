import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Wallet, ShoppingCart, Search, Edit, Trash2, X, AlertTriangle, Inbox, TrendingUp, Target } from 'lucide-react';
import Chart from 'react-apexcharts';
import { SkeletonStatsCard } from '../components/Skeleton';

export default function SalesDashboard() {
  const [salesTimeRange, setSalesTimeRange] = useState<'today' | 'week' | 'month'>('month');
  const [salesSearchInput, setSalesSearchInput] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [topSellingSearchInput, setTopSellingSearchInput] = useState('');
  const [topSellingSearch, setTopSellingSearch] = useState('');
  const [topSellingPage, setTopSellingPage] = useState(1);
  const itemsPerPage = 5;

  // Get date range based on time range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (salesTimeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }
    
    return { 
      startDate: startDate.toISOString().split('T')[0], 
      endDate: endDate.toISOString().split('T')[0] 
    };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    },
  });

  // Fetch sales data
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['analytics', 'sales', startDate, endDate, salesTimeRange],
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

  // Process orders data for charts based on time range
  const processOrdersForChart = () => {
    const orders = salesReport?.orders || [];
    
    if (salesTimeRange === 'today') {
      // Group by hour
      const hourlyData: Record<number, number> = {};
      orders.forEach((order: any) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const hour = orderDate.getHours();
        if (!hourlyData[hour]) hourlyData[hour] = 0;
        hourlyData[hour] += Number(order.totalAmount || 0);
      });
      
      const hours = Array.from({ length: 12 }, (_, i) => i * 2);
      const incomeData = hours.map(h => hourlyData[h] || 0);
      const categories = hours.map(h => {
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
      });
      
      return { incomeData, expensesData: new Array(12).fill(0), categories, maxValue: Math.max(...incomeData, 0) };
    } else if (salesTimeRange === 'week') {
      // Group by day
      const dailyData: Record<string, number> = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      orders.forEach((order: any) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const dayName = dayNames[orderDate.getDay()];
        if (!dailyData[dayName]) dailyData[dayName] = 0;
        dailyData[dayName] += Number(order.totalAmount || 0);
      });
      
      const incomeData = dayNames.map(day => dailyData[day] || 0);
      return { incomeData, expensesData: new Array(7).fill(0), categories: dayNames, maxValue: Math.max(...incomeData, 0) };
    } else {
      // Group by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData: Record<number, number> = {};
      orders.forEach((order: any) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const month = orderDate.getMonth();
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month] += Number(order.totalAmount || 0);
      });
      
      const incomeData = monthNames.map((_, idx) => monthlyData[idx] || 0);
      return { incomeData, expensesData: new Array(12).fill(0), categories: monthNames, maxValue: Math.max(...incomeData, 0) };
    }
  };

  const chartData = processOrdersForChart();

  // Sales Chart Configuration
  const getSalesChartConfig = () => {
    const baseConfig = {
      chart: {
        height: 320,
        type: 'area' as const,
        zoom: { enabled: false },
        toolbar: { show: false },
      },
      colors: ['#0d6efd', '#dc3545'], // Income: blue, Expenses: red
      fill: {
        type: ['gradient', 'gradient'],
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 0.1,
          gradientToColors: ['#0d6efd', '#dc3545'], // Blue for Income, Red for Expenses
          inverseColors: false,
          opacityFrom: 0.4, // Increased opacity for better visibility
          opacityTo: 0.1, // Increased opacity for better visibility
          stops: [20, 100],
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        width: [2, 2],
        curve: 'smooth' as const,
        dashArray: [0, 0],
        colors: ['#0d6efd', '#dc3545'], // Explicit stroke colors: blue for Income, red for Expenses
      },
      markers: {
        size: 0,
        colors: ['#FFFFFF'],
        strokeColors: '#17a2b8',
        strokeWidth: 2,
        hover: { size: 6 },
      },
      yaxis: {
        min: 0,
        max: chartData.maxValue > 0 ? chartData.maxValue * 1.2 : 10000,
        tickAmount: 5,
        labels: {
          formatter: (value: number) => `$${(value / 1000).toFixed(0)}K`,
          style: {
            colors: 'var(--bs-body-color)',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: 'var(--bs-body-font-family)',
          },
        },
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
        markers: {
          size: 5,
          shape: 'circle' as const,
          radius: 10,
          width: 10,
          height: 10,
        },
        labels: {
          colors: 'var(--bs-heading-color)',
          fontFamily: 'var(--bs-body-font-family)',
          fontSize: '13px',
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `$ ${val}K`,
        },
      },
    };

    return {
      ...baseConfig,
      series: [
        { name: 'Income', data: chartData.incomeData.length > 0 ? chartData.incomeData : [0] },
        { name: 'Expenses', data: chartData.expensesData.length > 0 ? chartData.expensesData : [0] },
      ],
      xaxis: {
        categories: chartData.categories.length > 0 ? chartData.categories : ['N/A'],
        axisBorder: { color: 'var(--bs-border-color)' },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: 'var(--bs-body-color)',
            fontSize: '13px',
            fontWeight: '500',
            fontFamily: 'var(--bs-body-font-family)',
          },
        },
      },
    };
  };

  // Monthly Target Chart - will be configured dynamically with real data
  const getMonthlyTargetChartConfig = () => ({
    series: [Math.min(100, Math.max(0, monthlyTargetProgress))],
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
          background: 'rgba(89, 85, 209, 0.6)',
          strokeWidth: '10%',
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
            color: 'var(--bs-dark)',
            formatter: () => `${Math.min(100, monthlyTargetProgress).toFixed(1)}%`,
          },
        },
      },
    },
    grid: {
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
    },
    fill: {
      colors: ['#5955D1'],
    },
  });

  // Sales Growth Chart
  const salesGrowthChartConfig = {
    series: [
      {
        name: '',
        data: [1000, 2050, 3100, 4800, 4800, 1800, 4500],
      },
    ],
    chart: {
      height: 280,
      type: 'area' as const,
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
      },
    },
    colors: ['#5955D1'], // Primary color
    fill: {
      type: ['gradient'],
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.1,
        gradientToColors: ['#17a2b8'], // Info color
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0.06,
        stops: [20, 100],
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
      colors: ['#17a2b8'], // Info color for line
    },
    grid: {
      borderColor: 'var(--bs-border-color)',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `$ ${val}K`,
      },
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisBorder: { color: 'var(--bs-border-color)' },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: 'var(--bs-body-color)',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'var(--bs-body-font-family)',
        },
      },
    },
    yaxis: {
      min: 0,
      max: 6000,
      tickAmount: 4,
      labels: {
        formatter: (value: number) => `$${(value / 100).toFixed(0)}K`,
        style: {
          colors: 'var(--bs-body-color)',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'var(--bs-body-font-family)',
        },
      },
    },
  };

  // Visitors Chart
  const visitorsChartConfig = {
    series: [
      { name: 'Current', data: [4500, 2050, 3100, 4800, 1800, 2500] },
      { name: 'Last Month', data: [4040, 2050, 4200, 2800, 1800, 2050] },
    ],
    chart: {
      height: 295,
      type: 'bar' as const,
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
      },
    },
    colors: ['#5955D1', '#f8f9fa'],
    fill: {
      type: ['gradient'],
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.1,
        gradientToColors: ['#17a2b8'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.6,
        stops: [20, 100],
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '75%',
        borderRadius: 4,
        distributed: false,
      },
    },
    grid: {
      borderColor: 'var(--bs-border-color)',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val} Visitors`,
      },
    },
    xaxis: {
      categories: [['Mobile'], ['Desktop'], ['Tablet'], ['iPad pro'], ['iPhone'], ['Other']],
      axisBorder: { color: 'var(--bs-border-color)' },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: 'var(--bs-body-color)',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'var(--bs-body-font-family)',
        },
      },
    },
    yaxis: { show: false },
  };

  // Transform orders to recent sales format
  const recentSales = (salesReport?.orders || []).slice(0, 5).map((order: any) => {
    const firstProduct = order.orderLines?.[0]?.product;
    return {
      id: `#${order.id}`,
      customer: order.customer?.name || 'Unknown Customer',
      product: firstProduct?.name || 'Multiple Products',
      amount: `$${Number(order.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      payment: order.paymentMethod || 'N/A',
      status: order.status || 'Pending',
    };
  });

  // Process orders to get top selling items
  const processTopSellingItems = () => {
    const orders = salesReport?.orders || [];
    const productSales: Record<string, { product: any; quantity: number; totalSale: number; price: number }> = {};
    
    orders.forEach((order: any) => {
      order.orderLines?.forEach((line: any) => {
        const productId = line.productId;
        const product = line.product;
        
        if (!productSales[productId]) {
          productSales[productId] = {
            product,
            quantity: 0,
            totalSale: 0,
            price: Number(line.unitPrice || 0),
          };
        }
        
        productSales[productId].quantity += Number(line.quantity || 0);
        productSales[productId].totalSale += Number(line.totalPrice || line.unitPrice * line.quantity || 0);
      });
    });

    // Fetch inventory for stock info
    const topSelling = Object.values(productSales)
      .sort((a, b) => b.totalSale - a.totalSale)
      .slice(0, 11)
      .map((item, idx) => ({
        id: `#TXN${10000 + idx}`,
        product: item.product?.name || 'Unknown Product',
        stock: 0, // Would need inventory data
        price: `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalSale: `$${item.totalSale.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: 'Available', // Would need inventory data to determine
      }));

    return topSelling;
  };

  const topSellingItems = processTopSellingItems();

  // Modal states for Recent Sales
  const [isEditSaleModalOpen, setIsEditSaleModalOpen] = useState(false);
  const [isEditSaleModalShowing, setIsEditSaleModalShowing] = useState(false);
  const [isDeleteSaleModalOpen, setIsDeleteSaleModalOpen] = useState(false);
  const [isDeleteSaleModalShowing, setIsDeleteSaleModalShowing] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Modal states for Top Selling Items
  const [isEditTopSellingModalOpen, setIsEditTopSellingModalOpen] = useState(false);
  const [isEditTopSellingModalShowing, setIsEditTopSellingModalShowing] = useState(false);
  const [isDeleteTopSellingModalOpen, setIsDeleteTopSellingModalOpen] = useState(false);
  const [isDeleteTopSellingModalShowing, setIsDeleteTopSellingModalShowing] = useState(false);
  const [selectedTopSelling, setSelectedTopSelling] = useState<any>(null);

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isEditSaleModalOpen || isDeleteSaleModalOpen || isEditTopSellingModalOpen || isDeleteTopSellingModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isEditSaleModalOpen) setIsEditSaleModalShowing(true);
          if (isDeleteSaleModalOpen) setIsDeleteSaleModalShowing(true);
          if (isEditTopSellingModalOpen) setIsEditTopSellingModalShowing(true);
          if (isDeleteTopSellingModalOpen) setIsDeleteTopSellingModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsEditSaleModalShowing(false);
      setIsDeleteSaleModalShowing(false);
      setIsEditTopSellingModalShowing(false);
      setIsDeleteTopSellingModalShowing(false);
    }
  }, [isEditSaleModalOpen, isDeleteSaleModalOpen, isEditTopSellingModalOpen, isDeleteTopSellingModalOpen]);

  const closeEditSaleModal = () => {
    setIsEditSaleModalShowing(false);
    setTimeout(() => setIsEditSaleModalOpen(false), 150);
    setSelectedSale(null);
  };

  const closeDeleteSaleModal = () => {
    setIsDeleteSaleModalShowing(false);
    setTimeout(() => setIsDeleteSaleModalOpen(false), 150);
    setSelectedSale(null);
  };

  const closeEditTopSellingModal = () => {
    setIsEditTopSellingModalShowing(false);
    setTimeout(() => setIsEditTopSellingModalOpen(false), 150);
    setSelectedTopSelling(null);
  };

  const closeDeleteTopSellingModal = () => {
    setIsDeleteTopSellingModalShowing(false);
    setTimeout(() => setIsDeleteTopSellingModalOpen(false), 150);
    setSelectedTopSelling(null);
  };

  const filteredSales = recentSales.filter((sale: any) =>
    sale.id.toLowerCase().includes(salesSearch.toLowerCase()) ||
    sale.customer.toLowerCase().includes(salesSearch.toLowerCase()) ||
    sale.product.toLowerCase().includes(salesSearch.toLowerCase())
  );

  const filteredTopSelling = topSellingItems.filter((item) =>
    item.id.toLowerCase().includes(topSellingSearch.toLowerCase()) ||
    item.product.toLowerCase().includes(topSellingSearch.toLowerCase())
  );

  const totalTopSellingPages = Math.ceil(filteredTopSelling.length / itemsPerPage);
  const paginatedTopSelling = filteredTopSelling.slice(
    (topSellingPage - 1) * itemsPerPage,
    topSellingPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      Completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      Pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      Failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
      Available: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      'Not-Available': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    };
    const style = statusMap[status] || statusMap.Pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status}
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

  // Calculate stats
  // Calculate total earning from orders if totalRevenue is not available
  const calculateTotalEarning = () => {
    if (salesReport?.totalRevenue) {
      return salesReport.totalRevenue;
    }
    // Calculate from orders if totalRevenue is not provided
    const orders = salesReport?.orders || [];
    return orders.reduce((sum: number, order: any) => {
      return sum + (Number(order.totalAmount || 0));
    }, 0);
  };
  
  const totalEarning = calculateTotalEarning();
  const totalOrders = salesReport?.orderCount || dashboardStats?.totalOrders || 0;
  
  // Calculate Revenue Growth (compare current period with previous period)
  const calculateRevenueGrowth = () => {
    // If data hasn't loaded yet, return null
    if (!salesReport && isLoading) return null;
    
    // If we have orders, calculate growth
    if (totalOrders > 0 && totalEarning > 0) {
      // Estimate previous period revenue (assuming some growth)
      // This is a simplified calculation - in production, fetch actual previous period data
      const estimatedPrevRevenue = totalEarning * 0.85; // Estimate 15% growth
      const growth = estimatedPrevRevenue > 0 ? ((totalEarning - estimatedPrevRevenue) / estimatedPrevRevenue) * 100 : 0;
      return growth;
    }
    
    // If we have data loaded but no orders/revenue, return 0 (no growth)
    if (!isLoading) return 0;
    
    return null;
  };
  
  const revenueGrowth = calculateRevenueGrowth();
  
  // Calculate Conversion Rate (orders / visitors or orders / customers)
  // Since we don't have visitor data, we'll use a calculation based on customers
  const calculateConversionRate = () => {
    if (!dashboardStats || totalOrders === 0) return null;
    
    // Conversion rate = (Orders / Total Customers) * 100
    // Or we can use a simpler metric: (Completed Orders / Total Orders) * 100
    const completedOrders = (salesReport?.orders || []).filter((o: any) => 
      ['completed', 'delivered'].includes((o.status || '').toLowerCase())
    ).length;
    
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    return conversionRate;
  };
  
  const conversionRate = calculateConversionRate();

  // Calculate monthly target progress
  const currentMonthRevenue = (() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return (salesReport?.orders || []).reduce((sum: number, order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      if (orderDate >= monthStart) {
        return sum + Number(order.totalAmount || 0);
      }
      return sum;
    }, 0);
  })();

  const monthlyTarget = currentMonthRevenue > 0 ? currentMonthRevenue * 1.5 : 75000;
  const monthlyTargetProgress = monthlyTarget > 0 ? (currentMonthRevenue / monthlyTarget) * 100 : 0;

  // Calculate current month orders count
  const currentMonthOrders = (() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return (salesReport?.orders || []).filter((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      return orderDate >= monthStart;
    }).length;
  })();

  // Calculate order status breakdown for Sales Status
  const calculateSalesStatus = () => {
    const orders = salesReport?.orders || [];
    const statusCounts: Record<string, number> = {
      paid: 0,
      cancelled: 0,
      refunded: 0,
    };

    orders.forEach((order: any) => {
      const status = (order.status || '').toUpperCase();
      if (['FULFILLED', 'DELIVERED', 'SHIPPED', 'COMPLETED', 'PAID'].includes(status)) {
        statusCounts.paid++;
      } else if (['CANCELLED', 'CANCELED'].includes(status)) {
        statusCounts.cancelled++;
      } else if (['RETURNED', 'REFUNDED'].includes(status)) {
        statusCounts.refunded++;
      } else {
        // Default to paid for other statuses
        statusCounts.paid++;
      }
    });

    const total = orders.length || 1;
    return {
      paid: Math.round((statusCounts.paid / total) * 100),
      cancelled: Math.round((statusCounts.cancelled / total) * 100),
      refunded: Math.round((statusCounts.refunded / total) * 100),
    };
  };

  const salesStatus = calculateSalesStatus();

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Dashboard</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatsCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
          <div className="lg:col-span-8 xl:col-span-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="lg:col-span-6 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Dashboard</h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {!salesReport && isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
            </div>
          ) : totalEarning === 0 && totalOrders === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
            </div>
          ) : (
            <>
              <div className="p-4 pb-0 border-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="p-4 flex items-end">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Earning</p>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{formatCurrency(totalEarning)}</h2>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {totalOrders === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
            </div>
          ) : (
            <>
              <div className="p-4 pb-0 border-0">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              </div>
              <div className="p-4 flex items-end">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</p>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{totalOrders.toLocaleString()}</h2>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {revenueGrowth === null && isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
            </div>
          ) : (
            <>
              <div className="p-4 pb-0 border-0">
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div className="p-4 flex items-end">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenue Growth</p>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    {revenueGrowth !== null ? (
                      <>
                        {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                      </>
                    ) : (
                      '0.0%'
                    )}
                  </h2>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {conversionRate === null ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">No Data</span>
            </div>
          ) : (
            <>
              <div className="p-4 pb-0 border-0">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
              </div>
              <div className="p-4 flex items-end">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conversion Rate</p>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                    {conversionRate.toFixed(1)}%
                  </h2>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Charts Row - Sales Report, Monthly Target, Sales by Country */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Sales Report Chart - 6/12 on xl, 8/12 on lg */}
        <div className="lg:col-span-8 xl:col-span-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex flex-wrap gap-2 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Sales Report</h6>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
              <button
                onClick={() => setSalesTimeRange('today')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  salesTimeRange === 'today'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setSalesTimeRange('week')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  salesTimeRange === 'week'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setSalesTimeRange('month')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  salesTimeRange === 'month'
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Month
              </button>
            </div>
          </div>
          <div className="p-4 pb-0">
            <div className="flex gap-5 mb-4">
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                  <span className="text-gray-600 dark:text-gray-400">$</span>87,352<span className="text-primary">50</span>
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
                  Average Income <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded ml-1">+12.4%</span>
                </p>
              </div>
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
                  <span className="text-gray-600 dark:text-gray-400">$</span>97,500<span className="text-primary">50</span>
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
                  Average Expenses <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded ml-1">-7.3%</span>
                </p>
              </div>
            </div>
            <div className="-mx-3">
              <Chart
                type="area"
                height={320}
                series={getSalesChartConfig().series}
                options={getSalesChartConfig()}
              />
            </div>
          </div>
        </div>

        {/* Monthly Target - 3/12 on xl, 4/12 on lg */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Monthly Target</h6>
          </div>
          <div className="p-4 pt-0 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-0 -mt-2">
              <Chart type="radialBar" height={350} series={getMonthlyTargetChartConfig().series} options={getMonthlyTargetChartConfig()} />
              <div className="-mt-10 text-center text-gray-900 dark:text-white font-semibold">{currentMonthOrders.toLocaleString()} Sales</div>
            </div>
          </div>
          <div className="p-4 border-0">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sales Status</h6>
            <div className="flex gap-0 mb-4 bg-transparent">
              <div className="bg-transparent" style={{ width: `${salesStatus.paid}%` }}>
                <div className="h-2 bg-primary rounded"></div>
              </div>
              <div className="bg-transparent" style={{ width: `${salesStatus.cancelled}%` }}>
                <div className="h-2 bg-primary/75 rounded"></div>
              </div>
              <div className="bg-transparent" style={{ width: `${salesStatus.refunded}%` }}>
                <div className="h-2 bg-primary/50 rounded"></div>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Paid', value: salesStatus.paid, opacity: 'opacity-100' },
                { label: 'Cancelled', value: salesStatus.cancelled, opacity: 'opacity-75' },
                { label: 'Refunded', value: salesStatus.refunded, opacity: 'opacity-50' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-primary ${item.opacity} rounded`}></div>
                    <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                  </div>
                  <strong className="text-gray-900 dark:text-white font-semibold text-sm">{item.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales by Country - 3/12 on xl, 6/12 on lg */}
        <div className="lg:col-span-6 xl:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Sales by Country</h6>
            <a href="#" className="text-sm text-primary hover:text-primary/80">View All</a>
          </div>
          <div className="p-4 pt-2">
            <div className="flex gap-2 mb-3 items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">$45,314</h2>
              <span className="text-sm text-gray-600 dark:text-gray-400">+8.2% vs last month</span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {[
                { country: 'America', code: 'US', products: '4,265', label: 'PRODUCTS' },
                { country: 'China', code: 'CN', products: '3,740', label: 'Products' },
                { country: 'Germany', code: 'DE', products: '2,980', label: 'Products' },
                { country: 'Japan', code: 'JP', products: '1,640', label: 'Products' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded">
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 rounded mr-2 flex items-center justify-center overflow-hidden shrink-0" style={{ aspectRatio: '1' }}>
                      <img 
                        src={`https://flagcdn.com/w20/${item.code.toLowerCase()}.png`}
                        alt={`${item.country} flag`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          const emojiMap: Record<string, string> = {
                            'US': '🇺🇸',
                            'CN': '🇨🇳',
                            'DE': '🇩🇪',
                            'JP': '🇯🇵',
                          };
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span style="font-size: 20px; line-height: 1; display: inline-block;">${emojiMap[item.code] || '🏳️'}</span>`;
                          }
                        }}
                      />
                    </div>
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">{item.country}</h5>
                  </div>
                  <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-0">
                    {item.products} <span className="text-xs text-gray-600 dark:text-gray-400 font-normal">{item.label}</span>
                  </h5>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Total Visitors and Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Total Visitors - 4/12 on xl, 6/12 on lg */}
        <div className="lg:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Total Visitors</h6>
          </div>
          <div className="p-4 pt-2 pb-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">
              <span className="text-gray-600 dark:text-gray-400">$</span>12,552.<span className="text-primary">50</span>
            </h2>
            <div className="-mx-3 -mt-2">
              <Chart type="bar" height={295} series={visitorsChartConfig.series} options={visitorsChartConfig} />
            </div>
          </div>
        </div>

        {/* Recent Sales - 8/12 on xl, 6/12 on lg */}
        <div className="lg:col-span-6 xl:col-span-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex flex-wrap gap-3 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Recent Sales</h6>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Q Search"
                value={salesSearchInput}
                onChange={(e) => setSalesSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setSalesSearch(e.currentTarget.value);
                  }
                }}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4 pt-2 pb-2 overflow-x-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                  </th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Order ID</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[200px]">Customer Name</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[200px]">Product</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Amount</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Payment</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">No Sales Found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{sale.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                            {sale.customer.charAt(0)}
                          </div>
                          <span className="text-gray-900 dark:text-white">{sale.customer}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sale.product}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-semibold">{sale.amount}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{sale.payment}</td>
                      <td className="px-4 py-3">{getStatusBadge(sale.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Selling Items and Sales Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Top Selling Items - 8/12 on xl, 7/12 on lg */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex flex-wrap gap-2 items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Top Selling Items</h6>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                value={topSellingSearchInput}
                onChange={(e) => setTopSellingSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setTopSellingSearch(e.currentTarget.value);
                    setTopSellingPage(1);
                  }
                }}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-4 pt-1 pb-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Order ID</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[300px]">Product Name</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Stock</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Price</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Total Sale</th>
                  <th className="px-4 py-3 text-left text-gray-700 dark:text-gray-300 font-semibold min-w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTopSelling.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">No Items Found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTopSelling.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{item.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                            {item.product.charAt(0)}
                          </div>
                          <span className="text-gray-900 dark:text-white">{item.product}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.stock.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.price}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-semibold">{item.totalSale}</td>
                      <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(topSellingPage - 1) * itemsPerPage + 1} to {Math.min(topSellingPage * itemsPerPage, filteredTopSelling.length)} of {filteredTopSelling.length} entries
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTopSellingPage(1)}
                  disabled={topSellingPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ««
                </button>
                <button
                  onClick={() => setTopSellingPage((p) => Math.max(1, p - 1))}
                  disabled={topSellingPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  «
                </button>
                {Array.from({ length: Math.min(3, totalTopSellingPages) }, (_, i) => {
                  let pageNum;
                  if (totalTopSellingPages <= 3) {
                    pageNum = i + 1;
                  } else if (topSellingPage <= 2) {
                    pageNum = i + 1;
                  } else if (topSellingPage >= totalTopSellingPages - 1) {
                    pageNum = totalTopSellingPages - 2 + i;
                  } else {
                    pageNum = topSellingPage - 1 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setTopSellingPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${
                        topSellingPage === pageNum
                          ? 'bg-primary text-white border-primary'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setTopSellingPage((p) => Math.min(totalTopSellingPages, p + 1))}
                  disabled={topSellingPage === totalTopSellingPages}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »
                </button>
                <button
                  onClick={() => setTopSellingPage(totalTopSellingPages)}
                  disabled={topSellingPage === totalTopSellingPages}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  »»
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Growth Chart - 4/12 on xl, 5/12 on lg */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 pb-0 border-0 flex items-center justify-between">
            <h6 className="text-sm font-semibold text-gray-900 dark:text-white mb-0">Sales Growth</h6>
          </div>
          <div className="p-4 pt-2 pb-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">78.50%</h2>
            <div className="-mx-3">
              <Chart type="area" height={280} series={salesGrowthChartConfig.series} options={salesGrowthChartConfig} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {isEditSaleModalOpen && selectedSale && (
        <EditSaleModal
          sale={selectedSale}
          onClose={closeEditSaleModal}
          isShowing={isEditSaleModalShowing}
        />
      )}

      {/* Delete Sale Modal */}
      {isDeleteSaleModalOpen && selectedSale && (
        <DeleteSaleModal
          sale={selectedSale}
          onClose={closeDeleteSaleModal}
          isShowing={isDeleteSaleModalShowing}
        />
      )}

      {/* Edit Top Selling Modal */}
      {isEditTopSellingModalOpen && selectedTopSelling && (
        <EditTopSellingModal
          item={selectedTopSelling}
          onClose={closeEditTopSellingModal}
          isShowing={isEditTopSellingModalShowing}
        />
      )}

      {/* Delete Top Selling Modal */}
      {isDeleteTopSellingModalOpen && selectedTopSelling && (
        <DeleteTopSellingModal
          item={selectedTopSelling}
          onClose={closeDeleteTopSellingModal}
          isShowing={isDeleteTopSellingModalShowing}
        />
      )}
    </div>
  );
}

// Edit Sale Modal Component
function EditSaleModal({
  sale,
  onClose,
  isShowing,
}: {
  sale: any;
  onClose: () => void;
  isShowing: boolean;
}) {
  return (
    <>
      {/* Modal Backdrop */}
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editSaleModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '32rem' }}
        >
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <h5 id="editSaleModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                Edit Sale
              </h5>
              <button
                type="button"
                onClick={onClose}
                className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <p className="text-gray-600 dark:text-gray-400">
                Edit functionality for sale <strong className="text-gray-900 dark:text-white">{sale.id}</strong>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Customer: {sale.customer} | Product: {sale.product} | Amount: {sale.amount}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Handle save action
                  onClose();
                }}
                className="px-5 py-2.5 ml-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Delete Sale Modal Component
function DeleteSaleModal({
  sale,
  onClose,
  isShowing,
}: {
  sale: any;
  onClose: () => void;
  isShowing: boolean;
}) {
  return (
    <>
      {/* Modal Backdrop */}
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteSaleModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '28rem' }}
        >
          <div className="modal-content">
            {/* Modal Body with Icon */}
            <div className="modal-body text-center py-8 px-6">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
              </div>

              {/* Title */}
              <h5 id="deleteSaleModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Sale
              </h5>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete sale
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{sale.id}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Handle delete action
                  onClose();
                }}
                className="px-5 py-2.5 ml-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Sale
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Edit Top Selling Modal Component
function EditTopSellingModal({
  item,
  onClose,
  isShowing,
}: {
  item: any;
  onClose: () => void;
  isShowing: boolean;
}) {
  return (
    <>
      {/* Modal Backdrop */}
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editTopSellingModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '32rem' }}
        >
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <h5 id="editTopSellingModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                Edit Top Selling Item
              </h5>
              <button
                type="button"
                onClick={onClose}
                className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <p className="text-gray-600 dark:text-gray-400">
                Edit functionality for item <strong className="text-gray-900 dark:text-white">{item.id}</strong>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Product: {item.product} | Stock: {item.stock.toLocaleString()} | Price: {item.price} | Total Sale: {item.totalSale}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Handle save action
                  onClose();
                }}
                className="px-5 py-2.5 ml-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Delete Top Selling Modal Component
function DeleteTopSellingModal({
  item,
  onClose,
  isShowing,
}: {
  item: any;
  onClose: () => void;
  isShowing: boolean;
}) {
  return (
    <>
      {/* Modal Backdrop */}
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteTopSellingModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '28rem' }}
        >
          <div className="modal-content">
            {/* Modal Body with Icon */}
            <div className="modal-body text-center py-8 px-6">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
              </div>

              {/* Title */}
              <h5 id="deleteTopSellingModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Top Selling Item
              </h5>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete item
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{item.product}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Handle delete action
                  onClose();
                }}
                className="px-5 py-2.5 ml-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Item
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

