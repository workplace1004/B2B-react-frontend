import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  RotateCcw,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Search,
  Clock,
  CheckCircle2,
  Eye,
  Truck,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown } from '../components/ui';

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
  const itemsPerPage = 10;

  // Local storage keys
  const RMAS_KEY = 'returns_rma_rmas';
  const REVERSE_LOGISTICS_KEY = 'returns_rma_reverse_logistics';

  // Fetch orders (for future use when creating RMAs)
  // const { data: ordersData } = useQuery({
  //   queryKey: ['orders', 'rma'],
  //   queryFn: async () => {
  //     try {
  //       const response = await api.get('/orders');
  //       return response.data || [];
  //     } catch (error) {
  //       console.error('Error fetching orders:', error);
  //       return [];
  //     }
  //   },
  // });

  // Fetch products (for future use when creating RMAs)
  // const { data: productsData } = useQuery({
  //   queryKey: ['products', 'rma'],
  //   queryFn: async () => {
  //     try {
  //       const response = await api.get('/products?skip=0&take=10000');
  //       return response.data?.data || [];
  //     } catch (error) {
  //       console.error('Error fetching products:', error);
  //       return [];
  //     }
  //   },
  // });

  // Orders and products are available for creating RMAs
  // const orders: Order[] = useMemo(() => {
  //   const data = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
  //   return data;
  // }, [ordersData]);

  // const products: Product[] = useMemo(() => {
  //   return Array.isArray(productsData) ? productsData : [];
  // }, [productsData]);

  // Load RMAs and reverse logistics from localStorage
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [reverseLogistics, setReverseLogistics] = useState<ReverseLogistics[]>([]);

  useEffect(() => {
    try {
      const storedRmas = localStorage.getItem(RMAS_KEY);
      if (storedRmas) {
        setRmas(JSON.parse(storedRmas));
      }
    } catch (error) {
      console.error('Error loading RMAs:', error);
    }

    try {
      const storedReverseLogistics = localStorage.getItem(REVERSE_LOGISTICS_KEY);
      if (storedReverseLogistics) {
        setReverseLogistics(JSON.parse(storedReverseLogistics));
      }
    } catch (error) {
      console.error('Error loading reverse logistics:', error);
    }
  }, []);

  // Save functions (used when creating/updating items)
  // const saveRmas = (rmasList: RMA[]) => {
  //   try {
  //     localStorage.setItem(RMAS_KEY, JSON.stringify(rmasList));
  //     setRmas(rmasList);
  //   } catch (error) {
  //     console.error('Error saving RMAs:', error);
  //     toast.error('Failed to save RMAs');
  //   }
  // };

  // const saveReverseLogistics = (logisticsList: ReverseLogistics[]) => {
  //   try {
  //     localStorage.setItem(REVERSE_LOGISTICS_KEY, JSON.stringify(logisticsList));
  //     setReverseLogistics(logisticsList);
  //   } catch (error) {
  //     console.error('Error saving reverse logistics:', error);
  //     toast.error('Failed to save reverse logistics');
  //   }
  // };

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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'rmas'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'reverse-logistics'
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search RMAs..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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

              {/* Header with Create Button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Return Merchandise Authorizations</h3>
                <button
                  onClick={() => {
                    toast.success('Create RMA feature coming soon');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
                  {!searchQuery && statusFilter === 'all' && reasonFilter === 'all' && (
                    <button
                      onClick={() => {
                        toast.success('Create RMA feature coming soon');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create First RMA
                    </button>
                  )}
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
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
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
                                    toast('View RMA details feature coming soon');
                                  }}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
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
              {Math.ceil(filteredRmas.length / itemsPerPage) > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredRmas.length)}</span>{' '}
                    of <span className="font-medium">{filteredRmas.length}</span> RMAs
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
                      Page {currentPage} of {Math.ceil(filteredRmas.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(Math.ceil(filteredRmas.length / itemsPerPage), prev + 1))
                      }
                      disabled={currentPage >= Math.ceil(filteredRmas.length / itemsPerPage)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(filteredRmas.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredRmas.length / itemsPerPage)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reverse Logistics Tab */}
          {activeTab === 'reverse-logistics' && (
            <>
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search reverse logistics..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reverse Logistics</h3>
                <button
                  onClick={() => {
                    toast.success('Create reverse logistics entry feature coming soon');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
                  {!searchQuery && statusFilter === 'all' && (
                    <button
                      onClick={() => {
                        toast.success('Create reverse logistics entry feature coming soon');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Entry
                    </button>
                  )}
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
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
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
                                    toast('View reverse logistics details feature coming soon');
                                  }}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
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
              {Math.ceil(filteredReverseLogistics.length / itemsPerPage) > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredReverseLogistics.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredReverseLogistics.length}</span> entries
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
                      Page {currentPage} of {Math.ceil(filteredReverseLogistics.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(Math.ceil(filteredReverseLogistics.length / itemsPerPage), prev + 1)
                        )
                      }
                      disabled={currentPage >= Math.ceil(filteredReverseLogistics.length / itemsPerPage)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(filteredReverseLogistics.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredReverseLogistics.length / itemsPerPage)}
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