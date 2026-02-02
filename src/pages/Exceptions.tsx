import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, X, Inbox } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

interface Exception {
  id: number | string;
  type: string;
  message: string;
  location: string;
  time: string;
}

export default function Exceptions() {
  // Fetch inventory for mismatch exceptions
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', 'exceptions'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for processing delay exceptions
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'exceptions'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=100');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const isLoading = inventoryLoading || ordersLoading;

  // Generate exceptions from real data
  const exceptions: Exception[] = [];
  
  // Inventory mismatches (negative quantities or discrepancies)
  if (inventoryData && Array.isArray(inventoryData)) {
    inventoryData.forEach((item: any) => {
      if (item.quantityOnHand !== undefined && item.quantityOnHand < 0) {
        const warehouseName = item.warehouse?.name || 'Unknown Warehouse';
        const timeAgo = item.updatedAt 
          ? new Date(item.updatedAt).toLocaleString('en-US', { 
              hour: 'numeric', 
              minute: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'Recently';
        exceptions.push({
          id: `inventory-${item.id}`,
          type: 'Exception',
          message: 'Inventory mismatch detected',
          location: warehouseName,
          time: timeAgo,
        });
      }
    });
  }

  // Order processing delays (orders pending for more than 24 hours)
  if (ordersData && Array.isArray(ordersData)) {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    ordersData.forEach((order: any) => {
      if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
        const orderDate = new Date(order.orderDate || order.createdAt);
        if (orderDate < oneDayAgo) {
          const timeAgo = orderDate.toLocaleString('en-US', { 
            hour: 'numeric', 
            minute: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          exceptions.push({
            id: `order-delay-${order.id}`,
            type: 'Exception',
            message: 'Order processing delay',
            location: `Order #${order.orderNumber || order.id}`,
            time: timeAgo,
          });
        }
      }
    });
  }

  // Sort by time (most recent first)
  exceptions.sort((a, b) => {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    return timeB - timeA;
  });

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Exceptions" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Exceptions</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage system exceptions and errors</p>
      </div>

      {exceptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exceptions found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            There are no active exceptions at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {exceptions.map((exception) => (
          <div
            key={exception.id}
            className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 flex items-start gap-4"
          >
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{exception.type}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{exception.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">Location: {exception.location}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{exception.time}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}

