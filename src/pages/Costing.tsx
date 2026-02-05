import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function Costing() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', 'costing'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  
  // Calculate costing data from products
  const costings = products.map((product: any) => {
    const price = parseFloat(product.price) || 0;
    const cost = price * 0.6; // Estimate cost as 60% of price
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    return {
      id: product.id,
      product: product.name || product.sku || 'Unknown Product',
      cost: `$${cost.toFixed(2)}`,
      price: `$${price.toFixed(2)}`,
      margin: `${margin.toFixed(1)}%`,
      rawPrice: price,
      rawCost: cost,
    };
  });

  // Filter by search query
  const filteredCostings = costings.filter((costing: any) => 
    costing.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Costing" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Costing</h1>
          </div>
          {(!filteredCostings || filteredCostings.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              Add Costing
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredCostings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No costings found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first costing to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              Add Costing
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Margin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCostings.map((costing: any) => (
                <tr key={costing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {costing.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{costing.cost}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{costing.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">{costing.margin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Edit</button>
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

