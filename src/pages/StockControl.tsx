import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect, useMemo } from 'react';
import api from '../lib/api';
import {
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  ChevronDown,
  Search,
  Warehouse,
  Package,
  ArrowRightLeft,
  CheckCircle2,
  Grid3x3,
  Truck,
  Layers,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

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

// Custom Select Component
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  error?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(options[highlightedIndex].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={selectRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 9999 : 'auto' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isOpen ? 'ring-2 ring-primary-500' : ''}`}
        style={{
          padding: '0.532rem 0.8rem 0.532rem 1.2rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.6,
        }}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-auto custom-dropdown-menu"
          style={{
            zIndex: 10001,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            position: 'absolute',
            maxHeight: '400px',
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                } ${index === 0 ? 'rounded-t-lg' : ''} ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  width: '100%',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'inventory'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transfers'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'crossdock'
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by product name, SKU, warehouse, or bin location..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <CustomSelect
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
                  <CustomSelect
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
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Cross-Dock feature coming in next part...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// TransfersTab Component
function TransfersTab({
  transfers: _transfers,
  setTransfers: _setTransfers,
  approvals: _approvals,
  setApprovals: _setApprovals,
  warehouses: _warehouses,
  inventory: _inventory,
  storageKey: _storageKey,
  approvalsKey: _approvalsKey,
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
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400">Transfers & Approvals feature implementation</p>
    </div>
  );
}

