import { useQuery } from '@tanstack/react-query';
import { TrendingUp, LayoutDashboard } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function ExecutiveOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['executive-overview'],
    queryFn: async () => {
      try {
        // Fetch data for executive overview
        const [orders, products, customers, inventory] = await Promise.all([
          api.get('/orders?skip=0&take=10'),
          api.get('/products?skip=0&take=10'),
          api.get('/customers?skip=0&take=10'),
          api.get('/inventory'),
        ]);
        return {
          orders: orders.data?.data || [],
          products: products.data?.data || [],
          customers: customers.data?.data || [],
          inventory: inventory.data || [],
        };
      } catch (error) {
        return { orders: [], products: [], customers: [], inventory: [] };
      }
    },
  });

  if (isLoading) {
    return <SkeletonPage />;
  }

  // Calculate metrics
  const totalRevenue = (data?.orders || []).reduce((sum: number, order: any) => sum + parseFloat(order.totalAmount || 0), 0);
  const totalProducts = (data?.products || []).length;
  const totalCustomers = (data?.customers || []).length;
  const totalInventory = (data?.inventory || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

  return (
    <div>
      <Breadcrumb currentPage="Executive Overview" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Executive Overview</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">${totalRevenue.toLocaleString()}</p>
            </div>
            <LayoutDashboard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalProducts}</p>
            </div>
            <LayoutDashboard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalCustomers}</p>
            </div>
            <LayoutDashboard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Inventory</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalInventory}</p>
            </div>
            <LayoutDashboard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Executive Overview Dashboard</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
            Revenue, margin, sell-through, inventory health, cash snapshot
          </p>
        </div>
      </div>
    </div>
  );
}

