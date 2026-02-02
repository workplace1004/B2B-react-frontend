import { useQuery } from '@tanstack/react-query';
import { Warehouse } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function InventoryWarehouse() {
  const { isLoading } = useQuery({
    queryKey: ['inventory', 'warehouse'],
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
      <Breadcrumb currentPage="Inventory & Warehouse (WMS)" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory & Warehouse (WMS)</h1>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Warehouse className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Inventory & Warehouse Management</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
            Warehouses & Locations, Stock Control, Scanning, Counting
          </p>
        </div>
      </div>
    </div>
  );
}

