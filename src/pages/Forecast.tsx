import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function Forecast() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', 'forecast'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'forecast'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  const orders = ordersData || [];

  // Calculate forecasts based on products and order history
  const forecasts = products.slice(0, 20).map((product: any) => {
    // Get orders for this product
    const productOrders = orders.filter((order: any) =>
      order.orderLines?.some((line: any) => line.productId === product.id)
    );
    
    const totalQuantity = productOrders.reduce((sum: number, order: any) => {
      const lineQty = order.orderLines
        ?.filter((line: any) => line.productId === product.id)
        .reduce((lineSum: number, line: any) => lineSum + (line.quantity || 0), 0) || 0;
      return sum + lineQty;
    }, 0);
    
    const forecast = Math.max(totalQuantity, 100); // Minimum forecast
    const actual = totalQuantity;
    const varianceNum = ((actual - forecast) / forecast * 100);
    const variance = varianceNum.toFixed(1);
    const varianceStr = varianceNum >= 0 ? `+${variance}%` : `${variance}%`;
    
    // Get current quarter
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const period = `Q${quarter} ${now.getFullYear()}`;
    
    return {
      id: product.id,
      product: product.name || product.sku || 'Product',
      period,
      forecast,
      actual,
      variance: varianceStr,
    };
  });

  // Filter by search query
  const filteredForecasts = forecasts.filter((forecast: any) => 
    forecast.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    forecast.period.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Forecast" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Forecast</h1>
          </div>
          {(!filteredForecasts || filteredForecasts.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Forecast
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredForecasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No forecasts found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first forecast to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Forecast
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Forecast</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredForecasts.map((forecast: any) => (
                <tr key={forecast.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {forecast.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{forecast.period}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{forecast.forecast}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{forecast.actual}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    parseFloat(forecast.variance) >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {forecast.variance}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

