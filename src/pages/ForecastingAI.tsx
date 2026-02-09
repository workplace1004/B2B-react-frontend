import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Brain, 
  Package, 
  Store, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Download,
  RefreshCw,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import {
  PageHeader,
  TabsNavigation,
  CustomDropdown,
  SummaryCard,
} from '../components/ui';
import Chart from 'react-apexcharts';

type TabType = 'sku-style-collection' | 'channel-warehouse-region' | 'seasonality' | 'anomaly' | 'accuracy';

export default function ForecastingAI() {
  const [activeTab, setActiveTab] = useState<TabType>('sku-style-collection');

  const tabs = [
    { id: 'sku-style-collection' as TabType, label: 'Forecast by SKU/Style/Collection', icon: Package },
    { id: 'channel-warehouse-region' as TabType, label: 'Forecast by Channel/Warehouse/Region', icon: Store },
    { id: 'seasonality' as TabType, label: 'Seasonality Detection', icon: Calendar },
    { id: 'anomaly' as TabType, label: 'Anomaly Detection', icon: AlertTriangle },
    { id: 'accuracy' as TabType, label: 'Forecast Accuracy & Learning', icon: TrendingUp },
  ];

  return (
    <div>
      <PageHeader
        title="Forecasting (AI)"
        description="AI-powered demand forecasting and analytics"
        breadcrumbPage="Forecasting (AI)"
      />

      <TabsNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      {/* Tab Content */}
      <div>
        {activeTab === 'sku-style-collection' && <ForecastBySKUStyleCollectionSection />}
        {activeTab === 'channel-warehouse-region' && <ForecastByChannelWarehouseRegionSection />}
        {activeTab === 'seasonality' && <SeasonalityDetectionSection />}
        {activeTab === 'anomaly' && <AnomalyDetectionSection />}
        {activeTab === 'accuracy' && <ForecastAccuracySection />}
      </div>
    </div>
  );
}

