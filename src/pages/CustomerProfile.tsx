import { useQuery } from '@tanstack/react-query';
import { User } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { useLocation } from 'react-router-dom';

export default function CustomerProfile() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const customerId = searchParams.get('id');

  const { data, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      try {
        const response = await api.get(`/customers/${customerId}`);
        return response.data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!customerId,
  });

  if (isLoading) {
    return <SkeletonPage />;
  }

  if (!customerId || !data) {
    return (
      <div>
        <Breadcrumb currentPage="Customer Profile" />
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Profile</h1>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No customer selected</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Please select a customer to view their profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb currentPage="Customer Profile" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Profile</h1>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{data.name}</h2>
          <p className="text-gray-500 dark:text-gray-400">Order history, loyalty status</p>
        </div>
      </div>
    </div>
  );
}

