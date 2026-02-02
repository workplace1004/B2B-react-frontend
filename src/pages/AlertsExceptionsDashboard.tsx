import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, TrendingUp, Package, Clock, RotateCcw } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import Chart from 'react-apexcharts';

export default function AlertsExceptionsDashboard() {
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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['alerts-exceptions-dashboard'],
    queryFn: async () => {
      try {
        const [inventoryResponse, ordersResponse, productsResponse, returnsResponse] = await Promise.all([
          api.get('/inventory'),
          api.get('/orders?skip=0&take=10000'),
          api.get('/products?skip=0&take=10000'),
          api.get('/returns?skip=0&take=1000').catch(() => ({ data: { data: [] } })),
        ]);
        return {
          inventory: inventoryResponse.data?.data || inventoryResponse.data || [],
          orders: ordersResponse.data?.data || ordersResponse.data || [],
          products: productsResponse.data?.data || productsResponse.data || [],
          returns: returnsResponse.data?.data || returnsResponse.data || [],
        };
      } catch (error) {
        return { inventory: [], orders: [], products: [], returns: [] };
      }
    },
  });

  const inventory = data?.inventory || [];
  const orders = data?.orders || [];
  const products = data?.products || [];
  const returns = data?.returns || [];

  // Calculate operational metrics
  const metrics = useMemo(() => {
    // Low Stock Alerts (quantity <= reorderPoint or <= 10)
    const lowStockItems = inventory.filter((inv: any) => {
      const quantity = Number(inv.quantity || 0);
      const reorderPoint = Number(inv.reorderPoint || 10);
      return quantity > 0 && quantity <= reorderPoint;
    });

    // Overstock Alerts (quantity > 3x average monthly sales or > 1000 units)
    const overstockItems = inventory.filter((inv: any) => {
      const quantity = Number(inv.quantity || 0);
      // Simplified: consider overstock if quantity > 1000 or if it's significantly higher than typical
      return quantity > 1000;
    });

    // Delayed Purchase Orders (orders pending for more than 7 days)
    const now = new Date();
    const delayedOrders = orders.filter((order: any) => {
      if (order.status !== 'PENDING') return false;
      const orderDate = new Date(order.orderDate || order.createdAt);
      const daysDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 7;
    });

    // Demand Spikes (products with sudden increase in order frequency)
    const demandSpikes = (() => {
      const productOrderCounts: Record<number, { count: number; recentCount: number; name: string }> = {};
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      orders.forEach((order: any) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        order.orderLines?.forEach((line: any) => {
          const productId = line.productId;
          if (!productOrderCounts[productId]) {
            const product = products.find((p: any) => p.id === productId);
            productOrderCounts[productId] = {
              count: 0,
              recentCount: 0,
              name: product?.name || 'Unknown Product',
            };
          }
          productOrderCounts[productId].count++;
          if (orderDate >= sevenDaysAgo) {
            productOrderCounts[productId].recentCount++;
          }
        });
      });

      // Find products where recent orders are 3x or more than average
      return Object.entries(productOrderCounts)
        .filter(([_, data]: [string, any]) => {
          const avgPerWeek = data.count / 4; // Rough estimate
          return data.recentCount >= avgPerWeek * 3 && data.recentCount >= 5;
        })
        .map(([productId, data]: [string, any]) => ({
          productId: parseInt(productId),
          name: data.name,
          recentOrders: data.recentCount,
          totalOrders: data.count,
        }))
        .slice(0, 10);
    })();

    // Stuck RMAs (returns pending for more than 14 days)
    const stuckRMAs = returns.filter((returnItem: any) => {
      if (returnItem.status === 'COMPLETED' || returnItem.status === 'CANCELLED') return false;
      const returnDate = new Date(returnItem.createdAt || returnItem.returnDate);
      const daysDiff = (now.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 14;
    });

    // Alert trends (last 30 days)
    const alertTrends = (() => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dailyAlerts: Record<string, number> = {};
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().split('T')[0];
        dailyAlerts[key] = 0;
      }

      // Count low stock alerts by day
      lowStockItems.forEach((inv: any) => {
        const alertDate = new Date(inv.lastUpdated || inv.updatedAt);
        if (alertDate >= thirtyDaysAgo) {
          const key = alertDate.toISOString().split('T')[0];
          if (dailyAlerts[key] !== undefined) {
            dailyAlerts[key]++;
          }
        }
      });

      const sortedKeys = Object.keys(dailyAlerts).sort();
      return {
        data: sortedKeys.map(key => dailyAlerts[key]),
        categories: sortedKeys.map(key => {
          const date = new Date(key);
          return `${date.getDate()} ${monthNames[date.getMonth()]}`;
        }),
      };
    })();

    return {
      lowStockItems: lowStockItems.length,
      overstockItems: overstockItems.length,
      delayedOrders: delayedOrders.length,
      demandSpikes: demandSpikes.length,
      stuckRMAs: stuckRMAs.length,
      lowStockDetails: lowStockItems.slice(0, 10).map((inv: any) => {
        const product = products.find((p: any) => p.id === inv.productId);
        const warehouse = inv.warehouse || {};
        return {
          id: inv.id,
          productName: product?.name || 'Unknown Product',
          sku: product?.sku || 'N/A',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          quantity: Number(inv.quantity || 0),
          reorderPoint: Number(inv.reorderPoint || 10),
        };
      }),
      overstockDetails: overstockItems.slice(0, 10).map((inv: any) => {
        const product = products.find((p: any) => p.id === inv.productId);
        const warehouse = inv.warehouse || {};
        return {
          id: inv.id,
          productName: product?.name || 'Unknown Product',
          sku: product?.sku || 'N/A',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          quantity: Number(inv.quantity || 0),
        };
      }),
      delayedOrdersDetails: delayedOrders.slice(0, 10).map((order: any) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const daysDelayed = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: order.id,
          orderNumber: order.orderNumber || `#${order.id}`,
          customerName: order.customer?.name || 'Unknown Customer',
          orderDate: orderDate.toLocaleDateString(),
          daysDelayed,
          amount: Number(order.totalAmount || 0),
        };
      }),
      demandSpikesDetails: demandSpikes,
      stuckRMAsDetails: stuckRMAs.slice(0, 10).map((returnItem: any) => {
        const returnDate = new Date(returnItem.createdAt || returnItem.returnDate);
        const daysStuck = Math.floor((now.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: returnItem.id,
          returnNumber: returnItem.returnNumber || `#${returnItem.id}`,
          orderNumber: returnItem.order?.orderNumber || 'N/A',
          status: returnItem.status || 'PENDING',
          returnDate: returnDate.toLocaleDateString(),
          daysStuck,
        };
      }),
      alertTrends,
    };
  }, [inventory, orders, products, returns]);

  // Show skeleton until all data is loaded
  if (isLoading || isFetching || !data) {
    return <SkeletonPage />;
  }

  // Chart configuration
  const alertTrendsChartConfig = {
    series: [{
      name: 'Alerts',
      data: metrics.alertTrends.data,
    }],
    chart: {
      height: 300,
      type: 'line' as const,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#ef4444'],
    stroke: {
      width: 2,
      curve: 'smooth' as const,
    },
    markers: {
      size: 4,
      hover: { size: 6 },
    },
    xaxis: {
      categories: metrics.alertTrends.categories,
      labels: {
        style: {
          colors: isDarkMode ? '#ffffff' : '#1C274C',
          fontSize: '12px',
        },
        rotate: -45,
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
      <Breadcrumb currentPage="Operational Dashboard" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Operational Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Low stock, overstock, delayed POs, demand spikes, stuck RMAs</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Low Stock</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.lowStockItems}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Overstock</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.overstockItems}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Delayed Orders</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.delayedOrders}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Demand Spikes</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.demandSpikes}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Stuck RMAs</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.stuckRMAs}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Trends Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alert Trends (Last 30 Days)</h6>
        <Chart type="line" height={300} series={alertTrendsChartConfig.series} options={alertTrendsChartConfig} />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Low Stock Alerts</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Current</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Reorder Point</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.lowStockDetails.length > 0 ? (
                  metrics.lowStockDetails.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.warehouseName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.reorderPoint}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                          <AlertTriangle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No low stock alerts</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overstock Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Overstock Alerts</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Quantity</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.overstockDetails.length > 0 ? (
                  metrics.overstockDetails.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.warehouseName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {item.quantity.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                          <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No overstock alerts</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Second Row Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Delayed Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Delayed Orders</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Days Delayed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.delayedOrdersDetails.length > 0 ? (
                  metrics.delayedOrdersDetails.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {order.customerName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                        {order.daysDelayed} days
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(order.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                          <Clock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No delayed orders</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demand Spikes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Demand Spikes</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Recent Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Total Orders</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.demandSpikesDetails.length > 0 ? (
                  metrics.demandSpikesDetails.map((spike: any) => (
                    <tr key={spike.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {spike.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400 font-medium">
                        {spike.recentOrders}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {spike.totalOrders}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                          <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No demand spikes detected</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stuck RMAs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Stuck RMAs</h6>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Return #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Return Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Days Stuck</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {metrics.stuckRMAsDetails.length > 0 ? (
                metrics.stuckRMAsDetails.map((rma: any) => (
                  <tr key={rma.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {rma.returnNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {rma.orderNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                        {rma.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {rma.returnDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 font-medium">
                      {rma.daysStuck} days
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                        <RotateCcw className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No stuck RMAs</p>
          </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
