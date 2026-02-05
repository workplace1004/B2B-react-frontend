import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Building,
  Plus,
  Search,
  Filter,
  ChevronDown,
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
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'multi-brand-market' | 'localization';
type BrandStatus = 'active' | 'inactive';
type MarketStatus = 'active' | 'inactive';
type SizeSystem = 'US' | 'EU' | 'UK' | 'JP' | 'CN' | 'AU';

interface Brand {
  id: string | number;
  name: string;
  code: string;
  description: string;
  logo?: string;
  status: BrandStatus;
  marketIds: (string | number)[];
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

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function CustomDropdown({ value, onChange, options, placeholder }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-between cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'hover:border-gray-400 dark:hover:border-gray-500'
          }`}
      >
        <span>{selectedOption?.label || placeholder || 'Select...'}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${option.value === value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [showCreateMarketModal, setShowCreateMarketModal] = useState(false);

  // Load brands from localStorage
  const [brands, setBrands] = useState<Brand[]>(() => {
    const saved = localStorage.getItem('organization-brands');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default brands
    return [
      {
        id: 1,
        name: 'Main Brand',
        code: 'MAIN',
        description: 'Primary brand for the organization',
        status: 'active' as BrandStatus,
        marketIds: [1, 2],
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Premium Brand',
        code: 'PREMIUM',
        description: 'Premium product line',
        status: 'active' as BrandStatus,
        marketIds: [1],
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Load markets from localStorage
  const [markets, setMarkets] = useState<Market[]>(() => {
    const saved = localStorage.getItem('organization-markets');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default markets
    return [
      {
        id: 1,
        name: 'United States',
        code: 'US',
        region: 'North America',
        country: 'United States',
        currency: 'USD',
        language: 'en-US',
        timezone: 'America/New_York',
        status: 'active' as MarketStatus,
        brandIds: [1, 2],
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'United Kingdom',
        code: 'GB',
        region: 'Europe',
        country: 'United Kingdom',
        currency: 'GBP',
        language: 'en-GB',
        timezone: 'Europe/London',
        status: 'active' as MarketStatus,
        brandIds: [1],
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Germany',
        code: 'DE',
        region: 'Europe',
        country: 'Germany',
        currency: 'EUR',
        language: 'de-DE',
        timezone: 'Europe/Berlin',
        status: 'active' as MarketStatus,
        brandIds: [],
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('organization-brands', JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem('organization-markets', JSON.stringify(markets));
  }, [markets]);

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
      filtered = filtered.filter((brand) => brand.status === statusFilter);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [brands, searchQuery, statusFilter]);

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
      filtered = filtered.filter((market) => market.status === statusFilter);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [markets, searchQuery, statusFilter]);

  // Calculate summary metrics
  const brandsSummary = useMemo(() => {
    const total = brands.length;
    const active = brands.filter((brand) => brand.status === 'active');
    return { total, active: active.length };
  }, [brands]);

  const marketsSummary = useMemo(() => {
    const total = markets.length;
    const active = markets.filter((market) => market.status === 'active');
    return { total, active: active.length };
  }, [markets]);

  const handleCreateBrand = (brandData: any) => {
    const newBrand: Brand = {
      id: Date.now(),
      ...brandData,
      createdAt: new Date().toISOString(),
    };
    setBrands([...brands, newBrand]);
    setShowCreateBrandModal(false);
    toast.success('Brand created successfully!');
  };

  const handleUpdateBrand = (brandId: string | number, updates: any) => {
    setBrands(brands.map((brand) =>
      brand.id === brandId
        ? { ...brand, ...updates, updatedAt: new Date().toISOString() }
        : brand
    ));
    toast.success('Brand updated successfully!');
  };

  const handleDeleteBrand = (brandId: string | number) => {
    setBrands(brands.filter((brand) => brand.id !== brandId));
    // Remove brand from markets
    setMarkets(markets.map((market) => ({
      ...market,
      brandIds: market.brandIds.filter((id) => id !== brandId),
    })));
    toast.success('Brand deleted successfully!');
  };

  const handleCreateMarket = (marketData: any) => {
    const newMarket: Market = {
      id: Date.now(),
      ...marketData,
      createdAt: new Date().toISOString(),
    };
    setMarkets([...markets, newMarket]);
    setShowCreateMarketModal(false);
    toast.success('Market created successfully!');
  };

  const handleUpdateMarket = (marketId: string | number, updates: any) => {
    setMarkets(markets.map((market) =>
      market.id === marketId
        ? { ...market, ...updates, updatedAt: new Date().toISOString() }
        : market
    ));
    toast.success('Market updated successfully!');
  };

  const handleDeleteMarket = (marketId: string | number) => {
    setMarkets(markets.filter((market) => market.id !== marketId));
    // Remove market from brands
    setBrands(brands.map((brand) => ({
      ...brand,
      marketIds: brand.marketIds.filter((id) => id !== marketId),
    })));
    toast.success('Market deleted successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by brand name, code, or description..."
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
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
                <button
                  onClick={() => setShowCreateBrandModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New Brand
                </button>
              </div>
            </div>
          </div>

          {/* Brands Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                    filteredBrands.map((brand) => (
                      <tr
                        key={brand.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => setSelectedBrand(brand)}
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
                            {brand.marketIds.length} market{brand.marketIds.length !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            brand.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {brand.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBrand(brand);
                              }}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBrand(brand.id);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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

          {/* Create Brand Modal */}
          {showCreateBrandModal && (
            <CreateBrandModal
              onClose={() => setShowCreateBrandModal(false)}
              onCreate={handleCreateBrand}
              markets={markets}
            />
          )}

          {/* Brand Details Modal */}
          {selectedBrand && (
            <BrandDetailsModal
              brand={selectedBrand}
              onClose={() => setSelectedBrand(null)}
              onUpdate={handleUpdateBrand}
              onDelete={handleDeleteBrand}
              markets={markets}
            />
          )}
        </>
      )}

      {/* Markets Section */}
      {activeSubTab === 'markets' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by market name, code, country, or region..."
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
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
                <button
                  onClick={() => setShowCreateMarketModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New Market
                </button>
              </div>
            </div>
          </div>

          {/* Markets Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                    filteredMarkets.map((market) => (
                      <tr
                        key={market.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => setSelectedMarket(market)}
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
                            {market.brandIds.length} brand{market.brandIds.length !== 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            market.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {market.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMarket(market);
                              }}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMarket(market.id);
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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

          {/* Create Market Modal */}
          {showCreateMarketModal && (
            <CreateMarketModal
              onClose={() => setShowCreateMarketModal(false)}
              onCreate={handleCreateMarket}
              brands={brands}
            />
          )}

          {/* Market Details Modal */}
          {selectedMarket && (
            <MarketDetailsModal
              market={selectedMarket}
              onClose={() => setSelectedMarket(null)}
              onUpdate={handleUpdateMarket}
              onDelete={handleDeleteMarket}
              brands={brands}
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Brand</h2>
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
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Brand"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Brand Details Modal
interface BrandDetailsModalProps {
  brand: Brand;
  onClose: () => void;
  onUpdate: (brandId: string | number, updates: any) => void;
  onDelete: (brandId: string | number) => void;
  markets: Market[];
}

function BrandDetailsModal({ brand, onClose, onUpdate, onDelete, markets }: BrandDetailsModalProps) {
  const [name, setName] = useState(brand.name);
  const [code, setCode] = useState(brand.code);
  const [description, setDescription] = useState(brand.description);
  const [status, setStatus] = useState<BrandStatus>(brand.status);
  const [selectedMarkets, setSelectedMarkets] = useState<(string | number)[]>(brand.marketIds);

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
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      onDelete(brand.id);
      onClose();
    }
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Brand Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{brand.name}</p>
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
              Brand Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Market</h2>
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
  onDelete: (marketId: string | number) => void;
  brands: Brand[];
}

function MarketDetailsModal({ market, onClose, onUpdate, onDelete, brands }: MarketDetailsModalProps) {
  const [name, setName] = useState(market.name);
  const [code, setCode] = useState(market.code);
  const [region, setRegion] = useState(market.region);
  const [country, setCountry] = useState(market.country);
  const [currency, setCurrency] = useState(market.currency);
  const [language, setLanguage] = useState(market.language);
  const [timezone, setTimezone] = useState(market.timezone);
  const [status, setStatus] = useState<MarketStatus>(market.status);
  const [selectedBrands, setSelectedBrands] = useState<(string | number)[]>(market.brandIds);

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
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this market?')) {
      onDelete(market.id);
      onClose();
    }
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Market Details</h2>
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
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

// Localization Section
function LocalizationSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [selectedLocalization, setSelectedLocalization] = useState<Localization | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get markets for localization
  const markets = useMemo(() => {
    const saved = localStorage.getItem('organization-markets');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  }, []);

  // Load localizations from localStorage
  const [localizations, setLocalizations] = useState<Localization[]>(() => {
    const saved = localStorage.getItem('organization-localizations');
    if (saved) {
      return JSON.parse(saved);
    }
    // Generate default localizations from markets
    const defaultLocalizations: Localization[] = markets.map((market: Market) => ({
      id: market.id,
      marketId: market.id,
      marketName: market.name,
      language: market.language,
      currency: market.currency,
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      numberFormat: '1,234.56',
      sizeSystem: 'US' as SizeSystem,
      weightUnit: 'lb',
      lengthUnit: 'in',
      createdAt: new Date().toISOString(),
    }));
    return defaultLocalizations;
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('organization-localizations', JSON.stringify(localizations));
  }, [localizations]);

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

  const handleCreateLocalization = (localizationData: any) => {
    const market = markets.find((m: Market) => m.id.toString() === localizationData.marketId);
    const newLocalization: Localization = {
      id: Date.now(),
      ...localizationData,
      marketName: market?.name || 'Unknown Market',
      createdAt: new Date().toISOString(),
    };
    setLocalizations([...localizations, newLocalization]);
    setShowCreateModal(false);
    toast.success('Localization created successfully!');
  };

  const handleUpdateLocalization = (localizationId: string | number, updates: any) => {
    const market = markets.find((m: Market) => m.id.toString() === updates.marketId);
    setLocalizations(localizations.map((loc) =>
      loc.id === localizationId
        ? {
            ...loc,
            ...updates,
            marketName: market?.name || loc.marketName,
            updatedAt: new Date().toISOString(),
          }
        : loc
    ));
    toast.success('Localization updated successfully!');
  };

  const handleDeleteLocalization = (localizationId: string | number) => {
    setLocalizations(localizations.filter((loc) => loc.id !== localizationId));
    toast.success('Localization deleted successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by market name, language, or currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Localization
            </button>
          </div>
        </div>
      </div>

      {/* Localizations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                filteredLocalizations.map((localization) => (
                  <tr
                    key={localization.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setSelectedLocalization(localization)}
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
                            setSelectedLocalization(localization);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocalization(localization.id);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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

      {/* Create Localization Modal */}
      {showCreateModal && (
        <CreateLocalizationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateLocalization}
          markets={markets}
        />
      )}

      {/* Localization Details Modal */}
      {selectedLocalization && (
        <LocalizationDetailsModal
          localization={selectedLocalization}
          onClose={() => setSelectedLocalization(null)}
          onUpdate={handleUpdateLocalization}
          onDelete={handleDeleteLocalization}
          markets={markets}
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
      marketId,
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Localization</h2>
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
              options={[
                { value: '', label: 'Select a market...' },
                ...markets.map((market: Market) => ({
                  value: market.id.toString(),
                  label: `${market.name} (${market.code})`,
                })),
              ]}
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
interface LocalizationDetailsModalProps {
  localization: Localization;
  onClose: () => void;
  onUpdate: (localizationId: string | number, updates: any) => void;
  onDelete: (localizationId: string | number) => void;
  markets: Market[];
}

function LocalizationDetailsModal({ localization, onClose, onUpdate, onDelete, markets }: LocalizationDetailsModalProps) {
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
      marketId,
      language,
      currency,
      dateFormat,
      timeFormat,
      numberFormat,
      sizeSystem,
      weightUnit,
      lengthUnit,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this localization?')) {
      onDelete(localization.id);
      onClose();
    }
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Localization Details</h2>
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
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
