import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  Hash,
  Plus,
  Eye,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Warehouse,
  CheckCircle2,
  Clock,
  Calendar,
  Play,
  RefreshCw,
  BarChart3,
  X,
  Edit,
  Trash2,
} from 'lucide-react';
import api from '../lib/api';
import Breadcrumb from '../components/Breadcrumb';
import { SearchInput, DeleteModal, DatePicker } from '../components/ui';
import { ButtonWithWaves, CustomDropdown } from '../components/ui';
import { SkeletonPage } from '../components/Skeleton';

// Types
interface Warehouse {
  id: number;
  name: string;
  location?: string;
  city?: string;
  country?: string;
  isActive: boolean;
}

// // interface Product {
//   id: number;
//   name: string;
//   sku: string;
//   ean?: string;
// }

interface CycleCount {
  id?: string | number;
  countNumber: string;
  warehouseId: number;
  warehouseName?: string;
  countType: 'ABC' | 'FULL' | 'RANDOM' | 'LOCATION_BASED';
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  startDate?: string;
  completedDate?: string;
  assignedTo?: string;
  items: CycleCountItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CycleCountItem {
  id?: string | number;
  productId: number;
  productName?: string;
  sku?: string;
  binLocation?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePercent?: number;
  status: 'PENDING' | 'COUNTED' | 'VERIFIED' | 'DISCREPANCY';
  countedBy?: string;
  countedAt?: string;
  notes?: string;
}

interface PhysicalInventory {
  id?: string | number;
  inventoryNumber: string;
  warehouseId: number;
  warehouseName?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  startDate?: string;
  completedDate?: string;
  assignedTo?: string;
  items: PhysicalInventoryItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PhysicalInventoryItem {
  id?: string | number;
  productId: number;
  productName?: string;
  sku?: string;
  binLocation?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePercent?: number;
  status: 'PENDING' | 'COUNTED' | 'VERIFIED' | 'DISCREPANCY';
  countedBy?: string;
  countedAt?: string;
  notes?: string;
}


export default function Counting() {
  const [activeTab, setActiveTab] = useState<'cycle-counts' | 'physical-inventory'>('cycle-counts');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states for Cycle Counts
  const [isCycleCountCreateModalOpen, setIsCycleCountCreateModalOpen] = useState(false);
  const [isCycleCountViewModalOpen, setIsCycleCountViewModalOpen] = useState(false);
  const [isCycleCountEditModalOpen, setIsCycleCountEditModalOpen] = useState(false);
  const [isCycleCountDeleteModalOpen, setIsCycleCountDeleteModalOpen] = useState(false);
  const [selectedCycleCount, setSelectedCycleCount] = useState<CycleCount | null>(null);
  const [cycleCountToDelete, setCycleCountToDelete] = useState<CycleCount | null>(null);

  // Modal states for Physical Inventory
  const [isPhysicalInventoryCreateModalOpen, setIsPhysicalInventoryCreateModalOpen] = useState(false);
  const [isPhysicalInventoryViewModalOpen, setIsPhysicalInventoryViewModalOpen] = useState(false);
  const [isPhysicalInventoryEditModalOpen, setIsPhysicalInventoryEditModalOpen] = useState(false);
  const [isPhysicalInventoryDeleteModalOpen, setIsPhysicalInventoryDeleteModalOpen] = useState(false);
  const [selectedPhysicalInventory, setSelectedPhysicalInventory] = useState<PhysicalInventory | null>(null);
  const [physicalInventoryToDelete, setPhysicalInventoryToDelete] = useState<PhysicalInventory | null>(null);

  const queryClient = useQueryClient();

  // Fetch warehouses
  const { data: warehousesData, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
  });

  const warehouses: Warehouse[] = useMemo(() => {
    return Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data || []);
  }, [warehousesData]);

  // Fetch cycle counts
  const { data: cycleCountsData } = useQuery({
    queryKey: ['cycle-counts', warehouseFilter !== 'all' ? warehouseFilter : undefined, statusFilter !== 'all' ? statusFilter : undefined],
    queryFn: async () => {
      try {
        const params: any = {};
        if (warehouseFilter !== 'all') params.warehouseId = warehouseFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        const response = await api.get('/counting/cycle-counts', { params });
        return response.data || [];
      } catch (error) {
        console.error('Error fetching cycle counts:', error);
        return [];
      }
    },
  });

