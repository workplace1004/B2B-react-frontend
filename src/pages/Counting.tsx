import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import {
  Hash,
  Plus,
  Eye,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Search,
  Warehouse,
  CheckCircle2,
  Clock,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import api from '../lib/api';
import Breadcrumb from '../components/Breadcrumb';
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
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [physicalInventories, setPhysicalInventories] = useState<PhysicalInventory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Local storage keys
  const CYCLE_COUNTS_KEY = 'counting_cycle_counts';
  const PHYSICAL_INVENTORY_KEY = 'counting_physical_inventory';

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

  // Load data from localStorage
  useEffect(() => {
    try {
      const storedCycleCounts = localStorage.getItem(CYCLE_COUNTS_KEY);
      if (storedCycleCounts) {
        setCycleCounts(JSON.parse(storedCycleCounts));
      }
    } catch (error) {
      console.error('Error loading cycle counts:', error);
    }

    try {
      const storedPhysicalInventory = localStorage.getItem(PHYSICAL_INVENTORY_KEY);
      if (storedPhysicalInventory) {
        setPhysicalInventories(JSON.parse(storedPhysicalInventory));
      }
    } catch (error) {
      console.error('Error loading physical inventory:', error);
    }
  }, []);

  // Save cycle counts (unused but kept for future use)
  // const saveCycleCounts = (counts: CycleCount[]) => {
  //   try {
  //     localStorage.setItem(CYCLE_COUNTS_KEY, JSON.stringify(counts));
  //   } catch (error) {
  //     console.error('Error saving cycle counts:', error);
  //   }
  // };

  // Save physical inventory (unused but kept for future use)
  // const savePhysicalInventory = (inventories: PhysicalInventory[]) => {
  //   try {
  //     localStorage.setItem(PHYSICAL_INVENTORY_KEY, JSON.stringify(inventories));
  //   } catch (error) {
  //     console.error('Error saving physical inventory:', error);
  //   }
  // };

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
            <div className='relative'>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'cycle-counts' ? 'cycle counts' : 'physical inventory'}...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
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
              {!searchQuery && statusFilter === 'all' && warehouseFilter === 'all' && (
                <ButtonWithWaves onClick={() => {}} className="!px-3 !py-2">
                  <Plus className="w-4 h-4" />
                  Create {activeTab === 'cycle-counts' ? 'Cycle Count' : 'Physical Inventory'}
                </ButtonWithWaves>
              )}
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
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {item.status === 'SCHEDULED' && (
                                <button
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                  title="Start Count"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              {item.status === 'IN_PROGRESS' && (
                                <button
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 p-1 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                                  title="Pause Count"
                                >
                                  <Pause className="w-4 h-4" />
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
    </div>
  );
}

