import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Grid, Package, Layers, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import Chart from 'react-apexcharts';

export default function ProductCollectionDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const { data, isLoading } = useQuery({
    queryKey: ['product-collection-dashboard'],
    queryFn: async () => {
      try {
        const [productsResponse, collectionsResponse, ordersResponse] = await Promise.all([
          api.get('/products?skip=0&take=10000'),
          api.get('/collections?skip=0&take=1000'),
          api.get('/orders?skip=0&take=10000'),
        ]);
        return {
          products: productsResponse.data?.data || [],
          collections: Array.isArray(collectionsResponse.data) ? collectionsResponse.data : (collectionsResponse.data?.data || []),
          orders: ordersResponse.data?.data || [],
        };
      } catch (error) {
        return { products: [], collections: [], orders: [] };
      }
    },
  });

  const products = data?.products || [];
  const collections = data?.collections || [];
  const orders = data?.orders || [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalCollections = collections.length;
    
    // Count unique styles
    const uniqueStyles = new Set(products.map((p: any) => p.style).filter(Boolean));
    const totalStyles = uniqueStyles.size;
    
    // Calculate products per collection
    const productsPerCollection = totalCollections > 0 ? (totalProducts / totalCollections).toFixed(1) : '0';
    
    // Calculate products with inventory
    const productsWithInventory = products.filter((p: any) => 
      p.inventory && p.inventory.length > 0 && p.inventory.some((inv: any) => inv.quantity > 0)
    ).length;
    
    // Calculate products without inventory
    const productsWithoutInventory = totalProducts - productsWithInventory;
    
    // Calculate collection performance (products sold per collection)
    const collectionPerformance = collections.map((collection: any) => {
      const collectionProducts = products.filter((p: any) => p.collectionId === collection.id);
      const collectionOrders = orders.filter((order: any) => 
        order.orderLines?.some((line: any) => 
          collectionProducts.some((p: any) => p.id === line.productId)
        )
      );
      const totalSold = collectionOrders.reduce((sum: number, order: any) => {
        return sum + (order.orderLines?.reduce((lineSum: number, line: any) => {
          if (collectionProducts.some((p: any) => p.id === line.productId)) {
            return lineSum + (line.quantity || 0);
          }
          return lineSum;
        }, 0) || 0);
      }, 0);
      
      return {
        id: collection.id,
        name: collection.name,
        productCount: collectionProducts.length,
        totalSold,
        revenue: collectionOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0),
      };
    }).sort((a, b) => b.totalSold - a.totalSold);
    
    // Calculate style performance
    const stylePerformance = Array.from(uniqueStyles).map((style: string) => {
      const styleProducts = products.filter((p: any) => p.style === style);
      const styleOrders = orders.filter((order: any) =>
        order.orderLines?.some((line: any) =>
          styleProducts.some((p: any) => p.id === line.productId)
        )
      );
      const totalSold = styleOrders.reduce((sum: number, order: any) => {
        return sum + (order.orderLines?.reduce((lineSum: number, line: any) => {
          if (styleProducts.some((p: any) => p.id === line.productId)) {
            return lineSum + (line.quantity || 0);
          }
          return lineSum;
        }, 0) || 0);
      }, 0);
      
      return {
        style,
        productCount: styleProducts.length,
        totalSold,
        revenue: styleOrders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0),
      };
    }).sort((a, b) => b.totalSold - a.totalSold);
    
    // Calculate products by collection for chart
    const productsByCollection = collections.map((collection: any) => {
      const collectionProducts = products.filter((p: any) => p.collectionId === collection.id);
      return {
        name: collection.name,
        count: collectionProducts.length,
      };
    }).sort((a, b) => b.count - a.count).slice(0, 8);
    
    // Calculate monthly product creation trend
    const monthlyProductTrend = (() => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const monthlyData: Record<string, number> = {};
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
        monthlyData[key] = 0;
      }
      
      products.forEach((product: any) => {
        const productDate = new Date(product.createdAt);
        const key = `${productDate.getFullYear()}-${productDate.getMonth()}`;
        if (monthlyData[key] !== undefined) {
          monthlyData[key]++;
        }
      });
      
      const sortedKeys = Object.keys(monthlyData).sort();
      return {
        data: sortedKeys.map(key => monthlyData[key]),
        categories: sortedKeys.map(key => {
          const [, month] = key.split('-');
          return monthNames[parseInt(month)];
        }),
      };
    })();
    
    return {
      totalProducts,
      totalCollections,
      totalStyles,
      productsPerCollection,
      productsWithInventory,
      productsWithoutInventory,
      collectionPerformance: collectionPerformance.slice(0, 5),
      stylePerformance: stylePerformance.slice(0, 5),
      productsByCollection,
      monthlyProductTrend,
    };
  }, [products, collections, orders]);

  if (isLoading) {
    return <SkeletonPage />;
  }

  // Chart configurations
  const productsByCollectionChartConfig = {
    series: [{
      name: 'Products',
      data: metrics.productsByCollection.map(item => item.count),
    }],
    chart: {
      height: 300,
      type: 'bar' as const,
      toolbar: { show: false },
    },
    colors: ['#5955D1'],
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4,
      },
    },
    xaxis: {
      categories: metrics.productsByCollection.map(item => item.name),
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
      },
    },
    grid: {
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
  };

  const monthlyProductTrendChartConfig = {
    series: [{
      name: 'Products Created',
      data: metrics.monthlyProductTrend.data,
    }],
    chart: {
      height: 300,
      type: 'area' as const,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#5955D1'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        gradientToColors: ['#8b5cf6'],
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      width: 2,
      curve: 'smooth' as const,
    },
    xaxis: {
      categories: metrics.monthlyProductTrend.categories,
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
      },
    },
    grid: {
      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      strokeDashArray: 5,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
    },
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

  return (
    <div>
      <Breadcrumb currentPage="Product Dashboard" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Style performance, drop performance, DPP/compliance overview</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Products</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.totalProducts.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Collections</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.totalCollections.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Grid className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Unique Styles</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.totalStyles.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Products/Collection</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.productsPerCollection}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Products by Collection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Products by Collection</h6>
          <Chart type="bar" height={300} series={productsByCollectionChartConfig.series} options={productsByCollectionChartConfig} />
        </div>

        {/* Monthly Product Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Creation Trend (Last 12 Months)</h6>
          <Chart type="area" height={300} series={monthlyProductTrendChartConfig.series} options={monthlyProductTrendChartConfig} />
        </div>
      </div>

      {/* Performance Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Collection Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Top Performing Collections</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Collection</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Sold</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.collectionPerformance.length > 0 ? (
                  metrics.collectionPerformance.map((collection: any) => (
                    <tr key={collection.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {collection.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {collection.productCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {collection.totalSold.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(collection.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No collection performance data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Style Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Top Performing Styles</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Style</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Sold</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.stylePerformance.length > 0 ? (
                  metrics.stylePerformance.map((style: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {style.style}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {style.productCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {style.totalSold.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(style.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No style performance data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inventory Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Inventory Status</h6>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Products with Inventory</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.productsWithInventory.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Products without Inventory</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.productsWithoutInventory.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
