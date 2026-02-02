import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { CheckSquare, Plus, X, Pencil, Trash2, Calendar, Clock, AlertCircle, CheckCircle2, Circle, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonPage } from '../components/Skeleton';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;
  assignedTo?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyTasks() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusModalShowing, setIsStatusModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusModalTask, setStatusModalTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'LOW' | 'MEDIUM' | 'HIGH'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const priorityFilterRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  // Fetch tasks from API
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', page, filterStatus, filterPriority],
    queryFn: async () => {
      const params: any = { skip: page * 10, take: 10000 }; // Get all for filtering
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;
      const response = await api.get('/tasks', { params });
      return response.data;
    },
  });

  const tasks: Task[] = tasksData?.data || [];

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: async (taskData: Partial<Task> & { title: string }) => {
      const response = await api.post('/tasks', {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'PENDING',
        priority: taskData.priority || 'MEDIUM',
        dueDate: taskData.dueDate,
        category: taskData.category,
        assignedTo: taskData.assignedTo,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully!');
      closeModal();
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...taskData }: Partial<Task> & { id: number }) => {
      const response = await api.patch(`/tasks/${id}`, taskData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully!');
      closeEditModal();
    },
    onError: () => {
      toast.error('Failed to update task');
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully!');
      closeDeleteModal();
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isStatusModalOpen || isDeleteModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isModalOpen) setIsModalShowing(true);
          if (isEditModalOpen) setIsEditModalShowing(true);
          if (isStatusModalOpen) setIsStatusModalShowing(true);
          if (isDeleteModalOpen) setIsDeleteModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
      setIsEditModalShowing(false);
      setIsStatusModalShowing(false);
      setIsDeleteModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isStatusModalOpen, isDeleteModalOpen]);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedTask(null);
    }, 300);
  };

  const openStatusModal = (task: Task) => {
    setStatusModalTask(task);
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = () => {
    setIsStatusModalShowing(false);
    setTimeout(() => {
      setIsStatusModalOpen(false);
      setStatusModalTask(null);
    }, 300);
  };

  const handleStatusChange = (newStatus: Task['status']) => {
    if (!statusModalTask) return;
    updateMutation.mutate({
      id: statusModalTask.id,
      status: newStatus,
    });
    closeStatusModal();
  };

  const handleCreateTask = (taskData: Partial<Task> & { title: string }) => {
    createMutation.mutate({
      title: taskData.title,
      description: taskData.description,
      status: taskData.status || 'PENDING',
      priority: taskData.priority || 'MEDIUM',
      dueDate: taskData.dueDate,
      category: taskData.category,
      assignedTo: taskData.assignedTo,
    });
  };

  const handleUpdateTask = (taskData: Partial<Task>) => {
    if (!selectedTask) return;
    updateMutation.mutate({
      id: selectedTask.id,
      ...taskData,
    });
  };

  const openDeleteModal = (task: Task) => {
    setDeleteTask(task);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setDeleteTask(null);
    }, 300);
  };

  const handleDeleteTask = () => {
    if (!deleteTask) return;
    deleteMutation.mutate(deleteTask.id);
  };


  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesSearch = searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filterStatus, filterPriority, searchQuery]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setIsStatusFilterOpen(false);
      }
      if (priorityFilterRef.current && !priorityFilterRef.current.contains(event.target as Node)) {
        setIsPriorityFilterOpen(false);
      }
    };

    if (isStatusFilterOpen || isPriorityFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusFilterOpen, isPriorityFilterOpen]);

  // Calculate statistics
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue: tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED';
    }).length,
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'OVERDUE':
        return 'Overdue';
      default:
        return 'Pending';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div>
      <Breadcrumb currentPage="My Tasks" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your tasks and track your progress</p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
            <Circle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={statusFilterRef}>
              <button
                type="button"
                onClick={() => {
                  setIsStatusFilterOpen(!isStatusFilterOpen);
                  setIsPriorityFilterOpen(false);
                }}
                className="flex items-center justify-between gap-2 px-4 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[140px]"
              >
                <span className="text-sm">
                  {filterStatus === 'all' ? 'All Status' :
                   filterStatus === 'PENDING' ? 'Pending' :
                   filterStatus === 'IN_PROGRESS' ? 'In Progress' :
                   filterStatus === 'COMPLETED' ? 'Completed' :
                   'Overdue'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStatusFilterOpen && (
                <div className="custom-dropdown-menu absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" style={{ zIndex: 10001 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('all');
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterStatus === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Status
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('PENDING');
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterStatus === 'PENDING'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('IN_PROGRESS');
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterStatus === 'IN_PROGRESS'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('COMPLETED');
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterStatus === 'COMPLETED'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('OVERDUE');
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterStatus === 'OVERDUE'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Overdue
                  </button>
                </div>
              )}
            </div>
            <div className="relative" ref={priorityFilterRef}>
              <button
                type="button"
                onClick={() => {
                  setIsPriorityFilterOpen(!isPriorityFilterOpen);
                  setIsStatusFilterOpen(false);
                }}
                className="flex items-center justify-between gap-2 px-4 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[140px]"
              >
                <span className="text-sm">
                  {filterPriority === 'all' ? 'All Priority' :
                   filterPriority === 'HIGH' ? 'High' :
                   filterPriority === 'MEDIUM' ? 'Medium' :
                   'Low'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isPriorityFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isPriorityFilterOpen && (
                <div className="custom-dropdown-menu absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" style={{ zIndex: 10001 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPriority('all');
                      setIsPriorityFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterPriority === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPriority('HIGH');
                      setIsPriorityFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterPriority === 'HIGH'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    High
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPriority('MEDIUM');
                      setIsPriorityFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterPriority === 'MEDIUM'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterPriority('LOW');
                      setIsPriorityFilterOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                      filterPriority === 'LOW'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Low
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <SkeletonPage />
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tasks found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first task.'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterPriority === 'all' && (
              <button
                onClick={openModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Task
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedTasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                    return (
                      <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <h3 className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {task.title}
                          </h3>
                        </td>
                        <td className="px-6 py-4">
                          {task.description ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openStatusModal(task)}
                            className="inline-flex items-center cursor-pointer"
                          >
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.dueDate ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-white'}>
                                {new Date(task.dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.category ? (
                            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              {task.category}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(task)}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredTasks.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-6">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{page * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Math.min((page + 1) * itemsPerPage, filteredTasks.length)}
                  </span>{' '}
                  of <span className="font-medium text-gray-900 dark:text-white">{filteredTasks.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(0)}
                    disabled={page === 0}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    Page {page + 1} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages - 1)}
                    disabled={page >= totalPages - 1}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <TaskModal
          onClose={closeModal}
          onSave={handleCreateTask}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Task Modal */}
      {isEditModalOpen && selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={closeEditModal}
          onSave={(taskData) => handleUpdateTask(taskData)}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Status Selection Modal */}
      {isStatusModalOpen && statusModalTask && (
        <>
          <div className={`modal-backdrop fade ${isStatusModalShowing ? 'show' : ''}`} onClick={closeStatusModal} />
          <div className={`modal fade ${isStatusModalShowing ? 'show' : ''}`} onClick={closeStatusModal} role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                    Change Status
                  </h5>
                  <button type="button" onClick={closeStatusModal} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="modal-body p-6">
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('PENDING')}
                      className={`px-4 py-3 text-left rounded-lg transition-colors ${
                        statusModalTask.status === 'PENDING'
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                      }`}
                    >
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full inline-block ${getStatusColor('PENDING')}`}>
                        Pending
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      className={`px-4 py-3 text-left rounded-lg transition-colors ${
                        statusModalTask.status === 'IN_PROGRESS'
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                      }`}
                    >
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full inline-block ${getStatusColor('IN_PROGRESS')}`}>
                        In Progress
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('COMPLETED')}
                      className={`px-4 py-3 text-left rounded-lg transition-colors ${
                        statusModalTask.status === 'COMPLETED'
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                      }`}
                    >
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full inline-block ${getStatusColor('COMPLETED')}`}>
                        Completed
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('OVERDUE')}
                      className={`px-4 py-3 text-left rounded-lg transition-colors ${
                        statusModalTask.status === 'OVERDUE'
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-transparent'
                      }`}
                    >
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full inline-block ${getStatusColor('OVERDUE')}`}>
                        Overdue
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deleteTask && (
        <>
          <div className={`modal-backdrop fade ${isDeleteModalShowing ? 'show' : ''}`} onClick={closeDeleteModal} />
          <div className={`modal fade ${isDeleteModalShowing ? 'show' : ''}`} onClick={closeDeleteModal} role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                    Delete Task
                  </h5>
                  <button type="button" onClick={closeDeleteModal} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="text-gray-700 dark:text-gray-300">
                    Are you sure you want to delete the task <span className="font-semibold">"{deleteTask.title}"</span>? This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    className="px-5 py-2.5 ml-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Task Modal Component
function TaskModal({
  task,
  onClose,
  onSave,
  isShowing,
}: {
  task?: Task;
  onClose: () => void;
  onSave: (taskData: Partial<Task> & { title: string }) => void;
  isShowing: boolean;
}) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'PENDING');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [category, setCategory] = useState(task?.category || '');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [calendarDate, setCalendarDate] = useState(() => {
    if (task?.dueDate) {
      return new Date(task.dueDate);
    }
    return new Date();
  });
  const statusRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setFullYear(prev.getFullYear() - 1);
      } else {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    const formattedDate = selected.toISOString().split('T')[0];
    setDueDate(formattedDate);
    setIsCalendarOpen(false);
  };

  const handleClearDate = () => {
    setDueDate('');
    setIsCalendarOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDueDate(formattedDate);
    setCalendarDate(today);
    setIsCalendarOpen(false);
  };

  const isSelected = (day: number) => {
    if (!dueDate) return false;
    const selected = new Date(dueDate);
    return (
      selected.getDate() === day &&
      selected.getMonth() === calendarDate.getMonth() &&
      selected.getFullYear() === calendarDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === calendarDate.getMonth() &&
      today.getFullYear() === calendarDate.getFullYear()
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
        setIsPriorityOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    if (isStatusOpen || isPriorityOpen || isCategoryOpen || isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusOpen, isPriorityOpen, isCategoryOpen, isCalendarOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (task) {
      onSave({ title, description, status, priority, dueDate, category } as Partial<Task> & { title: string });
    } else {
      onSave({ title, description, status, priority, dueDate, category, assignedTo: undefined } as Partial<Task> & { title: string });
    }
  };

  return (
    <>
      <div className={`modal-backdrop fade ${isShowing ? 'show' : ''}`} onClick={onClose} />
      <div className={`modal fade ${isShowing ? 'show' : ''}`} onClick={onClose} role="dialog" aria-modal="true" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                {task ? 'Edit Task' : 'Create New Task'}
              </h5>
              <button type="button" onClick={onClose} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <div className="relative" ref={statusRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStatusOpen(!isStatusOpen);
                          setIsPriorityOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <span className="text-sm">
                          {status === 'PENDING' ? 'Pending' :
                           status === 'IN_PROGRESS' ? 'In Progress' :
                           status === 'COMPLETED' ? 'Completed' :
                           'Overdue'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isStatusOpen && (
                        <div className="custom-dropdown-menu absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" style={{ zIndex: 10001, maxHeight: '200px', overflowY: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('PENDING');
                              setIsStatusOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              status === 'PENDING'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Pending
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('IN_PROGRESS');
                              setIsStatusOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              status === 'IN_PROGRESS'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            In Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('COMPLETED');
                              setIsStatusOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              status === 'COMPLETED'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStatus('OVERDUE');
                              setIsStatusOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              status === 'OVERDUE'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Overdue
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <div className="relative" ref={priorityRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPriorityOpen(!isPriorityOpen);
                          setIsStatusOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <span className="text-sm">
                          {priority === 'LOW' ? 'Low' :
                           priority === 'MEDIUM' ? 'Medium' :
                           'High'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isPriorityOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isPriorityOpen && (
                        <div className="custom-dropdown-menu absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" style={{ zIndex: 10001, maxHeight: '200px', overflowY: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setPriority('LOW');
                              setIsPriorityOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              priority === 'LOW'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Low
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPriority('MEDIUM');
                              setIsPriorityOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              priority === 'MEDIUM'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Medium
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPriority('HIGH');
                              setIsPriorityOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              priority === 'HIGH'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            High
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                    <div className="relative" ref={calendarRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCalendarOpen(!isCalendarOpen);
                          setIsStatusOpen(false);
                          setIsPriorityOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <span className="text-sm">
                          {dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'mm/dd/yyyy'}
                        </span>
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      
                      {isCalendarOpen && (
                        <div className="custom-dropdown-menu absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700" style={{ zIndex: 10001 }}>
                          {/* Calendar Header */}
                          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={() => navigateMonth('prev')}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => navigateYear('next')}
                                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                  >
                                    <ChevronUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => navigateYear('prev')}
                                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                  >
                                    <ChevronDown className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                  </button>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigateMonth('next')}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </button>
                            </div>
                          </div>

                          {/* Calendar Days */}
                          <div className="p-4">
                            {/* Day names */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                <div
                                  key={day}
                                  className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1"
                                >
                                  {day}
                                </div>
                              ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                              {/* Empty cells for days before month starts */}
                              {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, index) => (
                                <div key={`empty-${index}`} className="aspect-square"></div>
                              ))}
                              {/* Days of the month */}
                              {Array.from({ length: getDaysInMonth(calendarDate) }, (_, i) => i + 1).map((day) => {
                                const isSelectedDay = isSelected(day);
                                const isTodayDay = isToday(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleDateSelect(day)}
                                    className={`aspect-square rounded text-sm font-medium transition-all ${
                                      isSelectedDay
                                        ? 'bg-primary-600 text-white'
                                        : isTodayDay
                                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                              {/* Days from next month to fill grid */}
                              {(() => {
                                const totalCells = getFirstDayOfMonth(calendarDate) + getDaysInMonth(calendarDate);
                                const remainingCells = 42 - totalCells;
                                return Array.from({ length: remainingCells }, (_, i) => i + 1).map((day) => (
                                  <div
                                    key={`next-${day}`}
                                    className="aspect-square text-sm text-gray-400 dark:text-gray-600"
                                  >
                                    {day}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>

                          {/* Calendar Footer */}
                          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={handleClearDate}
                              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={handleToday}
                              className="px-4 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                            >
                              Today
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <div className="relative" ref={categoryRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryOpen(!isCategoryOpen);
                          setIsStatusOpen(false);
                          setIsPriorityOpen(false);
                          setIsCalendarOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <span className="text-sm">
                          {category || 'Select Category'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isCategoryOpen && (
                        <div className="custom-dropdown-menu absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" style={{ zIndex: 10001, maxHeight: '200px', overflowY: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCategory('');
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              category === ''
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            None
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategory('Work');
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              category === 'Work'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Work
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategory('Personal');
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              category === 'Personal'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Personal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategory('Urgent');
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              category === 'Urgent'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Urgent
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategory('Project');
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                              category === 'Project'
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                          >
                            Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
                <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 ml-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium">
                  {task ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

