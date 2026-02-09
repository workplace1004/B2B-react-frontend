import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  Plus,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ClipboardList,
  FileText,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  Tag,
  Barcode,
  X,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput } from '../components/ui';

// Types
// interface Order {
//   id: number;
//   orderNumber: string;
//   customerId: number;
//   customer?: {
//     id: number;
//     name: string;
//     address?: string;
//     city?: string;
//     country?: string;
//   };
//   type: 'DTC' | 'POS' | 'B2B' | 'WHOLESALE';
//   status: string;
//   totalAmount: number;
//   currency: string;
//   orderDate: string;
//   shippingAddress?: string;
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
//   size?: string;
//   color?: string;
// }

interface PickList {
  id?: string | number;
  pickListNumber: string;
  orderId: number;
  orderNumber?: string;
  warehouseId: number;
  warehouseName?: string;
  status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo?: string;
  items: PickListItem[];
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

interface PickListItem {
  id?: string | number;
  orderLineId: number;
  productId: number;
  productName?: string;
  sku?: string;
  binLocation?: string;
  quantity: number;
  pickedQuantity?: number;
  status: 'PENDING' | 'PICKED' | 'PARTIAL' | 'SKIPPED';
  pickedBy?: string;
  pickedAt?: string;
  notes?: string;
}

interface PackSlip {
  id?: string | number;
  packSlipNumber: string;
  orderId: number;
  orderNumber?: string;
  pickListId?: string | number;
  warehouseId: number;
  warehouseName?: string;
  status: 'DRAFT' | 'PACKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';
  packedBy?: string;
  packedAt?: string;
  items: PackSlipItem[];
  packageCount?: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  notes?: string;
  createdAt?: string;
}

interface PackSlipItem {
  id?: string | number;
  orderLineId: number;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  packedQuantity?: number;
  packageNumber?: number;
  notes?: string;
}

interface ShippingLabel {
  id?: string | number;
  labelNumber: string;
  orderId: number;
  orderNumber?: string;
  packSlipId?: string | number;
  shipmentNumber?: string;
  carrier: 'FEDEX' | 'UPS' | 'DHL' | 'USPS' | 'OTHER';
  serviceType?: string;
  trackingNumber?: string;
  fromAddress: {
    name: string;
    address: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  toAddress: {
    name: string;
    address: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  cost?: number;
  status: 'DRAFT' | 'GENERATED' | 'PRINTED' | 'SHIPPED' | 'CANCELLED';
  generatedAt?: string;
  printedAt?: string;
  labelUrl?: string;
  createdAt?: string;
}

interface Warehouse {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
}


interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customer?: {
    id: number;
    name: string;
  };
  status: string;
  totalAmount: number;
  currency: string;
  orderDate: string;
  orderLines?: OrderLine[];
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
  size?: string;
  color?: string;
}

export default function PickPackShip() {
  const [activeTab, setActiveTab] = useState<'pick-lists' | 'pack-slips' | 'shipping-labels'>('pick-lists');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isCreatePickListModalOpen, setIsCreatePickListModalOpen] = useState(false);
  const [isCreatePackSlipModalOpen, setIsCreatePackSlipModalOpen] = useState(false);
  const [isCreateShippingLabelModalOpen, setIsCreateShippingLabelModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch orders for creating pick lists
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders', 'pick-pack-ship'],
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

  const orders: Order[] = useMemo(() => {
    const data = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
    return data.filter((order: any) => 
      order.status === 'CONFIRMED' || 
      order.status === 'PROCESSING' || 
      order.status === 'PARTIALLY_FULFILLED'
    );
  }, [ordersData]);

  // Orders are available for creating pick lists, pack slips, and shipping labels
  // const orders: Order[] = useMemo(() => {
  //   const data = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
  //   return data.filter((order: any) => 
  //     order.status === 'CONFIRMED' || 
  //     order.status === 'PROCESSING' || 
  //     order.status === 'PARTIALLY_FULFILLED'
  //   );
  // }, [ordersData]);

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

  // Fetch pick lists from API
  const { data: pickListsData } = useQuery({
    queryKey: ['pick-lists', currentPage, itemsPerPage, statusFilter, warehouseFilter],
    queryFn: async () => {
      try {
        const params: any = {
          skip: (currentPage - 1) * itemsPerPage,
          take: itemsPerPage,
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (warehouseFilter !== 'all') {
          params.warehouseId = warehouseFilter;
        }
        const response = await api.get('/pick-lists', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching pick lists:', error);
        return { data: [], total: 0 };
      }
    },
  });

  const pickLists: PickList[] = useMemo(() => {
    const listsData = pickListsData?.data || [];
    if (!Array.isArray(listsData)) return [];
    return listsData.map((pl: any) => ({
      id: pl.id,
      pickListNumber: pl.pickListNumber,
      orderId: pl.orderId,
      orderNumber: pl.order?.orderNumber,
      warehouseId: pl.warehouseId,
      warehouseName: pl.warehouse?.name,
      status: pl.status,
      assignedTo: pl.assignedTo,
      items: pl.items || [],
      createdAt: pl.createdAt,
      startedAt: pl.startedAt,
      completedAt: pl.completedAt,
      notes: pl.notes,
    }));
  }, [pickListsData]);

  // Fetch pack slips from API
  const { data: packSlipsData } = useQuery({
    queryKey: ['pack-slips', currentPage, itemsPerPage, statusFilter, warehouseFilter],
    queryFn: async () => {
      try {
        const params: any = {
          skip: (currentPage - 1) * itemsPerPage,
          take: itemsPerPage,
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (warehouseFilter !== 'all') {
          params.warehouseId = warehouseFilter;
        }
        const response = await api.get('/pack-slips', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching pack slips:', error);
        return { data: [], total: 0 };
      }
    },
  });

  const packSlips: PackSlip[] = useMemo(() => {
    const slipsData = packSlipsData?.data || [];
    if (!Array.isArray(slipsData)) return [];
    return slipsData.map((ps: any) => ({
      id: ps.id,
      packSlipNumber: ps.packSlipNumber,
      orderId: ps.orderId,
      orderNumber: ps.order?.orderNumber,
      pickListId: ps.pickListId,
      warehouseId: ps.warehouseId,
      warehouseName: ps.warehouse?.name,
      status: ps.status,
      packedBy: ps.packedBy,
      items: ps.items || [],
      createdAt: ps.createdAt,
      packedAt: ps.packedAt,
      notes: ps.notes,
    }));
  }, [packSlipsData]);

  // Fetch shipping labels from API
  const { data: shippingLabelsData } = useQuery({
    queryKey: ['shipping-labels', currentPage, itemsPerPage, statusFilter],
    queryFn: async () => {
      try {
        const params: any = {
          skip: (currentPage - 1) * itemsPerPage,
          take: itemsPerPage,
        };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const response = await api.get('/shipping-labels', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching shipping labels:', error);
        return { data: [], total: 0 };
      }
    },
  });

  const shippingLabels: ShippingLabel[] = useMemo(() => {
    const labelsData = shippingLabelsData?.data || [];
    if (!Array.isArray(labelsData)) return [];
    return labelsData.map((sl: any) => ({
      id: sl.id,
      labelNumber: sl.labelNumber,
      orderId: sl.orderId,
      orderNumber: sl.order?.orderNumber,
      packSlipId: sl.packSlipId,
      carrier: sl.carrier as 'FEDEX' | 'UPS' | 'DHL' | 'USPS' | 'OTHER',
      trackingNumber: sl.trackingNumber,
      serviceType: sl.serviceType,
      status: sl.status as 'DRAFT' | 'GENERATED' | 'PRINTED' | 'SHIPPED' | 'CANCELLED',
      weight: sl.weight ? parseFloat(sl.weight.toString()) : undefined,
      dimensions: sl.dimensions,
      cost: sl.cost ? parseFloat(sl.cost.toString()) : undefined,
      printedAt: sl.printedAt,
      shippedAt: sl.shippedAt,
      createdAt: sl.createdAt,
      notes: sl.notes,
      fromAddress: {
        name: '',
        address: '',
        city: '',
        postalCode: '',
        country: '',
      },
      toAddress: {
        name: '',
        address: '',
        city: '',
        postalCode: '',
        country: '',
      },
    }));
  }, [shippingLabelsData]);

  // Mutations
  const createPickListMutation = useMutation({
    mutationFn: async (pickListData: Omit<PickList, 'id' | 'pickListNumber' | 'createdAt'>) => {
      const response = await api.post('/pick-lists', pickListData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pick-lists'] });
      toast.success('Pick list created successfully');
      setIsCreatePickListModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create pick list');
    },
  });

  const createPackSlipMutation = useMutation({
    mutationFn: async (packSlipData: Omit<PackSlip, 'id' | 'packSlipNumber' | 'createdAt'>) => {
      const response = await api.post('/pack-slips', packSlipData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pack-slips'] });
      toast.success('Pack slip created successfully');
      setIsCreatePackSlipModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create pack slip');
    },
  });

  const createShippingLabelMutation = useMutation({
    mutationFn: async (labelData: Omit<ShippingLabel, 'id' | 'labelNumber' | 'createdAt'>) => {
      const response = await api.post('/shipping-labels', labelData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-labels'] });
      toast.success('Shipping label created successfully');
      setIsCreateShippingLabelModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create shipping label');
    },
  });

  const handleCreatePickList = (pickListData: Omit<PickList, 'id' | 'pickListNumber' | 'createdAt'>) => {
    createPickListMutation.mutate(pickListData);
  };

  const handleCreatePackSlip = (packSlipData: Omit<PackSlip, 'id' | 'packSlipNumber' | 'createdAt'>) => {
    createPackSlipMutation.mutate(packSlipData);
  };

  const handleCreateShippingLabel = (labelData: Omit<ShippingLabel, 'id' | 'labelNumber' | 'createdAt'>) => {
    createShippingLabelMutation.mutate(labelData);
  };

  // Filter pick lists (client-side search only, other filters done by API)
  const filteredPickLists = useMemo(() => {
    let filtered = pickLists;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (list) =>
          list.pickListNumber.toLowerCase().includes(query) ||
          list.orderNumber?.toLowerCase().includes(query) ||
          list.warehouseName?.toLowerCase().includes(query) ||
          list.assignedTo?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [pickLists, searchQuery]);

  // Filter pack slips (client-side search only, other filters done by API)
  const filteredPackSlips = useMemo(() => {
    let filtered = packSlips;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (slip) =>
          slip.packSlipNumber.toLowerCase().includes(query) ||
          slip.orderNumber?.toLowerCase().includes(query) ||
          slip.warehouseName?.toLowerCase().includes(query) ||
          slip.packedBy?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [packSlips, searchQuery]);

  // Filter shipping labels (client-side search only, other filters done by API)
  const filteredShippingLabels = useMemo(() => {
    let filtered = shippingLabels;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (label) =>
          label.labelNumber.toLowerCase().includes(query) ||
          label.orderNumber?.toLowerCase().includes(query) ||
          label.trackingNumber?.toLowerCase().includes(query) ||
          label.carrier.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [shippingLabels, searchQuery]);

  // Get current tab data
  const currentData = useMemo(() => {
    if (activeTab === 'pick-lists') return filteredPickLists;
    if (activeTab === 'pack-slips') return filteredPackSlips;
    return filteredShippingLabels;
  }, [activeTab, filteredPickLists, filteredPackSlips, filteredShippingLabels]);

  // Pagination - use API pagination
  const totalItems = activeTab === 'pick-lists' 
    ? (pickListsData?.total || 0)
    : activeTab === 'pack-slips'
    ? (packSlipsData?.total || 0)
    : (shippingLabelsData?.total || 0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedData = currentData; // Already paginated by API

  // Summary metrics - fetch all for metrics
  const { data: allPickListsData } = useQuery({
    queryKey: ['pick-lists-metrics'],
    queryFn: async () => {
      try {
        const response = await api.get('/pick-lists?skip=0&take=10000');
        return response.data || { data: [], total: 0 };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
  });

  const { data: allPackSlipsData } = useQuery({
    queryKey: ['pack-slips-metrics'],
    queryFn: async () => {
      try {
        const response = await api.get('/pack-slips?skip=0&take=10000');
        return response.data || { data: [], total: 0 };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
  });

  const { data: allShippingLabelsData } = useQuery({
    queryKey: ['shipping-labels-metrics'],
    queryFn: async () => {
      try {
        const response = await api.get('/shipping-labels?skip=0&take=10000');
        return response.data || { data: [], total: 0 };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
  });

  const summaryMetrics = useMemo(() => {
    const allPickLists = allPickListsData?.data || [];
    const allPackSlips = allPackSlipsData?.data || [];
    const allShippingLabels = allShippingLabelsData?.data || [];

    const pickListsTotal = allPickLists.length;
    const pickListsInProgress = allPickLists.filter((l: any) => l.status === 'IN_PROGRESS' || l.status === 'ASSIGNED').length;
    const pickListsCompleted = allPickLists.filter((l: any) => l.status === 'COMPLETED').length;

    const packSlipsTotal = allPackSlips.length;
    const packSlipsPacking = allPackSlips.filter((s: any) => s.status === 'PACKING').length;
    const packSlipsPacked = allPackSlips.filter((s: any) => s.status === 'PACKED').length;

    const shippingLabelsTotal = allShippingLabels.length;
    const shippingLabelsGenerated = allShippingLabels.filter((l: any) => l.status === 'PRINTED').length;
    const shippingLabelsShipped = allShippingLabels.filter((l: any) => l.status === 'SHIPPED').length;

    return {
      pickLists: { total: pickListsTotal, inProgress: pickListsInProgress, completed: pickListsCompleted },
      packSlips: { total: packSlipsTotal, packing: packSlipsPacking, packed: packSlipsPacked },
      shippingLabels: { total: shippingLabelsTotal, generated: shippingLabelsGenerated, shipped: shippingLabelsShipped },
    };
  }, [allPickListsData, allPackSlipsData, allShippingLabelsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'ASSIGNED':
      case 'PACKING':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'COMPLETED':
      case 'PACKED':
      case 'GENERATED':
      case 'PRINTED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoadingOrders) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Pick / Pack / Ship" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Pick / Pack / Ship</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage pick lists, pack slips, and shipping labels for order fulfillment
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Pick Lists</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.pickLists.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pickLists.inProgress}
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
              <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.pickLists.completed}
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
              <p className="text-xs text-gray-600 dark:text-gray-400">Pack Slips</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.packSlips.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Packing</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.packSlips.packing}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Packed</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.packSlips.packed}
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
              <p className="text-xs text-gray-600 dark:text-gray-400">Shipping Labels</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.shippingLabels.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Generated</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.shippingLabels.generated}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Barcode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Shipped</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.shippingLabels.shipped}
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
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('pick-lists');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'pick-lists'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Pick Lists
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('pack-slips');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'pack-slips'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Pack Slips
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('shipping-labels');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'shipping-labels'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Shipping Labels
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Section Title */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeTab === 'pick-lists' ? 'Pick Lists' : activeTab === 'pack-slips' ? 'Pack Slips' : 'Shipping Labels'}
            </h3>
          </div>

          {/* Search, Filters, and Create Button */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center">
            <SearchInput
                value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                  setCurrentPage(1);
                }}
              placeholder={`Search ${activeTab === 'pick-lists' ? 'pick lists' : activeTab === 'pack-slips' ? 'pack slips' : 'shipping labels'}...`}
              className="flex-1"
              />
            {(activeTab === 'pick-lists' || activeTab === 'pack-slips') && (
              <div className="w-full md:w-auto md:min-w-[180px]">
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
            )}
            <div className="w-full md:w-auto md:min-w-[180px]">
              <CustomDropdown
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Status' },
                  ...(activeTab === 'pick-lists'
                    ? [
                        { value: 'DRAFT', label: 'Draft' },
                        { value: 'ASSIGNED', label: 'Assigned' },
                        { value: 'IN_PROGRESS', label: 'In Progress' },
                        { value: 'COMPLETED', label: 'Completed' },
                      ]
                    : activeTab === 'pack-slips'
                    ? [
                        { value: 'DRAFT', label: 'Draft' },
                        { value: 'PACKING', label: 'Packing' },
                        { value: 'PACKED', label: 'Packed' },
                        { value: 'SHIPPED', label: 'Shipped' },
                      ]
                    : [
                        { value: 'DRAFT', label: 'Draft' },
                        { value: 'GENERATED', label: 'Generated' },
                        { value: 'PRINTED', label: 'Printed' },
                        { value: 'SHIPPED', label: 'Shipped' },
                      ]),
                ]}
              />
            </div>
            {activeTab === 'pick-lists' && (
              <button
                onClick={() => setIsCreatePickListModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap w-full md:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                Create Pick List
              </button>
            )}
            {activeTab === 'pack-slips' && (
              <button
                onClick={() => setIsCreatePackSlipModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap w-full md:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                Create Pack Slip
              </button>
            )}
            {activeTab === 'shipping-labels' && (
              <button
                onClick={() => setIsCreateShippingLabelModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap w-full md:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                Create Shipping Label
              </button>
            )}
          </div>

          {/* Table */}
          {paginatedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              {activeTab === 'pick-lists' && <ClipboardList className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />}
              {activeTab === 'pack-slips' && <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />}
              {activeTab === 'shipping-labels' && <Tag className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />}
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery || statusFilter !== 'all' || warehouseFilter !== 'all'
                  ? 'No matching items found'
                  : `No ${activeTab === 'pick-lists' ? 'pick lists' : activeTab === 'pack-slips' ? 'pack slips' : 'shipping labels'} found`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      {activeTab === 'pick-lists' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Pick List #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Order #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Warehouse
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Items
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Assigned To
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Actions
                          </th>
                        </>
                      )}
                      {activeTab === 'pack-slips' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Pack Slip #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Order #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Warehouse
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Packages
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Packed By
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Actions
                          </th>
                        </>
                      )}
                      {activeTab === 'shipping-labels' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Label #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Order #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Carrier
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
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedData.map((item: any) => {
                      const warehouse = warehouses.find((w) => w.id === item.warehouseId);
                      const itemsCount = item.items?.length || 0;
                      const completedItems = activeTab === 'pick-lists' 
                        ? item.items?.filter((i: any) => i.status === 'PICKED').length || 0
                        : activeTab === 'pack-slips'
                        ? item.items?.filter((i: any) => i.packedQuantity && i.packedQuantity > 0).length || 0
                        : 0;
                      const progress = itemsCount > 0 ? Math.round((completedItems / itemsCount) * 100) : 0;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          {activeTab === 'pick-lists' && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.pickListNumber}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {item.orderNumber || `Order #${item.orderId}`}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {warehouse?.name || item.warehouseName || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {completedItems} / {itemsCount}
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                                  <div
                                    className="bg-primary-600 h-1.5 rounded-full"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {item.assignedTo || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                                >
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      // View pick list details
                                      toast('View pick list details feature coming soon');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Print pick list
                                      window.print();
                                      toast.success('Printing pick list...');
                                    }}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title="Print"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                          {activeTab === 'pack-slips' && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.packSlipNumber}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {item.orderNumber || `Order #${item.orderId}`}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {warehouse?.name || item.warehouseName || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {item.packageCount || 1} package{item.packageCount !== 1 ? 's' : ''}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {item.packedBy || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                                >
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      // View pack slip details
                                      toast('View pack slip details feature coming soon');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Print pack slip
                                      window.print();
                                      toast.success('Printing pack slip...');
                                    }}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title="Print"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                          {activeTab === 'shipping-labels' && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.labelNumber}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {item.orderNumber || `Order #${item.orderId}`}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                                  {item.carrier}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                                {item.trackingNumber || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                                >
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      // View shipping label
                                      toast('View shipping label feature coming soon');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Label"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Print shipping label
                                      window.print();
                                      toast.success('Printing shipping label...');
                                    }}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title="Print Label"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      // Download shipping label
                                      toast.success('Downloading shipping label...');
                                    }}
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
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
            </>
          )}
        </div>
      </div>

      {/* Create Pick List Modal */}
      {isCreatePickListModalOpen && (
        <CreatePickListModal
          orders={orders}
          warehouses={warehouses}
          onClose={() => setIsCreatePickListModalOpen(false)}
          onSubmit={handleCreatePickList}
        />
      )}

      {isCreatePackSlipModalOpen && (
        <CreatePackSlipModal
          orders={orders}
          warehouses={warehouses}
          pickLists={pickLists}
          onClose={() => setIsCreatePackSlipModalOpen(false)}
          onSubmit={handleCreatePackSlip}
        />
      )}

      {isCreateShippingLabelModalOpen && (
        <CreateShippingLabelModal
          orders={orders}
          packSlips={packSlips}
          warehouses={warehouses}
          onClose={() => setIsCreateShippingLabelModalOpen(false)}
          onSubmit={handleCreateShippingLabel}
        />
      )}
    </div>
  );
}

// Create Pick List Modal Component
function CreatePickListModal({
  orders,
  warehouses,
  onClose,
  onSubmit,
}: {
  orders: Order[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: Omit<PickList, 'id' | 'pickListNumber' | 'createdAt'>) => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === Number(selectedOrderId));
  }, [orders, selectedOrderId]);

  const availableItems = useMemo(() => {
    if (!selectedOrder || !selectedOrder.orderLines) return [];
    return selectedOrder.orderLines.filter((line) => {
      const remainingQty = line.quantity - line.fulfilledQty;
      return remainingQty > 0;
    });
  }, [selectedOrder]);

  const handleItemToggle = (orderLineId: number, maxQuantity: number) => {
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[orderLineId]) {
        delete newItems[orderLineId];
      } else {
        newItems[orderLineId] = maxQuantity;
      }
      return newItems;
    });
  };

  const handleQuantityChange = (orderLineId: number, quantity: number, maxQuantity: number) => {
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (quantity <= 0) {
        delete newItems[orderLineId];
      } else {
        newItems[orderLineId] = Math.min(quantity, maxQuantity);
      }
      return newItems;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrderId || !selectedWarehouseId) {
      toast.error('Please select an order and warehouse');
      return;
    }

    if (Object.keys(selectedItems).length === 0) {
      toast.error('Please select at least one item to pick');
      return;
    }

    const selectedWarehouse = warehouses.find((w) => w.id === Number(selectedWarehouseId));
    const pickListItems: PickListItem[] = Object.entries(selectedItems).map(([orderLineId, quantity]) => {
      const orderLine = selectedOrder?.orderLines?.find((l) => l.id === Number(orderLineId));
      return {
        id: Date.now() + Number(orderLineId),
        orderLineId: Number(orderLineId),
        productId: orderLine?.productId || 0,
        productName: orderLine?.product?.name,
        sku: orderLine?.product?.sku,
        quantity,
        pickedQuantity: 0,
        status: 'PENDING',
      };
    });

    onSubmit({
      orderId: Number(selectedOrderId),
      orderNumber: selectedOrder?.orderNumber,
      warehouseId: Number(selectedWarehouseId),
      warehouseName: selectedWarehouse?.name,
      assignedTo: assignedTo || undefined,
      items: pickListItems,
      notes: notes || undefined,
      status: 'DRAFT',
    });
  };

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Pick List</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Order Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Order *
            </label>
            <CustomDropdown
              value={selectedOrderId}
              onChange={setSelectedOrderId}
              options={orders.map((order) => ({
                value: order.id.toString(),
                label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency} ${order.totalAmount.toFixed(2)})`,
              }))}
              placeholder={orders.length === 0 ? 'No orders available' : 'Select an order...'}
            />
            {selectedOrder && (
              <div className="mt-2 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Customer:</span> {selectedOrder.customer?.name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Order Date:</span>{' '}
                  {new Date(selectedOrder.orderDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Status:</span> {selectedOrder.status}
                </p>
              </div>
            )}
          </div>

          {/* Warehouse Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Warehouse *
            </label>
            <CustomDropdown
              value={selectedWarehouseId}
              onChange={setSelectedWarehouseId}
              options={warehouses.map((warehouse) => ({
                value: warehouse.id.toString(),
                label: warehouse.name,
              }))}
              placeholder={warehouses.length === 0 ? 'No warehouses available' : 'Select a warehouse...'}
            />
          </div>

          {/* Order Items */}
          {selectedOrder && availableItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Items to Pick *
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-12">
                          <input
                            type="checkbox"
                            checked={availableItems.length > 0 && availableItems.every((item) => selectedItems[item.id])}
                            onChange={() => {
                              if (availableItems.every((item) => selectedItems[item.id])) {
                                setSelectedItems({});
                              } else {
                                const allItems: Record<number, number> = {};
                                availableItems.forEach((item) => {
                                  const remainingQty = item.quantity - item.fulfilledQty;
                                  allItems[item.id] = remainingQty;
                                });
                                setSelectedItems(allItems);
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Ordered
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Fulfilled
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Available
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Pick Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {availableItems.map((item) => {
                        const remainingQty = item.quantity - item.fulfilledQty;
                        const isSelected = !!selectedItems[item.id];
                        const pickQty = selectedItems[item.id] || 0;

                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleItemToggle(item.id, remainingQty)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {item.product?.name || 'Unknown Product'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {item.product?.sku || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {item.fulfilledQty}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                              {remainingQty}
                            </td>
                            <td className="px-4 py-3">
                              {isSelected ? (
                                <input
                                  type="number"
                                  min="1"
                                  max={remainingQty}
                                  value={pickQty}
                                  onChange={(e) =>
                                    handleQuantityChange(item.id, parseInt(e.target.value) || 0, remainingQty)
                                  }
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                                />
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {Object.keys(selectedItems).length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {Object.keys(selectedItems).length} item(s) selected
                </p>
              )}
            </div>
          )}

          {selectedOrder && availableItems.length === 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                This order has no items available for picking (all items are already fulfilled).
              </p>
            </div>
          )}

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned To
            </label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Enter assignee name (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or instructions (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedOrderId || !selectedWarehouseId || Object.keys(selectedItems).length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Pick List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Pack Slip Modal Component
function CreatePackSlipModal({
  orders,
  warehouses,
  pickLists,
  onClose,
  onSubmit,
}: {
  orders: Order[];
  warehouses: Warehouse[];
  pickLists: PickList[];
  onClose: () => void;
  onSubmit: (data: Omit<PackSlip, 'id' | 'packSlipNumber' | 'createdAt'>) => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedPickListId, setSelectedPickListId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [packedBy, setPackedBy] = useState('');
  const [packageCount, setPackageCount] = useState<number>(1);
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === Number(selectedOrderId));
  }, [orders, selectedOrderId]);

  const selectedPickList = useMemo(() => {
    return pickLists.find((pl) => pl.id === Number(selectedPickListId));
  }, [pickLists, selectedPickListId]);

  // Get available items from order or pick list
  const availableItems = useMemo(() => {
    if (selectedPickList && selectedPickList.items) {
      // If pick list is selected, use items from pick list
      return selectedPickList.items.filter((item) => {
        const pickedQty = item.pickedQuantity || 0;
        return pickedQty > 0;
      });
    } else if (selectedOrder && selectedOrder.orderLines) {
      // Otherwise use order lines
      return selectedOrder.orderLines.filter((line) => {
        const remainingQty = line.quantity - line.fulfilledQty;
        return remainingQty > 0;
      });
    }
    return [];
  }, [selectedOrder, selectedPickList]);

  const handleItemToggle = (itemId: number, maxQuantity: number) => {
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[itemId]) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = maxQuantity;
      }
      return newItems;
    });
  };

  const handleQuantityChange = (itemId: number, quantity: number, maxQuantity: number) => {
    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (quantity <= 0) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = Math.min(quantity, maxQuantity);
      }
      return newItems;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrderId || !selectedWarehouseId) {
      toast.error('Please select an order and warehouse');
      return;
    }

    if (Object.keys(selectedItems).length === 0) {
      toast.error('Please select at least one item to pack');
      return;
    }

    const selectedWarehouse = warehouses.find((w) => w.id === Number(selectedWarehouseId));
    
    let packSlipItems: PackSlipItem[] = [];
    
    if (selectedPickList) {
      // Use items from pick list
      packSlipItems = Object.entries(selectedItems).map(([itemId, quantity]) => {
        const pickListItem = selectedPickList.items.find((item) => item.id === Number(itemId));
        return {
          id: Date.now() + Number(itemId),
          orderLineId: pickListItem?.orderLineId || 0,
          productId: pickListItem?.productId || 0,
          productName: pickListItem?.productName,
          sku: pickListItem?.sku,
          quantity,
          packedQuantity: 0,
        };
      });
    } else if (selectedOrder) {
      // Use items from order
      packSlipItems = Object.entries(selectedItems).map(([orderLineId, quantity]) => {
        const orderLine = selectedOrder.orderLines?.find((l) => l.id === Number(orderLineId));
        return {
          id: Date.now() + Number(orderLineId),
          orderLineId: Number(orderLineId),
          productId: orderLine?.productId || 0,
          productName: orderLine?.product?.name,
          sku: orderLine?.product?.sku,
          quantity,
          packedQuantity: 0,
        };
      });
    }

    onSubmit({
      orderId: Number(selectedOrderId),
      orderNumber: selectedOrder?.orderNumber,
      pickListId: selectedPickListId ? Number(selectedPickListId) : undefined,
      warehouseId: Number(selectedWarehouseId),
      warehouseName: selectedWarehouse?.name,
      packedBy: packedBy || undefined,
      items: packSlipItems,
      packageCount: packageCount || 1,
      weight: weight ? parseFloat(weight) : undefined,
      notes: notes || undefined,
      status: 'DRAFT',
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Pack Slip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Order Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Order *
            </label>
            <CustomDropdown
              value={selectedOrderId}
              onChange={setSelectedOrderId}
              options={
                orders.length === 0
                  ? []
                  : orders.map((order) => ({
                      value: order.id.toString(),
                      label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency} ${order.totalAmount.toFixed(2)})`,
                    }))
              }
              placeholder={orders.length === 0 ? 'No orders available' : 'Select an order...'}
            />
            {selectedOrder && (
              <div className="mt-2 p-3 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Customer:</span> {selectedOrder.customer?.name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Order Date:</span>{' '}
                  {new Date(selectedOrder.orderDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Status:</span> {selectedOrder.status}
                </p>
              </div>
            )}
          </div>

          {/* Pick List Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Pick List (Optional)
            </label>
            <CustomDropdown
              value={selectedPickListId}
              onChange={setSelectedPickListId}
              options={pickLists
                .filter((pl) => pl.orderId === Number(selectedOrderId) || !selectedOrderId)
                .map((pickList) => ({
                  value: pickList.id?.toString() || '',
                  label: `${pickList.pickListNumber} - ${pickList.warehouseName || 'Unknown Warehouse'}`,
                }))}
              placeholder={pickLists.length === 0 ? 'No pick lists available' : 'Select a pick list (optional)...'}
            />
            {selectedPickList && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  <span className="font-medium">Pick List:</span> {selectedPickList.pickListNumber}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  <span className="font-medium">Status:</span> {selectedPickList.status}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  <span className="font-medium">Items:</span> {selectedPickList.items?.length || 0}
                </p>
              </div>
            )}
          </div>

          {/* Warehouse Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Warehouse *
            </label>
            <CustomDropdown
              value={selectedWarehouseId}
              onChange={setSelectedWarehouseId}
              options={
                warehouses.length === 0
                  ? []
                  : warehouses.map((warehouse) => ({
                      value: warehouse.id.toString(),
                      label: warehouse.name,
                    }))
              }
              placeholder={warehouses.length === 0 ? 'No warehouses available' : 'Select a warehouse...'}
            />
          </div>

          {/* Order Items */}
          {availableItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Items to Pack *
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-12">
                          <input
                            type="checkbox"
                            checked={availableItems.length > 0 && availableItems.every((item) => {
                              const itemId = 'id' in item ? item.id : item.orderLineId || item.id;
                              return selectedItems[itemId as number];
                            })}
                            onChange={() => {
                              const allSelected = availableItems.every((item) => {
                                const itemId = 'id' in item ? item.id : item.orderLineId || item.id;
                                return selectedItems[itemId as number];
                              });
                              if (allSelected) {
                                setSelectedItems({});
                              } else {
                                const allItems: Record<number, number> = {};
                                availableItems.forEach((item) => {
                                  const itemId = ('id' in item ? item.id : item.orderLineId || item.id) as number;
                                  const maxQty = selectedPickList 
                                    ? (item as PickListItem).pickedQuantity || (item as PickListItem).quantity
                                    : (item as OrderLine).quantity - (item as OrderLine).fulfilledQty;
                                  allItems[itemId] = maxQty;
                                });
                                setSelectedItems(allItems);
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {selectedPickList ? 'Picked' : 'Available'}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Pack Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {availableItems.map((item) => {
                        const itemId = ('id' in item ? item.id : item.orderLineId || item.id) as number;
                        const maxQty = selectedPickList 
                          ? (item as PickListItem).pickedQuantity || (item as PickListItem).quantity
                          : (item as OrderLine).quantity - (item as OrderLine).fulfilledQty;
                        const isSelected = !!selectedItems[itemId];
                        const packQty = selectedItems[itemId] || 0;
                        const productName = selectedPickList 
                          ? (item as PickListItem).productName
                          : (item as OrderLine).product?.name;
                        const sku = selectedPickList 
                          ? (item as PickListItem).sku
                          : (item as OrderLine).product?.sku;

                        return (
                          <tr key={itemId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleItemToggle(itemId, maxQty)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {productName || 'Unknown Product'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {sku || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                              {maxQty}
                            </td>
                            <td className="px-4 py-3">
                              {isSelected ? (
                                <input
                                  type="number"
                                  min="1"
                                  max={maxQty}
                                  value={packQty}
                                  onChange={(e) =>
                                    handleQuantityChange(itemId, parseInt(e.target.value) || 0, maxQty)
                                  }
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                                />
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {Object.keys(selectedItems).length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {Object.keys(selectedItems).length} item(s) selected
                </p>
              )}
            </div>
          )}

          {availableItems.length === 0 && (selectedOrder || selectedPickList) && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                {selectedPickList 
                  ? 'This pick list has no items available for packing.'
                  : 'This order has no items available for packing (all items are already fulfilled).'}
              </p>
            </div>
          )}

          {/* Package Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Package Count
              </label>
              <input
                type="number"
                min="1"
                value={packageCount}
                onChange={(e) => setPackageCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Packed By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Packed By
            </label>
            <input
              type="text"
              value={packedBy}
              onChange={(e) => setPackedBy(e.target.value)}
              placeholder="Enter packer name (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or instructions (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedOrderId || !selectedWarehouseId || Object.keys(selectedItems).length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Pack Slip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Shipping Label Modal Component
function CreateShippingLabelModal({
  orders,
  packSlips,
  warehouses,
  onClose,
  onSubmit,
}: {
  orders: Order[];
  packSlips: PackSlip[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: Omit<ShippingLabel, 'id' | 'labelNumber' | 'createdAt'>) => void;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedPackSlipId, setSelectedPackSlipId] = useState<string>('');
  const [carrier, setCarrier] = useState<'FEDEX' | 'UPS' | 'DHL' | 'USPS' | 'OTHER'>('FEDEX');
  const [serviceType, setServiceType] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [weight, setWeight] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');

  // From Address
  const [fromName, setFromName] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [fromState, setFromState] = useState('');
  const [fromPostalCode, setFromPostalCode] = useState('');
  const [fromCountry, setFromCountry] = useState('');

  // To Address
  const [toName, setToName] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [toCity, setToCity] = useState('');
  const [toState, setToState] = useState('');
  const [toPostalCode, setToPostalCode] = useState('');
  const [toCountry, setToCountry] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === Number(selectedOrderId));
  }, [orders, selectedOrderId]);

  const selectedPackSlip = useMemo(() => {
    return packSlips.find((ps) => ps.id === Number(selectedPackSlipId));
  }, [packSlips, selectedPackSlipId]);

  // Auto-fill from address from warehouse if available
  useEffect(() => {
    if (warehouses.length > 0 && !fromName) {
      const defaultWarehouse = warehouses[0];
      setFromName(defaultWarehouse.name || '');
      setFromAddress(defaultWarehouse.address || '');
      setFromCity(defaultWarehouse.city || '');
      setFromCountry(defaultWarehouse.country || '');
    }
  }, [warehouses, fromName]);

  // Auto-fill to address from order customer if available
  useEffect(() => {
    if (selectedOrder && selectedOrder.customer) {
      setToName(selectedOrder.customer.name || '');
    }
  }, [selectedOrder]);

  // Auto-fill weight from pack slip if available
  useEffect(() => {
    if (selectedPackSlip && selectedPackSlip.weight) {
      setWeight(selectedPackSlip.weight.toString());
    }
  }, [selectedPackSlip]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    if (!fromName || !fromAddress || !fromCity || !fromPostalCode || !fromCountry) {
      toast.error('Please fill in all required from address fields');
      return;
    }

    if (!toName || !toAddress || !toCity || !toPostalCode || !toCountry) {
      toast.error('Please fill in all required to address fields');
      return;
    }

    onSubmit({
      orderId: Number(selectedOrderId),
      orderNumber: selectedOrder?.orderNumber,
      packSlipId: selectedPackSlipId ? Number(selectedPackSlipId) : undefined,
      carrier,
      serviceType: serviceType || undefined,
      trackingNumber: trackingNumber || undefined,
      fromAddress: {
        name: fromName,
        address: fromAddress,
        city: fromCity,
        state: fromState || undefined,
        postalCode: fromPostalCode,
        country: fromCountry,
      },
      toAddress: {
        name: toName,
        address: toAddress,
        city: toCity,
        state: toState || undefined,
        postalCode: toPostalCode,
        country: toCountry,
      },
      weight: weight ? parseFloat(weight) : undefined,
      dimensions: length || width || height
        ? {
            length: length ? parseFloat(length) : undefined,
            width: width ? parseFloat(width) : undefined,
            height: height ? parseFloat(height) : undefined,
          }
        : undefined,
      status: 'DRAFT',
    });
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
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Shipping Label</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Order Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Order *
            </label>
            <CustomDropdown
              value={selectedOrderId}
              onChange={setSelectedOrderId}
              options={
                orders.length === 0
                  ? []
                  : orders.map((order) => ({
                      value: order.id.toString(),
                      label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency} ${order.totalAmount.toFixed(2)})`,
                    }))
              }
              placeholder={orders.length === 0 ? 'No orders available' : 'Select an order...'}
            />
          </div>

          {/* Pack Slip Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Pack Slip (Optional)
            </label>
            <CustomDropdown
              value={selectedPackSlipId}
              onChange={setSelectedPackSlipId}
              options={packSlips
                .filter((ps) => ps.orderId === Number(selectedOrderId) || !selectedOrderId)
                .map((packSlip) => ({
                  value: packSlip.id?.toString() || '',
                  label: `${packSlip.packSlipNumber} - ${packSlip.warehouseName || 'Unknown Warehouse'}`,
                }))}
              placeholder={packSlips.length === 0 ? 'No pack slips available' : 'Select a pack slip (optional)...'}
            />
          </div>

          {/* Carrier and Service */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Carrier *
              </label>
              <CustomDropdown
                value={carrier}
                onChange={(value) => setCarrier(value as 'FEDEX' | 'UPS' | 'DHL' | 'USPS' | 'OTHER')}
                options={[
                  { value: 'FEDEX', label: 'FedEx' },
                  { value: 'UPS', label: 'UPS' },
                  { value: 'DHL', label: 'DHL' },
                  { value: 'USPS', label: 'USPS' },
                  { value: 'OTHER', label: 'Other' },
                ]}
                placeholder="Select carrier..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Type
              </label>
              <input
                type="text"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="e.g., Ground, Express, Overnight"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Tracking Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tracking Number
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Weight and Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Weight"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Length (cm)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="Length"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Width (cm)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="Width"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Height (cm)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Height"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* From Address */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">From Address *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address *</label>
                <input
                  type="text"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                <input
                  type="text"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                <input
                  type="text"
                  value={fromState}
                  onChange={(e) => setFromState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code *</label>
                <input
                  type="text"
                  value={fromPostalCode}
                  onChange={(e) => setFromPostalCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country *</label>
                <input
                  type="text"
                  value={fromCountry}
                  onChange={(e) => setFromCountry(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* To Address */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">To Address *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address *</label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                <input
                  type="text"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                <input
                  type="text"
                  value={toState}
                  onChange={(e) => setToState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code *</label>
                <input
                  type="text"
                  value={toPostalCode}
                  onChange={(e) => setToPostalCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country *</label>
                <input
                  type="text"
                  value={toCountry}
                  onChange={(e) => setToCountry(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Shipping Label
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
