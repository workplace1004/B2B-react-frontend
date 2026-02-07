import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  RotateCcw,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Plus,
  FileText,
  Eye,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown } from '../components/ui';

type TabType = 'return-status' | 'case-log';
type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
type CaseStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
type CasePriority = 'low' | 'medium' | 'high' | 'urgent';

export default function Service() {
  const [activeTab, setActiveTab] = useState<TabType>('return-status');

  const tabs = [
    { id: 'return-status' as TabType, label: 'Return Status (RMA Inquiry)', icon: RotateCcw },
    { id: 'case-log' as TabType, label: 'Case/Issue Log', icon: FileText },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Services" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Services</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Return status inquiry and case/issue log management
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'return-status' && <ReturnStatusSection />}
        {activeTab === 'case-log' && <CaseLogSection />}
      </div>
    </div>
  );
}

// Return Status (RMA Inquiry) Section
function ReturnStatusSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  // Fetch returns/RMA data
  const { data: returnsData, isLoading: isLoadingReturns } = useQuery({
    queryKey: ['returns', 'rma-inquiry'],
    queryFn: async () => {
      try {
        const response = await api.get('/returns?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for additional context
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'rma-inquiry'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const returns = returnsData || [];
  const orders = ordersData || [];

  // Process and enrich return data
  const processedReturns = useMemo(() => {
    return returns.map((returnItem: any) => {
      const order = orders.find((o: any) => o.id === returnItem.orderId);
      const orderNumber = order?.orderNumber || returnItem.order?.orderNumber || `ORD-${returnItem.orderId || 'N/A'}`;
      
      // Normalize status
      let status: ReturnStatus = 'pending';
      const statusStr = (returnItem.status || '').toLowerCase();
      if (statusStr.includes('approved') || statusStr === 'approved') {
        status = 'approved';
      } else if (statusStr.includes('rejected') || statusStr === 'rejected') {
        status = 'rejected';
      } else if (statusStr.includes('processing') || statusStr === 'processing') {
        status = 'processing';
      } else if (statusStr.includes('completed') || statusStr === 'completed') {
        status = 'completed';
      } else if (statusStr.includes('cancelled') || statusStr === 'cancelled') {
        status = 'cancelled';
      }

      // Calculate dates
      const requestedDate = returnItem.requestedDate || returnItem.createdAt || new Date();
      const processedDate = returnItem.processedDate || returnItem.updatedAt;
      const completedDate = returnItem.completedDate;

      // Calculate days since request
      const daysSinceRequest = Math.floor(
        (new Date().getTime() - new Date(requestedDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: returnItem.id,
        rmaNumber: returnItem.rmaNumber || `RMA-${returnItem.id}`,
        orderId: returnItem.orderId,
        orderNumber,
        productName: returnItem.product?.name || returnItem.productName || 'Product',
        sku: returnItem.product?.sku || returnItem.sku || 'N/A',
        quantity: returnItem.quantity || 1,
        reason: returnItem.reason || 'Not specified',
        status,
        requestedDate,
        processedDate,
        completedDate,
        daysSinceRequest,
        notes: returnItem.notes || '',
        returnItem,
      };
    });
  }, [returns, orders]);

  // Filter returns
  const filteredReturns = useMemo(() => {
    let filtered = processedReturns;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.rmaNumber.toLowerCase().includes(query) ||
        item.orderNumber.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a: any, b: any) => {
      return new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime();
    });
  }, [processedReturns, searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const pending = filteredReturns.filter((item: any) => item.status === 'pending');
    const processing = filteredReturns.filter((item: any) => item.status === 'processing');
    const completed = filteredReturns.filter((item: any) => item.status === 'completed');
    const total = filteredReturns.length;

    return {
      total,
      pending: pending.length,
      processing: processing.length,
      completed: completed.length,
    };
  }, [filteredReturns]);

  if (isLoadingReturns) {
    return <SkeletonPage />;
  }

  const getStatusColor = (status: ReturnStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'processing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: ReturnStatus) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return X;
      case 'processing':
        return RotateCcw;
      case 'completed':
        return CheckCircle;
      case 'cancelled':
        return X;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Returns</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pending}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.processing}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by RMA number, order number, product, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      {filteredReturns.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <RotateCcw className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No returns found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No return requests (RMA) found. Returns will appear here once created.'}
            </p>
          </div>
          </div>
        ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    RMA Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Product / SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Requested Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReturns.map((item: any) => {
                  const StatusIcon = getStatusIcon(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.rmaNumber}
                        </div>
                        {item.daysSinceRequest >= 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.daysSinceRequest} days ago
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.productName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {item.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(item.requestedDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${getStatusColor(item.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedReturn(item)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Details Modal */}
      {selectedReturn && (
        <ReturnDetailsModal returnItem={selectedReturn} onClose={() => setSelectedReturn(null)} />
      )}
    </div>
  );
}

// Return Details Modal Component
interface ReturnDetailsModalProps {
  returnItem: any;
  onClose: () => void;
}

function ReturnDetailsModal({ returnItem, onClose }: ReturnDetailsModalProps) {
  if (!returnItem) return null;

  const getStatusColor = (status: ReturnStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'processing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Return Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{returnItem.rmaNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(returnItem.status)}`}>
                  {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Requested</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(returnItem.requestedDate).toLocaleDateString()}
                </p>
                {returnItem.daysSinceRequest >= 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {returnItem.daysSinceRequest} days ago
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{returnItem.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">RMA Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{returnItem.rmaNumber}</p>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Product Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Product Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{returnItem.productName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">SKU</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{returnItem.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quantity</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{returnItem.quantity}</p>
              </div>
            </div>
          </div>

          {/* Return Details */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Return Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reason</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{returnItem.reason}</p>
              </div>
              {returnItem.notes && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{returnItem.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Request Submitted</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(returnItem.requestedDate).toLocaleString()}
                  </p>
                </div>
              </div>
              {returnItem.processedDate && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Processing Started</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(returnItem.processedDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {returnItem.completedDate && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Completed</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(returnItem.completedDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Case/Issue Log Section
function CaseLogSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);

  // Load cases from localStorage or fetch from API
  const [cases, setCases] = useState<any[]>(() => {
    const saved = localStorage.getItem('service-cases');
    return saved ? JSON.parse(saved) : [];
  });

  // Save cases to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('service-cases', JSON.stringify(cases));
  }, [cases]);

  // Filter cases
  const filteredCases = useMemo(() => {
    let filtered = cases;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.caseNumber.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.priority === priorityFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a: any, b: any) => {
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });
  }, [cases, searchQuery, statusFilter, priorityFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const open = filteredCases.filter((item: any) => item.status === 'open');
    const inProgress = filteredCases.filter((item: any) => item.status === 'in-progress');
    const resolved = filteredCases.filter((item: any) => item.status === 'resolved');
    const urgent = filteredCases.filter((item: any) => item.priority === 'urgent');

    return {
      total: filteredCases.length,
      open: open.length,
      inProgress: inProgress.length,
      resolved: resolved.length,
      urgent: urgent.length,
    };
  }, [filteredCases]);

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in-progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: CasePriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const handleCreateCase = (caseData: any) => {
    const newCase = {
      id: Date.now(),
      caseNumber: `CASE-${Date.now()}`,
      ...caseData,
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    };
    setCases([...cases, newCase]);
    setShowCreateModal(false);
    toast.success('Case created successfully!');
  };

  const handleUpdateCase = (caseId: number, updates: any) => {
    setCases(cases.map((c: any) => 
      c.id === caseId 
        ? { ...c, ...updates, updatedDate: new Date().toISOString() }
        : c
    ));
    toast.success('Case updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Cases</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Open</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.open}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.inProgress}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Urgent</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.urgent}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search cases by number, title, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'open', label: 'Open' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Case
            </button>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      {filteredCases.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No cases found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No cases or issues logged yet. Create a new case to get started.'}
            </p>
            {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Case
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Case Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCases.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.caseNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {item.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.createdDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedCase(item)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCase}
        />
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <CaseDetailsModal
          caseItem={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdate={handleUpdateCase}
        />
      )}
    </div>
  );
}

// Create Case Modal Component
interface CreateCaseModalProps {
  onClose: () => void;
  onCreate: (caseData: any) => void;
}

function CreateCaseModal({ onClose, onCreate }: CreateCaseModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('technical');
  const [priority, setPriority] = useState<CasePriority>('medium');
  const [status, setStatus] = useState<CaseStatus>('open');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status,
    });
    setTitle('');
    setDescription('');
    setCategory('technical');
    setPriority('medium');
    setStatus('open');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Case</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter case title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the issue or case details"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <div className="min-w-[240px]">
                <CustomDropdown
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: 'technical', label: 'Technical' },
                    { value: 'billing', label: 'Billing' },
                    { value: 'order', label: 'Order Issue' },
                    { value: 'product', label: 'Product Issue' },
                    { value: 'account', label: 'Account Issue' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <div className="min-w-[240px]">
                <CustomDropdown
                  value={priority}
                  onChange={(val) => setPriority(val as CasePriority)}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 -mx-6 -mb-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Case Details Modal Component
interface CaseDetailsModalProps {
  caseItem: any;
  onClose: () => void;
  onUpdate: (caseId: number, updates: any) => void;
}

function CaseDetailsModal({ caseItem, onClose, onUpdate }: CaseDetailsModalProps) {
  const [status, setStatus] = useState<CaseStatus>(caseItem.status);
  const [priority, setPriority] = useState<CasePriority>(caseItem.priority);
  const [notes, setNotes] = useState(caseItem.notes || '');

  const handleSave = () => {
    onUpdate(caseItem.id, {
      status,
      priority,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{caseItem.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{caseItem.caseNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Status</p>
                <div className="min-w-[240px]">
                  <CustomDropdown
                    value={status}
                    onChange={(val) => setStatus(val as CaseStatus)}
                    options={[
                      { value: 'open', label: 'Open' },
                      { value: 'in-progress', label: 'In Progress' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'closed', label: 'Closed' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Priority</p>
                <div className="min-w-[240px]">
                  <CustomDropdown
                    value={priority}
                    onChange={(val) => setPriority(val as CasePriority)}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Case Information */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Case Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Case Number</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{caseItem.caseNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {caseItem.category.charAt(0).toUpperCase() + caseItem.category.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Created Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(caseItem.createdDate).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(caseItem.updatedDate).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{caseItem.description}</p>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Add notes or updates about this case..."
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}