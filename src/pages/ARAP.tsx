import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Clock,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown } from '../components/ui';

type TabType = 'accounts-receivable' | 'accounts-payable' | 'payment-status';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export default function ARAP() {
  const [activeTab, setActiveTab] = useState<TabType>('accounts-receivable');

  const tabs = [
    { id: 'accounts-receivable' as TabType, label: 'Accounts Receivable', icon: TrendingUp },
    { id: 'accounts-payable' as TabType, label: 'Accounts Payable', icon: TrendingDown },
    { id: 'payment-status' as TabType, label: 'Payment Status', icon: CreditCard },
  ];

  return (
    <div>
      <Breadcrumb currentPage="AR / AP" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">AR / AP</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Accounts receivable, accounts payable, and payment status management
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
        {activeTab === 'accounts-receivable' && <AccountsReceivableSection />}
        {activeTab === 'accounts-payable' && <AccountsPayableSection />}
        {activeTab === 'payment-status' && <PaymentStatusSection />}
      </div>
    </div>
  );
}

// Accounts Receivable Section
function AccountsReceivableSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agingFilter, setAgingFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch invoices (AR - money owed to us)
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['proforma-invoices', 'ar'],
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
    queryKey: ['customers', 'ar'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch orders for additional context
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'ar'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const invoices = invoicesData || [];
  const customers = customersData || [];
  const orders = ordersData || [];

  // Process and enrich AR data
  const processedAR = useMemo(() => {
    return invoices.map((invoice: any) => {
      const customer = customers.find((c: any) => c.id === invoice.customerId);
      const order = orders.find((o: any) => o.id === invoice.orderId);

      const totalAmount = parseFloat(invoice.totalAmount || 0);
      const paidAmount = parseFloat(invoice.paidAmount || 0);
      const outstandingAmount = totalAmount - paidAmount;

      // Determine payment status
      let status: PaymentStatus = 'pending';
      if (invoice.status === 'PAID' || paidAmount >= totalAmount) {
        status = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        status = 'partial';
      } else if (invoice.status === 'CANCELLED') {
        status = 'cancelled';
      } else {
        status = 'pending';
      }

      // Check if overdue
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const isOverdue = dueDate && status !== 'paid' && status !== 'cancelled' && new Date() > dueDate;
      if (isOverdue) {
        status = 'overdue';
      }

      // Calculate aging
      let agingBucket: AgingBucket = 'current';
      if (dueDate && status !== 'paid' && status !== 'cancelled') {
        const daysPastDue = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysPastDue <= 0) {
          agingBucket = 'current';
        } else if (daysPastDue <= 30) {
          agingBucket = '1-30';
        } else if (daysPastDue <= 60) {
          agingBucket = '31-60';
        } else if (daysPastDue <= 90) {
          agingBucket = '61-90';
        } else {
          agingBucket = '90+';
        }
      }

      // Calculate days until/since due
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
        totalAmount,
        paidAmount,
        outstandingAmount,
        currency: invoice.currency || 'USD',
        dueDate: invoice.dueDate,
        daysUntilDue,
        agingBucket,
        createdAt: invoice.createdAt,
        sentAt: invoice.sentAt,
        paidAt: invoice.paidAt,
        notes: invoice.notes || '',
        invoiceLines: invoice.invoiceLines || [],
        invoice,
      };
    });
  }, [invoices, customers, orders]);

  // Filter AR
  const filteredAR = useMemo(() => {
    let filtered = processedAR;

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

    // Filter by aging
    if (agingFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.agingBucket === agingFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [processedAR, searchQuery, statusFilter, agingFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAR.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAR = filteredAR.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, agingFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredAR.length;
    const pending = filteredAR.filter((item: any) => item.status === 'pending');
    const partial = filteredAR.filter((item: any) => item.status === 'partial');
    const paid = filteredAR.filter((item: any) => item.status === 'paid');
    const overdue = filteredAR.filter((item: any) => item.status === 'overdue');

    const totalOutstanding = filteredAR.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const overdueAmount = overdue.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const paidAmount = paid.reduce((sum: number, item: any) => sum + item.paidAmount, 0);

    // Aging analysis
    const agingAnalysis = {
      current: filteredAR.filter((item: any) => item.agingBucket === 'current').reduce((sum: number, item: any) => sum + item.outstandingAmount, 0),
      '1-30': filteredAR.filter((item: any) => item.agingBucket === '1-30').reduce((sum: number, item: any) => sum + item.outstandingAmount, 0),
      '31-60': filteredAR.filter((item: any) => item.agingBucket === '31-60').reduce((sum: number, item: any) => sum + item.outstandingAmount, 0),
      '61-90': filteredAR.filter((item: any) => item.agingBucket === '61-90').reduce((sum: number, item: any) => sum + item.outstandingAmount, 0),
      '90+': filteredAR.filter((item: any) => item.agingBucket === '90+').reduce((sum: number, item: any) => sum + item.outstandingAmount, 0),
    };

    return {
      total,
      pending: pending.length,
      partial: partial.length,
      paid: paid.length,
      overdue: overdue.length,
      totalOutstanding,
      overdueAmount,
      paidAmount,
      agingAnalysis,
    };
  }, [filteredAR]);

  if (isLoadingInvoices) {
    return <SkeletonPage />;
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partial':
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

  const getAgingColor = (bucket: AgingBucket) => {
    switch (bucket) {
      case 'current':
        return 'text-green-600 dark:text-green-400';
      case '1-30':
        return 'text-yellow-600 dark:text-yellow-400';
      case '31-60':
        return 'text-orange-600 dark:text-orange-400';
      case '61-90':
        return 'text-red-600 dark:text-red-400';
      case '90+':
        return 'text-red-800 dark:text-red-500';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
              <p className="text-[28px] font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalOutstanding.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-[28px] font-bold text-red-600 dark:text-red-400 mt-1">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
              <p className="text-[28px] font-bold text-green-600 dark:text-green-400 mt-1">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-[28px] font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Aging Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Aging Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
            <p className={`text-[28px] font-bold mt-1 ${getAgingColor('current')}`}>
              ${summaryMetrics.agingAnalysis.current.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">1-30 Days</p>
            <p className={`text-[28px] font-bold mt-1 ${getAgingColor('1-30')}`}>
              ${summaryMetrics.agingAnalysis['1-30'].toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">31-60 Days</p>
            <p className={`text-[28px] font-bold mt-1 ${getAgingColor('31-60')}`}>
              ${summaryMetrics.agingAnalysis['31-60'].toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">61-90 Days</p>
            <p className={`text-[28px] font-bold mt-1 ${getAgingColor('61-90')}`}>
              ${summaryMetrics.agingAnalysis['61-90'].toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">90+ Days</p>
            <p className={`text-[28px] font-bold mt-1 ${getAgingColor('90+')}`}>
              ${summaryMetrics.agingAnalysis['90+'].toFixed(2)}
            </p>
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
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={agingFilter}
                onChange={setAgingFilter}
                options={[
                  { value: 'all', label: 'All Aging' },
                  { value: 'current', label: 'Current' },
                  { value: '1-30', label: '1-30 Days' },
                  { value: '31-60', label: '31-60 Days' },
                  { value: '61-90', label: '61-90 Days' },
                  { value: '90+', label: '90+ Days' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AR Table */}
      {filteredAR.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No accounts receivable found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || statusFilter !== 'all' || agingFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No accounts receivable found. Invoices will appear here once created.'}
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
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Paid Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Aging
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
                {paginatedAR.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.invoiceNumber}
                      </div>
                      {item.orderNumber && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Order: {item.orderNumber}
                        </div>
                      )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.currency} {item.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.currency} {item.paidAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${item.outstandingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                        {item.currency} {item.outstandingAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.dueDate ? (
                        <>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                          {item.daysUntilDue !== null && (
                            <div className={`text-xs ${item.daysUntilDue < 0
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
                      <span className={`text-sm font-medium ${getAgingColor(item.agingBucket)}`}>
                        {item.agingBucket === 'current' ? 'Current' : item.agingBucket === '1-30' ? '1-30' : item.agingBucket === '31-60' ? '31-60' : item.agingBucket === '61-90' ? '61-90' : '90+'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedInvoice(item)}
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

      {/* Pagination */}
      {filteredAR.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredAR.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredAR.length}</span> results
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

      {/* AR Details Modal */}
      {selectedInvoice && (
        <ARDetailsModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
}

// AR Details Modal Component
interface ARDetailsModalProps {
  invoice: any;
  onClose: () => void;
}

function ARDetailsModal({ invoice, onClose }: ARDetailsModalProps) {
  if (!invoice) return null;

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partial':
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Accounts Receivable Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{invoice.invoiceNumber}</p>
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
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {invoice.currency} {invoice.outstandingAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {invoice.currency} {invoice.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid Amount</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                {invoice.currency} {invoice.paidAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">
                {invoice.currency} {invoice.outstandingAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Customer & Invoice Information */}
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
                {invoice.dueDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Aging</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {invoice.agingBucket === 'current' ? 'Current' : `${invoice.agingBucket} days`}
                  </p>
                </div>
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

// Accounts Payable Section
function AccountsPayableSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch purchase orders (AP - money we owe)
  const { data: purchaseOrdersData, isLoading: isLoadingPOs } = useQuery({
    queryKey: ['purchase-orders', 'ap'],
    queryFn: async () => {
      try {
        const response = await api.get('/purchase-orders?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'ap'],
    queryFn: async () => {
      try {
        const response = await api.get('/suppliers?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const purchaseOrders = purchaseOrdersData || [];
  const suppliers = suppliersData || [];

  // Process and enrich AP data
  const processedAP = useMemo(() => {
    return purchaseOrders.map((po: any) => {
      const supplier = suppliers.find((s: any) => s.id === po.supplierId);

      const totalAmount = parseFloat(po.totalAmount || po.amount || 0);
      const paidAmount = parseFloat(po.paidAmount || 0);
      const outstandingAmount = totalAmount - paidAmount;

      // Determine payment status
      let status: PaymentStatus = 'pending';
      if (po.status === 'PAID' || paidAmount >= totalAmount) {
        status = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        status = 'partial';
      } else if (po.status === 'CANCELLED') {
        status = 'cancelled';
      } else {
        status = 'pending';
      }

      // Check if overdue
      const dueDate = po.dueDate || po.expectedDate;
      const isOverdue = dueDate && status !== 'paid' && status !== 'cancelled' && new Date() > new Date(dueDate);
      if (isOverdue) {
        status = 'overdue';
      }

      // Calculate days until/since due
      let daysUntilDue = null;
      if (dueDate) {
        const diffTime = new Date(dueDate).getTime() - new Date().getTime();
        daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        id: po.id,
        billNumber: po.poNumber || po.billNumber || `PO-${po.id}`,
        supplierId: po.supplierId,
        supplierName: supplier?.name || 'Unknown Supplier',
        supplierEmail: supplier?.email || '',
        status,
        totalAmount,
        paidAmount,
        outstandingAmount,
        currency: po.currency || 'USD',
        dueDate: dueDate,
        daysUntilDue,
        createdAt: po.createdAt,
        expectedDate: po.expectedDate,
        receivedDate: po.receivedDate,
        notes: po.notes || '',
        po,
      };
    });
  }, [purchaseOrders, suppliers]);

  // Filter AP
  const filteredAP = useMemo(() => {
    let filtered = processedAP;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.billNumber.toLowerCase().includes(query) ||
        item.supplierName.toLowerCase().includes(query)
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
  }, [processedAP, searchQuery, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAP.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAP = filteredAP.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredAP.length;
    const pending = filteredAP.filter((item: any) => item.status === 'pending');
    const partial = filteredAP.filter((item: any) => item.status === 'partial');
    const paid = filteredAP.filter((item: any) => item.status === 'paid');
    const overdue = filteredAP.filter((item: any) => item.status === 'overdue');

    const totalOutstanding = filteredAP.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const overdueAmount = overdue.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const paidAmount = paid.reduce((sum: number, item: any) => sum + item.paidAmount, 0);

    return {
      total,
      pending: pending.length,
      partial: partial.length,
      paid: paid.length,
      overdue: overdue.length,
      totalOutstanding,
      overdueAmount,
      paidAmount,
    };
  }, [filteredAP]);

  if (isLoadingPOs) {
    return <SkeletonPage />;
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partial':
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
              <p className="text-[28px] font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalOutstanding.toFixed(2)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-[28px] font-bold text-red-600 dark:text-red-400 mt-1">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
              <p className="text-[28px] font-bold text-green-600 dark:text-green-400 mt-1">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-[28px] font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
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
              placeholder="Search by bill number, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AP Table */}
      {filteredAP.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <TrendingDown className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No accounts payable found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No accounts payable found. Purchase orders will appear here once created.'}
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
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Paid Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Outstanding
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
                {paginatedAP.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.billNumber}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.supplierName}
                      </div>
                      {item.supplierEmail && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.supplierEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.currency} {item.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.currency} {item.paidAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${item.outstandingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                        {item.currency} {item.outstandingAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.dueDate ? (
                        <>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                          {item.daysUntilDue !== null && (
                            <div className={`text-xs ${item.daysUntilDue < 0
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedBill(item)}
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

      {/* Pagination */}
      {filteredAP.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredAP.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredAP.length}</span> results
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

      {/* AP Details Modal */}
      {selectedBill && (
        <APDetailsModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
      )}
    </div>
  );
}

// AP Details Modal Component
interface APDetailsModalProps {
  bill: any;
  onClose: () => void;
}

function APDetailsModal({ bill, onClose }: APDetailsModalProps) {
  if (!bill) return null;

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partial':
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Accounts Payable Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{bill.billNumber}</p>
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
                <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(bill.status)}`}>
                  {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding Amount</p>
                <p className="text-[28px] font-bold text-gray-900 dark:text-white mt-1">
                  {bill.currency} {bill.outstandingAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {bill.currency} {bill.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid Amount</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                {bill.currency} {bill.paidAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">
                {bill.currency} {bill.outstandingAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Supplier & Bill Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Supplier Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Supplier Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{bill.supplierName}</p>
                </div>
                {bill.supplierEmail && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{bill.supplierEmail}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Bill Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bill Number</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{bill.billNumber}</p>
                </div>
                {bill.dueDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {bill.expectedDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Expected Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(bill.expectedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(bill.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{bill.notes}</p>
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

// Payment Status Section
function PaymentStatusSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch invoices (AR payments)
  const { data: invoicesData } = useQuery({
    queryKey: ['proforma-invoices', 'payment-status'],
    queryFn: async () => {
      try {
        const response = await api.get('/proforma-invoices?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch purchase orders (AP payments)
  const { data: purchaseOrdersData } = useQuery({
    queryKey: ['purchase-orders', 'payment-status'],
    queryFn: async () => {
      try {
        const response = await api.get('/purchase-orders?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'payment-status'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'payment-status'],
    queryFn: async () => {
      try {
        const response = await api.get('/suppliers?skip=0&take=10000');
        return response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const invoices = invoicesData || [];
  const purchaseOrders = purchaseOrdersData || [];
  const customers = customersData || [];
  const suppliers = suppliersData || [];

  // Process payment status data (combine AR and AP)
  const processedPayments = useMemo(() => {
    const arPayments = invoices.map((invoice: any) => {
      const customer = customers.find((c: any) => c.id === invoice.customerId);
      const totalAmount = parseFloat(invoice.totalAmount || 0);
      const paidAmount = parseFloat(invoice.paidAmount || 0);
      const outstandingAmount = totalAmount - paidAmount;

      let status: PaymentStatus = 'pending';
      if (invoice.status === 'PAID' || paidAmount >= totalAmount) {
        status = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        status = 'partial';
      } else if (invoice.status === 'CANCELLED') {
        status = 'cancelled';
      } else {
        status = 'pending';
      }

      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      const isOverdue = dueDate && status !== 'paid' && status !== 'cancelled' && new Date() > dueDate;
      if (isOverdue) {
        status = 'overdue';
      }

      return {
        id: `ar-${invoice.id}`,
        type: 'receivable' as const,
        referenceNumber: invoice.invoiceNumber || `INV-${invoice.id}`,
        partyName: customer?.name || 'Unknown Customer',
        partyEmail: customer?.email || '',
        totalAmount,
        paidAmount,
        outstandingAmount,
        currency: invoice.currency || 'USD',
        dueDate: invoice.dueDate,
        status,
        createdAt: invoice.createdAt,
        paidAt: invoice.paidAt,
        notes: invoice.notes || '',
        original: invoice,
      };
    });

    const apPayments = purchaseOrders.map((po: any) => {
      const supplier = suppliers.find((s: any) => s.id === po.supplierId);
      const totalAmount = parseFloat(po.totalAmount || po.amount || 0);
      const paidAmount = parseFloat(po.paidAmount || 0);
      const outstandingAmount = totalAmount - paidAmount;

      let status: PaymentStatus = 'pending';
      if (po.status === 'PAID' || paidAmount >= totalAmount) {
        status = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        status = 'partial';
      } else if (po.status === 'CANCELLED') {
        status = 'cancelled';
      } else {
        status = 'pending';
      }

      const dueDate = po.dueDate || po.expectedDate;
      const isOverdue = dueDate && status !== 'paid' && status !== 'cancelled' && new Date() > new Date(dueDate);
      if (isOverdue) {
        status = 'overdue';
      }

      return {
        id: `ap-${po.id}`,
        type: 'payable' as const,
        referenceNumber: po.poNumber || po.billNumber || `PO-${po.id}`,
        partyName: supplier?.name || 'Unknown Supplier',
        partyEmail: supplier?.email || '',
        totalAmount,
        paidAmount,
        outstandingAmount,
        currency: po.currency || 'USD',
        dueDate: dueDate,
        status,
        createdAt: po.createdAt,
        paidAt: po.paidAt,
        notes: po.notes || '',
        original: po,
      };
    });

    return [...arPayments, ...apPayments];
  }, [invoices, purchaseOrders, customers, suppliers]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = processedPayments;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item: any) =>
        item.referenceNumber.toLowerCase().includes(query) ||
        item.partyName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.type === typeFilter);
    }

    // Sort by date (newest first)
    return filtered.sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [processedPayments, searchQuery, statusFilter, typeFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredPayments.length;
    const pending = filteredPayments.filter((item: any) => item.status === 'pending');
    const partial = filteredPayments.filter((item: any) => item.status === 'partial');
    const paid = filteredPayments.filter((item: any) => item.status === 'paid');
    const overdue = filteredPayments.filter((item: any) => item.status === 'overdue');
    const receivable = filteredPayments.filter((item: any) => item.type === 'receivable');
    const payable = filteredPayments.filter((item: any) => item.type === 'payable');

    const totalOutstanding = filteredPayments.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const receivableOutstanding = receivable.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const payableOutstanding = payable.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const overdueAmount = overdue.reduce((sum: number, item: any) => sum + item.outstandingAmount, 0);
    const paidAmount = paid.reduce((sum: number, item: any) => sum + item.paidAmount, 0);

    return {
      total,
      pending: pending.length,
      partial: partial.length,
      paid: paid.length,
      overdue: overdue.length,
      receivable: receivable.length,
      payable: payable.length,
      totalOutstanding,
      receivableOutstanding,
      payableOutstanding,
      overdueAmount,
      paidAmount,
    };
  }, [filteredPayments]);

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partial':
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

  const getTypeColor = (type: string) => {
    return type === 'receivable'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
              <p className="text-[28px] font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalOutstanding.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {summaryMetrics.total} payments
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Receivable</p>
              <p className="text-[28px] font-bold text-green-600 dark:text-green-400 mt-1">
                ${summaryMetrics.receivableOutstanding.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {summaryMetrics.receivable} items
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Payable</p>
              <p className="text-[28px] font-bold text-red-600 dark:text-red-400 mt-1">
                ${summaryMetrics.payableOutstanding.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {summaryMetrics.payable} items
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-[28px] font-bold text-red-600 dark:text-red-400 mt-1">
                ${summaryMetrics.overdueAmount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {summaryMetrics.overdue} items
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
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
              placeholder="Search by reference number, party name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'receivable', label: 'Receivable' },
                  { value: 'payable', label: 'Payable' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payments found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'No payment records found. Payments will appear here once invoices or purchase orders are created.'}
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Reference Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Paid Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Outstanding
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
                {paginatedPayments.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}>
                        {item.type === 'receivable' ? 'AR' : 'AP'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.referenceNumber}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.partyName}
                      </div>
                      {item.partyEmail && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.partyEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.currency} {item.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.currency} {item.paidAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${item.outstandingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                        {item.currency} {item.outstandingAmount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedPayment(item)}
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

      {/* Pagination */}
      {filteredPayments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredPayments.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredPayments.length}</span> results
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

      {/* Payment Details Modal */}
      {selectedPayment && (
        <PaymentDetailsModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}
    </div>
  );
}

// Payment Details Modal Component
interface PaymentDetailsModalProps {
  payment: any;
  onClose: () => void;
}

function PaymentDetailsModal({ payment, onClose }: PaymentDetailsModalProps) {
  if (!payment) return null;

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partial':
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

  const getTypeColor = (type: string) => {
    return type === 'receivable'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{payment.referenceNumber}</p>
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
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                  <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(payment.type)}`}>
                    {payment.type === 'receivable' ? 'Accounts Receivable' : 'Accounts Payable'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <span className={`mt-2 inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(payment.status)}`}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {payment.currency} {payment.outstandingAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {payment.currency} {payment.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid Amount</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                {payment.currency} {payment.paidAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">
                {payment.currency} {payment.outstandingAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Party & Payment Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">
                {payment.type === 'receivable' ? 'Customer' : 'Supplier'} Information
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{payment.partyName}</p>
                </div>
                {payment.partyEmail && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{payment.partyEmail}</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Reference Number</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{payment.referenceNumber}</p>
                </div>
                {payment.dueDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {payment.paidDate && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Paid Date</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {new Date(payment.paidDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(payment.createdDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{payment.notes}</p>
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
