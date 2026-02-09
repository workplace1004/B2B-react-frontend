import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Plus,
  X,
  Edit,
  Filter,
  DollarSign,
  CreditCard,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  Trash2,
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput } from '../components/ui';
import DeleteModal from '../components/ui/DeleteModal';

type PaymentTermType = 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'DUE_ON_RECEIPT' | 'CUSTOM';
type CreditStatus = 'ACTIVE' | 'SUSPENDED' | 'EXCEEDED' | 'PENDING_APPROVAL';

interface PaymentTerms {
  type: PaymentTermType;
  days?: number;
  customDescription?: string;
  earlyPaymentDiscount?: {
    percentage: number;
    days: number;
  };
  latePaymentFee?: {
    percentage: number;
    days: number;
  };
}

interface B2BTerms {
  id: string | number;
  customerId: string | number;
  customerName: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  paymentTerms: PaymentTerms;
  status: CreditStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}


export default function B2BTerms() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalShowing, setIsAddModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState<B2BTerms | null>(null);

  // Fetch B2B customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', 'b2b'],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Load terms from localStorage (in a real app, this would be an API call)
  const [terms, setTerms] = useState<B2BTerms[]>(() => {
    const saved = localStorage.getItem('b2b-terms');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('b2b-terms', JSON.stringify(terms));
  }, [terms]);

  const customers = customersData || [];
  const b2bCustomers = customers.filter((customer: any) => customer.type === 'B2B' || customer.type === 'WHOLESALE');

  // Initialize terms for B2B customers that don't have terms yet
  useEffect(() => {
    if (b2bCustomers.length > 0 && terms.length === 0) {
      const initialTerms: B2BTerms[] = b2bCustomers.map((customer: any) => ({
        id: customer.id,
        customerId: customer.id,
        customerName: customer.name,
        creditLimit: customer.creditLimit || 0,
        currentBalance: 0,
        availableCredit: customer.creditLimit || 0,
        paymentTerms: {
          type: 'NET_30',
        },
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setTerms(initialTerms);
    }
  }, [b2bCustomers, terms.length]);

  // Filter terms
  const filteredTerms = useMemo(() => {
    let filtered = terms;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((term) =>
        term.customerName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((term) => term.status === statusFilter);
    }

    return filtered;
  }, [terms, searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalCreditLimit = terms.reduce((sum, term) => sum + term.creditLimit, 0);
    const totalBalance = terms.reduce((sum, term) => sum + term.currentBalance, 0);
    const totalAvailable = terms.reduce((sum, term) => sum + term.availableCredit, 0);
    const activeCount = terms.filter((t) => t.status === 'ACTIVE').length;
    const exceededCount = terms.filter((t) => t.status === 'EXCEEDED').length;

    return {
      totalCreditLimit,
      totalBalance,
      totalAvailable,
      activeCount,
      exceededCount,
      utilizationRate: totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0,
    };
  }, [terms]);

  const getStatusColor = (status: CreditStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'EXCEEDED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING_APPROVAL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: CreditStatus) => {
    switch (status) {
      case 'ACTIVE':
        return CheckCircle;
      case 'SUSPENDED':
        return Clock;
      case 'EXCEEDED':
        return AlertCircle;
      case 'PENDING_APPROVAL':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const formatPaymentTerms = (paymentTerms: PaymentTerms) => {
    switch (paymentTerms.type) {
      case 'NET_15':
        return 'Net 15';
      case 'NET_30':
        return 'Net 30';
      case 'NET_45':
        return 'Net 45';
      case 'NET_60':
        return 'Net 60';
      case 'DUE_ON_RECEIPT':
        return 'Due on Receipt';
      case 'CUSTOM':
        return paymentTerms.customDescription || `Net ${paymentTerms.days || 0}`;
      default:
        return 'N/A';
    }
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
    setTimeout(() => setIsAddModalShowing(true), 10);
  };

  const closeAddModal = () => {
    setIsAddModalShowing(false);
    setTimeout(() => setIsAddModalOpen(false), 300);
  };

  const openEditModal = (term: B2BTerms) => {
    setSelectedTerms(term);
    setIsEditModalOpen(true);
    setTimeout(() => setIsEditModalShowing(true), 10);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedTerms(null);
    }, 300);
  };

  const openViewModal = (term: B2BTerms) => {
    setSelectedTerms(term);
    setIsViewModalOpen(true);
    setTimeout(() => setIsViewModalShowing(true), 10);
  };

  const closeViewModal = () => {
    setIsViewModalShowing(false);
    setTimeout(() => {
      setIsViewModalOpen(false);
      setSelectedTerms(null);
    }, 300);
  };

  const openDeleteModal = (term: B2BTerms) => {
    setSelectedTerms(term);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedTerms(null);
  };

  const handleDelete = () => {
    if (selectedTerms) {
      setTerms(terms.filter((t) => t.id !== selectedTerms.id));
      toast.success('B2B terms deleted successfully!');
      closeDeleteModal();
    }
  };

  useEffect(() => {
    if (isAddModalOpen || isEditModalOpen || isViewModalOpen || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAddModalOpen, isEditModalOpen, isViewModalOpen, isDeleteModalOpen]);

  if (customersLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="B2B Terms" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">B2B Terms</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage credit limits and payment terms for B2B customers
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Terms
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Credit Limit</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${summaryMetrics.totalCreditLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                ${summaryMetrics.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Credit</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                ${summaryMetrics.totalAvailable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Utilization Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.utilizationRate.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Accounts</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.activeCount}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Exceeded</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.exceededCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
              value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by customer name..."
            />
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[200px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                  { value: 'EXCEEDED', label: 'Exceeded' },
                  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Terms Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredTerms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No B2B terms found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding credit limits and payment terms for B2B customers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Credit Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Current Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Available Credit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Payment Terms
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
                {filteredTerms.map((term) => {
                  const StatusIcon = getStatusIcon(term.status);
                  const utilizationRate = term.creditLimit > 0 ? (term.currentBalance / term.creditLimit) * 100 : 0;
                  return (
                    <tr key={term.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {term.customerName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ${term.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          ${term.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              utilizationRate >= 90 ? 'bg-red-500' :
                              utilizationRate >= 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, utilizationRate)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          term.availableCredit < 0 ? 'text-red-600 dark:text-red-400' :
                          term.availableCredit < term.creditLimit * 0.1 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          ${term.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatPaymentTerms(term.paymentTerms)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(term.status)}`}>
                            {term.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <div className="flex items-center justify-start gap-2">
                          <button
                            onClick={() => openViewModal(term)}
                            className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Terms"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(term)}
                            className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Edit Terms"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(term)}
                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Terms"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Terms Modal */}
      {isAddModalOpen && (
        <AddTermsModal
          isShowing={isAddModalShowing}
          onClose={closeAddModal}
          customers={b2bCustomers}
          onSubmit={(data) => {
            const newTerm: B2BTerms = {
              id: Date.now(),
              customerId: data.customerId,
              customerName: data.customerName,
              creditLimit: parseFloat(data.creditLimit),
              currentBalance: 0,
              availableCredit: parseFloat(data.creditLimit),
              paymentTerms: data.paymentTerms,
              status: 'PENDING_APPROVAL',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setTerms([...terms, newTerm]);
            toast.success('B2B terms added successfully!');
            closeAddModal();
          }}
        />
      )}

      {/* Edit Terms Modal */}
      {isEditModalOpen && selectedTerms && (
        <EditTermsModal
          isShowing={isEditModalShowing}
          onClose={closeEditModal}
          terms={selectedTerms}
          onSubmit={(data) => {
            setTerms(terms.map((t) =>
              t.id === selectedTerms.id
                ? {
                    ...t,
                    creditLimit: parseFloat(data.creditLimit),
                    availableCredit: parseFloat(data.creditLimit) - t.currentBalance,
                    paymentTerms: data.paymentTerms,
                    status: data.status,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ));
            toast.success('B2B terms updated successfully!');
            closeEditModal();
          }}
        />
      )}

      {/* View Terms Modal */}
      {isViewModalOpen && selectedTerms && (
        <ViewTermsModal
          isShowing={isViewModalShowing}
          onClose={closeViewModal}
          terms={selectedTerms}
        />
      )}

      {/* Delete Terms Modal */}
      {isDeleteModalOpen && selectedTerms && (
        <DeleteModal
          title="Delete B2B Terms"
          message="Are you sure you want to delete B2B terms for"
          itemName={selectedTerms.customerName}
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// Add Terms Modal Component
function AddTermsModal({
  isShowing,
  onClose,
  customers,
  onSubmit,
}: {
  isShowing: boolean;
  onClose: () => void;
  customers: any[];
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    creditLimit: '',
    paymentTermType: 'NET_30' as PaymentTermType,
    paymentTermDays: '',
    customDescription: '',
    earlyPaymentDiscount: false,
    earlyPaymentPercentage: '',
    earlyPaymentDays: '',
    latePaymentFee: false,
    latePaymentPercentage: '',
    latePaymentDays: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }
    if (!formData.creditLimit || parseFloat(formData.creditLimit) <= 0) {
      newErrors.creditLimit = 'Valid credit limit is required';
    }
    if (formData.paymentTermType === 'CUSTOM' && !formData.customDescription) {
      newErrors.customDescription = 'Custom description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const paymentTerms: PaymentTerms = {
      type: formData.paymentTermType,
      days: formData.paymentTermDays ? parseInt(formData.paymentTermDays) : undefined,
      customDescription: formData.customDescription || undefined,
      earlyPaymentDiscount: formData.earlyPaymentDiscount
        ? {
            percentage: parseFloat(formData.earlyPaymentPercentage),
            days: parseInt(formData.earlyPaymentDays),
          }
        : undefined,
      latePaymentFee: formData.latePaymentFee
        ? {
            percentage: parseFloat(formData.latePaymentPercentage),
            days: parseInt(formData.latePaymentDays),
          }
        : undefined,
    };

    onSubmit({
      customerId: formData.customerId,
      customerName: formData.customerName,
      creditLimit: formData.creditLimit,
      paymentTerms,
    });
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id.toString() === customerId);
    setFormData({
      ...formData,
      customerId,
      customerName: customer?.name || '',
    });
    setErrors({ ...errors, customerId: '' });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
        <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all ${
            isShowing ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add B2B Terms</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
          </div>

          <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 px-6 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  value={formData.customerId}
                  onChange={handleCustomerChange}
                  options={customers.map((c) => ({ value: c.id.toString(), label: c.name }))}
                  placeholder="Select customer..."
                  error={!!errors.customerId}
                />
                {errors.customerId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customerId}</p>
                )}
              </div>

              {/* Credit Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Credit Limit ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => {
                    setFormData({ ...formData, creditLimit: e.target.value });
                    setErrors({ ...errors, creditLimit: '' });
                  }}
                  className={`w-full ::placeholder-[12px] text-[14px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                    errors.creditLimit ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                />
                {errors.creditLimit && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.creditLimit}</p>
                )}
              </div>

              {/* Payment Terms Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  value={formData.paymentTermType}
                  onChange={(value) => {
                    setFormData({ ...formData, paymentTermType: value as PaymentTermType });
                    setErrors({ ...errors, customDescription: '' });
                  }}
                  options={[
                    { value: 'NET_15', label: 'Net 15' },
                    { value: 'NET_30', label: 'Net 30' },
                    { value: 'NET_45', label: 'Net 45' },
                    { value: 'NET_60', label: 'Net 60' },
                    { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
                    { value: 'CUSTOM', label: 'Custom' },
                  ]}
                />
              </div>

              {/* Custom Payment Terms */}
              {formData.paymentTermType === 'CUSTOM' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customDescription}
                    onChange={(e) => {
                      setFormData({ ...formData, customDescription: e.target.value });
                      setErrors({ ...errors, customDescription: '' });
                    }}
                    className={`w-full ::placeholder-[12px] text-[14px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                      errors.customDescription ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., Net 90 with 2% discount if paid within 30 days"
                  />
                  {errors.customDescription && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customDescription}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-200 dark:bg-gray-700 text-[14px] px-6 py-4 flex items-center justify-end gap-3">
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
                Add Terms
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}

// Edit Terms Modal Component
function EditTermsModal({
  isShowing,
  onClose,
  terms,
  onSubmit,
}: {
  isShowing: boolean;
  onClose: () => void;
  terms: B2BTerms;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    creditLimit: terms.creditLimit.toString(),
    paymentTermType: terms.paymentTerms.type,
    paymentTermDays: terms.paymentTerms.days?.toString() || '',
    customDescription: terms.paymentTerms.customDescription || '',
    status: terms.status,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.creditLimit || parseFloat(formData.creditLimit) <= 0) {
      newErrors.creditLimit = 'Valid credit limit is required';
    }
    if (formData.paymentTermType === 'CUSTOM' && !formData.customDescription) {
      newErrors.customDescription = 'Custom description is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const paymentTerms: PaymentTerms = {
      type: formData.paymentTermType,
      days: formData.paymentTermDays ? parseInt(formData.paymentTermDays) : undefined,
      customDescription: formData.customDescription || undefined,
      earlyPaymentDiscount: terms.paymentTerms.earlyPaymentDiscount,
      latePaymentFee: terms.paymentTerms.latePaymentFee,
    };

    onSubmit({
      creditLimit: formData.creditLimit,
      paymentTerms,
      status: formData.status,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
        <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all ${
            isShowing ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit B2B Terms</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{terms.customerName}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
          </div>

          <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 px-6 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Current Balance Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Current Balance</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ${terms.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Available Credit</p>
                    <p className={`text-lg font-semibold ${
                      terms.availableCredit < 0 ? 'text-red-600 dark:text-red-400' :
                      terms.availableCredit < terms.creditLimit * 0.1 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-green-600 dark:text-green-400'
                    }`}>
                      ${terms.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Credit Limit ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.creditLimit}
                  onChange={(e) => {
                    setFormData({ ...formData, creditLimit: e.target.value });
                    setErrors({ ...errors, creditLimit: '' });
                  }}
                  className={`w-full ::placeholder-[12px] text-[14px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                    errors.creditLimit ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                />
                {errors.creditLimit && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.creditLimit}</p>
                )}
              </div>

              {/* Payment Terms Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Terms <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  value={formData.paymentTermType}
                  onChange={(value) => {
                    setFormData({ ...formData, paymentTermType: value as PaymentTermType });
                    setErrors({ ...errors, customDescription: '' });
                  }}
                  options={[
                    { value: 'NET_15', label: 'Net 15' },
                    { value: 'NET_30', label: 'Net 30' },
                    { value: 'NET_45', label: 'Net 45' },
                    { value: 'NET_60', label: 'Net 60' },
                    { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
                    { value: 'CUSTOM', label: 'Custom' },
                  ]}
                />
              </div>

              {/* Custom Payment Terms */}
              {formData.paymentTermType === 'CUSTOM' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customDescription}
                    onChange={(e) => {
                      setFormData({ ...formData, customDescription: e.target.value });
                      setErrors({ ...errors, customDescription: '' });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                      errors.customDescription ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="e.g., Net 90 with 2% discount if paid within 30 days"
                  />
                  {errors.customDescription && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customDescription}</p>
                  )}
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <CustomDropdown
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value as CreditStatus })}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'SUSPENDED', label: 'Suspended' },
                    { value: 'EXCEEDED', label: 'Exceeded' },
                    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                  ]}
                />
              </div>
            </div>

            <div className="bg-gray-200 dark:bg-gray-700 text-[14px] px-6 py-4 flex items-center justify-end gap-3">
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
                Update Terms
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}

// View Terms Modal Component
function ViewTermsModal({
  isShowing,
  onClose,
  terms,
}: {
  isShowing: boolean;
  onClose: () => void;
  terms: B2BTerms;
}) {
  const formatPaymentTerms = (paymentTerms: PaymentTerms) => {
    switch (paymentTerms.type) {
      case 'NET_15':
        return 'Net 15';
      case 'NET_30':
        return 'Net 30';
      case 'NET_45':
        return 'Net 45';
      case 'NET_60':
        return 'Net 60';
      case 'DUE_ON_RECEIPT':
        return 'Due on Receipt';
      case 'CUSTOM':
        return paymentTerms.customDescription || `Net ${paymentTerms.days || 0}`;
      default:
        return 'N/A';
    }
  };

  const getStatusColor = (status: CreditStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'EXCEEDED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'PENDING_APPROVAL':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: CreditStatus) => {
    switch (status) {
      case 'ACTIVE':
        return CheckCircle;
      case 'SUSPENDED':
        return Clock;
      case 'EXCEEDED':
        return AlertCircle;
      case 'PENDING_APPROVAL':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const StatusIcon = getStatusIcon(terms.status);
  const utilizationRate = terms.creditLimit > 0 ? (terms.currentBalance / terms.creditLimit) * 100 : 0;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all ${
          isShowing ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">View B2B Terms</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{terms.customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Current Balance Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Current Balance</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${terms.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Available Credit</p>
                <p className={`text-lg font-semibold ${
                  terms.availableCredit < 0 ? 'text-red-600 dark:text-red-400' :
                  terms.availableCredit < terms.creditLimit * 0.1 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  ${terms.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Utilization Rate</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white">{utilizationRate.toFixed(1)}%</p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    utilizationRate >= 90 ? 'bg-red-500' :
                    utilizationRate >= 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, utilizationRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Credit Limit
              </label>
              <p className="text-base text-gray-900 dark:text-white">
                ${terms.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Terms
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-base text-gray-900 dark:text-white">
                  {formatPaymentTerms(terms.paymentTerms)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <div className="flex items-center gap-2">
                <StatusIcon className="w-4 h-4" />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(terms.status)}`}>
                  {terms.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {terms.approvedBy && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Approved By
                </label>
                <p className="text-base text-gray-900 dark:text-white">{terms.approvedBy}</p>
              </div>
            )}

            {terms.approvedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Approved At
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {new Date(terms.approvedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created At
              </label>
              <p className="text-base text-gray-900 dark:text-white">
                {new Date(terms.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Updated
              </label>
              <p className="text-base text-gray-900 dark:text-white">
                {new Date(terms.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-200 dark:bg-gray-700 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
