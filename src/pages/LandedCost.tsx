import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  DollarSign,
  X,
  Calculator,
  Package,
  Ship,
  FileText,
  TrendingUp,
  Eye,
  Save,
  Download,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import {
  PageHeader,
  SummaryCard,
  SearchInput,
  CustomDropdown,
  EmptyState,
} from '../components/ui';

// Types
interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  status: string;
  totalAmount: number;
  currency: string;
  orderDate: string;
  customer?: {
    id: number;
    name: string;
  };
  orderLines?: OrderLine[];
}

interface OrderLine {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: {
    id: number;
    name: string;
    sku?: string;
  };
}

interface LandedCost {
  id?: string | number;
  orderId: number;
  orderNumber: string;
  // Product Costs
  productCost: number; // FOB cost
  // Shipping & Logistics
  shippingCost: number;
  freightCost: number;
  insuranceCost: number;
  // Customs & Duties
  customsDuty: number;
  customsDutyRate: number; // Percentage
  tariffs: number;
  // Port & Handling
  portFees: number;
  handlingFees: number;
  // Other Costs
  otherCosts: number;
  otherCostsDescription?: string;
  // Totals
  subtotal: number; // Sum of all costs
  totalLandedCost: number; // Final landed cost
  currency: string;
  // Metadata
  calculatedDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}


