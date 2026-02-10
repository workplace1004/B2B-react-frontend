import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { DeleteModal } from '../components/ui';
import api from '../lib/api';
import {
  Globe,
  Store,
  ArrowLeftRight,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Clock,
  Eye,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput, DatePicker, OperatingHoursPicker, type OperatingHours } from '../components/ui';

// Types
interface BOPISOrder {
  id?: string | number;
  orderId: number;
  orderNumber: string;
  customerId: number;
  customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  storeId: number;
  storeName?: string;
  storeAddress?: string;
  storeCity?: string;
  status: 'PENDING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'CANCELLED' | 'EXPIRED';
  items: BOPISOrderItem[];
  orderDate: string;
  readyForPickupDate?: string;
  pickedUpDate?: string;
  expiryDate?: string;
  pickupInstructions?: string;
  customerNotes?: string;
  totalAmount: number;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BOPISOrderItem {
  id?: string | number;
  orderLineId: number;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  color?: string;
  isReady: boolean;
  readyAt?: string;
}

interface BORISReturn {
  id?: string | number;
  returnId: number;
  returnNumber: string;
  orderId: number;
  orderNumber?: string;
  customerId: number;
  customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  storeId: number;
  storeName?: string;
  storeAddress?: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'PROCESSED' | 'REJECTED' | 'CANCELLED';
  items: BORISReturnItem[];
  returnDate: string;
  receivedDate?: string;
  processedDate?: string;
  reason: string;
  refundAmount: number;
  currency: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BORISReturnItem {
  id?: string | number;
  orderLineId: number;
  productId: number;
  productName?: string;
  sku?: string;
  quantity: number;
  condition: 'NEW' | 'USED' | 'DAMAGED' | 'DEFECTIVE';
  refundAmount: number;
  notes?: string;
}

interface EndlessAisleProduct {
  id?: string | number;
  productId: number;
  productName: string;
  sku: string;
  description?: string;
  basePrice: number;
  currency: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  availableAtWarehouses: EndlessAisleWarehouse[];
  estimatedShippingDays: number;
  isAvailable: boolean;
  category?: string;
  collection?: string;
  createdAt?: string;
}

interface EndlessAisleWarehouse {
  warehouseId: number;
  warehouseName: string;
  warehouseCity?: string;
  warehouseCountry?: string;
  availableQuantity: number;
  estimatedShippingDays: number;
}

interface Store {
  id: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  operatingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

interface Warehouse {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
}


export default function Omnichannel() {
  const [activeTab, setActiveTab] = useState<'bopis' | 'boris' | 'endless-aisle' | 'stores'>('bopis');
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [isDeleteStoreModalOpen, setIsDeleteStoreModalOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // BOPIS Orders modal states
  const [isBOPISModalOpen, setIsBOPISModalOpen] = useState(false);
  const [selectedBOPISOrder, setSelectedBOPISOrder] = useState<BOPISOrder | null>(null);
  const [isBOPISViewModalOpen, setIsBOPISViewModalOpen] = useState(false);
  const [bopisOrderToView, setBopisOrderToView] = useState<BOPISOrder | null>(null);
  const [isBOPISDeleteModalOpen, setIsBOPISDeleteModalOpen] = useState(false);
  const [bopisOrderToDelete, setBopisOrderToDelete] = useState<BOPISOrder | null>(null);

  // BORIS Returns modal states
  const [isBORISModalOpen, setIsBORISModalOpen] = useState(false);
  const [selectedBORISReturn, setSelectedBORISReturn] = useState<BORISReturn | null>(null);
  const [isBORISViewModalOpen, setIsBORISViewModalOpen] = useState(false);
  const [borisReturnToView, setBorisReturnToView] = useState<BORISReturn | null>(null);
  const [isBORISDeleteModalOpen, setIsBORISDeleteModalOpen] = useState(false);
  const [borisReturnToDelete, setBorisReturnToDelete] = useState<BORISReturn | null>(null);

  // Endless Aisle Products modal states
  const [isEndlessAisleModalOpen, setIsEndlessAisleModalOpen] = useState(false);
  const [selectedEndlessAisleProduct, setSelectedEndlessAisleProduct] = useState<EndlessAisleProduct | null>(null);
  const [isEndlessAisleViewModalOpen, setIsEndlessAisleViewModalOpen] = useState(false);
  const [endlessAisleProductToView, setEndlessAisleProductToView] = useState<EndlessAisleProduct | null>(null);
  const [isEndlessAisleDeleteModalOpen, setIsEndlessAisleDeleteModalOpen] = useState(false);
  const [endlessAisleProductToDelete, setEndlessAisleProductToDelete] = useState<EndlessAisleProduct | null>(null);

  const queryClient = useQueryClient();

  // Fetch orders (for future use when creating BOPIS/BORIS orders)
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data;
      } catch (error) {
        console.error('Error fetching orders:', error);
        return { data: [] };
      }
    },
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },
  });

  const customers = useMemo(() => {
    return Array.isArray(customersData) ? customersData : [];
  }, [customersData]);

  // Fetch warehouses (used as stores for BOPIS/BORIS)
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

  // Fetch products for endless aisle
  const { data: productsData } = useQuery({
    queryKey: ['products', 'endless-aisle'],
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

  // Fetch inventory for endless aisle (if needed in the future)
  // const { data: inventoryData } = useQuery({
  //   queryKey: ['inventory', 'endless-aisle'],
  //   queryFn: async () => {
  //     try {
  //       const response = await api.get('/inventory?skip=0&take=10000');
  //       return response.data?.data || [];
  //     } catch (error) {
  //       console.error('Error fetching inventory:', error);
  //       return [];
  //     }
  //   },
  // });

  const warehouses: Warehouse[] = useMemo(() => {
    return Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data || []);
  }, [warehousesData]);

  // Fetch stores from API
  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      try {
        const response = await api.get('/stores?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    },
  });

  const stores: Store[] = useMemo(() => {
    return Array.isArray(storesData) ? storesData : [];
  }, [storesData]);

  // Fetch BOPIS orders from API
  const { data: bopisOrdersData } = useQuery({
    queryKey: ['bopis-orders', statusFilter, storeFilter, searchQuery],
    queryFn: async () => {
      try {
        const params: any = { skip: 0, take: 10000 };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (storeFilter !== 'all') params.storeId = storeFilter;
        if (searchQuery) params.search = searchQuery;
        const response = await api.get('/bopis-orders', { params });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching BOPIS orders:', error);
        return [];
      }
    },
  });

  const bopisOrders: BOPISOrder[] = useMemo(() => {
    return Array.isArray(bopisOrdersData) ? bopisOrdersData : [];
  }, [bopisOrdersData]);

  // Fetch BORIS returns from API
  const { data: borisReturnsData } = useQuery({
    queryKey: ['boris-returns', statusFilter, storeFilter, searchQuery],
    queryFn: async () => {
      try {
        const params: any = { skip: 0, take: 10000 };
        if (statusFilter !== 'all') params.status = statusFilter;
        if (storeFilter !== 'all') params.storeId = storeFilter;
        if (searchQuery) params.search = searchQuery;
        const response = await api.get('/boris-returns', { params });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching BORIS returns:', error);
        return [];
      }
    },
  });

  const borisReturns: BORISReturn[] = useMemo(() => {
    return Array.isArray(borisReturnsData) ? borisReturnsData : [];
  }, [borisReturnsData]);

  // Fetch endless aisle products from API
  const { data: endlessAisleProductsData } = useQuery({
    queryKey: ['endless-aisle-products', searchQuery],
    queryFn: async () => {
      try {
        const params: any = { skip: 0, take: 10000 };
        if (searchQuery) params.search = searchQuery;
        const response = await api.get('/endless-aisle-products', { params });
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching endless aisle products:', error);
        return [];
      }
    },
  });

  const endlessAisleProducts: EndlessAisleProduct[] = useMemo(() => {
    if (!endlessAisleProductsData) return [];
    const products = Array.isArray(endlessAisleProductsData) ? endlessAisleProductsData : [];
    // Transform API data to match frontend interface
    return products.map((p: any) => ({
      id: p.id,
      productId: p.productId,
      productName: p.product?.name || '',
      sku: p.product?.sku || '',
      description: p.product?.description,
      basePrice: parseFloat(p.basePrice || p.product?.basePrice || 0),
      currency: p.currency || 'USD',
      images: p.product?.images || [],
      sizes: p.product?.sizes || [],
      colors: p.product?.colors || [],
      availableAtWarehouses: (p.availableAtWarehouses || []).map((w: any) => ({
        warehouseId: w.warehouseId,
        warehouseName: w.warehouse?.name || 'Unknown',
        warehouseCity: w.warehouse?.city,
        warehouseCountry: w.warehouse?.country,
        availableQuantity: w.availableQuantity || 0,
        estimatedShippingDays: w.estimatedShippingDays || 3,
      })),
      estimatedShippingDays: p.estimatedShippingDays || 3,
      isAvailable: p.isAvailable !== false,
      category: p.category,
      collection: p.collection,
      createdAt: p.createdAt,
    }));
  }, [endlessAisleProductsData]);

  // Store mutations
  const createStoreMutation = useMutation({
    mutationFn: async (data: Partial<Store>) => {
      const response = await api.post('/stores', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Store created successfully');
      setIsStoreModalOpen(false);
      setSelectedStore(null);
      setIsEditingStore(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create store');
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Store> }) => {
      const response = await api.patch(`/stores/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Store updated successfully');
      setIsStoreModalOpen(false);
      setSelectedStore(null);
      setIsEditingStore(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update store');
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/stores/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Store deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete store');
    },
  });

  const handleStoreSubmit = (_storeId?: number, storeData?: Partial<Store>) => {
    if (isEditingStore && selectedStore && storeData) {
      updateStoreMutation.mutate({ id: selectedStore.id, data: storeData });
    } else if (storeData) {
      createStoreMutation.mutate(storeData);
    }
  };


  const handleEditStore = (store: Store) => {
    setSelectedStore(store);
    setIsEditingStore(true);
    setIsStoreModalOpen(true);
  };

  const handleAddStore = () => {
    setSelectedStore(null);
    setIsEditingStore(false);
    setIsStoreModalOpen(true);
  };

  const handleDeleteStoreClick = (store: Store) => {
    setStoreToDelete(store);
    setIsDeleteStoreModalOpen(true);
  };

  const handleDeleteStoreConfirm = () => {
    if (storeToDelete?.id) {
      deleteStoreMutation.mutate(storeToDelete.id, {
        onSuccess: () => {
          setIsDeleteStoreModalOpen(false);
          setStoreToDelete(null);
        },
      });
    }
  };

  // BOPIS Order mutations
  const createBOPISOrderMutation = useMutation({
    mutationFn: async (data: Partial<BOPISOrder>) => {
      const response = await api.post('/bopis-orders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bopis-orders'] });
      toast.success('BOPIS order created successfully');
      setIsBOPISModalOpen(false);
      setSelectedBOPISOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create BOPIS order');
    },
  });

  const updateBOPISOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BOPISOrder> }) => {
      const response = await api.patch(`/bopis-orders/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bopis-orders'] });
      toast.success('BOPIS order updated successfully');
      setIsBOPISModalOpen(false);
      setSelectedBOPISOrder(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update BOPIS order');
    },
  });

  const deleteBOPISOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/bopis-orders/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bopis-orders'] });
      toast.success('BOPIS order deleted successfully');
      setIsBOPISDeleteModalOpen(false);
      setBopisOrderToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete BOPIS order');
    },
  });

  // BORIS Return mutations
  const createBORISReturnMutation = useMutation({
    mutationFn: async (data: Partial<BORISReturn>) => {
      const response = await api.post('/boris-returns', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boris-returns'] });
      toast.success('BORIS return created successfully');
      setIsBORISModalOpen(false);
      setSelectedBORISReturn(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create BORIS return');
    },
  });

  const updateBORISReturnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BORISReturn> }) => {
      const response = await api.patch(`/boris-returns/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boris-returns'] });
      toast.success('BORIS return updated successfully');
      setIsBORISModalOpen(false);
      setSelectedBORISReturn(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update BORIS return');
    },
  });

  const deleteBORISReturnMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/boris-returns/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boris-returns'] });
      toast.success('BORIS return deleted successfully');
      setIsBORISDeleteModalOpen(false);
      setBorisReturnToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete BORIS return');
    },
  });

  // Endless Aisle Product mutations
  const createEndlessAisleProductMutation = useMutation({
    mutationFn: async (data: Partial<EndlessAisleProduct>) => {
      const response = await api.post('/endless-aisle-products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endless-aisle-products'] });
      toast.success('Endless aisle product created successfully');
      setIsEndlessAisleModalOpen(false);
      setSelectedEndlessAisleProduct(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create endless aisle product');
    },
  });

  const updateEndlessAisleProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EndlessAisleProduct> }) => {
      const response = await api.patch(`/endless-aisle-products/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endless-aisle-products'] });
      toast.success('Endless aisle product updated successfully');
      setIsEndlessAisleModalOpen(false);
      setSelectedEndlessAisleProduct(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update endless aisle product');
    },
  });

  const deleteEndlessAisleProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/endless-aisle-products/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endless-aisle-products'] });
      toast.success('Endless aisle product deleted successfully');
      setIsEndlessAisleDeleteModalOpen(false);
      setEndlessAisleProductToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete endless aisle product');
    },
  });

  // Filter BOPIS orders (API already filters, but we sort client-side)
  const filteredBopisOrders = useMemo(() => {
    return [...bopisOrders].sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [bopisOrders]);

  // Filter BORIS returns (API already filters, but we sort client-side)
  const filteredBorisReturns = useMemo(() => {
    return [...borisReturns].sort((a, b) => {
      const dateA = a.returnDate ? new Date(a.returnDate).getTime() : 0;
      const dateB = b.returnDate ? new Date(b.returnDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [borisReturns]);

  // Filter endless aisle products
  const filteredEndlessAisleProducts = useMemo(() => {
    let filtered = endlessAisleProducts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.productName.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query) ||
          product.collection?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const nameA = a.productName.toLowerCase();
      const nameB = b.productName.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [endlessAisleProducts, searchQuery]);


  if (isLoadingOrders) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Omnichannel" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Omnichannel</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage BOPIS, BORIS, and Endless Aisle operations
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">BOPIS Orders</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {bopisOrders.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Ready for Pickup</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {bopisOrders.filter((o) => o.status === 'READY_FOR_PICKUP').length}
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
              <p className="text-xs text-gray-600 dark:text-gray-400">BORIS Returns</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {borisReturns.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Endless Aisle Products</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {endlessAisleProducts.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
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
                setActiveTab('bopis');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bopis'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                BOPIS Orders
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('boris');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'boris'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                BORIS Returns
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('endless-aisle');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'endless-aisle'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Endless Aisle
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('stores');
                setCurrentPage(1);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'stores'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                Stores
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* BOPIS Orders Tab */}
          {activeTab === 'bopis' && (
            <>
              {/* Search and Filters */}
              <div className="flex justify-between gap-4 mb-6">
                <div className="flex items-center gap-4 w-full">
                  <SearchInput
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search BOPIS orders..."
                    className="md:col-span-2"
                  />
                  <CustomDropdown
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
                      { value: 'PICKED_UP', label: 'Picked Up' },
                      { value: 'CANCELLED', label: 'Cancelled' },
                      { value: 'EXPIRED', label: 'Expired' },
                    ]}
                  />
                  <CustomDropdown
                    value={storeFilter}
                    onChange={(value) => {
                      setStoreFilter(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Stores' },
                      ...stores.map((s) => ({ value: s.id.toString(), label: s.name })),
                    ]}
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedBOPISOrder(null);
                    setIsBOPISModalOpen(true);
                  }}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create&nbsp;BOPIS&nbsp;Order
                </button>
              </div>

              {/* BOPIS Orders Table */}
              {filteredBopisOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery || statusFilter !== 'all' || storeFilter !== 'all'
                      ? 'No matching BOPIS orders found'
                      : 'No BOPIS orders found'}
                  </p>
                </div>
              ) : (
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
                          Store
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Items
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Order Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredBopisOrders
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((order) => {
                          const store = stores.find((s) => s.id === order.storeId);
                          const itemsCount = order.items?.length || 0;
                          const readyItems = order.items?.filter((i) => i.isReady).length || 0;

                          return (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {order.orderNumber}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {order.customer?.name || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {store?.name || order.storeName || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {readyItems} / {itemsCount} ready
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'READY_FOR_PICKUP'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : order.status === 'PICKED_UP'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                      : order.status === 'PENDING'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        : order.status === 'CANCELLED' || order.status === 'EXPIRED'
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                  {order.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setBopisOrderToView(order);
                                        setIsBOPISViewModalOpen(true);
                                      }}
                                      className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedBOPISOrder(order);
                                        setIsBOPISModalOpen(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setBopisOrderToDelete(order);
                                        setIsBOPISDeleteModalOpen(true);
                                      }}
                                      className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {Math.ceil(filteredBopisOrders.length / itemsPerPage) > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredBopisOrders.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredBopisOrders.length}</span> orders
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
                      Page {currentPage} of {Math.ceil(filteredBopisOrders.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(Math.ceil(filteredBopisOrders.length / itemsPerPage), prev + 1))
                      }
                      disabled={currentPage >= Math.ceil(filteredBopisOrders.length / itemsPerPage)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(filteredBopisOrders.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredBopisOrders.length / itemsPerPage)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* BORIS Returns Tab */}
          {activeTab === 'boris' && (
            <>
              {/* Search and Filters */}
              <div className="flex gap-4 mb-6 w-full justify-between">
                <div className="flex items-center gap-4 w-full">
                  <SearchInput
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search BORIS returns..."
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
                        { value: 'PROCESSED', label: 'Processed' },
                        { value: 'REJECTED', label: 'Rejected' },
                        { value: 'CANCELLED', label: 'Cancelled' },
                      ]}
                    />
                  </div>
                  <div>
                    <CustomDropdown
                      value={storeFilter}
                      onChange={(value) => {
                        setStoreFilter(value);
                        setCurrentPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'All Stores' },
                        ...stores.map((s) => ({ value: s.id.toString(), label: s.name })),
                      ]}
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedBORISReturn(null);
                    setIsBORISModalOpen(true);
                  }}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create&nbsp;BORI&nbsp;Return
                </button>
              </div>

              {/* BORIS Returns Table */}
              {filteredBorisReturns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ArrowLeftRight className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery || statusFilter !== 'all' || storeFilter !== 'all'
                      ? 'No matching BORIS returns found'
                      : 'No BORIS returns found'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Return #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Order #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Store
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Items
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Refund Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Return Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredBorisReturns
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((returnItem) => {
                          const store = stores.find((s) => s.id === returnItem.storeId);
                          const itemsCount = returnItem.items?.length || 0;

                          return (
                            <tr key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {returnItem.returnNumber}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {returnItem.orderNumber || `Order #${returnItem.orderId}`}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {returnItem.customer?.name || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {returnItem.storeName || store?.name || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {returnItem.currency} {returnItem.refundAmount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${returnItem.status === 'PROCESSED'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : returnItem.status === 'RECEIVED'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                      : returnItem.status === 'IN_TRANSIT'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        : returnItem.status === 'PENDING'
                                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                          : returnItem.status === 'REJECTED' || returnItem.status === 'CANCELLED'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                  {returnItem.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {returnItem.returnDate ? new Date(returnItem.returnDate).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setBorisReturnToView(returnItem);
                                      setIsBORISViewModalOpen(true);
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedBORISReturn(returnItem);
                                      setIsBORISModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setBorisReturnToDelete(returnItem);
                                      setIsBORISDeleteModalOpen(true);
                                    }}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {Math.ceil(filteredBorisReturns.length / itemsPerPage) > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredBorisReturns.length)}
                    </span>{' '}
                    of <span className="font-medium">{filteredBorisReturns.length}</span> returns
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
                      Page {currentPage} of {Math.ceil(filteredBorisReturns.length / itemsPerPage)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(Math.ceil(filteredBorisReturns.length / itemsPerPage), prev + 1))
                      }
                      disabled={currentPage >= Math.ceil(filteredBorisReturns.length / itemsPerPage)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 -rotate-90" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(filteredBorisReturns.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredBorisReturns.length / itemsPerPage)}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Endless Aisle Tab */}
          {activeTab === 'endless-aisle' && (
            <>
              {/* Header with Create Button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1 max-w-md">
                  <SearchInput
                    value={searchQuery}
                    onChange={(value) => {
                      setSearchQuery(value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search endless aisle products..."
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedEndlessAisleProduct(null);
                    setIsEndlessAisleModalOpen(true);
                  }}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>

              {/* Endless Aisle Products Grid */}
              {filteredEndlessAisleProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Globe className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery ? 'No matching products found' : 'No endless aisle products found'}
                  </p>
                  {!searchQuery && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Products available for order from warehouses will appear here
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredEndlessAisleProducts
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((product) => (
                        <div
                          key={product.id}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                        >
                          {/* Product Image */}
                          <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Store className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="p-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                              {product.productName}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">SKU: {product.sku}</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                              {product.currency} {product.basePrice.toFixed(2)}
                            </p>

                            {/* Available Warehouses */}
                            <div className="mb-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                Available at {product.availableAtWarehouses.length} warehouse
                                {product.availableAtWarehouses.length !== 1 ? 's' : ''}:
                              </p>
                              <div className="space-y-1">
                                {product.availableAtWarehouses.slice(0, 2).map((warehouse, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {warehouse.warehouseName}
                                      {warehouse.warehouseCity && `, ${warehouse.warehouseCity}`}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {warehouse.availableQuantity} units
                                    </span>
                                  </div>
                                ))}
                                {product.availableAtWarehouses.length > 2 && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    +{product.availableAtWarehouses.length - 2} more
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Shipping Info */}
                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-3">
                              <span>Est. shipping: {product.estimatedShippingDays} days</span>
                              <span
                                className={`px-2 py-1 rounded-full ${product.isAvailable
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                  }`}
                              >
                                {product.isAvailable ? 'Available' : 'Unavailable'}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEndlessAisleProductToView(product);
                                  setIsEndlessAisleViewModalOpen(true);
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-600 dark:border-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedEndlessAisleProduct(product);
                                  setIsEndlessAisleModalOpen(true);
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setEndlessAisleProductToDelete(product);
                                  setIsEndlessAisleDeleteModalOpen(true);
                                }}
                                className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Pagination */}
                  {Math.ceil(filteredEndlessAisleProducts.length / itemsPerPage) > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, filteredEndlessAisleProducts.length)}
                        </span>{' '}
                        of <span className="font-medium">{filteredEndlessAisleProducts.length}</span> products
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
                          Page {currentPage} of {Math.ceil(filteredEndlessAisleProducts.length / itemsPerPage)}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(Math.ceil(filteredEndlessAisleProducts.length / itemsPerPage), prev + 1)
                            )
                          }
                          disabled={currentPage >= Math.ceil(filteredEndlessAisleProducts.length / itemsPerPage)}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="w-4 h-4 -rotate-90" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.ceil(filteredEndlessAisleProducts.length / itemsPerPage))}
                          disabled={currentPage >= Math.ceil(filteredEndlessAisleProducts.length / itemsPerPage)}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronsRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Stores Tab */}
          {activeTab === 'stores' && (
            <>
              {/* Header with Create Button */}
              <div className="flex items-center justify-between mb-6">
                {/* Search */}
                <SearchInput
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search stores..."
                />

                <button
                  onClick={handleAddStore}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Store
                </button>
              </div>



              {/* Stores Grid */}
              {stores.filter((s) =>
                searchQuery
                  ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              ).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Store className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery ? 'No matching stores found' : 'No stores found'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stores
                      .filter((s) =>
                        searchQuery
                          ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      )
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((store) => (
                        <div
                          key={store.id}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                                <Store className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {store.name}
                                </h3>
                                {store.code && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Code: {store.code}</p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${store.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                }`}
                            >
                              {store.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            {store.address && (
                              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>
                                  {store.address}
                                  {store.city && `, ${store.city}`}
                                  {store.postalCode && ` ${store.postalCode}`}
                                  {store.country && `, ${store.country}`}
                                </span>
                              </div>
                            )}
                            {store.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span>{store.phone}</span>
                              </div>
                            )}
                            {store.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span>{store.email}</span>
                              </div>
                            )}
                          </div>

                          {store.operatingHours && (
                            <div className="mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Operating Hours:
                              </p>
                              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                {store.operatingHours.monday && (
                                  <div>Mon: {store.operatingHours.monday}</div>
                                )}
                                {store.operatingHours.tuesday && (
                                  <div>Tue: {store.operatingHours.tuesday}</div>
                                )}
                                {store.operatingHours.wednesday && (
                                  <div>Wed: {store.operatingHours.wednesday}</div>
                                )}
                                {store.operatingHours.thursday && (
                                  <div>Thu: {store.operatingHours.thursday}</div>
                                )}
                                {store.operatingHours.friday && (
                                  <div>Fri: {store.operatingHours.friday}</div>
                                )}
                                {store.operatingHours.saturday && (
                                  <div>Sat: {store.operatingHours.saturday}</div>
                                )}
                                {store.operatingHours.sunday && (
                                  <div>Sun: {store.operatingHours.sunday}</div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => handleEditStore(store)}
                              className="flex-1 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-primary-600 dark:border-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center justify-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStoreClick(store)}
                              className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Pagination */}
                  {Math.ceil(
                    stores.filter((s) =>
                      searchQuery
                        ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                        : true
                    ).length / itemsPerPage
                  ) > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          Showing{' '}
                          <span className="font-medium">
                            {(currentPage - 1) * itemsPerPage + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(
                              currentPage * itemsPerPage,
                              stores.filter((s) =>
                                searchQuery
                                  ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                                  : true
                              ).length
                            )}
                          </span>{' '}
                          of{' '}
                          <span className="font-medium">
                            {
                              stores.filter((s) =>
                                searchQuery
                                  ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                                  : true
                              ).length
                            }
                          </span>{' '}
                          stores
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
                            Page {currentPage} of{' '}
                            {Math.ceil(
                              stores.filter((s) =>
                                searchQuery
                                  ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                                  : true
                              ).length / itemsPerPage
                            )}
                          </span>
                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(
                                  Math.ceil(
                                    stores.filter((s) =>
                                      searchQuery
                                        ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                                        : true
                                    ).length / itemsPerPage
                                  ),
                                  prev + 1
                                )
                              )
                            }
                            disabled={
                              currentPage >=
                              Math.ceil(
                                stores.filter((s) =>
                                  searchQuery
                                    ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                                    : true
                                ).length / itemsPerPage
                              )
                            }
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronDown className="w-4 h-4 -rotate-90" />
                          </button>
                          <button
                            onClick={() =>
                              setCurrentPage(
                                Math.ceil(
                                  stores.filter((s) =>
                                    searchQuery
                                      ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                      s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                                      : true
                                  ).length / itemsPerPage
                                )
                              )
                            }
                            disabled={
                              currentPage >=
                              Math.ceil(
                                stores.filter((s) =>
                                  searchQuery
                                    ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    s.address?.toLowerCase().includes(searchQuery.toLowerCase())
                                    : true
                                ).length / itemsPerPage
                              )
                            }
                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronsRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Store Modal */}
      {isStoreModalOpen && (
        <StoreModal
          store={selectedStore}
          isEditing={isEditingStore}
          onClose={() => {
            setIsStoreModalOpen(false);
            setSelectedStore(null);
            setIsEditingStore(false);
          }}
          onSubmit={handleStoreSubmit}
        />
      )}

      {/* Delete Store Modal */}
      {isDeleteStoreModalOpen && storeToDelete && (
        <DeleteModal
          title="Delete Store"
          message="Are you sure you want to delete"
          itemName={storeToDelete.name}
          onClose={() => {
            setIsDeleteStoreModalOpen(false);
            setStoreToDelete(null);
          }}
          onConfirm={handleDeleteStoreConfirm}
          isLoading={deleteStoreMutation.isPending}
        />
      )}

      {/* Delete BOPIS Order Modal */}
      {isBOPISDeleteModalOpen && bopisOrderToDelete && (
        <DeleteModal
          title="Delete BOPIS Order"
          message="Are you sure you want to delete BOPIS Order"
          itemName={bopisOrderToDelete.orderNumber || ''}
          onClose={() => {
            setIsBOPISDeleteModalOpen(false);
            setBopisOrderToDelete(null);
          }}
          onConfirm={() => {
            if (bopisOrderToDelete?.id) {
              deleteBOPISOrderMutation.mutate(Number(bopisOrderToDelete.id));
            }
          }}
          isLoading={deleteBOPISOrderMutation.isPending}
        />
      )}

      {/* Delete BORIS Return Modal */}
      {isBORISDeleteModalOpen && borisReturnToDelete && (
        <DeleteModal
          title="Delete BORIS Return"
          message="Are you sure you want to delete BORIS Return"
          itemName={borisReturnToDelete.returnNumber || ''}
          onClose={() => {
            setIsBORISDeleteModalOpen(false);
            setBorisReturnToDelete(null);
          }}
          onConfirm={() => {
            if (borisReturnToDelete?.id) {
              deleteBORISReturnMutation.mutate(Number(borisReturnToDelete.id));
            }
          }}
          isLoading={deleteBORISReturnMutation.isPending}
        />
      )}

      {/* Delete Endless Aisle Product Modal */}
      {isEndlessAisleDeleteModalOpen && endlessAisleProductToDelete && (
        <DeleteModal
          title="Delete Endless Aisle Product"
          message="Are you sure you want to delete"
          itemName={endlessAisleProductToDelete.productName || ''}
          onClose={() => {
            setIsEndlessAisleDeleteModalOpen(false);
            setEndlessAisleProductToDelete(null);
          }}
          onConfirm={() => {
            if (endlessAisleProductToDelete?.id) {
              deleteEndlessAisleProductMutation.mutate(Number(endlessAisleProductToDelete.id));
            }
          }}
          isLoading={deleteEndlessAisleProductMutation.isPending}
        />
      )}

      {/* BOPIS Order Create/Edit Modal */}
      {isBOPISModalOpen && (
        <BOPISOrderModal
          order={selectedBOPISOrder}
          orders={ordersData?.data || []}
          customers={customers}
          stores={stores}
          onClose={() => {
            setIsBOPISModalOpen(false);
            setSelectedBOPISOrder(null);
          }}
          onSubmit={(data: Partial<BOPISOrder>) => {
            if (selectedBOPISOrder?.id) {
              updateBOPISOrderMutation.mutate({ id: Number(selectedBOPISOrder.id), data });
            } else {
              createBOPISOrderMutation.mutate(data);
            }
          }}
          isLoading={createBOPISOrderMutation.isPending || updateBOPISOrderMutation.isPending}
        />
      )}

      {/* BOPIS Order View Modal */}
      {isBOPISViewModalOpen && bopisOrderToView && (
        <BOPISOrderViewModal
          order={bopisOrderToView}
          onClose={() => {
            setIsBOPISViewModalOpen(false);
            setBopisOrderToView(null);
          }}
        />
      )}

      {/* BORIS Return Create/Edit Modal */}
      {isBORISModalOpen && (
        <BORISReturnModal
          returnItem={selectedBORISReturn}
          orders={ordersData?.data || []}
          customers={customers}
          stores={stores}
          onClose={() => {
            setIsBORISModalOpen(false);
            setSelectedBORISReturn(null);
          }}
          onSubmit={(data: Partial<BORISReturn>) => {
            if (selectedBORISReturn?.id) {
              updateBORISReturnMutation.mutate({ id: Number(selectedBORISReturn.id), data });
            } else {
              createBORISReturnMutation.mutate(data);
            }
          }}
          isLoading={createBORISReturnMutation.isPending || updateBORISReturnMutation.isPending}
        />
      )}

      {/* BORIS Return View Modal */}
      {isBORISViewModalOpen && borisReturnToView && (
        <BORISReturnViewModal
          returnItem={borisReturnToView}
          onClose={() => {
            setIsBORISViewModalOpen(false);
            setBorisReturnToView(null);
          }}
        />
      )}

      {/* Endless Aisle Product Create/Edit Modal */}
      {isEndlessAisleModalOpen && (
        <EndlessAisleProductModal
          product={selectedEndlessAisleProduct}
          products={productsData || []}
          warehouses={warehouses}
          onClose={() => {
            setIsEndlessAisleModalOpen(false);
            setSelectedEndlessAisleProduct(null);
          }}
          onSubmit={(data: Partial<EndlessAisleProduct>) => {
            if (selectedEndlessAisleProduct?.id) {
              updateEndlessAisleProductMutation.mutate({ id: Number(selectedEndlessAisleProduct.id), data });
            } else {
              createEndlessAisleProductMutation.mutate(data);
            }
          }}
          isLoading={createEndlessAisleProductMutation.isPending || updateEndlessAisleProductMutation.isPending}
        />
      )}

      {/* Endless Aisle Product View Modal */}
      {isEndlessAisleViewModalOpen && endlessAisleProductToView && (
        <EndlessAisleProductViewModal
          product={endlessAisleProductToView}
          onClose={() => {
            setIsEndlessAisleViewModalOpen(false);
            setEndlessAisleProductToView(null);
          }}
        />
      )}
    </div>
  );
}

// Store Modal Component
function StoreModal({
  store,
  isEditing,
  onClose,
  onSubmit,
}: {
  store: Store | null;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (storeId?: number, data?: Partial<Store>) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Omit<Store, 'id'>>({
    name: store?.name || '',
    code: store?.code || '',
    address: store?.address || '',
    city: store?.city || '',
    country: store?.country || '',
    postalCode: store?.postalCode || '',
    phone: store?.phone || '',
    email: store?.email || '',
    isActive: store?.isActive ?? true,
    operatingHours: store?.operatingHours || {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && store) {
      onSubmit(store.id, formData);
    } else {
      onSubmit(undefined, formData);
    }
  };

  const handleOperatingHoursChange = (hours: OperatingHours) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: hours,
    }));
  };

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
        <div className="sticky top-0 z-[50] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Store' : 'Add Store'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter store name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store Code
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter store code"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter store address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode || ''}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter postal code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
              <CustomDropdown
                value={formData.country || ''}
                onChange={(value) => setFormData({ ...formData, country: value })}
                options={[
                  { value: 'United States', label: 'United States' },
                  { value: 'United Kingdom', label: 'United Kingdom' },
                  { value: 'Canada', label: 'Canada' },
                  { value: 'Australia', label: 'Australia' },
                  { value: 'Germany', label: 'Germany' },
                  { value: 'France', label: 'France' },
                  { value: 'Italy', label: 'Italy' },
                  { value: 'Spain', label: 'Spain' },
                  { value: 'Netherlands', label: 'Netherlands' },
                  { value: 'Belgium', label: 'Belgium' },
                  { value: 'Switzerland', label: 'Switzerland' },
                  { value: 'Sweden', label: 'Sweden' },
                  { value: 'Norway', label: 'Norway' },
                  { value: 'Denmark', label: 'Denmark' },
                  { value: 'Finland', label: 'Finland' },
                  { value: 'Poland', label: 'Poland' },
                  { value: 'Japan', label: 'Japan' },
                  { value: 'China', label: 'China' },
                  { value: 'India', label: 'India' },
                  { value: 'Singapore', label: 'Singapore' },
                  { value: 'South Korea', label: 'South Korea' },
                  { value: 'Brazil', label: 'Brazil' },
                  { value: 'Mexico', label: 'Mexico' },
                  { value: 'Argentina', label: 'Argentina' },
                  { value: 'South Africa', label: 'South Africa' },
                  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
                  { value: 'Saudi Arabia', label: 'Saudi Arabia' },
                  { value: 'Turkey', label: 'Turkey' },
                  { value: 'Russia', label: 'Russia' },
                ]}
                placeholder="Select Country"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <OperatingHoursPicker
            value={formData.operatingHours || {}}
            onChange={handleOperatingHoursChange}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Store is active
            </label>
          </div>

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
              {isEditing ? 'Update Store' : 'Create Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// BOPIS Order Modal Component
function BOPISOrderModal({
  order,
  orders,
  customers,
  stores,
  onClose,
  onSubmit,
  isLoading,
}: {
  order: BOPISOrder | null;
  orders: any[];
  customers: any[];
  stores: Store[];
  onClose: () => void;
  onSubmit: (data: Partial<BOPISOrder>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<BOPISOrder>>({
    orderId: order?.orderId || (orders.length > 0 ? orders[0].id : 0),
    orderNumber: order?.orderNumber || '',
    customerId: order?.customerId || (customers.length > 0 ? customers[0].id : 0),
    storeId: order?.storeId || (stores.length > 0 ? stores[0].id : 0),
    status: order?.status || 'PENDING',
    orderDate: order?.orderDate || new Date().toISOString().split('T')[0],
    expiryDate: order?.expiryDate,
    pickupInstructions: order?.pickupInstructions || '',
    customerNotes: order?.customerNotes || '',
    totalAmount: order?.totalAmount || 0,
    currency: order?.currency || 'USD',
    items: order?.items || [],
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId || !formData.customerId || !formData.storeId) {
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {order ? 'Edit BOPIS Order' : 'Create BOPIS Order'}
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
                onChange={(value) => {
                  const selectedOrder = orders.find((o) => o.id === Number(value));
                  setFormData({
                    ...formData,
                    orderId: Number(value) || 0,
                    orderNumber: selectedOrder?.orderNumber || formData.orderNumber,
                    customerId: selectedOrder?.customerId || formData.customerId,
                    totalAmount: selectedOrder?.totalAmount || formData.totalAmount,
                  });
                }}
                options={orders.map((o) => ({
                  value: o.id?.toString() || '',
                  label: o.orderNumber || `Order #${o.id}`,
                }))}
                placeholder="Select Order"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.customerId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, customerId: Number(value) || 0 })}
                options={customers.map((c) => ({
                  value: c.id?.toString() || '',
                  label: c.name || 'Unknown',
                }))}
                placeholder="Select Customer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.storeId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, storeId: Number(value) || 0 })}
                options={stores.map((s) => ({
                  value: s.id.toString(),
                  label: s.name,
                }))}
                placeholder="Select Store"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <CustomDropdown
                value={formData.status || 'PENDING'}
                onChange={(value) => setFormData({ ...formData, status: value as BOPISOrder['status'] })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
                  { value: 'PICKED_UP', label: 'Picked Up' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                  { value: 'EXPIRED', label: 'Expired' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Date</label>
              <DatePicker
                value={formData.orderDate || undefined}
                onChange={(value) => setFormData({ ...formData, orderDate: value || undefined })}
                placeholder="Select order date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
              <DatePicker
                value={formData.expiryDate || undefined}
                onChange={(value) => setFormData({ ...formData, expiryDate: value || undefined })}
                placeholder="Select expiry date"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pickup Instructions
            </label>
            <textarea
              value={formData.pickupInstructions || ''}
              onChange={(e) => setFormData({ ...formData, pickupInstructions: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Special instructions for pickup..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Notes</label>
            <textarea
              value={formData.customerNotes || ''}
              onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Customer notes..."
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
              {isLoading ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// BOPIS Order View Modal Component
function BOPISOrderViewModal({
  order,
  onClose,
}: {
  order: BOPISOrder;
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">BOPIS Order Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.orderNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {order.customer?.name || 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Store</label>
              <p className="text-sm text-gray-900 dark:text-white">{order.storeName || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'READY_FOR_PICKUP'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : order.status === 'PICKED_UP'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : order.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
              >
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Date</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Amount</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {order.currency || 'USD'} {typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : '0.00'}
              </p>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Items</label>
              <div className="space-y-2">
                {order.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product?.name || item.productName || 'Unknown Product'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity} | {item.currency || order.currency || 'USD'}{' '}
                        {typeof item.totalPrice === 'number' ? item.totalPrice.toFixed(2) : '0.00'}
                      </p>
                    </div>
                    {item.isReady && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
                        Ready
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.pickupInstructions && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Pickup Instructions
              </label>
              <p className="text-sm text-gray-900 dark:text-white">{order.pickupInstructions}</p>
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

// BORIS Return Modal Component
function BORISReturnModal({
  returnItem,
  orders,
  customers,
  stores,
  onClose,
  onSubmit,
  isLoading,
}: {
  returnItem: BORISReturn | null;
  orders: any[];
  customers: any[];
  stores: Store[];
  onClose: () => void;
  onSubmit: (data: Partial<BORISReturn>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<BORISReturn>>({
    returnId: returnItem?.returnId || 0,
    returnNumber: returnItem?.returnNumber || '',
    orderId: returnItem?.orderId || (orders.length > 0 ? orders[0].id : 0),
    customerId: returnItem?.customerId || (customers.length > 0 ? customers[0].id : 0),
    storeId: returnItem?.storeId || (stores.length > 0 ? stores[0].id : 0),
    status: returnItem?.status || 'PENDING',
    returnDate: returnItem?.returnDate || new Date().toISOString().split('T')[0],
    reason: returnItem?.reason || '',
    refundAmount: returnItem?.refundAmount || 0,
    currency: returnItem?.currency || 'USD',
    notes: returnItem?.notes || '',
    items: returnItem?.items || [],
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId || !formData.customerId || !formData.storeId || !formData.reason) {
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {returnItem ? 'Edit BORIS Return' : 'Create BORIS Return'}
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
                onChange={(value) => {
                  const selectedOrder = orders.find((o) => o.id === Number(value));
                  setFormData({
                    ...formData,
                    orderId: Number(value) || 0,
                    customerId: selectedOrder?.customerId || formData.customerId,
                  });
                }}
                options={orders.map((o) => ({
                  value: o.id?.toString() || '',
                  label: o.orderNumber || `Order #${o.id}`,
                }))}
                placeholder="Select Order"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.customerId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, customerId: Number(value) || 0 })}
                options={customers.map((c) => ({
                  value: c.id?.toString() || '',
                  label: c.name || 'Unknown',
                }))}
                placeholder="Select Customer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.storeId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, storeId: Number(value) || 0 })}
                options={stores.map((s) => ({
                  value: s.id.toString(),
                  label: s.name,
                }))}
                placeholder="Select Store"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <CustomDropdown
                value={formData.status || 'PENDING'}
                onChange={(value) => setFormData({ ...formData, status: value as BORISReturn['status'] })}
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'IN_TRANSIT', label: 'In Transit' },
                  { value: 'RECEIVED', label: 'Received' },
                  { value: 'PROCESSED', label: 'Processed' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Return Date
              </label>
              <DatePicker
                value={formData.returnDate || undefined}
                onChange={(value) => setFormData({ ...formData, returnDate: value || undefined })}
                placeholder="Select return date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Refund Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={typeof formData.refundAmount === 'number' ? formData.refundAmount : 0}
                onChange={(e) => setFormData({ ...formData, refundAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Return reason..."
            />
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
              {isLoading ? 'Saving...' : returnItem ? 'Update Return' : 'Create Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// BORIS Return View Modal Component
function BORISReturnViewModal({
  returnItem,
  onClose,
}: {
  returnItem: BORISReturn;
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">BORIS Return Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Return Number</label>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{returnItem.returnNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Order Number</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {returnItem.orderNumber || `Order #${returnItem.orderId}`}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {returnItem.customer?.name || 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Store</label>
              <p className="text-sm text-gray-900 dark:text-white">{returnItem.storeName || 'Unknown'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${returnItem.status === 'PROCESSED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : returnItem.status === 'RECEIVED'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : returnItem.status === 'IN_TRANSIT'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : returnItem.status === 'REJECTED' || returnItem.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}
              >
                {returnItem.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Refund Amount</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {returnItem.currency || 'USD'}{' '}
                {typeof returnItem.refundAmount === 'number' ? returnItem.refundAmount.toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Return Date</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {returnItem.returnDate ? new Date(returnItem.returnDate).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reason</label>
              <p className="text-sm text-gray-900 dark:text-white">{returnItem.reason}</p>
            </div>
          </div>

          {returnItem.items && returnItem.items.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Items</label>
              <div className="space-y-2">
                {returnItem.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.product?.name || item.productName || 'Unknown Product'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity} | Condition: {item.condition} | Refund: {returnItem.currency || 'USD'}{' '}
                        {typeof item.refundAmount === 'number' ? item.refundAmount.toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {returnItem.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</label>
              <p className="text-sm text-gray-900 dark:text-white">{returnItem.notes}</p>
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

// Endless Aisle Product Modal Component
function EndlessAisleProductModal({
  product,
  products,
  warehouses,
  onClose,
  onSubmit,
  isLoading,
}: {
  product: EndlessAisleProduct | null;
  products: any[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSubmit: (data: Partial<EndlessAisleProduct>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<EndlessAisleProduct>>({
    productId: product?.productId || (products.length > 0 ? products[0].id : 0),
    basePrice: product?.basePrice || 0,
    currency: product?.currency || 'USD',
    estimatedShippingDays: product?.estimatedShippingDays || 3,
    isAvailable: product?.isAvailable !== false,
    category: product?.category || '',
    collection: product?.collection || '',
    availableAtWarehouses: product?.availableAtWarehouses || [],
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) {
      toast.error('Please select a product');
      return;
    }
    onSubmit(formData);
  };

  const handleAddWarehouse = () => {
    setFormData({
      ...formData,
      availableAtWarehouses: [
        ...(formData.availableAtWarehouses || []),
        {
          warehouseId: warehouses[0]?.id || 0,
          warehouseName: warehouses[0]?.name || '',
          availableQuantity: 0,
          estimatedShippingDays: 3,
        },
      ],
    });
  };

  const handleRemoveWarehouse = (index: number) => {
    const updated = [...(formData.availableAtWarehouses || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, availableAtWarehouses: updated });
  };

  const handleUpdateWarehouse = (index: number, field: string, value: any) => {
    const updated = [...(formData.availableAtWarehouses || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, availableAtWarehouses: updated });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {product ? 'Edit Endless Aisle Product' : 'Add Endless Aisle Product'}
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
                Product <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={formData.productId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, productId: Number(value) || 0 })}
                options={products.map((p) => ({
                  value: p.id?.toString() || '',
                  label: p.name || p.sku || 'Unknown',
                }))}
                placeholder="Select Product"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Price</label>
              <input
                type="number"
                step="0.01"
                value={typeof formData.basePrice === 'number' ? formData.basePrice : 0}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
              <CustomDropdown
                value={formData.currency || 'USD'}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                options={[
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'GBP', label: 'GBP - British Pound' },
                  { value: 'JPY', label: 'JPY - Japanese Yen' },
                  { value: 'CNY', label: 'CNY - Chinese Yuan' },
                  { value: 'AUD', label: 'AUD - Australian Dollar' },
                  { value: 'CAD', label: 'CAD - Canadian Dollar' },
                  { value: 'CHF', label: 'CHF - Swiss Franc' },
                  { value: 'INR', label: 'INR - Indian Rupee' },
                  { value: 'SGD', label: 'SGD - Singapore Dollar' },
                ]}
                placeholder="Select Currency"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Shipping Days
              </label>
              <input
                type="number"
                value={formData.estimatedShippingDays || 3}
                onChange={(e) => setFormData({ ...formData, estimatedShippingDays: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Product category..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Collection</label>
              <input
                type="text"
                value={formData.collection || ''}
                onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Product collection..."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Available at Warehouses
              </label>
              <button
                type="button"
                onClick={handleAddWarehouse}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </button>
            </div>
            <div className="space-y-3">
              {(formData.availableAtWarehouses || []).map((warehouse, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <CustomDropdown
                        value={warehouse.warehouseId?.toString() || ''}
                        onChange={(value) => {
                          const selectedWarehouse = warehouses.find((w) => w.id === Number(value));
                          handleUpdateWarehouse(idx, 'warehouseId', Number(value) || 0);
                          handleUpdateWarehouse(idx, 'warehouseName', selectedWarehouse?.name || '');
                        }}
                        options={warehouses.map((w) => ({
                          value: w.id.toString(),
                          label: w.name,
                        }))}
                        placeholder="Select Warehouse"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={warehouse.availableQuantity || 0}
                        onChange={(e) =>
                          handleUpdateWarehouse(idx, 'availableQuantity', parseInt(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Quantity"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={warehouse.estimatedShippingDays || 3}
                        onChange={(e) =>
                          handleUpdateWarehouse(idx, 'estimatedShippingDays', parseInt(e.target.value) || 3)
                        }
                        className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Shipping Days"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWarehouse(idx)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!formData.availableAtWarehouses || formData.availableAtWarehouses.length === 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No warehouses added. Click "Add Warehouse" to add one.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={formData.isAvailable !== false}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Product is available
            </label>
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
              {isLoading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Endless Aisle Product View Modal Component
function EndlessAisleProductViewModal({
  product,
  onClose,
}: {
  product: EndlessAisleProduct;
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Endless Aisle Product Details</h2>
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Product Name</label>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{product.productName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
              <p className="text-sm text-gray-900 dark:text-white">{product.sku}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Base Price</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {product.currency || 'USD'}{' '}
                {typeof product.basePrice === 'number' ? product.basePrice.toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Estimated Shipping Days
              </label>
              <p className="text-sm text-gray-900 dark:text-white">{product.estimatedShippingDays || 3} days</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.isAvailable
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}
              >
                {product.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>
            {product.category && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                <p className="text-sm text-gray-900 dark:text-white">{product.category}</p>
              </div>
            )}
            {product.collection && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Collection</label>
                <p className="text-sm text-gray-900 dark:text-white">{product.collection}</p>
              </div>
            )}
          </div>

          {product.availableAtWarehouses && product.availableAtWarehouses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Available at Warehouses
              </label>
              <div className="space-y-2">
                {product.availableAtWarehouses.map((warehouse, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {warehouse.warehouseName}
                        {warehouse.warehouseCity && `, ${warehouse.warehouseCity}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Quantity: {warehouse.availableQuantity} | Shipping: {warehouse.estimatedShippingDays} days
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <p className="text-sm text-gray-900 dark:text-white">{product.description}</p>
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
