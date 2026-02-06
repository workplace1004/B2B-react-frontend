import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FileText, Receipt, Plus, Search, X, Edit, Trash2, Eye, Download, Send, ChevronDown, Inbox, Package, Calendar, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
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
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Quotes & Proformas</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Create quotes and generate proforma invoices</p>
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calculate dropdown position
  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(400, options.length * 42 + 8); // Approximate height
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Open upward if not enough space below, otherwise open downward
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Calculate left position to keep dropdown aligned with button
      let left = rect.left;
      const viewportWidth = window.innerWidth;
      const dropdownWidth = rect.width;
      
      // Ensure dropdown doesn't go off-screen
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }
      
      setDropdownPosition({
        top: openUpward ? Math.max(16, rect.top - dropdownHeight - 4) : Math.min(rect.bottom + 4, viewportHeight - dropdownHeight - 16),
        left: left,
        width: dropdownWidth,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current && !selectRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      calculateDropdownPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', calculateDropdownPosition);
      window.addEventListener('scroll', calculateDropdownPosition, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', calculateDropdownPosition);
        window.removeEventListener('scroll', calculateDropdownPosition, true);
      };
    }
  }, [isOpen, options.length]);

  const selectedOption = options.find((opt) => opt.value === value);
  // Debug logging
  if (value && !selectedOption) {
    console.log('CustomSelect - value not found in options. Value:', value, 'Options:', options.map(o => o.value));
  }

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
    <>
      <div ref={selectRef} className={`relative ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            if (!isOpen) {
              calculateDropdownPosition();
            }
            setIsOpen(!isOpen);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between bg-white transition-all ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            } ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''} hover:border-gray-400 dark:hover:border-gray-500`}
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
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => setIsOpen(false)} />
          <div
            ref={dropdownRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden custom-dropdown-menu"
            style={{
              zIndex: 10001,
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${Math.max(dropdownPosition.width || 200, 200)}px`,
              minWidth: '200px',
              maxHeight: '400px',
              overflowY: 'auto',
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
              const isHighlighted = index === highlightedIndex && !isSelected;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${isSelected
                    ? 'bg-blue-500 text-white font-medium'
                    : isHighlighted
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 500 : 400,
                    display: 'block',
                    width: '100%',
                    lineHeight: '1.5',
                  }}
                >
                  {option.label}
                </button>
              );
            })
          )}
          </div>
        </>
      )}
    </>
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
    <div className="">
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search quotes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ::placeholder-[12px] text-[14px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <CustomSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'ACCEPTED', label: 'Accepted' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'EXPIRED', label: 'Expired' },
                ]}
                placeholder="All Statuses"
                className="w-auto min-w-[180px]"
              />
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex text-[14px] items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quote
          </button>
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
                          <Edit className="w-4 h-4" />
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

  // Calendar state for Valid Until
  const [isValidUntilCalendarOpen, setIsValidUntilCalendarOpen] = useState(false);
  const [validUntilCalendarDate, setValidUntilCalendarDate] = useState(() => {
    if (formData.validUntil) {
      return new Date(formData.validUntil);
    }
    return new Date();
  });
  const [validUntilCalendarPosition, setValidUntilCalendarPosition] = useState({ top: 0, left: 0 });
  const validUntilCalendarRef = useRef<HTMLDivElement>(null);
  const validUntilCalendarButtonRef = useRef<HTMLDivElement>(null);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateValidUntilMonth = (direction: 'prev' | 'next') => {
    setValidUntilCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateValidUntilYear = (direction: 'prev' | 'next') => {
    setValidUntilCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setFullYear(prev.getFullYear() - 1);
      } else {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };

  const handleValidUntilDateSelect = (day: number) => {
    const selected = new Date(validUntilCalendarDate.getFullYear(), validUntilCalendarDate.getMonth(), day);
    const formattedDate = selected.toISOString().split('T')[0];
    setFormData({ ...formData, validUntil: formattedDate });
    setIsValidUntilCalendarOpen(false);
  };

  const handleValidUntilClearDate = () => {
    setFormData({ ...formData, validUntil: '' });
    setIsValidUntilCalendarOpen(false);
  };

  const handleValidUntilToday = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setFormData({ ...formData, validUntil: formattedDate });
    setValidUntilCalendarDate(today);
    setIsValidUntilCalendarOpen(false);
  };

  const isValidUntilSelected = (day: number) => {
    if (!formData.validUntil) return false;
    const selected = new Date(formData.validUntil);
    return (
      selected.getDate() === day &&
      selected.getMonth() === validUntilCalendarDate.getMonth() &&
      selected.getFullYear() === validUntilCalendarDate.getFullYear()
    );
  };

  const isToday = (day: number, calendarDate: Date) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === calendarDate.getMonth() &&
      today.getFullYear() === calendarDate.getFullYear()
    );
  };

  // Calculate calendar position
  const calculateValidUntilCalendarPosition = () => {
    if (validUntilCalendarButtonRef.current) {
      const rect = validUntilCalendarButtonRef.current.getBoundingClientRect();
      const calendarHeight = 400;
      const calendarWidth = 320;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const openUpward = spaceBelow < calendarHeight && spaceAbove > spaceBelow;
      
      let top: number;
      if (openUpward) {
        top = Math.max(16, rect.top - calendarHeight - 4);
      } else {
        top = rect.bottom + 4;
        if (top + calendarHeight > viewportHeight - 16) {
          top = viewportHeight - calendarHeight - 16;
        }
      }
      
      // Align calendar to the left edge of the input field
      let left = rect.left;
      
      // If calendar goes off the right edge, align to the right edge of the input
      if (left + calendarWidth > viewportWidth - 16) {
        left = rect.right - calendarWidth;
      }
      
      // Ensure calendar doesn't go off the left edge
      if (left < 16) {
        left = 16;
      }
      
      setValidUntilCalendarPosition({ top, left });
    }
  };

  // Update calendar date when formData changes
  useEffect(() => {
    if (formData.validUntil) {
      const date = new Date(formData.validUntil);
      if (!isNaN(date.getTime())) {
        setValidUntilCalendarDate(date);
      }
    }
  }, [formData.validUntil]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isValidUntilCalendarOpen) {
        const target = event.target as Node;
        const isClickInsideCalendar = validUntilCalendarRef.current?.contains(target);
        const isClickInsideInput = validUntilCalendarButtonRef.current?.contains(target);
        
        if (!isClickInsideCalendar && !isClickInsideInput) {
          setIsValidUntilCalendarOpen(false);
        }
      }
    };

    const handleResize = () => {
      if (isValidUntilCalendarOpen) {
        calculateValidUntilCalendarPosition();
      }
    };

    if (isValidUntilCalendarOpen) {
      calculateValidUntilCalendarPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isValidUntilCalendarOpen]);

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

  // Memoize product options to ensure stable reference
  const productOptions = useMemo(() => {
    return (productsData || []).map((p: any) => ({ 
      value: p.id.toString(), 
      label: p.name 
    }));
  }, [productsData]);

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
    setQuoteLines(prevLines => {
      const updated = [...prevLines];
    updated[index] = { ...updated[index], [field]: value };
      console.log('handleLineChange - field:', field, 'value:', value, 'updated line:', updated[index], 'all lines:', updated);
      return updated;
    });

    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      // Note: totalPrice is calculated on backend, but we can show it in UI
    }
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {quote ? 'Edit Quote' : 'Create New Quote'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors dark:text-white"
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
              <div className="relative" ref={validUntilCalendarButtonRef}>
                <input
                  type="text"
                  value={formData.validUntil ? new Date(formData.validUntil).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, validUntil: value });
                  }}
                  onClick={() => setIsValidUntilCalendarOpen(!isValidUntilCalendarOpen)}
                  placeholder="mm/dd/yyyy"
                  className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setIsValidUntilCalendarOpen(!isValidUntilCalendarOpen)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </button>

                {isValidUntilCalendarOpen && (
                  <>
                    <div className="fixed inset-0 z-[10001]" onClick={() => setIsValidUntilCalendarOpen(false)} />
                    <div 
                      ref={validUntilCalendarRef}
                      className="fixed w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700" 
                      style={{ 
                        zIndex: 10002,
                        top: `${validUntilCalendarPosition.top}px`,
                        left: `${validUntilCalendarPosition.left}px`,
                        maxHeight: '90vh',
                        overflowY: 'auto'
                      }}
                    >
                      {/* Calendar Header */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            type="button"
                            onClick={() => navigateValidUntilMonth('prev')}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              {validUntilCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => navigateValidUntilYear('next')}
                                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <ChevronUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigateValidUntilYear('prev')}
                                className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              >
                                <ChevronDown className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigateValidUntilMonth('next')}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {/* Calendar Days */}
                      <div className="p-4">
                        {/* Day names */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                            <div
                              key={day}
                              className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1"
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {/* Empty cells for days before month starts */}
                          {Array.from({ length: getFirstDayOfMonth(validUntilCalendarDate) }).map((_, index) => (
                            <div key={`empty-${index}`} className="aspect-square"></div>
                          ))}
                          {/* Days of the month */}
                          {Array.from({ length: getDaysInMonth(validUntilCalendarDate) }, (_, i) => i + 1).map((day) => {
                            const isSelectedDay = isValidUntilSelected(day);
                            const isTodayDay = isToday(day, validUntilCalendarDate);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleValidUntilDateSelect(day)}
                                className={`aspect-square rounded text-sm font-medium transition-all ${
                                  isSelectedDay
                                    ? 'bg-primary-600 text-white'
                                    : isTodayDay
                                      ? 'bg-primary-200 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                          {/* Days from next month to fill grid */}
                          {(() => {
                            const totalCells = getFirstDayOfMonth(validUntilCalendarDate) + getDaysInMonth(validUntilCalendarDate);
                            const remainingCells = 42 - totalCells;
                            return Array.from({ length: remainingCells }, (_, i) => i + 1).map((day) => (
                              <div
                                key={`next-${day}`}
                                className="aspect-square text-sm text-gray-400 dark:text-gray-600"
                              >
                                {day}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Calendar Footer */}
                      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleValidUntilClearDate}
                          className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={handleValidUntilToday}
                          className="px-4 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                      <th className="px-4 py-3 text-left min-w-[200px] text-xs font-medium text-gray-500 dark:text-white uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {quoteLines.map((line, index) => {
                      const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                      // Ensure productId is always a string
                      const productIdValue = line.productId ? String(line.productId) : '';
                      console.log('Rendering line', index, '- productIdValue:', productIdValue, 'line.productId:', line.productId, 'productOptions length:', productOptions.length);
                      const matchingOption = productOptions.find((opt: { value: string; label: string }) => opt.value === productIdValue);
                      console.log('Matching option for value', productIdValue, ':', matchingOption);
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <CustomSelect
                              value={productIdValue}
                              onChange={(value) => {
                                console.log('onChange called with value:', value, 'type:', typeof value);
                                const product = (productsData || []).find((p: any) => p.id.toString() === value);
                                console.log('Product selection - value:', value, 'product:', product, 'current productIdValue:', productIdValue);
                                handleLineChange(index, 'productId', String(value));
                                if (product) {
                                  console.log('Selected product name:', product.name);
                                  handleLineChange(index, 'unitPrice', (product.price || product.basePrice || 0).toString());
                                }
                              }}
                              options={productOptions}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 ::placeholder-[12px] text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <CustomSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'SENT', label: 'Sent' },
                  { value: 'PAID', label: 'Paid' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
                placeholder="All Statuses"
                className="w-auto min-w-[180px]"
              />
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Proforma Invoice
          </button>
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

// Proforma Invoice Modal Component
function ProformaInvoiceModal({ invoice, onClose, onSave }: { invoice?: any; onClose: () => void; onSave: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    customerId: invoice?.customerId?.toString() || '',
    quoteId: invoice?.quoteId?.toString() || '',
    dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
    taxRate: invoice?.taxRate?.toString() || '0',
    discountPercent: invoice?.discountPercent?.toString() || '0',
    notes: invoice?.notes || '',
    terms: invoice?.terms || '',
  });
  const [invoiceLines, setInvoiceLines] = useState<Array<{
    productId: string;
    quantity: string;
    unitPrice: string;
    size?: string;
    color?: string;
    description?: string;
  }>>(invoice?.invoiceLines?.map((line: any) => ({
    productId: line.productId.toString(),
    quantity: line.quantity.toString(),
    unitPrice: line.unitPrice.toString(),
    size: line.size || '',
    color: line.color || '',
    description: line.description || '',
  })) || []);

  // Calendar state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    if (invoice?.dueDate) {
      return new Date(invoice.dueDate);
    }
    return new Date();
  });
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setFullYear(prev.getFullYear() - 1);
      } else {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    const formattedDate = selected.toISOString().split('T')[0];
    setFormData({ ...formData, dueDate: formattedDate });
    setIsCalendarOpen(false);
  };

  const handleClearDate = () => {
    setFormData({ ...formData, dueDate: '' });
    setIsCalendarOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setFormData({ ...formData, dueDate: formattedDate });
    setCalendarDate(today);
    setIsCalendarOpen(false);
  };

  const isSelected = (day: number) => {
    if (!formData.dueDate) return false;
    const selected = new Date(formData.dueDate);
    return (
      selected.getDate() === day &&
      selected.getMonth() === calendarDate.getMonth() &&
      selected.getFullYear() === calendarDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === calendarDate.getMonth() &&
      today.getFullYear() === calendarDate.getFullYear()
    );
  };

  // Calculate calendar position
  const calculateCalendarPosition = () => {
    if (calendarButtonRef.current) {
      const rect = calendarButtonRef.current.getBoundingClientRect();
      const calendarHeight = 400; // Approximate calendar height
      const calendarWidth = 320; // w-80 = 320px
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Open upward if not enough space below, otherwise open downward
      const openUpward = spaceBelow < calendarHeight && spaceAbove > spaceBelow;
      
      // Calculate left position to keep calendar in viewport
      let left = rect.left;
      if (left + calendarWidth > viewportWidth) {
        left = viewportWidth - calendarWidth - 16; // 16px padding from edge
      }
      if (left < 16) {
        left = 16; // 16px padding from edge
      }
      
      setCalendarPosition({
        top: openUpward ? Math.max(16, rect.top - calendarHeight - 4) : Math.min(rect.bottom + 4, viewportHeight - calendarHeight - 16),
        left: left,
      });
    }
  };

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node) &&
          calendarButtonRef.current && !calendarButtonRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      calculateCalendarPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', calculateCalendarPosition);
      window.addEventListener('scroll', calculateCalendarPosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', calculateCalendarPosition);
      window.removeEventListener('scroll', calculateCalendarPosition, true);
    };
  }, [isCalendarOpen]);

  // Fetch customers, quotes, and products
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'dropdown'],
    queryFn: async () => {
      const response = await api.get('/customers?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  const { data: quotesData } = useQuery({
    queryKey: ['quotes', 'dropdown'],
    queryFn: async () => {
      try {
        const response = await api.get('/quotes?skip=0&take=1000');
        return response.data?.data || [];
      } catch {
        return [];
      }
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
      const response = await api.post('/proforma-invoices', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Proforma invoice created successfully!');
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create proforma invoice');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/proforma-invoices/${invoice.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Proforma invoice updated successfully!');
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update proforma invoice');
    },
  });

  const handleAddLine = () => {
    setInvoiceLines([...invoiceLines, {
      productId: '',
      quantity: '1',
      unitPrice: '0',
      size: '',
      color: '',
      description: '',
    }]);
  };

  const handleRemoveLine = (index: number) => {
    setInvoiceLines(invoiceLines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const updated = [...invoiceLines];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceLines(updated);
  };

  const calculateTotals = () => {
    const subtotal = invoiceLines.reduce((sum, line) => {
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
    if (!formData.customerId || invoiceLines.length === 0) {
      toast.error('Please select a customer and add at least one product');
      return;
    }
    
    setIsSaving(true);
    
    const submitData = {
      customerId: parseInt(formData.customerId),
      quoteId: formData.quoteId ? parseInt(formData.quoteId) : undefined,
      status: 'DRAFT',
      subtotal: totals.subtotal,
      taxRate: totals.taxAmount > 0 ? parseFloat(formData.taxRate) : 0,
      taxAmount: totals.taxAmount,
      discountPercent: totals.discountAmount > 0 ? parseFloat(formData.discountPercent) : 0,
      discountAmount: totals.discountAmount,
      totalAmount: totals.total,
      currency: 'USD',
      notes: formData.notes || undefined,
      terms: formData.terms || undefined,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      invoiceLines: invoiceLines.map(line => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        unitPrice: parseFloat(line.unitPrice),
        totalPrice: parseFloat(line.quantity) * parseFloat(line.unitPrice),
        size: line.size || undefined,
        color: line.color || undefined,
        description: line.description || undefined,
      })),
    };

    if (invoice) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
    
    setIsSaving(false);
  };

  // Sync calendar date with dueDate
  useEffect(() => {
    if (formData.dueDate) {
      setCalendarDate(new Date(formData.dueDate));
    }
  }, [formData.dueDate]);

  // Load quote data if quote is selected
  useEffect(() => {
    if (formData.quoteId && quotesData) {
      const selectedQuote = quotesData.find((q: any) => q.id.toString() === formData.quoteId);
      if (selectedQuote && invoiceLines.length === 0) {
        setFormData(prev => ({
          ...prev,
          customerId: selectedQuote.customerId?.toString() || prev.customerId,
          taxRate: selectedQuote.taxRate?.toString() || prev.taxRate,
          discountPercent: selectedQuote.discountPercent?.toString() || prev.discountPercent,
        }));
        if (selectedQuote.quoteLines) {
          setInvoiceLines(selectedQuote.quoteLines.map((line: any) => ({
            productId: line.productId.toString(),
            quantity: line.quantity.toString(),
            unitPrice: line.unitPrice.toString(),
            size: line.size || '',
            color: line.color || '',
            description: line.description || '',
          })));
        }
      }
    }
  }, [formData.quoteId, quotesData]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {invoice ? 'Edit Proforma Invoice' : 'Create New Proforma Invoice'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer, Quote, and Due Date */}
          <div className="grid grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quote (Optional)</label>
              <CustomSelect
                value={formData.quoteId}
                onChange={(value) => setFormData({ ...formData, quoteId: value })}
                options={(quotesData || []).map((q: any) => ({ value: q.id.toString(), label: `Quote ${q.quoteNumber || q.id}` }))}
                placeholder="Select quote..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
              <div className="relative">
                <button
                  ref={calendarButtonRef}
                  type="button"
                  onClick={() => {
                    if (!isCalendarOpen) {
                      calculateCalendarPosition();
                    }
                    setIsCalendarOpen(!isCalendarOpen);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <span className="text-sm">
                    {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'mm/dd/yyyy'}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              {isCalendarOpen && (
                <>
                  <div className="fixed inset-0 z-[10001]" onClick={() => setIsCalendarOpen(false)} />
                  <div 
                    ref={calendarRef}
                    className="fixed w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700" 
                    style={{ 
                      zIndex: 10002,
                      top: `${calendarPosition.top}px`,
                      left: `${calendarPosition.left}px`,
                      maxHeight: '90vh',
                      overflowY: 'auto'
                    }}
                  >
                    {/* Calendar Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => navigateMonth('prev')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => navigateYear('next')}
                              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <ChevronUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigateYear('prev')}
                              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <ChevronDown className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateMonth('next')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Calendar Days */}
                    <div className="p-4">
                      {/* Day names */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div
                            key={day}
                            className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, index) => (
                          <div key={`empty-${index}`} className="aspect-square"></div>
                        ))}
                        {/* Days of the month */}
                        {Array.from({ length: getDaysInMonth(calendarDate) }, (_, i) => i + 1).map((day) => {
                          const isSelectedDay = isSelected(day);
                          const isTodayDay = isToday(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDateSelect(day)}
                              className={`aspect-square rounded text-sm font-medium transition-all ${
                                isSelectedDay
                                  ? 'bg-primary-600 text-white'
                                  : isTodayDay
                                    ? 'bg-primary-200 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                        {/* Days from next month to fill grid */}
                        {(() => {
                          const totalCells = getFirstDayOfMonth(calendarDate) + getDaysInMonth(calendarDate);
                          const remainingCells = 42 - totalCells;
                          return Array.from({ length: remainingCells }, (_, i) => i + 1).map((day) => (
                            <div
                              key={`next-${day}`}
                              className="aspect-square text-sm text-gray-400 dark:text-gray-600"
                            >
                              {day}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Calendar Footer */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleClearDate}
                        className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleToday}
                        className="px-4 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Products Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Products *</label>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
            {invoiceLines.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No products added. Click 'Add Product' to get started.</p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Color</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {invoiceLines.map((line, index) => {
                        const product = (productsData || []).find((p: any) => p.id.toString() === line.productId);
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3">
                              <CustomSelect
                                value={line.productId}
                                onChange={(value) => handleLineChange(index, 'productId', value)}
                                options={(productsData || []).map((p: any) => ({ value: p.id.toString(), label: `${p.name} (${p.sku})` }))}
                                placeholder="Select product..."
                                className="min-w-[200px]"
                              />
                            </td>
                            <td className="px-4 py-3">
                              {product?.sizes && product.sizes.length > 0 ? (
                                <CustomSelect
                                  value={line.size || ''}
                                  onChange={(value) => handleLineChange(index, 'size', value)}
                                  options={product.sizes.map((size: string) => ({ value: size, label: size }))}
                                  placeholder="Select size..."
                                  className="w-full"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={line.size || ''}
                                  onChange={(e) => handleLineChange(index, 'size', e.target.value)}
                                  placeholder="Size"
                                  className="w-full ::placeholder-[12px] text-[14px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {product?.colors && product.colors.length > 0 ? (
                                <CustomSelect
                                  value={line.color || ''}
                                  onChange={(value) => handleLineChange(index, 'color', value)}
                                  options={product.colors.map((color: string) => ({ value: color, label: color }))}
                                  placeholder="Select color..."
                                  className="w-full"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={line.color || ''}
                                  onChange={(e) => handleLineChange(index, 'color', e.target.value)}
                                  placeholder="Color"
                                  className="w-full ::placeholder-[12px] text-[14px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.unitPrice}
                                onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              ${(parseFloat(line.quantity || '0') * parseFloat(line.unitPrice || '0')).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(index)}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
              </div>
            )}
          </div>

          {/* Discount and Tax */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Totals */}
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">${totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  <span className="font-medium text-gray-900 dark:text-white">-${totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-medium text-gray-900 dark:text-white">${totals.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-base font-semibold text-gray-900 dark:text-white">Total:</span>
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Terms & Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={4}
                className="w-full ::placeholder-[12px] text-[14px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Terms and conditions..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.customerId || invoiceLines.length === 0 || createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving || createMutation.isPending || updateMutation.isPending ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
