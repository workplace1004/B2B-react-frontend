import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  X,
  Eye,
  Download,
  ChevronDown,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'sales-invoices' | 'credit-notes';
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
type CreditNoteStatus = 'draft' | 'issued' | 'applied' | 'cancelled';

export default function Invoicing() {
  const [activeTab, setActiveTab] = useState<TabType>('sales-invoices');

  const tabs = [
    { id: 'sales-invoices' as TabType, label: 'Sales Invoices', icon: FileText },
    { id: 'credit-notes' as TabType, label: 'Credit Notes', icon: CreditCard },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Invoicing" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Invoicing</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage sales invoices and credit notes
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
        {activeTab === 'sales-invoices' && <SalesInvoicesSection />}
        {activeTab === 'credit-notes' && <CreditNotesSection />}
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
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-between cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <span>{selectedOption?.label || placeholder || 'Select...'}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
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
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                option.value === value
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

// Sales Invoices Section
function SalesInvoicesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Fetch proforma invoices (sales invoices)
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['proforma-invoices', 'sales'],
    queryFn: async () => {
      try {
        const response = await api.get('/proforma-invoices?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for additional context
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'invoicing'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'invoicing'],
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
  const orders = ordersData || [];
  const customers = customersData || [];

  // Process and enrich invoice data
  const processedInvoices = useMemo(() => {
    return invoices.map((invoice: any) => {
      const customer = customers.find((c: any) => c.id === invoice.customerId);
      const order = orders.find((o: any) => o.id === invoice.orderId);
      
      // Normalize status
      let status: InvoiceStatus = 'draft';
      const statusStr = (invoice.status || '').toLowerCase();
      if (statusStr === 'sent') {
        status = 'sent';
      } else if (statusStr === 'paid') {
        status = 'paid';
      } else if (statusStr === 'cancelled') {
        status = 'cancelled';
      } else if (statusStr === 'draft') {
        status = 'draft';
      }

      // Check if overdue
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const isOverdue = dueDate && status !== 'paid' && status !== 'cancelled' && new Date() > dueDate;
      if (isOverdue) {
        status = 'overdue';
      }

      // Calculate days until/since due date
      let daysUntilDue = null;
      if (dueDate) {
        const diffTime = dueDate.getTime() - new Date().getTime();
        daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
        customerId: invoice.customerId,
        customerName: customer?.name || 'Unknown Customer',
        customerEmail: customer?.email || '',
        orderId: invoice.orderId,
        orderNumber: order?.orderNumber || invoice.orderId ? `ORD-${invoice.orderId}` : null,
        status,
        subtotal: parseFloat(invoice.subtotal || 0),
        taxRate: parseFloat(invoice.taxRate || 0),
        taxAmount: parseFloat(invoice.taxAmount || 0),
        discountAmount: parseFloat(invoice.discountAmount || 0),
        totalAmount: parseFloat(invoice.totalAmount || 0),
        currency: invoice.currency || 'USD',
        dueDate: invoice.dueDate,
        daysUntilDue,
        createdAt: invoice.createdAt,
        sentAt: invoice.sentAt,
        paidAt: invoice.paidAt,
        notes: invoice.notes || '',
        invoiceLines: invoice.invoiceLines || [],
        invoice,
      };
    });
  }, [invoices, orders, customers]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let filtered = processedInvoices;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        (item.orderNumber && item.orderNumber.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [processedInvoices, searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredInvoices.length;
    const draft = filteredInvoices.filter((item: any) => item.status === 'draft');
    const sent = filteredInvoices.filter((item: any) => item.status === 'sent');
    const paid = filteredInvoices.filter((item: any) => item.status === 'paid');
    const overdue = filteredInvoices.filter((item: any) => item.status === 'overdue');
    
    const totalAmount = filteredInvoices.reduce((sum: number, item: any) => sum + item.totalAmount, 0);
    const paidAmount = paid.reduce((sum: number, item: any) => sum + item.totalAmount, 0);
    const overdueAmount = overdue.reduce((sum: number, item: any) => sum + item.totalAmount, 0);

    return {
      total,
      draft: draft.length,
      sent: sent.length,
      paid: paid.length,
      overdue: overdue.length,
      totalAmount,
      paidAmount,
      overdueAmount,
    };
  }, [filteredInvoices]);

  if (isLoadingInvoices) {
    return <SkeletonPage />;
  }

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return FileText;
      case 'sent':
        return AlertCircle;
      case 'paid':
        return CheckCircle;
      case 'overdue':
        return AlertCircle;
      case 'cancelled':
        return X;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${summaryMetrics.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.paid}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${summaryMetrics.paidAmount.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.overdue}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${summaryMetrics.overdueAmount.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sent</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.sent}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number, customer, order number..."
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
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No invoices found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No sales invoices found. Invoices will appear here once created.'}
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
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Due Date
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
                {filteredInvoices.map((item: any) => {
                  const StatusIcon = getStatusIcon(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.invoiceNumber}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.customerName}
                        </div>
                        {item.customerEmail && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.customerEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.orderNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.currency} {item.totalAmount.toFixed(2)}
                        </div>
                        {item.taxAmount > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Tax: {item.currency} {item.taxAmount.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.dueDate ? (
                          <>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {new Date(item.dueDate).toLocaleDateString()}
                            </div>
                            {item.daysUntilDue !== null && (
                              <div className={`text-xs ${
                                item.daysUntilDue < 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : item.daysUntilDue <= 7
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {item.daysUntilDue < 0
                                  ? `${Math.abs(item.daysUntilDue)} days overdue`
                                  : item.daysUntilDue === 0
                                  ? 'Due today'
                                  : `${item.daysUntilDue} days left`}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${getStatusColor(item.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(item)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <InvoiceDetailsModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}

// Invoice Details Modal Component
interface InvoiceDetailsModalProps {
  invoice: any;
  onClose: () => void;
}

function InvoiceDetailsModal({ invoice, onClose }: InvoiceDetailsModalProps) {
  if (!invoice) return null;

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              title="Download PDF"
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
          {/* Status Section */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {invoice.currency} {invoice.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer & Order Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{invoice.customerName}</p>
                </div>
                {invoice.customerEmail && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{invoice.customerEmail}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Invoice Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Number</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{invoice.invoiceNumber}</p>
                </div>
                {invoice.orderNumber && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Order Number</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{invoice.orderNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(invoice.createdAt).toLocaleString()}
                  </p>
                </div>
                {invoice.dueDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          {invoice.invoiceLines && invoice.invoiceLines.length > 0 && (
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Invoice Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invoice.invoiceLines.map((line: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {line.product?.name || 'Product'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{line.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {invoice.currency} {parseFloat(line.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.currency} {parseFloat(line.totalPrice || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.taxRate}%)</span>
                    <span className="text-gray-900 dark:text-white">{invoice.currency} {invoice.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discount</span>
                    <span className="text-gray-900 dark:text-white">-{invoice.currency} {invoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">{invoice.currency} {invoice.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
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

// Credit Notes Section
function CreditNotesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCreditNote, setSelectedCreditNote] = useState<any>(null);

  // Load credit notes from localStorage (since there's no API endpoint yet)
  const [creditNotes] = useState<any[]>(() => {
    const saved = localStorage.getItem('credit-notes');
    return saved ? JSON.parse(saved) : [];
  });

  // Save credit notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('credit-notes', JSON.stringify(creditNotes));
  }, [creditNotes]);

  // Fetch returns data to potentially convert to credit notes
  const { data: returnsData } = useQuery({
    queryKey: ['returns', 'credit-notes'],
    queryFn: async () => {
      try {
        const response = await api.get('/returns?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch invoices for reference
  const { data: invoicesData } = useQuery({
    queryKey: ['proforma-invoices', 'credit-notes'],
    queryFn: async () => {
      try {
        const response = await api.get('/proforma-invoices?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'credit-notes'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const returns = returnsData || [];
  const invoices = invoicesData || [];
  const customers = customersData || [];

  // Process credit notes
  const processedCreditNotes = useMemo(() => {
    // Combine stored credit notes with returns that could be credit notes
    const storedNotes = creditNotes.map((note: any) => ({
      ...note,
      source: 'stored',
    }));

    // Convert returns to credit notes if they're approved/completed
    const returnBasedNotes = returns
      .filter((ret: any) => {
        const status = (ret.status || '').toLowerCase();
        return status === 'approved' || status === 'completed';
      })
      .map((ret: any) => {
        const customer = customers.find((c: any) => c.id === ret.customerId);
        const invoice = invoices.find((inv: any) => inv.orderId === ret.orderId);
        
        return {
          id: `return-${ret.id}`,
          creditNoteNumber: `CN-${ret.id}`,
          customerId: ret.customerId,
          customerName: customer?.name || 'Unknown Customer',
          invoiceId: invoice?.id,
          invoiceNumber: invoice?.invoiceNumber,
          returnId: ret.id,
          reason: ret.reason || 'Return/Refund',
          amount: parseFloat(ret.totalAmount || ret.amount || 0),
          currency: invoice?.currency || 'USD',
          status: 'issued' as CreditNoteStatus,
          issuedDate: ret.processedDate || ret.updatedAt || ret.createdAt,
          appliedDate: ret.completedDate,
          notes: ret.notes || '',
          source: 'return',
        };
      });

    return [...storedNotes, ...returnBasedNotes];
  }, [creditNotes, returns, invoices, customers]);

  // Filter credit notes
  const filteredCreditNotes = useMemo(() => {
    let filtered = processedCreditNotes;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.creditNoteNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a: any, b: any) => {
      return new Date(b.issuedDate || b.createdDate).getTime() - new Date(a.issuedDate || a.createdDate).getTime();
    });
  }, [processedCreditNotes, searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredCreditNotes.length;
    const draft = filteredCreditNotes.filter((item: any) => item.status === 'draft');
    const issued = filteredCreditNotes.filter((item: any) => item.status === 'issued');
    const applied = filteredCreditNotes.filter((item: any) => item.status === 'applied');
    
    const totalAmount = filteredCreditNotes.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const appliedAmount = applied.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

    return {
      total,
      draft: draft.length,
      issued: issued.length,
      applied: applied.length,
      totalAmount,
      appliedAmount,
    };
  }, [filteredCreditNotes]);

  const getStatusColor = (status: CreditNoteStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'issued':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'applied':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Credit Notes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${summaryMetrics.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Issued</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.issued}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Applied</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.applied}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ${summaryMetrics.appliedAmount.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Draft</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                {summaryMetrics.draft}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by credit note number, customer, invoice number..."
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
                  { value: 'draft', label: 'Draft' },
                  { value: 'issued', label: 'Issued' },
                  { value: 'applied', label: 'Applied' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Credit Notes Table */}
      {filteredCreditNotes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No credit notes found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No credit notes found. Credit notes will appear here once created or when returns are processed.'}
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
                    Credit Note Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Issued Date
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
                {filteredCreditNotes.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.creditNoteNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.invoiceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.currency} {item.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {item.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.issuedDate ? new Date(item.issuedDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedCreditNote(item)}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Note Details Modal */}
      {selectedCreditNote && (
        <CreditNoteDetailsModal
          creditNote={selectedCreditNote}
          onClose={() => setSelectedCreditNote(null)}
        />
      )}
    </div>
  );
}

// Credit Note Details Modal Component
interface CreditNoteDetailsModalProps {
  creditNote: any;
  onClose: () => void;
}

function CreditNoteDetailsModal({ creditNote, onClose }: CreditNoteDetailsModalProps) {
  if (!creditNote) return null;

  const getStatusColor = (status: CreditNoteStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'issued':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'applied':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Credit Note Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{creditNote.creditNoteNumber}</p>
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
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(creditNote.status)}`}>
                  {creditNote.status.charAt(0).toUpperCase() + creditNote.status.slice(1)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Credit Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {creditNote.currency} {creditNote.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{creditNote.customerName}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Credit Note Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Credit Note Number</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{creditNote.creditNoteNumber}</p>
                </div>
                {creditNote.invoiceNumber && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Related Invoice</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{creditNote.invoiceNumber}</p>
                  </div>
                )}
                {creditNote.issuedDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Issued Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(creditNote.issuedDate).toLocaleString()}
                    </p>
                  </div>
                )}
                {creditNote.appliedDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Applied Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(creditNote.appliedDate).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Reason</h3>
            <p className="text-sm text-gray-900 dark:text-white">{creditNote.reason}</p>
          </div>

          {/* Notes */}
          {creditNote.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{creditNote.notes}</p>
            </div>
          )}
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
