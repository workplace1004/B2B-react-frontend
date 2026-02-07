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

  const products = productsData || [];
  const collections = collectionsData || [];

  // Generate forecast data (simulated AI predictions)
  const forecastData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() + i);
      months.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        forecast: Math.floor(Math.random() * 1000) + 500,
        actual: i === 0 ? Math.floor(Math.random() * 1000) + 500 : null,
        confidence: 0.75 + Math.random() * 0.2,
      });
    }
    
    return months;
  }, [forecastType, selectedItem, timeRange]);

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
      categories: forecastData.map((d) => d.month),
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
      data: forecastData.map((d) => d.forecast),
    },
    {
      name: 'Actual',
      data: forecastData.map((d) => d.actual || 0),
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
              {forecastData.map((row, index) => {
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

  // Simulated forecast data
  const forecastData = useMemo(() => {
    const items = forecastDimension === 'Channel' 
      ? ['B2B', 'Retail', 'Wholesale', 'Online']
      : forecastDimension === 'Warehouse'
      ? ['Warehouse A', 'Warehouse B', 'Warehouse C']
      : ['North America', 'Europe', 'Asia', 'South America'];
    
    return items.map((item) => ({
      name: item,
      forecast: Math.floor(Math.random() * 5000) + 2000,
      confidence: 0.7 + Math.random() * 0.25,
    }));
  }, [forecastDimension]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'bar' as const,
      height: 400,
      toolbar: { show: false },
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: forecastData.map((d) => d.name),
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
      data: forecastData.map((d) => d.forecast),
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
              {forecastData.map((row, index) => (
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

  // Simulated seasonality data
  const seasonalityData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      month,
      sales: Math.floor(Math.sin((index / 12) * Math.PI * 2) * 500 + 1000),
      seasonality: Math.sin((index / 12) * Math.PI * 2) > 0.3 ? 'High' : Math.sin((index / 12) * Math.PI * 2) < -0.3 ? 'Low' : 'Normal',
    }));
  }, []);

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

  // Simulated anomaly data
  const anomalies = useMemo(() => {
    const data = [
      { id: 1, date: '2024-01-15', type: 'spike', product: 'Product A', value: 1500, expected: 800, variance: 87.5 },
      { id: 2, date: '2024-02-20', type: 'drop', product: 'Product B', value: 200, expected: 600, variance: -66.7 },
      { id: 3, date: '2024-03-10', type: 'spike', product: 'Product C', value: 2200, expected: 1200, variance: 83.3 },
      { id: 4, date: '2024-04-05', type: 'drop', product: 'Product D', value: 150, expected: 500, variance: -70.0 },
    ];
    
    return anomalyType === 'all' 
      ? data 
      : data.filter((a) => a.type === anomalyType);
  }, [anomalyType]);

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

  // Simulated accuracy data
  const accuracyData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - i);
      months.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        accuracy: 0.75 + Math.random() * 0.2,
        mape: 10 + Math.random() * 15, // Mean Absolute Percentage Error
        rmse: 50 + Math.random() * 100, // Root Mean Square Error
      });
    }
    return months;
  }, []);

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
