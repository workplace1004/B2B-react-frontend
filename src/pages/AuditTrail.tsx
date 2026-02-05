import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Search,
  Filter,
  ChevronDown,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  FileText,
  ShoppingCart,
  Package,
  User,
  Calendar,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TransactionType = 'order' | 'payment' | 'inventory' | 'invoice' | 'credit-note' | 'return' | 'adjustment';
type TransactionStatus = 'completed' | 'pending' | 'failed' | 'cancelled' | 'refunded';

interface Transaction {
  id: string | number;
  type: TransactionType;
  status: TransactionStatus;
  entityId: string | number;
  entityName: string;
  amount: number;
  currency: string;
  userId: string | number;
  userName: string;
  timestamp: string;
  description: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
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

// Helper functions
function getTypeIcon(type: TransactionType) {
  switch (type) {
    case 'order':
      return ShoppingCart;
    case 'payment':
      return DollarSign;
    case 'inventory':
      return Package;
    case 'invoice':
      return FileText;
    case 'credit-note':
      return FileText;
    case 'return':
      return ArrowRight;
    case 'adjustment':
      return TrendingUp;
    default:
      return ClipboardList;
  }
}

function getTypeColor(type: TransactionType) {
  switch (type) {
    case 'order':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'payment':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'inventory':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'invoice':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'credit-note':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'return':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'adjustment':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  }
}

function getStatusColor(status: TransactionStatus) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    case 'refunded':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  }
}

function getStatusIcon(status: TransactionStatus) {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'pending':
      return Clock;
    case 'failed':
      return X;
    case 'cancelled':
      return X;
    case 'refunded':
      return ArrowRight;
    default:
      return AlertCircle;
  }
}

