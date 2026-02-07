import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  CheckCircle,
  X,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowUpDown,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import api from '../lib/api';
import { CustomDropdown, DeleteModal } from '../components/ui';
import { SkeletonStatsCard, SkeletonTable, SkeletonForm } from '../components/Skeleton';

type TabType = 'fx-rates' | 'market-settings';

export default function MultiCurrencyFX() {
  const [activeTab, setActiveTab] = useState<TabType>('fx-rates');

  const tabs = [
    { id: 'fx-rates' as TabType, label: 'FX Rates', icon: DollarSign },
    { id: 'market-settings' as TabType, label: 'Market Currency Settings', icon: Settings },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Multi-Currency & FX" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Multi-Currency & FX</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Foreign exchange rates and market currency settings management
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
        {activeTab === 'fx-rates' && <FXRatesSection />}
        {activeTab === 'market-settings' && <MarketCurrencySettingsSection />}
      </div>
    </div>
  );
}

// FX Rates Section
function FXRatesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Fetch currencies from API
  const { data: currenciesData, isLoading: currenciesLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      try {
        const response = await api.get('/currencies');
        return response.data?.data || response.data || [];
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
  });

  const currencies = currenciesData || [];

  // Fetch FX rates from API
  const { data: fxRatesData, isLoading: fxRatesLoading, refetch: refetchFxRates } = useQuery({
    queryKey: ['fx-rates', baseCurrency],
    queryFn: async () => {
      try {
        const response = await api.get(`/fx-rates?baseCurrency=${baseCurrency}`);
        return response.data?.data || response.data || [];
      } catch (error) {
        console.error('Error fetching FX rates:', error);
        return [];
      }
    },
  });

  const fxRates = fxRatesData || [];

  // Filter rates
  const filteredRates = useMemo(() => {
    let filtered = fxRates.filter((rate: any) => rate.fromCurrency === baseCurrency);

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((rate: any) =>
          rate.toCurrency.toLowerCase().includes(query) ||
          currencies.find((c: any) => c.code === rate.toCurrency)?.name.toLowerCase().includes(query)
        );
      }

    // Sort by currency code
    return filtered.sort((a: any, b: any) => a.toCurrency.localeCompare(b.toCurrency));
  }, [fxRates, baseCurrency, searchQuery, currencies]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRates.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRates = filteredRates.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, baseCurrency]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRates = filteredRates.length;
    const increased = filteredRates.filter((rate: any) => rate.change > 0);
    const decreased = filteredRates.filter((rate: any) => rate.change < 0);
    const unchanged = filteredRates.filter((rate: any) => rate.change === 0);

    return {
      total: totalRates,
      increased: increased.length,
      decreased: decreased.length,
      unchanged: unchanged.length,
    };
  }, [filteredRates]);

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      const response = await api.post('/fx-rates/refresh', { baseCurrency });
      if (response.data) {
        // Invalidate and refetch FX rates
        await queryClient.invalidateQueries({ queryKey: ['fx-rates'] });
        await refetchFxRates();
        toast.success('FX rates updated successfully!');
      }
    } catch (error: any) {
      console.error('Error refreshing FX rates:', error);
      toast.error(error.response?.data?.message || 'Failed to refresh FX rates');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getCurrencyInfo = (code: string) => {
    return currencies.find((c: any) => c.code === code) || { code, name: code, symbol: code };
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return ArrowUpDown;
  };

  if (currenciesLoading || fxRatesLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full sm:max-w-md"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        
        {/* Table Skeleton */}
        <SkeletonTable rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Increased</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.increased}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Decreased</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.decreased}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Unchanged</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                {summaryMetrics.unchanged}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <ArrowUpDown className="w-6 h-6 text-gray-600 dark:text-gray-400" />
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
              placeholder="Search by currency code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={baseCurrency}
                onChange={setBaseCurrency}
                options={currencies.map((c: any) => ({
                  value: c.code,
                  label: `${c.code} - ${c.name}`,
                }))}
              />
            </div>
            <button
              onClick={handleRefreshRates}
              disabled={isRefreshing}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Rates
            </button>
          </div>
        </div>
      </div>

      {/* FX Rates Table */}
      {filteredRates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No FX rates found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'No exchange rates found. Click "Refresh Rates" to load current rates.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Currency Pair
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Exchange Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Previous Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Change %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedRates.map((rate: any) => {
                  const toCurrencyInfo = getCurrencyInfo(rate.toCurrency);
                  const ChangeIcon = getChangeIcon(rate.change);
                  return (
                    <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {rate.fromCurrency}/{rate.toCurrency}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {toCurrencyInfo.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {rate.rate.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {rate.previousRate.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor(rate.change)}`}>
                          <ChangeIcon className="w-4 h-4" />
                          {rate.change > 0 ? '+' : ''}{rate.change.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getChangeColor(rate.changePercent)}`}>
                          {rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(rate.lastUpdated).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(rate.lastUpdated).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {rate.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedRate(rate)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
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

      {/* Pagination */}
      {filteredRates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredRates.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredRates.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                <CustomDropdown
                  value={itemsPerPage.toString()}
                  onChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                />
              </div>
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
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${currentPage === pageNum
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

      {/* FX Rate Details Modal */}
      {selectedRate && (
        <FXRateDetailsModal rate={selectedRate} onClose={() => setSelectedRate(null)} currencies={currencies} />
      )}
    </div>
  );
}

// FX Rate Details Modal Component
interface FXRateDetailsModalProps {
  rate: any;
  onClose: () => void;
  currencies: any[];
}

function FXRateDetailsModal({ rate, onClose, currencies }: FXRateDetailsModalProps) {
  if (!rate) return null;

  const fromCurrencyInfo = currencies.find((c: any) => c.code === rate.fromCurrency) || {
    code: rate.fromCurrency,
    name: rate.fromCurrency,
    symbol: rate.fromCurrency,
  };
  const toCurrencyInfo = currencies.find((c: any) => c.code === rate.toCurrency) || {
    code: rate.toCurrency,
    name: rate.toCurrency,
    symbol: rate.toCurrency,
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return ArrowUpDown;
  };

  const ChangeIcon = getChangeIcon(rate.change);

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
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">FX Rate Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {rate.fromCurrency}/{rate.toCurrency}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Rate Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {rate.rate.toFixed(4)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  1 {fromCurrencyInfo.code} = {rate.rate.toFixed(4)} {toCurrencyInfo.code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Change</p>
                <div className={`flex items-center gap-1 text-2xl font-bold mt-1 ${getChangeColor(rate.change)}`}>
                  <ChangeIcon className="w-6 h-6" />
                  {rate.change > 0 ? '+' : ''}{rate.change.toFixed(4)}
                </div>
                <p className={`text-sm font-medium mt-1 ${getChangeColor(rate.changePercent)}`}>
                  {rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Currency Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">From Currency</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Code</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {fromCurrencyInfo.code}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {fromCurrencyInfo.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Symbol</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {fromCurrencyInfo.symbol}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">To Currency</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Code</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {toCurrencyInfo.code}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {toCurrencyInfo.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Symbol</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {toCurrencyInfo.symbol}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Information */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Rate Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Rate</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {rate.rate.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Previous Rate</p>
                <p className="text-lg font-bold text-gray-500 dark:text-gray-400 mt-1">
                  {rate.previousRate.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Change</p>
                <p className={`text-lg font-bold mt-1 ${getChangeColor(rate.change)}`}>
                  {rate.change > 0 ? '+' : ''}{rate.change.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Change Percentage</p>
                <p className={`text-lg font-bold mt-1 ${getChangeColor(rate.changePercent)}`}>
                  {rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Metadata</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {new Date(rate.lastUpdated).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Source</p>
                <span className="mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {rate.source}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Market Currency Settings Section
function MarketCurrencySettingsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [marketToView, setMarketToView] = useState<any>(null);
  const [marketToEdit, setMarketToEdit] = useState<any>(null);
  const [marketToDelete, setMarketToDelete] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Fetch markets from API
  const { data: marketsData, isLoading: marketsLoading } = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      try {
        const response = await api.get('/markets');
        return response.data?.data || response.data || [];
      } catch (error) {
        console.error('Error fetching markets:', error);
        return [];
      }
    },
  });

  const markets = marketsData || [];

  // Fetch market currency settings from API
  const { data: marketSettingsData, isLoading: marketSettingsLoading, refetch: refetchMarketSettings } = useQuery({
    queryKey: ['market-currency-settings'],
    queryFn: async () => {
      try {
        const response = await api.get('/market-currency-settings');
        return response.data?.data || response.data || [];
      } catch (error) {
        console.error('Error fetching market currency settings:', error);
        return [];
      }
    },
  });

  const marketSettings = marketSettingsData || [];

  // Filter markets
  const filteredMarkets = useMemo(() => {
    let filtered = marketSettings;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((market: any) =>
        market.marketName.toLowerCase().includes(query) ||
        market.marketCode.toLowerCase().includes(query) ||
        market.region.toLowerCase().includes(query)
      );
    }

    // Sort by market name
    return filtered.sort((a: any, b: any) => a.marketName.localeCompare(b.marketName));
  }, [marketSettings, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMarkets = filteredMarkets.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredMarkets.length;
    const active = filteredMarkets.filter((market: any) => market.isActive);
    const autoUpdate = filteredMarkets.filter((market: any) => market.autoUpdateRates);

    return {
      total,
      active: active.length,
      autoUpdate: autoUpdate.length,
    };
  }, [filteredMarkets]);

  const handleCreateMarket = async (marketData: any) => {
    try {
      const response = await api.post('/market-currency-settings', marketData);
      if (response.data) {
        await queryClient.invalidateQueries({ queryKey: ['market-currency-settings'] });
        await refetchMarketSettings();
        setShowCreateModal(false);
        toast.success('Market currency setting created successfully!');
      }
    } catch (error: any) {
      console.error('Error creating market setting:', error);
      toast.error(error.response?.data?.message || 'Failed to create market currency setting');
    }
  };

  const handleUpdateMarket = async (marketId: string, updates: any) => {
    try {
      const response = await api.put(`/market-currency-settings/${marketId}`, updates);
      if (response.data) {
        await queryClient.invalidateQueries({ queryKey: ['market-currency-settings'] });
        await refetchMarketSettings();
        toast.success('Market currency setting updated successfully!');
      }
    } catch (error: any) {
      console.error('Error updating market setting:', error);
      toast.error(error.response?.data?.message || 'Failed to update market currency setting');
    }
  };

  const handleDeleteMarket = async (marketId: string) => {
    try {
      const response = await api.delete(`/market-currency-settings/${marketId}`);
      if (response.data) {
        await queryClient.invalidateQueries({ queryKey: ['market-currency-settings'] });
        await refetchMarketSettings();
        setShowDeleteModal(false);
        setMarketToDelete(null);
        toast.success('Market currency setting deleted successfully!');
      }
    } catch (error: any) {
      console.error('Error deleting market setting:', error);
      toast.error(error.response?.data?.message || 'Failed to delete market currency setting');
    }
  };

  if (marketsLoading || marketSettingsLoading) {
    return (
      <div className="space-y-6">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>
        
        {/* Filters Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full sm:max-w-md"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        
        {/* Table Skeleton */}
        <SkeletonTable rows={10} />
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Markets</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Markets</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.active}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auto-Update Enabled</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.autoUpdate}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              placeholder="Search by market name, code, or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-[14px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Market
          </button>
        </div>
      </div>

      {/* Market Settings Table */}
      {filteredMarkets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No market settings found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'No market currency settings configured. Create a new market setting to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Market
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Default Currency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Supported Currencies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Auto-Update
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
                {paginatedMarkets.map((market: any) => (
                  <tr key={market.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {market.marketName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {market.marketCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {market.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {market.defaultCurrency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {market.supportedCurrencies.map((currency: string) => (
                          <span
                            key={currency}
                            className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {currency}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${market.autoUpdateRates
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                        {market.autoUpdateRates ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${market.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                        {market.isActive ? 'Active' : 'Inactive'}
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
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Delete Market"
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
        </div>
      )}

      {/* Pagination */}
      {filteredMarkets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredMarkets.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredMarkets.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                <CustomDropdown
                  value={itemsPerPage.toString()}
                  onChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                />
              </div>
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
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${currentPage === pageNum
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

      {/* Create Market Modal */}
      {showCreateModal && (
        <CreateMarketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMarket}
        />
      )}

      {/* View Market Modal */}
      {marketToView && (
        <MarketViewModal
          market={marketToView}
          onClose={() => setMarketToView(null)}
        />
      )}

      {/* Edit Market Modal */}
      {marketToEdit && (
        <MarketEditModal
          market={marketToEdit}
          onClose={() => setMarketToEdit(null)}
          onUpdate={handleUpdateMarket}
          markets={markets}
        />
      )}

      {/* Delete Market Modal */}
      {showDeleteModal && marketToDelete && (
        <DeleteModal
          title="Delete Market Currency Setting"
          message="Are you sure you want to delete the market currency setting for"
          itemName={`${marketToDelete.marketName} (${marketToDelete.marketCode})`}
          onClose={() => {
            setShowDeleteModal(false);
            setMarketToDelete(null);
          }}
          onConfirm={() => handleDeleteMarket(marketToDelete.id)}
        />
      )}
    </div>
  );
}

// Create Market Modal Component
interface CreateMarketModalProps {
  onClose: () => void;
  onCreate: (marketData: any) => void;
  markets?: { code: string; name: string; region: string }[];
}

function CreateMarketModal({ onClose, onCreate }: CreateMarketModalProps) {
  const [marketCode, setMarketCode] = useState('');
  const [marketName, setMarketName] = useState('');
  const [region, setRegion] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(['USD']);
  const [isActive, setIsActive] = useState(true);
  const [autoUpdateRates, setAutoUpdateRates] = useState(true);
  const [roundingPrecision, setRoundingPrecision] = useState(2);

  // Fetch currencies for dropdown options
  const { data: currencyOptionsData, isLoading: isLoadingCurrencies } = useQuery({
    queryKey: ['currencies', 'options'],
    queryFn: async () => {
      try {
        const response = await api.get('/currencies');
        const currencies = response.data?.data || response.data || [];
        return currencies.map((c: any) => c.code);
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];
      }
    },
  });

  const currencyOptions = currencyOptionsData || ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketCode.trim() || !marketName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      marketCode: marketCode.trim(),
      marketName: marketName.trim(),
      region: region.trim(),
      defaultCurrency,
      supportedCurrencies,
      isActive,
      autoUpdateRates,
      roundingPrecision: parseInt(roundingPrecision.toString()),
    });
    // Reset form
    setMarketCode('');
    setMarketName('');
    setRegion('');
    setDefaultCurrency('USD');
    setSupportedCurrencies(['USD']);
    setIsActive(true);
    setAutoUpdateRates(true);
    setRoundingPrecision(2);
  };

  const toggleCurrency = (currency: string) => {
    if (supportedCurrencies.includes(currency)) {
      if (supportedCurrencies.length > 1) {
        setSupportedCurrencies(supportedCurrencies.filter((c) => c !== currency));
      } else {
        toast.error('At least one currency must be supported');
      }
    } else {
      setSupportedCurrencies([...supportedCurrencies, currency]);
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
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create Market Currency Setting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoadingCurrencies ? (
          <div className="p-6">
            <SkeletonForm fields={6} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Market Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={marketCode}
                  onChange={(e) => setMarketCode(e.target.value)}
                  className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., US, GB, EU"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Market Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                  className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., United States"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., North America, Europe, Asia"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Currency
              </label>
              <div className="min-w-[240px]">
                <CustomDropdown
                  value={defaultCurrency}
                  onChange={setDefaultCurrency}
                  options={currencyOptions.map((c: string) => ({ value: c, label: c }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supported Currencies
              </label>
              <div className="grid grid-cols-4 gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                {currencyOptions.map((currency: string) => (
                  <label key={currency} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={supportedCurrencies.includes(currency)}
                      onChange={() => toggleCurrency(currency)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{currency}</span>
                  </label>
                ))}
              </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Selected: {supportedCurrencies.join(', ')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rounding Precision
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={roundingPrecision}
                  onChange={(e) => setRoundingPrecision(parseInt(e.target.value) || 2)}
                  placeholder="2"
                  className="w-full px-4 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-3 h-full justify-end flex flex-col">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActiveCreate"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isActiveCreate" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Active (market will be available for use)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoUpdateCreate"
                  checked={autoUpdateRates}
                  onChange={(e) => setAutoUpdateRates(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="autoUpdateCreate" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Auto-update FX rates for this market
                </label>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 text-[14px] pt-0 flex justify-end gap-2">
            <div className='flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-6 w-full justify-end'>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

// Market View Modal Component (Read-only)
interface MarketViewModalProps {
  market: any;
  onClose: () => void;
}

function MarketViewModal({ market, onClose }: MarketViewModalProps) {
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">View Market Currency Setting</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{market.marketName} ({market.marketCode})</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${market.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                  {market.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Auto-Update</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${market.autoUpdateRates
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                  {market.autoUpdateRates ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Market Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Code
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {market.marketCode}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Name
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {market.marketName}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Region
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              {market.region}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Currency
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              {market.defaultCurrency}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Supported Currencies
            </label>
            <div className="flex flex-wrap gap-2">
              {market.supportedCurrencies?.map((currency: string) => (
                <span
                  key={currency}
                  className="px-3 py-1 text-sm font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                >
                  {currency}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rounding Precision
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              {market.roundingPrecision || 2}
            </div>
          </div>

          {market.createdAt && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Created: {new Date(market.createdAt).toLocaleString()}</p>
              {market.updatedAt && (
                <p>Last Updated: {new Date(market.updatedAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Market Edit Modal Component (Editable)
interface MarketEditModalProps {
  market: any;
  onClose: () => void;
  onUpdate: (marketId: string, updates: any) => void;
  markets: { code: string; name: string; region: string }[];
}

function MarketEditModal({ market, onClose, onUpdate }: MarketEditModalProps) {
  const [marketCode, setMarketCode] = useState(market.marketCode);
  const [marketName, setMarketName] = useState(market.marketName);
  const [region, setRegion] = useState(market.region);
  const [defaultCurrency, setDefaultCurrency] = useState(market.defaultCurrency);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(market.supportedCurrencies || []);
  const [isActive, setIsActive] = useState(market.isActive);
  const [autoUpdateRates, setAutoUpdateRates] = useState(market.autoUpdateRates);
  const [roundingPrecision, setRoundingPrecision] = useState(market.roundingPrecision || 2);

  // Fetch currencies for dropdown options
  const { data: currencyOptionsData } = useQuery({
    queryKey: ['currencies', 'options'],
    queryFn: async () => {
      try {
        const response = await api.get('/currencies');
        const currencies = response.data?.data || response.data || [];
        return currencies.map((c: any) => c.code);
      } catch (error) {
        console.error('Error fetching currencies:', error);
        return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];
      }
    },
  });

  const currencyOptions = currencyOptionsData || ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];

  const handleSave = () => {
    onUpdate(market.id, {
      marketCode: marketCode.trim(),
      marketName: marketName.trim(),
      region: region.trim(),
      defaultCurrency,
      supportedCurrencies,
      isActive,
      autoUpdateRates,
      roundingPrecision: parseInt(roundingPrecision.toString()),
    });
    onClose();
  };

  const toggleCurrency = (currency: string) => {
    if (supportedCurrencies.includes(currency)) {
      if (supportedCurrencies.length > 1) {
        setSupportedCurrencies(supportedCurrencies.filter((c) => c !== currency));
      } else {
        toast.error('At least one currency must be supported');
      }
    } else {
      setSupportedCurrencies([...supportedCurrencies, currency]);
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Edit Market Currency Setting</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{market.marketName} ({market.marketCode})</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {/* Status Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Auto-Update</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${autoUpdateRates
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                  {autoUpdateRates ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Market Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Code
              </label>
              <input
                type="text"
                value={marketCode}
                onChange={(e) => setMarketCode(e.target.value)}
                placeholder="e.g., US"
                className="w-full px-4 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Name
              </label>
              <input
                type="text"
                value={marketName}
                onChange={(e) => setMarketName(e.target.value)}
                placeholder="e.g., United States"
                className="w-full px-4 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                placeholder="e.g., North America"
                className="w-full px-4 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Currency
              </label>
              <div className="min-w-[240px]">
                <CustomDropdown
                  value={defaultCurrency}
                  onChange={setDefaultCurrency}
                  options={currencyOptions.map((c: string) => ({ value: c, label: c }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Supported Currencies
            </label>
            <div className="grid grid-cols-4 gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
              {currencyOptions.map((currency: string) => (
                <label key={currency} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supportedCurrencies.includes(currency)}
                    onChange={() => toggleCurrency(currency)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{currency}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Selected: {supportedCurrencies.join(', ')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rounding Precision
              </label>
              <input
                type="number"
                min="0"
                max="6"
                value={roundingPrecision}
                onChange={(e) => setRoundingPrecision(parseInt(e.target.value) || 2)}
                placeholder="2"
                className="w-full px-4 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-3 h-full justify-end flex flex-col">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isActiveEdit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Active (market will be available for use)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoUpdateEdit"
                  checked={autoUpdateRates}
                  onChange={(e) => setAutoUpdateRates(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="autoUpdateEdit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Auto-update FX rates for this market
                </label>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Created: {new Date(market.createdAt).toLocaleString()}</p>
            {market.updatedAt && (
              <p>Last Updated: {new Date(market.updatedAt).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 text-[14px] pt-0 px-6 pb-4 flex justify-end gap-2 z-50">
          <div className='flex items-center text-[14px] gap-2 border-t border-gray-200 dark:border-gray-700 pt-4 w-full justify-end'>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

