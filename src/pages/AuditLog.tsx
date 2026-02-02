import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

interface AuditLog {
  id: number | string;
  user: string;
  action: string;
  entity: string;
  timestamp: string;
}

export default function AuditLog() {
  const [searchQuery, _setSearchQuery] = useState('');

  // Fetch orders for audit trail
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'audit'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=100');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch products for audit trail
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'audit'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=100');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers for audit trail
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'audit'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=100');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const isLoading = ordersLoading || productsLoading || customersLoading;

  // Generate audit logs from real data
  const logs: AuditLog[] = [];
  
  // Order audit logs
  if (ordersData && Array.isArray(ordersData)) {
    ordersData.forEach((order: any) => {
      const userName = order.user 
        ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || order.user.email || 'System'
        : 'System';
      const timestamp = order.createdAt 
        ? new Date(order.createdAt).toLocaleString('en-US', { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'Unknown';
      logs.push({
        id: `order-${order.id}`,
        user: userName,
        action: 'Created Order',
        entity: `Order #${order.orderNumber || order.id}`,
        timestamp,
      });
      
      if (order.updatedAt && order.updatedAt !== order.createdAt) {
        const updateTimestamp = new Date(order.updatedAt).toLocaleString('en-US', { 
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
        logs.push({
          id: `order-update-${order.id}`,
          user: userName,
          action: 'Updated Order',
          entity: `Order #${order.orderNumber || order.id}`,
          timestamp: updateTimestamp,
        });
      }
    });
  }

  // Product audit logs
  if (productsData && Array.isArray(productsData)) {
    productsData.forEach((product: any) => {
      const timestamp = product.createdAt 
        ? new Date(product.createdAt).toLocaleString('en-US', { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'Unknown';
      logs.push({
        id: `product-${product.id}`,
        user: 'System',
        action: 'Created Product',
        entity: product.name || product.sku || 'Product',
        timestamp,
      });
    });
  }

  // Customer audit logs
  if (customersData && Array.isArray(customersData)) {
    customersData.forEach((customer: any) => {
      const timestamp = customer.createdAt 
        ? new Date(customer.createdAt).toLocaleString('en-US', { 
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        : 'Unknown';
      logs.push({
        id: `customer-${customer.id}`,
        user: 'System',
        action: 'Created Customer',
        entity: customer.name || customer.email || 'Customer',
        timestamp,
      });
    });
  }

  // Sort by timestamp (most recent first)
  logs.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  // Filter by search query
  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.entity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Audit Log" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No audit logs found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              There are no audit logs available at this time.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{log.action}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">{log.entity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

