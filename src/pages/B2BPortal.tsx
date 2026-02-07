import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, ShoppingCart, User, Search, Download, Share2, Eye, X, Mail, Link as LinkIcon, Copy, Check, Receipt, RotateCcw, Package, Plus, Trash2} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage, SkeletonForm } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown } from '../components/ui';

type TabType = 'line-sheets' | 'wholesale-ordering' | 'self-service';

export default function B2BPortal() {
  const [activeTab, setActiveTab] = useState<TabType>('line-sheets');

  const tabs = [
    { id: 'line-sheets' as TabType, label: 'Digital Line Sheets', icon: FileText },
    { id: 'wholesale-ordering' as TabType, label: 'Wholesale Ordering', icon: ShoppingCart },
    { id: 'self-service' as TabType, label: 'Customer Self-Service', icon: User },
  ];

  return (
    <div>
      <Breadcrumb currentPage="B2B Portal" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">B2B Portal</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Digital line sheets, wholesale ordering, and customer self-service</p>
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
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === tab.id
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
        {activeTab === 'line-sheets' && <DigitalLineSheetsSection />}
        {activeTab === 'wholesale-ordering' && <WholesaleOrderingSection />}
        {activeTab === 'self-service' && <CustomerSelfServiceSection />}
      </div>
    </div>
  );
}