  // Fetch physical inventories
  const { data: physicalInventoriesData } = useQuery({
    queryKey: ['physical-inventory', warehouseFilter !== 'all' ? warehouseFilter : undefined, statusFilter !== 'all' ? statusFilter : undefined],
    queryFn: async () => {
      try {
        const params: any = {};
        if (warehouseFilter !== 'all') params.warehouseId = warehouseFilter;
        if (statusFilter !== 'all') params.status = statusFilter;
        const response = await api.get('/counting/physical-inventory', { params });
        return response.data || [];
      } catch (error) {
        console.error('Error fetching physical inventories:', error);
        return [];
      }
    },
  });

  // Transform API data to match frontend types
  const cycleCounts: CycleCount[] = useMemo(() => {
    if (!cycleCountsData) return [];
    return Array.isArray(cycleCountsData) ? cycleCountsData.map((cc: any) => ({
      id: cc.id,
      countNumber: cc.countNumber,
      warehouseId: cc.warehouseId,
      warehouseName: cc.warehouse?.name || '',
      countType: cc.countType,
      status: cc.status,
      scheduledDate: cc.scheduledDate,
      startDate: cc.startDate,
      completedDate: cc.completedDate,
      assignedTo: cc.assignedTo,
      notes: cc.notes,
      items: cc.items || [],
      createdAt: cc.createdAt,
      updatedAt: cc.updatedAt,
    })) : [];
  }, [cycleCountsData]);

  const physicalInventories: PhysicalInventory[] = useMemo(() => {
    if (!physicalInventoriesData) return [];
    return Array.isArray(physicalInventoriesData) ? physicalInventoriesData.map((pi: any) => ({
      id: pi.id,
      inventoryNumber: pi.inventoryNumber,
      warehouseId: pi.warehouseId,
      warehouseName: pi.warehouse?.name || '',
      status: pi.status,
      scheduledDate: pi.scheduledDate,
      startDate: pi.startDate,
      completedDate: pi.completedDate,
      assignedTo: pi.assignedTo,
      notes: pi.notes,
      items: pi.items || [],
      createdAt: pi.createdAt,
      updatedAt: pi.updatedAt,
    })) : [];
  }, [physicalInventoriesData]);

  // Mutations for Cycle Counts
  const createCycleCountMutation = useMutation({
    mutationFn: async (data: Omit<CycleCount, 'id' | 'countNumber' | 'createdAt' | 'updatedAt' | 'warehouseName'>) => {
      const response = await api.post('/counting/cycle-counts', {
        warehouseId: data.warehouseId,
        countType: data.countType,
        scheduledDate: data.scheduledDate,
        assignedTo: data.assignedTo,
        notes: data.notes,
        items: data.items,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-counts'] });
      setIsCycleCountCreateModalOpen(false);
      toast.success('Cycle count created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create cycle count');
    },
  });

  const updateCycleCountMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<CycleCount> }) => {
      const response = await api.patch(`/counting/cycle-counts/${id}`, {
        warehouseId: data.warehouseId,
        countType: data.countType,
        status: data.status,
        scheduledDate: data.scheduledDate,
        startDate: data.startDate,
        completedDate: data.completedDate,
        assignedTo: data.assignedTo,
        notes: data.notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-counts'] });
      setIsCycleCountEditModalOpen(false);
      setSelectedCycleCount(null);
      toast.success('Cycle count updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update cycle count');
    },
  });

