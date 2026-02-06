import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt,
  Search,
  Filter,
  Download,
  ChevronDown,
  FileText,
  Globe,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  Settings,
  X,
  Eye,
  CheckCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'vat-reports' | 'region-rules';

export default function TaxesVAT() {
  const [activeTab, setActiveTab] = useState<TabType>('vat-reports');

  const tabs = [
    { id: 'vat-reports' as TabType, label: 'VAT Reports', icon: FileText },
    { id: 'region-rules' as TabType, label: 'Region Rules', icon: Globe },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Taxes & VAT" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Taxes & VAT</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              VAT reports and region-specific tax rules management
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
        {activeTab === 'vat-reports' && <VATReportsSection />}
        {activeTab === 'region-rules' && <RegionRulesSection />}
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
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
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

// VAT Reports Section
function VATReportsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('monthly');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Fetch invoices for VAT calculation
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['proforma-invoices', 'vat-reports'],
    queryFn: async () => {
      try {
        const response = await api.get('/proforma-invoices?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });


  // Fetch customers for region information
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'vat-reports'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const invoices = invoicesData || [];
  const customers = customersData || [];

  // Process VAT reports by period
  const vatReports = useMemo(() => {
    const reports: any[] = [];
    const now = new Date();
    
    // Get date range based on period filter
    let startDate: Date;
    let endDate: Date = new Date(now);
    
    switch (periodFilter) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        if (dateRange.start && dateRange.end) {
          startDate = new Date(dateRange.start);
          endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Filter invoices by date range
    const filteredInvoices = invoices.filter((inv: any) => {
      const invDate = new Date(inv.createdAt || inv.sentAt || inv.paidAt);
      return invDate >= startDate && invDate <= endDate;
    });

    // Group by region/country
    const regionGroups: { [key: string]: any[] } = {};
    
    filteredInvoices.forEach((invoice: any) => {
      const customer = customers.find((c: any) => c.id === invoice.customerId);
      const region = customer?.country || 'Unknown';
      
      if (!regionGroups[region]) {
        regionGroups[region] = [];
      }
      regionGroups[region].push(invoice);
    });

    // Create reports for each region
    Object.keys(regionGroups).forEach((region) => {
      const regionInvoices = regionGroups[region];
      const subtotal = regionInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.subtotal || 0), 0);
      const totalTax = regionInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.taxAmount || 0), 0);
      const totalAmount = regionInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount || 0), 0);
      
      // Calculate average tax rate
      const avgTaxRate = regionInvoices.length > 0
        ? regionInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.taxRate || 0), 0) / regionInvoices.length
        : 0;

      reports.push({
        id: `report-${region}-${startDate.getTime()}`,
        region,
        period: periodFilter,
        startDate,
        endDate,
        invoiceCount: regionInvoices.length,
        subtotal,
        totalTax,
        totalAmount,
        avgTaxRate,
        currency: regionInvoices[0]?.currency || 'USD',
        invoices: regionInvoices,
      });
    });

    return reports.sort((a, b) => b.totalTax - a.totalTax);
  }, [invoices, customers, periodFilter, dateRange]);

  // Filter reports
  const filteredReports = useMemo(() => {
    let filtered = vatReports;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((report: any) =>
        report.region.toLowerCase().includes(query)
      );
    }

    // Filter by region
    if (regionFilter !== 'all') {
      filtered = filtered.filter((report: any) => report.region === regionFilter);
    }

    return filtered;
  }, [vatReports, searchQuery, regionFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalReports = filteredReports.length;
    const totalTax = filteredReports.reduce((sum: number, report: any) => sum + report.totalTax, 0);
    const totalSubtotal = filteredReports.reduce((sum: number, report: any) => sum + report.subtotal, 0);
    const totalAmount = filteredReports.reduce((sum: number, report: any) => sum + report.totalAmount, 0);
    const totalInvoices = filteredReports.reduce((sum: number, report: any) => sum + report.invoiceCount, 0);

    return {
      totalReports,
      totalTax,
      totalSubtotal,
      totalAmount,
      totalInvoices,
    };
  }, [filteredReports]);

  // Get unique regions for filter
  const uniqueRegions = useMemo(() => {
    const regions = new Set(vatReports.map((r: any) => r.region));
    return Array.from(regions).sort();
  }, [vatReports]);

  if (isLoadingInvoices) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total VAT Collected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalTax.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Subtotal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalSubtotal.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalInvoices}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {summaryMetrics.totalReports} regions
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={periodFilter}
                onChange={setPeriodFilter}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'yearly', label: 'Yearly' },
                  { value: 'custom', label: 'Custom Range' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={regionFilter}
                onChange={setRegionFilter}
                options={[
                  { value: 'all', label: 'All Regions' },
                  ...uniqueRegions.map((region: string) => ({
                    value: region,
                    label: region,
                  })),
                ]}
              />
            </div>
          </div>
        </div>

        {/* Custom Date Range */}
        {periodFilter === 'custom' && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            </div>
        )}
      </div>

      {/* VAT Reports Table */}
      {filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No VAT reports found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || regionFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No VAT reports found for the selected period. Reports will appear here once invoices are created.'}
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
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Invoice Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    VAT Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Avg Tax Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReports.map((report: any) => (
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {report.region}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.period.charAt(0).toUpperCase() + report.period.slice(1)}
                      <div className="text-xs text-gray-400">
                        {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {report.invoiceCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {report.currency} {report.subtotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {report.currency} {report.totalTax.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {report.currency} {report.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.avgTaxRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        <button
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          title="Download Report"
                        >
                          <Download className="w-4 h-4" />
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

      {/* VAT Report Details Modal */}
      {selectedReport && (
        <VATReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
}

// VAT Report Details Modal Component
interface VATReportDetailsModalProps {
  report: any;
  onClose: () => void;
}

function VATReportDetailsModal({ report, onClose }: VATReportDetailsModalProps) {
  if (!report) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">VAT Report Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {report.region} - {report.period.charAt(0).toUpperCase() + report.period.slice(1)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              title="Download Report"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Region</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{report.region}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {report.period.charAt(0).toUpperCase() + report.period.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Count</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{report.invoiceCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Tax Rate</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{report.avgTaxRate.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {report.currency} {report.subtotal.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">VAT Amount</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {report.currency} {report.totalTax.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {report.currency} {report.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Date Range</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>From: {new Date(report.startDate).toLocaleDateString()}</span>
              </div>
              <span>to</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>To: {new Date(report.endDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Invoices List */}
          {report.invoices && report.invoices.length > 0 && (
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Invoices ({report.invoices.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Invoice Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Subtotal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Tax Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Tax Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {report.invoices.map((invoice: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {invoice.invoiceNumber || `INV-${invoice.id}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(invoice.createdAt || invoice.sentAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {invoice.currency || 'USD'} {parseFloat(invoice.subtotal || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {parseFloat(invoice.taxRate || 0).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                          {invoice.currency || 'USD'} {parseFloat(invoice.taxAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.currency || 'USD'} {parseFloat(invoice.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="sticky text-[14px] bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-2">
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

// Region Rules Section
function RegionRulesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load region rules from localStorage (since there's no API endpoint yet)
  const [regionRules, setRegionRules] = useState<any[]>(() => {
    const saved = localStorage.getItem('region-tax-rules');
    return saved ? JSON.parse(saved) : [
      // Default rules
      {
        id: 1,
        region: 'United States',
        country: 'US',
        taxType: 'sales-tax',
        taxRate: 0,
        vatRate: 0,
        isActive: true,
        description: 'Sales tax varies by state',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        region: 'United Kingdom',
        country: 'GB',
        taxType: 'vat',
        taxRate: 0,
        vatRate: 20,
        isActive: true,
        description: 'Standard VAT rate: 20%',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        region: 'European Union',
        country: 'EU',
        taxType: 'vat',
        taxRate: 0,
        vatRate: 19,
        isActive: true,
        description: 'Standard EU VAT rate: 19%',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save region rules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('region-tax-rules', JSON.stringify(regionRules));
  }, [regionRules]);

  // Filter rules
  const filteredRules = useMemo(() => {
    let filtered = regionRules;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((rule: any) =>
        rule.region.toLowerCase().includes(query) ||
        rule.country.toLowerCase().includes(query) ||
        rule.taxType.toLowerCase().includes(query)
      );
    }

    // Sort by region name
    return filtered.sort((a: any, b: any) => a.region.localeCompare(b.region));
  }, [regionRules, searchQuery]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredRules.length;
    const active = filteredRules.filter((rule: any) => rule.isActive);
    const vatRules = filteredRules.filter((rule: any) => rule.taxType === 'vat');
    const salesTaxRules = filteredRules.filter((rule: any) => rule.taxType === 'sales-tax');

    return {
      total,
      active: active.length,
      vatRules: vatRules.length,
      salesTaxRules: salesTaxRules.length,
    };
  }, [filteredRules]);

  const handleCreateRule = (ruleData: any) => {
    const newRule = {
      id: Date.now(),
      ...ruleData,
      createdAt: new Date().toISOString(),
    };
    setRegionRules([...regionRules, newRule]);
    setShowCreateModal(false);
  };

  const handleUpdateRule = (ruleId: number, updates: any) => {
    setRegionRules(regionRules.map((r: any) =>
      r.id === ruleId ? { ...r, ...updates } : r
    ));
  };

  const handleDeleteRule = (ruleId: number) => {
    setRegionRules(regionRules.filter((r: any) => r.id !== ruleId));
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rules</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Rules</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">VAT Rules</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.vatRules}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sales Tax Rules</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.salesTaxRules}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
              placeholder="Search by region, country, tax type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            New Rule
          </button>
        </div>
      </div>

      {/* Region Rules Table */}
      {filteredRules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No region rules found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'No region tax rules configured. Create a new rule to get started.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Settings className="w-5 h-5" />
                Create First Rule
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
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Country Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Tax Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Tax Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    VAT Rate
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
                {filteredRules.map((rule: any) => (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {rule.region}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {rule.country}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.taxType === 'vat'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {rule.taxType === 'vat' ? 'VAT' : 'Sales Tax'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {rule.taxRate > 0 ? `${rule.taxRate}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {rule.vatRate > 0 ? `${rule.vatRate}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRule(rule)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setRuleToDelete(rule);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Delete Rule"
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

      {/* Create/Edit Rule Modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRule}
        />
      )}

      {/* Rule Details Modal */}
      {selectedRule && (
        <RuleDetailsModal
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
          onUpdate={handleUpdateRule}
        />
      )}

      {/* Delete Rule Modal */}
      {ruleToDelete && (
        <DeleteRuleModal
          rule={ruleToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setRuleToDelete(null);
          }}
          onConfirm={() => {
            handleDeleteRule(ruleToDelete.id);
            setShowDeleteModal(false);
            setRuleToDelete(null);
          }}
          isShowing={showDeleteModal}
        />
      )}
    </div>
  );
}

// Create Rule Modal Component
interface CreateRuleModalProps {
  onClose: () => void;
  onCreate: (ruleData: any) => void;
}

function CreateRuleModal({ onClose, onCreate }: CreateRuleModalProps) {
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [taxType, setTaxType] = useState('vat');
  const [taxRate, setTaxRate] = useState(0);
  const [vatRate, setVatRate] = useState(0);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!region.trim() || !country.trim()) {
      return;
    }
    onCreate({
      region: region.trim(),
      country: country.trim().toUpperCase(),
      taxType,
      taxRate: parseFloat(taxRate.toString()),
      vatRate: parseFloat(vatRate.toString()),
      description: description.trim(),
      isActive,
    });
    // Reset form
    setRegion('');
    setCountry('');
    setTaxType('vat');
    setTaxRate(0);
    setVatRate(0);
    setDescription('');
    setIsActive(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Region Rule</h2>
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
                Region Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., United Kingdom"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., GB, US, DE"
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Type
              </label>
              <div className="min-w-[240px]">
                <CustomDropdown
                  value={taxType}
                  onChange={setTaxType}
                  options={[
                    { value: 'vat', label: 'VAT' },
                    { value: 'sales-tax', label: 'Sales Tax' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              VAT Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={vatRate}
              onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Optional description or notes about this tax rule..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Active (rule will be applied to invoices)
            </label>
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
              Create Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rule Details Modal Component
interface RuleDetailsModalProps {
  rule: any;
  onClose: () => void;
  onUpdate: (ruleId: number, updates: any) => void;
}

function RuleDetailsModal({ rule, onClose, onUpdate }: RuleDetailsModalProps) {
  const [region, setRegion] = useState(rule.region);
  const [country, setCountry] = useState(rule.country);
  const [taxType, setTaxType] = useState(rule.taxType);
  const [taxRate, setTaxRate] = useState(rule.taxRate);
  const [vatRate, setVatRate] = useState(rule.vatRate);
  const [description, setDescription] = useState(rule.description || '');
  const [isActive, setIsActive] = useState(rule.isActive);

  const handleSave = () => {
    onUpdate(rule.id, {
      region: region.trim(),
      country: country.trim().toUpperCase(),
      taxType,
      taxRate: parseFloat(taxRate.toString()),
      vatRate: parseFloat(vatRate.toString()),
      description: description.trim(),
      isActive,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Region Rule Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rule.region} ({rule.country})</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Tax Type</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  taxType === 'vat'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {taxType === 'vat' ? 'VAT' : 'Sales Tax'}
                </span>
              </div>
            </div>
          </div>

          {/* Rule Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region Name
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
                Country Code
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Type
              </label>
              <div className="min-w-[240px]">
                <CustomDropdown
                  value={taxType}
                  onChange={setTaxType}
                  options={[
                    { value: 'vat', label: 'VAT' },
                    { value: 'sales-tax', label: 'Sales Tax' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              VAT Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={vatRate}
              onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActiveEdit"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActiveEdit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Active (rule will be applied to invoices)
            </label>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Created: {new Date(rule.createdDate).toLocaleString()}</p>
            {rule.updatedDate && (
              <p>Last Updated: {new Date(rule.updatedDate).toLocaleString()}</p>
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

// Delete Rule Modal Component
interface DeleteRuleModalProps {
  rule: any;
  onClose: () => void;
  onConfirm: () => void;
  isShowing: boolean;
}

function DeleteRuleModal({ rule, onClose, onConfirm, isShowing }: DeleteRuleModalProps) {
  if (!isShowing) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
            Delete Region Rule
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-1 text-center">
            Are you sure you want to delete the tax rule for
          </p>
          <p className="text-gray-900 dark:text-white font-semibold mb-4 text-center">
            "{rule.region}" ({rule.country})?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center mb-6">
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 text-[14px]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
