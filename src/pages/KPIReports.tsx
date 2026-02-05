import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download, Calendar, Filter, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import Chart from 'react-apexcharts';

export default function KPIReports() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>(['revenue', 'orders', 'customers', 'profit']);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const dateRangeRef = useRef<HTMLDivElement>(null);

  // Check for dark mode
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target as Node)) {
        setIsDateRangeOpen(false);
      }
    };

    if (isDateRangeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDateRangeOpen]);

  // Fetch data for KPI reports
  const { isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    },
  });

  // Fetch sales data
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
      default:
        startDate.setFullYear(2020, 0, 1);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['analytics', 'sales', startDate, endDate],
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

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'kpi', startDate, endDate],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        const response = await api.get(`/orders?skip=0&take=10000`);
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const isLoading = dashboardLoading || salesLoading;

  // Calculate KPIs
  const kpis = useMemo(() => {
    const orders = salesReport?.orders || [];
    
    // Revenue KPI
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);
    const previousRevenue = 0; // Calculate from previous period if needed
    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Orders KPI
    const totalOrders = orders.length;
    const previousOrders = 0;
    const ordersGrowth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;

    // Customers KPI
    const uniqueCustomers = new Set(orders.map((o: any) => o.customerId || o.customer?.id).filter(Boolean));
    const totalCustomers = uniqueCustomers.size;
    const previousCustomers = 0;
    const customersGrowth = previousCustomers > 0 ? ((totalCustomers - previousCustomers) / previousCustomers) * 100 : 0;

    // Average Order Value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const previousAOV = 0;
    const aovGrowth = previousAOV > 0 ? ((avgOrderValue - previousAOV) / previousAOV) * 100 : 0;

    // Conversion Rate (would need visitor data)
    const conversionRate = 0;
    const conversionGrowth = 0;

    // Profit (would need cost data)
    const totalProfit = totalRevenue * 0.3; // Assuming 30% margin
    const previousProfit = 0;
    const profitGrowth = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0;

    // Customer Lifetime Value (simplified)
    const clv = avgOrderValue * 2.5; // Simplified calculation
    const clvGrowth = 0;

    return {
      revenue: {
        value: totalRevenue,
        growth: revenueGrowth,
        label: 'Total Revenue',
        format: 'currency',
      },
      orders: {
        value: totalOrders,
        growth: ordersGrowth,
        label: 'Total Orders',
        format: 'number',
      },
      customers: {
        value: totalCustomers,
        growth: customersGrowth,
        label: 'Total Customers',
        format: 'number',
      },
      aov: {
        value: avgOrderValue,
        growth: aovGrowth,
        label: 'Average Order Value',
        format: 'currency',
      },
      conversion: {
        value: conversionRate,
        growth: conversionGrowth,
        label: 'Conversion Rate',
        format: 'percentage',
      },
      profit: {
        value: totalProfit,
        growth: profitGrowth,
        label: 'Net Profit',
        format: 'currency',
      },
      clv: {
        value: clv,
        growth: clvGrowth,
        label: 'Customer Lifetime Value',
        format: 'currency',
      },
    };
  }, [salesReport, ordersData]);

  // Calculate monthly trends
  const monthlyTrends = useMemo(() => {
    const orders = salesReport?.orders || [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyData: Record<string, { revenue: number; orders: number; customers: Set<number> }> = {};

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      monthlyData[key] = { revenue: 0, orders: 0, customers: new Set() };
    }

    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const key = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
      if (monthlyData[key]) {
        monthlyData[key].revenue += Number(order.totalAmount || 0);
        monthlyData[key].orders += 1;
        const customerId = order.customerId || order.customer?.id;
        if (customerId) monthlyData[key].customers.add(customerId);
      }
    });

    const sortedKeys = Object.keys(monthlyData).sort();
    return {
      categories: sortedKeys.map(key => {
        const [, month] = key.split('-');
        return monthNames[parseInt(month)];
      }),
      revenue: sortedKeys.map(key => monthlyData[key].revenue),
      orders: sortedKeys.map(key => monthlyData[key].orders),
      customers: sortedKeys.map(key => monthlyData[key].customers.size),
    };
  }, [salesReport]);

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const formatValueForExport = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return value.toFixed(2);
      case 'percentage':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  };

  const handleExportReport = () => {
    try {
      // Get date range label
      const dateRangeLabel = 
        dateRange === '7d' ? 'Last 7 Days' :
        dateRange === '30d' ? 'Last 30 Days' :
        dateRange === '90d' ? 'Last 90 Days' :
        dateRange === '1y' ? 'Last Year' :
        'All Time';

      // Build CSV content
      const csvRows: string[] = [];
      
      // Header section
      csvRows.push('KPI Reports Export');
      csvRows.push(`Date Range: ${dateRangeLabel}`);
      csvRows.push(`Export Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
      csvRows.push(`Period: ${startDate} to ${endDate}`);
      csvRows.push(''); // Empty row
      
      // KPI Summary section
      csvRows.push('KPI Summary');
      csvRows.push(['KPI', 'Current Value', 'Growth (%)', 'Status'].join(','));
      
      Object.entries(kpis).forEach(([, kpi]) => {
        const status = kpi.growth > 0 ? 'Positive' : kpi.growth < 0 ? 'Negative' : 'Stable';
        const growthValue = kpi.growth !== 0 ? kpi.growth.toFixed(2) : '-';
        csvRows.push([
          kpi.label,
          formatValueForExport(kpi.value, kpi.format),
          growthValue,
          status,
        ].join(','));
      });
      
      csvRows.push(''); // Empty row
      
      // Monthly Trends section
      if (selectedKPIs.length > 0 && monthlyTrends.categories.length > 0) {
        csvRows.push('Monthly Trends');
        const headerRow = ['Month', ...selectedKPIs.map(kpi => kpis[kpi as keyof typeof kpis]?.label || kpi)].join(',');
        csvRows.push(headerRow);
        
        monthlyTrends.categories.forEach((month, index) => {
          const rowData = [month];
          selectedKPIs.forEach(kpi => {
            let value = 0;
            if (kpi === 'revenue') {
              value = monthlyTrends.revenue[index] || 0;
            } else if (kpi === 'orders') {
              value = monthlyTrends.orders[index] || 0;
            } else if (kpi === 'customers') {
              value = monthlyTrends.customers[index] || 0;
            } else {
              // For other KPIs, use revenue as default or calculate if needed
              value = monthlyTrends.revenue[index] || 0;
            }
            rowData.push(formatValueForExport(value, kpis[kpi as keyof typeof kpis]?.format || 'number'));
          });
          csvRows.push(rowData.join(','));
        });
      }
      
      // Create and download CSV
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `kpi-report-${dateRangeLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('KPI report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  // Chart configuration
  const kpiChartConfig = {
    series: selectedKPIs.map(kpi => ({
      name: kpis[kpi as keyof typeof kpis]?.label || kpi,
      data: monthlyTrends[kpi === 'revenue' ? 'revenue' : kpi === 'orders' ? 'orders' : 'customers'] || [],
    })),
    chart: {
      height: 400,
      type: 'line' as const,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#5955D1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
    stroke: {
      width: [2, 2, 2, 2],
      curve: 'smooth' as const,
    },
    markers: {
      size: 4,
      hover: { size: 6 },
    },
    xaxis: {
      categories: monthlyTrends.categories,
      labels: {
        style: {
          colors: isDarkMode ? '#ffffff' : '#1C274C',
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#ffffff' : '#1C274C',
          fontSize: '12px',
        },
        formatter: (val: number) => {
          if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
          return `$${val.toFixed(0)}`;
        },
      },
    },
    grid: {
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    legend: {
      show: true,
      position: 'bottom' as const,
      horizontalAlign: 'center' as const,
      labels: {
        colors: isDarkMode ? '#ffffff' : '#1C274C',
      },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  const availableKPIs = Object.keys(kpis);

  return (
    <div>
      <Breadcrumb currentPage="KPI Reports" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">KPI Reports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Track and analyze key performance indicators</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={dateRangeRef}>
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="flex items-center justify-between gap-2 px-4 py-2.5 min-w-[160px] border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <span className="text-sm font-medium">
                  {dateRange === '7d' ? 'Last 7 Days' :
                   dateRange === '30d' ? 'Last 30 Days' :
                   dateRange === '90d' ? 'Last 90 Days' :
                   dateRange === '1y' ? 'Last Year' :
                   'All Time'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDateRangeOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDateRangeOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setDateRange('7d');
                      setIsDateRangeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                      dateRange === '7d'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => {
                      setDateRange('30d');
                      setIsDateRangeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                      dateRange === '30d'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => {
                      setDateRange('90d');
                      setIsDateRangeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                      dateRange === '90d'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Last 90 Days
                  </button>
                  <button
                    onClick={() => {
                      setDateRange('1y');
                      setIsDateRangeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                      dateRange === '1y'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    Last Year
                  </button>
                  <button
                    onClick={() => {
                      setDateRange('all');
                      setIsDateRangeOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                      dateRange === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    All Time
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Select KPIs to Display</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableKPIs.map((kpi) => (
            <label key={kpi} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedKPIs.includes(kpi)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedKPIs([...selectedKPIs, kpi]);
                  } else {
                    setSelectedKPIs(selectedKPIs.filter(k => k !== kpi));
                  }
                }}
                className="w-4 h-4 text-primary-600 rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{kpis[kpi as keyof typeof kpis]?.label || kpi}</span>
            </label>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Object.entries(kpis).map(([key, kpi]) => (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">{kpi.label}</p>
              {kpi.growth !== 0 && (
                <div className={`flex items-center gap-1 ${kpi.growth > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {kpi.growth > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-xs font-medium">
                    {kpi.growth > 0 ? '+' : ''}{kpi.growth.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <h2 className="text-[24px] font-bold text-gray-900 dark:text-white">
              {formatValue(kpi.value, kpi.format)}
            </h2>
          </div>
        ))}
      </div>

      {/* KPI Trends Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">KPI Trends</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Last 12 Months</span>
          </div>
        </div>
        {selectedKPIs.length > 0 ? (
          <Chart type="line" height={400} series={kpiChartConfig.series} options={kpiChartConfig} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Select at least one KPI to display trends</p>
          </div>
        )}
      </div>

      {/* Detailed KPI Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">KPI Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">KPI</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Current Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Growth</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(kpis).map(([key, kpi]) => (
                <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {kpi.label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatValue(kpi.value, kpi.format)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {kpi.growth !== 0 ? (
                      <span className={`text-sm font-medium ${kpi.growth > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {kpi.growth > 0 ? '+' : ''}{kpi.growth.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {kpi.growth > 0 ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Positive
                      </span>
                    ) : kpi.growth < 0 ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        Negative
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Stable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
