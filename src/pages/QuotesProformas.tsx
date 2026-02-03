import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FileText, Receipt, Plus, Search, X, Pencil, Trash2, Eye, Download, Send, ChevronDown, Inbox, Package } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'quote-builder' | 'proforma-invoices';

export default function QuotesProformas() {
  const [activeTab, setActiveTab] = useState<TabType>('quote-builder');

  const tabs = [
    { id: 'quote-builder' as TabType, label: 'Quote Builder', icon: FileText },
    { id: 'proforma-invoices' as TabType, label: 'Proforma Invoices', icon: Receipt },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Quotes & Proformas" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quotes & Proformas</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Create quotes and generate proforma invoices</p>
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
        {activeTab === 'quote-builder' && <QuoteBuilderSection />}
        {activeTab === 'proforma-invoices' && <ProformaInvoicesSection />}
      </div>
    </div>
  );
}

// Custom Select Component
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  error?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(options[highlightedIndex].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={selectRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 10001 : 'auto', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isOpen ? 'ring-2 ring-primary-500' : ''}`}
        style={{
          padding: '0.532rem 0.6rem 0.532rem 1.2rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.6,
        }}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-auto custom-dropdown-menu"
          style={{
            zIndex: 10001,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            position: 'absolute',
            maxHeight: '400px',
          }}
        >
          {options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
            </div>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    isSelected || isHighlighted
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    display: 'block',
                    width: '100%',
                  }}
                >
                  {option.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// Quote Builder Section Component
function QuoteBuilderSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch quotes - using orders as placeholder until backend is ready
  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['quotes', searchQuery, statusFilter],
    queryFn: async () => {
      try {
        // TODO: Replace with actual quotes API endpoint when backend is ready
        const response = await api.get('/orders?skip=0&take=1000');
        let quotes = (response.data?.data || []).filter((order: any) => 
          order.status === 'DRAFT' || order.status === 'PENDING'
        );
        
        // Filter by status
        if (statusFilter !== 'all') {
          quotes = quotes.filter((quote: any) => quote.status === statusFilter);
        }
        
        // Filter by search query
        if (searchQuery) {
          quotes = quotes.filter((quote: any) =>
            quote.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quote.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        return quotes;
      } catch (error) {
        return [];
      }
    },
  });

  const quotes = quotesData || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SENT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'REJECTED':
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'DRAFT':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search quotes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Quote
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter by status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      {quotes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No quotes found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Get started by creating your first quote.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Quote
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Quote Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Valid Until</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {quotes.map((quote: any) => (
                  <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {quote.orderNumber || `QUO-${quote.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {quote.customer?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {quote.requiredDate ? new Date(quote.requiredDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {quote.orderLines?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${parseFloat(quote.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(quote.status)}`}>
                        {quote.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedQuote(quote);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement download functionality
                            toast.success('Quote download started');
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement send functionality
                            toast.success('Quote sent to customer');
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Send"
                        >
                          <Send className="w-4 h-4" />
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

      {/* Create/Edit Quote Modal - Placeholder for now */}
      {isModalOpen && (
        <QuoteModal
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            setIsModalOpen(false);
          }}
        />
      )}

      {isEditModalOpen && selectedQuote && (
        <QuoteModal
          quote={selectedQuote}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedQuote(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            setIsEditModalOpen(false);
            setSelectedQuote(null);
          }}
        />
      )}
    </div>
  );
}

// Quote Modal Component
function QuoteModal({ quote, onClose, onSave }: { quote?: any; onClose: () => void; onSave: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    customerId: quote?.customerId?.toString() || '',
    validUntil: quote?.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '',
    taxRate: quote?.taxRate?.toString() || '0',
    discountPercent: quote?.discountPercent?.toString() || '0',
    notes: quote?.notes || '',
    terms: quote?.terms || '',
  });
  const [quoteLines, setQuoteLines] = useState<Array<{
    productId: string;
    quantity: string;
    unitPrice: string;
    size?: string;
    color?: string;
    description?: string;
  }>>(quote?.quoteLines?.map((line: any) => ({
    productId: line.productId.toString(),
    quantity: line.quantity.toString(),
    unitPrice: line.unitPrice.toString(),
    size: line.size || '',
    color: line.color || '',
    description: line.description || '',
  })) || []);

  // Fetch customers and products
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'dropdown'],
    queryFn: async () => {
      const response = await api.get('/customers?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', 'dropdown'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // TODO: Replace with actual quotes API endpoint when backend is ready
      await api.post('/orders', data);
    },
    onSuccess: () => {
      toast.success('Quote created successfully!');
      onSave();
    },
    onError: () => {
      toast.error('Failed to create quote');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // TODO: Replace with actual quotes API endpoint when backend is ready
      await api.patch(`/orders/${quote.id}`, data);
    },
    onSuccess: () => {
      toast.success('Quote updated successfully!');
      onSave();
    },
    onError: () => {
      toast.error('Failed to update quote');
    },
  });

  const handleAddLine = () => {
    setQuoteLines([...quoteLines, {
      productId: '',
      quantity: '1',
      unitPrice: '0',
      size: '',
      color: '',
      description: '',
    }]);
  };

  const handleRemoveLine = (index: number) => {
    setQuoteLines(quoteLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const updated = [...quoteLines];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].unitPrice) || 0;
      // Note: totalPrice is calculated on backend, but we can show it in UI
    }
    
    setQuoteLines(updated);
  };

  const calculateTotals = () => {
    const subtotal = quoteLines.reduce((sum, line) => {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unitPrice) || 0;
      return sum + (qty * price);
    }, 0);
    
    const taxRate = parseFloat(formData.taxRate) || 0;
    const discountPercent = parseFloat(formData.discountPercent) || 0;
    
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;
    
    return { subtotal, discountAmount, taxAmount, total };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || quoteLines.length === 0) {
      toast.error('Please select a customer and add at least one product');
      return;
    }
    
    setIsSaving(true);
    
    const submitData = {
      customerId: parseInt(formData.customerId),
      type: 'B2B',
      status: 'DRAFT',
      totalAmount: totals.total,
      orderLines: quoteLines.map(line => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        unitPrice: parseFloat(line.unitPrice),
        totalPrice: parseFloat(line.quantity) * parseFloat(line.unitPrice),
        size: line.size || undefined,
        color: line.color || undefined,
      })),
      notes: formData.notes || undefined,
      requiredDate: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
    };

    if (quote) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
    
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {quote ? 'Edit Quote' : 'Create New Quote'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer *</label>
              <CustomSelect
                value={formData.customerId}
                onChange={(value) => setFormData({ ...formData, customerId: value })}
                options={(customersData || []).map((c: any) => ({ value: c.id.toString(), label: c.name }))}
                placeholder="Select customer..."
                error={!formData.customerId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valid Until</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Quote Lines */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Products *</label>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
            {quoteLines.length === 0 ? (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No products added. Click "Add Product" to get started.</p>
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {quoteLines.map((line, index) => {
                      const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <CustomSelect
                              value={line.productId}
                              onChange={(value) => {
                                const product = (productsData || []).find((p: any) => p.id.toString() === value);
                                handleLineChange(index, 'productId', value);
                                if (product) {
                                  handleLineChange(index, 'unitPrice', (product.price || product.basePrice || 0).toString());
                                }
                              }}
                              options={(productsData || []).map((p: any) => ({ value: p.id.toString(), label: p.name }))}
                              placeholder="Select product..."
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.unitPrice}
                              onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            ${lineTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">${totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">-${totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-medium text-gray-900 dark:text-white">${totals.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-primary-600 dark:text-primary-400">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Actions */}
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
              disabled={isSaving || !formData.customerId || quoteLines.length === 0 || createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving || createMutation.isPending || updateMutation.isPending ? 'Saving...' : quote ? 'Update Quote' : 'Create Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Proforma Invoices Section Component
function ProformaInvoicesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch proforma invoices - using orders as placeholder until backend is ready
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['proforma-invoices', searchQuery, statusFilter],
    queryFn: async () => {
      try {
        // TODO: Replace with actual proforma invoices API endpoint when backend is ready
        const response = await api.get('/orders?skip=0&take=1000');
        let invoices = (response.data?.data || []).filter((order: any) => 
          order.type === 'B2B' || order.type === 'WHOLESALE'
        );
        
        // Filter by status
        if (statusFilter !== 'all') {
          invoices = invoices.filter((invoice: any) => {
            if (statusFilter === 'PAID') {
              return invoice.status === 'FULFILLED' || invoice.status === 'DELIVERED';
            }
            return invoice.status === statusFilter;
          });
        }
        
        // Filter by search query
        if (searchQuery) {
          invoices = invoices.filter((invoice: any) =>
            invoice.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        return invoices;
      } catch (error) {
        return [];
      }
    },
  });

  const invoices = invoicesData || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'FULFILLED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SENT':
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'DRAFT':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Proforma Invoice
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter by status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Receipt className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No proforma invoices found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Get started by creating your first proforma invoice.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Proforma Invoice
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Invoice Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Invoice Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      INV-{invoice.orderNumber || invoice.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {invoice.customer?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(invoice.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {invoice.requiredDate ? new Date(invoice.requiredDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {invoice.orderLines?.length || 0} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${parseFloat(invoice.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        invoice.status === 'FULFILLED' || invoice.status === 'DELIVERED' ? 'PAID' : invoice.status
                      )}`}>
                        {invoice.status === 'FULFILLED' || invoice.status === 'DELIVERED' ? 'PAID' : invoice.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement download functionality
                            toast.success('Proforma invoice download started');
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement send functionality
                            toast.success('Proforma invoice sent to customer');
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Send"
                        >
                          <Send className="w-4 h-4" />
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

      {/* Create/Edit Invoice Modal - Placeholder */}
      {isModalOpen && (
        <ProformaInvoiceModal
          invoice={selectedInvoice}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInvoice(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
            setIsModalOpen(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

// Proforma Invoice Modal Component (simplified for now)
function ProformaInvoiceModal({ invoice, onClose, onSave }: { invoice?: any; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {invoice ? 'Proforma Invoice Details' : 'Create New Proforma Invoice'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {invoice ? `Invoice details for INV-${invoice.orderNumber || invoice.id}` : 'Proforma invoice creation form will be implemented here. You can generate invoices from quotes or create new ones.'}
          </p>
        </div>
      </div>
    </div>
  );
}
