import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Plus } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

export default function RetailerEnablement() {
  const [searchQuery, _setSearchQuery] = useState('');

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', 'retailer-enablement'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const customers = customersData || [];

  // Filter only RETAILER type customers and transform to enablement format
  const enablementPrograms = customers
    .filter((customer: any) => customer.type === 'RETAILER')
    .map((customer: any) => {
      // Determine enablement status based on customer data
      // Active customers are considered "Enabled"
      // Inactive customers are "Inactive"
      const isActive = customer.isActive !== false;
      const orderCount = customer._count?.orders || 0;
      
      let status = 'In Progress';
      if (isActive && orderCount > 0) {
        status = 'Enabled';
      } else if (isActive) {
        status = 'In Progress';
      } else {
        status = 'Inactive';
      }

      return {
        id: customer.id,
        name: customer.name || customer.companyName || 'Unknown Retailer',
        contact: customer.contactPerson || customer.name || 'N/A',
        email: customer.email || 'N/A',
        orders: orderCount,
        status: status,
        isActive: isActive,
      };
    });

  // Filter by search query
  const filteredPrograms = enablementPrograms.filter((program: any) => 
    program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    program.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Retailer Enablement" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Retailer Enablement</h1>
          </div>
          {(!filteredPrograms || filteredPrograms.length === 0) ? null : (
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Program
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredPrograms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Handshake className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No retailer enablement programs found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first retailer enablement program to the inventory.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-5 h-5" />
              New Program
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Retailer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPrograms.map((program: any) => (
                <tr key={program.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <div>
                      <span className="block">{program.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{program.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{program.contact}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{program.orders}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      program.status === 'Enabled' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : program.status === 'In Progress'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {program.status}
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

