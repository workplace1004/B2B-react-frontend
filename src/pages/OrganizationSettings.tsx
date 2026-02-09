import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import {
  Building,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Globe,
  Tag,
  Eye,
  X,
  Trash2,
  CheckCircle,
  DollarSign,
  Languages,
  Ruler,
  MapPin,
  AlertTriangle,
  Edit,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput } from '../components/ui';

type TabType = 'multi-brand-market' | 'localization';
type BrandStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
type MarketStatus = 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
type SizeSystem = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'AU';

interface Brand {
  id: string | number;
  name: string;
  code: string;
  description: string;
  logo?: string;
  status: BrandStatus;
  marketIds: (string | number)[];
  marketCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface Market {
  id: string | number;
  name: string;
  code: string;
  region: string;
  country: string;
  currency: string;
  language: string;
  timezone: string;
  status: MarketStatus;
  brandIds: (string | number)[];
  brandCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface Localization {
  id: string | number;
  marketId: string | number;
  marketName: string;
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  sizeSystem: SizeSystem;
  weightUnit: string;
  lengthUnit: string;
  createdAt: string;
  updatedAt?: string;
}

export default function OrganizationSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('multi-brand-market');

  const tabs = [
    { id: 'multi-brand-market' as TabType, label: 'Multi-brand / Multi-market', icon: Building },
    { id: 'localization' as TabType, label: 'Localization', icon: Globe },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Organization Settings" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Organization Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage multi-brand/multi-market configuration and localization settings
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
        {activeTab === 'multi-brand-market' && <MultiBrandMarketSection />}
        {activeTab === 'localization' && <LocalizationSection />}
      </div>
    </div>
  );
}

// Multi-brand / Multi-market Section
function MultiBrandMarketSection() {
  const [activeSubTab, setActiveSubTab] = useState<'brands' | 'markets'>('brands');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [brandToView, setBrandToView] = useState<Brand | null>(null);
  const [brandToEdit, setBrandToEdit] = useState<Brand | null>(null);
  const [marketToView, setMarketToView] = useState<Market | null>(null);
  const [marketToEdit, setMarketToEdit] = useState<Market | null>(null);
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [showCreateMarketModal, setShowCreateMarketModal] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [marketToDelete, setMarketToDelete] = useState<Market | null>(null);
  const [isDeleteBrandModalShowing, setIsDeleteBrandModalShowing] = useState(false);
  const [isDeleteMarketModalShowing, setIsDeleteMarketModalShowing] = useState(false);
  const [brandsCurrentPage, setBrandsCurrentPage] = useState(1);
  const [brandsItemsPerPage] = useState(10);
  const [marketsCurrentPage, setMarketsCurrentPage] = useState(1);
  const [marketsItemsPerPage] = useState(10);

  const queryClient = useQueryClient();

  // Fetch brands from API
  const { data: brandsData, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands', statusFilter],
    queryFn: async () => {
      try {
        const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const response = await api.get(`/brands?skip=0&take=1000${statusParam}`);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching brands:', error);
        return [];
      }
    },
  });

  // Fetch markets from API
  const { data: marketsData, isLoading: marketsLoading } = useQuery({
    queryKey: ['markets', statusFilter],
    queryFn: async () => {
      try {
        const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const response = await api.get(`/markets?skip=0&take=1000${statusParam}`);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching markets:', error);
        return [];
      }
    },
  });

  const brands: Brand[] = brandsData || [];
  const markets: Market[] = marketsData || [];

