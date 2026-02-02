import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function InventoryFulfillmentDashboard() {
  const { isLoading } = useQuery({
    queryKey: ['inventory-fulfillment-dashboard'],
    queryFn: async () => {
      try {
        const [inventory, warehouses] = await Promise.all([
          api.get('/inventory'),
          api.get('/warehouses'),
        ]);
        return {
          inventory: inventory.data || [],
          warehouses: warehouses.data?.data || [],
        };
      } catch (error) {
        return { inventory: [], warehouses: [] };
      }
    },
  });

  if (isLoading) {
    return <SkeletonPage />;
  }

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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <i className='fi fi-rr-package text-gray-400 dark:text-gray-500' style={{ fontSize: '30px' }}></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Retail Dashboard</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
            Stock by warehouse, inbound/outbound, exceptions
          </p>
        </div>
      </div>
    </div>
  );
}

