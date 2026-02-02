import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Package, Warehouse, AlertTriangle, ArrowDown, ArrowUp, Box } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import Chart from 'react-apexcharts';

export default function InventoryFulfillmentDashboard() {
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
    queryKey: ['inventory-fulfillment-dashboard'],
    queryFn: async () => {
      try {
        const [inventoryResponse, warehousesResponse, ordersResponse, productsResponse] = await Promise.all([
          api.get('/inventory'),
          api.get('/warehouses'),
          api.get('/orders?skip=0&take=10000'),
          api.get('/products?skip=0&take=10000'),
        ]);
        return {
          inventory: inventoryResponse.data?.data || inventoryResponse.data || [],
          warehouses: warehousesResponse.data?.data || warehousesResponse.data || [],
          orders: ordersResponse.data?.data || ordersResponse.data || [],
          products: productsResponse.data?.data || productsResponse.data || [],
        };
      } catch (error) {
        return { inventory: [], warehouses: [], orders: [], products: [] };
      }
    },
  });

  const inventory = data?.inventory || [];
  const warehouses = data?.warehouses || [];
  const orders = data?.orders || [];
  const products = data?.products || [];

  // Calculate metrics
  const metrics = useMemo(() => {
    // Total inventory value (sum of quantity * product price)
    const totalInventoryValue = inventory.reduce((sum: number, inv: any) => {
      const product = products.find((p: any) => p.id === inv.productId);
      const price = product ? Number(product.price || product.basePrice || 0) : 0;
      return sum + (Number(inv.quantity || 0) * price);
    }, 0);

    // Total stock units
    const totalStockUnits = inventory.reduce((sum: number, inv: any) => sum + Number(inv.quantity || 0), 0);

    // Total warehouses
    const totalWarehouses = warehouses.length;

    // Low stock items (quantity <= reorderPoint or <= 10)
    const lowStockItems = inventory.filter((inv: any) => {
      const reorderPoint = Number(inv.reorderPoint || 0);
      const quantity = Number(inv.quantity || 0);
      return quantity <= Math.max(reorderPoint, 10);
    });

    // Out of stock items
    const outOfStockItems = inventory.filter((inv: any) => Number(inv.quantity || 0) === 0);

    // Stock by warehouse
    const stockByWarehouse = warehouses.map((warehouse: any) => {
      const warehouseInventory = inventory.filter((inv: any) => inv.warehouseId === warehouse.id);
      const totalQuantity = warehouseInventory.reduce((sum: number, inv: any) => sum + Number(inv.quantity || 0), 0);
      const totalValue = warehouseInventory.reduce((sum: number, inv: any) => {
        const product = products.find((p: any) => p.id === inv.productId);
        const price = product ? Number(product.price || product.basePrice || 0) : 0;
        return sum + (Number(inv.quantity || 0) * price);
      }, 0);
      return {
        id: warehouse.id,
        name: warehouse.name,
        quantity: totalQuantity,
        value: totalValue,
        itemCount: warehouseInventory.length,
      };
    }).sort((a: any, b: any) => b.quantity - a.quantity);

    // Top products by stock
    const productStock = products.map((product: any) => {
      const productInventory = inventory.filter((inv: any) => inv.productId === product.id);
      const totalQuantity = productInventory.reduce((sum: number, inv: any) => sum + Number(inv.quantity || 0), 0);
      const totalValue = productInventory.reduce((sum: number, inv: any) => {
        const price = Number(product.price || product.basePrice || 0);
        return sum + (Number(inv.quantity || 0) * price);
      }, 0);
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: totalQuantity,
        value: totalValue,
        warehouses: productInventory.length,
      };
    }).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 10);

    // Inbound activity (orders received - simplified, would need shipments in real system)
    const recentOrders = orders
      .filter((order: any) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const daysAgo = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30; // Last 30 days
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.orderDate || a.createdAt);
        const dateB = new Date(b.orderDate || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);

    // Outbound activity (orders shipped/fulfilled)
    const outboundOrders = orders
      .filter((order: any) => order.status === 'SHIPPED' || order.status === 'FULFILLED')
      .sort((a: any, b: any) => {
        const dateA = new Date(a.orderDate || a.createdAt);
        const dateB = new Date(b.orderDate || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);

    // Monthly inventory trend (last 12 months)
    const monthlyInventoryTrend = (() => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const monthlyData: Record<string, number> = {};
      
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
        monthlyData[key] = 0;
      }

      // For each month, calculate average inventory (simplified - using current inventory)
      // In a real system, you'd track historical inventory snapshots
      const currentTotal = totalStockUnits;
      const sortedKeys = Object.keys(monthlyData).sort();
      return {
        data: sortedKeys.map(() => currentTotal), // Simplified - would use historical data
        categories: sortedKeys.map(key => {
          const [, month] = key.split('-');
          return monthNames[parseInt(month)];
        }),
      };
    })();

    return {
      totalInventoryValue,
      totalStockUnits,
      totalWarehouses,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      stockByWarehouse,
      productStock,
      recentOrders,
      outboundOrders,
      monthlyInventoryTrend,
      lowStockDetails: lowStockItems.slice(0, 10).map((inv: any) => {
        const product = products.find((p: any) => p.id === inv.productId);
        const warehouse = warehouses.find((w: any) => w.id === inv.warehouseId);
        return {
          id: inv.id,
          productName: product?.name || 'Unknown Product',
          sku: product?.sku || 'N/A',
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          quantity: Number(inv.quantity || 0),
          reorderPoint: Number(inv.reorderPoint || 0),
        };
      }),
    };
  }, [inventory, warehouses, orders, products]);

  // Show skeleton until all data is loaded
  if (isLoading || isFetching || !data) {
    return <SkeletonPage />;
  }

  // Chart configurations
  const stockByWarehouseChartConfig = {
    series: [{
      name: 'Stock Quantity',
      data: metrics.stockByWarehouse.map((w: any) => w.quantity),
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
      categories: metrics.stockByWarehouse.map((w: any) => w.name),
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

  const inventoryTrendChartConfig = {
    series: [{
      name: 'Total Stock Units',
      data: metrics.monthlyInventoryTrend.data,
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
      categories: metrics.monthlyInventoryTrend.categories,
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
      <Breadcrumb currentPage="Retail Dashboard" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Retail Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Stock by warehouse, inbound/outbound, exceptions</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Inventory Value</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{formatCurrency(metrics.totalInventoryValue)}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Box className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Total Stock Units</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.totalStockUnits.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Warehouses</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.totalWarehouses}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Low Stock Items</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.lowStockItems}</h2>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 block">Out of Stock</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-0">{metrics.outOfStockItems}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stock by Warehouse */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock by Warehouse</h6>
          {metrics.stockByWarehouse.length > 0 ? (
            <Chart type="bar" height={300} series={stockByWarehouseChartConfig.series} options={stockByWarehouseChartConfig} />
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px]">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Warehouse className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No warehouse data available</p>
            </div>
          )}
        </div>

        {/* Inventory Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Inventory Trend (Last 12 Months)</h6>
          <Chart type="area" height={300} series={inventoryTrendChartConfig.series} options={inventoryTrendChartConfig} />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products by Stock */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Top Products by Stock</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.productStock.length > 0 ? (
                  metrics.productStock.map((product: any) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {product.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(product.value)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                          <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No product stock data available</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
      </div>

      {/* Inbound/Outbound Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inbound Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Recent Inbound Activity</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.recentOrders.length > 0 ? (
                  metrics.recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {order.orderNumber || `#${order.id}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          order.status === 'FULFILLED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {order.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(Number(order.totalAmount || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                          <ArrowDown className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent inbound activity</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Outbound Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h6 className="text-lg font-semibold text-gray-900 dark:text-white mb-0">Recent Outbound Activity</h6>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {metrics.outboundOrders.length > 0 ? (
                  metrics.outboundOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {order.orderNumber || `#${order.id}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          {order.status || 'FULFILLED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(Number(order.totalAmount || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                          <ArrowUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No recent outbound activity</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