  // Filter brands
  const filteredBrands = useMemo(() => {
    let filtered = brands;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((brand) =>
        brand.name.toLowerCase().includes(query) ||
        brand.code.toLowerCase().includes(query) ||
        brand.description.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((brand) => 
        brand.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [brands, searchQuery, statusFilter]);

  // Brands pagination calculations
  const brandsTotalPages = Math.max(1, Math.ceil(filteredBrands.length / brandsItemsPerPage));
  const brandsStartIndex = (brandsCurrentPage - 1) * brandsItemsPerPage;
  const brandsEndIndex = brandsStartIndex + brandsItemsPerPage;
  const paginatedBrands = filteredBrands.slice(brandsStartIndex, brandsEndIndex);

  // Reset brands page when filters change
  useEffect(() => {
    setBrandsCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Filter markets
  const filteredMarkets = useMemo(() => {
    let filtered = markets;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((market) =>
        market.name.toLowerCase().includes(query) ||
        market.code.toLowerCase().includes(query) ||
        market.country.toLowerCase().includes(query) ||
        market.region.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((market) => 
        market.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [markets, searchQuery, statusFilter]);

  // Markets pagination calculations
  const marketsTotalPages = Math.max(1, Math.ceil(filteredMarkets.length / marketsItemsPerPage));
  const marketsStartIndex = (marketsCurrentPage - 1) * marketsItemsPerPage;
  const marketsEndIndex = marketsStartIndex + marketsItemsPerPage;
  const paginatedMarkets = filteredMarkets.slice(marketsStartIndex, marketsEndIndex);

  // Reset markets page when filters change
  useEffect(() => {
    setMarketsCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Calculate summary metrics
  const brandsSummary = useMemo(() => {
    const total = brands.length;
    const active = brands.filter((brand) => brand.status?.toLowerCase() === 'active');
    return { total, active: active.length };
  }, [brands]);

  const marketsSummary = useMemo(() => {
    const total = markets.length;
    const active = markets.filter((market) => market.status?.toLowerCase() === 'active');
    return { total, active: active.length };
  }, [markets]);

  // Create brand mutation
  const createBrandMutation = useMutation({
    mutationFn: async (brandData: any) => {
      const response = await api.post('/brands', {
        ...brandData,
        status: brandData.status?.toUpperCase() || 'ACTIVE',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      setShowCreateBrandModal(false);
      toast.success('Brand created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create brand');
    },
  });

  // Update brand mutation
  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: any }) => {
      const response = await api.patch(`/brands/${id}`, {
        ...updates,
        status: updates.status?.toUpperCase(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      toast.success('Brand updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update brand');
    },
  });

  // Delete brand mutation
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/brands/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      toast.success('Brand deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete brand');
    },
  });

  // Create market mutation
  const createMarketMutation = useMutation({
    mutationFn: async (marketData: any) => {
      const response = await api.post('/markets', {
        ...marketData,
        status: marketData.status?.toUpperCase() || 'ACTIVE',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setShowCreateMarketModal(false);
      toast.success('Market created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create market');
    },
  });

  // Update market mutation
  const updateMarketMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: any }) => {
      const response = await api.patch(`/markets/${id}`, {
        ...updates,
        status: updates.status?.toUpperCase(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Market updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update market');
    },
  });

  // Delete market mutation
  const deleteMarketMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/markets/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Market deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete market');
    },
  });

  const handleCreateBrand = (brandData: any) => {
    createBrandMutation.mutate(brandData);
  };

  const handleUpdateBrand = (brandId: string | number, updates: any) => {
    updateBrandMutation.mutate({ id: brandId, updates });
  };

  const handleDeleteBrand = (brandId: string | number) => {
    deleteBrandMutation.mutate(brandId);
  };

  const handleConfirmDeleteBrand = () => {
    if (brandToDelete) {
      handleDeleteBrand(brandToDelete.id);
      setIsDeleteBrandModalShowing(false);
      setBrandToDelete(null);
    }
  };

  const handleCreateMarket = (marketData: any) => {
    createMarketMutation.mutate(marketData);
  };

  const handleUpdateMarket = (marketId: string | number, updates: any) => {
    updateMarketMutation.mutate({ id: marketId, updates });
  };

  const handleDeleteMarket = (marketId: string | number) => {
    deleteMarketMutation.mutate(marketId);
  };

  const handleConfirmDeleteMarket = () => {
    if (marketToDelete) {
      handleDeleteMarket(marketToDelete.id);
      setIsDeleteMarketModalShowing(false);
      setMarketToDelete(null);
    }
  };

  // Show loading state (after all hooks)
  if (brandsLoading || marketsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Sub Tabs">
          <button
            onClick={() => setActiveSubTab('brands')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeSubTab === 'brands'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            Brands
          </button>
          <button
            onClick={() => setActiveSubTab('markets')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeSubTab === 'markets'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            Markets
          </button>
        </nav>
      </div>

      {/* Brands Section */}
      {activeSubTab === 'brands' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Brands</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {brandsSummary.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Tag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Brands</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {brandsSummary.active}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <SearchInput
                  value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by brand name, code, or description..."
                />
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <div className="min-w-[240px]">
                  <CustomDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
                <button
                  onClick={() => setShowCreateBrandModal(true)}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Brand
                </button>
              </div>
            </div>
          </div>

          {/* Brands Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Brand Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Markets
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
                  {filteredBrands.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Tag className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">No brands found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Create your first brand to get started
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedBrands.map((brand) => (
                      <tr
                        key={brand.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {brand.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {brand.code}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                            {brand.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {brand.marketCount ?? brand.marketIds?.length ?? 0} market{(brand.marketCount ?? brand.marketIds?.length ?? 0) !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${brand.status?.toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {brand.status?.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBrandToView(brand);
                              }}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                              title="View Brand"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBrandToEdit(brand);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              title="Edit Brand"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBrandToDelete(brand);
                                setIsDeleteBrandModalShowing(true);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Delete Brand"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Brands Pagination */}
          {filteredBrands.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{brandsStartIndex + 1}</span> to{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Math.min(brandsEndIndex, filteredBrands.length)}
                  </span>{' '}
                  of <span className="font-medium text-gray-900 dark:text-white">{filteredBrands.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setBrandsCurrentPage(1)}
                      disabled={brandsCurrentPage === 1}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                      title="First page"
                    >
                      &lt;&lt;
                    </button>
                    <button
                      onClick={() => setBrandsCurrentPage(p => Math.max(1, p - 1))}
                      disabled={brandsCurrentPage === 1}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, brandsTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (brandsTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (brandsCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (brandsCurrentPage >= brandsTotalPages - 2) {
                        pageNum = brandsTotalPages - 4 + i;
                      } else {
                        pageNum = brandsCurrentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setBrandsCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                            brandsCurrentPage === pageNum
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setBrandsCurrentPage(p => Math.min(brandsTotalPages, p + 1))}
                      disabled={brandsCurrentPage === brandsTotalPages}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBrandsCurrentPage(brandsTotalPages)}
                      disabled={brandsCurrentPage === brandsTotalPages}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                      title="Last page"
                    >
                      &gt;&gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Brand Modal */}
          {showCreateBrandModal && (
            <CreateBrandModal
              onClose={() => setShowCreateBrandModal(false)}
              onCreate={handleCreateBrand}
              markets={markets}
            />
          )}

          {/* Brand View Modal */}
          {brandToView && (
            <BrandViewModal
              brand={brandToView}
              onClose={() => setBrandToView(null)}
              markets={markets}
            />
          )}

          {/* Brand Edit Modal */}
          {brandToEdit && (
            <BrandDetailsModal
              brand={brandToEdit}
              onClose={() => setBrandToEdit(null)}
              onUpdate={(id, updates) => {
                handleUpdateBrand(id, updates);
                setBrandToEdit(null);
              }}
              markets={markets}
            />
          )}

          {/* Delete Brand Modal */}
          {brandToDelete && (
            <DeleteBrandModal
              brand={brandToDelete}
              onClose={() => {
                setIsDeleteBrandModalShowing(false);
                setBrandToDelete(null);
              }}
              onConfirm={handleConfirmDeleteBrand}
              isShowing={isDeleteBrandModalShowing}
            />
          )}
        </>
      )}

      {/* Markets Section */}
      {activeSubTab === 'markets' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Markets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {marketsSummary.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Markets</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {marketsSummary.active}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by market name, code, country, or region..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 text-[14px] ::placeholder-[12px] pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
                <button
                  onClick={() => setShowCreateMarketModal(true)}
                  className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Market
                </button>
              </div>
            </div>
          </div>

          {/* Markets Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Market Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Region / Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Currency / Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                      Brands
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
                  {filteredMarkets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <MapPin className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">No markets found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Create your first market to get started
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedMarkets.map((market) => (
                      <tr
                        key={market.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {market.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {market.code}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {market.region} / {market.country}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {market.currency} / {market.language}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {market.brandCount ?? market.brandIds?.length ?? 0} brand{(market.brandCount ?? market.brandIds?.length ?? 0) !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${market.status?.toLowerCase() === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {market.status?.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMarketToView(market);
                              }}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                              title="View Market"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMarketToEdit(market);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              title="Edit Market"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMarketToDelete(market);
                                setIsDeleteMarketModalShowing(true);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Delete Market"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Markets Pagination */}
          {filteredMarkets.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing <span className="font-medium text-gray-900 dark:text-white">{marketsStartIndex + 1}</span> to{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Math.min(marketsEndIndex, filteredMarkets.length)}
                  </span>{' '}
                  of <span className="font-medium text-gray-900 dark:text-white">{filteredMarkets.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMarketsCurrentPage(1)}
                      disabled={marketsCurrentPage === 1}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                      title="First page"
                    >
                      &lt;&lt;
                    </button>
                    <button
                      onClick={() => setMarketsCurrentPage(p => Math.max(1, p - 1))}
                      disabled={marketsCurrentPage === 1}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, marketsTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (marketsTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (marketsCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (marketsCurrentPage >= marketsTotalPages - 2) {
                        pageNum = marketsTotalPages - 4 + i;
                      } else {
                        pageNum = marketsCurrentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setMarketsCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                            marketsCurrentPage === pageNum
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setMarketsCurrentPage(p => Math.min(marketsTotalPages, p + 1))}
                      disabled={marketsCurrentPage === marketsTotalPages}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMarketsCurrentPage(marketsTotalPages)}
                      disabled={marketsCurrentPage === marketsTotalPages}
                      className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                      title="Last page"
                    >
                      &gt;&gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Market Modal */}
          {showCreateMarketModal && (
            <CreateMarketModal
              onClose={() => setShowCreateMarketModal(false)}
              onCreate={handleCreateMarket}
              brands={brands}
            />
          )}

          {/* Market View Modal */}
          {marketToView && (
            <MarketViewModal
              market={marketToView}
              onClose={() => setMarketToView(null)}
              brands={brands}
            />
          )}

          {/* Market Edit Modal */}
          {marketToEdit && (
            <MarketDetailsModal
              market={marketToEdit}
              onClose={() => setMarketToEdit(null)}
              onUpdate={(id, updates) => {
                handleUpdateMarket(id, updates);
                setMarketToEdit(null);
              }}
              brands={brands}
            />
          )}

          {/* Delete Market Modal */}
          {marketToDelete && (
            <DeleteMarketModal
              market={marketToDelete}
              onClose={() => {
                setIsDeleteMarketModalShowing(false);
                setMarketToDelete(null);
              }}
              onConfirm={handleConfirmDeleteMarket}
              isShowing={isDeleteMarketModalShowing}
            />
          )}
        </>
      )}
    </div>
  );
}

// Create Brand Modal
interface CreateBrandModalProps {
  onClose: () => void;
  onCreate: (brandData: any) => void;
  markets: Market[];
}

function CreateBrandModal({ onClose, onCreate, markets }: CreateBrandModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<BrandStatus>('active');
  const [selectedMarkets, setSelectedMarkets] = useState<(string | number)[]>([]);

  const toggleMarket = (marketId: string | number) => {
    setSelectedMarkets((prev) =>
      prev.includes(marketId)
        ? prev.filter((id) => id !== marketId)
        : [...prev, marketId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      status,
      marketIds: selectedMarkets,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New Brand</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Brand"
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., MAIN"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as BrandStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the brand..."
              rows={3}
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Markets
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              {markets.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No markets available</p>
              ) : (
                markets.map((market) => (
                  <label
                    key={market.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMarkets.includes(market.id)}
                      onChange={() => toggleMarket(market.id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {market.name} ({market.code})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-[14px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Brand Modal Component
function DeleteBrandModal({
  brand,
  onClose,
  onConfirm,
  isShowing,
}: {
  brand: Brand;
  onClose: () => void;
  onConfirm: () => void;
  isShowing: boolean;
}) {
  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteBrandModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '28rem' }}
        >
          <div className="modal-content">
            <div className="modal-body text-center py-8 px-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
              </div>
              <h5 id="deleteBrandModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Brand
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{brand.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Brand
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Delete Market Modal Component
function DeleteMarketModal({
  market,
  onClose,
  onConfirm,
  isShowing,
}: {
  market: Market;
  onClose: () => void;
  onConfirm: () => void;
  isShowing: boolean;
}) {
  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteMarketModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '28rem' }}
        >
          <div className="modal-content">
            <div className="modal-body text-center py-8 px-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
              </div>
              <h5 id="deleteMarketModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
                Delete Market
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{market.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3 px-6 pb-6 text-[14px]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2 text-[14px] bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Market
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Delete Localization Modal Component
function DeleteLocalizationModal({
  localization,
  onClose,
  onConfirm,
  isShowing,
}: {
  localization: Localization;
  onClose: () => void;
  onConfirm: () => void;
  isShowing: boolean;
}) {
  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteLocalizationModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '28rem' }}
        >
          <div className="modal-content">
            <div className="modal-body text-center py-8 px-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
              </div>
              <h5 id="deleteLocalizationModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Localization
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete the localization for
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{localization.marketName}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3 px-6 pb-6 text-[14px]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Localization
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Brand Details Modal
interface BrandDetailsModalProps {
  brand: Brand;
  onClose: () => void;
  onUpdate: (brandId: string | number, updates: any) => void;
  markets: Market[];
}

function BrandDetailsModal({ brand, onClose, onUpdate, markets }: BrandDetailsModalProps) {
  const [name, setName] = useState(brand.name);
  const [code, setCode] = useState(brand.code);
  const [description, setDescription] = useState(brand.description);
  const [status, setStatus] = useState<BrandStatus>((brand.status?.toLowerCase() || 'active') as BrandStatus);
  const [selectedMarkets, setSelectedMarkets] = useState<(string | number)[]>(brand.marketIds || []);

  const toggleMarket = (marketId: string | number) => {
    setSelectedMarkets((prev) =>
      prev.includes(marketId)
        ? prev.filter((id) => id !== marketId)
        : [...prev, marketId]
    );
  };

  const handleSave = () => {
    onUpdate(brand.id, {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      status,
      marketIds: selectedMarkets,
    });
    // Modal will close after successful update
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Brand Details</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">{brand.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brand Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Main Brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
                placeholder="e.g., MAIN"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as BrandStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full  px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the brand..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Markets
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              {markets.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No markets available</p>
              ) : (
                markets.map((market) => (
                  <label
                    key={market.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMarkets.includes(market.id)}
                      onChange={() => toggleMarket(market.id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {market.name} ({market.code})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(brand.createdAt).toLocaleString()}
              </span>
            </div>
            {brand.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(brand.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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
    </div>
  );
}

// Brand View Modal (Read-only)
interface BrandViewModalProps {
  brand: Brand;
  onClose: () => void;
  markets: Market[];
}

function BrandViewModal({ brand, onClose, markets }: BrandViewModalProps) {
  const brandMarkets = markets.filter((market) => brand.marketIds?.includes(market.id));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Brand Details</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">{brand.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brand Name
            </label>
            <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
              {brand.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Code
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono">
                {brand.code}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${brand.status?.toLowerCase() === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {brand.status?.toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white min-h-[80px]">
              {brand.description || 'No description'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Markets ({brandMarkets.length})
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-gray-50 dark:bg-gray-700">
              {brandMarkets.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No markets assigned</p>
              ) : (
                brandMarkets.map((market) => (
                  <div key={market.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{market.name} ({market.code})</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(brand.createdAt).toLocaleString()}
              </span>
            </div>
            {brand.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(brand.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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

// Create Market Modal
interface CreateMarketModalProps {
  onClose: () => void;
  onCreate: (marketData: any) => void;
  brands: Brand[];
}

function CreateMarketModal({ onClose, onCreate, brands }: CreateMarketModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('');
  const [status, setStatus] = useState<MarketStatus>('active');
  const [selectedBrands, setSelectedBrands] = useState<(string | number)[]>([]);

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];
  const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR'];
  const timezones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Australia/Sydney',
  ];

  const toggleBrand = (brandId: string | number) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !country.trim() || !region.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      region: region.trim(),
      country: country.trim(),
      currency,
      language,
      timezone: timezone || 'UTC',
      status,
      brandIds: selectedBrands,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New Market</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., United States"
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., US"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as MarketStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., North America"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g., United States"
                className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomDropdown
                value={currency}
                onChange={setCurrency}
                options={currencies.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <CustomDropdown
                value={language}
                onChange={setLanguage}
                options={languages.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <CustomDropdown
              value={timezone}
              onChange={setTimezone}
              options={timezones.map((t) => ({ value: t, label: t }))}
              placeholder="Select timezone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brands
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              {brands.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No brands available</p>
              ) : (
                brands.map((brand) => (
                  <label
                    key={brand.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.id)}
                      onChange={() => toggleBrand(brand.id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {brand.name} ({brand.code})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex text-[14px] items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Market
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Market Details Modal
interface MarketDetailsModalProps {
  market: Market;
  onClose: () => void;
  onUpdate: (marketId: string | number, updates: any) => void;
  brands: Brand[];
}

function MarketDetailsModal({ market, onClose, onUpdate, brands }: MarketDetailsModalProps) {
  const [name, setName] = useState(market.name);
  const [code, setCode] = useState(market.code);
  const [region, setRegion] = useState(market.region);
  const [country, setCountry] = useState(market.country);
  const [currency, setCurrency] = useState(market.currency);
  const [language, setLanguage] = useState(market.language);
  const [timezone, setTimezone] = useState(market.timezone);
  const [status, setStatus] = useState<MarketStatus>((market.status?.toLowerCase() || 'active') as MarketStatus);
  const [selectedBrands, setSelectedBrands] = useState<(string | number)[]>(market.brandIds || []);

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];
  const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR'];
  const timezones = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Australia/Sydney',
  ];

  const toggleBrand = (brandId: string | number) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSave = () => {
    onUpdate(market.id, {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      region: region.trim(),
      country: country.trim(),
      currency,
      language,
      timezone,
      status,
      brandIds: selectedBrands,
    });
    // Modal will close after successful update
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Market Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{market.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter market name"
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter market code"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as MarketStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Enter region"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Enter country"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomDropdown
                value={currency}
                onChange={setCurrency}
                options={currencies.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <CustomDropdown
                value={language}
                onChange={setLanguage}
                options={languages.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <CustomDropdown
              value={timezone}
              onChange={setTimezone}
              options={timezones.map((t) => ({ value: t, label: t }))}
              placeholder="Select timezone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brands
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              {brands.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No brands available</p>
              ) : (
                brands.map((brand) => (
                  <label
                    key={brand.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.id)}
                      onChange={() => toggleBrand(brand.id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {brand.name} ({brand.code})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(market.createdAt).toLocaleString()}
              </span>
            </div>
            {market.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(market.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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
    </div>
  );
}

// Market View Modal (Read-only)
interface MarketViewModalProps {
  market: Market;
  onClose: () => void;
  brands: Brand[];
}

function MarketViewModal({ market, onClose, brands }: MarketViewModalProps) {
  const marketBrands = brands.filter((brand) => market.brandIds?.includes(brand.id));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Market Details</h2>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">{market.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market Name
            </label>
            <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
              {market.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Code
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono">
                {market.code}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${market.status?.toLowerCase() === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {market.status?.toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {market.region}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {market.country}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {market.currency}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {market.language}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {market.timezone}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Brands ({marketBrands.length})
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-gray-50 dark:bg-gray-700">
              {marketBrands.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No brands assigned</p>
              ) : (
                marketBrands.map((brand) => (
                  <div key={brand.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span>{brand.name} ({brand.code})</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(market.createdAt).toLocaleString()}
              </span>
            </div>
            {market.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(market.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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

// Localization Section
function LocalizationSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [localizationToView, setLocalizationToView] = useState<Localization | null>(null);
  const [localizationToEdit, setLocalizationToEdit] = useState<Localization | null>(null);
  const [localizationToDelete, setLocalizationToDelete] = useState<Localization | null>(null);
  const [isDeleteLocalizationModalShowing, setIsDeleteLocalizationModalShowing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch markets from API for localization
  const { data: marketsData, isLoading: marketsLoading } = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      try {
        const response = await api.get('/markets?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching markets:', error);
        return [];
      }
    },
  });

  const markets: Market[] = marketsData || [];

  // Fetch localizations from API
  const { data: localizationsData, isLoading: localizationsLoading } = useQuery({
    queryKey: ['localizations'],
    queryFn: async () => {
      try {
        const response = await api.get('/localizations?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching localizations:', error);
        return [];
      }
    },
  });

  const localizations: Localization[] = localizationsData || [];

  // Filter localizations
  const filteredLocalizations = useMemo(() => {
    let filtered = localizations;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((loc) =>
        loc.marketName.toLowerCase().includes(query) ||
        loc.language.toLowerCase().includes(query) ||
        loc.currency.toLowerCase().includes(query)
      );
    }

    // Filter by market
    if (marketFilter !== 'all') {
      filtered = filtered.filter((loc) => loc.marketId.toString() === marketFilter);
    }

    // Sort by market name
    return filtered.sort((a, b) => a.marketName.localeCompare(b.marketName));
  }, [localizations, searchQuery, marketFilter]);

  // Localization pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLocalizations.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocalizations = filteredLocalizations.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, marketFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = localizations.length;
    const languages = new Set(localizations.map((loc) => loc.language));
    const currencies = new Set(localizations.map((loc) => loc.currency));
    const sizeSystems = new Set(localizations.map((loc) => loc.sizeSystem));

    return {
      total,
      languages: languages.size,
      currencies: currencies.size,
      sizeSystems: sizeSystems.size,
    };
  }, [localizations]);

  const queryClient = useQueryClient();

  // Create localization mutation
  const createLocalizationMutation = useMutation({
    mutationFn: async (localizationData: any) => {
      const response = await api.post('/localizations', {
        ...localizationData,
        sizeSystem: localizationData.sizeSystem?.toUpperCase() || 'US',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localizations'] });
      setShowCreateModal(false);
      toast.success('Localization created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create localization');
    },
  });

  // Update localization mutation
  const updateLocalizationMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: any }) => {
      const response = await api.patch(`/localizations/${id}`, {
        ...updates,
        sizeSystem: updates.sizeSystem?.toUpperCase(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localizations'] });
      toast.success('Localization updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update localization');
    },
  });

  // Delete localization mutation
  const deleteLocalizationMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/localizations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localizations'] });
      toast.success('Localization deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete localization');
    },
  });

  const handleCreateLocalization = (localizationData: any) => {
    createLocalizationMutation.mutate(localizationData);
  };

  const handleUpdateLocalization = (localizationId: string | number, updates: any) => {
    updateLocalizationMutation.mutate({ id: localizationId, updates });
  };

  const handleDeleteLocalization = (localizationId: string | number) => {
    deleteLocalizationMutation.mutate(localizationId);
  };

  const handleConfirmDeleteLocalization = () => {
    if (localizationToDelete) {
      handleDeleteLocalization(localizationToDelete.id);
      setIsDeleteLocalizationModalShowing(false);
      setLocalizationToDelete(null);
    }
  };

  // Show loading state (after all hooks)
  if (marketsLoading || localizationsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Localizations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Languages</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.languages}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Languages className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Currencies</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.currencies}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Size Systems</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.sizeSystems}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Ruler className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by market name, language, or currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[14px] ::placeholder-[12px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={marketFilter}
                onChange={setMarketFilter}
                options={[
                  { value: 'all', label: 'All Markets' },
                  ...markets.map((market: Market) => ({
                    value: market.id.toString(),
                    label: market.name,
                  })),
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Localization
            </button>
          </div>
        </div>
      </div>

      {/* Localizations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Market
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Date Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Size System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLocalizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Globe className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No localizations found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first localization to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLocalizations.map((localization) => (
                  <tr
                    key={localization.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {localization.marketName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {localization.language}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {localization.currency}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {localization.dateFormat}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {localization.sizeSystem}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {localization.weightUnit} / {localization.lengthUnit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalizationToView(localization);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="View Localization"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalizationToEdit(localization);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Edit Localization"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalizationToDelete(localization);
                            setIsDeleteLocalizationModalShowing(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Delete Localization"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Localization Pagination */}
      {filteredLocalizations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredLocalizations.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredLocalizations.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="First page"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="Last page"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Localization Modal */}
      {showCreateModal && (
        <CreateLocalizationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateLocalization}
          markets={markets}
        />
      )}

      {/* Localization View Modal */}
      {localizationToView && (
        <LocalizationViewModal
          localization={localizationToView}
          onClose={() => setLocalizationToView(null)}
          markets={markets}
        />
      )}

      {/* Localization Edit Modal */}
      {localizationToEdit && (
        <LocalizationDetailsModal
          localization={localizationToEdit}
          onClose={() => setLocalizationToEdit(null)}
          onUpdate={(id, updates) => {
            handleUpdateLocalization(id, updates);
            setLocalizationToEdit(null);
          }}
          onDelete={(id) => {
            handleDeleteLocalization(id);
            setLocalizationToEdit(null);
          }}
          markets={markets}
        />
      )}

      {/* Delete Localization Modal */}
      {localizationToDelete && (
        <DeleteLocalizationModal
          localization={localizationToDelete}
          onClose={() => {
            setIsDeleteLocalizationModalShowing(false);
            setLocalizationToDelete(null);
          }}
          onConfirm={handleConfirmDeleteLocalization}
          isShowing={isDeleteLocalizationModalShowing}
        />
      )}
    </div>
  );
}

// Create Localization Modal
interface CreateLocalizationModalProps {
  onClose: () => void;
  onCreate: (localizationData: any) => void;
  markets: Market[];
}

function CreateLocalizationModal({ onClose, onCreate, markets }: CreateLocalizationModalProps) {
  const [marketId, setMarketId] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [numberFormat, setNumberFormat] = useState('1,234.56');
  const [sizeSystem, setSizeSystem] = useState<SizeSystem>('US');
  const [weightUnit, setWeightUnit] = useState('lb');
  const [lengthUnit, setLengthUnit] = useState('in');

  const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR'];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];
  const dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'];
  const timeFormats = ['12h', '24h'];
  const numberFormats = ['1,234.56', '1.234,56', '1 234,56'];
  const sizeSystems: SizeSystem[] = ['US', 'EU', 'UK', 'JP', 'CN', 'AU'];
  const weightUnits = ['lb', 'kg', 'g', 'oz'];
  const lengthUnits = ['in', 'cm', 'mm', 'ft', 'm'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId) {
      toast.error('Please select a market');
      return;
    }
    onCreate({
      marketId: parseInt(marketId),
      language,
      currency,
      dateFormat,
      timeFormat,
      numberFormat,
      sizeSystem,
      weightUnit,
      lengthUnit,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New Localization</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              value={marketId}
              onChange={setMarketId}
              options={markets.map((market: Market) => ({
                value: market.id.toString(),
                label: `${market.name} (${market.code})`,
              }))}
              placeholder="Select a market"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <CustomDropdown
                value={language}
                onChange={setLanguage}
                options={languages.map((l) => ({ value: l, label: l }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomDropdown
                value={currency}
                onChange={setCurrency}
                options={currencies.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Format
              </label>
              <CustomDropdown
                value={dateFormat}
                onChange={setDateFormat}
                options={dateFormats.map((f) => ({ value: f, label: f }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Format
              </label>
              <CustomDropdown
                value={timeFormat}
                onChange={setTimeFormat}
                options={timeFormats.map((f) => ({ value: f, label: f }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number Format
              </label>
              <CustomDropdown
                value={numberFormat}
                onChange={setNumberFormat}
                options={numberFormats.map((f) => ({ value: f, label: f }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Size System
              </label>
              <CustomDropdown
                value={sizeSystem}
                onChange={(value) => setSizeSystem(value as SizeSystem)}
                options={sizeSystems.map((s) => ({ value: s, label: s }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weight Unit
              </label>
              <CustomDropdown
                value={weightUnit}
                onChange={setWeightUnit}
                options={weightUnits.map((u) => ({ value: u, label: u }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Length Unit
              </label>
              <CustomDropdown
                value={lengthUnit}
                onChange={setLengthUnit}
                options={lengthUnits.map((u) => ({ value: u, label: u }))}
              />
            </div>
          </div>

          <div className="flex text-[14px] items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Localization
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Localization Details Modal
interface LocalizationViewModalProps {
  localization: Localization;
  onClose: () => void;
  markets: Market[];
}

function LocalizationViewModal({ localization, onClose, markets }: LocalizationViewModalProps) {
  const market = markets.find((m) => m.id.toString() === localization.marketId.toString());

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">View Localization</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{localization.marketName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market
            </label>
            <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
              {market ? `${market.name} (${market.code})` : localization.marketName}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.language}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.currency}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Format
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.dateFormat}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Format
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.timeFormat}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number Format
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.numberFormat}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Size System
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.sizeSystem}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weight Unit
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.weightUnit}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Length Unit
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {localization.lengthUnit}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(localization.createdAt).toLocaleString()}
              </span>
            </div>
            {localization.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(localization.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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

interface LocalizationDetailsModalProps {
  localization: Localization;
  onClose: () => void;
  onUpdate: (localizationId: string | number, updates: any) => void;
  onDelete: (localizationId: string | number) => void;
  markets: Market[];
}

function LocalizationDetailsModal({ localization, onClose, onUpdate, markets }: LocalizationDetailsModalProps) {
  const [marketId, setMarketId] = useState(localization.marketId.toString());
  const [language, setLanguage] = useState(localization.language);
  const [currency, setCurrency] = useState(localization.currency);
  const [dateFormat, setDateFormat] = useState(localization.dateFormat);
  const [timeFormat, setTimeFormat] = useState(localization.timeFormat);
  const [numberFormat, setNumberFormat] = useState(localization.numberFormat);
  const [sizeSystem, setSizeSystem] = useState<SizeSystem>(localization.sizeSystem);
  const [weightUnit, setWeightUnit] = useState(localization.weightUnit);
  const [lengthUnit, setLengthUnit] = useState(localization.lengthUnit);

  const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR'];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];
  const dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'];
  const timeFormats = ['12h', '24h'];
  const numberFormats = ['1,234.56', '1.234,56', '1 234,56'];
  const sizeSystems: SizeSystem[] = ['US', 'EU', 'UK', 'JP', 'CN', 'AU'];
  const weightUnits = ['lb', 'kg', 'g', 'oz'];
  const lengthUnits = ['in', 'cm', 'mm', 'ft', 'm'];

  const handleSave = () => {
    onUpdate(localization.id, {
      marketId: parseInt(marketId),
      language,
      currency,
      dateFormat,
      timeFormat,
      numberFormat,
      sizeSystem,
      weightUnit,
      lengthUnit,
    });
    // Modal will close after successful update
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Localization</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{localization.marketName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Market
            </label>
            <CustomDropdown
              value={marketId}
              onChange={setMarketId}
              options={markets.map((market: Market) => ({
                value: market.id.toString(),
                label: `${market.name} (${market.code})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <CustomDropdown
                value={language}
                onChange={setLanguage}
                options={languages.map((l) => ({ value: l, label: l }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomDropdown
                value={currency}
                onChange={setCurrency}
                options={currencies.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Format
              </label>
              <CustomDropdown
                value={dateFormat}
                onChange={setDateFormat}
                options={dateFormats.map((f) => ({ value: f, label: f }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Format
              </label>
              <CustomDropdown
                value={timeFormat}
                onChange={setTimeFormat}
                options={timeFormats.map((f) => ({ value: f, label: f }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number Format
              </label>
              <CustomDropdown
                value={numberFormat}
                onChange={setNumberFormat}
                options={numberFormats.map((f) => ({ value: f, label: f }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Size System
              </label>
              <CustomDropdown
                value={sizeSystem}
                onChange={(value) => setSizeSystem(value as SizeSystem)}
                options={sizeSystems.map((s) => ({ value: s, label: s }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Weight Unit
              </label>
              <CustomDropdown
                value={weightUnit}
                onChange={setWeightUnit}
                options={weightUnits.map((u) => ({ value: u, label: u }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Length Unit
              </label>
              <CustomDropdown
                value={lengthUnit}
                onChange={setLengthUnit}
                options={lengthUnits.map((u) => ({ value: u, label: u }))}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(localization.createdAt).toLocaleString()}
              </span>
            </div>
            {localization.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(localization.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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
    </div>
  );
}
