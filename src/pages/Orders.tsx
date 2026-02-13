import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  ShoppingCart,
  Edit,
  AlertTriangle,
  Package,
  Clock,
  Eye,
  Settings,
  Calendar,
  User,
  Truck,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import {
  PageHeader,
  TabsNavigation,
  SummaryCard,
  SearchAndFilterBar,
  Pagination,
  EmptyState,
  DeleteModal,
  CustomDropdown,
  DatePicker,
} from '../components/ui';
import { ButtonWithWaves } from '../components/ui';

// Types
interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customer?: {
    id: number;
    name: string;
    type: 'RETAILER' | 'B2B' | 'WHOLESALE';
  };
  type: 'DTC' | 'POS' | 'B2B' | 'WHOLESALE';
  status: 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  totalAmount: number;
  currency: string;
  orderDate: string;
  requiredDate?: string;
  shippedDate?: string;
  deliveredDate?: string;
  orderLines?: OrderLine[];
  isPreOrder?: boolean;
  isBackorder?: boolean;
  hasPartialShipment?: boolean;
  allocationRuleId?: number;
  notes?: string;
}

interface OrderLine {
  id: number;
  productId: number;
  product?: {
    id: number;
    name: string;
    sku: string;
  };
  quantity: number;
  fulfilledQty: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  color?: string;
  isPreOrder?: boolean;
  isBackorder?: boolean;
  backorderQty?: number;
  preOrderQty?: number;
}

interface AllocationRule {
  id?: string | number;
  name: string;
  priority: number;
  channel?: 'DTC' | 'POS' | 'B2B' | 'WHOLESALE' | 'ALL';
  customerId?: number;
  customerType?: 'RETAILER' | 'B2B' | 'WHOLESALE' | 'ALL';
  warehouseId?: number;
  allocationMethod: 'FIFO' | 'LIFO' | 'PRIORITY' | 'ROUND_ROBIN' | 'PROXIMITY';
  conditions?: {
    minOrderValue?: number;
    maxOrderValue?: number;
    productCategory?: string;
    orderType?: string[];
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface PreOrder {
  id?: string | number;
  orderId: number;
  orderNumber?: string;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  expectedDate?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';
  createdAt?: string;
}

interface Backorder {
  id?: string | number;
  orderId: number;
  orderNumber?: string;
  orderLineId: number;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  status: 'PENDING' | 'ALLOCATED' | 'FULFILLED' | 'CANCELLED';
  createdAt?: string;
}

interface PartialShipment {
  id?: string | number;
  orderId: number;
  orderNumber?: string;
  shipmentNumber: string;
  items: PartialShipmentItem[];
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  shippedDate?: string;
  trackingNumber?: string;
  createdAt?: string;
}

interface PartialShipmentItem {
  orderLineId: number;
  productId: number;
  quantity: number;
}


export default function Orders() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'allocation-rules' | 'pre-orders' | 'backorders' | 'partial-shipments'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch orders with filters
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders', statusFilter, channelFilter, searchQuery, currentPage],
    queryFn: async () => {
      try {
        const params: any = {
          skip: (currentPage - 1) * itemsPerPage,
          take: itemsPerPage,
        };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (channelFilter !== 'all') params.type = channelFilter;
        if (searchQuery) params.search = searchQuery;
        
        const response = await api.get('/orders', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching orders:', error);
        return { data: [], total: 0 };
      }
    },
  });

  const orders: Order[] = useMemo(() => {
    const data = ordersData?.data || [];
    return data.map((order: any) => {
      // Determine if order has backorders (any order line with fulfilledQty < quantity)
      const hasBackorder = order.orderLines?.some((line: any) => line.fulfilledQty < line.quantity);
      
      // Determine if order has partial shipments (multiple shipments or partially fulfilled)
      const hasPartialShipment = order.shipments?.length > 0 && 
        (order.status === 'PARTIALLY_FULFILLED' || 
         order.orderLines?.some((line: any) => line.fulfilledQty > 0 && line.fulfilledQty < line.quantity));
      
      // Determine if order is pre-order (has requiredDate in future)
      const isPreOrder = order.requiredDate && new Date(order.requiredDate) > new Date();
      
      return {
        ...order,
        type: order.type || 'B2B',
        isPreOrder,
        isBackorder: hasBackorder,
        hasPartialShipment,
      };
    });
  }, [ordersData]);

  // Remove localStorage - will use API data instead

  // Orders are already filtered by the API, so we use them directly
  const filteredOrders = orders;
  
