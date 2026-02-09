import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  ChevronDown,
  Warehouse,
  Package,
  ArrowRightLeft,
  CheckCircle2,
  Grid3x3,
  Truck,
  Layers,
  Plus,
  X,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput, DeleteModal, DatePicker } from '../components/ui';

// Types
interface Warehouse {
  id: number;
  name: string;
  location?: string;
  city?: string;
  country?: string;
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
}

interface InventoryItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  reorderPoint: number;
  safetyStock: number;
  lastUpdated: string;
  product?: Product;
  warehouse?: Warehouse;
  inventoryType?: 'RAW' | 'WIP' | 'FINISHED';
  binLocation?: string;
}

interface Transfer {
  id?: string | number;
  transferNumber: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  requestedBy?: string;
  requestedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  items: TransferItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TransferItem {
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  inventoryType: 'RAW' | 'WIP' | 'FINISHED';
  fromBinLocation?: string;
  toBinLocation?: string;
}

interface Approval {
  id?: string | number;
  transferId: string | number;
  approverName: string;
  approverRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  approvedDate?: string;
}

interface CrossDock {
  id?: string | number;
  crossDockNumber: string;
  warehouseId: number;
  inboundShipment?: string;
  outboundShipment?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  items: CrossDockItem[];
  expectedInboundDate?: string;
  expectedOutboundDate?: string;
  actualInboundDate?: string;
  actualOutboundDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CrossDockItem {
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  inventoryType: 'RAW' | 'WIP' | 'FINISHED';
  binLocation?: string;
}


// Waves effect button component
// ButtonWithWaves component (unused)
/*
const ButtonWithWaves = ({ 
  children, 
  onClick, 
  className = '',
  disabled = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);

    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      className={`btn-primary-lg relative overflow-hidden ${className} ${disabled ? 'opacity-65 cursor-not-allowed pointer-events-none' : ''}`}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  );
};
*/

export default function StockControl() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers' | 'crossdock'>('inventory');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  // const queryClient = useQueryClient();

  // Local storage keys
  const TRANSFERS_KEY = 'stock_control_transfers';
  const APPROVALS_KEY = 'stock_control_approvals';
  const CROSSDOCK_KEY = 'stock_control_crossdock';

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
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

