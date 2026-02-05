import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Globe,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  CheckCircle,
  X,
  Eye,
  Plus,
  ArrowUpDown,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'fx-rates' | 'market-settings';
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'BRL' | 'MXN' | 'ZAR';

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

// FX Rates Section
function FXRatesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Common currencies
  const currencies: { code: CurrencyCode; name: string; symbol: string }[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  ];

  // Load FX rates from localStorage or generate mock data
  const [fxRates, setFxRates] = useState<any[]>(() => {
    const saved = localStorage.getItem('fx-rates');
    if (saved) {
      return JSON.parse(saved);
    }
    // Generate initial rates
    const rates: any[] = [];
    const baseDate = new Date();
    currencies.forEach((currency) => {
      if (currency.code !== 'USD') {
        // Mock exchange rates (in real app, these would come from an API)
        const rate = 0.5 + Math.random() * 2; // Random rate between 0.5 and 2.5
        const previousRate = rate * (0.95 + Math.random() * 0.1); // Previous rate with small variation
        const change = rate - previousRate;
        const changePercent = (change / previousRate) * 100;

        rates.push({
          id: `rate-${currency.code}`,
          fromCurrency: 'USD',
          toCurrency: currency.code,
          rate,
          previousRate,
          change,
          changePercent,
          lastUpdated: baseDate.toISOString(),
          source: 'Manual',
        });
      }
    });
    return rates;
  });

  // Save FX rates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('fx-rates', JSON.stringify(fxRates));
  }, [fxRates]);

  // Filter rates
  const filteredRates = useMemo(() => {
    let filtered = fxRates.filter((rate: any) => rate.fromCurrency === baseCurrency);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((rate: any) =>
        rate.toCurrency.toLowerCase().includes(query) ||
        currencies.find((c) => c.code === rate.toCurrency)?.name.toLowerCase().includes(query)
      );
    }

    // Sort by currency code
    return filtered.sort((a: any, b: any) => a.toCurrency.localeCompare(b.toCurrency));
  }, [fxRates, baseCurrency, searchQuery, currencies]);

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
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Update rates with small random variations
    setFxRates((prevRates: any[]) =>
      prevRates.map((rate: any) => {
        if (rate.fromCurrency === baseCurrency) {
          const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
          const newRate = rate.rate * (1 + variation);
          const change = newRate - rate.rate;
          const changePercent = (change / rate.rate) * 100;

          return {
            ...rate,
            previousRate: rate.rate,
            rate: newRate,
            change,
            changePercent,
            lastUpdated: new Date().toISOString(),
          };
        }
        return rate;
      })
    );

    setIsRefreshing(false);
    toast.success('FX rates updated successfully!');
  };

  const getCurrencyInfo = (code: string) => {
    return currencies.find((c) => c.code === code) || { code, name: code, symbol: code };
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={baseCurrency}
                onChange={setBaseCurrency}
                options={currencies.map((c) => ({
                  value: c.code,
                  label: `${c.code} - ${c.name}`,
                }))}
              />
            </div>
            <button
              onClick={handleRefreshRates}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                {filteredRates.map((rate: any) => {
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
  currencies: { code: CurrencyCode; name: string; symbol: string }[];
}

function FXRateDetailsModal({ rate, onClose, currencies }: FXRateDetailsModalProps) {
  if (!rate) return null;

  const fromCurrencyInfo = currencies.find((c) => c.code === rate.fromCurrency) || {
    code: rate.fromCurrency,
    name: rate.fromCurrency,
    symbol: rate.fromCurrency,
  };
  const toCurrencyInfo = currencies.find((c) => c.code === rate.toCurrency) || {
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">FX Rate Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {rate.fromCurrency}/{rate.toCurrency}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
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

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Market Currency Settings Section
function MarketCurrencySettingsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Common markets/regions
  const markets: { code: string; name: string; region: string }[] = [
    { code: 'US', name: 'United States', region: 'North America' },
    { code: 'GB', name: 'United Kingdom', region: 'Europe' },
    { code: 'EU', name: 'European Union', region: 'Europe' },
    { code: 'CA', name: 'Canada', region: 'North America' },
    { code: 'AU', name: 'Australia', region: 'Oceania' },
    { code: 'JP', name: 'Japan', region: 'Asia' },
    { code: 'CN', name: 'China', region: 'Asia' },
    { code: 'IN', name: 'India', region: 'Asia' },
    { code: 'BR', name: 'Brazil', region: 'South America' },
    { code: 'MX', name: 'Mexico', region: 'North America' },
    { code: 'ZA', name: 'South Africa', region: 'Africa' },
  ];

  // Load market currency settings from localStorage
  const [marketSettings, setMarketSettings] = useState<any[]>(() => {
    const saved = localStorage.getItem('market-currency-settings');
    if (saved) {
      return JSON.parse(saved);
    }
    // Generate default settings
    return markets.map((market) => ({
      id: `market-${market.code}`,
      marketCode: market.code,
      marketName: market.name,
      region: market.region,
      defaultCurrency: market.code === 'US' ? 'USD' : market.code === 'GB' ? 'GBP' : market.code === 'EU' ? 'EUR' : 'USD',
      supportedCurrencies: market.code === 'US' ? ['USD'] : market.code === 'GB' ? ['GBP', 'EUR'] : market.code === 'EU' ? ['EUR', 'GBP'] : ['USD'],
      isActive: true,
      autoUpdateRates: true,
      roundingPrecision: 2,
      createdAt: new Date().toISOString(),
    }));
  });

  // Save market settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('market-currency-settings', JSON.stringify(marketSettings));
  }, [marketSettings]);

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

  const handleCreateMarket = (marketData: any) => {
    const newMarket = {
      id: `market-${Date.now()}`,
      ...marketData,
      createdAt: new Date().toISOString(),
    };
    setMarketSettings([...marketSettings, newMarket]);
    setShowCreateModal(false);
    toast.success('Market currency setting created successfully!');
  };

  const handleUpdateMarket = (marketId: string, updates: any) => {
    setMarketSettings(marketSettings.map((m: any) =>
      m.id === marketId ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
    ));
    toast.success('Market currency setting updated successfully!');
  };

  const handleDeleteMarket = (marketId: string) => {
    setMarketSettings(marketSettings.filter((m: any) => m.id !== marketId));
    toast.success('Market currency setting deleted successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by market name, code, or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Market
          </button>
        </div>
      </div>

      {/* Market Settings Table */}
      {filteredMarkets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
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
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Market
              </button>
            )}
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
                {filteredMarkets.map((market: any) => (
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        market.autoUpdateRates
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {market.autoUpdateRates ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        market.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {market.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedMarket(market)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteMarket(market.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
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

       {/* Create Market Modal */}
       {showCreateModal && (
         <CreateMarketModal
           onClose={() => setShowCreateModal(false)}
           onCreate={handleCreateMarket}
         />
       )}

       {/* Market Details Modal */}
       {selectedMarket && (
         <MarketDetailsModal
           market={selectedMarket}
           onClose={() => setSelectedMarket(null)}
           onUpdate={handleUpdateMarket}
           markets={markets}
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

  const currencyOptions = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];

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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Market Currency Setting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                options={currencyOptions.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Supported Currencies
            </label>
            <div className="grid grid-cols-4 gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
              {currencyOptions.map((currency) => (
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-3">
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

          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 -mx-6 -mb-6 flex justify-end gap-2">
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
        </form>
      </div>
    </div>
  );
}

// Market Details Modal Component
interface MarketDetailsModalProps {
  market: any;
  onClose: () => void;
  onUpdate: (marketId: string, updates: any) => void;
  markets: { code: string; name: string; region: string }[];
}

function MarketDetailsModal({ market, onClose, onUpdate }: MarketDetailsModalProps) {
  const [marketCode, setMarketCode] = useState(market.marketCode);
  const [marketName, setMarketName] = useState(market.marketName);
  const [region, setRegion] = useState(market.region);
  const [defaultCurrency, setDefaultCurrency] = useState(market.defaultCurrency);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>(market.supportedCurrencies || []);
  const [isActive, setIsActive] = useState(market.isActive);
  const [autoUpdateRates, setAutoUpdateRates] = useState(market.autoUpdateRates);
  const [roundingPrecision, setRoundingPrecision] = useState(market.roundingPrecision || 2);

  const currencyOptions = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'ZAR'];

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Market Currency Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{market.marketName} ({market.marketCode})</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Auto-Update</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  autoUpdateRates
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                options={currencyOptions.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Supported Currencies
            </label>
            <div className="grid grid-cols-4 gap-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
              {currencyOptions.map((currency) => (
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="space-y-3">
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

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Created: {new Date(market.createdAt).toLocaleString()}</p>
            {market.updatedAt && (
              <p>Last Updated: {new Date(market.updatedAt).toLocaleString()}</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
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
  );
}
