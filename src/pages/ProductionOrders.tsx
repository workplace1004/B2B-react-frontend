import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  ClipboardList,
  Plus,
  X,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Trash2,
  ChevronDown,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Eye,
  XCircle,
  Factory,
  Layers,
  Hash,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

// Types
interface ProductionOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  bomId?: number;
  status: PurchaseOrderStatusType;
  totalAmount: number;
  currency: string;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  supplier?: {
    id: number;
    name: string;
  };
  bom?: {
    id: number;
    name: string;
    productId: number;
    product?: {
      id: number;
      name: string;
    };
  };
  lines?: ProductionOrderLine[];
  approvals?: Approval[];
  wipTracking?: WIPTracking[];
  batches?: Batch[];
}

interface ProductionOrderLine {
  id: number;
  purchaseOrderId: number;
  productId: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQty: number;
  product?: {
    id: number;
    name: string;
    sku?: string;
  };
}

const PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

type PurchaseOrderStatusType = typeof PurchaseOrderStatus[keyof typeof PurchaseOrderStatus];

interface BOM {
  id: number;
  productId: number;
  name: string;
  status: string;
  description?: string;
  components?: BOMComponent[];
  product?: {
    id: number;
    name: string;
    sku?: string;
  };
}

interface BOMComponent {
  id: number;
  bomId: number;
  productId?: number;
  name: string;
  quantity: number;
  unit?: string;
  cost?: number;
  notes?: string;
  product?: {
    id: number;
    name: string;
    sku?: string;
  };
}

interface Approval {
  id?: string | number;
  poId: number;
  approverId?: number;
  approverName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  date: string;
  level: number;
}

interface WIPTracking {
  id?: string | number;
  poId: number;
  stage: string;
  quantity: number;
  completedQty: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  startDate?: string;
  completionDate?: string;
  notes?: string;
}