  // Fetch inventory
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', warehouseFilter],
    queryFn: async () => {
      try {
        const params: any = {};
        if (warehouseFilter !== 'all') {
          params.warehouseId = warehouseFilter;
        }
        const response = await api.get('/inventory', { params });
        return response.data || [];
      } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
      }
    },
  });

  const inventory: InventoryItem[] = useMemo(() => {
    const items = Array.isArray(inventoryData) ? inventoryData : (inventoryData?.data || []);
    // Add inventory type based on product or default to FINISHED
    return items.map((item: any) => ({
      ...item,
      inventoryType: item.inventoryType || 'FINISHED',
    }));
  }, [inventoryData]);

  // Load transfers, approvals, and cross-dock from localStorage
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [approvals, setApprovals] = useState<Record<string | number, Approval[]>>({});
  const [crossDocks, setCrossDocks] = useState<CrossDock[]>([]);

  useEffect(() => {
    // Load transfers
    try {
      const stored = localStorage.getItem(TRANSFERS_KEY);
      if (stored) {
        setTransfers(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
    }

    // Load approvals
    try {
      const stored = localStorage.getItem(APPROVALS_KEY);
      if (stored) {
        setApprovals(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
    }

    // Load cross-dock
    try {
      const stored = localStorage.getItem(CROSSDOCK_KEY);
      if (stored) {
        setCrossDocks(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading cross-dock:', error);
    }
  }, []);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    let filtered = inventory;

    // Filter by warehouse
    if (warehouseFilter !== 'all') {
      filtered = filtered.filter((item) => item.warehouseId === Number(warehouseFilter));
    }

    // Filter by inventory type
    if (inventoryTypeFilter !== 'all') {
      filtered = filtered.filter((item) => item.inventoryType === inventoryTypeFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.product?.name?.toLowerCase().includes(query) ||
          item.product?.sku?.toLowerCase().includes(query) ||
          item.warehouse?.name?.toLowerCase().includes(query) ||
          item.binLocation?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [inventory, warehouseFilter, inventoryTypeFilter, searchQuery]);

  // Pagination
  const totalItems = filteredInventory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, currentPage, itemsPerPage]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const raw = filteredInventory.filter((item) => item.inventoryType === 'RAW').reduce((sum, item) => sum + item.quantity, 0);
    const wip = filteredInventory.filter((item) => item.inventoryType === 'WIP').reduce((sum, item) => sum + item.quantity, 0);
    const finished = filteredInventory.filter((item) => item.inventoryType === 'FINISHED').reduce((sum, item) => sum + item.quantity, 0);
    const total = raw + wip + finished;
    const lowStock = filteredInventory.filter((item) => item.quantity <= item.reorderPoint).length;
    const pendingTransfers = transfers.filter((t) => t.status === 'PENDING' || t.status === 'APPROVED').length;
    const activeCrossDocks = crossDocks.filter((cd) => cd.status === 'PENDING' || cd.status === 'IN_PROGRESS').length;

    return { raw, wip, finished, total, lowStock, pendingTransfers, activeCrossDocks };
  }, [filteredInventory, transfers, crossDocks]);

  const getInventoryTypeColor = (type?: string) => {
    switch (type) {
      case 'RAW':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'WIP':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'FINISHED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'PENDING':
  //       return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  //     case 'APPROVED':
  //       return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  //     case 'IN_TRANSIT':
  //     case 'IN_PROGRESS':
  //       return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  //     case 'COMPLETED':
  //       return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  //     case 'CANCELLED':
  //       return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  //     default:
  //       return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  //   }
  // };

  if (isLoadingInventory) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Stock Control" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Stock Control</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage inventory by warehouse, transfers, and cross-dock operations
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Inventory</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Raw Materials</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.raw.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">WIP</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.wip.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Grid3x3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Finished Goods</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.finished.toLocaleString()}
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
              <p className="text-xs text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.lowStock}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pending Transfers</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pendingTransfers}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Active Cross-Dock</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.activeCrossDocks}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
                setActiveTab('inventory');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'inventory'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Inventory by Warehouse
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('transfers');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transfers'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Transfers & Approvals
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('crossdock');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'crossdock'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Cross-Dock
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <SearchInput
                    value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                  placeholder="Search by product name, SKU, warehouse, or bin location..."
                  className="md:col-span-1"
                  />
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
                <div>
                  <CustomDropdown
                    value={inventoryTypeFilter}
                    onChange={(value) => {
                      setInventoryTypeFilter(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'RAW', label: 'Raw Materials' },
                      { value: 'WIP', label: 'WIP' },
                      { value: 'FINISHED', label: 'Finished Goods' },
                    ]}
                  />
                </div>
              </div>

              {/* Inventory Table */}
              {paginatedInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery || warehouseFilter !== 'all' || inventoryTypeFilter !== 'all'
                      ? 'No matching inventory found'
                      : 'No inventory items found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Warehouse
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Available
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Reserved
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Bin Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedInventory.map((item) => {
                        const isLowStock = item.quantity <= item.reorderPoint;
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.product?.name || 'Unknown Product'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  SKU: {item.product?.sku || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.warehouse?.name || 'Unknown Warehouse'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInventoryTypeColor(item.inventoryType)}`}
                              >
                                {item.inventoryType || 'FINISHED'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.availableQty.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.reservedQty.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {item.binLocation || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isLowStock ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  In Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
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
            </div>
          )}

          {activeTab === 'transfers' && (
            <TransfersTab
              transfers={transfers}
              setTransfers={setTransfers}
              approvals={approvals}
              setApprovals={setApprovals}
              warehouses={warehouses}
              inventory={inventory}
              storageKey={TRANSFERS_KEY}
              approvalsKey={APPROVALS_KEY}
            />
          )}

          {activeTab === 'crossdock' && (
            <CrossDockTab
              crossDocks={crossDocks}
              setCrossDocks={setCrossDocks}
              warehouses={warehouses}
              inventory={inventory}
              storageKey={CROSSDOCK_KEY}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// TransfersTab Component
function TransfersTab({
  transfers,
  setTransfers,
  approvals,
  setApprovals,
  warehouses,
  inventory,
  storageKey,
  approvalsKey,
}: {
  transfers: Transfer[];
  setTransfers: (transfers: Transfer[]) => void;
  approvals: Record<string | number, Approval[]>;
  setApprovals: (approvals: Record<string | number, Approval[]>) => void;
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  storageKey: string;
  approvalsKey: string;
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateModalShowing, setIsCreateModalShowing] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transferToDelete, setTransferToDelete] = useState<Transfer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get unique products from inventory
  const availableProducts = useMemo(() => {
    const productMap = new Map();
    inventory.forEach((item) => {
      if (item.product && !productMap.has(item.product.id)) {
        productMap.set(item.product.id, item.product);
      }
    });
    return Array.from(productMap.values());
  }, [inventory]);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    let filtered = transfers;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.transferNumber.toLowerCase().includes(query) ||
          warehouses.find((w) => w.id === t.fromWarehouseId)?.name?.toLowerCase().includes(query) ||
          warehouses.find((w) => w.id === t.toWarehouseId)?.name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
  }, [transfers, statusFilter, searchQuery, warehouses]);

  // Pagination
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransfers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransfers, currentPage, itemsPerPage]);

  // Handle modal open/close
  useEffect(() => {
    if (isCreateModalOpen || isViewModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isCreateModalOpen) setIsCreateModalShowing(true);
          if (isViewModalOpen) setIsViewModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsCreateModalShowing(false);
      setIsViewModalShowing(false);
    }
  }, [isCreateModalOpen, isViewModalOpen]);

  const openCreateModal = () => {
    setEditingTransfer(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingTransfer(null);
  };

  const openViewModal = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedTransfer(null);
  };

  const openEditModal = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setIsCreateModalOpen(true);
  };

  const openDeleteModal = (transfer: Transfer) => {
    setTransferToDelete(transfer);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setTransferToDelete(null);
  };

  const handleDelete = () => {
    if (!transferToDelete) return;
    const updated = transfers.filter((t) => t.id !== transferToDelete.id);
    setTransfers(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // Remove approvals for this transfer
    const updatedApprovals = { ...approvals };
    delete updatedApprovals[transferToDelete.id!];
    setApprovals(updatedApprovals);
    localStorage.setItem(approvalsKey, JSON.stringify(updatedApprovals));

    toast.success('Transfer deleted successfully');
    closeDeleteModal();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          placeholder="Search by transfer number, warehouse..."
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <CustomDropdown
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'IN_TRANSIT', label: 'In Transit' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Transfer
          </button>
    </div>
      </div>

      {/* Transfers Table */}
      {paginatedTransfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <ArrowRightLeft className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' ? 'No matching transfers found' : 'No transfers found'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Transfer #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  From Warehouse
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  To Warehouse
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Requested Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedTransfers.map((transfer) => {
                const fromWarehouse = warehouses.find((w) => w.id === transfer.fromWarehouseId);
                const toWarehouse = warehouses.find((w) => w.id === transfer.toWarehouseId);

                return (
                  <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {transfer.transferNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {fromWarehouse?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {toWarehouse?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transfer.items.length} item(s)
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(transfer.requestedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(transfer)}
                          className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {transfer.status === 'PENDING' && (
                          <button
                            onClick={() => openEditModal(transfer)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {transfer.status === 'PENDING' && (
                          <button
                            onClick={() => openDeleteModal(transfer)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTransfers.length)}</span> of{' '}
            <span className="font-medium">{filteredTransfers.length}</span> transfers
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

      {/* Create/Edit Transfer Modal */}
      {isCreateModalOpen && (
        <CreateEditTransferModal
          transfer={editingTransfer}
          warehouses={warehouses}
          inventory={inventory}
          availableProducts={availableProducts}
          onClose={closeCreateModal}
          isShowing={isCreateModalShowing}
          onSubmit={(transferData) => {
            if (editingTransfer) {
              const updated = transfers.map((t) => (t.id === editingTransfer.id ? { ...editingTransfer, ...transferData } : t));
              setTransfers(updated);
              localStorage.setItem(storageKey, JSON.stringify(updated));
              toast.success('Transfer updated successfully');
            } else {
              const newTransfer: Transfer = {
                ...transferData,
                id: Date.now(),
                transferNumber: `TRF-${Date.now()}`,
                status: 'PENDING',
                requestedDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              };
              const updated = [...transfers, newTransfer];
              setTransfers(updated);
              localStorage.setItem(storageKey, JSON.stringify(updated));
              toast.success('Transfer created successfully');
            }
            closeCreateModal();
          }}
        />
      )}

      {/* View Transfer Modal */}
      {isViewModalOpen && selectedTransfer && (
        <ViewTransferModal
          transfer={selectedTransfer}
          warehouses={warehouses}
          approvals={approvals[selectedTransfer.id!] || []}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
        />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && transferToDelete && (
        <DeleteModal
          title="Delete Transfer"
          message="Are you sure you want to delete transfer"
          itemName={transferToDelete.transferNumber}
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// Create/Edit Transfer Modal Component
function CreateEditTransferModal({
  transfer,
  warehouses,
  inventory,
  availableProducts,
  onClose,
  isShowing,
  onSubmit,
}: {
  transfer?: Transfer | null;
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  availableProducts: Product[];
  onClose: () => void;
  isShowing: boolean;
  onSubmit: (data: Omit<Transfer, 'id' | 'transferNumber' | 'status' | 'requestedDate' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [formData, setFormData] = useState({
    fromWarehouseId: transfer?.fromWarehouseId.toString() || '',
    toWarehouseId: transfer?.toWarehouseId.toString() || '',
    notes: transfer?.notes || '',
  });
  const [items, setItems] = useState<TransferItem[]>(transfer?.items || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedInventoryType, setSelectedInventoryType] = useState<'RAW' | 'WIP' | 'FINISHED'>('FINISHED');
  const [itemQuantity, setItemQuantity] = useState<string>('');
  const [fromBinLocation, setFromBinLocation] = useState<string>('');
  const [toBinLocation, setToBinLocation] = useState<string>('');

  // Get available inventory for selected warehouse
  const availableInventory = useMemo(() => {
    if (!formData.fromWarehouseId || formData.fromWarehouseId === 'all') return [];
    return inventory.filter(
      (item) =>
        item.warehouseId === Number(formData.fromWarehouseId) &&
        item.inventoryType === selectedInventoryType &&
        item.availableQty > 0
    );
  }, [inventory, formData.fromWarehouseId, selectedInventoryType]);

  const handleAddItem = () => {
    if (!selectedProductId || !itemQuantity) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    const product = availableProducts.find((p) => p.id === Number(selectedProductId));
    const inventoryItem: InventoryItem | undefined = availableInventory.find((item) => item.productId === Number(selectedProductId));

    if (!inventoryItem || Number(itemQuantity) > inventoryItem.availableQty) {
      toast.error('Insufficient available quantity');
      return;
    }

    const newItem: TransferItem = {
      productId: Number(selectedProductId),
      productName: product?.name,
      sku: product?.sku,
      quantity: Number(itemQuantity),
      inventoryType: selectedInventoryType,
      fromBinLocation: fromBinLocation || undefined,
      toBinLocation: toBinLocation || undefined,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setItemQuantity('');
    setFromBinLocation('');
    setToBinLocation('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.fromWarehouseId) {
      newErrors.fromWarehouseId = 'From warehouse is required';
    }
    if (!formData.toWarehouseId) {
      newErrors.toWarehouseId = 'To warehouse is required';
    }
    if (formData.fromWarehouseId === formData.toWarehouseId) {
      newErrors.toWarehouseId = 'From and to warehouses must be different';
    }
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      fromWarehouseId: Number(formData.fromWarehouseId),
      toWarehouseId: Number(formData.toWarehouseId),
      items,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {transfer ? 'Edit Transfer' : 'Create Transfer'}
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
                From Warehouse <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.fromWarehouseId}
                onChange={(value) => {
                  setFormData({ ...formData, fromWarehouseId: value });
                  setItems([]);
                  if (errors.fromWarehouseId) setErrors({ ...errors, fromWarehouseId: '' });
                }}
                options={warehouses.map((w) => ({ value: w.id.toString(), label: w.name }))}
                placeholder="Select from warehouse"
                error={!!errors.fromWarehouseId}
              />
              {errors.fromWarehouseId && <p className="mt-1 text-sm text-red-500">{errors.fromWarehouseId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Warehouse <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.toWarehouseId}
                onChange={(value) => {
                  setFormData({ ...formData, toWarehouseId: value });
                  if (errors.toWarehouseId) setErrors({ ...errors, toWarehouseId: '' });
                }}
                options={warehouses.filter((w) => w.id.toString() !== formData.fromWarehouseId).map((w) => ({ value: w.id.toString(), label: w.name }))}
                placeholder="Select to warehouse"
                error={!!errors.toWarehouseId}
              />
              {errors.toWarehouseId && <p className="mt-1 text-sm text-red-500">{errors.toWarehouseId}</p>}
            </div>
          </div>

          {/* Add Items Section */}
          {formData.fromWarehouseId && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-[14px] font-medium text-gray-900 dark:text-white mb-4">Add Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inventory Type
                  </label>
                  <CustomDropdown
                    value={selectedInventoryType}
                    onChange={(value) => setSelectedInventoryType(value as 'RAW' | 'WIP' | 'FINISHED')}
                    options={[
                      { value: 'RAW', label: 'Raw Materials' },
                      { value: 'WIP', label: 'WIP' },
                      { value: 'FINISHED', label: 'Finished Goods' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                  <CustomDropdown
                    value={selectedProductId}
                    onChange={setSelectedProductId}
                    options={availableInventory.map((item) => ({
                      value: item.productId.toString(),
                      label: `${item.product?.name || 'Unknown'} (Available: ${item.availableQty})`,
                    }))}
                    placeholder="Select product"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    min="1"
                    className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Qty"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From Bin</label>
                  <input
                    type="text"
                    value={fromBinLocation}
                    onChange={(e) => setFromBinLocation(e.target.value)}
                    className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To Bin</label>
                  <input
                    type="text"
                    value={toBinLocation}
                    onChange={(e) => setToBinLocation(e.target.value)}
                    className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 ::placeholder-[12px] text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
              {errors.items && <p className="mt-1 text-sm text-red-500">{errors.items}</p>}
            </div>
          )}

          {/* Items List */}
          {items.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Transfer Items</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">From Bin</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">To Bin</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {item.productName || 'Unknown'} ({item.sku || 'N/A'})
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.inventoryType}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.fromBinLocation || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.toBinLocation || '—'}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 text-[14px] pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {transfer ? 'Update' : 'Create'} Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Cross-Dock Modal Component
function ViewCrossDockModal({
  crossDock,
  warehouses,
  onClose,
  isShowing,
}: {
  crossDock: CrossDock;
  warehouses: Warehouse[];
  onClose: () => void;
  isShowing: boolean;
}) {
  const warehouse = warehouses.find((w) => w.id === crossDock.warehouseId);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Cross-Dock Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Cross-Dock Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{crossDock.crossDockNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${crossDock.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : crossDock.status === 'IN_PROGRESS'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    : crossDock.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
              >
                {crossDock.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Warehouse</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{warehouse?.name || 'Unknown'}</p>
            </div>
            {crossDock.inboundShipment && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Inbound Shipment</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{crossDock.inboundShipment}</p>
              </div>
            )}
            {crossDock.outboundShipment && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Outbound Shipment</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{crossDock.outboundShipment}</p>
              </div>
            )}
            {crossDock.expectedInboundDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Expected Inbound Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(crossDock.expectedInboundDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {crossDock.expectedOutboundDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Expected Outbound Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(crossDock.expectedOutboundDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {crossDock.actualInboundDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Actual Inbound Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(crossDock.actualInboundDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {crossDock.actualOutboundDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Actual Outbound Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(crossDock.actualOutboundDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {crossDock.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{crossDock.notes}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Cross-Dock Items</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Bin Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {crossDock.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {item.productName || 'Unknown'} ({item.sku || 'N/A'})
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.inventoryType}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.binLocation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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

// View Transfer Modal Component
function ViewTransferModal({
  transfer,
  warehouses,
  approvals,
  onClose,
  isShowing,
}: {
  transfer: Transfer;
  warehouses: Warehouse[];
  approvals: Approval[];
  onClose: () => void;
  isShowing: boolean;
}) {
  const fromWarehouse = warehouses.find((w) => w.id === transfer.fromWarehouseId);
  const toWarehouse = warehouses.find((w) => w.id === transfer.toWarehouseId);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transfer Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Transfer Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{transfer.transferNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transfer.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : transfer.status === 'APPROVED'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : transfer.status === 'IN_TRANSIT'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      : transfer.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
              >
                {transfer.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">From Warehouse</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{fromWarehouse?.name || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">To Warehouse</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{toWarehouse?.name || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Requested Date</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(transfer.requestedDate).toLocaleDateString()}
              </p>
            </div>
            {transfer.approvedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Approved Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(transfer.approvedDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {transfer.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{transfer.notes}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Transfer Items</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">From Bin</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">To Bin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transfer.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {item.productName || 'Unknown'} ({item.sku || 'N/A'})
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.inventoryType}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.fromBinLocation || '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.toBinLocation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {approvals.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Approvals</label>
              <div className="space-y-2">
                {approvals.map((approval, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{approval.approverName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{approval.approverRole}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${approval.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : approval.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                    >
                      {approval.status}
                    </span>
                  </div>
                ))}
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

// CrossDockTab Component
function CrossDockTab({
  crossDocks,
  setCrossDocks,
  warehouses,
  inventory,
  storageKey,
}: {
  crossDocks: CrossDock[];
  setCrossDocks: (crossDocks: CrossDock[]) => void;
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  storageKey: string;
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateModalShowing, setIsCreateModalShowing] = useState(false);
  const [editingCrossDock, setEditingCrossDock] = useState<CrossDock | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [selectedCrossDock, setSelectedCrossDock] = useState<CrossDock | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [crossDockToDelete, setCrossDockToDelete] = useState<CrossDock | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get unique products from inventory
  const availableProducts = useMemo(() => {
    const productMap = new Map();
    inventory.forEach((item) => {
      if (item.product && !productMap.has(item.product.id)) {
        productMap.set(item.product.id, item.product);
      }
    });
    return Array.from(productMap.values());
  }, [inventory]);

  // Filter cross-docks
  const filteredCrossDocks = useMemo(() => {
    let filtered = crossDocks;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((cd) => cd.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cd) =>
          cd.crossDockNumber.toLowerCase().includes(query) ||
          warehouses.find((w) => w.id === cd.warehouseId)?.name?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [crossDocks, statusFilter, searchQuery, warehouses]);

  // Pagination
  const totalPages = Math.ceil(filteredCrossDocks.length / itemsPerPage);
  const paginatedCrossDocks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCrossDocks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCrossDocks, currentPage, itemsPerPage]);

  // Handle modal open/close
  useEffect(() => {
    if (isCreateModalOpen || isViewModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isCreateModalOpen) setIsCreateModalShowing(true);
          if (isViewModalOpen) setIsViewModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsCreateModalShowing(false);
      setIsViewModalShowing(false);
    }
  }, [isCreateModalOpen, isViewModalOpen]);

  const openCreateModal = () => {
    setEditingCrossDock(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingCrossDock(null);
  };

  const openViewModal = (crossDock: CrossDock) => {
    setSelectedCrossDock(crossDock);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedCrossDock(null);
  };

  const openEditModal = (crossDock: CrossDock) => {
    setEditingCrossDock(crossDock);
    setIsCreateModalOpen(true);
  };

  const openDeleteModal = (crossDock: CrossDock) => {
    setCrossDockToDelete(crossDock);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCrossDockToDelete(null);
  };

  const handleDelete = () => {
    if (!crossDockToDelete) return;
    const updated = crossDocks.filter((cd) => cd.id !== crossDockToDelete.id);
    setCrossDocks(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast.success('Cross-dock operation deleted successfully');
    closeDeleteModal();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          placeholder="Search by cross-dock number, warehouse..."
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <CustomDropdown
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Cross-Dock
          </button>
        </div>
      </div>

      {/* Cross-Dock Table */}
      {paginatedCrossDocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Truck className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' ? 'No matching cross-dock operations found' : 'No cross-dock operations found'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Cross-Dock #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Warehouse
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Expected Inbound
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Expected Outbound
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedCrossDocks.map((crossDock) => {
                const warehouse = warehouses.find((w) => w.id === crossDock.warehouseId);
                return (
                  <tr key={crossDock.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {crossDock.crossDockNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {warehouse?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {crossDock.items.length} item(s)
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(crossDock.status)}`}>
                        {crossDock.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {crossDock.expectedInboundDate
                        ? new Date(crossDock.expectedInboundDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {crossDock.expectedOutboundDate
                        ? new Date(crossDock.expectedOutboundDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(crossDock)}
                          className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {crossDock.status === 'PENDING' && (
                          <button
                            onClick={() => openEditModal(crossDock)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {crossDock.status === 'PENDING' && (
                          <button
                            onClick={() => openDeleteModal(crossDock)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCrossDocks.length)}</span> of{' '}
            <span className="font-medium">{filteredCrossDocks.length}</span> operations
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

      {/* Create/Edit Cross-Dock Modal */}
      {isCreateModalOpen && (
        <CreateEditCrossDockModal
          crossDock={editingCrossDock}
          warehouses={warehouses}
          inventory={inventory}
          availableProducts={availableProducts}
          onClose={closeCreateModal}
          isShowing={isCreateModalShowing}
          onSubmit={(crossDockData) => {
            if (editingCrossDock) {
              const updated = crossDocks.map((cd) =>
                cd.id === editingCrossDock.id ? { ...editingCrossDock, ...crossDockData } : cd
              );
              setCrossDocks(updated);
              localStorage.setItem(storageKey, JSON.stringify(updated));
              toast.success('Cross-dock operation updated successfully');
            } else {
              const newCrossDock: CrossDock = {
                ...crossDockData,
                id: Date.now(),
                crossDockNumber: `CD-${Date.now()}`,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
              };
              const updated = [...crossDocks, newCrossDock];
              setCrossDocks(updated);
              localStorage.setItem(storageKey, JSON.stringify(updated));
              toast.success('Cross-dock operation created successfully');
            }
            closeCreateModal();
          }}
        />
      )}

      {/* View Cross-Dock Modal */}
      {isViewModalOpen && selectedCrossDock && (
        <ViewCrossDockModal
          crossDock={selectedCrossDock}
          warehouses={warehouses}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
        />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && crossDockToDelete && (
        <DeleteModal
          title="Delete Cross-Dock Operation"
          message="Are you sure you want to delete cross-dock operation"
          itemName={crossDockToDelete.crossDockNumber}
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// Create/Edit Cross-Dock Modal Component
function CreateEditCrossDockModal({
  crossDock,
  warehouses,
  inventory,
  availableProducts,
  onClose,
  isShowing,
  onSubmit,
}: {
  crossDock?: CrossDock | null;
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  availableProducts: Product[];
  onClose: () => void;
  isShowing: boolean;
  onSubmit: (data: Omit<CrossDock, 'id' | 'crossDockNumber' | 'status' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [formData, setFormData] = useState({
    warehouseId: crossDock?.warehouseId.toString() || '',
    inboundShipment: crossDock?.inboundShipment || '',
    outboundShipment: crossDock?.outboundShipment || '',
    expectedInboundDate: crossDock?.expectedInboundDate || '',
    expectedOutboundDate: crossDock?.expectedOutboundDate || '',
    notes: crossDock?.notes || '',
  });
  const [items, setItems] = useState<CrossDockItem[]>(crossDock?.items || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedInventoryType, setSelectedInventoryType] = useState<'RAW' | 'WIP' | 'FINISHED'>('FINISHED');
  const [itemQuantity, setItemQuantity] = useState<string>('');
  const [binLocation, setBinLocation] = useState<string>('');

  // Get available inventory for selected warehouse
  const availableInventory = useMemo(() => {
    if (!formData.warehouseId || formData.warehouseId === 'all') return [];
    return inventory.filter(
      (item) =>
        item.warehouseId === Number(formData.warehouseId) &&
        item.inventoryType === selectedInventoryType &&
        item.availableQty > 0
    );
  }, [inventory, formData.warehouseId, selectedInventoryType]);

  const handleAddItem = () => {
    if (!selectedProductId || !itemQuantity) {
      toast.error('Please select a product and enter quantity');
      return;
    }

    const product = availableProducts.find((p) => p.id === Number(selectedProductId));
    const inventoryItem: InventoryItem | undefined = availableInventory.find((item) => item.productId === Number(selectedProductId));

    if (!inventoryItem || Number(itemQuantity) > inventoryItem.availableQty) {
      toast.error('Insufficient available quantity');
      return;
    }

    const newItem: CrossDockItem = {
      productId: Number(selectedProductId),
      productName: product?.name,
      sku: product?.sku,
      quantity: Number(itemQuantity),
      inventoryType: selectedInventoryType,
      binLocation: binLocation || undefined,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setItemQuantity('');
    setBinLocation('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.warehouseId) {
      newErrors.warehouseId = 'Warehouse is required';
    }
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      warehouseId: Number(formData.warehouseId),
      items,
      inboundShipment: formData.inboundShipment || undefined,
      outboundShipment: formData.outboundShipment || undefined,
      expectedInboundDate: formData.expectedInboundDate || undefined,
      expectedOutboundDate: formData.expectedOutboundDate || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {crossDock ? 'Edit Cross-Dock Operation' : 'Create Cross-Dock Operation'}
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
                  setItems([]);
                  if (errors.warehouseId) setErrors({ ...errors, warehouseId: '' });
                }}
                options={warehouses.map((w) => ({ value: w.id.toString(), label: w.name }))}
                placeholder="Select warehouse"
                error={!!errors.warehouseId}
              />
              {errors.warehouseId && <p className="mt-1 text-sm text-red-500">{errors.warehouseId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inbound Shipment</label>
              <input
                type="text"
                value={formData.inboundShipment}
                onChange={(e) => setFormData({ ...formData, inboundShipment: e.target.value })}
                className="w-full text-[14px] ::placeholder-[12px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Outbound Shipment</label>
              <input
                type="text"
                value={formData.outboundShipment}
                onChange={(e) => setFormData({ ...formData, outboundShipment: e.target.value })}
                className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Inbound Date</label>
              <DatePicker
                value={formData.expectedInboundDate || null}
                onChange={(date) => setFormData({ ...formData, expectedInboundDate: date || '' })}
                placeholder="mm/dd/yyyy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expected Outbound Date</label>
              <DatePicker
                value={formData.expectedOutboundDate || null}
                onChange={(date) => setFormData({ ...formData, expectedOutboundDate: date || '' })}
                placeholder="mm/dd/yyyy"
              />
            </div>
          </div>

          {/* Add Items Section */}
          {formData.warehouseId && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Add Items</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inventory Type
                  </label>
                  <CustomDropdown
                    value={selectedInventoryType}
                    onChange={(value) => setSelectedInventoryType(value as 'RAW' | 'WIP' | 'FINISHED')}
                    options={[
                      { value: 'RAW', label: 'Raw Materials' },
                      { value: 'WIP', label: 'WIP' },
                      { value: 'FINISHED', label: 'Finished Goods' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                  <CustomDropdown
                    value={selectedProductId}
                    onChange={setSelectedProductId}
                    options={availableInventory.map((item) => ({
                      value: item.productId.toString(),
                      label: `${item.product?.name || 'Unknown'} (Available: ${item.availableQty})`,
                    }))}
                    placeholder="Select product"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    min="1"
                    className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Qty"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bin Location</label>
                  <input
                    type="text"
                    value={binLocation}
                    onChange={(e) => setBinLocation(e.target.value)}
                    className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 ::placeholder-[12px] text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
              {errors.items && <p className="mt-1 text-sm text-red-500">{errors.items}</p>}
            </div>
          )}

          {/* Items List */}
          {items.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Cross-Dock Items</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Bin Location</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {item.productName || 'Unknown'} ({item.sku || 'N/A'})
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.inventoryType}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{item.binLocation || '—'}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

          <div className="flex items-center justify-end gap-3 text-[14px] pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {crossDock ? 'Update' : 'Create'} Cross-Dock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
