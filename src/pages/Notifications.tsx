import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Bell, AlertCircle, CheckCircle2, Info, Check } from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';

interface Notification {
  id: number | string;
  type: 'warning' | 'success' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [readNotifications, setReadNotifications] = useState<Set<number | string>>(new Set());

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

  // Fetch orders for order status notifications
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'notifications'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=50');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers for new customer notifications
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'notifications'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=50');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  }

  // Transform system data into notifications
  const notifications: Notification[] = useMemo(() => {
    const notifs: Notification[] = [];

    // Add low stock alerts
    (inventoryData || []).forEach((item: any) => {
      if (item.quantity <= item.reorderPoint && item.quantity > 0) {
        notifs.push({
          id: `inventory-${item.id}`,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${item.product?.name || 'Product'} is running low. Current stock: ${item.quantity} units.`,
          time: getTimeAgo(new Date(item.lastUpdated || item.updatedAt)),
          read: readNotifications.has(`inventory-${item.id}`),
        });
      }
    });

    // Add order status notifications
    (ordersData || []).forEach((order: any) => {
      if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
        notifs.push({
          id: `order-${order.id}`,
          type: 'success',
          title: `Order ${order.status}`,
          message: `Order ${order.orderNumber || `#${order.id}`} has been ${order.status.toLowerCase()}.`,
          time: getTimeAgo(new Date(order.updatedAt || order.createdAt)),
          read: readNotifications.has(`order-${order.id}`),
        });
      } else if (order.status === 'PENDING' || order.status === 'CANCELLED') {
        notifs.push({
          id: `order-${order.id}`,
          type: 'warning',
          title: `Order ${order.status}`,
          message: `Order ${order.orderNumber || `#${order.id}`} is ${order.status.toLowerCase()}.`,
          time: getTimeAgo(new Date(order.updatedAt || order.createdAt)),
          read: readNotifications.has(`order-${order.id}`),
        });
      }
    });

    // Add new customer notifications (recent customers)
    (customersData || []).forEach((customer: any) => {
      const createdAt = new Date(customer.createdAt);
      const daysSinceCreation = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only show customers created in the last 7 days
      if (daysSinceCreation <= 7) {
        notifs.push({
          id: `customer-${customer.id}`,
          type: 'info',
          title: 'New Customer Registered',
          message: `${customer.name} just registered.`,
          time: getTimeAgo(createdAt),
          read: readNotifications.has(`customer-${customer.id}`),
        });
      }
    });

    // Sort by time (most recent first)
    notifs.sort((a, b) => {
      const timeA = parseTimeAgo(a.time);
      const timeB = parseTimeAgo(b.time);
      return timeB - timeA;
    });

    return notifs;
  }, [inventoryData, ordersData, customersData, readNotifications]);

  function parseTimeAgo(timeStr: string): number {
    if (timeStr === 'just now') return 0;
    const match = timeStr.match(/(\d+)\s*(minute|hour|day|week)s?\s*ago/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      minute: 60,
      hour: 3600,
      day: 86400,
      week: 604800,
    };
    return value * (multipliers[unit] || 0);
  }

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return AlertCircle;
      case 'success':
        return CheckCircle2;
      case 'info':
        return Info;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'info':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const markAsRead = (id: number | string) => {
    setReadNotifications((prev) => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifications((prev) => new Set([...prev, ...allIds]));
  };

  if (inventoryLoading || ordersLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-black">Notifications</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and view all your notifications</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 rounded-lg transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'all'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'unread'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'read'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No {filter === 'all' ? '' : filter} notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filter === 'unread'
                ? 'You have no unread notifications'
                : filter === 'read'
                ? 'You have no read notifications'
                : 'You have no notifications'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map((notif) => {
              const Icon = getIcon(notif.type);
              const iconColorClass = getIconColor(notif.type);

              return (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                    !notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`text-sm font-semibold ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{notif.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{notif.time}</p>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            className="flex-shrink-0 px-3 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
