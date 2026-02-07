import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  Globe,
  Store,
  ArrowLeftRight,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Search,
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
import { CustomDropdown } from '../components/ui';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Local storage keys
  const BOPIS_ORDERS_KEY = 'omnichannel_bopis_orders';
  const BORIS_RETURNS_KEY = 'omnichannel_boris_returns';
  const ENDLESS_AISLE_PRODUCTS_KEY = 'omnichannel_endless_aisle_products';
  const STORES_KEY = 'omnichannel_stores';

  // Fetch orders (for future use when creating BOPIS/BORIS orders)
  const { isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
  });

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

  // Fetch inventory for endless aisle
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'endless-aisle'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
      }
    },
  });

  const warehouses: Warehouse[] = useMemo(() => {
    return Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data || []);
  }, [warehousesData]);

  // Load BOPIS orders, BORIS returns, endless aisle products, and stores from localStorage
  const [bopisOrders, setBopisOrders] = useState<BOPISOrder[]>([]);
  const [borisReturns, setBorisReturns] = useState<BORISReturn[]>([]);
  const [endlessAisleProducts, setEndlessAisleProducts] = useState<EndlessAisleProduct[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    try {
      const storedBopisOrders = localStorage.getItem(BOPIS_ORDERS_KEY);
      if (storedBopisOrders) {
        setBopisOrders(JSON.parse(storedBopisOrders));
      }
    } catch (error) {
      console.error('Error loading BOPIS orders:', error);
    }

    try {
      const storedBorisReturns = localStorage.getItem(BORIS_RETURNS_KEY);
      if (storedBorisReturns) {
        setBorisReturns(JSON.parse(storedBorisReturns));
      }
    } catch (error) {
      console.error('Error loading BORIS returns:', error);
    }

    try {
      const storedEndlessAisle = localStorage.getItem(ENDLESS_AISLE_PRODUCTS_KEY);
      if (storedEndlessAisle) {
        setEndlessAisleProducts(JSON.parse(storedEndlessAisle));
      }
    } catch (error) {
      console.error('Error loading endless aisle products:', error);
    }

    try {
      const storedStores = localStorage.getItem(STORES_KEY);
      if (storedStores) {
        setStores(JSON.parse(storedStores));
      } else {
        // Initialize stores from warehouses if no stores exist
        const initialStores: Store[] = warehouses.map((w) => ({
          id: w.id,
          name: w.name,
          address: w.address,
          city: w.city,
          country: w.country,
          isActive: true,
        }));
        if (initialStores.length > 0) {
          setStores(initialStores);
          localStorage.setItem(STORES_KEY, JSON.stringify(initialStores));
        }
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  }, [warehouses]);

  // Save functions
  const saveStores = (storesList: Store[]) => {
    try {
      localStorage.setItem(STORES_KEY, JSON.stringify(storesList));
      setStores(storesList);
    } catch (error) {
      console.error('Error saving stores:', error);
      toast.error('Failed to save stores');
    }
  };

  const handleStoreSubmit = (_storeId?: number, storeData?: Partial<Store>) => {
    if (isEditingStore && selectedStore && storeData) {
      // Update existing store
      const updatedStores = stores.map((s) => (s.id === selectedStore.id ? { ...s, ...storeData } : s));
      saveStores(updatedStores);
      toast.success('Store updated successfully');
    } else if (storeData) {
      // Create new store
      const newStore: Store = {
        ...(storeData as Omit<Store, 'id'>),
        id: Date.now(), // Simple ID generation
      };
      const updatedStores = [...stores, newStore];
      saveStores(updatedStores);
      toast.success('Store created successfully');
    }
    setIsStoreModalOpen(false);
    setSelectedStore(null);
    setIsEditingStore(false);
  };

  const handleDeleteStore = (storeId: number) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      const updatedStores = stores.filter((s) => s.id !== storeId);
      saveStores(updatedStores);
      toast.success('Store deleted successfully');
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

  // Filter BOPIS orders
  const filteredBopisOrders = useMemo(() => {
    let filtered = bopisOrders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(query) ||
          order.customer?.name.toLowerCase().includes(query) ||
          order.storeName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (storeFilter !== 'all') {
      filtered = filtered.filter((order) => order.storeId === Number(storeFilter));
    }

    return filtered.sort((a, b) => {
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [bopisOrders, searchQuery, statusFilter, storeFilter]);

  // Filter BORIS returns
  const filteredBorisReturns = useMemo(() => {
    let filtered = borisReturns;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (returnItem) =>
          returnItem.returnNumber.toLowerCase().includes(query) ||
          returnItem.orderNumber?.toLowerCase().includes(query) ||
          returnItem.customer?.name.toLowerCase().includes(query) ||
          returnItem.storeName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((returnItem) => returnItem.status === statusFilter);
    }

    if (storeFilter !== 'all') {
      filtered = filtered.filter((returnItem) => returnItem.storeId === Number(storeFilter));
    }

    return filtered.sort((a, b) => {
      const dateA = a.returnDate ? new Date(a.returnDate).getTime() : 0;
      const dateB = b.returnDate ? new Date(b.returnDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [borisReturns, searchQuery, statusFilter, storeFilter]);

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

  // Initialize endless aisle products from products and inventory data
  useEffect(() => {
    if (productsData && inventoryData && warehouses.length > 0 && endlessAisleProducts.length === 0) {
      const products = Array.isArray(productsData) ? productsData : [];
      const inventory = Array.isArray(inventoryData) ? inventoryData : [];

      // Create endless aisle products from products that have inventory in warehouses but not in stores
      const newEndlessAisleProducts: EndlessAisleProduct[] = products
        .filter((product: any) => {
          // Check if product has inventory in warehouses
          const warehouseInventory = inventory.filter(
            (inv: any) => inv.productId === product.id && inv.availableQty > 0
          );
          return warehouseInventory.length > 0;
        })
        .map((product: any) => {
          const warehouseInventory = inventory.filter(
            (inv: any) => inv.productId === product.id && inv.availableQty > 0
          );

          const availableAtWarehouses: EndlessAisleWarehouse[] = warehouseInventory.map((inv: any) => {
            const warehouse = warehouses.find((w) => w.id === inv.warehouseId);
            return {
              warehouseId: inv.warehouseId,
              warehouseName: warehouse?.name || 'Unknown',
              warehouseCity: warehouse?.city,
              warehouseCountry: warehouse?.country,
              availableQuantity: inv.availableQty || 0,
              estimatedShippingDays: 3, // Default 3 days
            };
          });

          return {
            id: product.id,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            description: product.description,
            basePrice: parseFloat(product.basePrice || product.price || 0),
            currency: 'USD',
            images: product.images || [],
            sizes: product.sizes || [],
            colors: product.colors || [],
            availableAtWarehouses,
            estimatedShippingDays: Math.min(...availableAtWarehouses.map((w) => w.estimatedShippingDays)),
            isAvailable: availableAtWarehouses.some((w) => w.availableQuantity > 0),
            category: product.collection?.name || product.collectionId?.toString(),
            collection: product.collection?.name,
          };
        });

      if (newEndlessAisleProducts.length > 0) {
        setEndlessAisleProducts(newEndlessAisleProducts);
        localStorage.setItem(ENDLESS_AISLE_PRODUCTS_KEY, JSON.stringify(newEndlessAisleProducts));
      }
    }
  }, [productsData, inventoryData, warehouses, endlessAisleProducts.length]);

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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'bopis'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'boris'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'endless-aisle'
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
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'stores'
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search BOPIS orders..."
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
                      { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
                      { value: 'PICKED_UP', label: 'Picked Up' },
                      { value: 'CANCELLED', label: 'Cancelled' },
                      { value: 'EXPIRED', label: 'Expired' },
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

              {/* BOPIS Orders Table */}
              {filteredBopisOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery || statusFilter !== 'all' || storeFilter !== 'all'
                      ? 'No matching BOPIS orders found'
                      : 'No BOPIS orders found'}
                  </p>
                  <button
                    onClick={() => {
                      toast.success('Create BOPIS order feature coming soon');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First BOPIS Order
                  </button>
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
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    order.status === 'READY_FOR_PICKUP'
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
                                  <button
                                    onClick={() => {
                                      toast('View BOPIS order details feature coming soon');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search BORIS returns..."
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

              {/* BORIS Returns Table */}
              {filteredBorisReturns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ArrowLeftRight className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchQuery || statusFilter !== 'all' || storeFilter !== 'all'
                      ? 'No matching BORIS returns found'
                      : 'No BORIS returns found'}
                  </p>
                  <button
                    onClick={() => {
                      toast.success('Create BORIS return feature coming soon');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First BORIS Return
                  </button>
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
                                {store?.name || returnItem.storeName || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {returnItem.currency} {returnItem.refundAmount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    returnItem.status === 'PROCESSED'
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
                                      toast('View BORIS return details feature coming soon');
                                    }}
                                    className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
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
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search endless aisle products..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
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
                                className={`px-2 py-1 rounded-full ${
                                  product.isAvailable
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
                                  toast('View product details feature coming soon');
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-600 dark:border-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  toast('Add to order feature coming soon');
                                }}
                                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                              >
                                Order
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Store Locations</h3>
                <button
                  onClick={handleAddStore}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Store
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search stores..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
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
                  {!searchQuery && (
                    <button
                      onClick={handleAddStore}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Store
                    </button>
                  )}
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
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                store.isActive
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
                              onClick={() => handleDeleteStore(store.id)}
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

  const updateOperatingHours = (day: string, hours: string) => {
    setFormData((prev) => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day.toLowerCase()]: hours,
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Store Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operating Hours
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day}>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{day}</label>
                  <input
                    type="text"
                    placeholder="e.g., 9:00 AM - 6:00 PM"
                    value={formData.operatingHours?.[day.toLowerCase() as keyof typeof formData.operatingHours] || ''}
                    onChange={(e) => updateOperatingHours(day, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

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