interface Batch {
  id?: string | number;
  poId: number;
  batchNumber: string;
  lotNumber?: string;
  quantity: number;
  productionDate?: string;
  expiryDate?: string;
  status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED' | 'QUARANTINED';
  location?: string;
  notes?: string;
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

export default function ProductionOrders() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, _setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  // Keep isEditModalShowing for future edit modal implementation
  void isEditModalShowing;
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isApprovalModalShowing, setIsApprovalModalShowing] = useState(false);
  const [isWIPTrackingModalOpen, setIsWIPTrackingModalOpen] = useState(false);
  const [isWIPTrackingModalShowing, setIsWIPTrackingModalShowing] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchModalShowing, setIsBatchModalShowing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const itemsPerPage = 10;

  // Local storage keys for approvals, WIP tracking, and batches
  const APPROVALS_KEY = 'production_order_approvals';
  const WIP_TRACKING_KEY = 'production_order_wip_tracking';
  const BATCHES_KEY = 'production_order_batches';

  // Handle body scroll lock when modal is open
  useEffect(() => {
    const modalsOpen = isModalOpen || isEditModalOpen || isViewModalOpen || 
                      isApprovalModalOpen || isWIPTrackingModalOpen || isBatchModalOpen;
    if (modalsOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isModalOpen) setIsModalShowing(true);
          if (isEditModalOpen) setIsEditModalShowing(true);
          if (isViewModalOpen) setIsViewModalShowing(true);
          if (isApprovalModalOpen) setIsApprovalModalShowing(true);
          if (isWIPTrackingModalOpen) setIsWIPTrackingModalShowing(true);
          if (isBatchModalOpen) setIsBatchModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
      setIsEditModalShowing(false);
      setIsViewModalShowing(false);
      setIsApprovalModalShowing(false);
      setIsWIPTrackingModalShowing(false);
      setIsBatchModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isViewModalOpen, 
      isApprovalModalOpen, isWIPTrackingModalOpen, isBatchModalOpen]);

  // Fetch purchase orders (using suppliers endpoint as placeholder)
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', currentPage, itemsPerPage],
    queryFn: async () => {
      try {
        // Note: This would be /purchase-orders in a real implementation
        // For now, we'll create a structure that can work with the existing schema
        const response = await api.get('/suppliers');
        // Transform suppliers data to mock production orders structure
        // In real implementation, this would be a dedicated endpoint
        return response.data || [];
      } catch (error) {
        console.error('Error fetching production orders:', error);
        return [];
      }
    },
  });

  // Fetch BOMs
  const { data: bomsData } = useQuery({
    queryKey: ['boms'],
    queryFn: async () => {
      try {
        const response = await api.get('/bom?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const response = await api.get('/suppliers');
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Transform data to ProductionOrder format (mock structure for now)
  const productionOrders = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    // In a real implementation, this would come from a dedicated endpoint
    // For now, we'll create a mock structure
    return data.map((supplier: any, index: number) => ({
      id: supplier.id || index + 1,
      poNumber: `PO-${String(supplier.id || index + 1).padStart(6, '0')}`,
      supplierId: supplier.id,
      status: PurchaseOrderStatus.DRAFT,
      totalAmount: 0,
      currency: 'USD',
      orderDate: new Date().toISOString(),
      supplier: {
        id: supplier.id,
        name: supplier.name,
      },
    })) as ProductionOrder[];
  }, [data]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    if (!productionOrders) return [];
    
    let filtered = productionOrders;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.poNumber.toLowerCase().includes(query) ||
        order.supplier?.name.toLowerCase().includes(query) ||
        order.bom?.name.toLowerCase().includes(query) ||
        order.bom?.product?.name.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    return filtered;
  }, [productionOrders, searchQuery, statusFilter]);

  // Pagination
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!productionOrders) {
      return {
        total: 0,
        draft: 0,
        confirmed: 0,
        inProgress: 0,
        completed: 0,
      };
    }

    const total = productionOrders.length;
    const draft = productionOrders.filter((o) => o.status === PurchaseOrderStatus.DRAFT).length;
    const confirmed = productionOrders.filter((o) => 
      o.status === PurchaseOrderStatus.CONFIRMED || o.status === PurchaseOrderStatus.SENT
    ).length;
    const inProgress = productionOrders.filter((o) => 
      o.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
    ).length;
    const completed = productionOrders.filter((o) => 
      o.status === PurchaseOrderStatus.RECEIVED
    ).length;

    return { total, draft, confirmed, inProgress, completed };
  }, [productionOrders]);

  const getStatusColor = (status: PurchaseOrderStatusType) => {
    switch (status) {
      case PurchaseOrderStatus.DRAFT:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case PurchaseOrderStatus.SENT:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case PurchaseOrderStatus.CONFIRMED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case PurchaseOrderStatus.PARTIALLY_RECEIVED:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case PurchaseOrderStatus.RECEIVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case PurchaseOrderStatus.CANCELLED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
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

  const openViewModal = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalShowing(false);
    setTimeout(() => {
      setIsViewModalOpen(false);
      setSelectedOrder(null);
    }, 300);
  };

  const openApprovalModal = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsApprovalModalOpen(true);
  };

  const closeApprovalModal = () => {
    setIsApprovalModalShowing(false);
    setTimeout(() => {
      setIsApprovalModalOpen(false);
      setSelectedOrder(null);
    }, 300);
  };

  const openWIPTrackingModal = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsWIPTrackingModalOpen(true);
  };

  const closeWIPTrackingModal = () => {
    setIsWIPTrackingModalShowing(false);
    setTimeout(() => {
      setIsWIPTrackingModalOpen(false);
      setSelectedOrder(null);
    }, 300);
  };

  const openBatchModal = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsBatchModalOpen(true);
  };

  const closeBatchModal = () => {
    setIsBatchModalShowing(false);
    setTimeout(() => {
      setIsBatchModalOpen(false);
      setSelectedOrder(null);
    }, 300);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Production Orders" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Production Orders</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage production orders linked to BOMs, track approvals, WIP, and batch/lot traceability
            </p>
          </div>
          <ButtonWithWaves onClick={openModal}>
            <Plus className="w-5 h-5" />
            Create PO
          </ButtonWithWaves>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Draft</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.draft}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Confirmed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.confirmed}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.inProgress}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.completed}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by PO number, supplier, BOM, or product..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="w-full md:w-48">
            <CustomSelect
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: PurchaseOrderStatus.DRAFT, label: 'Draft' },
                { value: PurchaseOrderStatus.SENT, label: 'Sent' },
                { value: PurchaseOrderStatus.CONFIRMED, label: 'Confirmed' },
                { value: PurchaseOrderStatus.PARTIALLY_RECEIVED, label: 'Partially Received' },
                { value: PurchaseOrderStatus.RECEIVED, label: 'Received' },
                { value: PurchaseOrderStatus.CANCELLED, label: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Production Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {paginatedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Factory className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No production orders found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first production order'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <ButtonWithWaves onClick={openModal}>
                <Plus className="w-5 h-5" />
                Create PO
              </ButtonWithWaves>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      BOM / Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.poNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {order.supplier?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.bom ? (
                          <div className="flex items-center">
                            <Layers className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {order.bom.name}
                              </div>
                              {order.bom.product && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {order.bom.product.name}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {order.currency} {Number(order.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openViewModal(order)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openApprovalModal(order)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Approvals"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openWIPTrackingModal(order)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                            title="WIP Tracking"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openBatchModal(order)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Batch/Lot"
                          >
                            <Hash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalOrders)}
                  </span>{' '}
                  of <span className="font-medium">{totalOrders}</span> orders
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

      {/* Create PO Modal */}
      {isModalOpen && (
        <CreatePOModal
          boms={bomsData || []}
          suppliers={suppliersData || []}
          onClose={closeModal}
          isShowing={isModalShowing}
        />
      )}

      {/* View Order Modal */}
      {isViewModalOpen && selectedOrder && (
        <ViewOrderModal
          order={selectedOrder}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
          onOpenApprovals={() => {
            closeViewModal();
            setTimeout(() => openApprovalModal(selectedOrder), 100);
          }}
          onOpenWIP={() => {
            closeViewModal();
            setTimeout(() => openWIPTrackingModal(selectedOrder), 100);
          }}
          onOpenBatches={() => {
            closeViewModal();
            setTimeout(() => openBatchModal(selectedOrder), 100);
          }}
        />
      )}

      {/* Approvals Modal */}
      {isApprovalModalOpen && selectedOrder && (
        <ApprovalsModal
          order={selectedOrder}
          onClose={closeApprovalModal}
          isShowing={isApprovalModalShowing}
          storageKey={APPROVALS_KEY}
        />
      )}

      {/* WIP Tracking Modal */}
      {isWIPTrackingModalOpen && selectedOrder && (
        <WIPTrackingModal
          order={selectedOrder}
          onClose={closeWIPTrackingModal}
          isShowing={isWIPTrackingModalShowing}
          storageKey={WIP_TRACKING_KEY}
        />
      )}

      {/* Batch/Lot Modal */}
      {isBatchModalOpen && selectedOrder && (
        <BatchModal
          order={selectedOrder}
          onClose={closeBatchModal}
          isShowing={isBatchModalShowing}
          storageKey={BATCHES_KEY}
        />
      )}
    </div>
  );
}

// Create PO Modal Component
function CreatePOModal({
  boms,
  suppliers,
  onClose,
  isShowing,
}: {
  boms: BOM[];
  suppliers: any[];
  onClose: () => void;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    supplierId: '',
    bomId: '',
    expectedDate: '',
    notes: '',
    currency: 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const selectedBOM = boms.find((bom) => bom.id === Number(formData.bomId));

  const createPOMutation = useMutation({
    mutationFn: async (poData: any) => {
      // Note: In a real implementation, this would be a POST to /purchase-orders
      // For now, we'll simulate the creation
      return { id: Date.now(), ...poData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Production order created successfully!');
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create production order';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
    }

    if (!formData.bomId) {
      newErrors.bomId = 'BOM is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const poData = {
      supplierId: Number(formData.supplierId),
      bomId: Number(formData.bomId),
      expectedDate: formData.expectedDate || undefined,
      notes: formData.notes || undefined,
      currency: formData.currency,
      status: PurchaseOrderStatus.DRAFT,
    };

    createPOMutation.mutate(poData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Production Order</h2>
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
                Supplier <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={formData.supplierId}
                onChange={(value) => {
                  setFormData({ ...formData, supplierId: value });
                  if (errors.supplierId) setErrors({ ...errors, supplierId: '' });
                }}
                options={suppliers.map((s) => ({
                  value: s.id.toString(),
                  label: s.name,
                }))}
                placeholder="Select supplier"
                error={!!errors.supplierId}
              />
              {errors.supplierId && <p className="mt-1 text-sm text-red-500">{errors.supplierId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                BOM <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={formData.bomId}
                onChange={(value) => {
                  setFormData({ ...formData, bomId: value });
                  if (errors.bomId) setErrors({ ...errors, bomId: '' });
                }}
                options={boms.map((bom) => ({
                  value: bom.id.toString(),
                  label: `${bom.name}${bom.product ? ` - ${bom.product.name}` : ''}`,
                }))}
                placeholder="Select BOM"
                error={!!errors.bomId}
              />
              {errors.bomId && <p className="mt-1 text-sm text-red-500">{errors.bomId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Date
              </label>
              <input
                type="date"
                value={formData.expectedDate}
                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomSelect
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'CNY', label: 'CNY' },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* BOM Preview */}
          {selectedBOM && selectedBOM.components && selectedBOM.components.length > 0 && (
            <div className="mt-6 p-4 bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                BOM Components Preview
              </h3>
              <div className="space-y-2">
                {selectedBOM.components.map((component, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>
                      {component.name}
                      {component.product && ` (${component.product.name})`}
                    </span>
                    <span className="font-medium">
                      {Number(component.quantity)} {component.unit || 'pcs'}
                      {component.cost && ` @ ${component.cost}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPOMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createPOMutation.isPending ? 'Creating...' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Order Modal Component - To be continued in next part
function ViewOrderModal({
  order,
  onClose,
  isShowing,
  onOpenApprovals,
  onOpenWIP,
  onOpenBatches,
}: {
  order: ProductionOrder;
  onClose: () => void;
  isShowing: boolean;
  onOpenApprovals: () => void;
  onOpenWIP: () => void;
  onOpenBatches: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Production Order Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.poNumber}</p>
          </div>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Supplier</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {order.supplier?.name || '—'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                {order.status.replace('_', ' ')}
              </span>
            </div>
            {order.bom && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">BOM</label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.bom.name}</p>
                </div>
                {order.bom.product && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.bom.product.name}
                    </p>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Amount</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {order.currency} {Number(order.totalAmount).toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Date</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
            {order.expectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Expected Date
                </label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(order.expectedDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {order.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onOpenApprovals}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approvals
            </button>
            <button
              onClick={onOpenWIP}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              WIP Tracking
            </button>
            <button
              onClick={onOpenBatches}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <Hash className="w-4 h-4" />
              Batch/Lot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Approvals Modal Component
function ApprovalsModal({
  order,
  onClose,
  isShowing,
  storageKey,
}: {
  order: ProductionOrder;
  onClose: () => void;
  isShowing: boolean;
  storageKey: string;
}) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApproval, setEditingApproval] = useState<Approval | null>(null);

  // Load approvals from localStorage
  useEffect(() => {
    if (isShowing) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const allApprovals: Approval[] = JSON.parse(stored);
          const orderApprovals = allApprovals
            .filter((a) => a.poId === order.id)
            .sort((a, b) => a.level - b.level || new Date(a.date).getTime() - new Date(b.date).getTime());
          setApprovals(orderApprovals);
        } catch (error) {
          console.error('Error loading approvals:', error);
        }
      }
    }
  }, [isShowing, order.id, storageKey]);

  // Save approvals to localStorage
  const saveApprovals = (newApprovals: Approval[]) => {
    const stored = localStorage.getItem(storageKey);
    let allApprovals: Approval[] = [];
    if (stored) {
      try {
        allApprovals = JSON.parse(stored);
        allApprovals = allApprovals.filter((a) => a.poId !== order.id);
      } catch (error) {
        console.error('Error parsing stored approvals:', error);
      }
    }
    allApprovals = [...allApprovals, ...newApprovals];
    localStorage.setItem(storageKey, JSON.stringify(allApprovals));
  };

  const handleAddApproval = (approvalData: Omit<Approval, 'id' | 'poId'> | Partial<Approval>) => {
    const fullData = approvalData as Omit<Approval, 'id' | 'poId'>;
    const newApproval: Approval = {
      ...fullData,
      id: Date.now().toString(),
      poId: order.id,
    };
    const updated = [...approvals, newApproval].sort(
      (a, b) => a.level - b.level || new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setApprovals(updated);
    saveApprovals(updated);
    setIsAddModalOpen(false);
    toast.success('Approval added successfully!');
  };

  const handleUpdateApproval = (id: string | number, approvalData: Partial<Approval>) => {
    const updated = approvals.map((a) => (a.id === id ? { ...a, ...approvalData } : a));
    setApprovals(updated);
    saveApprovals(updated);
    setEditingApproval(null);
    toast.success('Approval updated successfully!');
  };

  const handleDeleteApproval = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this approval?')) {
      const updated = approvals.filter((a) => a.id !== id);
      setApprovals(updated);
      saveApprovals(updated);
      toast.success('Approval deleted successfully!');
    }
  };

  const getStatusColor = (status: Approval['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: Approval['status']) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
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
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Approvals</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.poNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonWithWaves onClick={() => setIsAddModalOpen(true)} className="!px-3 !py-2">
              <Plus className="w-4 h-4" />
              Add Approval
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
          {approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No approvals recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(approval.status)}`}
                        >
                          {getStatusIcon(approval.status)}
                          {approval.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Level {approval.level}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {approval.approverName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(approval.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingApproval(approval)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteApproval(approval.id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {approval.comments && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                      {approval.comments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Approval Modal */}
        {(isAddModalOpen || editingApproval) && (
          <AddEditApprovalModal
            approval={editingApproval || undefined}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingApproval(null);
            }}
            onSubmit={
              editingApproval
                ? (data) => handleUpdateApproval(editingApproval.id!, data)
                : handleAddApproval
            }
          />
        )}
      </div>
    </div>
  );
}

// Add/Edit Approval Modal Component
function AddEditApprovalModal({
  approval,
  onClose,
  onSubmit,
}: {
  approval?: Approval;
  onClose: () => void;
  onSubmit: (data: Omit<Approval, 'id' | 'poId'> | Partial<Approval>) => void;
}) {
  const [formData, setFormData] = useState({
    approverName: approval?.approverName || '',
    status: approval?.status || 'PENDING',
    comments: approval?.comments || '',
    date: approval?.date || new Date().toISOString().split('T')[0],
    level: approval?.level?.toString() || '1',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.approverName.trim()) {
      newErrors.approverName = 'Approver name is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (isNaN(Number(formData.level)) || Number(formData.level) < 1) {
      newErrors.level = 'Level must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      approverName: formData.approverName,
      status: formData.status as Approval['status'],
      comments: formData.comments || undefined,
      date: formData.date,
      level: Number(formData.level),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {approval ? 'Edit Approval' : 'Add Approval'}
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
                Approver Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.approverName}
                onChange={(e) => {
                  setFormData({ ...formData, approverName: e.target.value });
                  if (errors.approverName) setErrors({ ...errors, approverName: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.approverName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Approver name"
              />
              {errors.approverName && <p className="mt-1 text-sm text-red-500">{errors.approverName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as 'PENDING' | 'APPROVED' | 'REJECTED' })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Approval Level <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.level}
                onChange={(e) => {
                  setFormData({ ...formData, level: e.target.value });
                  if (errors.level) setErrors({ ...errors, level: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.level ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1"
                min="1"
              />
              {errors.level && <p className="mt-1 text-sm text-red-500">{errors.level}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  if (errors.date) setErrors({ ...errors, date: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comments
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Approval comments..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {approval ? 'Update' : 'Add'} Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// WIP Tracking Modal Component
function WIPTrackingModal({
  order,
  onClose,
  isShowing,
  storageKey,
}: {
  order: ProductionOrder;
  onClose: () => void;
  isShowing: boolean;
  storageKey: string;
}) {
  const [wipTracking, setWipTracking] = useState<WIPTracking[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWIP, setEditingWIP] = useState<WIPTracking | null>(null);

  // Load WIP tracking from localStorage
  useEffect(() => {
    if (isShowing) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const allWIP: WIPTracking[] = JSON.parse(stored);
          const orderWIP = allWIP
            .filter((w) => w.poId === order.id)
            .sort((a, b) => new Date(b.startDate || b.completionDate || '').getTime() - new Date(a.startDate || a.completionDate || '').getTime());
          setWipTracking(orderWIP);
        } catch (error) {
          console.error('Error loading WIP tracking:', error);
        }
      }
    }
  }, [isShowing, order.id, storageKey]);

  // Save WIP tracking to localStorage
  const saveWIPTracking = (newWIP: WIPTracking[]) => {
    const stored = localStorage.getItem(storageKey);
    let allWIP: WIPTracking[] = [];
    if (stored) {
      try {
        allWIP = JSON.parse(stored);
        allWIP = allWIP.filter((w) => w.poId !== order.id);
      } catch (error) {
        console.error('Error parsing stored WIP tracking:', error);
      }
    }
    allWIP = [...allWIP, ...newWIP];
    localStorage.setItem(storageKey, JSON.stringify(allWIP));
  };

  const handleAddWIP = (wipData: Omit<WIPTracking, 'id' | 'poId'> | Partial<WIPTracking>) => {
    const fullData = wipData as Omit<WIPTracking, 'id' | 'poId'>;
    const newWIP: WIPTracking = {
      ...fullData,
      id: Date.now().toString(),
      poId: order.id,
    };
    const updated = [...wipTracking, newWIP].sort(
      (a, b) => new Date(b.startDate || '').getTime() - new Date(a.startDate || '').getTime()
    );
    setWipTracking(updated);
    saveWIPTracking(updated);
    setIsAddModalOpen(false);
    toast.success('WIP tracking entry added successfully!');
  };

  const handleUpdateWIP = (id: string | number, wipData: Partial<WIPTracking>) => {
    const updated = wipTracking.map((w) => (w.id === id ? { ...w, ...wipData } : w));
    setWipTracking(updated);
    saveWIPTracking(updated);
    setEditingWIP(null);
    toast.success('WIP tracking entry updated successfully!');
  };

  const handleDeleteWIP = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this WIP tracking entry?')) {
      const updated = wipTracking.filter((w) => w.id !== id);
      setWipTracking(updated);
      saveWIPTracking(updated);
      toast.success('WIP tracking entry deleted successfully!');
    }
  };

  const getStatusColor = (status: WIPTracking['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ON_HOLD':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getProgressPercentage = (wip: WIPTracking) => {
    if (wip.quantity === 0) return 0;
    return Math.round((wip.completedQty / wip.quantity) * 100);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">WIP Tracking</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.poNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonWithWaves onClick={() => setIsAddModalOpen(true)} className="!px-3 !py-2">
              <Plus className="w-4 h-4" />
              Add WIP Entry
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
          {wipTracking.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No WIP tracking entries recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wipTracking.map((wip) => {
                const progress = getProgressPercentage(wip);
                return (
                  <div
                    key={wip.id}
                    className="bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {wip.stage}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(wip.status)}`}
                          >
                            {wip.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {wip.quantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Completed:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                              {wip.completedQty}
                            </span>
                          </div>
                          {wip.startDate && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Start:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {new Date(wip.startDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {wip.completionDate && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Complete:</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {new Date(wip.completionDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingWIP(wip)}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWIP(wip.id!)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    {wip.notes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-wrap">
                        {wip.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add/Edit WIP Modal */}
        {(isAddModalOpen || editingWIP) && (
          <AddEditWIPModal
            wip={editingWIP || undefined}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingWIP(null);
            }}
            onSubmit={
              editingWIP
                ? (data) => handleUpdateWIP(editingWIP.id!, data)
                : handleAddWIP
            }
          />
        )}
      </div>
    </div>
  );
}

// Add/Edit WIP Modal Component
function AddEditWIPModal({
  wip,
  onClose,
  onSubmit,
}: {
  wip?: WIPTracking;
  onClose: () => void;
  onSubmit: (data: Omit<WIPTracking, 'id' | 'poId'> | Partial<WIPTracking>) => void;
}) {
  const [formData, setFormData] = useState({
    stage: wip?.stage || '',
    quantity: wip?.quantity.toString() || '',
    completedQty: wip?.completedQty.toString() || '0',
    status: wip?.status || 'NOT_STARTED',
    startDate: wip?.startDate || '',
    completionDate: wip?.completionDate || '',
    notes: wip?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.stage.trim()) {
      newErrors.stage = 'Stage is required';
    }

    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    if (
      formData.completedQty &&
      (isNaN(Number(formData.completedQty)) || Number(formData.completedQty) < 0)
    ) {
      newErrors.completedQty = 'Completed quantity must be a positive number';
    }

    if (
      formData.completedQty &&
      Number(formData.completedQty) > Number(formData.quantity)
    ) {
      newErrors.completedQty = 'Completed quantity cannot exceed total quantity';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      stage: formData.stage,
      quantity: Number(formData.quantity),
      completedQty: Number(formData.completedQty) || 0,
      status: formData.status as WIPTracking['status'],
      startDate: formData.startDate || undefined,
      completionDate: formData.completionDate || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {wip ? 'Edit WIP Entry' : 'Add WIP Entry'}
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.stage}
                onChange={(e) => {
                  setFormData({ ...formData, stage: e.target.value });
                  if (errors.stage) setErrors({ ...errors, stage: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.stage ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Cutting, Sewing, Finishing"
              />
              {errors.stage && <p className="mt-1 text-sm text-red-500">{errors.stage}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  if (errors.quantity) setErrors({ ...errors, quantity: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Completed Quantity
              </label>
              <input
                type="number"
                value={formData.completedQty}
                onChange={(e) => {
                  setFormData({ ...formData, completedQty: e.target.value });
                  if (errors.completedQty) setErrors({ ...errors, completedQty: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.completedQty ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.completedQty && <p className="mt-1 text-sm text-red-500">{errors.completedQty}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' })}
                options={[
                  { value: 'NOT_STARTED', label: 'Not Started' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'ON_HOLD', label: 'On Hold' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Completion Date
              </label>
              <input
                type="date"
                value={formData.completionDate}
                onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {wip ? 'Update' : 'Add'} WIP Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Batch/Lot Modal Component
function BatchModal({
  order,
  onClose,
  isShowing,
  storageKey,
}: {
  order: ProductionOrder;
  onClose: () => void;
  isShowing: boolean;
  storageKey: string;
}) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load batches from localStorage
  useEffect(() => {
    if (isShowing) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const allBatches: Batch[] = JSON.parse(stored);
          const orderBatches = allBatches
            .filter((b) => b.poId === order.id)
            .sort((a, b) => new Date(b.productionDate || '').getTime() - new Date(a.productionDate || '').getTime());
          setBatches(orderBatches);
        } catch (error) {
          console.error('Error loading batches:', error);
        }
      }
    }
  }, [isShowing, order.id, storageKey]);

  // Save batches to localStorage
  const saveBatches = (newBatches: Batch[]) => {
    const stored = localStorage.getItem(storageKey);
    let allBatches: Batch[] = [];
    if (stored) {
      try {
        allBatches = JSON.parse(stored);
        allBatches = allBatches.filter((b) => b.poId !== order.id);
      } catch (error) {
        console.error('Error parsing stored batches:', error);
      }
    }
    allBatches = [...allBatches, ...newBatches];
    localStorage.setItem(storageKey, JSON.stringify(allBatches));
  };

  const handleAddBatch = (batchData: Omit<Batch, 'id' | 'poId'> | Partial<Batch>) => {
    const fullData = batchData as Omit<Batch, 'id' | 'poId'>;
    const newBatch: Batch = {
      ...fullData,
      id: Date.now().toString(),
      poId: order.id,
    };
    const updated = [...batches, newBatch].sort(
      (a, b) => new Date(b.productionDate || '').getTime() - new Date(a.productionDate || '').getTime()
    );
    setBatches(updated);
    saveBatches(updated);
    setIsAddModalOpen(false);
    toast.success('Batch/Lot added successfully!');
  };

  const handleUpdateBatch = (id: string | number, batchData: Partial<Batch>) => {
    const updated = batches.map((b) => (b.id === id ? { ...b, ...batchData } : b));
    setBatches(updated);
    saveBatches(updated);
    setEditingBatch(null);
    toast.success('Batch/Lot updated successfully!');
  };

  const handleDeleteBatch = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this batch/lot?')) {
      const updated = batches.filter((b) => b.id !== id);
      setBatches(updated);
      saveBatches(updated);
      toast.success('Batch/Lot deleted successfully!');
    }
  };

  const getStatusColor = (status: Batch['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_PRODUCTION':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'QUARANTINED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const filteredBatches = batches.filter((batch) =>
    batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    batch.lotNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    batch.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Batch/Lot Traceability</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.poNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonWithWaves onClick={() => setIsAddModalOpen(true)} className="!px-3 !py-2">
              <Plus className="w-4 h-4" />
              Add Batch/Lot
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
                placeholder="Search by batch number, lot number, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Hash className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No matching batches found' : 'No batches/lots recorded yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Batch Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Lot Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Production Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Expiry Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {batch.batchNumber}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {batch.lotNumber || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {batch.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {batch.productionDate
                          ? new Date(batch.productionDate).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}
                        >
                          {batch.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {batch.location || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingBatch(batch)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBatch(batch.id!)}
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

        {/* Add/Edit Batch Modal */}
        {(isAddModalOpen || editingBatch) && (
          <AddEditBatchModal
            batch={editingBatch || undefined}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingBatch(null);
            }}
            onSubmit={
              editingBatch
                ? (data) => handleUpdateBatch(editingBatch.id!, data)
                : handleAddBatch
            }
          />
        )}
      </div>
    </div>
  );
}

// Add/Edit Batch Modal Component
function AddEditBatchModal({
  batch,
  onClose,
  onSubmit,
}: {
  batch?: Batch;
  onClose: () => void;
  onSubmit: (data: Omit<Batch, 'id' | 'poId'> | Partial<Batch>) => void;
}) {
  const [formData, setFormData] = useState({
    batchNumber: batch?.batchNumber || '',
    lotNumber: batch?.lotNumber || '',
    quantity: batch?.quantity.toString() || '',
    productionDate: batch?.productionDate || '',
    expiryDate: batch?.expiryDate || '',
    status: batch?.status || 'PENDING',
    location: batch?.location || '',
    notes: batch?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.batchNumber.trim()) {
      newErrors.batchNumber = 'Batch number is required';
    }

    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      batchNumber: formData.batchNumber,
      lotNumber: formData.lotNumber || undefined,
      quantity: Number(formData.quantity),
      productionDate: formData.productionDate || undefined,
      expiryDate: formData.expiryDate || undefined,
      status: formData.status as Batch['status'],
      location: formData.location || undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {batch ? 'Edit Batch/Lot' : 'Add Batch/Lot'}
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
                Batch Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.batchNumber}
                onChange={(e) => {
                  setFormData({ ...formData, batchNumber: e.target.value });
                  if (errors.batchNumber) setErrors({ ...errors, batchNumber: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.batchNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="BATCH-001"
              />
              {errors.batchNumber && <p className="mt-1 text-sm text-red-500">{errors.batchNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lot Number
              </label>
              <input
                type="text"
                value={formData.lotNumber}
                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="LOT-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  if (errors.quantity) setErrors({ ...errors, quantity: '' });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
              />
              {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as 'PENDING' | 'COMPLETED' | 'IN_PRODUCTION' | 'QUARANTINED' })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'IN_PRODUCTION', label: 'In Production' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'QUARANTINED', label: 'Quarantined' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Production Date
              </label>
              <input
                type="date"
                value={formData.productionDate}
                onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Warehouse, Shelf, etc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {batch ? 'Update' : 'Add'} Batch/Lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