export default function AuditTrail() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch orders, invoices, payments, etc. for transaction history
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'audit-trail'],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', 'audit-trail'],
    queryFn: async () => {
      try {
        const response = await api.get('/proforma-invoices?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'audit-trail'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const isLoading = ordersLoading || invoicesLoading || customersLoading;

  // Process transactions from API data
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];

    // Process orders
    if (ordersData && Array.isArray(ordersData)) {
      ordersData.forEach((order: any) => {
        allTransactions.push({
          id: `order-${order.id}`,
          type: 'order',
          status: order.status === 'COMPLETED' ? 'completed' : order.status === 'CANCELLED' ? 'cancelled' : 'pending',
          entityId: order.id,
          entityName: `Order #${order.orderNumber || order.id}`,
          amount: order.totalAmount || 0,
          currency: order.currency || 'USD',
          userId: order.customerId || 'system',
          userName: order.customerName || 'System',
          timestamp: order.createdAt || new Date().toISOString(),
          description: `Order ${order.status?.toLowerCase() || 'created'}`,
          changes: [
            {
              field: 'status',
              oldValue: null,
              newValue: order.status,
            },
          ],
          metadata: {
            orderNumber: order.orderNumber,
            itemsCount: order.items?.length || 0,
            warehouseId: order.warehouseId,
          },
        });
      });
    }

    // Process invoices
    if (invoicesData && Array.isArray(invoicesData)) {
      invoicesData.forEach((invoice: any) => {
        allTransactions.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          status: invoice.status === 'PAID' ? 'completed' : invoice.status === 'CANCELLED' ? 'cancelled' : 'pending',
          entityId: invoice.id,
          entityName: `Invoice #${invoice.invoiceNumber || invoice.id}`,
          amount: invoice.totalAmount || 0,
          currency: invoice.currency || 'USD',
          userId: invoice.customerId || 'system',
          userName: invoice.customerName || 'System',
          timestamp: invoice.createdAt || new Date().toISOString(),
          description: `Invoice ${invoice.status?.toLowerCase() || 'created'}`,
          changes: [
            {
              field: 'status',
              oldValue: null,
              newValue: invoice.status,
            },
          ],
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            dueDate: invoice.dueDate,
            paymentStatus: invoice.paymentStatus,
          },
        });
      });
    }

    // Generate additional mock transactions for demonstration
    const now = new Date();
    for (let i = 0; i < 50; i++) {
      const date = new Date(now);
      date.setHours(date.getHours() - i * 2);
      const types: TransactionType[] = ['payment', 'inventory', 'return', 'adjustment', 'credit-note'];
      const statuses: TransactionStatus[] = ['completed', 'pending', 'failed', 'cancelled', 'refunded'];
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      allTransactions.push({
        id: `mock-${i + 1}`,
        type,
        status,
        entityId: i + 1,
        entityName: `${type.charAt(0).toUpperCase() + type.slice(1)} #${i + 1}`,
        amount: Math.random() * 10000,
        currency: 'USD',
        userId: Math.floor(Math.random() * 10) + 1,
        userName: `User ${Math.floor(Math.random() * 10) + 1}`,
        timestamp: date.toISOString(),
        description: `${type} transaction ${status}`,
        changes: [
          {
            field: 'amount',
            oldValue: Math.random() * 5000,
            newValue: Math.random() * 10000,
          },
        ],
        metadata: {
          reference: `REF-${i + 1}`,
        },
      });
    }

    // Sort by timestamp (newest first)
    return allTransactions.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [ordersData, invoicesData, customersData]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.entityName.toLowerCase().includes(query) ||
        tx.description.toLowerCase().includes(query) ||
        tx.userName.toLowerCase().includes(query) ||
        tx.id.toString().toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.status === statusFilter);
    }

    // Filter by date range
    if (dateRangeFilter === 'custom') {
      if (startDate) {
        filtered = filtered.filter((tx) => new Date(tx.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        filtered = filtered.filter((tx) => new Date(tx.timestamp) <= new Date(endDate + 'T23:59:59'));
      }
    } else if (dateRangeFilter !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      switch (dateRangeFilter) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      filtered = filtered.filter((tx) => new Date(tx.timestamp) >= cutoffDate);
    }

    return filtered;
  }, [transactions, searchQuery, typeFilter, statusFilter, dateRangeFilter, startDate, endDate]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredTransactions.length;
    const completed = filteredTransactions.filter((tx) => tx.status === 'completed');
    const pending = filteredTransactions.filter((tx) => tx.status === 'pending');
    const failed = filteredTransactions.filter((tx) => tx.status === 'failed');
    const totalAmount = filteredTransactions
      .filter((tx) => tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      total,
      completed: completed.length,
      pending: pending.length,
      failed: failed.length,
      totalAmount,
    };
  }, [filteredTransactions]);

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Audit Trail" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Audit Trail</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Complete transaction history and audit log
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.completed.toLocaleString()}
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
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pending.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.failed.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <X className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by transaction ID, entity name, user, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[180px]">
              <CustomDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'order', label: 'Order' },
                  { value: 'payment', label: 'Payment' },
                  { value: 'inventory', label: 'Inventory' },
                  { value: 'invoice', label: 'Invoice' },
                  { value: 'credit-note', label: 'Credit Note' },
                  { value: 'return', label: 'Return' },
                  { value: 'adjustment', label: 'Adjustment' },
                ]}
              />
            </div>
            <div className="min-w-[180px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'cancelled', label: 'Cancelled' },
                  { value: 'refunded', label: 'Refunded' },
                ]}
              />
            </div>
            <div className="min-w-[180px]">
              <CustomDropdown
                value={dateRangeFilter}
                onChange={setDateRangeFilter}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: 'month', label: 'Last 30 Days' },
                  { value: 'year', label: 'Last Year' },
                  { value: 'custom', label: 'Custom Range' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRangeFilter === 'custom' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className="text-sm text-gray-700 dark:text-gray-300">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className="text-sm text-gray-700 dark:text-gray-300">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transaction History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <ClipboardList className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Try adjusting your filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => {
                  const TypeIcon = getTypeIcon(transaction.type);
                  const StatusIcon = getStatusIcon(transaction.status);

                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-gray-400" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(transaction.type)}`}>
                            {transaction.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.entityName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {transaction.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${transaction.status === 'completed' ? 'text-green-600 dark:text-green-400' : transaction.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : transaction.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.userName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(transaction.timestamp).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransaction(transaction);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

// Transaction Details Modal
interface TransactionDetailsModalProps {
  transaction: Transaction;
  onClose: () => void;
}

function TransactionDetailsModal({ transaction, onClose }: TransactionDetailsModalProps) {
  const TypeIcon = getTypeIcon(transaction.type);
  const StatusIcon = getStatusIcon(transaction.status);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{transaction.entityName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="flex items-center gap-2">
                <TypeIcon className="w-5 h-5 text-gray-400" />
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(transaction.type)}`}>
                  {transaction.type}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="flex items-center gap-2">
                <StatusIcon className={`w-5 h-5 ${transaction.status === 'completed' ? 'text-green-600 dark:text-green-400' : transaction.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : transaction.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} />
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
            </div>
          </div>

          {/* Transaction Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transaction ID
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {transaction.id}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entity ID
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {transaction.entityId}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entity Name
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              {transaction.entityName}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              {transaction.description}
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-900 dark:text-white">
                {transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {transaction.currency}
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User ID
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {transaction.userId}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Name
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {transaction.userName}
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timestamp
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              {new Date(transaction.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Changes */}
          {transaction.changes && transaction.changes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Changes
              </label>
              <div className="space-y-2">
                {transaction.changes.map((change, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {change.field}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="line-through">{String(change.oldValue ?? 'N/A')}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-medium">{String(change.newValue ?? 'N/A')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metadata
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <pre className="text-xs text-gray-900 dark:text-white overflow-x-auto">
                  {JSON.stringify(transaction.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
