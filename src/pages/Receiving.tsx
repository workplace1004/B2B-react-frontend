import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function Receiving() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'receiving'],
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

  // Transform orders into receiving format (treating orders as purchase orders)
  const receivings = orders.map((order: any) => {
    const customerName = order.customer?.name || 'Supplier';
    const itemsCount = order.orderLines?.length || 0;
    let status = 'Pending';
    if (order.status === 'DELIVERED' || order.status === 'FULFILLED') {
      status = 'Received';
    } else if (order.status === 'SHIPPED' || order.status === 'PROCESSING') {
      status = 'In Transit';
    }
    
    return {
      id: order.id,
      poNumber: order.orderNumber || `PO-${order.id}`,
      supplier: customerName,
      items: itemsCount,
      status,
    };
  });

  // Filter by search query
  const filteredReceivings = receivings.filter((receiving: any) => 
    receiving.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    receiving.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Receiving" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Receiving</h1>
          </div>
          {(!filteredReceivings || filteredReceivings.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Receiving
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredReceivings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No receiving records found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first receiving record to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Receiving
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReceivings.map((receiving: any) => (
                <tr key={receiving.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {receiving.poNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{receiving.supplier}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{receiving.items}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      receiving.status === 'Received' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : receiving.status === 'In Transit'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {receiving.status}
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