// Forecast by SKU/Style/Collection Section
function ForecastBySKUStyleCollectionSection() {
  const [forecastType, setForecastType] = useState<'SKU' | 'Style' | 'Collection'>('SKU');
  const [selectedItem, setSelectedItem] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('3m');
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

  // Reset selected item when forecast type changes
  useEffect(() => {
    setSelectedItem('all');
  }, [forecastType]);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'forecast'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  useQuery({
    queryKey: ['orders', 'forecast'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: collectionsData } = useQuery({
    queryKey: ['collections', 'forecast'],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch forecast data from API
  const { data: forecastDataFromAPI } = useQuery({
    queryKey: ['forecast', 'sku-style-collection', forecastType, selectedItem],
    queryFn: async () => {
      try {
        const productId = selectedItem !== 'all' ? parseInt(selectedItem) : undefined;
        const response = await api.get('/forecast', {
          params: productId ? { productId } : {},
        });
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for actual sales data
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'forecast-actual'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  const collections = collectionsData || [];
  const orders = ordersData || [];
  const forecasts = forecastDataFromAPI || [];

  // Calculate forecast data from real database
  const forecastData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // Get forecasts for the selected item
    let relevantForecasts = forecasts;
    if (selectedItem !== 'all') {
      if (forecastType === 'SKU') {
        relevantForecasts = forecasts.filter((f: any) => f.productId === parseInt(selectedItem));
      } else if (forecastType === 'Collection') {
        const collection = collections.find((c: any) => c.id === parseInt(selectedItem));
        if (collection) {
          const collectionProducts = products.filter((p: any) => p.collectionId === collection.id);
          relevantForecasts = forecasts.filter((f: any) => 
            collectionProducts.some((p: any) => p.id === f.productId)
          );
        }
      } else if (forecastType === 'Style') {
        const styleProducts = products.filter((p: any) => p.style === selectedItem);
        relevantForecasts = forecasts.filter((f: any) => 
          styleProducts.some((p: any) => p.id === f.productId)
        );
      }
    }

    // Group forecasts by period
    const forecastByPeriod: Record<string, { forecast: number; confidence: number; count: number }> = {};
    relevantForecasts.forEach((forecast: any) => {
      const period = forecast.period;
      if (!forecastByPeriod[period]) {
        forecastByPeriod[period] = { forecast: 0, confidence: 0, count: 0 };
      }
      forecastByPeriod[period].forecast += forecast.predictedDemand || 0;
      forecastByPeriod[period].confidence += parseFloat(forecast.confidence || 0.75);
      forecastByPeriod[period].count += 1;
    });

    // Calculate actual sales from orders
    const actualByPeriod: Record<string, number> = {};
    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const period = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!actualByPeriod[period]) {
        actualByPeriod[period] = 0;
      }

      order.orderLines?.forEach((line: any) => {
        if (selectedItem === 'all' || 
            (forecastType === 'SKU' && line.productId === parseInt(selectedItem)) ||
            (forecastType === 'Collection' && products.find((p: any) => p.id === line.productId)?.collectionId === parseInt(selectedItem)) ||
            (forecastType === 'Style' && products.find((p: any) => p.id === line.productId)?.style === selectedItem)) {
          actualByPeriod[period] += line.quantity || 0;
        }
      });
    });

    // Generate months for the next 6 months
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() + i);
      const period = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const periodKey = period;
      
      const forecastInfo = forecastByPeriod[periodKey];
      const forecast = forecastInfo ? forecastInfo.forecast : 0;
      const confidence = forecastInfo && forecastInfo.count > 0 
        ? forecastInfo.confidence / forecastInfo.count 
        : 0.75;
      const actual = actualByPeriod[periodKey] || (i === 0 ? actualByPeriod[period] : null);

      months.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        forecast,
        actual,
        confidence: Math.min(Math.max(confidence, 0), 1),
      });
    }
    
    return months;
  }, [forecasts, orders, products, collections, forecastType, selectedItem, timeRange]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'line' as const,
      height: 400,
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
    },
    xaxis: {
      categories: forecastData.map((d: any) => d.month),
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
  }), [forecastData, isDarkMode]);

  const chartSeries = [
    {
      name: 'Forecast',
      data: forecastData.map((d: any) => d.forecast),
    },
    {
      name: 'Actual',
      data: forecastData.map((d: any) => d.actual || 0),
    },
  ];

  if (productsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Forecast Type</label>
            <CustomDropdown
              value={forecastType}
              onChange={(value) => setForecastType(value as 'SKU' | 'Style' | 'Collection')}
              options={[
                { value: 'SKU', label: 'By SKU' },
                { value: 'Style', label: 'By Style' },
                { value: 'Collection', label: 'By Collection' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {forecastType === 'SKU' ? 'Select SKU' : forecastType === 'Style' ? 'Select Style' : 'Select Collection'}
            </label>
            <CustomDropdown
              value={selectedItem}
              onChange={setSelectedItem}
              options={[
                { value: 'all', label: `All ${forecastType}s` },
                ...(forecastType === 'SKU' 
                  ? products.slice(0, 20).map((p: any) => ({ value: p.id.toString(), label: `${p.sku} - ${p.name}` }))
                  : forecastType === 'Style'
                  ? (Array.from(new Set(products.map((p: any) => p.style).filter(Boolean))) as string[]).slice(0, 20).map((style: string) => ({ value: style, label: style }))
                  : collections.slice(0, 20).map((c: any) => ({ value: c.id.toString(), label: c.name }))
                ),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Range</label>
            <CustomDropdown
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { value: '1m', label: '1 Month' },
                { value: '3m', label: '3 Months' },
                { value: '6m', label: '6 Months' },
                { value: '1y', label: '1 Year' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Demand Forecast - {forecastType === 'SKU' ? 'SKU' : forecastType === 'Style' ? 'Style' : 'Collection'}
          </h3>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Download className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <Chart options={chartOptions} series={chartSeries} type="line" height={400} />
      </div>

      {/* Forecast Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Forecast Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Forecast</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {forecastData.map((row: any, index: number) => {
                const variance = row.actual ? ((row.actual - row.forecast) / row.forecast) * 100 : null;
                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {row.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {row.forecast}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {row.actual || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {variance !== null ? (
                        <span className={`text-sm font-medium ${
                          Math.abs(variance) < 10 ? 'text-green-600 dark:text-green-400' :
                          Math.abs(variance) < 20 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${row.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {(row.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Forecast by Channel/Warehouse/Region Section
function ForecastByChannelWarehouseRegionSection() {
  const [forecastDimension, setForecastDimension] = useState<'Channel' | 'Warehouse' | 'Region'>('Channel');
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

  // Fetch forecast data from API
  const { data: forecastDataFromAPI } = useQuery({
    queryKey: ['forecast', 'channel-warehouse-region', forecastDimension],
    queryFn: async () => {
      try {
        const response = await api.get('/forecast');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for actual sales
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'forecast-channel'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', 'forecast'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const forecasts = forecastDataFromAPI || [];
  const orders = ordersData || [];
  const warehouses = warehousesData || [];

  // Calculate forecast data from real database
  const forecastData = useMemo(() => {
    if (forecastDimension === 'Channel') {
      // Group forecasts by order channel/type
      const channelForecasts: Record<string, { forecast: number; confidence: number; count: number }> = {};
      
      orders.forEach((order: any) => {
        const channel = order.type || 'B2B';
        if (!channelForecasts[channel]) {
          channelForecasts[channel] = { forecast: 0, confidence: 0, count: 0 };
        }
        // Calculate demand from order lines
        order.orderLines?.forEach((line: any) => {
          const forecast = forecasts.find((f: any) => f.productId === line.productId);
          if (forecast) {
            channelForecasts[channel].forecast += forecast.predictedDemand || 0;
            channelForecasts[channel].confidence += parseFloat(forecast.confidence || 0.75);
            channelForecasts[channel].count += 1;
          }
        });
      });

      return Object.keys(channelForecasts).map((channel) => ({
        name: channel,
        forecast: channelForecasts[channel].forecast,
        confidence: channelForecasts[channel].count > 0 
          ? channelForecasts[channel].confidence / channelForecasts[channel].count 
          : 0.75,
      }));
    } else if (forecastDimension === 'Warehouse') {
      // Group forecasts by warehouse
      return warehouses.map((warehouse: any) => {
        // Get inventory for this warehouse and calculate forecast
        const warehouseForecasts = forecasts.filter((_f: any) => {
          // Match by warehouse through inventory (would need inventory data)
          return true; // Simplified - in real app, would filter by warehouse
        });
        
        const totalForecast = warehouseForecasts.reduce((sum: number, f: any) => 
          sum + (f.predictedDemand || 0), 0
        );
        const avgConfidence = warehouseForecasts.length > 0
          ? warehouseForecasts.reduce((sum: number, f: any) => 
              sum + parseFloat(f.confidence || 0.75), 0) / warehouseForecasts.length
          : 0.75;

        return {
          name: warehouse.name,
          forecast: totalForecast,
          confidence: Math.min(Math.max(avgConfidence, 0), 1),
        };
      });
    } else {
      // Region - would need customer/warehouse location data
      // For now, return empty or use warehouse regions
      return warehouses.map((warehouse: any) => ({
        name: warehouse.country || warehouse.city || 'Unknown',
        forecast: 0,
        confidence: 0.75,
    }));
    }
  }, [forecastDimension, forecasts, orders, warehouses]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'bar' as const,
      height: 400,
      toolbar: { show: false },
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: forecastData.map((d: any) => d.name),
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
      },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
    colors: ['#3B82F6'],
    plotOptions: {
      bar: {
        borderRadius: 4,
      },
    },
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  }), [forecastData, isDarkMode]);

  const chartSeries = [
    {
      name: 'Forecasted Demand',
      data: forecastData.map((d: any) => d.forecast),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Forecast Dimension:</label>
          <CustomDropdown
            value={forecastDimension}
            onChange={(value) => setForecastDimension(value as 'Channel' | 'Warehouse' | 'Region')}
            options={[
              { value: 'Channel', label: 'By Channel' },
              { value: 'Warehouse', label: 'By Warehouse' },
              { value: 'Region', label: 'By Region' },
            ]}
            className="min-w-[200px]"
          />
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Forecast by {forecastDimension}
        </h3>
        <Chart options={chartOptions} series={chartSeries} type="bar" height={400} />
      </div>

      {/* Forecast Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Forecast Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">{forecastDimension}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Forecasted Demand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Confidence</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {forecastData.map((row: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {row.forecast}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${row.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {(row.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
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

// Seasonality Detection Section
function SeasonalityDetectionSection() {
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

  // Fetch orders for seasonality analysis
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'seasonality'],
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

  // Calculate seasonality from real order data
  const seasonalityData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Calculate sales by month from orders
    const salesByMonth: Record<number, number> = {};
    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const month = orderDate.getMonth(); // 0-11
      
      if (!salesByMonth[month]) {
        salesByMonth[month] = 0;
      }
      
      order.orderLines?.forEach((line: any) => {
        salesByMonth[month] += line.quantity || 0;
      });
    });

    // Calculate average sales
    const totalSales = Object.values(salesByMonth).reduce((sum, val) => sum + val, 0);
    const avgSales = totalSales / 12;

    return months.map((month, index) => {
      const sales = salesByMonth[index] || 0;
      const deviation = avgSales > 0 ? ((sales - avgSales) / avgSales) * 100 : 0;
      
      let seasonality: 'High' | 'Normal' | 'Low' = 'Normal';
      if (deviation > 20) {
        seasonality = 'High';
      } else if (deviation < -20) {
        seasonality = 'Low';
      }

      return {
      month,
        sales,
        seasonality,
      };
    });
  }, [orders]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'line' as const,
      height: 400,
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
    },
    xaxis: {
      categories: seasonalityData.map((d) => d.month),
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
      },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
    colors: ['#10B981'],
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  }), [seasonalityData, isDarkMode]);

  const chartSeries = [
    {
      name: 'Sales Pattern',
      data: seasonalityData.map((d) => d.sales),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Seasonality Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Seasonal Sales Pattern</h3>
        <Chart options={chartOptions} series={chartSeries} type="line" height={400} />
      </div>

      {/* Seasonality Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seasonality Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Average Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Seasonality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Pattern</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {seasonalityData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {row.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {row.sales}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      row.seasonality === 'High'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : row.seasonality === 'Low'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {row.seasonality}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.seasonality === 'High' ? (
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : row.seasonality === 'Low' ? (
                      <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <BarChart3 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
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

// Anomaly Detection Section
function AnomalyDetectionSection() {
  const [anomalyType, setAnomalyType] = useState<'all' | 'spikes' | 'drops'>('all');

  // Fetch orders and forecasts for anomaly detection
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'anomaly'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: forecastData } = useQuery({
    queryKey: ['forecast', 'anomaly'],
    queryFn: async () => {
      try {
        const response = await api.get('/forecast');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'anomaly'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];
  const forecasts = forecastData || [];
  const products = productsData || [];

  // Calculate anomalies from real data
  const anomalies = useMemo(() => {
    const anomaliesList: any[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group orders by product and date
    const salesByProductDate: Record<number, Record<string, number>> = {};
    
    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      if (orderDate < thirtyDaysAgo) return;

      const dateKey = orderDate.toISOString().split('T')[0];
      
      order.orderLines?.forEach((line: any) => {
        if (!salesByProductDate[line.productId]) {
          salesByProductDate[line.productId] = {};
        }
        if (!salesByProductDate[line.productId][dateKey]) {
          salesByProductDate[line.productId][dateKey] = 0;
        }
        salesByProductDate[line.productId][dateKey] += line.quantity || 0;
      });
    });

    // Detect anomalies by comparing actual sales with forecasts
    Object.keys(salesByProductDate).forEach((productIdStr) => {
      const productId = parseInt(productIdStr);
      const product = products.find((p: any) => p.id === productId);
      if (!product) return;

      const productForecast = forecasts.find((f: any) => f.productId === productId);
      const expectedDaily = productForecast 
        ? (productForecast.predictedDemand || 0) / 30 
        : 0;

      Object.keys(salesByProductDate[productId]).forEach((dateKey) => {
        const actual = salesByProductDate[productId][dateKey];
        const expected = expectedDaily;
        
        if (expected > 0) {
          const variance = ((actual - expected) / expected) * 100;
          
          // Detect spike (>50% above expected) or drop (>50% below expected)
          if (variance > 50) {
            anomaliesList.push({
              id: `spike-${productId}-${dateKey}`,
              date: dateKey,
              type: 'spike',
              product: product.name,
              value: actual,
              expected: Math.round(expected),
              variance: variance,
            });
          } else if (variance < -50 && actual > 0) {
            anomaliesList.push({
              id: `drop-${productId}-${dateKey}`,
              date: dateKey,
              type: 'drop',
              product: product.name,
              value: actual,
              expected: Math.round(expected),
              variance: variance,
            });
          }
        }
      });
    });
    
    return anomalyType === 'all' 
      ? anomaliesList 
      : anomaliesList.filter((a) => a.type === anomalyType);
  }, [anomalyType, orders, forecasts, products]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Anomaly Type:</label>
          <CustomDropdown
            value={anomalyType}
            onChange={(value) => setAnomalyType(value as 'all' | 'spikes' | 'drops')}
            options={[
              { value: 'all', label: 'All Anomalies' },
              { value: 'spikes', label: 'Spikes Only' },
              { value: 'drops', label: 'Drops Only' },
            ]}
            className="min-w-[180px]"
          />
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detected Anomalies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actual Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Expected Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Variance</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {anomalies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No anomalies detected
                  </td>
                </tr>
              ) : (
                anomalies.map((anomaly) => (
                  <tr key={anomaly.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(anomaly.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${
                        anomaly.type === 'spike'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {anomaly.type === 'spike' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {anomaly.type === 'spike' ? 'Spike' : 'Drop'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {anomaly.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {anomaly.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {anomaly.expected}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        Math.abs(anomaly.variance) > 50
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {anomaly.variance > 0 ? '+' : ''}{anomaly.variance.toFixed(1)}%
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

// Forecast Accuracy & Learning Section
function ForecastAccuracySection() {
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

  // Fetch forecasts and orders for accuracy calculation
  const { data: forecastData } = useQuery({
    queryKey: ['forecast', 'accuracy'],
    queryFn: async () => {
      try {
        const response = await api.get('/forecast');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'accuracy'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const forecasts = forecastData || [];
  const orders = ordersData || [];

  // Calculate accuracy from real forecast vs actual data
  const accuracyData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // Group forecasts and actuals by period
    const forecastByPeriod: Record<string, { forecast: number; actual: number; count: number }> = {};
    
    // Process forecasts
    forecasts.forEach((forecast: any) => {
      const period = forecast.period;
      if (!forecastByPeriod[period]) {
        forecastByPeriod[period] = { forecast: 0, actual: 0, count: 0 };
      }
      forecastByPeriod[period].forecast += forecast.predictedDemand || 0;
      forecastByPeriod[period].count += 1;
    });

    // Process actual sales from orders
    orders.forEach((order: any) => {
      const orderDate = new Date(order.orderDate || order.createdAt);
      const period = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!forecastByPeriod[period]) {
        forecastByPeriod[period] = { forecast: 0, actual: 0, count: 0 };
      }
      
      order.orderLines?.forEach((line: any) => {
        const forecast = forecasts.find((f: any) => f.productId === line.productId);
        if (forecast) {
          forecastByPeriod[period].actual += line.quantity || 0;
        }
      });
    });

    // Calculate accuracy metrics for last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      const period = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      
      const data = forecastByPeriod[period] || { forecast: 0, actual: 0, count: 0 };
      
      // Calculate accuracy metrics
      let accuracy = 0.75; // Default
      let mape = 0; // Mean Absolute Percentage Error
      let rmse = 0; // Root Mean Square Error
      
      if (data.forecast > 0 && data.actual > 0) {
        const error = Math.abs(data.actual - data.forecast);
        accuracy = 1 - (error / Math.max(data.forecast, data.actual));
        mape = (error / data.forecast) * 100;
        rmse = Math.sqrt(Math.pow(error, 2));
      } else if (data.forecast === 0 && data.actual === 0) {
        accuracy = 1.0; // Perfect if both are zero
      }

      months.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        accuracy: Math.max(0, Math.min(1, accuracy)),
        mape: Math.max(0, mape),
        rmse: Math.max(0, rmse),
      });
    }
    
    return months;
  }, [forecasts, orders]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'line' as const,
      height: 400,
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
    },
    xaxis: {
      categories: accuracyData.map((d) => d.month),
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
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
    colors: ['#3B82F6'],
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  }), [accuracyData, isDarkMode]);

  const chartSeries = [
    {
      name: 'Forecast Accuracy',
      data: accuracyData.map((d) => d.accuracy),
    },
  ];

  const avgAccuracy = accuracyData.reduce((sum, d) => sum + d.accuracy, 0) / accuracyData.length;
  const avgMAPE = accuracyData.reduce((sum, d) => sum + d.mape, 0) / accuracyData.length;
  const avgRMSE = accuracyData.reduce((sum, d) => sum + d.rmse, 0) / accuracyData.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          label="Average Accuracy"
          value={`${(avgAccuracy * 100).toFixed(1)}%`}
          icon={TrendingUp}
        />
        <SummaryCard
          label="Mean Absolute % Error"
          value={`${avgMAPE.toFixed(1)}%`}
          icon={BarChart3}
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
          iconColor="text-yellow-600 dark:text-yellow-400"
        />
        <SummaryCard
          label="Root Mean Square Error"
          value={avgRMSE.toFixed(0)}
          icon={Brain}
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Accuracy Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Forecast Accuracy Trend</h3>
        <Chart options={chartOptions} series={chartSeries} type="line" height={400} />
      </div>

      {/* Accuracy Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accuracy Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">MAPE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">RMSE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {accuracyData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {row.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            row.accuracy > 0.85 ? 'bg-green-600' :
                            row.accuracy > 0.75 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${row.accuracy * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {(row.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {row.mape.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {row.rmse.toFixed(0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      row.accuracy > 0.85
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : row.accuracy > 0.75
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {row.accuracy > 0.85 ? 'Excellent' : row.accuracy > 0.75 ? 'Good' : 'Needs Improvement'}
                    </span>
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
