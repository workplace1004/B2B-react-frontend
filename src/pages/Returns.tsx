import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function Returns() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'returns'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];

  // Filter orders with RETURNED status and transform to returns format
  const returns = orders
    .filter((order: any) => order.status === 'RETURNED')
    .map((order: any) => {
      // Get first product from order lines
      const firstLine = order.orderLines?.[0];
      const productName = firstLine?.product?.name || firstLine?.product?.sku || 'Product';
      return {
        id: order.id,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        product: productName,
        reason: 'Return Requested', // Could be from order notes or a separate field
        status: 'Approved', // Default status for returned orders
      };
    });

  // Filter by search query
  const filteredReturns = returns.filter((returnItem: any) => 
    returnItem.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    returnItem.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    returnItem.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Returns (RMA)" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Returns (RMA)</h1>
          </div>
          {(!filteredReturns || filteredReturns.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Return
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredReturns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <RotateCcw className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No returns found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first return to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Return
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReturns.map((returnItem: any) => (
                <tr key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {returnItem.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{returnItem.product}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{returnItem.reason}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {returnItem.status}
                    </span>
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

