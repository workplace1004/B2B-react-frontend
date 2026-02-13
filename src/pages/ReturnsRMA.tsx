import { useState, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
  RotateCcw,
  Plus,
  Clock,
  CheckCircle2,
  Eye,
  Truck,
  DollarSign,
  RefreshCw,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput, DeleteModal } from '../components/ui';
import { DatePicker } from '../components/ui';
import Pagination, { ITEMS_PER_PAGE } from '../components/ui/Pagination';

// Types
interface RMA {
  id?: string | number;
  rmaNumber: string;
  orderId: number;
  orderNumber?: string;
  orderLineId?: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    sku: string;
  };
  customerId?: number;
  customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  quantity: number;
  reason: 'DEFECTIVE' | 'WRONG_SIZE' | 'NOT_AS_DESCRIBED' | 'DAMAGED' | 'CUSTOMER_REQUEST' | 'OTHER';
  reasonDetails?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  refundAmount?: number;
  currency?: string;
  notes?: string;
  requestedDate: string;
  approvedDate?: string;
  processedDate?: string;
  completedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ReverseLogistics {
  id?: string | number;
  rmaId: string | number;
  rmaNumber?: string;
  trackingNumber?: string;
  carrier?: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'INSPECTED' | 'PROCESSED' | 'CANCELLED';
  originAddress?: {
    name: string;
    address: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  destinationAddress?: {
    name: string;
    address: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  shippedDate?: string;
  receivedDate?: string;
  inspectedDate?: string;
  processedDate?: string;
  estimatedDeliveryDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// interface Order {
//   id: number;
//   orderNumber: string;
//   customerId: number;
//   customer?: {
//     id: number;
//     name: string;
//     email?: string;
//     phone?: string;
//   };
//   status: string;
//   totalAmount: number;
//   currency: string;
//   orderDate: string;
//   orderLines?: OrderLine[];
// }

// interface OrderLine {
//   id: number;
//   productId: number;
//   product?: {
//     id: number;
//     name: string;
//     sku: string;
//   };
//   quantity: number;
//   fulfilledQty: number;
//   unitPrice: number;
//   totalPrice: number;
// }

// interface Product {
//   id: number;
//   name: string;
//   sku: string;
// }


export default function ReturnsRMA() {
  const [activeTab, setActiveTab] = useState<'rmas' | 'reverse-logistics'>('rmas');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states for RMAs
  const [isRMAModalOpen, setIsRMAModalOpen] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState<RMA | null>(null);
  const [isRMADeleteModalOpen, setIsRMADeleteModalOpen] = useState(false);
  const [rmaToDelete, setRmaToDelete] = useState<RMA | null>(null);
  const [isRMAViewModalOpen, setIsRMAViewModalOpen] = useState(false);
  const [rmaToView, setRmaToView] = useState<RMA | null>(null);

  // Modal states for Reverse Logistics
  const [isReverseLogisticsModalOpen, setIsReverseLogisticsModalOpen] = useState(false);
  const [selectedReverseLogistics, setSelectedReverseLogistics] = useState<ReverseLogistics | null>(null);
  const [isReverseLogisticsDeleteModalOpen, setIsReverseLogisticsDeleteModalOpen] = useState(false);
  const [reverseLogisticsToDelete, setReverseLogisticsToDelete] = useState<ReverseLogistics | null>(null);
  const [isReverseLogisticsViewModalOpen, setIsReverseLogisticsViewModalOpen] = useState(false);
  const [reverseLogisticsToView, setReverseLogisticsToView] = useState<ReverseLogistics | null>(null);

  const queryClient = useQueryClient();

  // Fetch orders for RMA creation
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'rma'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=1000');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
  });

  const orders: any[] = useMemo(() => {
    const data = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
    return data;
  }, [ordersData]);

  // Fetch products for RMA creation
  const { data: productsData } = useQuery({
    queryKey: ['products', 'rma'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
  });

  const products: any[] = useMemo(() => {
    return Array.isArray(productsData) ? productsData : [];
  }, [productsData]);

  // Fetch RMAs from API (fetch all for client-side filtering and pagination)
  const { data: rmasData } = useQuery({
    queryKey: ['returns', statusFilter],
    queryFn: async () => {
      try {
        const params: any = {
          skip: 0,
          take: 10000, // Fetch a large number for client-side filtering
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const response = await api.get('/returns', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching RMAs:', error);
        return { data: [], total: 0 };
      }
    },
  });

  const rmas: RMA[] = useMemo(() => {
    const rmasList = rmasData?.data || [];
    if (!Array.isArray(rmasList)) return [];
    return rmasList.map((r: any) => ({
      id: r.id,
      rmaNumber: r.rmaNumber,
      orderId: r.orderId,
      orderNumber: r.order?.orderNumber,
      orderLineId: r.orderLineId,
      productId: r.productId,
      product: r.product,
      customerId: r.order?.customerId,
      customer: r.order?.customer,
      quantity: r.quantity,
      reason: r.reason,
      reasonDetails: r.reasonDetails,
      status: r.status,
      refundAmount: r.refundAmount ? parseFloat(r.refundAmount.toString()) : undefined,
      currency: r.order?.currency || 'USD',
      notes: r.notes,
      requestedDate: r.requestedDate,
      approvedDate: r.approvedDate,
      processedDate: r.processedDate,
      completedDate: r.processedDate, // Using processedDate as completedDate
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }, [rmasData]);

  // Fetch reverse logistics from API (fetch all for client-side filtering and pagination)
  const { data: reverseLogisticsData } = useQuery({
    queryKey: ['reverse-logistics', statusFilter],
    queryFn: async () => {
      try {
        const params: any = {
          skip: 0,
          take: 10000, // Fetch a large number for client-side filtering
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const response = await api.get('/reverse-logistics', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching reverse logistics:', error);
        return { data: [], total: 0 };
      }
    },
  });

  const reverseLogistics: ReverseLogistics[] = useMemo(() => {
    const logisticsList = reverseLogisticsData?.data || [];
    if (!Array.isArray(logisticsList)) return [];
    return logisticsList.map((rl: any) => ({
      id: rl.id,
      rmaId: rl.rmaId,
      rmaNumber: rl.rma?.rmaNumber,
      trackingNumber: rl.trackingNumber,
      carrier: rl.carrier,
      status: rl.status,
      originAddress: rl.originAddress ? {
        name: rl.originName || '',
        address: rl.originAddress,
        city: rl.originCity || '',
        state: rl.originState,
        postalCode: rl.originPostalCode || '',
        country: rl.originCountry || '',
      } : undefined,
      destinationAddress: rl.destinationAddress ? {
        name: rl.destinationName || '',
        address: rl.destinationAddress,
        city: rl.destinationCity || '',
        state: rl.destinationState,
        postalCode: rl.destinationPostalCode || '',
        country: rl.destinationCountry || '',
      } : undefined,
      shippedDate: rl.shippedDate,
      receivedDate: rl.receivedDate,
      inspectedDate: rl.inspectedDate,
      processedDate: rl.processedDate,
      estimatedDeliveryDate: rl.estimatedDeliveryDate,
      notes: rl.notes,
      createdAt: rl.createdAt,
      updatedAt: rl.updatedAt,
    }));
  }, [reverseLogisticsData]);

  // Mutations for RMAs
  const createRMAMutation = useMutation({
    mutationFn: async (rmaData: Omit<RMA, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.post('/returns', rmaData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('RMA created successfully');
      setIsRMAModalOpen(false);
      setSelectedRMA(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create RMA');
    },
  });

  const updateRMAMutation = useMutation({
    mutationFn: async ({ id, rmaData }: { id: string | number; rmaData: Partial<RMA> }) => {
      const response = await api.patch(`/returns/${id}`, rmaData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('RMA updated successfully');
      setIsRMAModalOpen(false);
      setSelectedRMA(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update RMA');
    },
  });

  const deleteRMAMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/returns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      toast.success('RMA deleted successfully');
      setIsRMADeleteModalOpen(false);
      setRmaToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete RMA');
    },
  });

  // Mutations for Reverse Logistics
  const createReverseLogisticsMutation = useMutation({
    mutationFn: async (logisticsData: Omit<ReverseLogistics, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.post('/reverse-logistics', logisticsData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-logistics'] });
      toast.success('Reverse logistics created successfully');
      setIsReverseLogisticsModalOpen(false);
      setSelectedReverseLogistics(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create reverse logistics');
    },
  });

  const updateReverseLogisticsMutation = useMutation({
    mutationFn: async ({ id, logisticsData }: { id: string | number; logisticsData: Partial<ReverseLogistics> }) => {
      const response = await api.patch(`/reverse-logistics/${id}`, logisticsData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-logistics'] });
      toast.success('Reverse logistics updated successfully');
      setIsReverseLogisticsModalOpen(false);
      setSelectedReverseLogistics(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update reverse logistics');
    },
  });

  const deleteReverseLogisticsMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/reverse-logistics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reverse-logistics'] });
      toast.success('Reverse logistics deleted successfully');
      setIsReverseLogisticsDeleteModalOpen(false);
      setReverseLogisticsToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete reverse logistics');
    },
  });


  // Filter RMAs
  const filteredRmas = useMemo(() => {
    let filtered = rmas;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (rma) =>
          rma.rmaNumber.toLowerCase().includes(query) ||
          rma.orderNumber?.toLowerCase().includes(query) ||
          rma.product?.name.toLowerCase().includes(query) ||
          rma.product?.sku.toLowerCase().includes(query) ||
          rma.customer?.name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((rma) => rma.status === statusFilter);
    }

    if (reasonFilter !== 'all') {
      filtered = filtered.filter((rma) => rma.reason === reasonFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = a.requestedDate ? new Date(a.requestedDate).getTime() : 0;
      const dateB = b.requestedDate ? new Date(b.requestedDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [rmas, searchQuery, statusFilter, reasonFilter]);

  // Filter reverse logistics
  const filteredReverseLogistics = useMemo(() => {
    let filtered = reverseLogistics;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (logistics) =>
          logistics.rmaNumber?.toLowerCase().includes(query) ||
          logistics.trackingNumber?.toLowerCase().includes(query) ||
          logistics.carrier?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((logistics) => logistics.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [reverseLogistics, searchQuery, statusFilter]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRmas = rmas.length;
    const pendingRmas = rmas.filter((r) => r.status === 'PENDING').length;
    const approvedRmas = rmas.filter((r) => r.status === 'APPROVED').length;
    const processingRmas = rmas.filter((r) => r.status === 'PROCESSING').length;
    const completedRmas = rmas.filter((r) => r.status === 'COMPLETED').length;
    const totalRefundAmount = rmas
      .filter((r) => r.status === 'COMPLETED' && r.refundAmount)
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    const totalReverseLogistics = reverseLogistics.length;
    const inTransitLogistics = reverseLogistics.filter((l) => l.status === 'IN_TRANSIT').length;
    const receivedLogistics = reverseLogistics.filter((l) => l.status === 'RECEIVED').length;

    return {
      rmas: {
        total: totalRmas,
        pending: pendingRmas,
        approved: approvedRmas,
        processing: processingRmas,
        completed: completedRmas,
        totalRefund: totalRefundAmount,
      },
      reverseLogistics: {
        total: totalReverseLogistics,
        inTransit: inTransitLogistics,
        received: receivedLogistics,
      },
    };
  }, [rmas, reverseLogistics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_TRANSIT':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'RECEIVED':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'INSPECTED':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div>
      <Breadcrumb currentPage="Returns (RMA)" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Returns (RMA)</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage return merchandise authorizations and reverse logistics
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total RMAs</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.rmas.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.rmas.pending}
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
              <p className="text-xs text-gray-600 dark:text-gray-400">Processing</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.rmas.processing}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.rmas.completed}
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
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Refunds</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.rmas.totalRefund.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Reverse Logistics</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.reverseLogistics.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('rmas');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rmas'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                RMAs
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('reverse-logistics');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reverse-logistics'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Reverse Logistics
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* RMAs Tab */}
          {activeTab === 'rmas' && (
            <>
              {/* Search and Filters */}
              <div className="flex w-full justify-between gap-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <SearchInput
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search RMAs..."
                    className="flex-1 min-w-[300px]"
                  />
                  <div className="min-w-[200px]">
                    <CustomDropdown
                      value={statusFilter}
                      onChange={(value) => {
                        setStatusFilter(value);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'All Status' },
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'APPROVED', label: 'Approved' },
                        { value: 'REJECTED', label: 'Rejected' },
                        { value: 'PROCESSING', label: 'Processing' },
                        { value: 'COMPLETED', label: 'Completed' },
                        { value: 'CANCELLED', label: 'Cancelled' },
                      ]}
                    />
                  </div>
                  <div className="min-w-[200px]">
                    <CustomDropdown
                      value={reasonFilter}
                      onChange={(value) => {
                        setReasonFilter(value);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'All Reasons' },
                        { value: 'DEFECTIVE', label: 'Defective' },
                        { value: 'WRONG_SIZE', label: 'Wrong Size' },
                        { value: 'NOT_AS_DESCRIBED', label: 'Not as Described' },
                        { value: 'DAMAGED', label: 'Damaged' },
                        { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
                        { value: 'OTHER', label: 'Other' },
                      ]}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedRMA(null);
                    setIsRMAModalOpen(true);
                  }}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New RMA
                </button>
              </div>

              {/* RMAs Table */}
              {filteredRmas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RotateCcw className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery || statusFilter !== 'all' || reasonFilter !== 'all'
                      ? 'No matching RMAs found'
                      : 'No RMAs found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          RMA #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Refund Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Requested Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredRmas
                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                        .map((rma) => (
                          <tr key={rma.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {rma.rmaNumber}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {rma.orderNumber || `Order #${rma.orderId}`}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {rma.product?.name || 'Unknown'}
                              </div>
                              {rma.product?.sku && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {rma.product.sku}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {rma.customer?.name || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {rma.quantity}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs text-gray-700 dark:text-gray-300">
                                {rma.reason.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rma.status)}`}
                              >
                                {rma.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {rma.refundAmount
                                ? `${rma.currency || 'USD'} ${rma.refundAmount.toFixed(2)}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {rma.requestedDate ? new Date(rma.requestedDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setRmaToView(rma);
                                    setIsRMAViewModalOpen(true);
                                  }}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRMA(rma);
                                    setIsRMAModalOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRmaToDelete(rma);
                                    setIsRMADeleteModalOpen(true);
                                  }}
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

              {/* Pagination */}
              {filteredRmas.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredRmas.length / ITEMS_PER_PAGE)}
                    totalItems={filteredRmas.length}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}

          {/* Reverse Logistics Tab */}
          {activeTab === 'reverse-logistics' && (
            <>
              {/* Search and Filters */}
              <div className="flex w-full justify-between gap-4 mb-6">
                <div className="flex w-full gap-4">
                  <SearchInput
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search reverse logistics..."
                    className="w-full"
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
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'IN_TRANSIT', label: 'In Transit' },
                        { value: 'RECEIVED', label: 'Received' },
                        { value: 'INSPECTED', label: 'Inspected' },
                        { value: 'PROCESSED', label: 'Processed' },
                        { value: 'CANCELLED', label: 'Cancelled' },
                      ]}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedReverseLogistics(null);
                    setIsReverseLogisticsModalOpen(true);
                  }}
                  className="flex items-center text-[14px] min-w-[130px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Entry
                </button>
              </div>

              {/* Reverse Logistics Table */}
              {filteredReverseLogistics.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Truck className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No matching reverse logistics entries found'
                      : 'No reverse logistics entries found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          RMA #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Tracking #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Carrier
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Shipped Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Received Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Destination
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredReverseLogistics
                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                        .map((logistics) => (
                          <tr key={logistics.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {logistics.rmaNumber || `RMA #${logistics.rmaId}`}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                              {logistics.trackingNumber || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {logistics.carrier || '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(logistics.status)}`}
                              >
                                {logistics.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {logistics.shippedDate ? new Date(logistics.shippedDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {logistics.receivedDate ? new Date(logistics.receivedDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {logistics.destinationAddress
                                ? `${logistics.destinationAddress.city}, ${logistics.destinationAddress.country}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setReverseLogisticsToView(logistics);
                                    setIsReverseLogisticsViewModalOpen(true);
                                  }}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedReverseLogistics(logistics);
                                    setIsReverseLogisticsModalOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setReverseLogisticsToDelete(logistics);
                                    setIsReverseLogisticsDeleteModalOpen(true);
                                  }}
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

              {/* Pagination */}
              {filteredReverseLogistics.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredReverseLogistics.length / ITEMS_PER_PAGE)}
                    totalItems={filteredReverseLogistics.length}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RMA Create/Edit Modal */}
      {isRMAModalOpen && (
        <RMAModal
          rma={selectedRMA}
          orders={orders}
          products={products}
          onClose={() => {
            setIsRMAModalOpen(false);
            setSelectedRMA(null);
          }}
          onSubmit={(data: Partial<RMA>) => {
            if (selectedRMA?.id) {
              updateRMAMutation.mutate({ id: selectedRMA.id, rmaData: data });
            } else {
              // Generate RMA number if not provided
              const rmaNumber = data.rmaNumber || `RET-BORIS-${String(Date.now()).padStart(10, '0')}`;
              createRMAMutation.mutate({
                ...data,
                rmaNumber,
              } as Omit<RMA, 'id' | 'createdAt' | 'updatedAt'>);
            }
          }}
          isLoading={createRMAMutation.isPending || updateRMAMutation.isPending}
        />
      )}

      {/* RMA View Modal */}
      {isRMAViewModalOpen && rmaToView && (
        <RMAViewModal
          rma={rmaToView}
          onClose={() => {
            setIsRMAViewModalOpen(false);
            setRmaToView(null);
          }}
        />
      )}

      {/* RMA Delete Modal */}
      {isRMADeleteModalOpen && rmaToDelete && (
        <DeleteModal
          title="Delete RMA"
          message="Are you sure you want to delete"
          itemName={rmaToDelete.rmaNumber}
          onClose={() => {
            setIsRMADeleteModalOpen(false);
            setRmaToDelete(null);
          }}
          onConfirm={() => {
            if (rmaToDelete?.id) {
              deleteRMAMutation.mutate(rmaToDelete.id);
            }
          }}
          isLoading={deleteRMAMutation.isPending}
        />
      )}

      {/* Reverse Logistics Create/Edit Modal */}
      {isReverseLogisticsModalOpen && (
        <ReverseLogisticsModal
          reverseLogistics={selectedReverseLogistics}
          rmas={rmas}
          onClose={() => {
            setIsReverseLogisticsModalOpen(false);
            setSelectedReverseLogistics(null);
          }}
          onSubmit={(data) => {
            if (selectedReverseLogistics?.id) {
              updateReverseLogisticsMutation.mutate({ id: selectedReverseLogistics.id, logisticsData: data });
            } else {
              // Transform data to match backend DTO
              const apiData: any = {
                rmaId: Number(data.rmaId) || 0,
              };

              // Add optional fields only if they have values
              if (data.trackingNumber) apiData.trackingNumber = data.trackingNumber;
              if (data.carrier) apiData.carrier = data.carrier;
              if (data.status) apiData.status = data.status;

              // Transform originAddress object to individual fields
              if (data.originAddress) {
                if (data.originAddress.name) apiData.originName = data.originAddress.name;
                if (data.originAddress.address) apiData.originAddress = data.originAddress.address;
                if (data.originAddress.city) apiData.originCity = data.originAddress.city;
                if (data.originAddress.state) apiData.originState = data.originAddress.state;
                if (data.originAddress.postalCode) apiData.originPostalCode = data.originAddress.postalCode;
                if (data.originAddress.country) apiData.originCountry = data.originAddress.country;
              }

              // Transform destinationAddress object to individual fields
              if (data.destinationAddress) {
                if (data.destinationAddress.name) apiData.destinationName = data.destinationAddress.name;
                if (data.destinationAddress.address) apiData.destinationAddress = data.destinationAddress.address;
                if (data.destinationAddress.city) apiData.destinationCity = data.destinationAddress.city;
                if (data.destinationAddress.state) apiData.destinationState = data.destinationAddress.state;
                if (data.destinationAddress.postalCode) apiData.destinationPostalCode = data.destinationAddress.postalCode;
                if (data.destinationAddress.country) apiData.destinationCountry = data.destinationAddress.country;
              }

              // Add date fields if they have values
              if (data.shippedDate) apiData.shippedDate = data.shippedDate;
              if (data.receivedDate) apiData.receivedDate = data.receivedDate;
              if (data.inspectedDate) apiData.inspectedDate = data.inspectedDate;
              if (data.processedDate) apiData.processedDate = data.processedDate;
              if (data.estimatedDeliveryDate) apiData.estimatedDeliveryDate = data.estimatedDeliveryDate;
              if (data.notes) apiData.notes = data.notes;

              createReverseLogisticsMutation.mutate(apiData);
            }
          }}
          isLoading={createReverseLogisticsMutation.isPending || updateReverseLogisticsMutation.isPending}
        />
      )}

      {/* Reverse Logistics View Modal */}
      {isReverseLogisticsViewModalOpen && reverseLogisticsToView && (
        <ReverseLogisticsViewModal
          reverseLogistics={reverseLogisticsToView}
          onClose={() => {
            setIsReverseLogisticsViewModalOpen(false);
            setReverseLogisticsToView(null);
          }}
        />
      )}

      {/* Reverse Logistics Delete Modal */}
      {isReverseLogisticsDeleteModalOpen && reverseLogisticsToDelete && (
        <DeleteModal
          title="Delete Reverse Logistics"
          message="Are you sure you want to delete this reverse logistics entry"
          itemName={`for RMA ${reverseLogisticsToDelete.rmaNumber || reverseLogisticsToDelete.rmaId}`}
          onClose={() => {
            setIsReverseLogisticsDeleteModalOpen(false);
            setReverseLogisticsToDelete(null);
          }}
          onConfirm={() => {
            if (reverseLogisticsToDelete?.id) {
              deleteReverseLogisticsMutation.mutate(reverseLogisticsToDelete.id);
            }
          }}
          isLoading={deleteReverseLogisticsMutation.isPending}
        />
      )}
    </div>
  );
}

// RMA Modal Component
function RMAModal({
  rma,
  orders,
  products,
  onClose,
  onSubmit,
  isLoading,
}: {
  rma: RMA | null;
  orders: any[];
  products: any[];
  onClose: () => void;
  onSubmit: (data: Partial<RMA>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<RMA>>({
    orderId: rma?.orderId || 0,
    productId: rma?.productId || 0,
    orderLineId: rma?.orderLineId,
    quantity: rma?.quantity || 1,
    reason: rma?.reason || 'DEFECTIVE',
    reasonDetails: rma?.reasonDetails || '',
    status: rma?.status || 'PENDING',
    refundAmount: rma?.refundAmount,
    notes: rma?.notes || '',
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId || !formData.productId || !formData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {rma ? 'Edit RMA' : 'Create RMA'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.orderId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, orderId: parseInt(value) || 0 })}
                options={orders.map((order) => ({
                  value: order.id.toString(),
                  label: order.orderNumber || `Order #${order.id}`,
                }))}
                placeholder="Select Order"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.productId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, productId: parseInt(value) || 0 })}
                options={products.map((product) => ({
                  value: product.id.toString(),
                  label: `${product.name} (${product.sku})`,
                }))}
                placeholder="Select Product"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.reason || 'DEFECTIVE'}
                onChange={(value) => setFormData({ ...formData, reason: value as RMA['reason'] })}
                options={[
                  { value: 'DEFECTIVE', label: 'Defective' },
                  { value: 'WRONG_SIZE', label: 'Wrong Size' },
                  { value: 'NOT_AS_DESCRIBED', label: 'Not as Described' },
                  { value: 'DAMAGED', label: 'Damaged' },
                  { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={formData.status || 'PENDING'}
                onChange={(value) => setFormData({ ...formData, status: value as RMA['status'] })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'PROCESSING', label: 'Processing' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Refund Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.refundAmount || ''}
                onChange={(e) => setFormData({ ...formData, refundAmount: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason Details
            </label>
            <textarea
              value={formData.reasonDetails || ''}
              onChange={(e) => setFormData({ ...formData, reasonDetails: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Additional details about the return reason..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Internal notes..."
            />
          </div>

          <div className="flex items-center text-[14px] justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : rma ? 'Update RMA' : 'Create RMA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// RMA View Modal Component
function RMAViewModal({ rma, onClose }: { rma: RMA; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">RMA Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">RMA Number</label>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{rma.rmaNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
              <p className="text-sm text-gray-900 dark:text-white">{rma.orderNumber || `Order #${rma.orderId}`}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
              <p className="text-sm text-gray-900 dark:text-white">{rma.product?.name || 'Unknown'}</p>
              {rma.product?.sku && (
                <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {rma.product.sku}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</label>
              <p className="text-sm text-gray-900 dark:text-white">{rma.customer?.name || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
              <p className="text-sm text-gray-900 dark:text-white">{rma.quantity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reason</label>
              <p className="text-sm text-gray-900 dark:text-white">{rma.reason.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rma.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                rma.status === 'APPROVED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  rma.status === 'REJECTED' || rma.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    rma.status === 'PROCESSING' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                {rma.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Refund Amount</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {rma.refundAmount ? `${rma.currency || 'USD'} ${rma.refundAmount.toFixed(2)}` : '—'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Requested Date</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {rma.requestedDate ? new Date(rma.requestedDate).toLocaleDateString() : '—'}
              </p>
            </div>
            {rma.approvedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Approved Date</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(rma.approvedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {rma.processedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Processed Date</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(rma.processedDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {rma.reasonDetails && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reason Details</label>
              <p className="text-sm text-gray-900 dark:text-white">{rma.reasonDetails}</p>
            </div>
          )}

          {rma.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{rma.notes}</p>
            </div>
          )}

          <div className="flex items-center text-[14px] justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
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

// Reverse Logistics Modal Component
function ReverseLogisticsModal({
  reverseLogistics,
  rmas,
  onClose,
  onSubmit,
  isLoading,
}: {
  reverseLogistics: ReverseLogistics | null;
  rmas: RMA[];
  onClose: () => void;
  onSubmit: (data: Partial<ReverseLogistics>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<ReverseLogistics>>({
    rmaId: reverseLogistics?.rmaId || (rmas.length > 0 ? Number(rmas[0].id) : 0),
    trackingNumber: reverseLogistics?.trackingNumber || '',
    carrier: reverseLogistics?.carrier || '',
    status: reverseLogistics?.status || 'PENDING',
    originAddress: reverseLogistics?.originAddress || {
      name: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
    },
    destinationAddress: reverseLogistics?.destinationAddress || {
      name: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
    },
    shippedDate: reverseLogistics?.shippedDate || '',
    receivedDate: reverseLogistics?.receivedDate || '',
    inspectedDate: reverseLogistics?.inspectedDate || '',
    processedDate: reverseLogistics?.processedDate || '',
    estimatedDeliveryDate: reverseLogistics?.estimatedDeliveryDate || '',
    notes: reverseLogistics?.notes || '',
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rmaId || Number(formData.rmaId) === 0) {
      toast.error('Please select an RMA');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white z-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {reverseLogistics ? 'Edit Reverse Logistics' : 'Create Reverse Logistics'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                RMA <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.rmaId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, rmaId: Number(value) || 0 })}
                options={rmas.map((rma) => ({
                  value: rma.id?.toString() || '',
                  label: rma.rmaNumber,
                }))}
                placeholder="Select RMA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={formData.status || 'PENDING'}
                onChange={(value) => setFormData({ ...formData, status: value as ReverseLogistics['status'] })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'IN_TRANSIT', label: 'In Transit' },
                  { value: 'RECEIVED', label: 'Received' },
                  { value: 'INSPECTED', label: 'Inspected' },
                  { value: 'PROCESSED', label: 'Processed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tracking Number
              </label>
              <input
                type="text"
                value={formData.trackingNumber || ''}
                onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Carrier
              </label>
              <input
                type="text"
                value={formData.carrier || ''}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter carrier name"
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Origin Address */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Origin Address</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.originAddress?.name || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originAddress: { ...formData.originAddress!, name: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter origin name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.originAddress?.address || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originAddress: { ...formData.originAddress!, address: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter origin address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.originAddress?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originAddress: { ...formData.originAddress!, city: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter origin city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.originAddress?.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originAddress: { ...formData.originAddress!, state: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter origin state"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code</label>
                  <input
                    type="text"
                    value={formData.originAddress?.postalCode || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originAddress: { ...formData.originAddress!, postalCode: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter origin postal code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.originAddress?.country || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originAddress: { ...formData.originAddress!, country: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter origin country"
                  />
                </div>
              </div>
            </div>

            {/* Destination Address */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Destination Address</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.destinationAddress?.name || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationAddress: { ...formData.destinationAddress!, name: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter destination name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.destinationAddress?.address || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationAddress: { ...formData.destinationAddress!, address: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter destination address"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.destinationAddress?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationAddress: { ...formData.destinationAddress!, city: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter destination city"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.destinationAddress?.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationAddress: { ...formData.destinationAddress!, state: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter destination state"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code</label>
                  <input
                    type="text"
                    value={formData.destinationAddress?.postalCode || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationAddress: { ...formData.destinationAddress!, postalCode: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter destination postal code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.destinationAddress?.country || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinationAddress: { ...formData.destinationAddress!, country: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter destination country"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shipped Date</label>
              <DatePicker
                value={formData.shippedDate || undefined}
                onChange={(value) => setFormData({ ...formData, shippedDate: value || undefined })}
                placeholder="Select shipped date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Received Date</label>
              <DatePicker
                value={formData.receivedDate || undefined}
                onChange={(value) => setFormData({ ...formData, receivedDate: value || undefined })}
                placeholder="Select received date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inspected Date</label>
              <DatePicker
                value={formData.inspectedDate || undefined}
                onChange={(value) => setFormData({ ...formData, inspectedDate: value || undefined })}
                placeholder="Select inspected date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Processed Date</label>
              <DatePicker
                value={formData.processedDate || undefined}
                onChange={(value) => setFormData({ ...formData, processedDate: value || undefined })}
                placeholder="Select processed date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Delivery Date</label>
              <DatePicker
                value={formData.estimatedDeliveryDate || undefined}
                onChange={(value) => setFormData({ ...formData, estimatedDeliveryDate: value || undefined })}
                placeholder="Select estimated delivery date"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex items-center text-[14px] justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : reverseLogistics ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reverse Logistics View Modal Component
function ReverseLogisticsViewModal({
  reverseLogistics,
  onClose,
}: {
  reverseLogistics: ReverseLogistics;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reverse Logistics Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">RMA Number</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {reverseLogistics.rmaNumber || `RMA #${reverseLogistics.rmaId}`}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reverseLogistics.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                reverseLogistics.status === 'IN_TRANSIT' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                  reverseLogistics.status === 'RECEIVED' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' :
                    reverseLogistics.status === 'INSPECTED' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                      reverseLogistics.status === 'PROCESSED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                {reverseLogistics.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tracking Number</label>
              <p className="text-sm text-gray-900 dark:text-white font-mono">
                {reverseLogistics.trackingNumber || '—'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Carrier</label>
              <p className="text-sm text-gray-900 dark:text-white">{reverseLogistics.carrier || '—'}</p>
            </div>
            {reverseLogistics.shippedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Shipped Date</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(reverseLogistics.shippedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {reverseLogistics.receivedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Received Date</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(reverseLogistics.receivedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {reverseLogistics.inspectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Inspected Date</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(reverseLogistics.inspectedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {reverseLogistics.processedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Processed Date</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(reverseLogistics.processedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {reverseLogistics.estimatedDeliveryDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Estimated Delivery Date</label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(reverseLogistics.estimatedDeliveryDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {reverseLogistics.originAddress && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Origin Address</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p>{reverseLogistics.originAddress.name}</p>
                <p>{reverseLogistics.originAddress.address}</p>
                <p>
                  {reverseLogistics.originAddress.city}
                  {reverseLogistics.originAddress.state && `, ${reverseLogistics.originAddress.state}`}{' '}
                  {reverseLogistics.originAddress.postalCode}
                </p>
                <p>{reverseLogistics.originAddress.country}</p>
              </div>
            </div>
          )}

          {reverseLogistics.destinationAddress && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Destination Address</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p>{reverseLogistics.destinationAddress.name}</p>
                <p>{reverseLogistics.destinationAddress.address}</p>
                <p>
                  {reverseLogistics.destinationAddress.city}
                  {reverseLogistics.destinationAddress.state && `, ${reverseLogistics.destinationAddress.state}`}{' '}
                  {reverseLogistics.destinationAddress.postalCode}
                </p>
                <p>{reverseLogistics.destinationAddress.country}</p>
              </div>
            </div>
          )}

          {reverseLogistics.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{reverseLogistics.notes}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
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