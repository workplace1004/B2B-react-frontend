import { useQuery } from '@tanstack/react-query';
import { Grid } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function ProductCollectionDashboard() {
  const { isLoading } = useQuery({
    queryKey: ['product-collection-dashboard'],
    queryFn: async () => {
      try {
        const [products, collections] = await Promise.all([
          api.get('/products?skip=0&take=1000'),
          api.get('/collections?skip=0&take=1000'),
        ]);
        return {
          products: products.data?.data || [],
          collections: Array.isArray(collections.data) ? collections.data : (collections.data?.data || []),
        };
      } catch (error) {
        return { products: [], collections: [] };
      }
    },
  });

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Product & Collection" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product & Collection</h1>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Grid className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Product & Collection Dashboard</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
            Style performance, drop performance, DPP/compliance overview
          </p>
        </div>
      </div>
    </div>
  );
}

