import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import {
  LayoutDashboard,
  Package,
  Layers,
  Warehouse,
  Building2,
  ShoppingCart,
  Users,
  BarChart3,
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  X,
  Calendar,
  ChevronDown,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [documentsDropdownOpen, setDocumentsDropdownOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [calendarDropdownOpen, setCalendarDropdownOpen] = useState(false);
  
  const documentsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark', !darkMode);
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/collections', label: 'Collections', icon: Layers },
    { path: '/inventory', label: 'Inventory', icon: Warehouse },
    { path: '/warehouses', label: 'Warehouses', icon: Building2 },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (documentsRef.current && !documentsRef.current.contains(event.target as Node)) {
        setDocumentsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsDropdownOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setCalendarDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Track read documents and notifications locally
  const [readDocuments, setReadDocuments] = useState<Set<number>>(new Set());
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Fetch documents from DAM API
  const { data: damAssets } = useQuery({
    queryKey: ['dam', 'documents', 'dropdown'],
    queryFn: async () => {
      try {
        const response = await api.get('/dam');
        return (response.data || []).filter((asset: any) => asset.type === 'DOCUMENT');
      } catch (error) {
        return [];
      }
    },
  });

  // Transform DAM assets to documents format
  const documents = useMemo(() => {
    if (!damAssets || damAssets.length === 0) return [];
    
    return damAssets
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3) // Show only latest 3 in dropdown
      .map((asset: any) => {
        const fileExtension = asset.mimeType?.split('/')[1]?.toUpperCase() || 'DOCUMENT';
        const isRead = readDocuments.has(asset.id);
        
        return {
          id: asset.id,
          title: asset.name,
          type: fileExtension,
          date: new Date(asset.createdAt).toISOString().split('T')[0],
          status: isRead ? 'read' : 'new' as 'new' | 'read',
        };
      });
  }, [damAssets, readDocuments]);

  // Fetch notifications data
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'notifications', 'dropdown'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'notifications', 'dropdown'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', 'notifications', 'dropdown'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch all customers for "Today New Leads" calculation
  const { data: allCustomersData } = useQuery({
    queryKey: ['customers', 'today-leads'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Calculate today's new leads (customers created today)
  const todayNewLeads = useMemo(() => {
    if (!allCustomersData || allCustomersData.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allCustomersData.filter((customer: any) => {
      const customerDate = new Date(customer.createdAt);
      return customerDate >= today && customerDate < tomorrow;
    }).length;
  }, [allCustomersData]);

  // Helper function to calculate time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  // Transform system data into notifications
  const notifications = useMemo(() => {
    const notifs: Array<{ id: string; title: string; message: string; type: 'warning' | 'success' | 'info'; time: string; read: boolean }> = [];

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
      } else if (order.status === 'PENDING') {
        notifs.push({
          id: `order-${order.id}`,
          type: 'info',
          title: 'New Order Received',
          message: `Order ${order.orderNumber || `#${order.id}`} has been placed.`,
          time: getTimeAgo(new Date(order.createdAt)),
          read: readNotifications.has(`order-${order.id}`),
        });
      }
    });

    // Add new customer notifications (only recent ones)
    (customersData || []).forEach((customer: any) => {
      const customerDate = new Date(customer.createdAt);
      const daysSinceCreation = (new Date().getTime() - customerDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        notifs.push({
          id: `customer-${customer.id}`,
          type: 'info',
          title: 'New Customer Registered',
          message: `${customer.name} just signed up.`,
          time: getTimeAgo(customerDate),
          read: readNotifications.has(`customer-${customer.id}`),
        });
      }
    });

    // Sort by time (newest first) and take only latest 4 for dropdown
    return notifs
      .sort(() => {
        // Already sorted by data source
        return 0;
      })
      .slice(0, 4);
  }, [inventoryData, ordersData, customersData, readNotifications]);

  // Fetch calendar events from orders
  const { data: calendarOrdersData } = useQuery({
    queryKey: ['orders', 'calendar', 'dropdown'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Transform orders into calendar events
  const calendarEvents = useMemo(() => {
    if (!calendarOrdersData || calendarOrdersData.length === 0) return [];
    
    return calendarOrdersData
      .slice(0, 3) // Show only latest 3 in dropdown
      .map((order: any) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        const requiredDate = order.requiredDate ? new Date(order.requiredDate) : null;
        const eventDate = requiredDate || orderDate;
        
        return {
          id: order.id,
          title: `Order ${order.orderNumber || `#${order.id}`}`,
          date: eventDate.toISOString().split('T')[0],
          time: eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          type: order.status === 'PENDING' ? 'meeting' : 'event' as 'meeting' | 'event',
        };
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [calendarOrdersData]);

  const unreadDocumentsCount = documents.filter((doc: { status: 'new' | 'read' }) => doc.status === 'new').length;
  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header and Sidebar Brand Row */}
      <div className="fixed top-0 left-0 right-0 h-16 flex z-50">
        {/* Sidebar Brand Section */}
        <div className={`h-16 flex items-center justify-between px-4 border-b border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300 ${
          sidebarOpen ? 'w-72' : 'w-20'
        }`}>
          {sidebarOpen ? (
            <>
              <div>
                <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">HAZEL</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inventory Platform</p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Header */}
        <header className="flex-1 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4 flex-1">

            {/* Search */}
            <div className="hidden lg:flex items-center flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search anything's"
                  className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-black"
                />
              </div>
            </div>

            {/* Badge */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
              <span className="text-sm text-gray-700 dark:text-gray-300">Today New Leads</span>
              <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full">{todayNewLeads}</span>
            </div>
          </div>

           {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Switch */}
            <div className="relative">
              <button
                onClick={toggleDarkMode}
                className="relative flex items-center w-16 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Toggle theme"
              >
                {/* Sun Icon - Left */}
                <div className={`absolute left-1.5 flex items-center justify-center w-5 h-5 z-10 transition-opacity ${
                  darkMode ? 'opacity-50' : 'opacity-100'
                }`}>
                  <Sun className={`w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-800'}`} strokeWidth={2} />
                </div>
                {/* Moon Icon - Right */}
                <div className={`absolute right-1.5 flex items-center justify-center w-5 h-5 z-10 transition-opacity ${
                  darkMode ? 'opacity-100' : 'opacity-50'
                }`}>
                  <Moon className={`w-4 h-4 ${darkMode ? 'text-gray-200' : 'text-gray-600'}`} strokeWidth={2} />
                </div>
                {/* Toggle Thumb */}
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ease-in-out ${
                    darkMode ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Documents/Tasks Dropdown */}
            <div className="relative" ref={documentsRef}>
              <button
                onClick={() => {
                  setDocumentsDropdownOpen(!documentsDropdownOpen);
                  setNotificationsDropdownOpen(false);
                  setCalendarDropdownOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                title="Documents & Tasks"
              >
                <FileText className="w-5 h-5" />
                {unreadDocumentsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                )}
              </button>

              {documentsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documents & Tasks</h3>
                      {unreadDocumentsCount > 0 && (
                        <span className="px-2 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                          {unreadDocumentsCount} new
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {documents.length === 0 ? (
                      <div className="p-8 text-center">
                        <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No documents available</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {documents.map((doc: { id: number; title: string; type: string; date: string; status: 'new' | 'read' }) => (
                          <Link
                            key={doc.id}
                            to="/documents"
                            onClick={() => {
                              setReadDocuments((prev) => new Set([...prev, doc.id]));
                              setDocumentsDropdownOpen(false);
                            }}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                              doc.status === 'new' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <FileText className={`w-5 h-5 ${doc.status === 'new' ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500 dark:text-blue-400'}`} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${doc.status === 'new' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {doc.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{doc.type}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{doc.date}</span>
                              </div>
                            </div>
                            {doc.status === 'new' && (
                              <div className="flex-shrink-0 mt-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full block"></span>
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/documents"
                      onClick={() => setDocumentsDropdownOpen(false)}
                      className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      View All Documents
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setNotificationsDropdownOpen(!notificationsDropdownOpen);
                  setDocumentsDropdownOpen(false);
                  setCalendarDropdownOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                )}
              </button>

              {notificationsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      {unreadNotificationsCount > 0 && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                          {unreadNotificationsCount} new
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {notifications.map((notif) => {
                          const Icon = notif.type === 'warning' ? AlertCircle : notif.type === 'success' ? CheckCircle2 : Info;
                          const iconColor = notif.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 
                                          notif.type === 'success' ? 'text-green-600 dark:text-green-400' : 
                                          'text-blue-600 dark:text-blue-400';
  return (
                            <div
                              key={notif.id}
                              className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                                !notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                              }`}
                              onClick={() => {
                                setReadNotifications((prev) => new Set([...prev, notif.id]));
                                setNotificationsDropdownOpen(false);
                              }}
                            >
                              <div className={`flex-shrink-0 mt-1 ${iconColor}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notif.time}</p>
                              </div>
                              {!notif.read && (
                                <div className="flex-shrink-0">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full block"></span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationsDropdownOpen(false)}
                      className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      View All Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Calendar Dropdown */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => {
                  setCalendarDropdownOpen(!calendarDropdownOpen);
                  setDocumentsDropdownOpen(false);
                  setNotificationsDropdownOpen(false);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Calendar & Events"
              >
                <Calendar className="w-5 h-5" />
              </button>

              {calendarDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Events</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Next 7 days</p>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {calendarEvents.length === 0 ? (
                      <div className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming events</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {calendarEvents.map((event: { id: number; title: string; date: string; time: string; type: 'meeting' | 'event' }) => (
                          <Link
                            key={event.id}
                            to="/calendar"
                            onClick={() => setCalendarDropdownOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border-2 border-purple-200 dark:border-purple-800">
                                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{event.date} • {event.time}</p>
                              <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${
                                event.type === 'meeting' 
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-purple-500 text-white'
                              }`}>
                                {event.type}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      to="/calendar"
                      onClick={() => setCalendarDropdownOpen(false)}
                      className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      View Full Calendar
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="hidden lg:block text-right mr-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-black">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <ChevronDown className="w-3 h-3" />
                    {user?.role || 'User'}
                  </div>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                    {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                </div>
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                          {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-black">
                            {user?.firstName} {user?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <User className="w-4 h-4" />
                        View Profile
                      </Link>
                      <Link
                        to="/tasks"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <FileText className="w-4 h-4" />
                        My Task
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="w-4 h-4" />
                        Account Settings
                      </Link>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
        </header>
        </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 bottom-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-72' : 'w-20'
        }`}
      >

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
              <li key={item.path}>
                <Link
                  to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      active
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`pt-16 transition-all duration-300 bg-gray-50 dark:bg-gray-900 ${
          sidebarOpen ? 'ml-72' : 'ml-20'
        }`}
      >
        <div className="p-6 px-20">{children}</div>
      </main>
    </div>
  );
}
