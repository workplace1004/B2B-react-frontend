import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Layers, Percent, Star, TrendingDown, Package, Search, Plus, X, Pencil, Trash2, Calendar, DollarSign } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'featured' | 'markdown';

export default function AssortmentMerchandising() {
  const [activeTab, setActiveTab] = useState<TabType>('featured');

  const tabs = [
    { id: 'featured' as TabType, label: 'Featured Collections', icon: Star },
    { id: 'markdown' as TabType, label: 'Markdown Planning', icon: Percent },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Assortment & Merchandising" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assortment & Merchandising</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage featured collections and plan markdowns for dead stock</p>
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
        {activeTab === 'featured' && <FeaturedCollectionsSection />}
        {activeTab === 'markdown' && <MarkdownPlanningSection />}
      </div>
    </div>
  );
}

// Featured Collections Section Component
function FeaturedCollectionsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch collections
  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ['collections', 'featured', searchQuery],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        const collections = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        
        // Filter by search query
        if (searchQuery) {
          return collections.filter((c: any) =>
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.season?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.drop?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        return collections;
      } catch (error) {
        return [];
      }
    },
  });

  const collections = collectionsData || [];

  // Get featured collections from localStorage (until backend is ready)
  const [featuredCollections, setFeaturedCollections] = useState<number[]>(() => {
    const stored = localStorage.getItem('featured-collections');
    return stored ? JSON.parse(stored) : [];
  });

  const toggleFeatured = (collectionId: number) => {
    const updated = featuredCollections.includes(collectionId)
      ? featuredCollections.filter((id) => id !== collectionId)
      : [...featuredCollections, collectionId];
    setFeaturedCollections(updated);
    localStorage.setItem('featured-collections', JSON.stringify(updated));
    toast.success(
      featuredCollections.includes(collectionId)
        ? 'Collection removed from featured'
        : 'Collection added to featured'
    );
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
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Featured Collections Grid */}
      {collections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Star className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No collections found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No collections available to feature.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection: any) => {
            const isFeatured = featuredCollections.includes(collection.id);
            return (
              <div
                key={collection.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all ${
                  isFeatured
                    ? 'border-primary-500 dark:border-primary-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {collection.name}
                      </h3>
                      {collection.season && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{collection.season}</p>
                      )}
                      {collection.drop && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Drop: {collection.drop}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleFeatured(collection.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isFeatured
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={isFeatured ? 'Remove from featured' : 'Add to featured'}
                    >
                      <Star className={`w-5 h-5 ${isFeatured ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  
                  {collection.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {collection.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Products</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {collection._count?.products || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          collection.lifecycle === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : collection.lifecycle === 'PLANNING'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {collection.lifecycle || 'PLANNING'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Featured Collections Summary */}
      {featuredCollections.length > 0 && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary-600 dark:text-primary-400 fill-current" />
            <p className="text-sm font-medium text-primary-900 dark:text-primary-200">
              {featuredCollections.length} collection{featuredCollections.length !== 1 ? 's' : ''} currently featured
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Markdown Planning Section Component
function MarkdownPlanningSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch products with inventory
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'markdown-planning'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch inventory
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', 'markdown-planning'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for sales analysis
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'markdown-planning'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  const inventory = inventoryData || [];
  const orders = ordersData || [];

  // Get markdown plans from localStorage (until backend is ready)
  const [markdownPlans, setMarkdownPlans] = useState<any[]>(() => {
    const stored = localStorage.getItem('markdown-plans');
    return stored ? JSON.parse(stored) : [];
  });

  // Calculate dead stock candidates
  const deadStockCandidates = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return products.map((product: any) => {
      // Get inventory for this product
      const productInventory = inventory.filter((inv: any) => inv.productId === product.id);
      const totalQuantity = productInventory.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
      const totalAvailable = productInventory.reduce((sum: number, inv: any) => sum + (inv.availableQty || 0), 0);

      // Get sales in last 30 days
      const recentOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= thirtyDaysAgo;
      });

      const salesQuantity = recentOrders.reduce((sum: number, order: any) => {
        return sum + (order.orderLines?.reduce((lineSum: number, line: any) => {
          return lineSum + (line.productId === product.id ? (line.quantity || 0) : 0);
        }, 0) || 0);
      }, 0);

      const salesRevenue = recentOrders.reduce((sum: number, order: any) => {
        return sum + (order.orderLines?.reduce((lineSum: number, line: any) => {
          return lineSum + (line.productId === product.id ? parseFloat(line.totalPrice || 0) : 0);
        }, 0) || 0);
      }, 0);

      // Check if product has existing markdown plan
      const existingPlan = markdownPlans.find((plan) => plan.productId === product.id);

      // Calculate dead stock score (higher inventory, lower sales = higher score)
      const daysOfStock = salesQuantity > 0 ? (totalAvailable / (salesQuantity / 30)) : totalAvailable > 0 ? 999 : 0;
      const isDeadStock = totalAvailable > 0 && (salesQuantity === 0 || daysOfStock > 90);

      return {
        ...product,
        totalQuantity,
        totalAvailable,
        salesQuantity,
        salesRevenue,
        daysOfStock: daysOfStock === 999 ? null : Math.round(daysOfStock),
        isDeadStock,
        existingPlan,
        currentPrice: parseFloat(product.price || product.basePrice || 0),
      };
    })
      .filter((p: any) => {
        if (filterStatus === 'planned') return p.existingPlan;
        if (filterStatus === 'candidates') return p.isDeadStock && !p.existingPlan;
        if (filterStatus === 'all') return true;
        return true;
      })
      .filter((p: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.style?.toLowerCase().includes(query)
        );
      })
      .sort((a: any, b: any) => {
        // Sort by dead stock score (inventory / sales ratio)
        const scoreA = a.salesQuantity > 0 ? a.totalAvailable / a.salesQuantity : a.totalAvailable;
        const scoreB = b.salesQuantity > 0 ? b.totalAvailable / b.salesQuantity : b.totalAvailable;
        return scoreB - scoreA;
      });
  }, [products, inventory, orders, markdownPlans, filterStatus, searchQuery]);

  const saveMarkdownPlan = (plan: any) => {
    const updated = markdownPlans.some((p) => p.productId === plan.productId)
      ? markdownPlans.map((p) => (p.productId === plan.productId ? plan : p))
      : [...markdownPlans, plan];
    setMarkdownPlans(updated);
    localStorage.setItem('markdown-plans', JSON.stringify(updated));
    toast.success(plan.id ? 'Markdown plan updated!' : 'Markdown plan created!');
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const deleteMarkdownPlan = (productId: number) => {
    const updated = markdownPlans.filter((p) => p.productId !== productId);
    setMarkdownPlans(updated);
    localStorage.setItem('markdown-plans', JSON.stringify(updated));
    toast.success('Markdown plan deleted!');
  };

  const isLoading = productsLoading || inventoryLoading;

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Products</option>
              <option value="candidates">Dead Stock Candidates</option>
              <option value="planned">With Markdown Plans</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dead Stock Candidates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {deadStockCandidates.filter((p: any) => p.isDeadStock && !p.existingPlan).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Markdown Plans</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {markdownPlans.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Percent className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${deadStockCandidates.reduce((sum: number, p: any) => sum + (p.currentPrice * p.totalAvailable), 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Days of Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {(() => {
                  const productsWithDays = deadStockCandidates.filter((p: any) => p.daysOfStock !== null);
                  if (productsWithDays.length === 0) return 'N/A';
                  const avg = productsWithDays.reduce((sum: number, p: any) => sum + p.daysOfStock, 0) / productsWithDays.length;
                  return Math.round(avg);
                })()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Dead Stock Products Table */}
      {deadStockCandidates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <TrendingDown className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || filterStatus !== 'all' ? 'Try adjusting your search or filter criteria.' : 'No dead stock candidates found.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Current Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Inventory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">30d Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Days of Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Markdown Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {deadStockCandidates.map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                      {product.style && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">Style: {product.style}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${product.currentPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{product.totalAvailable}</div>
                      {product.totalQuantity > product.totalAvailable && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {product.totalQuantity - product.totalAvailable} reserved
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{product.salesQuantity}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${product.salesRevenue.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.daysOfStock !== null ? (
                        <span className={`text-sm font-medium ${
                          product.daysOfStock > 90
                            ? 'text-red-600 dark:text-red-400'
                            : product.daysOfStock > 60
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {product.daysOfStock} days
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">No sales</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.existingPlan ? (
                        <div>
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {product.existingPlan.discountPercent}% off
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ${product.existingPlan.newPrice?.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsModalOpen(true);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          {product.existingPlan ? 'Edit' : 'Plan'}
                        </button>
                        {product.existingPlan && (
                          <button
                            onClick={() => deleteMarkdownPlan(product.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Markdown Plan Modal */}
      {isModalOpen && selectedProduct && (
        <MarkdownPlanModal
          product={selectedProduct}
          plan={selectedProduct.existingPlan}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onSave={saveMarkdownPlan}
        />
      )}
    </div>
  );
}

// Markdown Plan Modal Component
function MarkdownPlanModal({
  product,
  plan,
  onClose,
  onSave,
}: {
  product: any;
  plan?: any;
  onClose: () => void;
  onSave: (plan: any) => void;
}) {
  const [formData, setFormData] = useState({
    id: plan?.id || `plan-${Date.now()}`,
    productId: product.id,
    discountPercent: plan?.discountPercent || 0,
    newPrice: plan?.newPrice || product.currentPrice,
    startDate: plan?.startDate || new Date().toISOString().split('T')[0],
    endDate: plan?.endDate || '',
    reason: plan?.reason || 'Dead stock clearance',
    notes: plan?.notes || '',
  });

  const handleDiscountChange = (value: number) => {
    const discount = Math.max(0, Math.min(100, value));
    const newPrice = product.currentPrice * (1 - discount / 100);
    setFormData({ ...formData, discountPercent: discount, newPrice });
  };

  const handlePriceChange = (value: number) => {
    const newPrice = Math.max(0, value);
    const discount = ((product.currentPrice - newPrice) / product.currentPrice) * 100;
    setFormData({ ...formData, newPrice, discountPercent: discount });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {plan ? 'Edit Markdown Plan' : 'Create Markdown Plan'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{product.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">SKU: {product.sku}</p>
            <div className="mt-2 flex items-center gap-4">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Current Price:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  ${product.currentPrice.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Inventory:</span>
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  {product.totalAvailable} units
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Discount Percentage *
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.discountPercent}
                onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                required
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={formData.discountPercent}
              onChange={(e) => handleDiscountChange(parseFloat(e.target.value))}
              className="w-full mt-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Price *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.newPrice}
                onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                required
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Savings: ${(product.currentPrice - formData.newPrice).toFixed(2)} per unit
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="Dead stock clearance">Dead stock clearance</option>
              <option value="Seasonal clearance">Seasonal clearance</option>
              <option value="End of line">End of line</option>
              <option value="Overstock">Overstock</option>
              <option value="Promotional">Promotional</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              {plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
