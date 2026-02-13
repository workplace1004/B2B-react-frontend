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
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  Tag,
  Barcode,
  X,
  Edit,
  Trash2,
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

  // Reset status filter when switching tabs if current status is not valid for the new tab
  useEffect(() => {
    const validPickListStatuses = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const validPackSlipStatuses = ['DRAFT', 'PACKING', 'PACKED', 'SHIPPED', 'CANCELLED'];
    const validShippingLabelStatuses = ['PENDING', 'PRINTED', 'SHIPPED', 'CANCELLED'];

    let validStatuses: string[] = [];
    if (activeTab === 'pick-lists') {
      validStatuses = validPickListStatuses;
    } else if (activeTab === 'pack-slips') {
      validStatuses = validPackSlipStatuses;
    } else if (activeTab === 'shipping-labels') {
      validStatuses = validShippingLabelStatuses;
    }

    if (statusFilter !== 'all' && !validStatuses.includes(statusFilter)) {
      setStatusFilter('all');
    }
  }, [activeTab, statusFilter]);
  const [isCreatePickListModalOpen, setIsCreatePickListModalOpen] = useState(false);
  const [isCreatePackSlipModalOpen, setIsCreatePackSlipModalOpen] = useState(false);
  const [isCreateShippingLabelModalOpen, setIsCreateShippingLabelModalOpen] = useState(false);
  const [selectedPickListId, setSelectedPickListId] = useState<string | null>(null);
  const [selectedPackSlipId, setSelectedPackSlipId] = useState<string | null>(null);
  const [selectedShippingLabelId, setSelectedShippingLabelId] = useState<string | null>(null);
  const [editingPickListId, setEditingPickListId] = useState<string | null>(null);
  const [editingPackSlipId, setEditingPackSlipId] = useState<string | null>(null);
  const [editingShippingLabelId, setEditingShippingLabelId] = useState<string | null>(null);
  const [deletingPickListId, setDeletingPickListId] = useState<string | null>(null);
  const [deletingPackSlipId, setDeletingPackSlipId] = useState<string | null>(null);
  const [deletingShippingLabelId, setDeletingShippingLabelId] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.status-dropdown-container')) {
        setStatusDropdownOpen(null);
      }
    };

    if (statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusDropdownOpen]);

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
        // Only apply status filter if it's valid for pack slips
        // Valid pack slip statuses: DRAFT, PACKING, PACKED, SHIPPED, CANCELLED
        const validPackSlipStatuses = ['DRAFT', 'PACKING', 'PACKED', 'SHIPPED', 'CANCELLED'];
        if (statusFilter !== 'all' && validPackSlipStatuses.includes(statusFilter)) {
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
        // Only apply status filter if it's valid for shipping labels
        // Valid shipping label statuses: PENDING, PRINTED, SHIPPED, CANCELLED
        const validShippingLabelStatuses = ['PENDING', 'PRINTED', 'SHIPPED', 'CANCELLED'];
        if (statusFilter !== 'all' && validShippingLabelStatuses.includes(statusFilter)) {
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

  // Update mutations
  const updatePickListMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/pick-lists/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pick-lists'] });
      queryClient.invalidateQueries({ queryKey: ['pick-lists-metrics'] });
      queryClient.refetchQueries({ queryKey: ['pick-lists'] });
      queryClient.refetchQueries({ queryKey: ['pick-lists-metrics'] });
      toast.success('Pick list updated successfully');
      setSelectedPickListId(null);
      setEditingPickListId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update pick list');
    },
  });

  const updatePackSlipMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/pack-slips/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pack-slips'] });
      queryClient.invalidateQueries({ queryKey: ['pack-slips-metrics'] });
      queryClient.refetchQueries({ queryKey: ['pack-slips'] });
      queryClient.refetchQueries({ queryKey: ['pack-slips-metrics'] });
      toast.success('Pack slip updated successfully');
      setSelectedPackSlipId(null);
      setEditingPackSlipId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update pack slip');
    },
  });

  const updateShippingLabelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/shipping-labels/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-labels'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-labels-metrics'] });
      queryClient.refetchQueries({ queryKey: ['shipping-labels'] });
      queryClient.refetchQueries({ queryKey: ['shipping-labels-metrics'] });
      toast.success('Shipping label updated successfully');
      setSelectedShippingLabelId(null);
      setEditingShippingLabelId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update shipping label');
    },
  });

  // Delete mutations
  const deletePickListMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/pick-lists/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pick-lists'] });
      toast.success('Pick list deleted successfully');
      setDeletingPickListId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete pick list');
    },
  });

  const deletePackSlipMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/pack-slips/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pack-slips'] });
      toast.success('Pack slip deleted successfully');
      setDeletingPackSlipId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete pack slip');
    },
  });

  const deleteShippingLabelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/shipping-labels/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-labels'] });
      toast.success('Shipping label deleted successfully');
      setDeletingShippingLabelId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete shipping label');
    },
  });

  const handleCreatePickList = (pickListData: Omit<PickList, 'id' | 'pickListNumber' | 'createdAt'>) => {
    // Map to backend DTO format
    const apiData = {
      orderId: pickListData.orderId,
      warehouseId: pickListData.warehouseId,
      status: pickListData.status,
      assignedTo: pickListData.assignedTo,
      notes: pickListData.notes,
      items: pickListData.items.map(item => ({
        orderLineId: item.orderLineId,
        productId: item.productId,
        binLocation: item.binLocation,
        quantity: item.quantity,
        pickedQuantity: item.pickedQuantity || 0,
        status: item.status,
        notes: item.notes,
      })),
    };
    createPickListMutation.mutate(apiData as any);
  };

  const handleCreatePackSlip = (packSlipData: Omit<PackSlip, 'id' | 'packSlipNumber' | 'createdAt'>) => {
    // Map to backend DTO format
    const apiData = {
      orderId: packSlipData.orderId,
      pickListId: packSlipData.pickListId?.toString(),
      warehouseId: packSlipData.warehouseId,
      status: packSlipData.status,
      packedBy: packSlipData.packedBy,
      weight: packSlipData.weight,
      notes: packSlipData.notes,
      items: packSlipData.items.map((item: any) => ({
        orderLineId: item.orderLineId,
        productId: item.productId,
        quantity: item.quantity,
        packedQty: item.packedQty || item.packedQuantity || 0,
        notes: item.notes,
      })),
    };
    createPackSlipMutation.mutate(apiData);
  };

  const handleCreateShippingLabel = (labelData: Omit<ShippingLabel, 'id' | 'labelNumber' | 'createdAt'>) => {
    // Map to backend DTO format - remove fromAddress/toAddress, convert dimensions to string
    const dimensionsStr = labelData.dimensions
      ? `${labelData.dimensions.length || ''}x${labelData.dimensions.width || ''}x${labelData.dimensions.height || ''}`
      : undefined;

    // Ensure carrier is a valid string (required field)
    if (!labelData.carrier || typeof labelData.carrier !== 'string') {
      toast.error('Carrier is required');
      return;
    }

    const apiData: any = {
      orderId: labelData.orderId,
      carrier: String(labelData.carrier),
    };

    if (labelData.packSlipId) {
      apiData.packSlipId = String(labelData.packSlipId);
    }

    if (labelData.serviceType && labelData.serviceType.trim() !== '') {
      apiData.serviceType = labelData.serviceType;
    }

    if (labelData.trackingNumber && labelData.trackingNumber.trim() !== '') {
      apiData.trackingNumber = labelData.trackingNumber;
    }

    if (labelData.weight !== undefined && labelData.weight !== null) {
      apiData.weight = Number(labelData.weight);
    }

    if (dimensionsStr && dimensionsStr.trim() !== '') {
      apiData.dimensions = dimensionsStr;
    }

    // Map status: DRAFT -> PENDING (valid status for shipping labels)
    if (labelData.status) {
      apiData.status = labelData.status === 'DRAFT' ? 'PENDING' : labelData.status;
    }

    if ((labelData as any).notes && (labelData as any).notes.trim() !== '') {
      apiData.notes = (labelData as any).notes;
    }

    createShippingLabelMutation.mutate(apiData);
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
    const pickListsDraft = allPickLists.filter((l: any) => l.status === 'DRAFT').length;
    const pickListsAssigned = allPickLists.filter((l: any) => l.status === 'ASSIGNED').length;
    const pickListsInProgress = allPickLists.filter((l: any) => l.status === 'IN_PROGRESS').length;
    const pickListsCompleted = allPickLists.filter((l: any) => l.status === 'COMPLETED').length;
    const pickListsCancelled = allPickLists.filter((l: any) => l.status === 'CANCELLED').length;

    const packSlipsTotal = allPackSlips.length;
    const packSlipsPacking = allPackSlips.filter((s: any) => s.status === 'PACKING').length;
    const packSlipsPacked = allPackSlips.filter((s: any) => s.status === 'PACKED').length;
    const packSlipsShipped = allPackSlips.filter((s: any) => s.status === 'SHIPPED').length;
    const packSlipsCancelled = allPackSlips.filter((s: any) => s.status === 'CANCELLED').length;

    const shippingLabelsTotal = allShippingLabels.length;
    const shippingLabelsGenerated = allShippingLabels.filter((l: any) => l.status === 'PRINTED').length;
    const shippingLabelsShipped = allShippingLabels.filter((l: any) => l.status === 'SHIPPED').length;
    const shippingLabelsCancelled = allShippingLabels.filter((l: any) => l.status === 'CANCELLED').length;

    return {
      pickLists: { total: pickListsTotal, draft: pickListsDraft, assigned: pickListsAssigned, inProgress: pickListsInProgress, completed: pickListsCompleted, cancelled: pickListsCancelled },
      packSlips: { total: packSlipsTotal, packing: packSlipsPacking, packed: packSlipsPacked, shipped: packSlipsShipped, cancelled: packSlipsCancelled },
      shippingLabels: { total: shippingLabelsTotal, generated: shippingLabelsGenerated, shipped: shippingLabelsShipped, cancelled: shippingLabelsCancelled },
    };
  }, [allPickListsData, allPackSlipsData, allShippingLabelsData]);

  // Get next possible statuses for pick lists
  const getNextPickListStatuses = (currentStatus: string): string[] => {
    if (!currentStatus || String(currentStatus).trim() === '') {
      return ['CANCELLED'];
    }
    
    // Normalize status to uppercase with underscores
    const normalizedStatus = String(currentStatus).toUpperCase().replace(/\s+/g, '_').trim();
    
    // If already cancelled, no next statuses
    if (normalizedStatus === 'CANCELLED') {
      return [];
    }
    
    const statusFlow: Record<string, string[]> = {
      'DRAFT': ['ASSIGNED'],
      'ASSIGNED': ['IN_PROGRESS'],
      'IN_PROGRESS': ['COMPLETED'],
      'COMPLETED': [],
    };
    
    const nextStatuses = statusFlow[normalizedStatus] || [];
    
    // Always include CANCELLED in the result (unless already cancelled, which we checked above)
    const result: string[] = [];
    
    // Add next statuses from flow
    result.push(...nextStatuses);
    
    // Always add CANCELLED if not already in the array
    if (!result.includes('CANCELLED')) {
      result.push('CANCELLED');
    }
    
    return result;
  };

  // Get next possible statuses for pack slips
  const getNextPackSlipStatuses = (currentStatus: string): string[] => {
    if (!currentStatus) return ['CANCELLED'];
    
    // Normalize status to uppercase with underscores
    const normalizedStatus = String(currentStatus).toUpperCase().replace(/\s+/g, '_');
    
    const statusFlow: Record<string, string[]> = {
      'DRAFT': ['PACKING'],
      'PACKING': ['PACKED'],
      'PACKED': ['SHIPPED'],
      'SHIPPED': [],
      'CANCELLED': [],
    };
    const nextStatuses = statusFlow[normalizedStatus] || [];
    
    // Always include CANCELLED unless already cancelled
    if (normalizedStatus === 'CANCELLED') {
      return [];
    }
    
    // Return next statuses plus CANCELLED
    return [...nextStatuses, 'CANCELLED'];
  };

  // Get next possible statuses for shipping labels
  const getNextShippingLabelStatuses = (currentStatus: string): string[] => {
    if (!currentStatus) return ['CANCELLED'];
    
    // Normalize status to uppercase with underscores
    const normalizedStatus = String(currentStatus).toUpperCase().replace(/\s+/g, '_');
    
    const statusFlow: Record<string, string[]> = {
      'PENDING': ['PRINTED'],
      'PRINTED': ['SHIPPED'],
      'SHIPPED': [],
      'CANCELLED': [],
    };
    const nextStatuses = statusFlow[normalizedStatus] || [];
    
    // Always include CANCELLED unless already cancelled
    if (normalizedStatus === 'CANCELLED') {
      return [];
    }
    
    // Return next statuses plus CANCELLED
    return [...nextStatuses, 'CANCELLED'];
  };

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
      <div className={`grid grid-cols-1 md:grid-cols-6 gap-4 mb-6`}>
        {/* Pick Lists Tab Cards */}
        {activeTab === 'pick-lists' && (
          <>
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">Draft</p>
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                    {summaryMetrics.pickLists.draft}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Assigned</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {summaryMetrics.pickLists.assigned}
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cancelled</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {summaryMetrics.pickLists.cancelled}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pack Slips Tab Cards */}
        {activeTab === 'pack-slips' && (
          <>
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">Shipped</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {summaryMetrics.packSlips.shipped}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cancelled</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {summaryMetrics.packSlips.cancelled}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Shipping Labels Tab Cards */}
        {activeTab === 'shipping-labels' && (
          <>
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">Printed</p>
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cancelled</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {summaryMetrics.shippingLabels.cancelled}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </>
        )}
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'pick-lists'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'pack-slips'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'shipping-labels'
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
          <div className="flex flex-col md:flex-row w-full justify-between gap-4 mb-6 items-start md:items-center">
            <div className="flex flex-col md:flex-row w-full gap-4">
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
                          { value: 'PRINTED', label: 'Printed' },
                          { value: 'SHIPPED', label: 'Shipped' },
                          { value: 'CANCELLED', label: 'Cancelled' },
                        ]),
                  ]}
                />
              </div>
            </div>
            {activeTab === 'pick-lists' && (
              <button
                onClick={() => setIsCreatePickListModalOpen(true)}
                className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap w-full md:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                Create Pick List
              </button>
            )}
            {activeTab === 'pack-slips' && (
              <button
                onClick={() => setIsCreatePackSlipModalOpen(true)}
                className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap w-full md:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                Create Pack Slip
              </button>
            )}
            {activeTab === 'shipping-labels' && (
              <button
                onClick={() => setIsCreateShippingLabelModalOpen(true)}
                className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap w-full md:w-auto justify-center"
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
                                <div className="relative status-dropdown-container">
                                  {item.status && String(item.status).toUpperCase().replace(/\s+/g, '_') === 'CANCELLED' ? (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {item.status.replace('_', ' ')}
                                </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const itemId = item.id?.toString() || '';
                                          setStatusDropdownOpen(statusDropdownOpen === itemId ? null : itemId);
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(item.status)}`}
                                      >
                                        <span>{item.status.replace('_', ' ')}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${statusDropdownOpen === item.id?.toString() ? 'rotate-180' : ''}`} />
                                      </button>
                                      {statusDropdownOpen === item.id?.toString() && (
                                        <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100] overflow-hidden flex flex-col">
                                          {(() => {
                                            const nextStatuses = getNextPickListStatuses(item.status || '');
                                            return nextStatuses.length > 0 ? (
                                              nextStatuses.map((nextStatus, index) => (
                                              <button
                                                key={nextStatus}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const pickListId = item.id?.toString() || '';
                                                  if (pickListId) {
                                                    updatePickListMutation.mutate({
                                                      id: pickListId,
                                                      data: { status: nextStatus },
                                                    });
                                                  }
                                                  setStatusDropdownOpen(null);
                                                }}
                                                disabled={updatePickListMutation.isPending}
                                                className={`w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors whitespace-nowrap ${
                                                  index === 0 ? 'rounded-t-lg' : ''
                                                } ${
                                                  index === nextStatuses.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100 dark:border-gray-700'
                                                } ${updatePickListMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                              >
                                                {nextStatus.replace('_', ' ')}
                                              </button>
                                            ))
                                            ) : (
                                              <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                                                No next status available
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedPickListId(item.id?.toString() || '');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingPickListId(item.id?.toString() || '');
                                    }}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingPickListId(item.id?.toString() || '');
                                    }}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
                                <div className="relative status-dropdown-container">
                                  {item.status && String(item.status).toUpperCase().replace(/\s+/g, '_') === 'CANCELLED' ? (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {item.status.replace('_', ' ')}
                                </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const itemId = item.id?.toString() || '';
                                          setStatusDropdownOpen(statusDropdownOpen === itemId ? null : itemId);
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(item.status)}`}
                                      >
                                        <span>{item.status.replace('_', ' ')}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${statusDropdownOpen === item.id?.toString() ? 'rotate-180' : ''}`} />
                                      </button>
                                      {statusDropdownOpen === item.id?.toString() && (
                                        <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100] overflow-hidden flex flex-col">
                                          {(() => {
                                            const nextStatuses = getNextPackSlipStatuses(item.status || '');
                                            return nextStatuses.length > 0 ? (
                                              nextStatuses.map((nextStatus, index) => (
                                                <button
                                                  key={nextStatus}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const packSlipId = item.id?.toString() || '';
                                                    if (packSlipId) {
                                                      updatePackSlipMutation.mutate({
                                                        id: packSlipId,
                                                        data: { status: nextStatus },
                                                      });
                                                    }
                                                    setStatusDropdownOpen(null);
                                                  }}
                                                  disabled={updatePackSlipMutation.isPending}
                                                  className={`w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors whitespace-nowrap ${
                                                    index === 0 ? 'rounded-t-lg' : ''
                                                  } ${
                                                    index === nextStatuses.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100 dark:border-gray-700'
                                                  } ${updatePackSlipMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                  {nextStatus.replace('_', ' ')}
                                                </button>
                                              ))
                                            ) : (
                                              <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                                                No next status available
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedPackSlipId(item.id?.toString() || '');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingPackSlipId(item.id?.toString() || '');
                                    }}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingPackSlipId(item.id?.toString() || '');
                                    }}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
                                <div className="relative status-dropdown-container">
                                  {item.status && String(item.status).toUpperCase().replace(/\s+/g, '_') === 'CANCELLED' ? (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {item.status.replace('_', ' ')}
                                </span>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const itemId = item.id?.toString() || '';
                                          setStatusDropdownOpen(statusDropdownOpen === itemId ? null : itemId);
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(item.status)}`}
                                      >
                                        <span>{item.status.replace('_', ' ')}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${statusDropdownOpen === item.id?.toString() ? 'rotate-180' : ''}`} />
                                      </button>
                                      {statusDropdownOpen === item.id?.toString() && (
                                        <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100] overflow-hidden flex flex-col">
                                          {(() => {
                                            const nextStatuses = getNextShippingLabelStatuses(item.status || '');
                                            return nextStatuses.length > 0 ? (
                                              nextStatuses.map((nextStatus, index) => (
                                                <button
                                                  key={nextStatus}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const labelId = item.id?.toString() || '';
                                                    if (labelId) {
                                                      updateShippingLabelMutation.mutate({
                                                        id: labelId,
                                                        data: { status: nextStatus },
                                                      });
                                                    }
                                                    setStatusDropdownOpen(null);
                                                  }}
                                                  disabled={updateShippingLabelMutation.isPending}
                                                  className={`w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors whitespace-nowrap ${
                                                    index === 0 ? 'rounded-t-lg' : ''
                                                  } ${
                                                    index === nextStatuses.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100 dark:border-gray-700'
                                                  } ${updateShippingLabelMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                  {nextStatus.replace('_', ' ')}
                                                </button>
                                              ))
                                            ) : (
                                              <div className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                                                No next status available
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedShippingLabelId(item.id?.toString() || '');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Label"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingShippingLabelId(item.id?.toString() || '');
                                    }}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingShippingLabelId(item.id?.toString() || '');
                                    }}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
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

      {/* View Details Modals */}
      {selectedPickListId && (
        <ViewPickListModal
          pickListId={selectedPickListId}
          onClose={() => setSelectedPickListId(null)}
        />
      )}

      {selectedPackSlipId && (
        <ViewPackSlipModal
          packSlipId={selectedPackSlipId}
          onClose={() => setSelectedPackSlipId(null)}
        />
      )}

      {selectedShippingLabelId && (
        <ViewShippingLabelModal
          shippingLabelId={selectedShippingLabelId}
          onClose={() => setSelectedShippingLabelId(null)}
        />
      )}

      {/* Edit Modals */}
      {editingPickListId && (
        <EditPickListModal
          pickListId={editingPickListId}
          warehouses={warehouses}
          orders={orders}
          onClose={() => setEditingPickListId(null)}
          onUpdate={(data) => {
            updatePickListMutation.mutate({ id: editingPickListId, data });
          }}
        />
      )}

      {editingPackSlipId && (
        <EditPackSlipModal
          packSlipId={editingPackSlipId}
          warehouses={warehouses}
          orders={orders}
          pickLists={pickLists}
          onClose={() => setEditingPackSlipId(null)}
          onUpdate={(data) => {
            updatePackSlipMutation.mutate({ id: editingPackSlipId, data });
          }}
        />
      )}

      {editingShippingLabelId && (
        <EditShippingLabelModal
          shippingLabelId={editingShippingLabelId}
          orders={orders}
          onClose={() => setEditingShippingLabelId(null)}
          onUpdate={(data) => {
            updateShippingLabelMutation.mutate({ id: editingShippingLabelId, data });
          }}
        />
      )}

      {/* Delete Confirmation Modals */}
      {deletingPickListId && (
        <DeleteConfirmationModal
          title="Delete Pick List"
          message={`Are you sure you want to delete pick list ${pickLists.find(p => String(p.id) === deletingPickListId)?.pickListNumber || ''}? This action cannot be undone.`}
          onConfirm={() => deletePickListMutation.mutate(deletingPickListId)}
          onCancel={() => setDeletingPickListId(null)}
          isLoading={deletePickListMutation.isPending}
        />
      )}

      {deletingPackSlipId && (
        <DeleteConfirmationModal
          title="Delete Pack Slip"
          message={`Are you sure you want to delete pack slip ${packSlips.find(p => String(p.id) === deletingPackSlipId)?.packSlipNumber || ''}? This action cannot be undone.`}
          onConfirm={() => deletePackSlipMutation.mutate(deletingPackSlipId)}
          onCancel={() => setDeletingPackSlipId(null)}
          isLoading={deletePackSlipMutation.isPending}
        />
      )}

      {deletingShippingLabelId && (
        <DeleteConfirmationModal
          title="Delete Shipping Label"
          message={`Are you sure you want to delete shipping label ${shippingLabels.find(s => String(s.id) === deletingShippingLabelId)?.labelNumber || ''}? This action cannot be undone.`}
          onConfirm={() => deleteShippingLabelMutation.mutate(deletingShippingLabelId)}
          onCancel={() => setDeletingShippingLabelId(null)}
          isLoading={deleteShippingLabelMutation.isPending}
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
        status: 'PENDING' as any,
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
      status: 'PENDING' as any,
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
        <div className="sticky top-0 bg-white z-[50] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
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
              options={orders.map((order) => {
                const totalAmount = typeof order.totalAmount === 'number'
                  ? order.totalAmount.toFixed(2)
                  : parseFloat(String(order.totalAmount || '0')).toFixed(2);
                return {
                  value: String(order.id),
                  label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency || ''} ${totalAmount})`,
                };
              })}
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
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 text-[14px] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="w-full px-3 py-2 border text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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

    let packSlipItems: Array<{ orderLineId: number; productId: number; quantity: number; packedQty?: number; notes?: string }> = [];

    // Since we're always showing order lines, selectedItems keys are orderLineIds
    if (selectedOrder && selectedOrder.orderLines) {
      packSlipItems = Object.entries(selectedItems)
        .map(([orderLineIdStr, quantity]) => {
          const orderLineId = Number(orderLineIdStr);
          const orderLine = selectedOrder.orderLines?.find((l) => l.id === orderLineId);
          
          if (!orderLine || !orderLine.id || !orderLine.productId) {
            console.warn('Invalid order line found:', { orderLineId, orderLine });
            return null;
          }
          
        return {
            orderLineId: orderLine.id,
            productId: orderLine.productId,
          quantity,
            packedQty: 0,
          };
        })
        .filter((item): item is { orderLineId: number; productId: number; quantity: number; packedQty: number } => item !== null);
    }

    if (packSlipItems.length === 0) {
      toast.error('Please select at least one valid item to pack');
      return;
    }

    onSubmit({
      orderId: Number(selectedOrderId),
      pickListId: selectedPickListId ? String(selectedPickListId) : undefined,
      warehouseId: Number(selectedWarehouseId),
      packedBy: packedBy || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      items: packSlipItems,
      notes: notes || undefined,
      status: 'PENDING' as any,
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
                    label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency || ''} ${typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : parseFloat(String(order.totalAmount || '0')).toFixed(2)})`,
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
                        // Get product name - check product object first, then fallback to productName
                        let productName = '';
                        let sku = '';
                        if (selectedPickList) {
                          const pickListItem = item as any;
                          productName = pickListItem.product?.name || pickListItem.productName || '';
                          sku = pickListItem.product?.sku || pickListItem.sku || '';
                        } else {
                          const orderLine = item as OrderLine;
                          productName = orderLine.product?.name || '';
                          sku = orderLine.product?.sku || '';
                        }

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
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center text-[14px] justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
  onClose,
  onSubmit,
}: {
  orders: Order[];
  packSlips: PackSlip[];
  warehouses?: Warehouse[];
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
  const [notes, setNotes] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };


  const selectedPackSlip = useMemo(() => {
    return packSlips.find((ps) => ps.id === Number(selectedPackSlipId));
  }, [packSlips, selectedPackSlipId]);

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

    if (!carrier) {
      toast.error('Please select a carrier');
      return;
    }

    onSubmit({
      orderId: Number(selectedOrderId),
      packSlipId: selectedPackSlipId ? String(selectedPackSlipId) : undefined,
      carrier,
      serviceType: serviceType || undefined,
      trackingNumber: trackingNumber || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      dimensions: length || width || height
        ? {
          length: length ? parseFloat(length) : undefined,
          width: width ? parseFloat(width) : undefined,
          height: height ? parseFloat(height) : undefined,
        }
        : undefined,
      status: 'PENDING' as any,
      notes: notes || undefined,
    } as any);
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
                    label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency || ''} ${typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : parseFloat(String(order.totalAmount || '0')).toFixed(2)})`,
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
                className="w-full px-3 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="w-full px-3 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or instructions (optional)"
              rows={3}
              className="w-full px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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

// View Pick List Modal Component
function ViewPickListModal({
  pickListId,
  onClose,
}: {
  pickListId: string;
  onClose: () => void;
}) {
  const { data: pickListData, isLoading } = useQuery({
    queryKey: ['pick-list', pickListId],
    queryFn: async () => {
      const response = await api.get(`/pick-lists/${pickListId}`);
      return response.data;
    },
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">Loading...</div>
      </div>
    );
  }

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
        <div className="sticky top-0 bg-white z-[50] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Pick List: {pickListData?.pickListNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {pickListData?.order?.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {pickListData?.order?.customer?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warehouse</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {pickListData?.warehouse?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Created At</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {pickListData?.createdAt ? new Date(pickListData.createdAt).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Items</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      SKU
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Bin Location
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Picked
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pickListData?.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.product?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {item.product?.sku || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {item.binLocation || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.pickedQuantity || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status and Assignment Info (Read-only) */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-900 dark:text-white">
                  {pickListData?.status || '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned To</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-900 dark:text-white">
                  {pickListData?.assignedTo || '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px]">
                <span className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {pickListData?.notes || '—'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// View Pack Slip Modal Component
function ViewPackSlipModal({
  packSlipId,
  onClose,
}: {
  packSlipId: string;
  onClose: () => void;
}) {
  const { data: packSlipData, isLoading } = useQuery({
    queryKey: ['pack-slip', packSlipId],
    queryFn: async () => {
      const response = await api.get(`/pack-slips/${packSlipId}`);
      return response.data;
    },
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (isLoading || !packSlipData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading pack slip...</span>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="sticky top-0 bg-white z-[50] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Pack Slip: {packSlipData.packSlipNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {packSlipData?.order?.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {packSlipData?.order?.customer?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warehouse</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {packSlipData?.warehouse?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Created At</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {packSlipData?.createdAt ? new Date(packSlipData.createdAt).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Items</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      SKU
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Packed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {packSlipData?.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.product?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {item.product?.sku || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.packedQty || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status and Assignment Info (Read-only) */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-900 dark:text-white">
                  {packSlipData.status || '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Packed By</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-900 dark:text-white">
                  {packSlipData.packedBy || '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px]">
                <span className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {packSlipData.notes || '—'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// View Shipping Label Modal Component
function ViewShippingLabelModal({
  shippingLabelId,
  onClose,
}: {
  shippingLabelId: string;
  onClose: () => void;
}) {
  const { data: labelData, isLoading } = useQuery({
    queryKey: ['shipping-label', shippingLabelId],
    queryFn: async () => {
      const response = await api.get(`/shipping-labels/${shippingLabelId}`);
      return response.data;
    },
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (isLoading || !labelData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading shipping label...</span>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="sticky top-0 bg-white z-[50] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Shipping Label: {labelData.labelNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {labelData?.order?.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {labelData?.order?.customer?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Carrier</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {labelData?.carrier || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Service Type</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {labelData?.serviceType || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Weight</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {labelData?.weight ? `${labelData.weight} kg` : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dimensions</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {labelData?.dimensions || '—'}
              </p>
            </div>
          </div>

          {/* Status and Info (Read-only) */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-900 dark:text-white">
                  {labelData.status || '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tracking Number</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-900 dark:text-white">
                  {labelData.trackingNumber || '—'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[80px]">
                <span className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {labelData.notes || '—'}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmationModal({
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Pick List Modal Component
function EditPickListModal({
  pickListId,
  warehouses,
  orders,
  onClose,
  onUpdate,
}: {
  pickListId: string;
  warehouses: Warehouse[];
  orders: Order[];
  onClose: () => void;
  onUpdate: (data: any) => void;
}) {
  const { data: pickListData, isLoading } = useQuery({
    queryKey: ['pick-list', pickListId],
    queryFn: async () => {
      const response = await api.get(`/pick-lists/${pickListId}`);
      return response.data;
    },
  });

  const [orderId, setOrderId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ id?: string; orderLineId: number; productId: number; quantity: number; binLocation?: string; notes?: string }>>([]);

  const selectedOrder = useMemo(() => {
    if (orderId) {
      return orders.find((o) => o.id === Number(orderId));
    }
    if (!pickListData?.orderId) return null;
    return orders.find((o) => o.id === pickListData.orderId);
  }, [orders, pickListData, orderId]);

  const availableOrderLines = useMemo(() => {
    if (!selectedOrder || !selectedOrder.orderLines) return [];
    return selectedOrder.orderLines.filter((line) => {
      const remainingQty = line.quantity - line.fulfilledQty;
      return remainingQty > 0;
    });
  }, [selectedOrder]);

  // Track selected items by orderLineId for the checkbox table
  const selectedItemsMap = useMemo(() => {
    const map: Record<number, number> = {};
    items.forEach((item) => {
      map[item.orderLineId] = item.quantity;
    });
    return map;
  }, [items]);

  // Reset items when order changes
  useEffect(() => {
    if (orderId && orderId !== pickListData?.orderId?.toString()) {
      // Order changed, reset items
      setItems([]);
    }
  }, [orderId, pickListData?.orderId]);

  useEffect(() => {
    if (pickListData) {
      setOrderId(pickListData.orderId?.toString() || '');
      setStatus(pickListData.status || 'DRAFT');
      setWarehouseId(pickListData.warehouseId?.toString() || '');
      setAssignedTo(pickListData.assignedTo || '');
      setNotes(pickListData.notes || '');
      // Initialize items from pick list data
      if (pickListData.items && Array.isArray(pickListData.items)) {
        setItems(pickListData.items.map((item: any) => ({
          id: item.id,
          orderLineId: item.orderLineId,
          productId: item.productId,
          quantity: item.quantity,
          binLocation: item.binLocation,
          notes: item.notes,
        })));
      }
    }
  }, [pickListData]);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleItemToggle = (orderLineId: number, maxQuantity: number) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.orderLineId === orderLineId);
      if (existingIndex >= 0) {
        // Remove item
        return prev.filter((_, i) => i !== existingIndex);
      } else {
        // Add item
        const orderLine = availableOrderLines.find((line) => line.id === orderLineId);
        return [
          ...prev,
          {
            orderLineId,
            productId: orderLine?.productId || 0,
            quantity: maxQuantity,
            binLocation: '',
          },
        ];
      }
    });
  };

  const handleQuantityChange = (orderLineId: number, quantity: number, maxQuantity: number) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.orderLineId === orderLineId);
      if (existingIndex >= 0) {
        const newItems = [...prev];
        if (quantity <= 0) {
          // Remove item if quantity is 0
          return newItems.filter((_, i) => i !== existingIndex);
        } else {
          // Update quantity
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: Math.min(quantity, maxQuantity),
          };
          return newItems;
        }
      } else if (quantity > 0) {
        // Add new item
        const orderLine = availableOrderLines.find((line) => line.id === orderLineId);
        return [
          ...prev,
          {
            orderLineId,
            productId: orderLine?.productId || 0,
            quantity: Math.min(quantity, maxQuantity),
            binLocation: '',
          },
        ];
      }
      return prev;
    });
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderId) {
      toast.error('Please select an order');
      return;
    }

    if (!warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    onUpdate({
      orderId: Number(orderId),
      status,
      warehouseId: Number(warehouseId),
      assignedTo: assignedTo || undefined,
      notes: notes || undefined,
      items: items.map((item) => ({
        orderLineId: item.orderLineId,
        productId: item.productId,
        quantity: item.quantity,
        binLocation: item.binLocation || undefined,
        notes: item.notes || undefined,
      })),
    });
  };

  if (isLoading || !pickListData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading pick list...</span>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="sticky top-0 bg-white z-[50] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Pick List: {pickListData.pickListNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedOrder?.customer?.name || pickListData.order?.customer?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Created At</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {pickListData.createdAt ? new Date(pickListData.createdAt).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          {/* Order Items - Show all available items from order */}
          {selectedOrder && availableOrderLines.length > 0 && (
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
                            checked={availableOrderLines.length > 0 && availableOrderLines.every((item) => selectedItemsMap[item.id])}
                            onChange={() => {
                              if (availableOrderLines.every((item) => selectedItemsMap[item.id])) {
                                // Unselect all
                                setItems((prev) => prev.filter((item) => !availableOrderLines.some((line) => line.id === item.orderLineId)));
                              } else {
                                // Select all
                                const newItems: Array<{ orderLineId: number; productId: number; quantity: number; binLocation?: string }> = [];
                                availableOrderLines.forEach((item) => {
                                  const remainingQty = item.quantity - item.fulfilledQty;
                                  if (remainingQty > 0) {
                                    const existingIndex = items.findIndex((i) => i.orderLineId === item.id);
                                    if (existingIndex < 0) {
                                      newItems.push({
                                        orderLineId: item.id,
                                        productId: item.productId,
                                        quantity: remainingQty,
                                        binLocation: '',
                                      });
                                    }
                                  }
                                });
                                setItems((prev) => [...prev, ...newItems]);
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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Bin Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {availableOrderLines.map((item) => {
                        const remainingQty = item.quantity - item.fulfilledQty;
                        const isSelected = !!selectedItemsMap[item.id];
                        const pickQty = selectedItemsMap[item.id] || 0;
                        const itemIndex = items.findIndex((i) => i.orderLineId === item.id);
                        const binLocation = itemIndex >= 0 ? items[itemIndex].binLocation : '';

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
                            <td className="px-4 py-3">
                              {isSelected ? (
                <input
                  type="text"
                                  value={binLocation || ''}
                                  onChange={(e) => {
                                    if (itemIndex >= 0) {
                                      const newItems = [...items];
                                      newItems[itemIndex] = { ...newItems[itemIndex], binLocation: e.target.value };
                                      setItems(newItems);
                                    }
                                  }}
                                  placeholder="Bin location"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              {items.length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {items.length} item(s) selected
                </p>
              )}
            </div>
          )}

          {selectedOrder && availableOrderLines.length === 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                This order has no items available for picking (all items are already fulfilled).
              </p>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order *
              </label>
              <CustomDropdown
                value={orderId}
                onChange={setOrderId}
                options={orders.map((order) => {
                  const totalAmount = typeof order.totalAmount === 'number'
                    ? order.totalAmount.toFixed(2)
                    : parseFloat(String(order.totalAmount || '0')).toFixed(2);
                  return {
                    value: String(order.id),
                    label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency || ''} ${totalAmount})`,
                  };
                })}
                placeholder={orders.length === 0 ? 'No orders available' : 'Select an order...'}
              />
              {selectedOrder && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
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
            <div className='grid grid-cols-3 gap-4'>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Warehouse *
                </label>
                <CustomDropdown
                  value={warehouseId}
                  onChange={setWarehouseId}
                  options={warehouses.map((warehouse) => ({
                    value: warehouse.id.toString(),
                    label: warehouse.name,
                  }))}
                  placeholder="Select warehouse..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <CustomDropdown
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'ASSIGNED', label: 'Assigned' },
                    { value: 'IN_PROGRESS', label: 'In Progress' },
                    { value: 'COMPLETED', label: 'Completed' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ]}
                  placeholder="Select status..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned To
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Enter assigned personnel name or ID"
                  className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter any additional notes..."
                className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Pack Slip Modal Component
function EditPackSlipModal({
  packSlipId,
  warehouses,
  orders,
  pickLists,
  onClose,
  onUpdate,
}: {
  packSlipId: string;
  warehouses: Warehouse[];
  orders: Order[];
  pickLists: PickList[];
  onClose: () => void;
  onUpdate: (data: any) => void;
}) {
  const { data: packSlipData, isLoading } = useQuery({
    queryKey: ['pack-slip', packSlipId],
    queryFn: async () => {
      const response = await api.get(`/pack-slips/${packSlipId}`);
      return response.data;
    },
  });

  const [orderId, setOrderId] = useState<string>('');
  const [pickListId, setPickListId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [packedBy, setPackedBy] = useState('');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});

  const selectedOrder = useMemo(() => {
    if (orderId) {
      return orders.find((o) => o.id === Number(orderId));
    }
    if (!packSlipData?.orderId) return null;
    return orders.find((o) => o.id === packSlipData.orderId);
  }, [orders, orderId, packSlipData]);

  const selectedPickList = useMemo(() => {
    if (pickListId) {
      return pickLists.find((pl) => String(pl.id) === pickListId);
    }
    if (!packSlipData?.pickListId) return null;
    return pickLists.find((pl) => String(pl.id) === String(packSlipData.pickListId));
  }, [pickLists, pickListId, packSlipData]);

  // Get available items from order or pick list (same logic as Create modal)
  const availableItems = useMemo(() => {
    // Always prioritize showing items from the selected order
    if (selectedOrder && selectedOrder.orderLines && Array.isArray(selectedOrder.orderLines)) {
      return selectedOrder.orderLines;
    }
    // Fallback: if no order but pick list is selected, use pick list items
    if (selectedPickList && selectedPickList.items && selectedPickList.items.length > 0) {
      return selectedPickList.items;
    }
    return [];
  }, [selectedOrder, selectedPickList]);

  useEffect(() => {
    if (packSlipData) {
      setOrderId(packSlipData.orderId?.toString() || '');
      setPickListId(packSlipData.pickListId?.toString() || '');
      setStatus(packSlipData.status || 'DRAFT');
      setWarehouseId(packSlipData.warehouseId?.toString() || '');
      setPackedBy(packSlipData.packedBy || '');
      setWeight(packSlipData.weight?.toString() || '');
      setNotes(packSlipData.notes || '');
      // Initialize selectedItems from pack slip items
      // Always use orderLineId to match with order lines being displayed
      if (packSlipData.items && Array.isArray(packSlipData.items)) {
        const itemsMap: Record<number, number> = {};
        packSlipData.items.forEach((item: any) => {
          // Always use orderLineId since we're displaying order lines
          const itemId = item.orderLineId;
          if (itemId) {
            itemsMap[itemId] = item.quantity;
          }
        });
        setSelectedItems(itemsMap);
      }
    }
  }, [packSlipData]);

  // Reset selectedItems when order changes (if user manually changes them)
  useEffect(() => {
    if (orderId) {
      // If orderId changed from initial value, reset items and pick list
      if (!packSlipData || orderId !== packSlipData.orderId?.toString()) {
        setSelectedItems({});
        setPickListId(''); // Reset pick list if order changes
      }
    }
  }, [orderId, packSlipData]);

  // Reset selectedItems when pickList changes (if user manually changes them)
  useEffect(() => {
    if (pickListId) {
      // If pickListId changed from initial value, reset items
      if (!packSlipData || pickListId !== packSlipData.pickListId?.toString()) {
        setSelectedItems({});
      }
    }
  }, [pickListId, packSlipData]);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

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

    if (!orderId || !warehouseId) {
      toast.error('Please select an order and warehouse');
      return;
    }

    if (Object.keys(selectedItems).length === 0) {
      toast.error('Please select at least one item to pack');
      return;
    }

    let packSlipItems: Array<{ orderLineId: number; productId: number; quantity: number; packedQty?: number; notes?: string }> = [];

    // Since we're always showing order lines, selectedItems keys are orderLineIds
    if (selectedOrder && selectedOrder.orderLines) {
      packSlipItems = Object.entries(selectedItems)
        .map(([orderLineIdStr, quantity]) => {
          const orderLineId = Number(orderLineIdStr);
          const orderLine = selectedOrder.orderLines?.find((l) => l.id === orderLineId);
          
          if (!orderLine || !orderLine.id || !orderLine.productId) {
            console.warn('Invalid order line found:', { orderLineId, orderLine });
            return null;
          }
          
          return {
            orderLineId: orderLine.id,
            productId: orderLine.productId,
            quantity,
            packedQty: 0,
          };
        })
        .filter((item): item is { orderLineId: number; productId: number; quantity: number; packedQty: number } => item !== null);
    }

    if (packSlipItems.length === 0) {
      toast.error('Please select at least one valid item to pack');
      return;
    }

    const updateData: any = {
      status,
    };

    // Only include orderId if it's different from the original
    if (orderId && packSlipData && Number(orderId) !== packSlipData.orderId) {
      updateData.orderId = Number(orderId);
    }

    // Only include warehouseId if it's different from the original
    if (warehouseId && packSlipData && Number(warehouseId) !== packSlipData.warehouseId) {
      updateData.warehouseId = Number(warehouseId);
    }

    // Only include pickListId if it's different from the original
    const currentPickListId = packSlipData?.pickListId?.toString() || '';
    if (pickListId !== currentPickListId) {
      if (pickListId && pickListId.trim() !== '') {
        updateData.pickListId = String(pickListId);
      } else {
        updateData.pickListId = null;
      }
    }

    if (packedBy !== (packSlipData?.packedBy || '')) {
      if (packedBy && packedBy.trim() !== '') {
        updateData.packedBy = packedBy;
      } else {
        updateData.packedBy = null;
      }
    }

    const currentWeight = packSlipData?.weight?.toString() || '';
    if (weight !== currentWeight) {
      if (weight && weight.trim() !== '') {
        updateData.weight = parseFloat(weight);
      } else {
        updateData.weight = null;
      }
    }

    if (notes !== (packSlipData?.notes || '')) {
      if (notes && notes.trim() !== '') {
        updateData.notes = notes;
      } else {
        updateData.notes = null;
      }
    }

    // Always include items if there are any selected items
    if (packSlipItems.length > 0) {
      updateData.items = packSlipItems;
    }

    onUpdate(updateData);
  };

  if (isLoading || !packSlipData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading pack slip...</span>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="sticky top-0 bg-white z-[50] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Pack Slip: {packSlipData.packSlipNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedOrder?.customer?.name || packSlipData.order?.customer?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Created At</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {packSlipData.createdAt ? new Date(packSlipData.createdAt).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          {/* Order Items - Show all items from order/pick list */}
          {selectedOrder && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Items to Pack *
              </label>
              {availableItems.length > 0 ? (
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
                                    let maxQty = 0;
                                    if (selectedPickList) {
                                      maxQty = (item as PickListItem).pickedQuantity || (item as PickListItem).quantity || 0;
                                    } else {
                                      const orderLine = item as OrderLine;
                                      maxQty = orderLine.quantity - (orderLine.fulfilledQty || 0);
                                    }
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
                          // Since we're always showing order lines, use the order line's id
                          const orderLine = item as OrderLine;
                          const itemId = orderLine.id;
                          let maxQty = 0;
                          if (selectedPickList) {
                            // For pick list items, use pickedQuantity if available, otherwise use quantity
                            maxQty = (item as PickListItem).pickedQuantity || (item as PickListItem).quantity || 0;
                          } else {
                            // For order lines, use remaining quantity (ordered - fulfilled)
                            const orderLine = item as OrderLine;
                            maxQty = orderLine.quantity - (orderLine.fulfilledQty || 0);
                          }
                          const isSelected = !!selectedItems[itemId];
                          const packQty = selectedItems[itemId] || 0;
                          // Get product name - check product object first, then fallback to productName
                          let productName = '';
                          let sku = '';
                          if (selectedPickList) {
                            const pickListItem = item as any;
                            productName = pickListItem.product?.name || pickListItem.productName || '';
                            sku = pickListItem.product?.sku || pickListItem.sku || '';
                          } else {
                            const orderLine = item as OrderLine;
                            productName = orderLine.product?.name || '';
                            sku = orderLine.product?.sku || '';
                          }

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
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    {selectedPickList 
                      ? 'This pick list has no items.' 
                      : 'This order has no items.'}
                  </p>
          </div>
              )}
              {Object.keys(selectedItems).length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {Object.keys(selectedItems).length} item(s) selected
                </p>
              )}
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            {/* Order Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Order *
              </label>
              <CustomDropdown
                value={orderId}
                onChange={setOrderId}
                options={
                  orders.length === 0
                    ? []
                    : orders.map((order) => ({
                        value: order.id.toString(),
                        label: `${order.orderNumber} - ${order.customer?.name || 'Unknown'} (${order.currency || ''} ${typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : parseFloat(String(order.totalAmount || '0')).toFixed(2)})`,
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
                value={pickListId}
                onChange={setPickListId}
                options={pickLists
                  .filter((pl) => pl.orderId === Number(orderId) || !orderId)
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
                value={warehouseId}
                onChange={setWarehouseId}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <CustomDropdown
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PACKING', label: 'Packing' },
                  { value: 'PACKED', label: 'Packed' },
                  { value: 'SHIPPED', label: 'Shipped' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
                placeholder="Select status..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Packed By
              </label>
                <input
                  type="text"
                value={packedBy}
                onChange={(e) => setPackedBy(e.target.value)}
                placeholder="Enter personnel name or ID who packed the items"
                className="w-full px-3 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                placeholder="Enter weight in kg"
                className="w-full px-3 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter any additional notes..."
                className="w-full px-3 py-2 border border-gray-300 ::placeholder-[12px] text-[14px] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Shipping Label Modal Component
function EditShippingLabelModal({
  shippingLabelId,
  orders,
  onClose,
  onUpdate,
}: {
  shippingLabelId: string;
  orders: Order[];
  onClose: () => void;
  onUpdate: (data: any) => void;
}) {
  const { data: labelData, isLoading } = useQuery({
    queryKey: ['shipping-label', shippingLabelId],
    queryFn: async () => {
      const response = await api.get(`/shipping-labels/${shippingLabelId}`);
      return response.data;
    },
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [carrier, setCarrier] = useState<'FEDEX' | 'UPS' | 'DHL' | 'USPS' | 'OTHER'>('FEDEX');
  const [serviceType, setServiceType] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [weight, setWeight] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [notes, setNotes] = useState('');

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === Number(selectedOrderId));
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (labelData) {
      setSelectedOrderId(labelData.orderId?.toString() || '');
      setStatus(labelData.status || 'PENDING');
      setCarrier(labelData.carrier || 'FEDEX');
      setServiceType(labelData.serviceType || '');
      setTrackingNumber(labelData.trackingNumber || '');
      setWeight(labelData.weight?.toString() || '');
      // Parse dimensions if they exist (format: "LxWxH")
      if (labelData.dimensions) {
        const dims = labelData.dimensions.split('x');
        if (dims.length === 3) {
          setLength(dims[0].trim());
          setWidth(dims[1].trim());
          setHeight(dims[2].trim());
        }
      }
      setNotes(labelData.notes || '');
    }
  }, [labelData]);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    const dimensions = length || width || height
      ? `${length || 0}x${width || 0}x${height || 0}`
      : undefined;

    const updateData: any = {
      orderId: Number(selectedOrderId),
      status,
      carrier,
    };

    if (serviceType && serviceType.trim() !== '') {
      updateData.serviceType = serviceType;
    }

    if (trackingNumber && trackingNumber.trim() !== '') {
      updateData.trackingNumber = trackingNumber;
    }

    if (weight && weight.trim() !== '') {
      updateData.weight = parseFloat(weight);
    }

    if (dimensions) {
      updateData.dimensions = dimensions;
    }

    if (notes && notes.trim() !== '') {
      updateData.notes = notes;
    }

    onUpdate(updateData);
  };

  if (isLoading || !labelData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading shipping label...</span>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="sticky top-0 bg-white z-[50] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Shipping Label: {labelData.labelNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedOrder?.customer?.name || labelData.order?.customer?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created At</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {labelData.createdAt ? new Date(labelData.createdAt).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order *
              </label>
              <CustomDropdown
                value={selectedOrderId}
                onChange={setSelectedOrderId}
                options={orders.map((order) => ({
                  value: order.id.toString(),
                  label: `${order.orderNumber} - ${order.customer?.name || 'Unknown Customer'} ($${typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : parseFloat(String(order.totalAmount || 0)).toFixed(2)})`,
                }))}
                placeholder={orders.length === 0 ? 'No orders available' : 'Select an order...'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <CustomDropdown
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'PRINTED', label: 'Printed' },
                  { value: 'SHIPPED', label: 'Shipped' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
                placeholder="Select status..."
              />
            </div>
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
                placeholder="Enter service type (e.g., Ground, Express)"
                className="w-full px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tracking Number
              </label>
                <input
                  type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            <div className="grid grid-cols-2 gap-4">
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
                  placeholder="Enter weight"
                  className="w-full px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dimensions (L x W x H in cm)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="Length"
                  className="px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Width"
                  className="px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Height"
                  className="px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter any additional notes..."
                className="w-full px-3 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
              />
          </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                Update
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