  // Pagination
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / itemsPerPage);
  const paginatedOrders = filteredOrders;

  // Fetch summary metrics separately
  const { data: summaryData } = useQuery({
    queryKey: ['orders-summary'],
    queryFn: async () => {
      try {
        // Fetch all orders without pagination for summary
        const [allOrders, dtcOrders, posOrders, b2bOrders, pendingOrders] = await Promise.all([
          api.get('/orders', { params: { take: 10000 } }),
          api.get('/orders', { params: { type: 'DTC', take: 10000 } }),
          api.get('/orders', { params: { type: 'POS', take: 10000 } }),
          api.get('/orders', { params: { type: 'B2B', take: 10000 } }),
          api.get('/orders', { params: { status: 'PENDING', take: 10000 } }),
        ]);

        const all = allOrders.data?.data || [];
        const dtc = dtcOrders.data?.data || [];
        const pos = posOrders.data?.data || [];
        const b2b = b2bOrders.data?.data || [];
        const pending = pendingOrders.data?.data || [];

        // Calculate derived metrics
        const preOrderCount = all.filter((o: any) => o.requiredDate && new Date(o.requiredDate) > new Date()).length;
        const backorderCount = all.filter((o: any) => 
          o.orderLines?.some((line: any) => line.fulfilledQty < line.quantity)
        ).length;
        const partialShipmentCount = all.filter((o: any) => 
          o.shipments?.length > 0 && (o.status === 'PARTIALLY_FULFILLED' || 
          o.orderLines?.some((line: any) => line.fulfilledQty > 0 && line.fulfilledQty < line.quantity))
        ).length;

        return {
          total: all.length,
          dtc: dtc.length,
          pos: pos.length,
          b2b: b2b.length,
          pending: pending.length,
          preOrderCount,
          backorderCount,
          partialShipmentCount,
        };
      } catch (error) {
        console.error('Error fetching summary:', error);
        return {
          total: 0,
          dtc: 0,
          pos: 0,
          b2b: 0,
          pending: 0,
          preOrderCount: 0,
          backorderCount: 0,
          partialShipmentCount: 0,
        };
      }
    },
  });

  const summaryMetrics = summaryData || {
    total: 0,
    dtc: 0,
    pos: 0,
    b2b: 0,
    pending: 0,
    preOrderCount: 0,
    backorderCount: 0,
    partialShipmentCount: 0,
  };

  const queryClient = useQueryClient();

  // Modal states for Allocation Rules
  const [isAllocationRuleModalOpen, setIsAllocationRuleModalOpen] = useState(false);
  const [selectedAllocationRule, setSelectedAllocationRule] = useState<AllocationRule | null>(null);
  const [isAllocationRuleViewModalOpen, setIsAllocationRuleViewModalOpen] = useState(false);
  const [selectedAllocationRuleForView, setSelectedAllocationRuleForView] = useState<AllocationRule | null>(null);
  const [isAllocationRuleDeleteModalOpen, setIsAllocationRuleDeleteModalOpen] = useState(false);
  const [allocationRuleToDelete, setAllocationRuleToDelete] = useState<AllocationRule | null>(null);

  // Modal states for Pre-Orders
  const [isPreOrderModalOpen, setIsPreOrderModalOpen] = useState(false);
  const [selectedPreOrder, setSelectedPreOrder] = useState<PreOrder | null>(null);
  const [isPreOrderViewModalOpen, setIsPreOrderViewModalOpen] = useState(false);
  const [selectedPreOrderForView, setSelectedPreOrderForView] = useState<PreOrder | null>(null);
  const [isPreOrderDeleteModalOpen, setIsPreOrderDeleteModalOpen] = useState(false);
  const [preOrderToDelete, setPreOrderToDelete] = useState<PreOrder | null>(null);

  // Modal states for Backorders
  const [isBackorderModalOpen, setIsBackorderModalOpen] = useState(false);
  const [selectedBackorder, setSelectedBackorder] = useState<Backorder | null>(null);
  const [isBackorderViewModalOpen, setIsBackorderViewModalOpen] = useState(false);
  const [selectedBackorderForView, setSelectedBackorderForView] = useState<Backorder | null>(null);
  const [isBackorderDeleteModalOpen, setIsBackorderDeleteModalOpen] = useState(false);
  const [backorderToDelete, setBackorderToDelete] = useState<Backorder | null>(null);

  // Modal states for Partial Shipments
  const [isPartialShipmentModalOpen, setIsPartialShipmentModalOpen] = useState(false);
  const [selectedPartialShipment, setSelectedPartialShipment] = useState<PartialShipment | null>(null);
  const [isPartialShipmentViewModalOpen, setIsPartialShipmentViewModalOpen] = useState(false);
  const [selectedPartialShipmentForView, setSelectedPartialShipmentForView] = useState<PartialShipment | null>(null);
  const [isPartialShipmentDeleteModalOpen, setIsPartialShipmentDeleteModalOpen] = useState(false);
  const [partialShipmentToDelete, setPartialShipmentToDelete] = useState<PartialShipment | null>(null);

  // Fetch Allocation Rules
  const { data: allocationRulesData, isLoading: isLoadingAllocationRules } = useQuery({
    queryKey: ['allocation-rules'],
    queryFn: async () => {
      try {
        const response = await api.get('/allocation-rules');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching allocation rules:', error);
        return [];
      }
    },
  });

  const allocationRules: AllocationRule[] = useMemo(() => {
    return Array.isArray(allocationRulesData) ? allocationRulesData : [];
  }, [allocationRulesData]);

  // Allocation Rules Mutations
  const createAllocationRuleMutation = useMutation({
    mutationFn: async (data: Omit<AllocationRule, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await api.post('/allocation-rules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocation-rules'] });
      setIsAllocationRuleModalOpen(false);
      setSelectedAllocationRule(null);
      toast.success('Allocation rule created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create allocation rule');
    },
  });

  const updateAllocationRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<AllocationRule> }) => {
      const response = await api.patch(`/allocation-rules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocation-rules'] });
      setIsAllocationRuleModalOpen(false);
      setSelectedAllocationRule(null);
      toast.success('Allocation rule updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update allocation rule');
    },
  });

  const deleteAllocationRuleMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/allocation-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocation-rules'] });
      setIsAllocationRuleDeleteModalOpen(false);
      setAllocationRuleToDelete(null);
      toast.success('Allocation rule deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete allocation rule');
    },
  });

  // Fetch Pre-Orders
  const { data: preOrdersData, isLoading: isLoadingPreOrders } = useQuery({
    queryKey: ['pre-orders'],
    queryFn: async () => {
      try {
        const response = await api.get('/pre-orders');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching pre-orders:', error);
        return [];
      }
    },
  });

  const preOrders: PreOrder[] = useMemo(() => {
    return Array.isArray(preOrdersData) ? preOrdersData.map((po: any) => ({
      id: po.id,
      orderId: po.orderId,
      orderNumber: po.order?.orderNumber,
      productId: po.productId,
      productName: po.product?.name,
      sku: po.product?.sku,
      quantity: po.quantity,
      expectedDate: po.expectedDate,
      status: po.status,
      createdAt: po.createdAt,
    })) : [];
  }, [preOrdersData]);

  // Pre-Orders Mutations
  const createPreOrderMutation = useMutation({
    mutationFn: async (data: Omit<PreOrder, 'id' | 'orderNumber' | 'createdAt'>) => {
      const response = await api.post('/pre-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-orders'] });
      setIsPreOrderModalOpen(false);
      setSelectedPreOrder(null);
      toast.success('Pre-order created successfully!');
    },
    onError: (error: any) => {
      console.error('Pre-order creation error:', error);
      console.error('Error response:', error?.response?.data);
      
      let errorMessage = 'Failed to create pre-order';
      
      if (error?.response?.data) {
        const data = error.response.data;
        if (Array.isArray(data.message)) {
          errorMessage = data.message.join(', ');
        } else if (typeof data.message === 'string') {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    },
  });

  const updatePreOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<PreOrder> }) => {
      const response = await api.patch(`/pre-orders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-orders'] });
      setIsPreOrderModalOpen(false);
      setSelectedPreOrder(null);
      toast.success('Pre-order updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update pre-order');
    },
  });

  const deletePreOrderMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/pre-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-orders'] });
      setIsPreOrderDeleteModalOpen(false);
      setPreOrderToDelete(null);
      toast.success('Pre-order deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete pre-order');
    },
  });

  // Fetch Backorders
  const { data: backordersData, isLoading: isLoadingBackorders } = useQuery({
    queryKey: ['backorders'],
    queryFn: async () => {
      try {
        const response = await api.get('/backorders');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching backorders:', error);
        return [];
      }
    },
  });

  const backorders: Backorder[] = useMemo(() => {
    return Array.isArray(backordersData) ? backordersData.map((bo: any) => ({
      id: bo.id,
      orderId: bo.orderId,
      orderNumber: bo.order?.orderNumber,
      orderLineId: bo.orderLineId,
      productId: bo.productId,
      productName: bo.product?.name,
      sku: bo.product?.sku,
      quantity: bo.quantity,
      status: bo.status,
      createdAt: bo.createdAt,
    })) : [];
  }, [backordersData]);

  // Backorders Mutations
  const createBackorderMutation = useMutation({
    mutationFn: async (data: Omit<Backorder, 'id' | 'orderNumber' | 'createdAt'>) => {
      const response = await api.post('/backorders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backorders'] });
      setIsBackorderModalOpen(false);
      setSelectedBackorder(null);
      toast.success('Backorder created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create backorder');
    },
  });

  const updateBackorderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<Backorder> }) => {
      const response = await api.patch(`/backorders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backorders'] });
      setIsBackorderModalOpen(false);
      setSelectedBackorder(null);
      toast.success('Backorder updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update backorder');
    },
  });

  const deleteBackorderMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/backorders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backorders'] });
      setIsBackorderDeleteModalOpen(false);
      setBackorderToDelete(null);
      toast.success('Backorder deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete backorder');
    },
  });

  // Fetch Partial Shipments
  const { data: partialShipmentsData, isLoading: isLoadingPartialShipments } = useQuery({
    queryKey: ['partial-shipments'],
    queryFn: async () => {
      try {
        const response = await api.get('/partial-shipments');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching partial shipments:', error);
        return [];
      }
    },
  });

  const partialShipments: PartialShipment[] = useMemo(() => {
    return Array.isArray(partialShipmentsData) ? partialShipmentsData.map((ps: any) => ({
      id: ps.id,
      orderId: ps.orderId,
      orderNumber: ps.order?.orderNumber,
      shipmentNumber: ps.shipmentNumber,
      items: ps.items || [],
      status: ps.status,
      shippedDate: ps.shippedDate,
      trackingNumber: ps.trackingNumber,
      createdAt: ps.createdAt,
    })) : [];
  }, [partialShipmentsData]);

  // Partial Shipments Mutations
  const createPartialShipmentMutation = useMutation({
    mutationFn: async (data: Omit<PartialShipment, 'id' | 'shipmentNumber' | 'createdAt'>) => {
      const response = await api.post('/partial-shipments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partial-shipments'] });
      setIsPartialShipmentModalOpen(false);
      setSelectedPartialShipment(null);
      toast.success('Partial shipment created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create partial shipment');
    },
  });

  const updatePartialShipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<PartialShipment> }) => {
      const response = await api.patch(`/partial-shipments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partial-shipments'] });
      setIsPartialShipmentModalOpen(false);
      setSelectedPartialShipment(null);
      toast.success('Partial shipment updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update partial shipment');
    },
  });

  const deletePartialShipmentMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/partial-shipments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partial-shipments'] });
      setIsPartialShipmentDeleteModalOpen(false);
      setPartialShipmentToDelete(null);
      toast.success('Partial shipment deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete partial shipment');
    },
  });

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'DTC':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'POS':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'B2B':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'WHOLESALE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PARTIALLY_FULFILLED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'FULFILLED':
      case 'SHIPPED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
      case 'RETURNED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoadingOrders) {
    return <SkeletonPage />;
  }

  const tabs = [
    { id: 'inbox', label: 'Order Inbox', icon: ShoppingCart },
    { id: 'allocation-rules', label: 'Allocation Rules', icon: Settings },
    { id: 'pre-orders', label: 'Pre-Orders', icon: Calendar },
    { id: 'backorders', label: 'Backorders', icon: AlertTriangle },
    { id: 'partial-shipments', label: 'Partial Shipments', icon: Truck },
  ];

  return (
    <>
      <div>
      <PageHeader
        title="Orders"
        description="Manage DTC, POS, and B2B orders with allocation rules and fulfillment tracking"
        breadcrumbPage="Orders"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <SummaryCard
          label="Total Orders"
          value={summaryMetrics.total}
          icon={ShoppingCart}
          className="!p-4"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <SummaryCard
          label="DTC"
          value={summaryMetrics.dtc}
          icon={Package}
          className="!p-4"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          valueColor="text-blue-600 dark:text-blue-400"
        />
        <SummaryCard
          label="POS"
          value={summaryMetrics.pos}
          icon={ShoppingCart}
          className="!p-4"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          valueColor="text-purple-600 dark:text-purple-400"
        />
        <SummaryCard
          label="B2B"
          value={summaryMetrics.b2b}
          icon={User}
          className="!p-4"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
          valueColor="text-green-600 dark:text-green-400"
        />
        <SummaryCard
          label="Pending"
          value={summaryMetrics.pending}
          icon={Clock}
          className="!p-4"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
          iconColor="text-yellow-600 dark:text-yellow-400"
          valueColor="text-yellow-600 dark:text-yellow-400"
        />
        <SummaryCard
          label="Pre-Orders"
          value={summaryMetrics.preOrderCount}
          icon={Calendar}
          className="!p-4"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
          valueColor="text-orange-600 dark:text-orange-400"
        />
        <SummaryCard
          label="Backorders"
          value={summaryMetrics.backorderCount}
          icon={AlertTriangle}
          className="!p-4"
          iconBgColor="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          valueColor="text-red-600 dark:text-red-400"
        />
        <SummaryCard
          label="Partial Shipments"
          value={summaryMetrics.partialShipmentCount}
          icon={Truck}
          className="!p-4"
          iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
          iconColor="text-indigo-600 dark:text-indigo-400"
          valueColor="text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <TabsNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            setActiveTab(tabId as typeof activeTab);
            setCurrentPage(1);
          }}
          className="border-b px-5 border-gray-200 dark:border-gray-700"
        />

        {/* Tab Content */}
        <div className="p-6 pt-0">
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <SearchAndFilterBar
                searchValue={searchQuery}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                searchPlaceholder="Search by order number, customer name..."
                filters={[
                  {
                    value: channelFilter,
                    onChange: (value) => {
                      setChannelFilter(value);
                      setCurrentPage(1);
                    },
                    options: [
                      { value: 'all', label: 'All Channels' },
                      { value: 'DTC', label: 'DTC' },
                      { value: 'POS', label: 'POS' },
                      { value: 'B2B', label: 'B2B' },
                    ],
                  },
                  {
                    value: statusFilter,
                    onChange: (value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    },
                    options: [
                      { value: 'all', label: 'All Status' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'CONFIRMED', label: 'Confirmed' },
                      { value: 'PROCESSING', label: 'Processing' },
                      { value: 'PARTIALLY_FULFILLED', label: 'Partially Fulfilled' },
                      { value: 'FULFILLED', label: 'Fulfilled' },
                      { value: 'SHIPPED', label: 'Shipped' },
                      { value: 'DELIVERED', label: 'Delivered' },
                    ],
                  },
                ]}
                className="mb-6"
              />

              {/* Orders Table */}
              {paginatedOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title={searchQuery || channelFilter !== 'all' || statusFilter !== 'all'
                    ? 'No matching orders found'
                    : 'No orders found'}
                  description=""
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Order #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Customer
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Flags
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {order.orderNumber}
                          </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {order.customer?.name || `Customer #${order.customerId}`}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderTypeColor(order.type)}`}
                              >
                                {order.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {order.currency} {Number(order.totalAmount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                              >
                                {order.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {order.isPreOrder && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" title="Pre-Order">
                                    PO
                                  </span>
                                )}
                                {order.isBackorder && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" title="Backorder">
                                    BO
                                  </span>
                                )}
                                {order.hasPartialShipment && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" title="Partial Shipment">
                                    PS
                                  </span>
                            )}
                          </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsViewModalOpen(true);
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

                  {/* Pagination */}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalOrders}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'allocation-rules' && (
            <div className="space-y-6">
              {/* Header with Create Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Allocation Rules</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage order allocation rules for different channels and customers
                  </p>
                </div>
                <ButtonWithWaves
                  onClick={() => {
                    setSelectedAllocationRule(null);
                    setIsAllocationRuleModalOpen(true);
                  }}
                  className="!px-4 !py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </ButtonWithWaves>
              </div>

              {/* Allocation Rules Table */}
              {isLoadingAllocationRules ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Loading allocation rules...</p>
                </div>
              ) : allocationRules.length === 0 ? (
                <EmptyState
                  icon={Settings}
                  title="No allocation rules found"
                  description="Create your first allocation rule to get started"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Channel
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Method
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
                      {allocationRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {rule.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rule.priority}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {rule.channel || 'ALL'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {rule.allocationMethod}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                rule.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedAllocationRuleForView(rule);
                                  setIsAllocationRuleViewModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAllocationRule(rule);
                                  setIsAllocationRuleModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setAllocationRuleToDelete(rule);
                                  setIsAllocationRuleDeleteModalOpen(true);
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
            </div>
          )}

          {activeTab === 'pre-orders' && (
            <div className="space-y-6">
              {/* Header with Create Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pre-Orders</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage pre-orders and expected delivery dates
                  </p>
                </div>
                <ButtonWithWaves
                  onClick={() => {
                    setSelectedPreOrder(null);
                    setIsPreOrderModalOpen(true);
                  }}
                  className="!px-4 !py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pre-Order
                </ButtonWithWaves>
              </div>

              {/* Pre-Orders Table */}
              {isLoadingPreOrders ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Loading pre-orders...</p>
                </div>
              ) : preOrders.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No pre-orders found"
                  description="Create your first pre-order to get started"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Expected Date
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
                      {preOrders.map((preOrder) => (
                        <tr key={preOrder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {preOrder.orderNumber || `Order #${preOrder.orderId}`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {preOrder.productName || `Product #${preOrder.productId}`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {preOrder.sku || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {preOrder.quantity}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {preOrder.expectedDate ? new Date(preOrder.expectedDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                preOrder.status === 'FULFILLED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : preOrder.status === 'CONFIRMED'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : preOrder.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {preOrder.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPreOrderForView(preOrder);
                                  setIsPreOrderViewModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPreOrder(preOrder);
                                  setIsPreOrderModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setPreOrderToDelete(preOrder);
                                  setIsPreOrderDeleteModalOpen(true);
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
            </div>
          )}

          {activeTab === 'backorders' && (
            <div className="space-y-6">
              {/* Header with Create Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backorders</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage backorders and stock allocation
                  </p>
                </div>
                <ButtonWithWaves
                  onClick={() => {
                    setSelectedBackorder(null);
                    setIsBackorderModalOpen(true);
                  }}
                  className="!px-4 !py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Backorder
                </ButtonWithWaves>
              </div>

              {/* Backorders Table */}
              {isLoadingBackorders ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Loading backorders...</p>
                </div>
              ) : backorders.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="No backorders found"
                  description="Create your first backorder to get started"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Quantity
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
                      {backorders.map((backorder) => (
                        <tr key={backorder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {backorder.orderNumber || `Order #${backorder.orderId}`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {backorder.productName || `Product #${backorder.productId}`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {backorder.sku || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {backorder.quantity}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                backorder.status === 'FULFILLED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : backorder.status === 'ALLOCATED'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : backorder.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {backorder.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBackorderForView(backorder);
                                  setIsBackorderViewModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBackorder(backorder);
                                  setIsBackorderModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setBackorderToDelete(backorder);
                                  setIsBackorderDeleteModalOpen(true);
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
            </div>
          )}

          {activeTab === 'partial-shipments' && (
            <div className="space-y-6">
              {/* Header with Create Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Partial Shipments</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage partial shipments and tracking information
                  </p>
                </div>
                <ButtonWithWaves
                  onClick={() => {
                    setSelectedPartialShipment(null);
                    setIsPartialShipmentModalOpen(true);
                  }}
                  className="!px-4 !py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Partial Shipment
                </ButtonWithWaves>
              </div>

              {/* Partial Shipments Table */}
              {isLoadingPartialShipments ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">Loading partial shipments...</p>
                </div>
              ) : partialShipments.length === 0 ? (
                <EmptyState
                  icon={Truck}
                  title="No partial shipments found"
                  description="Create your first partial shipment to get started"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Shipment #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Items
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Tracking #
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
                      {partialShipments.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {shipment.shipmentNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {shipment.orderNumber || `Order #${shipment.orderId}`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {shipment.items?.length || 0} item(s)
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {shipment.trackingNumber || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                shipment.status === 'DELIVERED'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : shipment.status === 'SHIPPED'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : shipment.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {shipment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPartialShipmentForView(shipment);
                                  setIsPartialShipmentViewModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPartialShipment(shipment);
                                  setIsPartialShipmentModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setPartialShipmentToDelete(shipment);
                                  setIsPartialShipmentDeleteModalOpen(true);
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
            </div>
          )}
        </div>
      </div>
      </div>
      {/* Modals */}
      {/* Allocation Rule View Modal */}
      {isAllocationRuleViewModalOpen && selectedAllocationRuleForView && (
        <ViewAllocationRuleModal
          rule={selectedAllocationRuleForView}
          onClose={() => {
            setIsAllocationRuleViewModalOpen(false);
            setSelectedAllocationRuleForView(null);
          }}
        />
      )}

      {/* Allocation Rule Create/Edit Modal */}
      {isAllocationRuleModalOpen && (
        <AllocationRuleModal
          rule={selectedAllocationRule}
          onClose={() => {
            setIsAllocationRuleModalOpen(false);
            setSelectedAllocationRule(null);
          }}
          onSubmit={(data) => {
            if (selectedAllocationRule) {
              updateAllocationRuleMutation.mutate({ id: selectedAllocationRule.id!, data });
            } else {
              createAllocationRuleMutation.mutate(data);
            }
          }}
          isLoading={createAllocationRuleMutation.isPending || updateAllocationRuleMutation.isPending}
        />
      )}

      {/* Allocation Rule Delete Modal */}
      {isAllocationRuleDeleteModalOpen && allocationRuleToDelete && (
        <DeleteModal
          title="Delete Allocation Rule"
          message="Are you sure you want to delete"
          itemName={allocationRuleToDelete.name}
          onClose={() => {
            setIsAllocationRuleDeleteModalOpen(false);
            setAllocationRuleToDelete(null);
          }}
          onConfirm={() => deleteAllocationRuleMutation.mutate(allocationRuleToDelete.id!)}
          isLoading={deleteAllocationRuleMutation.isPending}
        />
      )}

      {/* Pre-Order View Modal */}
      {isPreOrderViewModalOpen && selectedPreOrderForView && (
        <ViewPreOrderModal
          preOrder={selectedPreOrderForView}
          onClose={() => {
            setIsPreOrderViewModalOpen(false);
            setSelectedPreOrderForView(null);
          }}
        />
      )}

      {/* Pre-Order Create/Edit Modal */}
      {isPreOrderModalOpen && (
        <PreOrderModal
          preOrder={selectedPreOrder}
          onClose={() => {
            setIsPreOrderModalOpen(false);
            setSelectedPreOrder(null);
          }}
          onSubmit={(data) => {
            if (selectedPreOrder) {
              updatePreOrderMutation.mutate({ id: selectedPreOrder.id!, data });
            } else {
              createPreOrderMutation.mutate(data);
            }
          }}
          isLoading={createPreOrderMutation.isPending || updatePreOrderMutation.isPending}
        />
      )}

      {/* Pre-Order Delete Modal */}
      {isPreOrderDeleteModalOpen && preOrderToDelete && (
        <DeleteModal
          title="Delete Pre-Order"
          message="Are you sure you want to delete this pre-order"
          itemName={`for Order #${preOrderToDelete.orderNumber || preOrderToDelete.orderId}`}
          onClose={() => {
            setIsPreOrderDeleteModalOpen(false);
            setPreOrderToDelete(null);
          }}
          onConfirm={() => {
            if (preOrderToDelete?.id) {
              deletePreOrderMutation.mutate(preOrderToDelete.id);
            }
          }}
          isLoading={deletePreOrderMutation.isPending}
        />
      )}

      {/* Backorder View Modal */}
      {isBackorderViewModalOpen && selectedBackorderForView && (
        <ViewBackorderModal
          backorder={selectedBackorderForView}
          onClose={() => {
            setIsBackorderViewModalOpen(false);
            setSelectedBackorderForView(null);
          }}
        />
      )}

      {/* Backorder Create/Edit Modal */}
      {isBackorderModalOpen && (
        <BackorderModal
          backorder={selectedBackorder}
          onClose={() => {
            setIsBackorderModalOpen(false);
            setSelectedBackorder(null);
          }}
          onSubmit={(data) => {
            if (selectedBackorder) {
              updateBackorderMutation.mutate({ id: selectedBackorder.id!, data });
            } else {
              createBackorderMutation.mutate(data);
            }
          }}
          isLoading={createBackorderMutation.isPending || updateBackorderMutation.isPending}
        />
      )}

      {/* Backorder Delete Modal */}
      {isBackorderDeleteModalOpen && backorderToDelete && (
        <DeleteModal
          title="Delete Backorder"
          message="Are you sure you want to delete this backorder"
          itemName={`for Order #${backorderToDelete.orderNumber || backorderToDelete.orderId}`}
          onClose={() => {
            setIsBackorderDeleteModalOpen(false);
            setBackorderToDelete(null);
          }}
          onConfirm={() => {
            if (backorderToDelete?.id) {
              deleteBackorderMutation.mutate(backorderToDelete.id);
            }
          }}
          isLoading={deleteBackorderMutation.isPending}
        />
      )}

      {/* Partial Shipment View Modal */}
      {isPartialShipmentViewModalOpen && selectedPartialShipmentForView && (
        <ViewPartialShipmentModal
          partialShipment={selectedPartialShipmentForView}
          onClose={() => {
            setIsPartialShipmentViewModalOpen(false);
            setSelectedPartialShipmentForView(null);
          }}
        />
      )}

      {/* Partial Shipment Create/Edit Modal */}
      {isPartialShipmentModalOpen && (
        <PartialShipmentModal
          partialShipment={selectedPartialShipment}
          onClose={() => {
            setIsPartialShipmentModalOpen(false);
            setSelectedPartialShipment(null);
          }}
          onSubmit={(data) => {
            if (selectedPartialShipment) {
              updatePartialShipmentMutation.mutate({ id: selectedPartialShipment.id!, data });
            } else {
              createPartialShipmentMutation.mutate(data);
            }
          }}
          isLoading={createPartialShipmentMutation.isPending || updatePartialShipmentMutation.isPending}
        />
      )}

      {/* Partial Shipment Delete Modal */}
      {isPartialShipmentDeleteModalOpen && partialShipmentToDelete && (
        <DeleteModal
          title="Delete Partial Shipment"
          message="Are you sure you want to delete"
          itemName={partialShipmentToDelete.shipmentNumber}
          onClose={() => {
            setIsPartialShipmentDeleteModalOpen(false);
            setPartialShipmentToDelete(null);
          }}
          onConfirm={() => {
            if (partialShipmentToDelete?.id) {
              deletePartialShipmentMutation.mutate(partialShipmentToDelete.id);
            }
          }}
          isLoading={deletePartialShipmentMutation.isPending}
        />
      )}

      {/* View Order Modal */}
      {isViewModalOpen && selectedOrder && (
        <ViewOrderModal
          order={selectedOrder}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* View Allocation Rule Modal */}
      {isAllocationRuleViewModalOpen && selectedAllocationRuleForView && (
        <ViewAllocationRuleModal
          rule={selectedAllocationRuleForView}
          onClose={() => {
            setIsAllocationRuleViewModalOpen(false);
            setSelectedAllocationRuleForView(null);
          }}
        />
      )}
    </>
  );
}

// View Allocation Rule Modal Component
function ViewAllocationRuleModal({
  rule,
  onClose,
}: {
  rule: AllocationRule;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Allocation Rule Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.priority}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Channel</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {rule.channel || 'ALL'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Allocation Method</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.allocationMethod}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
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
            {rule.customerId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.customerId}</p>
              </div>
            )}
            {rule.customerType && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer Type</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.customerType}</p>
              </div>
            )}
            {rule.warehouseId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Warehouse ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{rule.warehouseId}</p>
              </div>
            )}
          </div>

          {rule.conditions && Object.keys(rule.conditions).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Conditions</label>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                {rule.conditions.minOrderValue && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Min Order Value:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{rule.conditions.minOrderValue}</span>
                  </div>
                )}
                {rule.conditions.maxOrderValue && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Max Order Value:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{rule.conditions.maxOrderValue}</span>
                  </div>
                )}
                {rule.conditions.productCategory && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Product Category:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{rule.conditions.productCategory}</span>
                  </div>
                )}
                {rule.conditions.orderType && rule.conditions.orderType.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Order Types:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{rule.conditions.orderType.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {rule.createdAt && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(rule.createdAt).toLocaleString()}
              </p>
            </div>
          )}

          {rule.updatedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Updated At</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(rule.updatedAt).toLocaleString()}
              </p>
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

// View Order Modal Component
function ViewOrderModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'PARTIALLY_FULFILLED':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'FULFILLED':
      case 'SHIPPED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
      case 'RETURNED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'B2B':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'DTC':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'WHOLESALE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Order Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer?.name || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(order.type)}`}>
                {order.type}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Date</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Amount</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {order.currency} {Number(order.totalAmount).toFixed(2)}
              </p>
            </div>
            {order.requiredDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Required Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(order.requiredDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {order.shippedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Shipped Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(order.shippedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {order.deliveredDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Delivered Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(order.deliveredDate).toLocaleDateString()}
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

          {order.orderLines && order.orderLines.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Order Lines</label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Fulfilled</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {order.orderLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{line.product?.name || 'Unknown'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{line.product?.sku || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{line.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{line.fulfilledQty || 0}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{order.currency} {Number(line.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{order.currency} {Number(line.totalPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

// Allocation Rule Modal Component
function AllocationRuleModal({
  rule,
  onClose,
  onSubmit,
  isLoading,
}: {
  rule: AllocationRule | null;
  onClose: () => void;
  onSubmit: (data: Omit<AllocationRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Omit<AllocationRule, 'id' | 'createdAt' | 'updatedAt'>>({
    name: rule?.name || '',
    priority: rule?.priority || 0,
    channel: rule?.channel || 'ALL',
    customerId: rule?.customerId,
    customerType: rule?.customerType || undefined,
    warehouseId: rule?.warehouseId,
    allocationMethod: rule?.allocationMethod || 'FIFO',
    conditions: rule?.conditions || {},
    isActive: rule?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Prepare data for API - only include customerType if it's a valid value (not 'ALL')
    const submitData: any = {
      name: formData.name,
      priority: formData.priority,
      channel: formData.channel,
      allocationMethod: formData.allocationMethod,
      isActive: formData.isActive,
    };
    
    // Only include optional fields if they have values
    if (formData.customerId) submitData.customerId = formData.customerId;
    if (formData.customerType && formData.customerType !== 'ALL') submitData.customerType = formData.customerType;
    if (formData.warehouseId) submitData.warehouseId = formData.warehouseId;
    if (formData.conditions && Object.keys(formData.conditions).length > 0) submitData.conditions = formData.conditions;
    
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {rule ? 'Edit Allocation Rule' : 'Create Allocation Rule'}
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
                Rule Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 ::placeholder:text-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter rule name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 ::placeholder:text-[12px] text-[14px] dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel
              </label>
              <CustomDropdown
                value={formData.channel || 'ALL'}
                onChange={(value) => setFormData({ ...formData, channel: value as any })}
                options={[
                  { value: 'ALL', label: 'All Channels' },
                  { value: 'DTC', label: 'DTC' },
                  { value: 'POS', label: 'POS' },
                  { value: 'B2B', label: 'B2B' },
                  { value: 'WHOLESALE', label: 'Wholesale' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Allocation Method
              </label>
              <CustomDropdown
                value={formData.allocationMethod}
                onChange={(value) => setFormData({ ...formData, allocationMethod: value as any })}
                options={[
                  { value: 'FIFO', label: 'FIFO (First In First Out)' },
                  { value: 'LIFO', label: 'LIFO (Last In First Out)' },
                  { value: 'PRIORITY', label: 'Priority Based' },
                  { value: 'ROUND_ROBIN', label: 'Round Robin' },
                  { value: 'PROXIMITY', label: 'Proximity Based' },
                ]}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : rule ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Pre-Order Modal Component
function ViewPreOrderModal({
  preOrder,
  onClose,
}: {
  preOrder: PreOrder;
  onClose: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULFILLED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pre-Order Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{preOrder.orderNumber || `Order #${preOrder.orderId}`}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(preOrder.status)}`}>
                {preOrder.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{preOrder.productName || `Product #${preOrder.productId}`}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{preOrder.sku || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{preOrder.quantity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Expected Date</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {preOrder.expectedDate ? new Date(preOrder.expectedDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            {preOrder.orderId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{preOrder.orderId}</p>
              </div>
            )}
            {preOrder.productId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{preOrder.productId}</p>
              </div>
            )}
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

// View Backorder Modal Component
function ViewBackorderModal({
  backorder,
  onClose,
}: {
  backorder: Backorder;
  onClose: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULFILLED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'ALLOCATED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Backorder Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{backorder.orderNumber || `Order #${backorder.orderId}`}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(backorder.status)}`}>
                {backorder.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{backorder.productName || `Product #${backorder.productId}`}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{backorder.sku || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{backorder.quantity}</p>
            </div>
            {backorder.orderId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{backorder.orderId}</p>
              </div>
            )}
            {backorder.orderLineId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Line ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{backorder.orderLineId}</p>
              </div>
            )}
            {backorder.productId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{backorder.productId}</p>
              </div>
            )}
            {backorder.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(backorder.createdAt).toLocaleDateString()} {new Date(backorder.createdAt).toLocaleTimeString()}
                </p>
              </div>
            )}
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

// Pre-Order Modal Component
function PreOrderModal({
  preOrder,
  onClose,
  onSubmit,
  isLoading,
}: {
  preOrder: PreOrder | null;
  onClose: () => void;
  onSubmit: (data: Omit<PreOrder, 'id' | 'orderNumber' | 'createdAt'>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Omit<PreOrder, 'id' | 'orderNumber' | 'createdAt'>>({
    orderId: preOrder?.orderId || 0,
    productId: preOrder?.productId || 0,
    quantity: preOrder?.quantity || 0,
    expectedDate: preOrder?.expectedDate || '',
    status: preOrder?.status || 'PENDING',
  });

  // Order search state
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);

  // Fetch all orders for search
  const { data: allOrdersData } = useQuery({
    queryKey: ['orders', 'all-for-search'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders', { params: { take: 10000 } });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
  });

  const allOrders = useMemo(() => {
    return Array.isArray(allOrdersData) ? allOrdersData : [];
  }, [allOrdersData]);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) {
      return allOrders.slice(0, 10); // Show first 10 if no search
    }
    const query = orderSearchQuery.toLowerCase();
    return allOrders.filter((order: any) => {
      const orderNumber = order.orderNumber?.toLowerCase() || '';
      const customerName = order.customer?.name?.toLowerCase() || '';
      const orderId = order.id?.toString() || '';
      return (
        orderNumber.includes(query) ||
        customerName.includes(query) ||
        orderId.includes(query)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [allOrders, orderSearchQuery]);

  // Set selected order display text
  const selectedOrder = useMemo(() => {
    if (!formData.orderId) return null;
    return allOrders.find((order: any) => order.id === formData.orderId);
  }, [allOrders, formData.orderId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        orderDropdownRef.current &&
        !orderDropdownRef.current.contains(event.target as Node) &&
        orderInputRef.current &&
        !orderInputRef.current.contains(event.target as Node)
      ) {
        setIsOrderDropdownOpen(false);
      }
    };

    if (isOrderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrderDropdownOpen]);

  // Initialize order search text when orderId changes
  useEffect(() => {
    if (selectedOrder && !orderSearchQuery) {
      setOrderSearchQuery(selectedOrder.orderNumber || `Order #${selectedOrder.id}`);
    }
  }, [selectedOrder]);

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Get products from selected order's orderLines
  const orderProducts = useMemo(() => {
    if (!selectedOrder || !selectedOrder.orderLines || !Array.isArray(selectedOrder.orderLines)) {
      return [];
    }
    return selectedOrder.orderLines.map((line: any) => ({
      id: line.productId,
      product: line.product,
      quantity: line.quantity,
      orderLineId: line.id,
    }));
  }, [selectedOrder]);

  // Filter products based on search query - only show products from selected order
  const filteredProducts = useMemo(() => {
    if (!formData.orderId || orderProducts.length === 0) {
      return []; // No products if no order selected
    }
    
    if (!productSearchQuery.trim()) {
      return orderProducts.slice(0, 10); // Show first 10 if no search
    }
    
    const query = productSearchQuery.toLowerCase();
    return orderProducts.filter((item: any) => {
      const product = item.product;
      const productName = product?.name?.toLowerCase() || '';
      const sku = product?.sku?.toLowerCase() || '';
      const ean = product?.ean?.toLowerCase() || '';
      const productId = item.id?.toString() || '';
      return (
        productName.includes(query) ||
        sku.includes(query) ||
        ean.includes(query) ||
        productId.includes(query)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [orderProducts, productSearchQuery, formData.orderId]);

  // Set selected product and get its max quantity from order
  const selectedProductItem = useMemo(() => {
    if (!formData.productId) return null;
    return orderProducts.find((item: any) => item.id === formData.productId);
  }, [orderProducts, formData.productId]);

  const maxQuantity = useMemo(() => {
    return selectedProductItem?.quantity || 0;
  }, [selectedProductItem]);

  // Close product dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node) &&
        productInputRef.current &&
        !productInputRef.current.contains(event.target as Node)
      ) {
        setIsProductDropdownOpen(false);
      }
    };

    if (isProductDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProductDropdownOpen]);

  // Initialize product search text when productId changes
  useEffect(() => {
    if (selectedProductItem && !productSearchQuery) {
      const product = selectedProductItem.product;
      setProductSearchQuery(product?.name || product?.sku || `Product #${selectedProductItem.id}`);
    }
  }, [selectedProductItem]);

  // Reset product selection when order changes
  useEffect(() => {
    if (formData.orderId && formData.orderId !== preOrder?.orderId) {
      setFormData(prev => ({ ...prev, productId: 0 }));
      setProductSearchQuery('');
    }
  }, [formData.orderId]);

  // Limit quantity to max quantity when product is selected
  useEffect(() => {
    if (maxQuantity > 0 && formData.quantity > maxQuantity) {
      setFormData(prev => ({ ...prev, quantity: maxQuantity }));
    }
  }, [maxQuantity, formData.quantity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.orderId || formData.orderId <= 0) {
      toast.error('Please select a valid order');
      return;
    }
    if (!formData.productId || formData.productId <= 0) {
      toast.error('Please select a valid product');
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    // Prepare data for API - ensure all values are properly formatted
    const submitData: any = {
      orderId: Number(formData.orderId),
      productId: Number(formData.productId),
      quantity: Number(formData.quantity),
      status: formData.status as 'PENDING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED',
    };
    
    // Only include expectedDate if it has a value and is valid
    if (formData.expectedDate && formData.expectedDate.trim() !== '') {
      // Ensure date is in ISO format (YYYY-MM-DD)
      const dateStr = formData.expectedDate.trim();
      // Validate date format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        submitData.expectedDate = dateStr;
      } else {
        // Try to convert to ISO format
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          submitData.expectedDate = date.toISOString().split('T')[0];
        }
      }
    }
    
    console.log('Submitting pre-order data:', submitData);
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {preOrder ? 'Edit Pre-Order' : 'Create Pre-Order'}
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
            <div className="relative" ref={orderDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order <span className="text-red-500">*</span>
              </label>
              <input
                ref={orderInputRef}
                type="text"
                required
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  setIsOrderDropdownOpen(true);
                  if (!e.target.value) {
                    setFormData({ ...formData, orderId: 0 });
                  }
                }}
                onFocus={() => setIsOrderDropdownOpen(true)}
                className="w-full px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Search by order number, customer name, or ID..."
              />
              {isOrderDropdownOpen && filteredOrders.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredOrders.map((order: any) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, orderId: order.id });
                        setOrderSearchQuery(order.orderNumber || `Order #${order.id}`);
                        setIsOrderDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.orderNumber || `Order #${order.id}`}
                      </div>
                      {order.customer?.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {order.customer.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {isOrderDropdownOpen && orderSearchQuery && filteredOrders.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-sm text-gray-500 dark:text-gray-400">
                  No orders found
                </div>
              )}
            </div>

            <div className="relative" ref={productDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product <span className="text-red-500">*</span>
              </label>
              <input
                ref={productInputRef}
                type="text"
                required
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  setIsProductDropdownOpen(true);
                  if (!e.target.value) {
                    setFormData({ ...formData, productId: 0 });
                  }
                }}
                onFocus={() => setIsProductDropdownOpen(true)}
                className="w-full px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Search by product name, SKU, EAN, or ID..."
              />
              {isProductDropdownOpen && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredProducts.map((item: any) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const product = item.product;
                        setFormData({ 
                          ...formData, 
                          productId: item.id,
                          quantity: Math.min(formData.quantity || 1, item.quantity) // Set quantity to min of current or max available
                        });
                        setProductSearchQuery(product?.name || product?.sku || `Product #${item.id}`);
                        setIsProductDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.product?.name || `Product #${item.id}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.product?.sku && `SKU: ${item.product.sku}`}
                        {item.product?.sku && item.quantity > 0 && ' • '}
                        {item.quantity > 0 && `Available: ${item.quantity}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {isProductDropdownOpen && productSearchQuery && filteredProducts.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-sm text-gray-500 dark:text-gray-400">
                  No products found
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity <span className="text-red-500">*</span>
                {maxQuantity > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    (Max: {maxQuantity})
                  </span>
                )}
              </label>
              <input
                type="number"
                required
                min="1"
                max={maxQuantity > 0 ? maxQuantity : undefined}
                value={formData.quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  const limitedValue = maxQuantity > 0 ? Math.min(value, maxQuantity) : value;
                  setFormData({ ...formData, quantity: limitedValue });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter quantity"
                disabled={!formData.productId || maxQuantity === 0}
              />
              {maxQuantity > 0 && formData.quantity > maxQuantity && (
                <p className="text-xs text-red-500 mt-1">
                  Quantity cannot exceed {maxQuantity} (available in order)
                </p>
              )}
              {!formData.orderId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Please select an order first
                </p>
              )}
              {formData.orderId && maxQuantity === 0 && formData.productId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Please select a product from the order
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Date
              </label>
              <DatePicker
                value={formData.expectedDate || null}
                onChange={(date) => setFormData({ ...formData, expectedDate: date || '' })}
                placeholder="Select expected date"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as any })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'FULFILLED', label: 'Fulfilled' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : preOrder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Backorder Modal Component
function BackorderModal({
  backorder,
  onClose,
  onSubmit,
  isLoading,
}: {
  backorder: Backorder | null;
  onClose: () => void;
  onSubmit: (data: Omit<Backorder, 'id' | 'orderNumber' | 'createdAt'>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Omit<Backorder, 'id' | 'orderNumber' | 'createdAt'>>({
    orderId: backorder?.orderId || 0,
    orderLineId: backorder?.orderLineId || 0,
    productId: backorder?.productId || 0,
    quantity: backorder?.quantity || 0,
    status: backorder?.status || 'PENDING',
  });

  // Order search state
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);

  // Order Line search state
  const [orderLineSearchQuery, setOrderLineSearchQuery] = useState('');
  const [isOrderLineDropdownOpen, setIsOrderLineDropdownOpen] = useState(false);
  const orderLineDropdownRef = useRef<HTMLDivElement>(null);
  const orderLineInputRef = useRef<HTMLInputElement>(null);

  // Fetch all orders for search
  const { data: allOrdersData } = useQuery({
    queryKey: ['orders', 'all-for-backorder-search'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders', { params: { take: 10000 } });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
  });

  const allOrders = useMemo(() => {
    return Array.isArray(allOrdersData) ? allOrdersData : [];
  }, [allOrdersData]);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) {
      return allOrders.slice(0, 10); // Show first 10 if no search
    }
    const query = orderSearchQuery.toLowerCase();
    return allOrders.filter((order: any) => {
      const orderNumber = order.orderNumber?.toLowerCase() || '';
      const customerName = order.customer?.name?.toLowerCase() || '';
      const orderId = order.id?.toString() || '';
      return (
        orderNumber.includes(query) ||
        customerName.includes(query) ||
        orderId.includes(query)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [allOrders, orderSearchQuery]);

  // Set selected order display text
  const selectedOrder = useMemo(() => {
    if (!formData.orderId) return null;
    return allOrders.find((order: any) => order.id === formData.orderId);
  }, [allOrders, formData.orderId]);

  // Get order lines from selected order
  const orderLines = useMemo(() => {
    if (!selectedOrder || !selectedOrder.orderLines || !Array.isArray(selectedOrder.orderLines)) {
      return [];
    }
    return selectedOrder.orderLines.map((line: any) => ({
      id: line.id,
      productId: line.productId,
      product: line.product,
      quantity: line.quantity,
      fulfilledQty: line.fulfilledQty || 0,
      availableQty: (line.quantity || 0) - (line.fulfilledQty || 0), // Quantity not yet fulfilled
    }));
  }, [selectedOrder]);

  // Filter order lines based on search query
  const filteredOrderLines = useMemo(() => {
    if (!formData.orderId || orderLines.length === 0) {
      return []; // No order lines if no order selected
    }
    
    if (!orderLineSearchQuery.trim()) {
      return orderLines.slice(0, 10); // Show first 10 if no search
    }
    
    const query = orderLineSearchQuery.toLowerCase();
    return orderLines.filter((line: any) => {
      const product = line.product;
      const productName = product?.name?.toLowerCase() || '';
      const sku = product?.sku?.toLowerCase() || '';
      const lineId = line.id?.toString() || '';
      return (
        productName.includes(query) ||
        sku.includes(query) ||
        lineId.includes(query)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [orderLines, orderLineSearchQuery, formData.orderId]);

  // Set selected order line and get its max quantity
  const selectedOrderLine = useMemo(() => {
    if (!formData.orderLineId) return null;
    return orderLines.find((line: any) => line.id === formData.orderLineId);
  }, [orderLines, formData.orderLineId]);

  const maxQuantity = useMemo(() => {
    return selectedOrderLine?.availableQty || 0;
  }, [selectedOrderLine]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        orderDropdownRef.current &&
        !orderDropdownRef.current.contains(event.target as Node) &&
        orderInputRef.current &&
        !orderInputRef.current.contains(event.target as Node)
      ) {
        setIsOrderDropdownOpen(false);
      }
      if (
        orderLineDropdownRef.current &&
        !orderLineDropdownRef.current.contains(event.target as Node) &&
        orderLineInputRef.current &&
        !orderLineInputRef.current.contains(event.target as Node)
      ) {
        setIsOrderLineDropdownOpen(false);
      }
    };

    if (isOrderDropdownOpen || isOrderLineDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrderDropdownOpen, isOrderLineDropdownOpen]);

  // Initialize order search text when orderId changes
  useEffect(() => {
    if (selectedOrder && !orderSearchQuery) {
      setOrderSearchQuery(selectedOrder.orderNumber || `Order #${selectedOrder.id}`);
    }
  }, [selectedOrder]);

  // Initialize order line search text when orderLineId changes
  useEffect(() => {
    if (selectedOrderLine && !orderLineSearchQuery) {
      const product = selectedOrderLine.product;
      setOrderLineSearchQuery(
        product?.name || product?.sku || `Order Line #${selectedOrderLine.id}`
      );
    }
  }, [selectedOrderLine]);

  // Reset order line and product when order changes
  useEffect(() => {
    if (formData.orderId && formData.orderId !== backorder?.orderId) {
      setFormData(prev => ({ ...prev, orderLineId: 0, productId: 0, quantity: 0 }));
      setOrderLineSearchQuery('');
    }
  }, [formData.orderId]);

  // Auto-populate productId when orderLineId is selected
  useEffect(() => {
    if (selectedOrderLine && formData.productId !== selectedOrderLine.productId) {
      setFormData(prev => ({
        ...prev,
        productId: selectedOrderLine.productId,
        quantity: Math.min(prev.quantity || 1, selectedOrderLine.availableQty),
      }));
    }
  }, [selectedOrderLine, formData.productId]);

  // Limit quantity to max quantity when order line is selected
  useEffect(() => {
    if (maxQuantity > 0 && formData.quantity > maxQuantity) {
      setFormData(prev => ({ ...prev, quantity: maxQuantity }));
    }
  }, [maxQuantity, formData.quantity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.orderId || formData.orderId <= 0) {
      toast.error('Please select a valid order');
      return;
    }
    if (!formData.orderLineId || formData.orderLineId <= 0) {
      toast.error('Please select a valid order line');
      return;
    }
    if (!formData.productId || formData.productId <= 0) {
      toast.error('Please select a valid product');
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (maxQuantity > 0 && formData.quantity > maxQuantity) {
      toast.error(`Quantity cannot exceed ${maxQuantity} (available in order line)`);
      return;
    }
    
    // Prepare data for API
    const submitData: any = {
      orderId: Number(formData.orderId),
      orderLineId: Number(formData.orderLineId),
      productId: Number(formData.productId),
      quantity: Number(formData.quantity),
      status: formData.status as 'PENDING' | 'ALLOCATED' | 'FULFILLED' | 'CANCELLED',
    };
    
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {backorder ? 'Edit Backorder' : 'Create Backorder'}
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
            <div className="relative" ref={orderDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order <span className="text-red-500">*</span>
              </label>
              <input
                ref={orderInputRef}
                type="text"
                required
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  setIsOrderDropdownOpen(true);
                  if (!e.target.value) {
                    setFormData({ ...formData, orderId: 0, orderLineId: 0, productId: 0 });
                  }
                }}
                onFocus={() => setIsOrderDropdownOpen(true)}
                className="w-full px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Search by order number, customer name, or ID..."
              />
              {isOrderDropdownOpen && filteredOrders.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredOrders.map((order: any) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, orderId: order.id, orderLineId: 0, productId: 0, quantity: 0 });
                        setOrderSearchQuery(order.orderNumber || `Order #${order.id}`);
                        setIsOrderDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.orderNumber || `Order #${order.id}`}
                      </div>
                      {order.customer?.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {order.customer.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {isOrderDropdownOpen && orderSearchQuery && filteredOrders.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-sm text-gray-500 dark:text-gray-400">
                  No orders found
                </div>
              )}
            </div>

            <div className="relative" ref={orderLineDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order Line <span className="text-red-500">*</span>
              </label>
              <input
                ref={orderLineInputRef}
                type="text"
                required
                value={orderLineSearchQuery}
                onChange={(e) => {
                  setOrderLineSearchQuery(e.target.value);
                  setIsOrderLineDropdownOpen(true);
                  if (!e.target.value) {
                    setFormData({ ...formData, orderLineId: 0, productId: 0 });
                  }
                }}
                onFocus={() => setIsOrderLineDropdownOpen(true)}
                className="w-full px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Search by product name, SKU, or line ID..."
                disabled={!formData.orderId}
              />
              {isOrderLineDropdownOpen && filteredOrderLines.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredOrderLines.map((line: any) => (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => {
                        const product = line.product;
                        setFormData({ 
                          ...formData, 
                          orderLineId: line.id,
                          productId: line.productId,
                          quantity: Math.min(formData.quantity || 1, line.availableQty)
                        });
                        setOrderLineSearchQuery(product?.name || product?.sku || `Order Line #${line.id}`);
                        setIsOrderLineDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {line.product?.name || `Order Line #${line.id}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {line.product?.sku && `SKU: ${line.product.sku}`}
                        {line.product?.sku && line.availableQty > 0 && ' • '}
                        {line.availableQty > 0 && `Available: ${line.availableQty} / ${line.quantity}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {isOrderLineDropdownOpen && orderLineSearchQuery && filteredOrderLines.length === 0 && formData.orderId && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-sm text-gray-500 dark:text-gray-400">
                  No order lines found in this order
                </div>
              )}
              {isOrderLineDropdownOpen && !formData.orderId && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 text-sm text-gray-500 dark:text-gray-400">
                  Please select an order first
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product ID <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.productId}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                placeholder="Auto-filled from order line"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Product ID is automatically set when you select an order line
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity <span className="text-red-500">*</span>
                {maxQuantity > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    (Max: {maxQuantity})
                  </span>
                )}
              </label>
              <input
                type="number"
                required
                min="1"
                max={maxQuantity > 0 ? maxQuantity : undefined}
                value={formData.quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  const limitedValue = maxQuantity > 0 ? Math.min(value, maxQuantity) : value;
                  setFormData({ ...formData, quantity: limitedValue });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter quantity"
                disabled={!formData.orderLineId || maxQuantity === 0}
              />
              {maxQuantity > 0 && formData.quantity > maxQuantity && (
                <p className="text-xs text-red-500 mt-1">
                  Quantity cannot exceed {maxQuantity} (available in order line)
                </p>
              )}
              {!formData.orderId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Please select an order first
                </p>
              )}
              {formData.orderId && maxQuantity === 0 && formData.orderLineId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This order line is already fully fulfilled
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as any })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'ALLOCATED', label: 'Allocated' },
                  { value: 'FULFILLED', label: 'Fulfilled' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : backorder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Partial Shipment Modal Component
function ViewPartialShipmentModal({
  partialShipment,
  onClose,
}: {
  partialShipment: PartialShipment;
  onClose: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Partial Shipment Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Shipment Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{partialShipment.shipmentNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(partialShipment.status)}`}>
                {partialShipment.status}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{partialShipment.orderNumber || `Order #${partialShipment.orderId}`}</p>
            </div>
            {partialShipment.trackingNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tracking Number</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{partialShipment.trackingNumber}</p>
              </div>
            )}
            {partialShipment.shippedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Shipped Date</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(partialShipment.shippedDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {partialShipment.orderId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order ID</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{partialShipment.orderId}</p>
              </div>
            )}
            {partialShipment.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created At</label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(partialShipment.createdAt).toLocaleDateString()} {new Date(partialShipment.createdAt).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          {partialShipment.items && partialShipment.items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Items ({partialShipment.items.length})</label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order Line ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {partialShipment.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.orderLineId}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.productId}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

function PartialShipmentModal({
  partialShipment,
  onClose,
  onSubmit,
  isLoading,
}: {
  partialShipment: PartialShipment | null;
  onClose: () => void;
  onSubmit: (data: Omit<PartialShipment, 'id' | 'shipmentNumber' | 'createdAt'>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Omit<PartialShipment, 'id' | 'shipmentNumber' | 'createdAt'>>({
    orderId: partialShipment?.orderId || 0,
    items: partialShipment?.items || [],
    status: partialShipment?.status || 'PENDING',
    shippedDate: partialShipment?.shippedDate || '',
    trackingNumber: partialShipment?.trackingNumber || '',
  });

  // Order search state
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);

  // Fetch all orders for search
  const { data: allOrdersData } = useQuery({
    queryKey: ['orders', 'all-for-partial-shipment-search'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders', { params: { take: 10000 } });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
  });

  const allOrders = useMemo(() => {
    return Array.isArray(allOrdersData) ? allOrdersData : [];
  }, [allOrdersData]);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!orderSearchQuery.trim()) {
      return allOrders.slice(0, 10); // Show first 10 if no search
    }
    const query = orderSearchQuery.toLowerCase();
    return allOrders.filter((order: any) => {
      const orderNumber = order.orderNumber?.toLowerCase() || '';
      const customerName = order.customer?.name?.toLowerCase() || '';
      const orderId = order.id?.toString() || '';
      return (
        orderNumber.includes(query) ||
        customerName.includes(query) ||
        orderId.includes(query)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [allOrders, orderSearchQuery]);

  // Set selected order display text
  const selectedOrder = useMemo(() => {
    if (!formData.orderId) return null;
    return allOrders.find((order: any) => order.id === formData.orderId);
  }, [allOrders, formData.orderId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        orderDropdownRef.current &&
        !orderDropdownRef.current.contains(event.target as Node) &&
        orderInputRef.current &&
        !orderInputRef.current.contains(event.target as Node)
      ) {
        setIsOrderDropdownOpen(false);
      }
    };

    if (isOrderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrderDropdownOpen]);

  // Initialize order search text when orderId changes
  useEffect(() => {
    if (selectedOrder && !orderSearchQuery) {
      setOrderSearchQuery(selectedOrder.orderNumber || `Order #${selectedOrder.id}`);
    }
  }, [selectedOrder]);

  // Reset items when order changes
  useEffect(() => {
    if (formData.orderId && formData.orderId !== partialShipment?.orderId) {
      setFormData(prev => ({ ...prev, items: [] }));
    }
  }, [formData.orderId, partialShipment?.orderId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.orderId || formData.orderId <= 0) {
      toast.error('Please select a valid order');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {partialShipment ? 'Edit Partial Shipment' : 'Create Partial Shipment'}
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
            <div className="relative" ref={orderDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order ID <span className="text-red-500">*</span>
              </label>
              <input
                ref={orderInputRef}
                type="text"
                required
                value={orderSearchQuery}
                onChange={(e) => {
                  setOrderSearchQuery(e.target.value);
                  setIsOrderDropdownOpen(true);
                }}
                onFocus={() => setIsOrderDropdownOpen(true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 ::placeholder-[12px] text-[14px] rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Search by order number, customer, or ID"
              />
              {isOrderDropdownOpen && filteredOrders.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredOrders.map((order: any) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, orderId: order.id });
                        setOrderSearchQuery(order.orderNumber || `Order #${order.id}`);
                        setIsOrderDropdownOpen(false);
                      }}
                      className="w-full text-left text-[14px] px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.orderNumber || `Order #${order.id}`}
                      </div>
                      {order.customer?.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {order.customer.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {isOrderDropdownOpen && orderSearchQuery.trim() && filteredOrders.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No orders found
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as any })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'SHIPPED', label: 'Shipped' },
                  { value: 'DELIVERED', label: 'Delivered' },
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
                value={formData.trackingNumber}
                onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                className="w-full px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shipped Date
              </label>
              <DatePicker
                value={formData.shippedDate || null}
                onChange={(date) => setFormData({ ...formData, shippedDate: date || '' })}
                placeholder="Select shipped date"
                className="w-full ::placeholder-[12px] text-[14px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : partialShipment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
