import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Info, X, Inbox } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

interface Alert {
  id: number | string;
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  time: string;
}

export default function Alerts() {
  // Fetch inventory for low stock alerts
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for order-related alerts
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'alerts'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=100');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers for new customer alerts
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'alerts'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=100');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const isLoading = inventoryLoading || ordersLoading || customersLoading;

  // Generate alerts from real data
  const alerts: Alert[] = [];
  
  // Low stock alerts from inventory
  if (inventoryData && Array.isArray(inventoryData)) {
    inventoryData.forEach((item: any) => {
      if (item.quantityOnHand !== undefined && item.quantityOnHand < 10) {
        const productName = item.product?.name || item.product?.sku || 'Product';
        const timeAgo = item.updatedAt 
          ? new Date(item.updatedAt).toLocaleString('en-US', { 
              hour: 'numeric', 
              minute: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'Recently';
        alerts.push({
          id: `low-stock-${item.id}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${productName} is running low (${item.quantityOnHand} units remaining)`,
          time: timeAgo,
        });
      }
    });
  }

  // Order status alerts
  if (ordersData && Array.isArray(ordersData)) {
    ordersData.forEach((order: any) => {
      if (order.status === 'CANCELLED' || order.status === 'RETURNED') {
        const timeAgo = order.updatedAt 
          ? new Date(order.updatedAt).toLocaleString('en-US', { 
              hour: 'numeric', 
              minute: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'Recently';
        alerts.push({
          id: `order-${order.id}`,
          type: 'error',
          title: `Order ${order.status === 'CANCELLED' ? 'Cancelled' : 'Returned'}`,
          message: `Order #${order.orderNumber || order.id} ${order.status === 'CANCELLED' ? 'was cancelled' : 'was returned'}`,
          time: timeAgo,
        });
      } else if (order.status === 'FULFILLED' || order.status === 'DELIVERED') {
        const timeAgo = order.updatedAt 
          ? new Date(order.updatedAt).toLocaleString('en-US', { 
              hour: 'numeric', 
              minute: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'Recently';
        alerts.push({
          id: `order-success-${order.id}`,
          type: 'success',
          title: 'Order Completed',
          message: `Order #${order.orderNumber || order.id} has been ${order.status === 'FULFILLED' ? 'fulfilled' : 'delivered'}`,
          time: timeAgo,
        });
      }
    });
  }

  // New customer alerts (customers created in last 7 days)
  if (customersData && Array.isArray(customersData)) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    customersData.forEach((customer: any) => {
      const createdAt = new Date(customer.createdAt);
      if (createdAt > sevenDaysAgo) {
        const timeAgo = createdAt.toLocaleString('en-US', { 
          hour: 'numeric', 
          minute: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        alerts.push({
          id: `customer-${customer.id}`,
          type: 'info',
          title: 'New Customer',
          message: `${customer.name || 'New customer'} registered`,
          time: timeAgo,
        });
      }
    });
  }

  // Sort by time (most recent first)
  alerts.sort((a, b) => {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    return timeB - timeA;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800';
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Alerts" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Alerts</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage system alerts and notifications</p>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No alerts found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            There are no active alerts at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${getBgColor(alert.type)} flex items-start gap-4`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(alert.type)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{alert.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{alert.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{alert.time}</p>
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

