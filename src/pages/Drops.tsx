import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

interface Drop {
  id: number;
  name: string;
  date: string;
  products: number;
  status: 'Active' | 'Upcoming' | 'Planned';
}

export default function Drops() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ['collections', 'drops'],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        // Handle both paginated and non-paginated responses
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  const collections = collectionsData || [];

  // Transform collections into drops format
  const drops: Drop[] = collections
    .filter((collection: any) => collection.drop) // Only include collections with a drop field
    .map((collection: any) => {
      const dropDate = collection.createdAt 
        ? new Date(collection.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      // Determine status based on lifecycle or date
      let status: 'Active' | 'Upcoming' | 'Planned' = 'Planned';
      if (collection.lifecycle === 'ACTIVE' || collection.lifecycle === 'LIVE') {
        status = 'Active';
      } else if (collection.lifecycle === 'UPCOMING' || collection.lifecycle === 'PLANNED') {
        status = 'Upcoming';
      } else {
        const today = new Date();
        const collectionDate = new Date(collection.createdAt || collection.drop);
        if (collectionDate <= today) {
          status = 'Active';
        } else {
          status = 'Upcoming';
        }
      }

      return {
        id: collection.id,
        name: collection.drop || collection.name || `Drop ${collection.id}`,
        date: dropDate,
        products: collection._count?.products || 0,
        status,
      };
    })
    .sort((a: Drop, b: Drop) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date, newest first

  // Filter by search query
  const filteredDrops = drops.filter((drop) => 
    drop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    drop.date.includes(searchQuery) ||
    drop.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Drops" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Drops</h1>
          </div>
          {(!filteredDrops || filteredDrops.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              Add Drop
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredDrops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No drops found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first drop to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              Add Drop
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDrops.map((drop) => (
                <tr key={drop.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {drop.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{drop.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{drop.products}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      drop.status === 'Active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : drop.status === 'Upcoming'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {drop.status}
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

