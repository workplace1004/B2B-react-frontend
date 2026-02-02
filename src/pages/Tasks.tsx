import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { CheckCircle2, Circle, Clock, Plus, Filter } from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignedBy?: string;
}

export default function Tasks() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  // Fetch orders to use as tasks
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'tasks'],
    queryFn: async () => {
      const response = await api.get('/orders?skip=0&take=10000');
      return response.data?.data || [];
    },
  });

  // Transform orders into tasks
  const tasks: Task[] = (ordersData || []).map((order: any) => {
    let status: 'pending' | 'in-progress' | 'completed' = 'pending';
    if (order.status === 'FULFILLED' || order.status === 'DELIVERED') {
      status = 'completed';
    } else if (order.status === 'PROCESSING' || order.status === 'CONFIRMED' || order.status === 'SHIPPED') {
      status = 'in-progress';
    }

    let priority: 'low' | 'medium' | 'high' = 'medium';
    const amount = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount || 0);
    if (amount > 10000) priority = 'high';
    else if (amount < 1000) priority = 'low';

    const dueDate = order.requiredDate || order.orderDate || order.createdAt;

    return {
      id: order.id,
      title: `Process Order ${order.orderNumber || `#${order.id}`}`,
      description: `Order for ${order.customer?.name || 'Customer'} - Amount: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      status,
      priority,
      dueDate: new Date(dueDate).toISOString().split('T')[0],
      assignedBy: order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}` : undefined,
    };
  });

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(task => task.status === filter);

  if (isLoading) {
    return <SkeletonPage />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'in-progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div>
      <Breadcrumb currentPage="My Tasks" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Tasks</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage your assigned tasks</p>
      </div>
      <div className='flex justify-between items-center mb-6'>
        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'pending'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            Pending ({tasks.filter(t => t.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'in-progress'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            In Progress ({tasks.filter(t => t.status === 'in-progress').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            Completed ({tasks.filter(t => t.status === 'completed').length})
          </button>
        </div>
        <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tasks found</h3>
            <p className="text-gray-500 dark:text-gray-400">No tasks match the selected filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {task.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('-', ' ').toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority.toUpperCase()} Priority
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                          {task.assignedBy && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Assigned by: {task.assignedBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