  const deleteCycleCountMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/counting/cycle-counts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-counts'] });
      setIsCycleCountDeleteModalOpen(false);
      setCycleCountToDelete(null);
      toast.success('Cycle count deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete cycle count');
    },
  });

  const startCycleCountMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.patch(`/counting/cycle-counts/${id}/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-counts'] });
      toast.success('Cycle count started!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to start cycle count');
    },
  });

  // Mutations for Physical Inventory
  const createPhysicalInventoryMutation = useMutation({
    mutationFn: async (data: Omit<PhysicalInventory, 'id' | 'inventoryNumber' | 'createdAt' | 'updatedAt' | 'warehouseName'>) => {
      const response = await api.post('/counting/physical-inventory', {
        warehouseId: data.warehouseId,
        scheduledDate: data.scheduledDate,
        assignedTo: data.assignedTo,
        notes: data.notes,
        items: data.items,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-inventory'] });
      setIsPhysicalInventoryCreateModalOpen(false);
      toast.success('Physical inventory created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create physical inventory');
    },
  });

  const updatePhysicalInventoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<PhysicalInventory> }) => {
      const response = await api.patch(`/counting/physical-inventory/${id}`, {
        warehouseId: data.warehouseId,
        status: data.status,
        scheduledDate: data.scheduledDate,
        startDate: data.startDate,
        completedDate: data.completedDate,
        assignedTo: data.assignedTo,
        notes: data.notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-inventory'] });
      setIsPhysicalInventoryEditModalOpen(false);
      setSelectedPhysicalInventory(null);
      toast.success('Physical inventory updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update physical inventory');
    },
  });

  const deletePhysicalInventoryMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/counting/physical-inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-inventory'] });
      setIsPhysicalInventoryDeleteModalOpen(false);
      setPhysicalInventoryToDelete(null);
      toast.success('Physical inventory deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete physical inventory');
    },
  });

  const startPhysicalInventoryMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.patch(`/counting/physical-inventory/${id}/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-inventory'] });
      toast.success('Physical inventory started!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to start physical inventory');
    },
  });

  // Handler functions
  const handleCreateCycleCount = (data: Omit<CycleCount, 'id' | 'countNumber' | 'createdAt' | 'updatedAt' | 'warehouseName'>) => {
    createCycleCountMutation.mutate(data);
  };

  const handleUpdateCycleCount = (id: string | number, data: Partial<CycleCount>) => {
    updateCycleCountMutation.mutate({ id, data });
  };

  const handleDeleteCycleCount = () => {
    if (!cycleCountToDelete) return;
    deleteCycleCountMutation.mutate(cycleCountToDelete.id!);
  };

  const handleStartCycleCount = (id: string | number) => {
    startCycleCountMutation.mutate(id);
  };

  const handleCreatePhysicalInventory = (data: Omit<PhysicalInventory, 'id' | 'inventoryNumber' | 'createdAt' | 'updatedAt' | 'warehouseName'>) => {
    createPhysicalInventoryMutation.mutate(data);
  };

  const handleUpdatePhysicalInventory = (id: string | number, data: Partial<PhysicalInventory>) => {
    updatePhysicalInventoryMutation.mutate({ id, data });
  };

  const handleDeletePhysicalInventory = () => {
    if (!physicalInventoryToDelete) return;
    deletePhysicalInventoryMutation.mutate(physicalInventoryToDelete.id!);
  };

  const handleStartPhysicalInventory = (id: string | number) => {
    startPhysicalInventoryMutation.mutate(id);
  };

  // Filter cycle counts
  const filteredCycleCounts = useMemo(() => {
    let filtered = cycleCounts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (count) =>
          count.countNumber.toLowerCase().includes(query) ||
          count.warehouseName?.toLowerCase().includes(query) ||
          count.assignedTo?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((count) => count.status === statusFilter);
    }

    if (warehouseFilter !== 'all') {
      filtered = filtered.filter((count) => count.warehouseId === Number(warehouseFilter));
    }

    return filtered.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }, [cycleCounts, searchQuery, statusFilter, warehouseFilter]);

  // Filter physical inventories
  const filteredPhysicalInventories = useMemo(() => {
    let filtered = physicalInventories;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.inventoryNumber.toLowerCase().includes(query) ||
          inv.warehouseName?.toLowerCase().includes(query) ||
          inv.assignedTo?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }

    if (warehouseFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.warehouseId === Number(warehouseFilter));
    }

    return filtered.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }, [physicalInventories, searchQuery, statusFilter, warehouseFilter]);

  // Pagination
  const currentData = activeTab === 'cycle-counts' ? filteredCycleCounts : filteredPhysicalInventories;
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return currentData.slice(startIndex, startIndex + itemsPerPage);
  }, [currentData, currentPage, itemsPerPage]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const cycleCountsTotal = cycleCounts.length;
    const cycleCountsInProgress = cycleCounts.filter((c) => c.status === 'IN_PROGRESS').length;
    const cycleCountsScheduled = cycleCounts.filter((c) => c.status === 'SCHEDULED').length;
    const cycleCountsCompleted = cycleCounts.filter((c) => c.status === 'COMPLETED').length;

    const physicalInventoryTotal = physicalInventories.length;
    const physicalInventoryInProgress = physicalInventories.filter((p) => p.status === 'IN_PROGRESS').length;
    const physicalInventoryScheduled = physicalInventories.filter((p) => p.status === 'SCHEDULED').length;
    const physicalInventoryCompleted = physicalInventories.filter((p) => p.status === 'COMPLETED').length;

    return {
      cycleCounts: { total: cycleCountsTotal, inProgress: cycleCountsInProgress, scheduled: cycleCountsScheduled, completed: cycleCountsCompleted },
      physicalInventory: { total: physicalInventoryTotal, inProgress: physicalInventoryInProgress, scheduled: physicalInventoryScheduled, completed: physicalInventoryCompleted },
    };
  }, [cycleCounts, physicalInventories]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoadingWarehouses) {
    return <SkeletonPage />;
  }

  const getCountTypeColor = (type: string) => {
    switch (type) {
      case 'ABC':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'FULL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'RANDOM':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'LOCATION_BASED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div>
      <Breadcrumb currentPage="Counting" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Counting</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage cycle counts and physical inventory counts
            </p>
          </div>
          <div>
            <ButtonWithWaves
              onClick={() => {
                if (activeTab === 'cycle-counts') {
                  setIsCycleCountCreateModalOpen(true);
                } else {
                  setIsPhysicalInventoryCreateModalOpen(true);
                }
              }}
              className="!px-4 !py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create {activeTab === 'cycle-counts' ? 'Cycle Count' : 'Physical Inventory'}
            </ButtonWithWaves>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Cycle Counts</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.cycleCounts.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.cycleCounts.inProgress}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.cycleCounts.scheduled}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.cycleCounts.completed}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Physical Inventory</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.physicalInventory.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.physicalInventory.inProgress}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.physicalInventory.scheduled}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.physicalInventory.completed}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => {
                setActiveTab('cycle-counts');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cycle-counts'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Cycle Counts
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('physical-inventory');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'physical-inventory'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Physical Inventory
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <SearchInput
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder={`Search ${activeTab === 'cycle-counts' ? 'cycle counts' : 'physical inventory'}...`}
            />
            <div>
              <CustomDropdown
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SCHEDULED', label: 'Scheduled' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>
            <div>
              <CustomDropdown
                value={warehouseFilter}
                onChange={(value) => {
                  setWarehouseFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Warehouses' },
                  ...warehouses.map((w) => ({ value: w.id.toString(), label: w.name })),
                ]}
              />
            </div>
          </div>

          {/* Table */}
          {paginatedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery || statusFilter !== 'all' || warehouseFilter !== 'all'
                  ? 'No matching items found'
                  : `No ${activeTab === 'cycle-counts' ? 'cycle counts' : 'physical inventory'} found`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {activeTab === 'cycle-counts' ? 'Count #' : 'Inventory #'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Warehouse
                      </th>
                      {activeTab === 'cycle-counts' && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Scheduled Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Items
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedData.map((item: any) => {
                      const warehouse = warehouses.find((w) => w.id === item.warehouseId);
                      const itemsCount = item.items?.length || 0;
                      const completedItems = item.items?.filter((i: any) => i.status === 'COUNTED' || i.status === 'VERIFIED').length || 0;
                      const progress = itemsCount > 0 ? Math.round((completedItems / itemsCount) * 100) : 0;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {activeTab === 'cycle-counts' ? item.countNumber : item.inventoryNumber}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {warehouse?.name || item.warehouseName || 'Unknown'}
                          </td>
                          {activeTab === 'cycle-counts' && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCountTypeColor(item.countType)}`}
                              >
                                {item.countType}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(item.scheduledDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {completedItems} / {itemsCount}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-primary-600 h-1.5 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  if (activeTab === 'cycle-counts') {
                                    setSelectedCycleCount(item);
                                    setIsCycleCountViewModalOpen(true);
                                  } else {
                                    setSelectedPhysicalInventory(item);
                                    setIsPhysicalInventoryViewModalOpen(true);
                                  }
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {item.status === 'DRAFT' && (
                                <button
                                  onClick={() => {
                                    if (activeTab === 'cycle-counts') {
                                      setSelectedCycleCount(item);
                                      setIsCycleCountEditModalOpen(true);
                                    } else {
                                      setSelectedPhysicalInventory(item);
                                      setIsPhysicalInventoryEditModalOpen(true);
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {item.status === 'SCHEDULED' && (
                                <button
                                  onClick={() => {
                                    if (activeTab === 'cycle-counts') {
                                      handleStartCycleCount(item.id!);
                                    } else {
                                      handleStartPhysicalInventory(item.id!);
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                  title="Start Count"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              {(item.status === 'DRAFT' || item.status === 'SCHEDULED' || item.status === 'CANCELLED') && (
                                <button
                                  onClick={() => {
                                    if (activeTab === 'cycle-counts') {
                                      setCycleCountToDelete(item);
                                      setIsCycleCountDeleteModalOpen(true);
                                    } else {
                                      setPhysicalInventoryToDelete(item);
                                      setIsPhysicalInventoryDeleteModalOpen(true);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> items
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 rotate-90" />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300 px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cycle Count Modals */}
      {isCycleCountCreateModalOpen && (
        <CreateEditCycleCountModal
          warehouses={warehouses}
          onClose={() => setIsCycleCountCreateModalOpen(false)}
          onSubmit={handleCreateCycleCount}
        />
      )}

      {isCycleCountEditModalOpen && selectedCycleCount && (
        <CreateEditCycleCountModal
          cycleCount={selectedCycleCount}
          warehouses={warehouses}
          onClose={() => {
            setIsCycleCountEditModalOpen(false);
            setSelectedCycleCount(null);
          }}
          onSubmit={(data) => handleUpdateCycleCount(selectedCycleCount.id!, data)}
        />
      )}

      {isCycleCountViewModalOpen && selectedCycleCount && (
        <ViewCycleCountModal
          cycleCount={selectedCycleCount}
          warehouses={warehouses}
          onClose={() => {
            setIsCycleCountViewModalOpen(false);
            setSelectedCycleCount(null);
          }}
        />
      )}

      {isCycleCountDeleteModalOpen && cycleCountToDelete && (
        <DeleteModal
          title="Delete Cycle Count"
          message="Are you sure you want to delete cycle count"
          itemName={cycleCountToDelete.countNumber}
          onClose={() => {
            setIsCycleCountDeleteModalOpen(false);
            setCycleCountToDelete(null);
          }}
          onConfirm={handleDeleteCycleCount}
        />
      )}

      {/* Physical Inventory Modals */}
      {isPhysicalInventoryCreateModalOpen && (
        <CreateEditPhysicalInventoryModal
          warehouses={warehouses}
          onClose={() => setIsPhysicalInventoryCreateModalOpen(false)}
          onSubmit={handleCreatePhysicalInventory}
        />
      )}

      {isPhysicalInventoryEditModalOpen && selectedPhysicalInventory && (
        <CreateEditPhysicalInventoryModal
          physicalInventory={selectedPhysicalInventory}
          warehouses={warehouses}
          onClose={() => {
            setIsPhysicalInventoryEditModalOpen(false);
            setSelectedPhysicalInventory(null);
          }}
          onSubmit={(data) => handleUpdatePhysicalInventory(selectedPhysicalInventory.id!, data)}
        />
      )}

      {isPhysicalInventoryViewModalOpen && selectedPhysicalInventory && (
        <ViewPhysicalInventoryModal
          physicalInventory={selectedPhysicalInventory}
          warehouses={warehouses}
          onClose={() => {
            setIsPhysicalInventoryViewModalOpen(false);
            setSelectedPhysicalInventory(null);
          }}
        />
      )}

      {isPhysicalInventoryDeleteModalOpen && physicalInventoryToDelete && (
        <DeleteModal
          title="Delete Physical Inventory"
          message="Are you sure you want to delete physical inventory"
          itemName={physicalInventoryToDelete.inventoryNumber}
          onClose={() => {
            setIsPhysicalInventoryDeleteModalOpen(false);
            setPhysicalInventoryToDelete(null);
          }}
          onConfirm={handleDeletePhysicalInventory}
        />
      )}
    </div>
  );
}

// Create/Edit Cycle Count Modal Component
function CreateEditCycleCountModal({
  cycleCount,
  warehouses,
  onClose,
  onSubmit,
}: {
  cycleCount?: CycleCount;
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: Omit<CycleCount, 'id' | 'countNumber' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [formData, setFormData] = useState({
    warehouseId: cycleCount?.warehouseId.toString() || '',
    countType: cycleCount?.countType || 'ABC',
    scheduledDate: cycleCount?.scheduledDate || new Date().toISOString().split('T')[0],
    assignedTo: cycleCount?.assignedTo || '',
    notes: cycleCount?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.warehouseId) {
      newErrors.warehouseId = 'Warehouse is required';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      warehouseId: Number(formData.warehouseId),
      warehouseName: warehouses.find((w) => w.id === Number(formData.warehouseId))?.name,
      countType: formData.countType as CycleCount['countType'],
      status: cycleCount?.status || 'DRAFT',
      scheduledDate: formData.scheduledDate,
      assignedTo: formData.assignedTo || undefined,
      items: cycleCount?.items || [],
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {cycleCount ? 'Edit Cycle Count' : 'Create Cycle Count'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.warehouseId}
                onChange={(value) => {
                  setFormData({ ...formData, warehouseId: value });
                  if (errors.warehouseId) setErrors({ ...errors, warehouseId: '' });
                }}
                options={warehouses.map((w) => ({ value: w.id.toString(), label: w.name }))}
                placeholder="Select warehouse"
                error={!!errors.warehouseId}
              />
              {errors.warehouseId && <p className="mt-1 text-sm text-red-500">{errors.warehouseId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Count Type <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.countType}
                onChange={(value) => setFormData({ ...formData, countType: value as 'ABC' | 'FULL' | 'RANDOM' | 'LOCATION_BASED' })}
                options={[
                  { value: 'ABC', label: 'ABC Analysis' },
                  { value: 'FULL', label: 'Full Count' },
                  { value: 'RANDOM', label: 'Random Sample' },
                  { value: 'LOCATION_BASED', label: 'Location Based' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={formData.scheduledDate || null}
                onChange={(date) => {
                  setFormData({ ...formData, scheduledDate: date || '' });
                  if (errors.scheduledDate) setErrors({ ...errors, scheduledDate: '' });
                }}
                placeholder="Select date"
              />
              {errors.scheduledDate && <p className="mt-1 text-sm text-red-500">{errors.scheduledDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned To</label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="User name or email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex text-[14px] items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {cycleCount ? 'Update' : 'Create'} Cycle Count
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Cycle Count Modal Component
function ViewCycleCountModal({
  cycleCount,
  warehouses,
  onClose,
}: {
  cycleCount: CycleCount;
  warehouses: Warehouse[];
  onClose: () => void;
}) {
  const warehouse = warehouses.find((w) => w.id === cycleCount.warehouseId);
  const itemsCount = cycleCount.items?.length || 0;
  const completedItems = cycleCount.items?.filter((i) => i.status === 'COUNTED' || i.status === 'VERIFIED').length || 0;
  const progress = itemsCount > 0 ? Math.round((completedItems / itemsCount) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getCountTypeColor = (type: string) => {
    switch (type) {
      case 'ABC':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'FULL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'RANDOM':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'LOCATION_BASED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cycle Count Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Count Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{cycleCount.countNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cycleCount.status)}`}>
                {cycleCount.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Warehouse</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{warehouse?.name || cycleCount.warehouseName || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Count Type</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCountTypeColor(cycleCount.countType)}`}>
                {cycleCount.countType}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Scheduled Date</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(cycleCount.scheduledDate).toLocaleDateString()}
              </p>
            </div>
            {cycleCount.startDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(cycleCount.startDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {cycleCount.completedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Completed Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(cycleCount.completedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {cycleCount.assignedTo && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned To</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{cycleCount.assignedTo}</p>
              </div>
            )}
          </div>

          {cycleCount.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{cycleCount.notes}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Progress</label>
              <span className="text-sm text-gray-500 dark:text-gray-400">{completedItems} / {itemsCount} items</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {cycleCount.items && cycleCount.items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Items</label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">System Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Counted Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Variance</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cycleCount.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.productName || 'Unknown'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.sku || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.systemQuantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.countedQuantity ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {item.variance !== undefined ? (item.variance > 0 ? '+' : '') + item.variance : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            item.status === 'COUNTED' || item.status === 'VERIFIED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : item.status === 'DISCREPANCY'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create/Edit Physical Inventory Modal Component
function CreateEditPhysicalInventoryModal({
  physicalInventory,
  warehouses,
  onClose,
  onSubmit,
}: {
  physicalInventory?: PhysicalInventory;
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: Omit<PhysicalInventory, 'id' | 'inventoryNumber' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [formData, setFormData] = useState({
    warehouseId: physicalInventory?.warehouseId.toString() || '',
    scheduledDate: physicalInventory?.scheduledDate || new Date().toISOString().split('T')[0],
    assignedTo: physicalInventory?.assignedTo || '',
    notes: physicalInventory?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.warehouseId) {
      newErrors.warehouseId = 'Warehouse is required';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      warehouseId: Number(formData.warehouseId),
      warehouseName: warehouses.find((w) => w.id === Number(formData.warehouseId))?.name,
      status: physicalInventory?.status || 'DRAFT',
      scheduledDate: formData.scheduledDate,
      assignedTo: formData.assignedTo || undefined,
      items: physicalInventory?.items || [],
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {physicalInventory ? 'Edit Physical Inventory' : 'Create Physical Inventory'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.warehouseId}
                onChange={(value) => {
                  setFormData({ ...formData, warehouseId: value });
                  if (errors.warehouseId) setErrors({ ...errors, warehouseId: '' });
                }}
                options={warehouses.map((w) => ({ value: w.id.toString(), label: w.name }))}
                placeholder="Select warehouse"
                error={!!errors.warehouseId}
              />
              {errors.warehouseId && <p className="mt-1 text-sm text-red-500">{errors.warehouseId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={formData.scheduledDate || null}
                onChange={(date) => {
                  setFormData({ ...formData, scheduledDate: date || '' });
                  if (errors.scheduledDate) setErrors({ ...errors, scheduledDate: '' });
                }}
                placeholder="Select date"
              />
              {errors.scheduledDate && <p className="mt-1 text-sm text-red-500">{errors.scheduledDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned To</label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="User name or email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex text-[14px] items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {physicalInventory ? 'Update' : 'Create'} Physical Inventory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Physical Inventory Modal Component
function ViewPhysicalInventoryModal({
  physicalInventory,
  warehouses,
  onClose,
}: {
  physicalInventory: PhysicalInventory;
  warehouses: Warehouse[];
  onClose: () => void;
}) {
  const warehouse = warehouses.find((w) => w.id === physicalInventory.warehouseId);
  const itemsCount = physicalInventory.items?.length || 0;
  const completedItems = physicalInventory.items?.filter((i) => i.status === 'COUNTED' || i.status === 'VERIFIED').length || 0;
  const progress = itemsCount > 0 ? Math.round((completedItems / itemsCount) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Physical Inventory Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Inventory Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{physicalInventory.inventoryNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(physicalInventory.status)}`}>
                {physicalInventory.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Warehouse</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{warehouse?.name || physicalInventory.warehouseName || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Scheduled Date</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(physicalInventory.scheduledDate).toLocaleDateString()}
              </p>
            </div>
            {physicalInventory.startDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(physicalInventory.startDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {physicalInventory.completedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Completed Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(physicalInventory.completedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {physicalInventory.assignedTo && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned To</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{physicalInventory.assignedTo}</p>
              </div>
            )}
          </div>

          {physicalInventory.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{physicalInventory.notes}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Progress</label>
              <span className="text-sm text-gray-500 dark:text-gray-400">{completedItems} / {itemsCount} items</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {physicalInventory.items && physicalInventory.items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Items</label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">System Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Counted Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Variance</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {physicalInventory.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.productName || 'Unknown'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.sku || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.systemQuantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.countedQuantity ?? '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {item.variance !== undefined ? (item.variance > 0 ? '+' : '') + item.variance : '—'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            item.status === 'COUNTED' || item.status === 'VERIFIED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : item.status === 'DISCREPANCY'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