// Digital Line Sheets Section Component
function DigitalLineSheetsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<any>(null);
  const [shareMethod, setShareMethod] = useState<'link' | 'email'>('link');
  const [emailAddress, setEmailAddress] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch line sheets from DAM API (filter by DOCUMENT type and lookbook/line sheet keywords)
  const { data: sheetsData, isLoading } = useQuery({
    queryKey: ['dam', 'line-sheets', searchQuery],
    queryFn: async () => {
      const response = await api.get('/dam');
      // Filter DOCUMENT type assets that are line sheets
      const documents = (response.data || []).filter((asset: any) => {
        if (asset.type !== 'DOCUMENT') return false;
        const nameLower = asset.name.toLowerCase();
        const descLower = asset.description?.toLowerCase() || '';
        const tagsLower = asset.tags?.join(' ').toLowerCase() || '';
        const searchText = nameLower + ' ' + descLower + ' ' + tagsLower;
        return searchText.includes('line sheet') || searchText.includes('linesheet') || searchText.includes('lookbook');
      });
      // Filter by search query if provided
      if (searchQuery) {
        return documents.filter((asset: any) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return documents;
    },
  });

  const lineSheets = sheetsData || [];

  const handleDownload = (sheet: any) => {
    if (sheet.url) {
      const link = document.createElement('a');
      link.href = sheet.url;
      link.download = sheet.name;
      link.click();
      toast.success('Line sheet download started');
    } else {
      toast.error('Download URL not available');
    }
  };

  const handleShare = (sheet: any) => {
    setSelectedSheet(sheet);
    setIsShareModalOpen(true);
    setShareMethod('link');
    setEmailAddress('');
    setLinkCopied(false);
  };

  const handleCopyLink = () => {
    if (selectedSheet?.url) {
      navigator.clipboard.writeText(selectedSheet.url);
      setLinkCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleShareViaEmail = () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    // In a real implementation, this would call an API to send the email
    toast.success(`Line sheet shared with ${emailAddress}`);
    setIsShareModalOpen(false);
    setSelectedSheet(null);
    setEmailAddress('');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search line sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ::placeholder-[12px] text-[14px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Line Sheets Grid */}
      {lineSheets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No line sheets found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No digital line sheets are available at the moment.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lineSheets.map((sheet: any) => (
            <div
              key={sheet.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{sheet.name}</h3>
                    {sheet.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{sheet.description}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0 ml-4">
                    <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>{formatFileSize(sheet.fileSize)}</span>
                  <span>•</span>
                  <span>{new Date(sheet.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (sheet.url) window.open(sheet.url, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDownload(sheet)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleShare(sheet)}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && selectedSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Line Sheet</h3>
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setSelectedSheet(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Share: <span className="font-semibold">{selectedSheet.name}</span></p>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShareMethod('link')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${shareMethod === 'link'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                <LinkIcon className="w-4 h-4" />
                Link
              </button>
              <button
                onClick={() => setShareMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${shareMethod === 'email'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
            {shareMethod === 'link' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedSheet.url || ''}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white mb-3"
                />
                <button
                  onClick={handleShareViaEmail}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Line Sheet
                </button>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setSelectedSheet(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wholesale Ordering Section Component
function WholesaleOrderingSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  // Fetch wholesale orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'wholesale', searchQuery, statusFilter],
    queryFn: async () => {
      const response = await api.get('/orders?skip=0&take=1000');
      let orders = (response.data?.data || []).filter((order: any) =>
        order.type === 'B2B' || order.type === 'WHOLESALE'
      );

      // Filter by status
      if (statusFilter !== 'all') {
        orders = orders.filter((order: any) => order.status === statusFilter);
      }

      // Filter by search query
      if (searchQuery) {
        orders = orders.filter((order: any) =>
          order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return orders;
    },
  });

  const orders = ordersData || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'FULFILLED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CANCELLED':
      case 'RETURNED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Header with Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
              <div className="flex-1 relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ::placeholder-[12px] text-[14px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <CustomDropdown
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value)}
                  options={statusOptions}
                  placeholder="All Statuses"
                  className="min-w-[180px]"
                />
              </div>
            </div>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              New Order
            </button>
          </div>

        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No wholesale orders found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Get started by creating your first wholesale order.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {order.customer?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {order.orderLines?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${parseFloat(order.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {order.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsOrderModalOpen(true);
                        }}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {isOrderModalOpen && (
        <NewOrderModal
          order={selectedOrder}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}


// New Order Modal Component
function NewOrderModal({ order, onClose }: { order?: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    customerId: order?.customerId?.toString() || '',
    notes: order?.notes || '',
    shippingAddress: order?.shippingAddress || '',
    billingAddress: order?.billingAddress || '',
  });
  const [orderLines, setOrderLines] = useState<Array<{
    productId: number;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    size?: string;
    color?: string;
  }>>(order?.orderLines?.map((line: any) => ({
    productId: line.productId,
    productName: line.product?.name || 'Product',
    sku: line.product?.sku || '',
    quantity: line.quantity,
    unitPrice: parseFloat(line.unitPrice.toString()),
    size: line.size || '',
    color: line.color || '',
  })) || []);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch customers
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  // Fetch products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'order-creation'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  const customers = customersData || [];
  const products = productsData || [];

  const customerOptions = customers.map((customer: any) => ({
    value: customer.id.toString(),
    label: customer.name,
  }));

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const productOptions = filteredProducts.map((product: any) => ({
    value: product.id.toString(),
    label: `${product.name} (${product.sku || 'N/A'})`,
  }));

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = orderLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return {
      subtotal,
      total: subtotal,
    };
  }, [orderLines]);

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast.error('Please select a product');
      return;
    }

    const selectedProduct = products.find((p: any) => p.id.toString() === selectedProductId);
    if (!selectedProduct) {
      toast.error('Product not found');
      return;
    }

    const existingLine = orderLines.find(line => line.productId === selectedProduct.id);
    if (existingLine) {
      toast.error('Product already added to order');
      return;
    }

    const basePrice = parseFloat(selectedProduct.basePrice?.toString() || '0');
    const wholesalePrice = basePrice * 0.7; // 30% discount for wholesale

    setOrderLines([...orderLines, {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku || '',
      quantity: 1,
      unitPrice: wholesalePrice,
      size: selectedProduct.sizes?.[0] || '',
      color: selectedProduct.colors?.[0] || '',
    }]);
    setSelectedProductId('');
    setProductSearch('');
  };

  const handleRemoveLine = (index: number) => {
    setOrderLines(orderLines.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    const updated = [...orderLines];
    updated[index] = { ...updated[index], [field]: value };
    setOrderLines(updated);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/orders', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Order created successfully!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create order');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }

    if (orderLines.length === 0) {
      newErrors.orderLines = 'At least one product is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const orderData = {
      customerId: parseInt(formData.customerId),
      type: 'WHOLESALE',
      status: 'DRAFT',
      notes: formData.notes || undefined,
      shippingAddress: formData.shippingAddress || undefined,
      billingAddress: formData.billingAddress || undefined,
      orderLines: orderLines.map(line => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        size: line.size || undefined,
        color: line.color || undefined,
      })),
    };

    createOrderMutation.mutate(orderData);
  };

  if (isLoadingCustomers || isLoadingProducts) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
          <SkeletonForm fields={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white">
            {order ? 'Order Details' : 'New Wholesale Order'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:text-white hover:text-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.customerId}
                onChange={(value) => {
                  setFormData({ ...formData, customerId: value });
                  if (errors.customerId) setErrors({ ...errors, customerId: '' });
                }}
                options={customerOptions}
                placeholder="Select a customer"
                error={!!errors.customerId}
              />
              {errors.customerId && <p className="mt-1 text-sm text-red-500">{errors.customerId}</p>}
            </div>

            {/* Product Selection */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add Products</h4>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full ::placeholder-[12px] text-[14px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="w-64">
                  <CustomDropdown
                    value={selectedProductId}
                    onChange={(value) => setSelectedProductId(value)}
                    options={productOptions}
                    placeholder="Select a product"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              {errors.orderLines && <p className="mt-1 text-sm text-red-500">{errors.orderLines}</p>}
            </div>

            {/* Order Lines */}
            {orderLines.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Color</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {orderLines.map((line, index) => {
                        const product = products.find((p: any) => p.id === line.productId);
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{line.productName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{line.sku}</td>
                            <td className="px-4 py-3">
                              {product?.sizes && product.sizes.length > 0 ? (
                                <CustomDropdown
                                  value={line.size || ''}
                                  onChange={(value) => handleUpdateLine(index, 'size', value)}
                                  options={product.sizes.map((size: string) => ({ value: size, label: size }))}
                                  placeholder="Select size"
                                  className="min-w-[100px]"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={line.size || ''}
                                  onChange={(e) => handleUpdateLine(index, 'size', e.target.value)}
                                  placeholder="Size"
                                  className="w-full ::placeholder-[12px] text-[14px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {product?.colors && product.colors.length > 0 ? (
                                <CustomDropdown
                                  value={line.color || ''}
                                  onChange={(value) => handleUpdateLine(index, 'color', value)}
                                  options={product.colors.map((color: string) => ({ value: color, label: color }))}
                                  placeholder="Select color"
                                  className="min-w-[100px]"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={line.color || ''}
                                  onChange={(e) => handleUpdateLine(index, 'color', e.target.value)}
                                  placeholder="Color"
                                  className="w-full ::placeholder-[12px] text-[14px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(e) => handleUpdateLine(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.unitPrice}
                                onChange={(e) => handleUpdateLine(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              ${(line.unitPrice * line.quantity).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(index)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Order Totals */}
            {orderLines.length > 0 && (
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">Total:</span>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">${totals.total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Additional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shipping Address
                </label>
                <textarea
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  rows={3}
                  className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter shipping address..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Billing Address
                </label>
                <textarea
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  rows={3}
                  className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter billing address..."
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
                rows={3}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes about this order..."
              />
            </div>

            {/* Action Buttons */}
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
                disabled={createOrderMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createOrderMutation.isPending ? 'Creating...' : order ? 'Update Order' : 'Create Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Customer Self-Service Section Component
function CustomerSelfServiceSection() {
  const [activeView, setActiveView] = useState<'orders' | 'invoices' | 'returns'>('orders');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch customer orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'customer-self-service', searchQuery],
    queryFn: async () => {
      const response = await api.get('/orders?skip=0&take=1000');
      let orders = response.data?.data || [];

      // Filter by search query
      if (searchQuery) {
        orders = orders.filter((order: any) =>
          order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.status?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return orders;
    },
  });

  // Fetch returns
  const { data: returnsData, isLoading: returnsLoading } = useQuery({
    queryKey: ['returns', 'customer-self-service', searchQuery],
    queryFn: async () => {
      const response = await api.get('/returns?skip=0&take=1000');
      let returns = response.data?.data || [];

      // Filter by search query
      if (searchQuery) {
        returns = returns.filter((returnItem: any) =>
          returnItem.rmaNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          returnItem.status?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return returns;
    },
  });

  const orders = ordersData || [];
  const returns = returnsData || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'FULFILLED':
      case 'DELIVERED':
      case 'APPROVED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (ordersLoading || returnsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveView('orders')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeView === 'orders'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Orders ({orders.length})
              </div>
            </button>
            <button
              onClick={() => setActiveView('invoices')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeView === 'invoices'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Invoices ({orders.length})
              </div>
            </button>
            <button
              onClick={() => setActiveView('returns')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeView === 'returns'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Returns ({returns.length})
              </div>
            </button>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${activeView}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ::placeholder-[12px] text-[14px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Orders View */}
      {activeView === 'orders' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                {searchQuery ? 'Try adjusting your search criteria.' : 'You have no orders yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {order.orderLines?.length || 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${parseFloat(order.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                          {order.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices View */}
      {activeView === 'invoices' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No invoices found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                {searchQuery ? 'Try adjusting your search criteria.' : 'You have no invoices yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Invoice Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Invoice Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        INV-{order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${parseFloat(order.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.status === 'DELIVERED' || order.status === 'FULFILLED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                          {order.status === 'DELIVERED' || order.status === 'FULFILLED' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Returns View */}
      {activeView === 'returns' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <RotateCcw className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No returns found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                {searchQuery ? 'Try adjusting your search criteria.' : 'You have no return requests yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">RMA Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Requested Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {returns.map((returnItem: any) => (
                    <tr key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {returnItem.rmaNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {returnItem.order?.orderNumber || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(returnItem.requestedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {returnItem.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {returnItem.reason?.replace('_', ' ') || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(returnItem.status)}`}>
                          {returnItem.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
