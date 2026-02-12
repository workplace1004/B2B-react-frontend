import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  ClipboardList,
  Plus,
  X,
  Edit,
  Trash2,
  Building2,
  CheckCircle2,
  Search,
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
import { ButtonWithWaves } from '../components/ui';
import {
  PageHeader,
  CustomDropdown,
  SearchInput,
  DatePicker,
  DeleteModal,
} from '../components/ui';
import Pagination, { ITEMS_PER_PAGE } from '../components/ui/Pagination';

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


export default function ProductionOrders() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [_isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isApprovalModalShowing, setIsApprovalModalShowing] = useState(false);
  const [isWIPTrackingModalOpen, setIsWIPTrackingModalOpen] = useState(false);
  const [isWIPTrackingModalShowing, setIsWIPTrackingModalShowing] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchModalShowing, setIsBatchModalShowing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);


  // Handle body scroll lock when modal is open
  useEffect(() => {
    const modalsOpen = isModalOpen || isEditModalOpen || isViewModalOpen ||
      isApprovalModalOpen || isWIPTrackingModalOpen || isBatchModalOpen || isDeleteModalOpen;
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
          if (isDeleteModalOpen) setIsDeleteModalShowing(true);
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
      setIsDeleteModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isViewModalOpen,
    isApprovalModalOpen, isWIPTrackingModalOpen, isBatchModalOpen, isDeleteModalOpen]);

  // Fetch purchase orders from API
  const { data: purchaseOrdersData, isLoading } = useQuery({
    queryKey: ['purchase-orders', currentPage, ITEMS_PER_PAGE, statusFilter],
    queryFn: async () => {
      try {
        const params: any = {
          skip: (currentPage - 1) * ITEMS_PER_PAGE,
          take: ITEMS_PER_PAGE,
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const response = await api.get('/purchase-orders', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching production orders:', error);
        return { data: [], total: 0 };
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

  // Transform purchase orders data to ProductionOrder format
  const productionOrders = useMemo(() => {
    const ordersData = purchaseOrdersData?.data || [];
    if (!Array.isArray(ordersData)) return [];
    
    return ordersData.map((po: any) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      bomId: po.bomId,
      status: po.status,
      totalAmount: parseFloat(po.totalAmount?.toString() || '0'),
      currency: po.currency || 'USD',
      orderDate: po.orderDate,
      expectedDate: po.expectedDate,
      receivedDate: po.receivedDate,
      notes: po.notes,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      supplier: po.supplier,
      bom: po.bom,
      lines: po.lines || [],
      approvals: po.approvals || [],
      wipTracking: po.wipTracking || [],
      batches: po.batches || [],
    })) as ProductionOrder[];
  }, [purchaseOrdersData]);

  // Get total count from API response
  const totalOrders = purchaseOrdersData?.total || 0;

  // Filter and search orders (client-side filtering for search only)
  const filteredOrders = useMemo(() => {
    if (!productionOrders) return [];

    let filtered = productionOrders;

    // Filter by search query (client-side)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.poNumber.toLowerCase().includes(query) ||
        order.supplier?.name.toLowerCase().includes(query) ||
        order.bom?.name.toLowerCase().includes(query) ||
        order.bom?.product?.name.toLowerCase().includes(query)
      );
    }

    // Status filtering is done by API, so no need to filter here

    return filtered;
  }, [productionOrders, searchQuery]);

  // Pagination - use API total for pagination, but display filtered results
  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders; // API already paginates, so use filtered results directly

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

  const openEditModal = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedOrder(null);
    }, 300);
  };

  const openDeleteModal = (order: ProductionOrder) => {
    setOrderToDelete(order);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    }, 300);
  };

  const queryClient = useQueryClient();

  // Update production order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProductionOrder> }) => {
      const response = await api.patch(`/purchase-orders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Production order updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update production order';
      toast.error(errorMessage);
    },
  });

  // Delete production order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Production order deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete production order';
      toast.error(errorMessage);
    },
  });

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <div className='flex items-center justify-between'>
        <PageHeader
          title="Production Orders"
          description="Manage production orders linked to BOMs, track approvals, WIP, and batch/lot traceability"
          breadcrumbPage="Production Orders"
        />
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <ButtonWithWaves className='text-[14px]' onClick={openModal}>
                <Plus className="w-4 h-4" />
                Create PO
              </ButtonWithWaves>
            </div>
          </div>
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
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
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
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
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
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
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
            placeholder="Search by PO number, supplier, BOM, or product..."
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                        <div className="flex items-center justify-start gap-2">
                          <button
                            onClick={() => openViewModal(order)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(order)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Edit Order"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(order)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Order"
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

            {/* Pagination */}
            {totalOrders > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalOrders}
                  onPageChange={setCurrentPage}
                />
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
        />
      )}

      {/* WIP Tracking Modal */}
      {isWIPTrackingModalOpen && selectedOrder && (
        <WIPTrackingModal
          order={selectedOrder}
          onClose={closeWIPTrackingModal}
          isShowing={isWIPTrackingModalShowing}
        />
      )}

      {/* Batch/Lot Modal */}
      {isBatchModalOpen && selectedOrder && (
        <BatchModal
          order={selectedOrder}
          onClose={closeBatchModal}
          isShowing={isBatchModalShowing}
        />
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          suppliers={suppliersData || []}
          boms={bomsData || []}
          onClose={closeEditModal}
          isShowing={isEditModalShowing}
          onUpdate={(data) => updateOrderMutation.mutate({ id: selectedOrder.id, data })}
          isLoading={updateOrderMutation.isPending}
        />
      )}

      {/* Delete Order Modal */}
      {isDeleteModalOpen && orderToDelete && (
        <DeleteModal
          title="Delete Production Order"
          message="Are you sure you want to delete production order"
          itemName={orderToDelete.poNumber}
          onClose={closeDeleteModal}
          onConfirm={() => deleteOrderMutation.mutate(orderToDelete.id)}
          isLoading={deleteOrderMutation.isPending}
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
  const [formData, setFormData] = useState<{
    supplierId: string;
    bomId: string;
    status: PurchaseOrderStatusType;
    expectedDate: string;
    receivedDate: string;
    notes: string;
    currency: string;
  }>({
    supplierId: '',
    bomId: '',
    status: PurchaseOrderStatus.DRAFT,
    expectedDate: '',
    receivedDate: '',
    notes: '',
    currency: 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const selectedBOM = boms.find((bom) => bom.id === Number(formData.bomId));

  const createPOMutation = useMutation({
    mutationFn: async (poData: any) => {
      const response = await api.post('/purchase-orders', poData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all purchase-orders queries to refetch the list
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Production order created successfully!');
      // Reset form
      setFormData({
        supplierId: '',
        bomId: '',
        status: PurchaseOrderStatus.DRAFT,
        expectedDate: '',
        receivedDate: '',
        notes: '',
        currency: 'USD',
      });
      setErrors({});
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build request data - only include defined fields
    const poData: any = {
      supplierId: Number(formData.supplierId),
      currency: formData.currency || 'USD',
      status: formData.status as PurchaseOrderStatusType,
    };

    // Add optional fields only if they have values
    if (formData.bomId) {
      poData.bOMId = Number(formData.bomId);
    }

    if (formData.expectedDate) {
      poData.expectedDate = formData.expectedDate;
    }

    if (formData.receivedDate) {
      poData.receivedDate = formData.receivedDate;
    }

    if (formData.notes && formData.notes.trim()) {
      poData.notes = formData.notes.trim();
    }

    createPOMutation.mutate(poData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Production Order</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supplier <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
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
                BOM / Product
              </label>
              <CustomDropdown
                value={formData.bomId}
                onChange={(value) => {
                  setFormData({ ...formData, bomId: value });
                  if (errors.bomId) setErrors({ ...errors, bomId: '' });
                }}
                options={[
                  { value: '', label: 'Select BOM (optional)' },
                  ...boms.map((bom) => ({
                    value: bom.id.toString(),
                    label: `${bom.name}${bom.product ? ` - ${bom.product.name}` : ''}`,
                  })),
                ]}
              />
              {errors.bomId && <p className="mt-1 text-sm text-red-500">{errors.bomId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as PurchaseOrderStatusType })}
                options={[
                  { value: PurchaseOrderStatus.DRAFT, label: 'Draft' },
                  { value: PurchaseOrderStatus.SENT, label: 'Sent' },
                  { value: PurchaseOrderStatus.CONFIRMED, label: 'Confirmed' },
                  { value: PurchaseOrderStatus.PARTIALLY_RECEIVED, label: 'Partially Received' },
                  { value: PurchaseOrderStatus.RECEIVED, label: 'Received' },
                  { value: PurchaseOrderStatus.CANCELLED, label: 'Cancelled' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomDropdown
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'CAD', label: 'CAD' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Date
              </label>
              <DatePicker
                value={formData.expectedDate}
                onChange={(date) => setFormData({ ...formData, expectedDate: date || '' })}
                placeholder="Select expected date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Received Date
              </label>
              <DatePicker
                value={formData.receivedDate}
                onChange={(date) => setFormData({ ...formData, receivedDate: date || '' })}
                placeholder="Select received date"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
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

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
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
            <X className="w-5 h-5" />
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

// Edit Order Modal Component
function EditOrderModal({
  order,
  suppliers,
  boms,
  onClose,
  isShowing,
  onUpdate,
  isLoading,
}: {
  order: ProductionOrder;
  suppliers: any[];
  boms: BOM[];
  onClose: () => void;
  isShowing: boolean;
  onUpdate: (data: Partial<ProductionOrder>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    supplierId: order.supplierId.toString(),
    bomId: order.bomId?.toString() || '',
    status: order.status,
    expectedDate: order.expectedDate ? new Date(order.expectedDate).toISOString().split('T')[0] : '',
    receivedDate: order.receivedDate ? new Date(order.receivedDate).toISOString().split('T')[0] : '',
    notes: order.notes || '',
    currency: order.currency || 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const updateData: any = {
      supplierId: Number(formData.supplierId),
      status: formData.status as PurchaseOrderStatusType,
      currency: formData.currency,
    };

    // Add optional fields only if they have values
    if (formData.bomId) {
      updateData.bOMId = Number(formData.bomId);
    } else {
      // If bomId is empty, set to null to disconnect
      updateData.bOMId = null;
    }

    if (formData.expectedDate) {
      updateData.expectedDate = formData.expectedDate;
    }

    if (formData.receivedDate) {
      updateData.receivedDate = formData.receivedDate;
    }

    if (formData.notes && formData.notes.trim()) {
      updateData.notes = formData.notes.trim();
    }

    onUpdate(updateData);
  };

  const statusOptions = [
    { value: PurchaseOrderStatus.DRAFT, label: 'Draft' },
    { value: PurchaseOrderStatus.SENT, label: 'Sent' },
    { value: PurchaseOrderStatus.CONFIRMED, label: 'Confirmed' },
    { value: PurchaseOrderStatus.PARTIALLY_RECEIVED, label: 'Partially Received' },
    { value: PurchaseOrderStatus.RECEIVED, label: 'Received' },
    { value: PurchaseOrderStatus.CANCELLED, label: 'Cancelled' },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Production Order</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{order.poNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supplier <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.supplierId}
                onChange={(value) => {
                  setFormData({ ...formData, supplierId: value });
                  if (errors.supplierId) setErrors({ ...errors, supplierId: '' });
                }}
                options={suppliers.map((supplier) => ({
                  value: supplier.id.toString(),
                  label: supplier.name,
                }))}
              />
              {errors.supplierId && <p className="mt-1 text-sm text-red-500">{errors.supplierId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                BOM / Product
              </label>
              <CustomDropdown
                value={formData.bomId}
                onChange={(value) => setFormData({ ...formData, bomId: value })}
                options={[
                  { value: '', label: 'Select BOM (optional)' },
                  ...boms.map((bom) => ({
                    value: bom.id.toString(),
                    label: `${bom.name}${bom.product ? ` - ${bom.product.name}` : ''}`,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as PurchaseOrderStatusType })}
                options={statusOptions}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomDropdown
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'CAD', label: 'CAD' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Date
              </label>
              <DatePicker
                value={formData.expectedDate}
                onChange={(date) => setFormData({ ...formData, expectedDate: date || '' })}
                placeholder="Select expected date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Received Date
              </label>
              <DatePicker
                value={formData.receivedDate}
                onChange={(date) => setFormData({ ...formData, receivedDate: date || '' })}
                placeholder="Select received date"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="text-[14px] flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              {isLoading ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Approvals Modal Component
function ApprovalsModal({
  order,
  onClose,
  isShowing,
}: {
  order: ProductionOrder;
  onClose: () => void;
  isShowing: boolean;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApproval, setEditingApproval] = useState<Approval | null>(null);
  const queryClient = useQueryClient();

  // Fetch approvals from API
  const { data: approvalsData } = useQuery({
    queryKey: ['purchase-order-approvals', order.id],
    queryFn: async () => {
      const response = await api.get(`/purchase-order-approvals?purchaseOrderId=${order.id}`);
      return response.data || [];
    },
    enabled: isShowing && !!order.id,
  });

  const approvals: Approval[] = useMemo(() => {
    if (!approvalsData) return [];
    return approvalsData.map((a: any) => ({
      id: a.id,
      poId: a.purchaseOrderId,
      approverId: a.approverId,
      approverName: a.approverName,
      status: a.status,
      comments: a.comments,
      date: a.date,
      level: a.level,
    })).sort((a: any, b: any) => a.level - b.level || new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [approvalsData]);

  // Mutations for approvals
  const createApprovalMutation = useMutation({
    mutationFn: async (approvalData: Omit<Approval, 'id' | 'poId'>) => {
      const response = await api.post('/purchase-order-approvals', {
        ...approvalData,
        purchaseOrderId: order.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-approvals', order.id] });
      setIsAddModalOpen(false);
      toast.success('Approval added successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add approval');
    },
  });

  const updateApprovalMutation = useMutation({
    mutationFn: async ({ id, approvalData }: { id: string | number; approvalData: Partial<Approval> }) => {
      const response = await api.patch(`/purchase-order-approvals/${id}`, approvalData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-approvals', order.id] });
      setEditingApproval(null);
      toast.success('Approval updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update approval');
    },
  });

  const deleteApprovalMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/purchase-order-approvals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-approvals', order.id] });
      toast.success('Approval deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete approval');
    },
  });

  const handleAddApproval = (approvalData: Omit<Approval, 'id' | 'poId'> | Partial<Approval>) => {
    const fullData = approvalData as Omit<Approval, 'id' | 'poId'>;
    createApprovalMutation.mutate(fullData);
  };

  const handleUpdateApproval = (id: string | number, approvalData: Partial<Approval>) => {
    updateApprovalMutation.mutate({ id, approvalData });
  };

  const handleDeleteApproval = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this approval?')) {
      deleteApprovalMutation.mutate(id);
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
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
              <X className="w-5 h-5" />
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
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    approverName: approval?.approverName || '',
    status: approval?.status || 'PENDING',
    comments: approval?.comments || '',
    date: approval?.date || new Date().toISOString().split('T')[0],
    level: approval?.level?.toString() || '1',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

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
    <div
      className="inset-0 z-[60] absolute items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
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
            <X className="w-5 h-5" />
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.approverName ? 'border-red-500' : 'border-gray-300'
                  }`}
                placeholder="Approver name"
              />
              {errors.approverName && <p className="mt-1 text-sm text-red-500">{errors.approverName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.level ? 'border-red-500' : 'border-gray-300'
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
              <DatePicker
                value={formData.date}
                onChange={(date) => {
                  setFormData({ ...formData, date: date || '' });
                  if (errors.date) setErrors({ ...errors, date: '' });
                }}
                placeholder="Select date"
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
}: {
  order: ProductionOrder;
  onClose: () => void;
  isShowing: boolean;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWIP, setEditingWIP] = useState<WIPTracking | null>(null);
  const queryClient = useQueryClient();

  // Fetch WIP tracking from API
  const { data: wipData } = useQuery({
    queryKey: ['purchase-order-wip-tracking', order.id],
    queryFn: async () => {
      const response = await api.get(`/purchase-order-wip-tracking?purchaseOrderId=${order.id}`);
      return response.data || [];
    },
    enabled: isShowing && !!order.id,
  });

  const wipTracking: WIPTracking[] = useMemo(() => {
    if (!wipData) return [];
    return wipData.map((w: any) => ({
      id: w.id,
      poId: w.purchaseOrderId,
      stage: w.stage,
      quantity: w.quantity,
      completedQty: w.completedQty || 0,
      status: w.status,
      startDate: w.startDate,
      completionDate: w.completionDate,
      notes: w.notes,
    })).sort((a: any, b: any) => new Date(b.startDate || b.completionDate || '').getTime() - new Date(a.startDate || a.completionDate || '').getTime());
  }, [wipData]);

  // Mutations for WIP tracking
  const createWIPMutation = useMutation({
    mutationFn: async (wipData: Omit<WIPTracking, 'id' | 'poId'>) => {
      const response = await api.post('/purchase-order-wip-tracking', {
        ...wipData,
        purchaseOrderId: order.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-wip-tracking', order.id] });
      setIsAddModalOpen(false);
      toast.success('WIP tracking entry added successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add WIP tracking entry');
    },
  });

  const updateWIPMutation = useMutation({
    mutationFn: async ({ id, wipData }: { id: string | number; wipData: Partial<WIPTracking> }) => {
      const response = await api.patch(`/purchase-order-wip-tracking/${id}`, wipData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-wip-tracking', order.id] });
      setEditingWIP(null);
      toast.success('WIP tracking entry updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update WIP tracking entry');
    },
  });

  const deleteWIPMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/purchase-order-wip-tracking/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-wip-tracking', order.id] });
      toast.success('WIP tracking entry deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete WIP tracking entry');
    },
  });

  const handleAddWIP = (wipData: Omit<WIPTracking, 'id' | 'poId'> | Partial<WIPTracking>) => {
    const fullData = wipData as Omit<WIPTracking, 'id' | 'poId'>;
    createWIPMutation.mutate(fullData);
  };

  const handleUpdateWIP = (id: string | number, wipData: Partial<WIPTracking>) => {
    updateWIPMutation.mutate({ id, wipData });
  };

  const handleDeleteWIP = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this WIP tracking entry?')) {
      deleteWIPMutation.mutate(id);
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
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
              <X className="w-5 h-5" />
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
            <X className="w-5 h-5" />
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.stage ? 'border-red-500' : 'border-gray-300'
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.quantity ? 'border-red-500' : 'border-gray-300'
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.completedQty ? 'border-red-500' : 'border-gray-300'
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
              <CustomDropdown
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
              <DatePicker
                value={formData.startDate}
                onChange={(date) => setFormData({ ...formData, startDate: date || '' })}
                placeholder="Select start date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Completion Date
              </label>
              <DatePicker
                value={formData.completionDate}
                onChange={(date) => setFormData({ ...formData, completionDate: date || '' })}
                placeholder="Select completion date"
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
}: {
  order: ProductionOrder;
  onClose: () => void;
  isShowing: boolean;
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch batches from API
  const { data: batchesData } = useQuery({
    queryKey: ['purchase-order-batches', order.id],
    queryFn: async () => {
      const response = await api.get(`/purchase-order-batches?purchaseOrderId=${order.id}`);
      return response.data || [];
    },
    enabled: isShowing && !!order.id,
  });

  const batches: Batch[] = useMemo(() => {
    if (!batchesData) return [];
    return batchesData.map((b: any) => ({
      id: b.id,
      poId: b.purchaseOrderId,
      batchNumber: b.batchNumber,
      lotNumber: b.lotNumber,
      quantity: b.quantity,
      productionDate: b.productionDate,
      expiryDate: b.expiryDate,
      status: b.status,
      location: b.location,
      notes: b.notes,
    })).sort((a: any, b: any) => new Date(b.productionDate || '').getTime() - new Date(a.productionDate || '').getTime());
  }, [batchesData]);

  // Mutations for batches
  const createBatchMutation = useMutation({
    mutationFn: async (batchData: Omit<Batch, 'id' | 'poId'>) => {
      const response = await api.post('/purchase-order-batches', {
        ...batchData,
        purchaseOrderId: order.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-batches', order.id] });
      setIsAddModalOpen(false);
      toast.success('Batch/Lot added successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add batch/lot');
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, batchData }: { id: string | number; batchData: Partial<Batch> }) => {
      const response = await api.patch(`/purchase-order-batches/${id}`, batchData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-batches', order.id] });
      setEditingBatch(null);
      toast.success('Batch/Lot updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update batch/lot');
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/purchase-order-batches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-batches', order.id] });
      toast.success('Batch/Lot deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete batch/lot');
    },
  });

  const handleAddBatch = (batchData: Omit<Batch, 'id' | 'poId'> | Partial<Batch>) => {
    const fullData = batchData as Omit<Batch, 'id' | 'poId'>;
    createBatchMutation.mutate(fullData);
  };

  const handleUpdateBatch = (id: string | number, batchData: Partial<Batch>) => {
    updateBatchMutation.mutate({ id, batchData });
  };

  const handleDeleteBatch = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this batch/lot?')) {
      deleteBatchMutation.mutate(id);
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
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'
        }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
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
              <X className="w-5 h-5" />
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
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
                        <div className="flex items-center justify-start gap-2">
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
            <X className="w-5 h-5" />
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.batchNumber ? 'border-red-500' : 'border-gray-300'
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.quantity ? 'border-red-500' : 'border-gray-300'
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
              <CustomDropdown
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
              <DatePicker
                value={formData.productionDate}
                onChange={(date) => setFormData({ ...formData, productionDate: date || '' })}
                placeholder="Select production date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry Date
              </label>
              <DatePicker
                value={formData.expiryDate}
                onChange={(date) => setFormData({ ...formData, expiryDate: date || '' })}
                placeholder="Select expiry date"
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

