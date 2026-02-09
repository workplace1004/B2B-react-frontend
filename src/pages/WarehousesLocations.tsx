import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  MapPin,
  Plus,
  X,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Trash2,
  ChevronDown,
  Search,
  Warehouse,
  Box,
  Settings,
  CheckCircle2,
  XCircle,
  Hash,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { ButtonWithWaves, CustomDropdown, SearchInput, DeleteModal } from '../components/ui';

// Types
interface Warehouse {
  id: number;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  tplReference?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    inventory: number;
  };
}

interface Bin {
  id?: string | number;
  warehouseId: number;
  binCode: string; // e.g., "A-01-01" (Aisle-Shelf-Position)
  location?: string;
  zone?: string;
  binType: 'PICKING' | 'STORAGE' | 'BULK' | 'QUARANTINE' | 'RETURNS';
  maxCapacity?: number;
  currentCapacity?: number;
  isActive: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PutAwayRule {
  id?: string | number;
  warehouseId: number;
  name: string;
  priority: number;
  conditions: {
    productCategory?: string;
    productType?: string;
    size?: string;
    weight?: number;
    temperature?: string;
    hazardous?: boolean;
  };
  actions: {
    preferredZone?: string;
    preferredBinType?: Bin['binType'];
    avoidZones?: string[];
    maxHeight?: number;
    stackingAllowed?: boolean;
  };
  isActive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}


// Waves effect button component
export default function WarehousesLocations() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBinsModalOpen, setIsBinsModalOpen] = useState(false);
  const [isBinsModalShowing, setIsBinsModalShowing] = useState(false);
  const [isPutAwayRulesModalOpen, setIsPutAwayRulesModalOpen] = useState(false);
  const [isPutAwayRulesModalShowing, setIsPutAwayRulesModalShowing] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<number>>(new Set());
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  // Local storage keys for bins and put-away rules
  const BINS_KEY = 'warehouse_bins';
  const PUT_AWAY_RULES_KEY = 'warehouse_put_away_rules';

  // Handle body scroll lock when modal is open
  useEffect(() => {
    const modalsOpen = isModalOpen || isEditModalOpen || isDeleteModalOpen || isBinsModalOpen || isPutAwayRulesModalOpen;
    if (modalsOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isModalOpen) setIsModalShowing(true);
          if (isEditModalOpen) setIsEditModalShowing(true);
          if (isBinsModalOpen) setIsBinsModalShowing(true);
          if (isPutAwayRulesModalOpen) setIsPutAwayRulesModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
      setIsEditModalShowing(false);
      setIsBinsModalShowing(false);
      setIsPutAwayRulesModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen, isBinsModalOpen, isPutAwayRulesModalOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', currentPage, itemsPerPage],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data;
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
  });

  // Filter and search warehouses
  const warehouses = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data?.data || []);
  }, [data]);

  const filteredWarehouses = useMemo(() => {
    let filtered = warehouses;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((warehouse: Warehouse) =>
        warehouse.name.toLowerCase().includes(query) ||
        warehouse.location?.toLowerCase().includes(query) ||
        warehouse.city?.toLowerCase().includes(query) ||
        warehouse.country?.toLowerCase().includes(query) ||
        warehouse.address?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((warehouse: Warehouse) => 
        statusFilter === 'active' ? warehouse.isActive : !warehouse.isActive
      );
    }

    return filtered;
  }, [warehouses, searchQuery, statusFilter]);

  // Pagination
  const totalWarehouses = filteredWarehouses.length;
  const totalPages = Math.ceil(totalWarehouses / itemsPerPage);
  const paginatedWarehouses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredWarehouses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWarehouses, currentPage, itemsPerPage]);

  // Load bins for warehouses
  const [binsData, setBinsData] = useState<Record<number, Bin[]>>({});
  const [putAwayRulesData, setPutAwayRulesData] = useState<Record<number, PutAwayRule[]>>({});

  useEffect(() => {
    // Load bins from localStorage
    try {
      const storedBins = localStorage.getItem(BINS_KEY);
      if (storedBins) {
        const allBins: Bin[] = JSON.parse(storedBins);
        const binsByWarehouse: Record<number, Bin[]> = {};
        allBins.forEach((bin) => {
          if (!binsByWarehouse[bin.warehouseId]) {
            binsByWarehouse[bin.warehouseId] = [];
          }
          binsByWarehouse[bin.warehouseId].push(bin);
        });
        setBinsData(binsByWarehouse);
      }
    } catch (error) {
      console.error('Error loading bins:', error);
    }

    // Load put-away rules from localStorage
    try {
      const storedRules = localStorage.getItem(PUT_AWAY_RULES_KEY);
      if (storedRules) {
        const allRules: PutAwayRule[] = JSON.parse(storedRules);
        const rulesByWarehouse: Record<number, PutAwayRule[]> = {};
        allRules.forEach((rule) => {
          if (!rulesByWarehouse[rule.warehouseId]) {
            rulesByWarehouse[rule.warehouseId] = [];
          }
          rulesByWarehouse[rule.warehouseId].push(rule);
        });
        setPutAwayRulesData(rulesByWarehouse);
      }
    } catch (error) {
      console.error('Error loading put-away rules:', error);
    }
  }, []);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = warehouses.length;
    const active = warehouses.filter((w: Warehouse) => w.isActive).length;
    const inactive = warehouses.filter((w: Warehouse) => !w.isActive).length;
    const totalBins = Object.values(binsData).reduce((sum, bins) => sum + bins.length, 0);
    const totalRules = Object.values(putAwayRulesData).reduce((sum, rules) => sum + rules.length, 0);

    return { total, active, inactive, totalBins, totalRules };
  }, [warehouses, binsData, putAwayRulesData]);

  const createWarehouseMutation = useMutation({
    mutationFn: async (warehouseData: any) => {
      const response = await api.post('/warehouses', warehouseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create warehouse';
      toast.error(errorMessage);
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: async ({ id, warehouseData }: { id: number; warehouseData: any }) => {
      const response = await api.patch(`/warehouses/${id}`, warehouseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update warehouse';
      toast.error(errorMessage);
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/warehouses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete warehouse';
      toast.error(errorMessage);
    },
  });

  const toggleWarehouseExpansion = (warehouseId: number) => {
    setExpandedWarehouses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(warehouseId)) {
        newSet.delete(warehouseId);
      } else {
        newSet.add(warehouseId);
      }
      return newSet;
    });
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedWarehouse(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedWarehouse(null);
  };

  const openBinsModal = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsBinsModalOpen(true);
  };

  const closeBinsModal = () => {
    setIsBinsModalShowing(false);
    setTimeout(() => {
      setIsBinsModalOpen(false);
      setSelectedWarehouse(null);
    }, 300);
  };

  const openPutAwayRulesModal = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsPutAwayRulesModalOpen(true);
  };

  const closePutAwayRulesModal = () => {
    setIsPutAwayRulesModalShowing(false);
    setTimeout(() => {
      setIsPutAwayRulesModalOpen(false);
      setSelectedWarehouse(null);
    }, 300);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Warehouses & Locations" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Warehouses & Locations</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage warehouses, bins/locations, and put-away rules
            </p>
          </div>
          <ButtonWithWaves className='text-[14px]' onClick={openModal}>
            <Plus className="w-4 h-4" />
            Add Warehouse
          </ButtonWithWaves>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Warehouses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.active}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.inactive}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bins</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.totalBins}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Box className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Put-Away Rules</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.totalRules}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <SearchInput
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            placeholder="Search warehouses by name, location, city, country, or address..."
            className="flex-1"
          />
          <div className="w-full md:w-48">
            <CustomDropdown
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {paginatedWarehouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Warehouse className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No warehouses found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first warehouse'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bins
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rules
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedWarehouses.map((warehouse: Warehouse) => {
                    const isExpanded = expandedWarehouses.has(warehouse.id);
                    const bins = binsData[warehouse.id] || [];
                    const rules = putAwayRulesData[warehouse.id] || [];
                    
                    return (
                      <>
                        <tr
                          key={warehouse.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleWarehouseExpansion(warehouse.id)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 rotate-180" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-3">
                                <Warehouse className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {warehouse.name}
                                </div>
                                {warehouse.tplReference && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    3PL: {warehouse.tplReference}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {warehouse.location || warehouse.city || warehouse.country ? (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span>
                                    {[warehouse.location, warehouse.city, warehouse.country]
                                      .filter(Boolean)
                                      .join(', ') || '—'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                warehouse.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {warehouse.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {bins.length} bin{bins.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rules.length} rule{rules.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-start gap-2">
                              <button
                                onClick={() => openBinsModal(warehouse)}
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                title="Manage Bins"
                              >
                                <Box className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openPutAwayRulesModal(warehouse)}
                                className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                title="Put-Away Rules"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedWarehouse(warehouse);
                                  setIsEditModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedWarehouse(warehouse);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded Row - Bins Preview */}
                        {isExpanded && (
                          <tr className="bg-gray-50 dark:bg-gray-700/30">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="space-y-4">
                                {/* Bins Section */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                      <Box className="w-4 h-4" />
                                      Bins/Locations ({bins.length})
                                    </h4>
                                    <button
                                      onClick={() => openBinsModal(warehouse)}
                                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                    >
                                      Manage Bins
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {bins.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      {bins.slice(0, 6).map((bin) => (
                                        <div
                                          key={bin.id}
                                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {bin.binCode}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {bin.zone || 'No zone'} • {bin.binType}
                                              </div>
                                            </div>
                                            <span
                                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                bin.isActive
                                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                              }`}
                                            >
                                              {bin.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                      {bins.length > 6 && (
                                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-3 flex items-center justify-center">
                                          <span className="text-sm text-gray-500 dark:text-gray-400">
                                            +{bins.length - 6} more
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      No bins configured. Click "Manage Bins" to add bins/locations.
                                    </p>
                                  )}
                                </div>

                                {/* Put-Away Rules Section */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                      <Settings className="w-4 h-4" />
                                      Put-Away Rules ({rules.length})
                                    </h4>
                                    <button
                                      onClick={() => openPutAwayRulesModal(warehouse)}
                                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                    >
                                      Manage Rules
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {rules.length > 0 ? (
                                    <div className="space-y-2">
                                      {rules.slice(0, 3).map((rule) => (
                                        <div
                                          key={rule.id}
                                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {rule.name}
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Priority: {rule.priority}
                                                {rule.actions.preferredZone && ` • Zone: ${rule.actions.preferredZone}`}
                                              </div>
                                            </div>
                                            <span
                                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                rule.isActive
                                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                              }`}
                                            >
                                              {rule.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                      {rules.length > 3 && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          +{rules.length - 3} more rule{rules.length - 3 !== 1 ? 's' : ''}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      No put-away rules configured. Click "Manage Rules" to add put-away rules.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalWarehouses)}
                  </span>{' '}
                  of <span className="font-medium">{totalWarehouses}</span> warehouses
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

      {/* Add Warehouse Modal */}
      {isModalOpen && (
        <AddWarehouseModal
          onClose={closeModal}
          onSubmit={(warehouseData) => createWarehouseMutation.mutate(warehouseData)}
          isLoading={createWarehouseMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Warehouse Modal */}
      {isEditModalOpen && selectedWarehouse && (
        <EditWarehouseModal
          warehouse={selectedWarehouse}
          onClose={closeEditModal}
          onSubmit={(warehouseData) => updateWarehouseMutation.mutate({ id: selectedWarehouse.id, warehouseData })}
          isLoading={updateWarehouseMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Warehouse Modal */}
      {isDeleteModalOpen && selectedWarehouse && (
        <DeleteModal
          title="Delete Warehouse"
          message="Are you sure you want to delete"
          itemName={selectedWarehouse.name}
          onClose={closeDeleteModal}
          onConfirm={() => deleteWarehouseMutation.mutate(selectedWarehouse.id)}
          isLoading={deleteWarehouseMutation.isPending}
        />
      )}

      {/* Bins Modal */}
      {isBinsModalOpen && selectedWarehouse && (
        <BinsModal
          warehouse={selectedWarehouse}
          onClose={closeBinsModal}
          isShowing={isBinsModalShowing}
          storageKey={BINS_KEY}
          onUpdate={(bins) => {
            setBinsData((prev) => ({ ...prev, [selectedWarehouse.id]: bins }));
          }}
        />
      )}

      {/* Put-Away Rules Modal */}
      {isPutAwayRulesModalOpen && selectedWarehouse && (
        <PutAwayRulesModal
          warehouse={selectedWarehouse}
          onClose={closePutAwayRulesModal}
          isShowing={isPutAwayRulesModalShowing}
          storageKey={PUT_AWAY_RULES_KEY}
          onUpdate={(rules) => {
            setPutAwayRulesData((prev) => ({ ...prev, [selectedWarehouse.id]: rules }));
          }}
        />
      )}
    </div>
  );
}

// Add Warehouse Modal Component
function AddWarehouseModal({
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    tplReference: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const warehouseData = {
      ...formData,
      location: formData.location || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      postalCode: formData.postalCode || undefined,
      tplReference: formData.tplReference || undefined,
    };

    onSubmit(warehouseData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white">Add Warehouse</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={`w-full px-4 py-2 ::placeholder-[12px] text-[14px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter warehouse name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Location identifier"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                3PL Reference
              </label>
              <input
                type="text"
                value={formData.tplReference}
                onChange={(e) => setFormData({ ...formData, tplReference: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="3PL reference"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Postal code"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center text-[14px] justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Warehouse Modal Component
function EditWarehouseModal({
  warehouse,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  warehouse: Warehouse;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    name: warehouse.name,
    location: warehouse.location || '',
    address: warehouse.address || '',
    city: warehouse.city || '',
    country: warehouse.country || '',
    postalCode: warehouse.postalCode || '',
    tplReference: warehouse.tplReference || '',
    isActive: warehouse.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const warehouseData = {
      ...formData,
      location: formData.location || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      postalCode: formData.postalCode || undefined,
      tplReference: formData.tplReference || undefined,
    };

    onSubmit(warehouseData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white">Edit Warehouse</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={`w-full ::placeholder-[12px] text-[14px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter warehouse name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Location identifier"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                3PL Reference
              </label>
              <input
                type="text"
                value={formData.tplReference}
                onChange={(e) => setFormData({ ...formData, tplReference: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="3PL reference"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Postal code"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex text-[14px] items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Updating...' : 'Update Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Bins Modal Component
function BinsModal({
  warehouse,
  onClose,
  isShowing,
  storageKey,
  onUpdate,
}: {
  warehouse: Warehouse;
  onClose: () => void;
  isShowing: boolean;
  storageKey: string;
  onUpdate: (bins: Bin[]) => void;
}) {
  const [bins, setBins] = useState<Bin[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Load bins from localStorage
  useEffect(() => {
    if (isShowing) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const allBins: Bin[] = JSON.parse(stored);
          const warehouseBins = allBins
            .filter((b) => b.warehouseId === warehouse.id)
            .sort((a, b) => a.binCode.localeCompare(b.binCode));
          setBins(warehouseBins);
        } catch (error) {
          console.error('Error loading bins:', error);
        }
      }
    }
  }, [isShowing, warehouse.id, storageKey]);

  // Save bins to localStorage
  const saveBins = (newBins: Bin[]) => {
    const stored = localStorage.getItem(storageKey);
    let allBins: Bin[] = [];
    if (stored) {
      try {
        allBins = JSON.parse(stored);
        allBins = allBins.filter((b) => b.warehouseId !== warehouse.id);
      } catch (error) {
        console.error('Error parsing stored bins:', error);
      }
    }
    allBins = [...allBins, ...newBins];
    localStorage.setItem(storageKey, JSON.stringify(allBins));
  };

  const handleAddBin = (binData: Omit<Bin, 'id' | 'warehouseId'> | Partial<Bin>) => {
    const fullData = binData as Omit<Bin, 'id' | 'warehouseId'>;
    const newBin: Bin = {
      ...fullData,
      id: Date.now().toString(),
      warehouseId: warehouse.id,
      currentCapacity: fullData.currentCapacity || 0,
    };
    const updated = [...bins, newBin].sort((a, b) => a.binCode.localeCompare(b.binCode));
    setBins(updated);
    saveBins(updated);
    onUpdate(updated);
    setIsAddModalOpen(false);
    toast.success('Bin added successfully!');
  };

  const handleUpdateBin = (id: string | number, binData: Partial<Bin>) => {
    const updated = bins.map((b) => (b.id === id ? { ...b, ...binData } : b));
    setBins(updated);
    saveBins(updated);
    onUpdate(updated);
    setEditingBin(null);
    toast.success('Bin updated successfully!');
  };

  const handleDeleteBin = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this bin?')) {
      const updated = bins.filter((b) => b.id !== id);
      setBins(updated);
      saveBins(updated);
      onUpdate(updated);
      toast.success('Bin deleted successfully!');
    }
  };

  // Get unique zones
  const zones = useMemo(() => {
    const zoneSet = new Set<string>();
    bins.forEach((bin) => {
      if (bin.zone) zoneSet.add(bin.zone);
    });
    return Array.from(zoneSet).sort();
  }, [bins]);

  // Filter bins
  const filteredBins = useMemo(() => {
    let filtered = bins;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (bin) =>
          bin.binCode.toLowerCase().includes(query) ||
          bin.location?.toLowerCase().includes(query) ||
          bin.zone?.toLowerCase().includes(query)
      );
    }

    // Filter by zone
    if (zoneFilter !== 'all') {
      filtered = filtered.filter((bin) => bin.zone === zoneFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((bin) => bin.binType === typeFilter);
    }

    return filtered;
  }, [bins, searchQuery, zoneFilter, typeFilter]);

  const getBinTypeColor = (type: Bin['binType']) => {
    switch (type) {
      case 'PICKING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'STORAGE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'BULK':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'QUARANTINE':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'RETURNS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bins/Locations</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{warehouse.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonWithWaves onClick={() => setIsAddModalOpen(true)} className="!px-3 !py-2">
              <Plus className="w-4 h-4" />
              Add Bin
            </ButtonWithWaves>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by bin code, location, or zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[14px] ::placeholder-[12px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <CustomDropdown
                value={zoneFilter}
                onChange={setZoneFilter}
                options={[
                  { value: 'all', label: 'All Zones' },
                  ...zones.map((zone) => ({ value: zone, label: zone })),
                ]}
                placeholder="Filter by zone"
              />
            </div>
            <div>
              <CustomDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'PICKING', label: 'Picking' },
                  { value: 'STORAGE', label: 'Storage' },
                  { value: 'BULK', label: 'Bulk' },
                  { value: 'QUARANTINE', label: 'Quarantine' },
                  { value: 'RETURNS', label: 'Returns' },
                ]}
                placeholder="Filter by type"
              />
            </div>
          </div>

          {/* Bins Table */}
          {filteredBins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Box className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || zoneFilter !== 'all' || typeFilter !== 'all'
                  ? 'No matching bins found'
                  : 'No bins configured yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Bin Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Zone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Capacity
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
                  {filteredBins.map((bin) => (
                    <tr key={bin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {bin.binCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {bin.zone || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {bin.location || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBinTypeColor(bin.binType)}`}
                        >
                          {bin.binType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {bin.maxCapacity
                          ? `${bin.currentCapacity || 0} / ${bin.maxCapacity}`
                          : bin.currentCapacity || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            bin.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {bin.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingBin(bin)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBin(bin.id!)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Bin Modal */}
        {(isAddModalOpen || editingBin) && (
          <AddEditBinModal
            bin={editingBin || undefined}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingBin(null);
            }}
            onSubmit={
              editingBin
                ? (data) => handleUpdateBin(editingBin.id!, data)
                : handleAddBin
            }
          />
        )}
      </div>
    </div>
  );
}

// Add/Edit Bin Modal Component
function AddEditBinModal({
  bin,
  onClose,
  onSubmit,
}: {
  bin?: Bin;
  onClose: () => void;
  onSubmit: (data: Omit<Bin, 'id' | 'warehouseId'> | Partial<Bin>) => void;
}) {
  const [formData, setFormData] = useState({
    binCode: bin?.binCode || '',
    location: bin?.location || '',
    zone: bin?.zone || '',
    binType: bin?.binType || 'STORAGE',
    maxCapacity: bin?.maxCapacity?.toString() || '',
    currentCapacity: bin?.currentCapacity?.toString() || '0',
    isActive: bin?.isActive ?? true,
    notes: bin?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.binCode.trim()) {
      newErrors.binCode = 'Bin code is required';
    }

    if (formData.maxCapacity && (isNaN(Number(formData.maxCapacity)) || Number(formData.maxCapacity) < 0)) {
      newErrors.maxCapacity = 'Max capacity must be a positive number';
    }

    if (
      formData.currentCapacity &&
      (isNaN(Number(formData.currentCapacity)) || Number(formData.currentCapacity) < 0)
    ) {
      newErrors.currentCapacity = 'Current capacity must be a positive number';
    }

    if (
      formData.maxCapacity &&
      formData.currentCapacity &&
      Number(formData.currentCapacity) > Number(formData.maxCapacity)
    ) {
      newErrors.currentCapacity = 'Current capacity cannot exceed max capacity';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      binCode: formData.binCode,
      location: formData.location || undefined,
      zone: formData.zone || undefined,
      binType: formData.binType as Bin['binType'],
      maxCapacity: formData.maxCapacity ? Number(formData.maxCapacity) : undefined,
      currentCapacity: Number(formData.currentCapacity) || 0,
      isActive: formData.isActive,
      notes: formData.notes || undefined,
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {bin ? 'Edit Bin' : 'Add Bin'}
          </h3>
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
                Bin Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.binCode}
                onChange={(e) => {
                  setFormData({ ...formData, binCode: e.target.value });
                  if (errors.binCode) setErrors({ ...errors, binCode: '' });
                }}
                className={`w-full text-[14px] ::placeholder-[12px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.binCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="A-01-01"
              />
              {errors.binCode && <p className="mt-1 text-sm text-red-500">{errors.binCode}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Format: Aisle-Shelf-Position (e.g., A-01-01)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zone
              </label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Zone identifier"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Location description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bin Type <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.binType}
                onChange={(value) => setFormData({ ...formData, binType: value as 'PICKING' | 'STORAGE' | 'BULK' | 'QUARANTINE' | 'RETURNS' })}
                options={[
                  { value: 'PICKING', label: 'Picking' },
                  { value: 'STORAGE', label: 'Storage' },
                  { value: 'BULK', label: 'Bulk' },
                  { value: 'QUARANTINE', label: 'Quarantine' },
                  { value: 'RETURNS', label: 'Returns' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Capacity
              </label>
              <input
                type="number"
                value={formData.maxCapacity}
                onChange={(e) => {
                  setFormData({ ...formData, maxCapacity: e.target.value });
                  if (errors.maxCapacity) setErrors({ ...errors, maxCapacity: '' });
                }}
                className={`w-full px-4 py-2 ::placeholder-[12px] text-[14px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.maxCapacity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.maxCapacity && <p className="mt-1 text-sm text-red-500">{errors.maxCapacity}</p>}
            </div>

            <div>
              <label className="block text-sm ::placeholder-[12px] text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Capacity
              </label>
              <input
                type="number"
                value={formData.currentCapacity}
                onChange={(e) => {
                  setFormData({ ...formData, currentCapacity: e.target.value });
                  if (errors.currentCapacity) setErrors({ ...errors, currentCapacity: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.currentCapacity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.currentCapacity && (
                <p className="mt-1 text-sm text-red-500">{errors.currentCapacity}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex text-[14px] items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {bin ? 'Update' : 'Add'} Bin
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Put-Away Rules Modal Component
function PutAwayRulesModal({
  warehouse,
  onClose,
  isShowing,
  storageKey,
  onUpdate,
}: {
  warehouse: Warehouse;
  onClose: () => void;
  isShowing: boolean;
  storageKey: string;
  onUpdate: (rules: PutAwayRule[]) => void;
}) {
  const [rules, setRules] = useState<PutAwayRule[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PutAwayRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load rules from localStorage
  useEffect(() => {
    if (isShowing) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const allRules: PutAwayRule[] = JSON.parse(stored);
          const warehouseRules = allRules
            .filter((r) => r.warehouseId === warehouse.id)
            .sort((a, b) => b.priority - a.priority);
          setRules(warehouseRules);
        } catch (error) {
          console.error('Error loading rules:', error);
        }
      }
    }
  }, [isShowing, warehouse.id, storageKey]);

  // Save rules to localStorage
  const saveRules = (newRules: PutAwayRule[]) => {
    const stored = localStorage.getItem(storageKey);
    let allRules: PutAwayRule[] = [];
    if (stored) {
      try {
        allRules = JSON.parse(stored);
        allRules = allRules.filter((r) => r.warehouseId !== warehouse.id);
      } catch (error) {
        console.error('Error parsing stored rules:', error);
      }
    }
    allRules = [...allRules, ...newRules];
    localStorage.setItem(storageKey, JSON.stringify(allRules));
  };

  const handleAddRule = (ruleData: Omit<PutAwayRule, 'id' | 'warehouseId'> | Partial<PutAwayRule>) => {
    const fullData = ruleData as Omit<PutAwayRule, 'id' | 'warehouseId'>;
    const newRule: PutAwayRule = {
      ...fullData,
      id: Date.now().toString(),
      warehouseId: warehouse.id,
    };
    const updated = [...rules, newRule].sort((a, b) => b.priority - a.priority);
    setRules(updated);
    saveRules(updated);
    onUpdate(updated);
    setIsAddModalOpen(false);
    toast.success('Put-away rule added successfully!');
  };

  const handleUpdateRule = (id: string | number, ruleData: Partial<PutAwayRule>) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, ...ruleData } : r));
    setRules(updated.sort((a, b) => b.priority - a.priority));
    saveRules(updated);
    onUpdate(updated);
    setEditingRule(null);
    toast.success('Put-away rule updated successfully!');
  };

  const handleDeleteRule = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this put-away rule?')) {
      const updated = rules.filter((r) => r.id !== id);
      setRules(updated);
      saveRules(updated);
      onUpdate(updated);
      toast.success('Put-away rule deleted successfully!');
    }
  };

  // Filter rules
  const filteredRules = useMemo(() => {
    if (!searchQuery) return rules;
    const query = searchQuery.toLowerCase();
    return rules.filter(
      (rule) =>
        rule.name.toLowerCase().includes(query) ||
        rule.description?.toLowerCase().includes(query) ||
        rule.conditions.productCategory?.toLowerCase().includes(query) ||
        rule.actions.preferredZone?.toLowerCase().includes(query)
    );
  }, [rules, searchQuery]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Put-Away Rules</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{warehouse.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonWithWaves onClick={() => setIsAddModalOpen(true)} className="!px-3 !py-2">
              <Plus className="w-4 h-4" />
              Add Rule
            </ButtonWithWaves>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search rules by name, description, category, or zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[14px] ::placeholder-[12px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Rules List */}
          {filteredRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Settings className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No matching rules found' : 'No put-away rules configured yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {rule.name}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                          Priority: {rule.priority}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            rule.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {rule.description}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Conditions */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">
                            Conditions
                          </h4>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {rule.conditions.productCategory && (
                              <div>
                                <span className="font-medium">Category:</span> {rule.conditions.productCategory}
                              </div>
                            )}
                            {rule.conditions.productType && (
                              <div>
                                <span className="font-medium">Type:</span> {rule.conditions.productType}
                              </div>
                            )}
                            {rule.conditions.size && (
                              <div>
                                <span className="font-medium">Size:</span> {rule.conditions.size}
                              </div>
                            )}
                            {rule.conditions.weight && (
                              <div>
                                <span className="font-medium">Weight:</span> {rule.conditions.weight} kg
                              </div>
                            )}
                            {rule.conditions.temperature && (
                              <div>
                                <span className="font-medium">Temperature:</span> {rule.conditions.temperature}
                              </div>
                            )}
                            {rule.conditions.hazardous !== undefined && (
                              <div>
                                <span className="font-medium">Hazardous:</span>{' '}
                                {rule.conditions.hazardous ? 'Yes' : 'No'}
                              </div>
                            )}
                            {Object.keys(rule.conditions).length === 0 && (
                              <div className="text-gray-400">No conditions specified</div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase">
                            Actions
                          </h4>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {rule.actions.preferredZone && (
                              <div>
                                <span className="font-medium">Preferred Zone:</span> {rule.actions.preferredZone}
                              </div>
                            )}
                            {rule.actions.preferredBinType && (
                              <div>
                                <span className="font-medium">Preferred Bin Type:</span>{' '}
                                {rule.actions.preferredBinType}
                              </div>
                            )}
                            {rule.actions.avoidZones && rule.actions.avoidZones.length > 0 && (
                              <div>
                                <span className="font-medium">Avoid Zones:</span>{' '}
                                {rule.actions.avoidZones.join(', ')}
                              </div>
                            )}
                            {rule.actions.maxHeight && (
                              <div>
                                <span className="font-medium">Max Height:</span> {rule.actions.maxHeight} cm
                              </div>
                            )}
                            {rule.actions.stackingAllowed !== undefined && (
                              <div>
                                <span className="font-medium">Stacking:</span>{' '}
                                {rule.actions.stackingAllowed ? 'Allowed' : 'Not Allowed'}
                              </div>
                            )}
                            {Object.keys(rule.actions).length === 0 && (
                              <div className="text-gray-400">No actions specified</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setEditingRule(rule)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Rule Modal */}
        {(isAddModalOpen || editingRule) && (
          <AddEditPutAwayRuleModal
            rule={editingRule || undefined}
            warehouse={warehouse}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingRule(null);
            }}
            onSubmit={
              editingRule
                ? (data) => handleUpdateRule(editingRule.id!, data)
                : handleAddRule
            }
          />
        )}
      </div>
    </div>
  );
}

// Add/Edit Put-Away Rule Modal Component
function AddEditPutAwayRuleModal({
  rule,
  onClose,
  onSubmit,
}: {
  rule?: PutAwayRule;
  warehouse: Warehouse;
  onClose: () => void;
  onSubmit: (data: Omit<PutAwayRule, 'id' | 'warehouseId'> | Partial<PutAwayRule>) => void;
}) {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    priority: rule?.priority?.toString() || '0',
    description: rule?.description || '',
    isActive: rule?.isActive ?? true,
    // Conditions
    productCategory: rule?.conditions?.productCategory || '',
    productType: rule?.conditions?.productType || '',
    size: rule?.conditions?.size || '',
    weight: rule?.conditions?.weight?.toString() || '',
    temperature: rule?.conditions?.temperature || '',
    hazardous: rule?.conditions?.hazardous || false,
    // Actions
    preferredZone: rule?.actions?.preferredZone || '',
    preferredBinType: rule?.actions?.preferredBinType || '',
    avoidZones: rule?.actions?.avoidZones?.join(', ') || '',
    maxHeight: rule?.actions?.maxHeight?.toString() || '',
    stackingAllowed: rule?.actions?.stackingAllowed ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Rule name is required';
    }

    if (isNaN(Number(formData.priority))) {
      newErrors.priority = 'Priority must be a number';
    }

    if (formData.weight && (isNaN(Number(formData.weight)) || Number(formData.weight) < 0)) {
      newErrors.weight = 'Weight must be a positive number';
    }

    if (formData.maxHeight && (isNaN(Number(formData.maxHeight)) || Number(formData.maxHeight) < 0)) {
      newErrors.maxHeight = 'Max height must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const conditions: PutAwayRule['conditions'] = {};
    if (formData.productCategory) conditions.productCategory = formData.productCategory;
    if (formData.productType) conditions.productType = formData.productType;
    if (formData.size) conditions.size = formData.size;
    if (formData.weight) conditions.weight = Number(formData.weight);
    if (formData.temperature) conditions.temperature = formData.temperature;
    conditions.hazardous = formData.hazardous;

    const actions: PutAwayRule['actions'] = {};
    if (formData.preferredZone) actions.preferredZone = formData.preferredZone;
    if (formData.preferredBinType) {
      actions.preferredBinType = formData.preferredBinType as Bin['binType'];
    }
    if (formData.avoidZones) {
      actions.avoidZones = formData.avoidZones
        .split(',')
        .map((z) => z.trim())
        .filter(Boolean);
    }
    if (formData.maxHeight) actions.maxHeight = Number(formData.maxHeight);
    actions.stackingAllowed = formData.stackingAllowed;

    onSubmit({
      name: formData.name,
      priority: Number(formData.priority),
      description: formData.description || undefined,
      isActive: formData.isActive,
      conditions,
      actions,
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {rule ? 'Edit Put-Away Rule' : 'Add Put-Away Rule'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={`w-full px-4 py-2 ::placeholder-[12px] text-[14px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Heavy Items - Zone A"
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => {
                  setFormData({ ...formData, priority: e.target.value });
                  if (errors.priority) setErrors({ ...errors, priority: '' });
                }}
                className={`w-full text-[14px] ::placeholder-[12px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.priority ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.priority && <p className="mt-1 text-sm text-red-500">{errors.priority}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Higher priority rules are evaluated first
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Rule description..."
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Conditions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Category
                </label>
                <input
                  type="text"
                  value={formData.productCategory}
                  onChange={(e) => setFormData({ ...formData, productCategory: e.target.value })}
                  className="w-full px-4 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Electronics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type
                </label>
                <input
                  type="text"
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  className="w-full px-4 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Fragile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Size
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="w-full px-4 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Large"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => {
                    setFormData({ ...formData, weight: e.target.value });
                    if (errors.weight) setErrors({ ...errors, weight: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.weight ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                />
                {errors.weight && <p className="mt-1 text-sm text-red-500">{errors.weight}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature
                </label>
                <input
                  type="text"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  className="w-full px-4 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Cold, Room Temp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hazardous Material
                </label>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={formData.hazardous}
                    onChange={(e) => setFormData({ ...formData, hazardous: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Is Hazardous
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Zone
                </label>
                <input
                  type="text"
                  value={formData.preferredZone}
                  onChange={(e) => setFormData({ ...formData, preferredZone: e.target.value })}
                  className="w-ful l px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Zone A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Bin Type
                </label>
                <CustomDropdown
                  value={formData.preferredBinType}
                  onChange={(value) => setFormData({ ...formData, preferredBinType: value })}
                  options={[
                    { value: '', label: 'Any' },
                    { value: 'PICKING', label: 'Picking' },
                    { value: 'STORAGE', label: 'Storage' },
                    { value: 'BULK', label: 'Bulk' },
                    { value: 'QUARANTINE', label: 'Quarantine' },
                    { value: 'RETURNS', label: 'Returns' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Avoid Zones (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.avoidZones}
                  onChange={(e) => setFormData({ ...formData, avoidZones: e.target.value })}
                  className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Zone B, Zone C"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Height (cm)
                </label>
                <input
                  type="number"
                  value={formData.maxHeight}
                  onChange={(e) => {
                    setFormData({ ...formData, maxHeight: e.target.value });
                    if (errors.maxHeight) setErrors({ ...errors, maxHeight: '' });
                  }}
                  className={`w-full text-[14px] ::placeholder-[12px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.maxHeight ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                  min="0"
                />
                {errors.maxHeight && <p className="mt-1 text-sm text-red-500">{errors.maxHeight}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stacking Allowed
                </label>
                <label className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={formData.stackingAllowed}
                    onChange={(e) => setFormData({ ...formData, stackingAllowed: e.target.checked })}
                    className="w-4 h-4 ::placeholder-[12px] text-[14px] text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow Stacking
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex text-[14px] items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {rule ? 'Update' : 'Add'} Rule
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