export default function LandedCost() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [isCalculatorModalShowing, setIsCalculatorModalShowing] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedLandedCost, setSelectedLandedCost] = useState<LandedCost | null>(null);
  const itemsPerPage = 10;

  // Local storage key for landed costs
  const LANDED_COSTS_KEY = 'landed_costs';

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isCalculatorModalOpen || isViewModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isCalculatorModalOpen) setIsCalculatorModalShowing(true);
          if (isViewModalOpen) setIsViewModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsCalculatorModalShowing(false);
      setIsViewModalShowing(false);
    }
  }, [isCalculatorModalOpen, isViewModalOpen]);

  // Fetch orders
  const { data, isLoading } = useQuery({
    queryKey: ['orders', currentPage, itemsPerPage],
    queryFn: async () => {
      try {
        const skip = (currentPage - 1) * itemsPerPage;
        const response = await api.get('/orders', {
          params: {
            skip,
            take: itemsPerPage,
          },
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching orders:', error);
        return { data: [], total: 0 };
      }
    },
  });

  // Load saved landed costs
  const [savedLandedCosts, setSavedLandedCosts] = useState<LandedCost[]>([]);

  useEffect(() => {
    const loadLandedCosts = () => {
      try {
        const stored = localStorage.getItem(LANDED_COSTS_KEY);
        if (stored) {
          setSavedLandedCosts(JSON.parse(stored) as LandedCost[]);
        }
      } catch (error) {
        console.error('Error loading landed costs:', error);
      }
    };

    loadLandedCosts();
    
    // Listen for storage changes
    window.addEventListener('storage', loadLandedCosts);
    window.addEventListener('landedCostUpdated', loadLandedCosts);
    
    return () => {
      window.removeEventListener('storage', loadLandedCosts);
      window.removeEventListener('landedCostUpdated', loadLandedCosts);
    };
  }, []);

  // Filter and search orders
  const orders = useMemo(() => {
    if (!data?.data) return [];
    return data.data as Order[];
  }, [data?.data]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customer?.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, searchQuery]);

  // Pagination
  const totalOrders = data?.total || filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Get landed cost for an order
  const getLandedCostForOrder = (orderId: number) => {
    return savedLandedCosts.find((lc) => lc.orderId === orderId);
  };

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = orders.length;
    const withLandedCost = orders.filter((order) => getLandedCostForOrder(order.id)).length;
    const totalLandedCostValue = savedLandedCosts.reduce((sum, lc) => sum + lc.totalLandedCost, 0);
    const averageLandedCost = withLandedCost > 0 ? totalLandedCostValue / withLandedCost : 0;

    return { total, withLandedCost, totalLandedCostValue, averageLandedCost };
  }, [orders, savedLandedCosts]);

  const openCalculatorModal = (order: Order) => {
    setSelectedOrder(order);
    // Check if there's an existing landed cost for this order
    const existing = getLandedCostForOrder(order.id);
    if (existing) {
      setSelectedLandedCost(existing);
    } else {
      setSelectedLandedCost(null);
    }
    setIsCalculatorModalOpen(true);
  };

  const closeCalculatorModal = () => {
    setIsCalculatorModalShowing(false);
    setTimeout(() => {
      setIsCalculatorModalOpen(false);
      setSelectedOrder(null);
      setSelectedLandedCost(null);
    }, 300);
  };

  const openViewModal = (order: Order) => {
    setSelectedOrder(order);
    const landedCost = getLandedCostForOrder(order.id);
    if (landedCost) {
      setSelectedLandedCost(landedCost);
      setIsViewModalOpen(true);
    } else {
      toast.error('No landed cost calculated for this order');
    }
  };

  const closeViewModal = () => {
    setIsViewModalShowing(false);
    setTimeout(() => {
      setIsViewModalOpen(false);
      setSelectedOrder(null);
      setSelectedLandedCost(null);
    }, 300);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <PageHeader
        title="Landed Cost"
        description="Calculate and track landed costs per order including shipping, customs, and all logistics costs"
        breadcrumbPage="Landed Cost"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Orders"
          value={summaryMetrics.total}
          icon={Package}
        />
        <SummaryCard
          label="With Landed Cost"
          value={summaryMetrics.withLandedCost}
          icon={Calculator}
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />
        <SummaryCard
          label="Total Landed Cost"
          value={`$${summaryMetrics.totalLandedCostValue.toFixed(2)}`}
          icon={DollarSign}
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
        />
        <SummaryCard
          label="Average Landed Cost"
          value={`$${summaryMetrics.averageLandedCost.toFixed(2)}`}
          icon={TrendingUp}
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          placeholder="Search by order number or customer name..."
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {paginatedOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders found"
            description={
              searchQuery
                ? 'Try adjusting your search criteria'
                : 'No orders available for landed cost calculation'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Order Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Landed Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedOrders.map((order) => {
                    const landedCost = getLandedCostForOrder(order.id);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {order.orderNumber}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.customer?.name || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.currency} {Number(order.totalAmount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {landedCost ? (
                            <div>
                              <div className="font-medium text-green-600 dark:text-green-400">
                                {landedCost.currency} {landedCost.totalLandedCost.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Calculated
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not calculated</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {landedCost && (
                              <button
                                onClick={() => openViewModal(order)}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                title="View Landed Cost"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openCalculatorModal(order)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title={landedCost ? 'Recalculate' : 'Calculate'}
                            >
                              <Calculator className="w-4 h-4" />
                            </button>
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

      {/* Calculator Modal - To be continued in next part */}
      {isCalculatorModalOpen && selectedOrder && (
        <LandedCostCalculatorModal
          order={selectedOrder}
          existingLandedCost={selectedLandedCost || undefined}
          onClose={closeCalculatorModal}
          isShowing={isCalculatorModalShowing}
          storageKey={LANDED_COSTS_KEY}
        />
      )}

      {/* View Modal - To be continued in next part */}
      {isViewModalOpen && selectedOrder && selectedLandedCost && (
        <ViewLandedCostModal
          order={selectedOrder}
          landedCost={selectedLandedCost}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
        />
      )}
    </div>
  );
}

// Landed Cost Calculator Modal Component
function LandedCostCalculatorModal({
  order,
  existingLandedCost,
  onClose,
  isShowing,
  storageKey,
}: {
  order: Order;
  existingLandedCost?: LandedCost;
  onClose: () => void;
  isShowing: boolean;
  storageKey: string;
}) {
  const [formData, setFormData] = useState({
    // Product Costs
    productCost: existingLandedCost?.productCost.toString() || order.totalAmount.toString() || '0',
    // Shipping & Logistics
    shippingCost: existingLandedCost?.shippingCost.toString() || '0',
    freightCost: existingLandedCost?.freightCost.toString() || '0',
    insuranceCost: existingLandedCost?.insuranceCost.toString() || '0',
    // Customs & Duties
    customsDutyRate: existingLandedCost?.customsDutyRate.toString() || '0',
    tariffs: existingLandedCost?.tariffs.toString() || '0',
    // Port & Handling
    portFees: existingLandedCost?.portFees.toString() || '0',
    handlingFees: existingLandedCost?.handlingFees.toString() || '0',
    // Other Costs
    otherCosts: existingLandedCost?.otherCosts.toString() || '0',
    otherCostsDescription: existingLandedCost?.otherCostsDescription || '',
    // Currency
    currency: existingLandedCost?.currency || order.currency || 'USD',
    // Notes
    notes: existingLandedCost?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate all costs
  const calculations = useMemo(() => {
    const productCost = parseFloat(formData.productCost) || 0;
    const shippingCost = parseFloat(formData.shippingCost) || 0;
    const freightCost = parseFloat(formData.freightCost) || 0;
    const insuranceCost = parseFloat(formData.insuranceCost) || 0;
    const customsDutyRate = parseFloat(formData.customsDutyRate) || 0;
    const tariffs = parseFloat(formData.tariffs) || 0;
    const portFees = parseFloat(formData.portFees) || 0;
    const handlingFees = parseFloat(formData.handlingFees) || 0;
    const otherCosts = parseFloat(formData.otherCosts) || 0;

    // Calculate customs duty based on product cost
    const customsDuty = (productCost * customsDutyRate) / 100;

    // Calculate subtotal (all costs before final calculation)
    const subtotal = productCost + shippingCost + freightCost + insuranceCost + customsDuty + tariffs + portFees + handlingFees + otherCosts;

    // Total landed cost (same as subtotal in this case, but can be adjusted)
    const totalLandedCost = subtotal;

    return {
      productCost,
      shippingCost,
      freightCost,
      insuranceCost,
      customsDuty,
      customsDutyRate,
      tariffs,
      portFees,
      handlingFees,
      otherCosts,
      subtotal,
      totalLandedCost,
    };
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate numeric fields
    const numericFields = [
      'productCost',
      'shippingCost',
      'freightCost',
      'insuranceCost',
      'customsDutyRate',
      'tariffs',
      'portFees',
      'handlingFees',
      'otherCosts',
    ];

    numericFields.forEach((field) => {
      const value = formData[field as keyof typeof formData];
      if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        newErrors[field] = 'Must be a positive number';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save landed cost
    const landedCost: LandedCost = {
      id: existingLandedCost?.id || Date.now().toString(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      productCost: calculations.productCost,
      shippingCost: calculations.shippingCost,
      freightCost: calculations.freightCost,
      insuranceCost: calculations.insuranceCost,
      customsDuty: calculations.customsDuty,
      customsDutyRate: calculations.customsDutyRate,
      tariffs: calculations.tariffs,
      portFees: calculations.portFees,
      handlingFees: calculations.handlingFees,
      otherCosts: calculations.otherCosts,
      otherCostsDescription: formData.otherCostsDescription || undefined,
      subtotal: calculations.subtotal,
      totalLandedCost: calculations.totalLandedCost,
      currency: formData.currency,
      calculatedDate: new Date().toISOString(),
      notes: formData.notes || undefined,
    };

    // Load existing costs
    const stored = localStorage.getItem(storageKey);
    let allCosts: LandedCost[] = [];
    if (stored) {
      try {
        allCosts = JSON.parse(stored);
        // Remove existing cost for this order if updating
        allCosts = allCosts.filter((lc) => lc.orderId !== order.id);
      } catch (error) {
        console.error('Error parsing stored landed costs:', error);
      }
    }

    // Add new/updated cost
    allCosts.push(landedCost);
    localStorage.setItem(storageKey, JSON.stringify(allCosts));

    toast.success('Landed cost calculated and saved successfully!');
    
    // Trigger a custom event to reload landed costs
    window.dispatchEvent(new CustomEvent('landedCostUpdated'));
    
    onClose();
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Landed Cost Calculator</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {order.orderNumber} • {order.customer?.name || 'Unknown Customer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Order Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Order Amount:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {order.currency} {Number(order.totalAmount).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Order Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{order.status}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Currency:</span>
                  <CustomDropdown
                    value={formData.currency}
                    onChange={(value) => setFormData({ ...formData, currency: value })}
                    options={[
                      { value: 'USD', label: 'USD' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'GBP', label: 'GBP' },
                      { value: 'CNY', label: 'CNY' },
                      { value: 'JPY', label: 'JPY' },
                    ]}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Product Costs Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Product Costs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Cost (FOB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.productCost}
                    onChange={(e) => {
                      setFormData({ ...formData, productCost: e.target.value });
                      if (errors.productCost) setErrors({ ...errors, productCost: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.productCost ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.productCost && <p className="mt-1 text-sm text-red-500">{errors.productCost}</p>}
                </div>
              </div>
            </div>

            {/* Shipping & Logistics Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Ship className="w-4 h-4" />
                Shipping & Logistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Shipping Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.shippingCost}
                    onChange={(e) => {
                      setFormData({ ...formData, shippingCost: e.target.value });
                      if (errors.shippingCost) setErrors({ ...errors, shippingCost: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.shippingCost ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.shippingCost && <p className="mt-1 text-sm text-red-500">{errors.shippingCost}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Freight Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.freightCost}
                    onChange={(e) => {
                      setFormData({ ...formData, freightCost: e.target.value });
                      if (errors.freightCost) setErrors({ ...errors, freightCost: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.freightCost ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.freightCost && <p className="mt-1 text-sm text-red-500">{errors.freightCost}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Insurance Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.insuranceCost}
                    onChange={(e) => {
                      setFormData({ ...formData, insuranceCost: e.target.value });
                      if (errors.insuranceCost) setErrors({ ...errors, insuranceCost: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.insuranceCost ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.insuranceCost && <p className="mt-1 text-sm text-red-500">{errors.insuranceCost}</p>}
                </div>
              </div>
            </div>

            {/* Customs & Duties Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Customs & Duties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customs Duty Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.customsDutyRate}
                    onChange={(e) => {
                      setFormData({ ...formData, customsDutyRate: e.target.value });
                      if (errors.customsDutyRate) setErrors({ ...errors, customsDutyRate: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.customsDutyRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.customsDutyRate && (
                    <p className="mt-1 text-sm text-red-500">{errors.customsDutyRate}</p>
                  )}
                  {calculations.customsDuty > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Calculated: {formData.currency} {calculations.customsDuty.toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tariffs
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tariffs}
                    onChange={(e) => {
                      setFormData({ ...formData, tariffs: e.target.value });
                      if (errors.tariffs) setErrors({ ...errors, tariffs: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.tariffs ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.tariffs && <p className="mt-1 text-sm text-red-500">{errors.tariffs}</p>}
                </div>
              </div>
            </div>

            {/* Port & Handling Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Port & Handling</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Port Fees
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.portFees}
                    onChange={(e) => {
                      setFormData({ ...formData, portFees: e.target.value });
                      if (errors.portFees) setErrors({ ...errors, portFees: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.portFees ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.portFees && <p className="mt-1 text-sm text-red-500">{errors.portFees}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Handling Fees
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.handlingFees}
                    onChange={(e) => {
                      setFormData({ ...formData, handlingFees: e.target.value });
                      if (errors.handlingFees) setErrors({ ...errors, handlingFees: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.handlingFees ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.handlingFees && <p className="mt-1 text-sm text-red-500">{errors.handlingFees}</p>}
                </div>
              </div>
            </div>

            {/* Other Costs Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Other Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Other Costs
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.otherCosts}
                    onChange={(e) => {
                      setFormData({ ...formData, otherCosts: e.target.value });
                      if (errors.otherCosts) setErrors({ ...errors, otherCosts: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.otherCosts ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                  />
                  {errors.otherCosts && <p className="mt-1 text-sm text-red-500">{errors.otherCosts}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.otherCostsDescription}
                    onChange={(e) => setFormData({ ...formData, otherCostsDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe other costs..."
                  />
                </div>
              </div>
            </div>

            {/* Cost Summary */}
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-200 dark:border-primary-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Cost Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Product Cost (FOB):</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.currency} {calculations.productCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping & Logistics:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.currency}{' '}
                    {(calculations.shippingCost + calculations.freightCost + calculations.insuranceCost).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Customs & Duties:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.currency} {(calculations.customsDuty + calculations.tariffs).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Port & Handling:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.currency} {(calculations.portFees + calculations.handlingFees).toFixed(2)}
                  </span>
                </div>
                {calculations.otherCosts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Other Costs:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.currency} {calculations.otherCosts.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t border-primary-200 dark:border-primary-700 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total Landed Cost:</span>
                    <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                      {formData.currency} {calculations.totalLandedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes about the landed cost calculation..."
              />
            </div>

            {/* Action Buttons */}
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
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {existingLandedCost ? 'Update' : 'Save'} Landed Cost
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Landed Cost Modal Component
function ViewLandedCostModal({
  order,
  landedCost,
  onClose,
  isShowing,
}: {
  order: Order;
  landedCost: LandedCost;
  onClose: () => void;
  isShowing: boolean;
}) {
  const handleExport = () => {
    // Create a CSV export
    const csvContent = [
      ['Order Number', 'Product Cost', 'Shipping', 'Freight', 'Insurance', 'Customs Duty', 'Tariffs', 'Port Fees', 'Handling', 'Other', 'Total Landed Cost'],
      [
        landedCost.orderNumber,
        landedCost.productCost.toFixed(2),
        landedCost.shippingCost.toFixed(2),
        landedCost.freightCost.toFixed(2),
        landedCost.insuranceCost.toFixed(2),
        landedCost.customsDuty.toFixed(2),
        landedCost.tariffs.toFixed(2),
        landedCost.portFees.toFixed(2),
        landedCost.handlingFees.toFixed(2),
        landedCost.otherCosts.toFixed(2),
        landedCost.totalLandedCost.toFixed(2),
      ],
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `landed-cost-${landedCost.orderNumber}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Landed cost exported successfully!');
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Landed Cost Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {order.orderNumber} • {order.customer?.name || 'Unknown Customer'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Order Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Order Amount:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.currency} {Number(order.totalAmount).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Order Date:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(order.orderDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Calculated Date:</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {landedCost.calculatedDate
                    ? new Date(landedCost.calculatedDate).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Currency:</span>
                <p className="font-medium text-gray-900 dark:text-white">{landedCost.currency}</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cost Breakdown</h3>

            {/* Product Costs */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Package className="w-3 h-3" />
                Product Costs
              </h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Product Cost (FOB):</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {landedCost.currency} {landedCost.productCost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Shipping & Logistics */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Ship className="w-3 h-3" />
                Shipping & Logistics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Shipping Cost:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.shippingCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Freight Cost:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.freightCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Insurance Cost:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.insuranceCost.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {landedCost.currency}{' '}
                    {(landedCost.shippingCost + landedCost.freightCost + landedCost.insuranceCost).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customs & Duties */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Customs & Duties
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Customs Duty ({landedCost.customsDutyRate}%):
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.customsDuty.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tariffs:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.tariffs.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {landedCost.currency} {(landedCost.customsDuty + landedCost.tariffs).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Port & Handling */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Port & Handling</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Port Fees:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.portFees.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Handling Fees:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.handlingFees.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {landedCost.currency} {(landedCost.portFees + landedCost.handlingFees).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Other Costs */}
            {landedCost.otherCosts > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Other Costs</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {landedCost.otherCostsDescription || 'Other Costs'}:
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {landedCost.currency} {landedCost.otherCosts.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Summary */}
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border-2 border-primary-200 dark:border-primary-800">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {landedCost.currency} {landedCost.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t-2 border-primary-200 dark:border-primary-700 flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900 dark:text-white">Total Landed Cost:</span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {landedCost.currency} {landedCost.totalLandedCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {landedCost.notes && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {landedCost.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

