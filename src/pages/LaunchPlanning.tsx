import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Rocket, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function LaunchPlanning() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ['collections', 'launch-planning'],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  const collections = collectionsData || [];

  // Transform collections into launches format
  const launches = collections.map((collection: any) => {
    const productCount = collection._count?.products || 0;
    const launchDate = collection.createdAt ? new Date(collection.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    let status = 'Planned';
    if (collection.lifecycle === 'ACTIVE') {
      status = 'In Progress';
    }
    
    return {
      id: collection.id,
      name: collection.name || 'Collection Launch',
      date: launchDate,
      status,
      products: productCount,
    };
  });

  // Filter by search query
  const filteredLaunches = launches.filter((launch: any) => 
    launch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    launch.date.includes(searchQuery)
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Launch Planning" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Launch Planning</h1>
          </div>
          {(!filteredLaunches || filteredLaunches.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Launch
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredLaunches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Rocket className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No launches found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first launch to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Launch
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Launch Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLaunches.map((launch: any) => (
                <tr key={launch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {launch.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{launch.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{launch.products}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      launch.status === 'In Progress' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {launch.status}
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

