import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function Fulfillment() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'fulfillment'],
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

  // Filter orders that are being fulfilled (PROCESSING, SHIPPED, DELIVERED, FULFILLED)
  const fulfillments = orders
    .filter((order: any) => 
      ['PROCESSING', 'SHIPPED', 'DELIVERED', 'FULFILLED', 'PARTIALLY_FULFILLED'].includes(order.status)
    )
    .map((order: any) => {
      let status = 'Packing';
      if (order.status === 'DELIVERED') {
        status = 'Delivered';
      } else if (order.status === 'SHIPPED' || order.status === 'FULFILLED') {
        status = 'Shipped';
      }
      
      // Generate tracking number from order ID
      const tracking = `TRK${String(order.id).padStart(9, '0')}`;
      const carriers = ['FedEx', 'UPS', 'DHL', 'USPS'];
      const carrier = carriers[order.id % carriers.length];
      
      return {
        id: order.id,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        status,
        carrier,
        tracking,
      };
    });

  // Filter by search query
  const filteredFulfillments = fulfillments.filter((fulfillment: any) => 
    fulfillment.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fulfillment.tracking.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fulfillment.carrier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Fulfillment" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Fulfillment</h1>
          </div>
          {(!filteredFulfillments || filteredFulfillments.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Fulfillment
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredFulfillments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Truck className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No fulfillments found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first fulfillment to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Fulfillment
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Carrier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Tracking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFulfillments.map((fulfillment: any) => (
                <tr key={fulfillment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {fulfillment.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      fulfillment.status === 'Delivered' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : fulfillment.status === 'Shipped'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {fulfillment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{fulfillment.carrier}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{fulfillment.tracking}</td>
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

