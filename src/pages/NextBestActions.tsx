import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
  Package,
  Truck,
  Warehouse,
  User,
  Calendar,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Zap,
  ListChecks,
  UserPlus,
  Eye,
  X,
  RefreshCw,
  PauseCircle,
} from 'lucide-react';
import api from '../lib/api';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput } from '../components/ui';
import Pagination, { ITEMS_PER_PAGE } from '../components/ui/Pagination';

type TabType = 'priority-queue' | 'exception-triage' | 'automated-tasks';

export default function NextBestActions() {
  const [activeTab, setActiveTab] = useState<TabType>('priority-queue');

  const tabs = [
    { id: 'priority-queue' as TabType, label: 'Priority Queue', icon: ListChecks },
    { id: 'exception-triage' as TabType, label: 'Exception Triage', icon: AlertTriangle },
    { id: 'automated-tasks' as TabType, label: 'Automated Tasks', icon: Zap },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Next Best Actions" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Next Best Actions</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Priority queue, exception triage, and automated task management
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'priority-queue' && <PriorityQueueSection />}
        {activeTab === 'exception-triage' && <ExceptionTriageSection />}
        {activeTab === 'automated-tasks' && <AutomatedTasksSection />}
      </div>
    </div>
  );
}

// Priority Queue Section
function PriorityQueueSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [deferredItems, setDeferredItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'priority-queue'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'priority-queue'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch purchase orders
  const { data: purchaseOrdersData } = useQuery({
    queryKey: ['purchase-orders', 'priority-queue'],
    queryFn: async () => {
      try {
        const response = await api.get('/purchase-orders?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const orders = ordersData || [];
  const inventory = inventoryData || [];
  const purchaseOrders = purchaseOrdersData || [];

  // Handle modal open/close
  const openViewModal = (item: any) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
    setTimeout(() => setIsViewModalShowing(true), 10);
  };

  const closeViewModal = () => {
    setIsViewModalShowing(false);
    setTimeout(() => {
      setIsViewModalOpen(false);
      setSelectedItem(null);
    }, 300);
  };

  // Complete action mutation
  const completeActionMutation = useMutation({
    mutationFn: async (item: any) => {
      // Handle different action types
      if (item.type === 'urgent-order') {
        // Update order status or create fulfillment task
        return { success: true, message: 'Order fulfillment initiated' };
      } else if (item.type === 'low-stock') {
        // Create purchase order or transfer
        return { success: true, message: 'Replenishment action initiated' };
      } else if (item.type === 'po-confirmation') {
        // Follow up on PO
        return { success: true, message: 'PO follow-up action completed' };
      } else if (item.type === 'inventory-imbalance') {
        // Resolve imbalance
        return { success: true, message: 'Inventory imbalance resolved' };
      }
      return { success: true };
    },
    onSuccess: (_data, item) => {
      setCompletedItems(prev => new Set(prev).add(item.id));
      queryClient.invalidateQueries({ queryKey: ['orders', 'priority-queue'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'priority-queue'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', 'priority-queue'] });
      toast.success(`Action "${item.title}" marked as complete!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to complete action';
      toast.error(errorMessage);
    },
  });

  // Defer action mutation
  const deferActionMutation = useMutation({
    mutationFn: async (_item: any) => {
      // In a real implementation, this would create a deferred task or update a deferral date
      return { success: true };
    },
    onSuccess: (_data, item) => {
      setDeferredItems(prev => new Set(prev).add(item.id));
      toast.success(`Action "${item.title}" deferred`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to defer action';
      toast.error(errorMessage);
    },
  });

  const handleComplete = (item: any) => {
    if (completedItems.has(item.id)) {
      toast('This action is already completed');
      return;
    }
    completeActionMutation.mutate(item);
  };

  const handleDefer = (item: any) => {
    if (deferredItems.has(item.id)) {
      toast('This action is already deferred');
      return;
    }
    deferActionMutation.mutate(item);
  };

  // Calculate priority queue items
  const priorityQueue = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Urgent orders (past due or due today)
    const urgentOrders = orders
      .filter((order: any) => {
        const status = order.status;
        if (!['PENDING', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED'].includes(status)) {
          return false;
        }

        const requiredDate = order.requiredDate ? new Date(order.requiredDate) : null;
        if (!requiredDate) return false;

        const daysUntilDue = Math.floor((requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 0;
      })
      .map((order: any) => {
        const requiredDate = order.requiredDate ? new Date(order.requiredDate) : null;
        const daysOverdue = requiredDate
          ? Math.floor((today.getTime() - requiredDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: `order-${order.id}`,
          type: 'urgent-order',
          category: 'Orders',
          title: `Fulfill Order ${order.orderNumber}`,
          description: `Order is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due today'}`,
          priority: daysOverdue > 0 ? 'critical' : 'high',
          priorityScore: daysOverdue > 0 ? 100 : 90,
          dueDate: requiredDate,
          daysOverdue,
          orderValue: parseFloat(order.totalAmount || 0),
          order,
          action: 'Review and fulfill order immediately',
        };
      });

    // 2. Low stock alerts
    const lowStockItems = inventory
      .filter((inv: any) => {
        const available = inv.availableQty || inv.quantity || 0;
        const reorderPoint = inv.reorderPoint || 0;
        return available > 0 && available <= reorderPoint;
      })
      .map((inv: any) => {
        const available = inv.availableQty || inv.quantity || 0;
        const reorderPoint = inv.reorderPoint || 0;
        const safetyStock = inv.safetyStock || 0;

        let priority = 'medium';
        let priorityScore = 60;
        if (available === 0) {
          priority = 'critical';
          priorityScore = 95;
        } else if (available <= safetyStock) {
          priority = 'high';
          priorityScore = 80;
        }

        return {
          id: `stock-${inv.id}`,
          type: 'low-stock',
          category: 'Inventory',
          title: `Low Stock: ${inv.product?.name || 'Product'}`,
          description: `Only ${available} units available (Reorder point: ${reorderPoint})`,
          priority,
          priorityScore,
          product: inv.product,
          warehouse: inv.warehouse,
          available,
          reorderPoint,
          action: 'Create purchase order or transfer inventory',
        };
      });

    // 3. Purchase orders to confirm
    const posToConfirm = purchaseOrders
      .filter((po: any) => po.status === 'DRAFT' || po.status === 'SENT')
      .map((po: any) => {
        const orderDate = new Date(po.orderDate);
        const daysSinceOrder = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: `po-${po.id}`,
          type: 'po-confirmation',
          category: 'Purchasing',
          title: `Confirm Purchase Order ${po.poNumber}`,
          description: `PO sent ${daysSinceOrder} days ago, awaiting confirmation`,
          priority: daysSinceOrder > 7 ? 'high' : 'medium',
          priorityScore: daysSinceOrder > 7 ? 75 : 55,
          purchaseOrder: po,
          daysSinceOrder,
          action: 'Follow up with supplier for confirmation',
        };
      });

    // 4. Inventory imbalances
    const inventoryImbalances = inventory
      .filter((inv: any) => {
        const available = inv.availableQty || inv.quantity || 0;
        const reserved = inv.reservedQty || 0;
        return available > 0 && reserved > available * 0.8; // More than 80% reserved
      })
      .map((inv: any) => {
        const available = inv.availableQty || inv.quantity || 0;
        const reserved = inv.reservedQty || 0;
        const imbalanceRatio = reserved / (available || 1);

        return {
          id: `imbalance-${inv.id}`,
          type: 'inventory-imbalance',
          category: 'Inventory',
          title: `Inventory Imbalance: ${inv.product?.name || 'Product'}`,
          description: `${reserved} units reserved out of ${available} available (${((reserved / available) * 100).toFixed(0)}%)`,
          priority: imbalanceRatio > 0.95 ? 'high' : 'medium',
          priorityScore: imbalanceRatio > 0.95 ? 70 : 50,
          product: inv.product,
          warehouse: inv.warehouse,
          available,
          reserved,
          action: 'Review reservations and adjust inventory allocation',
        };
      });

    return [...urgentOrders, ...lowStockItems, ...posToConfirm, ...inventoryImbalances]
      .filter((item: any) => {
        // Filter out completed and deferred items
        if (completedItems.has(item.id) || deferredItems.has(item.id)) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
        );
      })
      .filter((item: any) => {
        if (priorityFilter === 'critical') return item.priority === 'critical';
        if (priorityFilter === 'high') return item.priority === 'high';
        if (priorityFilter === 'medium') return item.priority === 'medium';
        if (priorityFilter === 'low') return item.priority === 'low';
        return true;
      })
      .filter((item: any) => {
        if (categoryFilter === 'Orders') return item.category === 'Orders';
        if (categoryFilter === 'Inventory') return item.category === 'Inventory';
        if (categoryFilter === 'Purchasing') return item.category === 'Purchasing';
        return true;
      })
      .sort((a: any, b: any) => b.priorityScore - a.priorityScore);
  }, [orders, inventory, purchaseOrders, searchQuery, priorityFilter, categoryFilter]);

  // Pagination
  const totalItems = priorityQueue.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedQueue = priorityQueue.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priorityFilter, categoryFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const critical = priorityQueue.filter((item: any) => item.priority === 'critical');
    const high = priorityQueue.filter((item: any) => item.priority === 'high');
    const todayDate = new Date();
    const today = priorityQueue.filter((item: any) => {
      if (!item.dueDate) return false;
      const dueDate = new Date(item.dueDate);
      return dueDate.toDateString() === todayDate.toDateString();
    });

    return {
      totalItems: priorityQueue.length,
      criticalCount: critical.length,
      highCount: high.length,
      todayCount: today.length,
    };
  }, [priorityQueue]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Orders':
        return Package;
      case 'Inventory':
        return Warehouse;
      case 'Purchasing':
        return Truck;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Actions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalItems}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical Priority</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.criticalCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Due Today</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.todayCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.highCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
              value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search actions..."
            />
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[180px]">
              <CustomDropdown
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                ]}
              />
            </div>
            <div className="min-w-[180px]">
              <CustomDropdown
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'Orders', label: 'Orders' },
                  { value: 'Inventory', label: 'Inventory' },
                  { value: 'Purchasing', label: 'Purchasing' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Priority Queue List */}
      {priorityQueue.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No actions needed</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || priorityFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All systems are running smoothly. No urgent actions required.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedQueue.map((item: any) => {
            const CategoryIcon = getCategoryIcon(item.category);
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.priority === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : item.priority === 'high'
                        ? 'bg-orange-100 dark:bg-orange-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                      <CategoryIcon
                        className={`w-5 h-5 ${
                          item.priority === 'critical'
                            ? 'text-red-600 dark:text-red-400'
                            : item.priority === 'high'
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {item.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {item.daysOverdue > 0
                                ? `${item.daysOverdue} days overdue`
                                : 'Due today'}
                            </span>
                          </div>
                        )}
                        {item.orderValue > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>${item.orderValue.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                          <ArrowRight className="w-4 h-4 inline mr-1" />
                          {item.action}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openViewModal(item)}
                      className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleComplete(item)}
                      disabled={completedItems.has(item.id) || completeActionMutation.isPending}
                      className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Complete"
                    >
                      {completeActionMutation.isPending ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDefer(item)}
                      disabled={deferredItems.has(item.id) || deferActionMutation.isPending}
                      className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Defer"
                    >
                      {deferActionMutation.isPending ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <PauseCircle className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                className="border-0 pt-0 mt-0"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Details View Modal */}
      {isViewModalOpen && selectedItem && (
        <ActionDetailsViewModal
          item={selectedItem}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
          onComplete={handleComplete}
          onDefer={handleDefer}
          isCompleted={completedItems.has(selectedItem.id)}
          isDeferred={deferredItems.has(selectedItem.id)}
        />
      )}
    </div>
  );
}

// Action Details View Modal Component
function ActionDetailsViewModal({
  item,
  onClose,
  isShowing,
  onComplete,
  onDefer,
  isCompleted,
  isDeferred,
}: {
  item: any;
  onClose: () => void;
  isShowing: boolean;
  onComplete: (item: any) => void;
  onDefer: (item: any) => void;
  isCompleted: boolean;
  isDeferred: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Orders':
        return Package;
      case 'Inventory':
        return Warehouse;
      case 'Purchasing':
        return Truck;
      default:
        return AlertTriangle;
    }
  };

  const CategoryIcon = getCategoryIcon(item.category);

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transition-transform duration-300 ${
          isShowing ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Action Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              item.priority === 'critical'
                ? 'bg-red-100 dark:bg-red-900/30'
                : item.priority === 'high'
                ? 'bg-orange-100 dark:bg-orange-900/30'
                : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              <CategoryIcon
                className={`w-6 h-6 ${
                  item.priority === 'critical'
                    ? 'text-red-600 dark:text-red-400'
                    : item.priority === 'high'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                  {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                </span>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  {item.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          </div>

          {/* Action Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Action Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {item.dueDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(item.dueDate).toLocaleDateString()}
                    {item.daysOverdue > 0 && (
                      <span className="ml-2 text-red-600 dark:text-red-400">
                        ({item.daysOverdue} days overdue)
                      </span>
                    )}
                  </p>
                </div>
              )}
              {item.orderValue > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Value</label>
                  <p className="text-sm text-gray-900 dark:text-white">${item.orderValue.toFixed(2)}</p>
                </div>
              )}
              {item.order && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
                  <p className="text-sm text-gray-900 dark:text-white">{item.order.orderNumber}</p>
                </div>
              )}
              {item.product && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
                  <p className="text-sm text-gray-900 dark:text-white">{item.product.name}</p>
                </div>
              )}
              {item.warehouse && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Warehouse</label>
                  <p className="text-sm text-gray-900 dark:text-white">{item.warehouse.name}</p>
                </div>
              )}
              {item.available !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Available Stock</label>
                  <p className="text-sm text-gray-900 dark:text-white">{item.available} units</p>
                </div>
              )}
              {item.reorderPoint !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reorder Point</label>
                  <p className="text-sm text-gray-900 dark:text-white">{item.reorderPoint} units</p>
                </div>
              )}
              {item.purchaseOrder && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Purchase Order</label>
                  <p className="text-sm text-gray-900 dark:text-white">{item.purchaseOrder.poNumber}</p>
                </div>
              )}
              {item.daysSinceOrder !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Days Since Order</label>
                  <p className="text-sm text-gray-900 dark:text-white">{item.daysSinceOrder} days</p>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Action */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Recommended Action</h4>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <ArrowRight className="w-4 h-4 inline mr-1" />
              {item.action}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
            {!isCompleted && !isDeferred && (
              <>
                <button
                  onClick={() => {
                    onDefer(item);
                    setTimeout(onClose, 500);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Defer
                </button>
                <button
                  onClick={() => {
                    onComplete(item);
                    setTimeout(onClose, 500);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
              </>
            )}
            {isCompleted && (
              <span className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium">
                ✓ Completed
              </span>
            )}
            {isDeferred && (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg text-sm font-medium">
                ⏸ Deferred
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Exception Triage Section
function ExceptionTriageSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [exceptionTypeFilter, setExceptionTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [selectedException, setSelectedException] = useState<any>(null);
  const [resolvedItems, setResolvedItems] = useState<Set<string>>(new Set());
  const [escalatedItems, setEscalatedItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch purchase orders for vendor delays
  const { data: purchaseOrdersData } = useQuery({
    queryKey: ['purchase-orders', 'exception-triage'],
    queryFn: async () => {
      try {
        const response = await api.get('/purchase-orders?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch shipments for late inbound
  const { data: shipmentsData } = useQuery({
    queryKey: ['shipments', 'exception-triage'],
    queryFn: async () => {
      try {
        const response = await api.get('/shipments?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory for imbalances
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'exception-triage'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'exception-triage'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const purchaseOrders = purchaseOrdersData || [];
  const shipments = shipmentsData || [];
  const inventory = inventoryData || [];
  const orders = ordersData || [];

  // Handle modal open/close
  const openViewModal = (exception: any) => {
    setSelectedException(exception);
    setIsViewModalOpen(true);
    setTimeout(() => setIsViewModalShowing(true), 10);
  };

  const closeViewModal = () => {
    setIsViewModalShowing(false);
    setTimeout(() => {
      setIsViewModalOpen(false);
      setSelectedException(null);
    }, 300);
  };

  // Resolve exception mutation
  const resolveExceptionMutation = useMutation({
    mutationFn: async (exception: any) => {
      // Handle different exception types
      if (exception.type === 'vendor-delay') {
        // Update PO status or create follow-up task
        return { success: true, message: 'Vendor delay exception resolved' };
      } else if (exception.type === 'late-inbound') {
        // Update shipment status or notify customer
        return { success: true, message: 'Late inbound exception resolved' };
      } else if (exception.type === 'inventory-imbalance') {
        // Resolve inventory imbalance
        return { success: true, message: 'Inventory imbalance resolved' };
      }
      return { success: true };
    },
    onSuccess: (_data, exception) => {
      setResolvedItems(prev => new Set(prev).add(exception.id));
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', 'exception-triage'] });
      queryClient.invalidateQueries({ queryKey: ['shipments', 'exception-triage'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'exception-triage'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'exception-triage'] });
      toast.success(`Exception "${exception.title}" resolved!`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to resolve exception';
      toast.error(errorMessage);
    },
  });

  // Escalate exception mutation
  const escalateExceptionMutation = useMutation({
    mutationFn: async (_exception: any) => {
      // In a real implementation, this would create an escalation task or notify managers
      return { success: true };
    },
    onSuccess: (_data, exception) => {
      setEscalatedItems(prev => new Set(prev).add(exception.id));
      toast.success(`Exception "${exception.title}" escalated`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to escalate exception';
      toast.error(errorMessage);
    },
  });

  const handleResolve = (exception: any) => {
    if (resolvedItems.has(exception.id)) {
      toast('This exception is already resolved');
      return;
    }
    resolveExceptionMutation.mutate(exception);
  };

  const handleEscalate = (exception: any) => {
    if (escalatedItems.has(exception.id)) {
      toast('This exception is already escalated');
      return;
    }
    escalateExceptionMutation.mutate(exception);
  };

  // Calculate exceptions
  const exceptions = useMemo(() => {
    const now = new Date();

    // 1. Vendor delays (late purchase orders)
    const vendorDelays = purchaseOrders
      .filter((po: any) => {
        if (po.status === 'CANCELLED' || po.status === 'RECEIVED') return false;
        if (!po.expectedDate) return false;
        const expectedDate = new Date(po.expectedDate);
        return expectedDate < now;
      })
      .map((po: any) => {
        const expectedDate = new Date(po.expectedDate);
        const daysLate = Math.floor((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: `vendor-delay-${po.id}`,
          type: 'vendor-delay',
          title: `Vendor Delay: PO ${po.poNumber}`,
          description: `Expected ${daysLate} days ago, still ${po.status === 'CONFIRMED' ? 'in transit' : 'pending'}`,
          severity: daysLate > 14 ? 'critical' : daysLate > 7 ? 'high' : 'medium',
          daysLate,
          purchaseOrder: po,
          supplier: po.supplier,
          expectedDate,
          status: 'open',
          action: daysLate > 14
            ? 'Contact supplier immediately and consider alternative sources'
            : 'Follow up with supplier for updated delivery date',
        };
      });

    // 2. Late inbound shipments
    const lateInbound = shipments
      .filter((shipment: any) => {
        if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') return false;
        const order = orders.find((o: any) => o.id === shipment.orderId);
        if (!order || !order.requiredDate) return false;
        const requiredDate = new Date(order.requiredDate);
        return requiredDate < now;
      })
      .map((shipment: any) => {
        const order = orders.find((o: any) => o.id === shipment.orderId);
        const requiredDate = order?.requiredDate ? new Date(order.requiredDate) : null;
        const daysLate = requiredDate
          ? Math.floor((now.getTime() - requiredDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: `late-inbound-${shipment.id}`,
          type: 'late-inbound',
          title: `Late Inbound: Shipment ${shipment.shipmentNumber}`,
          description: `Order ${order?.orderNumber || 'N/A'} was due ${daysLate} days ago, status: ${shipment.status}`,
          severity: daysLate > 7 ? 'critical' : daysLate > 3 ? 'high' : 'medium',
          daysLate,
          shipment,
          order,
          requiredDate,
          status: 'open',
          action: 'Contact carrier for tracking update and notify customer',
        };
      });

    // 3. Inventory imbalances
    const imbalances = inventory
      .filter((inv: any) => {
        const available = inv.availableQty || inv.quantity || 0;
        const reserved = inv.reservedQty || 0;
        const total = available + reserved;
        if (total === 0) return false;

        // Check for severe imbalances
        const reservedRatio = reserved / total;
        const availableRatio = available / total;

        // Either too much reserved (>90%) or too much available with no reservations
        return reservedRatio > 0.9 || (availableRatio > 0.9 && reserved === 0 && available > 100);
      })
      .map((inv: any) => {
        const available = inv.availableQty || inv.quantity || 0;
        const reserved = inv.reservedQty || 0;
        const total = available + reserved;
        const reservedRatio = reserved / total;
        const availableRatio = available / total;

        let severity = 'medium';
        if (reservedRatio > 0.95 || (availableRatio > 0.95 && reserved === 0 && available > 500)) {
          severity = 'high';
        }

        return {
          id: `imbalance-${inv.id}`,
          type: 'inventory-imbalance',
          title: `Inventory Imbalance: ${inv.product?.name || 'Product'}`,
          description:
            reservedRatio > 0.9
              ? `${reserved} units reserved, only ${available} available (${((reservedRatio) * 100).toFixed(0)}% reserved)`
              : `${available} units available but no reservations (potential overstock)`,
          severity,
          product: inv.product,
          warehouse: inv.warehouse,
          available,
          reserved,
          reservedRatio,
          status: 'open',
          action:
            reservedRatio > 0.9
              ? 'Review reservations, transfer inventory, or expedite replenishment'
              : 'Review demand forecast and consider markdown or transfer',
        };
      });

    return [...vendorDelays, ...lateInbound, ...imbalances]
      .filter((item: any) => {
        // Filter out resolved and escalated items when status filter is 'open'
        if (statusFilter === 'open' && (resolvedItems.has(item.id) || escalatedItems.has(item.id))) {
          return false;
        }
        if (statusFilter === 'resolved' && !resolvedItems.has(item.id)) {
          return false;
        }
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.type?.toLowerCase().includes(query)
        );
      })
      .filter((item: any) => {
        if (exceptionTypeFilter === 'vendor-delay') return item.type === 'vendor-delay';
        if (exceptionTypeFilter === 'late-inbound') return item.type === 'late-inbound';
        if (exceptionTypeFilter === 'inventory-imbalance') return item.type === 'inventory-imbalance';
        return true;
      })
      .filter((item: any) => {
        if (statusFilter === 'open') return !resolvedItems.has(item.id);
        if (statusFilter === 'resolved') return resolvedItems.has(item.id);
        return true;
      })
      .sort((a: any, b: any) => {
        const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
        return severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
      });
  }, [purchaseOrders, shipments, inventory, orders, searchQuery, exceptionTypeFilter, statusFilter]);

  // Pagination
  const totalItems = exceptions.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedExceptions = exceptions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, exceptionTypeFilter, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const vendorDelays = exceptions.filter((e: any) => e.type === 'vendor-delay');
    const lateInbound = exceptions.filter((e: any) => e.type === 'late-inbound');
    const imbalances = exceptions.filter((e: any) => e.type === 'inventory-imbalance');
    const critical = exceptions.filter((e: any) => e.severity === 'critical');

    return {
      totalExceptions: exceptions.length,
      vendorDelaysCount: vendorDelays.length,
      lateInboundCount: lateInbound.length,
      imbalancesCount: imbalances.length,
      criticalCount: critical.length,
    };
  }, [exceptions]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'vendor-delay':
        return Truck;
      case 'late-inbound':
        return Package;
      case 'inventory-imbalance':
        return Warehouse;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Exceptions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalExceptions}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Vendor Delays</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.vendorDelaysCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Late Inbound</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.lateInboundCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inventory Imbalances</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.imbalancesCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
              value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search exceptions..."
            />
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[180px]">
              <CustomDropdown
                value={exceptionTypeFilter}
                onChange={setExceptionTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'vendor-delay', label: 'Vendor Delays' },
                  { value: 'late-inbound', label: 'Late Inbound' },
                  { value: 'inventory-imbalance', label: 'Inventory Imbalances' },
                ]}
              />
            </div>
            <div className="min-w-[180px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'open', label: 'Open' },
                  { value: 'resolved', label: 'Resolved' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exceptions List */}
      {exceptions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exceptions found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || exceptionTypeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'All systems running smoothly. No exceptions to triage.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedExceptions.map((exception: any) => {
            const ExceptionIcon = getExceptionIcon(exception.type);
            return (
              <div
                key={exception.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        exception.severity === 'critical'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : exception.severity === 'high'
                          ? 'bg-orange-100 dark:bg-orange-900/30'
                          : 'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}
                    >
                      <ExceptionIcon
                        className={`w-5 h-5 ${
                          exception.severity === 'critical'
                            ? 'text-red-600 dark:text-red-400'
                            : exception.severity === 'high'
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{exception.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(exception.severity)}`}>
                          {exception.severity.charAt(0).toUpperCase() + exception.severity.slice(1)}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {exception.type.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{exception.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {exception.daysLate > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{exception.daysLate} days late</span>
                          </div>
                        )}
                        {exception.supplier && (
                          <div className="flex items-center gap-1">
                            <Truck className="w-4 h-4" />
                            <span>{exception.supplier.name}</span>
                          </div>
                        )}
                        {exception.warehouse && (
                          <div className="flex items-center gap-1">
                            <Warehouse className="w-4 h-4" />
                            <span>{exception.warehouse.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-300">
                          <ArrowRight className="w-4 h-4 inline mr-1" />
                          {exception.action}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openViewModal(exception)}
                      className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleResolve(exception)}
                      disabled={resolvedItems.has(exception.id) || resolveExceptionMutation.isPending}
                      className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Resolve"
                    >
                      {resolveExceptionMutation.isPending ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEscalate(exception)}
                      disabled={escalatedItems.has(exception.id) || escalateExceptionMutation.isPending}
                      className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      title="Escalate"
                    >
                      {escalateExceptionMutation.isPending ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                className="border-0 pt-0 mt-0"
              />
            </div>
          )}
        </div>
      )}

      {/* Exception Details View Modal */}
      {isViewModalOpen && selectedException && (
        <ExceptionDetailsViewModal
          exception={selectedException}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
          onResolve={handleResolve}
          onEscalate={handleEscalate}
          isResolved={resolvedItems.has(selectedException.id)}
          isEscalated={escalatedItems.has(selectedException.id)}
        />
      )}
    </div>
  );
}

// Exception Details View Modal Component
function ExceptionDetailsViewModal({
  exception,
  onClose,
  isShowing,
  onResolve,
  onEscalate,
  isResolved,
  isEscalated,
}: {
  exception: any;
  onClose: () => void;
  isShowing: boolean;
  onResolve: (exception: any) => void;
  onEscalate: (exception: any) => void;
  isResolved: boolean;
  isEscalated: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'vendor-delay':
        return Truck;
      case 'late-inbound':
        return Package;
      case 'inventory-imbalance':
        return Warehouse;
      default:
        return AlertTriangle;
    }
  };

  const ExceptionIcon = getExceptionIcon(exception.type);

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transition-transform duration-300 ${
          isShowing ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Exception Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                exception.severity === 'critical'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : exception.severity === 'high'
                  ? 'bg-orange-100 dark:bg-orange-900/30'
                  : 'bg-yellow-100 dark:bg-yellow-900/30'
              }`}
            >
              <ExceptionIcon
                className={`w-6 h-6 ${
                  exception.severity === 'critical'
                    ? 'text-red-600 dark:text-red-400'
                    : exception.severity === 'high'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{exception.title}</h3>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSeverityColor(exception.severity)}`}>
                  {exception.severity.charAt(0).toUpperCase() + exception.severity.slice(1)}
                </span>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  {exception.type.replace('-', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{exception.description}</p>
            </div>
          </div>

          {/* Exception Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exception Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {exception.daysLate > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Days Late</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.daysLate} days</p>
                </div>
              )}
              {exception.expectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Expected Date</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(exception.expectedDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {exception.supplier && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Supplier</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.supplier.name}</p>
                </div>
              )}
              {exception.warehouse && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Warehouse</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.warehouse.name}</p>
                </div>
              )}
              {exception.product && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.product.name}</p>
                </div>
              )}
              {exception.available !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Available Stock</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.available} units</p>
                </div>
              )}
              {exception.reserved !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reserved Stock</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.reserved} units</p>
                </div>
              )}
              {exception.reservedRatio !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reserved Ratio</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {(exception.reservedRatio * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {exception.purchaseOrder && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Purchase Order</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.purchaseOrder.poNumber}</p>
                </div>
              )}
              {exception.shipment && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Shipment</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.shipment.shipmentNumber}</p>
                </div>
              )}
              {exception.order && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order</label>
                  <p className="text-sm text-gray-900 dark:text-white">{exception.order.orderNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Action */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-2">Recommended Action</h4>
            <p className="text-sm text-orange-800 dark:text-orange-300">
              <ArrowRight className="w-4 h-4 inline mr-1" />
              {exception.action}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
            {!isResolved && !isEscalated && (
              <>
                <button
                  onClick={() => {
                    onEscalate(exception);
                    setTimeout(onClose, 500);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Escalate
                </button>
                <button
                  onClick={() => {
                    onResolve(exception);
                    setTimeout(onClose, 500);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve
                </button>
              </>
            )}
            {isResolved && (
              <span className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium">
                ✓ Resolved
              </span>
            )}
            {isEscalated && (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg text-sm font-medium">
                ⚠ Escalated
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Automated Tasks + Assignments Section
function AutomatedTasksSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch tasks from API
  const { data: tasksData, isLoading: _tasksLoading } = useQuery({
    queryKey: ['tasks', 'automated'],
    queryFn: async () => {
      try {
        const response = await api.get('/tasks?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    },
  });

  const tasks = tasksData || [];

  // Mutation for updating tasks
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      return api.patch(`/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'automated'] });
      toast.success('Task updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update task';
      toast.error(errorMessage);
    },
  });

  // Mutation for assigning tasks
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string | number; userId: number }) => {
      // Check if it's an auto-generated task
      if (typeof taskId === 'string' && taskId.startsWith('auto-')) {
        // For auto-generated tasks, we can't update via API, just return success
        return { success: true };
      }
      const taskIdNum = typeof taskId === 'string' ? parseInt(taskId) : taskId;
      return api.patch(`/tasks/${taskIdNum}`, { assignedTo: userId });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'automated'] });
      const user = users.find((u: any) => u.id === variables.userId);
      toast.success(`Task assigned to ${user?.firstName} ${user?.lastName}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign task';
      toast.error(errorMessage);
    },
  });

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users', 'automated-tasks'],
    queryFn: async () => {
      try {
        const response = await api.get('/users');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders and inventory to generate automated tasks
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'automated-tasks'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'automated-tasks'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const users = usersData || [];
  const orders = ordersData || [];
  const inventory = inventoryData || [];

  // Handle modal open/close
  const openViewModal = (task: any) => {
    setSelectedTask(task);
    setIsViewModalOpen(true);
    setTimeout(() => setIsViewModalShowing(true), 10);
  };

  const closeViewModal = () => {
    setIsViewModalShowing(false);
    setTimeout(() => {
      setIsViewModalOpen(false);
      setSelectedTask(null);
    }, 300);
  };

  // Generate automated tasks based on data
  const automatedTasks = useMemo(() => {
    const generatedTasks: any[] = [];

    // Auto-generate tasks from orders
    orders
      .filter((order: any) => order.status === 'PENDING' || order.status === 'CONFIRMED')
      .slice(0, 5)
      .forEach((order: any) => {
        generatedTasks.push({
          id: `auto-order-${order.id}`,
          type: 'order-review',
          title: `Review Order ${order.orderNumber}`,
          description: `Order requires review and allocation`,
          status: 'pending',
          priority: 'medium',
          assignee: null,
          createdAt: new Date(order.createdAt),
          dueDate: order.requiredDate ? new Date(order.requiredDate) : null,
          source: 'automated',
          order,
        });
      });

    // Auto-generate tasks from inventory
    inventory
      .filter((inv: any) => {
        const available = inv.availableQty || inv.quantity || 0;
        const reorderPoint = inv.reorderPoint || 0;
        return available <= reorderPoint && available > 0;
      })
      .slice(0, 3)
      .forEach((inv: any) => {
        generatedTasks.push({
          id: `auto-stock-${inv.id}`,
          type: 'replenishment',
          title: `Replenish ${inv.product?.name || 'Product'}`,
          description: `Stock level below reorder point`,
          status: 'pending',
          priority: 'high',
          assignee: null,
          createdAt: new Date(),
          dueDate: null,
          source: 'automated',
          inventory: inv,
        });
      });

    // Merge with stored tasks
    const allTasks = [...tasks, ...generatedTasks];

    return allTasks
      .filter((task: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          task.title?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.type?.toLowerCase().includes(query)
        );
      })
      .filter((task: any) => {
        if (statusFilter === 'pending') return task.status === 'pending';
        if (statusFilter === 'in-progress') return task.status === 'in-progress';
        if (statusFilter === 'completed') return task.status === 'completed';
        return true;
      })
      .filter((task: any) => {
        if (assigneeFilter === 'unassigned') return !task.assignee;
        if (assigneeFilter === 'assigned') return task.assignee;
        if (assigneeFilter !== 'all') return task.assignee?.id === parseInt(assigneeFilter);
        return true;
      })
      .sort((a: any, b: any) => {
        const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
        return (
          priorityOrder[b.priority as keyof typeof priorityOrder] -
          priorityOrder[a.priority as keyof typeof priorityOrder]
        );
      });
  }, [tasks, orders, inventory, searchQuery, statusFilter, assigneeFilter]);

  // Pagination
  const totalItems = automatedTasks.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTasks = automatedTasks.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, assigneeFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const pending = automatedTasks.filter((t: any) => t.status === 'pending');
    const inProgress = automatedTasks.filter((t: any) => t.status === 'in-progress');
    const completed = automatedTasks.filter((t: any) => t.status === 'completed');
    const unassigned = automatedTasks.filter((t: any) => !t.assignee);

    return {
      totalTasks: automatedTasks.length,
      pendingCount: pending.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      unassignedCount: unassigned.length,
    };
  }, [automatedTasks]);

  const updateTask = (taskId: string | number, updates: any) => {
    // Check if it's an auto-generated task (starts with 'auto-')
    if (typeof taskId === 'string' && taskId.startsWith('auto-')) {
      // Auto-generated tasks can't be updated via API, just show success message
      toast.success('Task status updated (auto-generated task)');
      return;
    }
    // Update real task via API
    const taskIdNum = typeof taskId === 'string' ? parseInt(taskId) : taskId;
    if (!isNaN(taskIdNum)) {
      updateTaskMutation.mutate({ id: taskIdNum, updates });
    }
  };

  const handleAssignTask = (taskId: string | number, userId: number) => {
    assignTaskMutation.mutate({ taskId, userId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalTasks}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                {summaryMetrics.pendingCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.inProgressCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unassigned</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.unassignedCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
              value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search tasks..."
            />
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[180px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
            <div className="min-w-[180px]">
              <CustomDropdown
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                options={[
                  { value: 'all', label: 'All Assignees' },
                  { value: 'unassigned', label: 'Unassigned' },
                  { value: 'assigned', label: 'Assigned' },
                  ...users.map((user: any) => ({
                    value: user.id.toString(),
                    label: `${user.firstName} ${user.lastName}`,
                  })),
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {automatedTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tasks found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || statusFilter !== 'all' || assigneeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No automated tasks at this time.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedTasks.map((task: any) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                      {task.source === 'automated' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {task.assignee ? (
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>
                            {task.assignee.firstName} {task.assignee.lastName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <UserPlus className="w-4 h-4" />
                          <span>Unassigned</span>
                        </div>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openViewModal(task)}
                    className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {task.status === 'pending' && (
                    <button
                      onClick={() => {
                        updateTask(task.id, { status: 'in-progress' });
                      }}
                      disabled={updateTaskMutation.isPending}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updateTaskMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Start'
                      )}
                    </button>
                  )}
                  {task.status === 'in-progress' && (
                    <button
                      onClick={() => {
                        updateTask(task.id, { status: 'completed' });
                      }}
                      disabled={updateTaskMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {updateTaskMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                      Complete
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                className="border-0 pt-0 mt-0"
              />
            </div>
          )}
        </div>
      )}

      {/* Task Details View Modal */}
      {isViewModalOpen && selectedTask && (
        <TaskDetailsViewModal
          task={selectedTask}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
          users={users}
          onAssign={handleAssignTask}
          onUpdate={updateTask}
        />
      )}
    </div>
  );
}

// Task Details View Modal Component
function TaskDetailsViewModal({
  task,
  onClose,
  isShowing,
  users,
  onAssign,
  onUpdate,
}: {
  task: any;
  onClose: () => void;
  isShowing: boolean;
  users: any[];
  onAssign: (taskId: string | number, userId: number) => void;
  onUpdate: (taskId: string | number, updates: any) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'pending',
    priority: task.priority || 'medium',
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    assignedTo: task.assignee?.id?.toString() || '',
  });

  // Update form data when task changes
  useEffect(() => {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignee?.id?.toString() || '',
    });
  }, [task]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      if (isEditing) {
        // Don't close if editing, just cancel edit
        setIsEditing(false);
        // Reset form data
        setFormData({
          title: task.title || '',
          description: task.description || '',
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          assignedTo: task.assignee?.id?.toString() || '',
        });
      } else {
        onClose();
      }
    }
  };

  const handleSave = () => {
    const updates: any = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
    };

    if (formData.dueDate) {
      updates.dueDate = new Date(formData.dueDate).toISOString();
    }

    if (formData.assignedTo && formData.assignedTo !== task.assignee?.id?.toString()) {
      onAssign(task.id, parseInt(formData.assignedTo));
    }

    onUpdate(task.id, updates);
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transition-transform duration-300 ${
          isShowing ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Info */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 mb-2 text-xl font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Task title"
                  />
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    rows={3}
                    placeholder="Task description"
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                    {task.source === 'automated' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        Auto
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                </>
              )}
            </div>
          </div>

          {/* Task Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <p className="text-sm text-gray-900 dark:text-white">{task.type || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                {isEditing ? (
                  <CustomDropdown
                    value={formData.status}
                    onChange={(value) => setFormData({ ...formData, status: value })}
                    options={[
                      { value: 'pending', label: 'Pending' },
                      { value: 'in-progress', label: 'In Progress' },
                      { value: 'completed', label: 'Completed' },
                    ]}
                  />
                ) : (
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                {isEditing ? (
                  <CustomDropdown
                    value={formData.priority}
                    onChange={(value) => setFormData({ ...formData, priority: value })}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'critical', label: 'Critical' },
                    ]}
                  />
                ) : (
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned To</label>
                {isEditing ? (
                  <CustomDropdown
                    value={formData.assignedTo}
                    onChange={(value) => setFormData({ ...formData, assignedTo: value })}
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...users.map((user: any) => ({
                        value: user.id.toString(),
                        label: `${user.firstName} ${user.lastName}`,
                      })),
                    ]}
                  />
                ) : task.assignee ? (
                  <p className="text-sm text-gray-900 dark:text-white">
                    {task.assignee.firstName} {task.assignee.lastName}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unassigned</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : task.dueDate ? (
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No due date</p>
                )}
              </div>
              {task.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {task.order && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Related Order</label>
                  <p className="text-sm text-gray-900 dark:text-white">{task.order.orderNumber}</p>
                </div>
              )}
              {task.inventory && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Related Product</label>
                  <p className="text-sm text-gray-900 dark:text-white">{task.inventory.product?.name || 'N/A'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    setFormData({
                      title: task.title || '',
                      description: task.description || '',
                      status: task.status || 'pending',
                      priority: task.priority || 'medium',
                      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                      assignedTo: task.assignee?.id?.toString() || '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Close
                </button>
                {task.status === 'pending' && (
                  <button
                    onClick={() => {
                      onUpdate(task.id, { status: 'in-progress' });
                      setTimeout(onClose, 500);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Start Task
                  </button>
                )}
                {task.status === 'in-progress' && (
                  <button
                    onClick={() => {
                      onUpdate(task.id, { status: 'completed' });
                      setTimeout(onClose, 500);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Task
                  </button>
                )}
                {task.status === 'completed' && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium">
                    ✓ Completed
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}