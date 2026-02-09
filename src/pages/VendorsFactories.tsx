import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  Building2,
  Plus,
  X,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Search,
  Mail,
  Phone,
  MapPin,
  Clock,
  FileText,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { validators } from '../utils/validation';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { ButtonWithWaves, CustomDropdown, DatePicker, Input, SearchInput } from '../components/ui';
import PhoneInput from '../components/PhoneInput';

// Types
interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  contactName?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  leadTimeDays?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    purchaseOrders: number;
  };
}

interface PriceHistory {
  id?: string | number;
  vendorId: number;
  productId?: number;
  productName?: string;
  price: number;
  currency: string;
  quantity?: number;
  date: string;
  notes?: string;
  createdBy?: string;
}

interface NegotiationNote {
  id?: string | number;
  vendorId: number;
  title: string;
  content: string;
  date: string;
  createdBy?: string;
  tags?: string[];
}


// Waves effect button component
export default function VendorsFactories() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [isPriceHistoryModalOpen, setIsPriceHistoryModalOpen] = useState(false);
  const [isPriceHistoryModalShowing, setIsPriceHistoryModalShowing] = useState(false);
  const [isNegotiationNotesModalOpen, setIsNegotiationNotesModalOpen] = useState(false);
  const [isNegotiationNotesModalShowing, setIsNegotiationNotesModalShowing] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen || isPriceHistoryModalOpen || isNegotiationNotesModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isModalOpen) setIsModalShowing(true);
          if (isEditModalOpen) setIsEditModalShowing(true);
          if (isDeleteModalOpen) setIsDeleteModalShowing(true);
          if (isPriceHistoryModalOpen) setIsPriceHistoryModalShowing(true);
          if (isNegotiationNotesModalOpen) setIsNegotiationNotesModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
      setIsEditModalShowing(false);
      setIsDeleteModalShowing(false);
      setIsPriceHistoryModalShowing(false);
      setIsNegotiationNotesModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen, isPriceHistoryModalOpen, isNegotiationNotesModalOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', currentPage, itemsPerPage],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data;
    },
  });

  // Filter and search vendors
  const filteredVendors = useMemo(() => {
    if (!data) return [];
    
    let filtered = data as Vendor[];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((vendor) =>
        vendor.name.toLowerCase().includes(query) ||
        vendor.email?.toLowerCase().includes(query) ||
        vendor.phone?.toLowerCase().includes(query) ||
        vendor.contactName?.toLowerCase().includes(query) ||
        vendor.city?.toLowerCase().includes(query) ||
        vendor.country?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((vendor) => 
        statusFilter === 'active' ? vendor.isActive : !vendor.isActive
      );
    }

    return filtered;
  }, [data, searchQuery, statusFilter]);

  // Pagination
  const totalVendors = filteredVendors.length;
  const totalPages = Math.ceil(totalVendors / itemsPerPage);
  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVendors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVendors, currentPage, itemsPerPage]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        withOrders: 0,
      };
    }

    const vendors = data as Vendor[];
    const total = vendors.length;
    const active = vendors.filter((v) => v.isActive).length;
    const inactive = vendors.filter((v) => !v.isActive).length;
    const withOrders = vendors.filter((v) => v._count && v._count.purchaseOrders > 0).length;

    return { total, active, inactive, withOrders };
  }, [data]);

  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: any) => {
      const response = await api.post('/suppliers', vendorData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Vendor created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create vendor';
      toast.error(errorMessage);
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, vendorData }: { id: number; vendorData: any }) => {
      const response = await api.patch(`/suppliers/${id}`, vendorData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Vendor updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update vendor';
      toast.error(errorMessage);
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/suppliers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Vendor deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete vendor';
      toast.error(errorMessage);
    },
  });

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedVendor(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setSelectedVendor(null);
    }, 300);
  };

  const openPriceHistoryModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsPriceHistoryModalOpen(true);
  };

  const closePriceHistoryModal = () => {
    setIsPriceHistoryModalShowing(false);
    setTimeout(() => {
      setIsPriceHistoryModalOpen(false);
      setSelectedVendor(null);
    }, 300);
  };

  const openNegotiationNotesModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsNegotiationNotesModalOpen(true);
  };

  const closeNegotiationNotesModal = () => {
    setIsNegotiationNotesModalShowing(false);
    setTimeout(() => {
      setIsNegotiationNotesModalOpen(false);
      setSelectedVendor(null);
    }, 300);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Vendors & Factories" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Vendors & Factories</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage your vendor database, price history, and negotiation notes
            </p>
          </div>
          <ButtonWithWaves onClick={openModal}>
            <Plus className="w-5 h-5" />
            Add Vendor
          </ButtonWithWaves>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Vendors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.active}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.inactive}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">With Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.withOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <SearchInput
              value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
                setCurrentPage(1);
              }}
            placeholder="Search vendors by name, email, phone, contact, city, or country..."
            className="flex-1"
            />
          <div className="w-full md:w-48">
            <CustomDropdown
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {paginatedVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No vendors found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first vendor'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Lead Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-3">
                            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {vendor.name}
                            </div>
                            {vendor.contactName && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {vendor.contactName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {vendor.email && (
                            <div className="flex items-center gap-2 mb-1">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{vendor.email}</span>
                            </div>
                          )}
                          {vendor.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{vendor.phone}</span>
                            </div>
                          )}
                          {!vendor.email && !vendor.phone && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {vendor.city || vendor.country ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>
                                {[vendor.city, vendor.country].filter(Boolean).join(', ') || '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {vendor.leadTimeDays ? (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{vendor.leadTimeDays} days</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {vendor._count?.purchaseOrders || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openPriceHistoryModal(vendor)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Price History"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openNegotiationNotesModal(vendor)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Negotiation Notes"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setIsEditModalOpen(true);
                            }}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalVendors)}
                  </span>{' '}
                  of <span className="font-medium">{totalVendors}</span> vendors
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300 px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <AddVendorModal
          onClose={closeModal}
          onSubmit={(vendorData) => createVendorMutation.mutate(vendorData)}
          isLoading={createVendorMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Vendor Modal */}
      {isEditModalOpen && selectedVendor && (
        <EditVendorModal
          vendor={selectedVendor}
          onClose={closeEditModal}
          onSubmit={(vendorData) => updateVendorMutation.mutate({ id: selectedVendor.id, vendorData })}
          isLoading={updateVendorMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Vendor Modal */}
      {isDeleteModalOpen && selectedVendor && (
        <DeleteVendorModal
          vendor={selectedVendor}
          onClose={closeDeleteModal}
          onConfirm={() => deleteVendorMutation.mutate(selectedVendor.id)}
          isLoading={deleteVendorMutation.isPending}
          isShowing={isDeleteModalShowing}
        />
      )}

      {/* Price History Modal */}
      {isPriceHistoryModalOpen && selectedVendor && (
        <PriceHistoryModal
          vendor={selectedVendor}
          onClose={closePriceHistoryModal}
          isShowing={isPriceHistoryModalShowing}
        />
      )}

      {/* Negotiation Notes Modal */}
      {isNegotiationNotesModalOpen && selectedVendor && (
        <NegotiationNotesModal
          vendor={selectedVendor}
          onClose={closeNegotiationNotesModal}
          isShowing={isNegotiationNotesModalShowing}
        />
      )}
    </div>
  );
}

// Add Vendor Modal Component
function AddVendorModal({
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isShowing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShowing, onClose]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contactName: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    leadTimeDays: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vendor name is required';
    }

    if (formData.email && !validators.email(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validators.phone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.leadTimeDays && (isNaN(Number(formData.leadTimeDays)) || Number(formData.leadTimeDays) < 0)) {
      newErrors.leadTimeDays = 'Lead time must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submitData = {
      ...formData,
      leadTimeDays: formData.leadTimeDays ? Number(formData.leadTimeDays) : undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      contactName: formData.contactName || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      postalCode: formData.postalCode || undefined,
    };

    onSubmit(submitData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full mx-4 max-h-[90vh]">
      <div
          ref={modalRef}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto  transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Vendor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input
                label={
                  <>
                Vendor Name <span className="text-red-500">*</span>
                  </>
                }
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                error={errors.name}
                placeholder="Enter vendor name"
              />
            </div>

            <div>
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                error={errors.email}
                placeholder="vendor@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <PhoneInput
                value={formData.phone}
                onChange={(value) => {
                  setFormData({ ...formData, phone: value || '' });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                error={!!errors.phone}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <Input
                label="Contact Name"
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Primary contact name"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div>
              <Input
                label="City"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div>
              <Input
                label="Country"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
              />
            </div>

            <div>
              <Input
                label="Postal Code"
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Postal code"
              />
            </div>

            <div>
              <Input
                label="Lead Time (Days)"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => {
                  setFormData({ ...formData, leadTimeDays: e.target.value });
                  if (errors.leadTimeDays) setErrors({ ...errors, leadTimeDays: '' });
                }}
                error={errors.leadTimeDays}
                placeholder="30"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Vendor'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

// Edit Vendor Modal Component
function EditVendorModal({
  vendor,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  vendor: Vendor;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isShowing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShowing, onClose]);

  const [formData, setFormData] = useState({
    name: vendor.name,
    email: vendor.email || '',
    phone: vendor.phone || '',
    contactName: vendor.contactName || '',
    address: vendor.address || '',
    city: vendor.city || '',
    country: vendor.country || '',
    postalCode: vendor.postalCode || '',
    leadTimeDays: vendor.leadTimeDays?.toString() || '',
    isActive: vendor.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vendor name is required';
    }

    if (formData.email && !validators.email(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validators.phone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.leadTimeDays && (isNaN(Number(formData.leadTimeDays)) || Number(formData.leadTimeDays) < 0)) {
      newErrors.leadTimeDays = 'Lead time must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const submitData = {
      ...formData,
      leadTimeDays: formData.leadTimeDays ? Number(formData.leadTimeDays) : undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      contactName: formData.contactName || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      country: formData.country || undefined,
      postalCode: formData.postalCode || undefined,
    };

    onSubmit(submitData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full mx-4 max-h-[90vh]">
      <div
          ref={modalRef}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto  transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Vendor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input
                label={
                  <>
                Vendor Name <span className="text-red-500">*</span>
                  </>
                }
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                error={errors.name}
                placeholder="Enter vendor name"
              />
            </div>

            <div>
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                error={errors.email}
                placeholder="vendor@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <PhoneInput
                value={formData.phone}
                onChange={(value) => {
                  setFormData({ ...formData, phone: value || '' });
                  if (errors.phone) setErrors({ ...errors, phone: '' });
                }}
                error={!!errors.phone}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <Input
                label="Contact Name"
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Primary contact name"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div>
              <Input
                label="City"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div>
              <Input
                label="Country"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
              />
            </div>

            <div>
              <Input
                label="Postal Code"
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Postal code"
              />
            </div>

            <div>
              <Input
                label="Lead Time (Days)"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => {
                  setFormData({ ...formData, leadTimeDays: e.target.value });
                  if (errors.leadTimeDays) setErrors({ ...errors, leadTimeDays: '' });
                }}
                error={errors.leadTimeDays}
                placeholder="30"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>

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
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Updating...' : 'Update Vendor'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

// Delete Vendor Modal Component
function DeleteVendorModal({
  vendor,
  onClose,
  onConfirm,
  isLoading,
  isShowing,
}: {
  vendor: Vendor;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Vendor</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Are you sure you want to delete <span className="font-semibold">{vendor.name}</span>? This will
            permanently remove the vendor from your database.
          </p>

          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Deleting...' : 'Delete Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Price History Modal Component
function PriceHistoryModal({
  vendor,
  onClose,
  isShowing,
}: {
  vendor: Vendor;
  onClose: () => void;
  isShowing: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isShowing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShowing, onClose]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceHistory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch price history from API
  const { data: priceHistoryData } = useQuery({
    queryKey: ['supplier-price-history', vendor.id],
    queryFn: async () => {
      const response = await api.get(`/supplier-price-history?supplierId=${vendor.id}`);
      return response.data || [];
    },
    enabled: isShowing && !!vendor.id,
  });

  const priceHistory: PriceHistory[] = useMemo(() => {
    if (!priceHistoryData) return [];
    return priceHistoryData.map((ph: any) => ({
      id: ph.id,
      vendorId: ph.supplierId,
      productId: ph.productId,
      productName: ph.productName,
      price: ph.price,
      currency: ph.currency || 'USD',
      quantity: ph.quantity,
      date: ph.date,
      notes: ph.notes,
      createdBy: ph.createdBy,
    }));
  }, [priceHistoryData]);

  // Mutations for price history
  const createPriceHistoryMutation = useMutation({
    mutationFn: async (priceData: Omit<PriceHistory, 'id' | 'vendorId'>) => {
      const response = await api.post('/supplier-price-history', {
        ...priceData,
        supplierId: vendor.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-price-history', vendor.id] });
      setIsAddModalOpen(false);
      toast.success('Price history entry added successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add price history entry');
    },
  });

  const updatePriceHistoryMutation = useMutation({
    mutationFn: async ({ id, priceData }: { id: string | number; priceData: Partial<PriceHistory> }) => {
      const response = await api.patch(`/supplier-price-history/${id}`, priceData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-price-history', vendor.id] });
      setEditingPrice(null);
      toast.success('Price history entry updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update price history entry');
    },
  });

  const deletePriceHistoryMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/supplier-price-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-price-history', vendor.id] });
      toast.success('Price history entry deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete price history entry');
    },
  });

  const handleAddPrice = (priceData: Omit<PriceHistory, 'id' | 'vendorId'>) => {
    createPriceHistoryMutation.mutate(priceData);
  };

  const handleUpdatePrice = (id: string | number, priceData: Partial<PriceHistory>) => {
    updatePriceHistoryMutation.mutate({ id, priceData });
  };

  const handleDeletePrice = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this price history entry?')) {
      deletePriceHistoryMutation.mutate(id);
    }
  };

  const filteredHistory = priceHistory.filter((ph) =>
    ph.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ph.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full mx-4 max-h-[90vh]">
      <div
          ref={modalRef}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto  transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Price History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{vendor.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonWithWaves onClick={() => setIsAddModalOpen(true)} className="!px-3 !py-2">
              <Plus className="w-4 h-4" />
              Add Price
            </ButtonWithWaves>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product name or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Price History Table */}
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No matching price history found' : 'No price history recorded yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredHistory.map((price) => (
                    <tr key={price.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(price.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {price.productName || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {price.currency} {Number(price.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {price.quantity || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {price.notes || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingPrice(price)}
                            className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrice(price.id!)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete"
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
          )}
        </div>
        </div>

        {/* Add/Edit Price Modal */}
        {(isAddModalOpen || editingPrice) && (
          <AddEditPriceModal
            price={editingPrice || undefined}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingPrice(null);
            }}
            onSubmit={
              editingPrice
                ? (data) => handleUpdatePrice(editingPrice.id!, data as Partial<PriceHistory>)
                : (data) => handleAddPrice(data as Omit<PriceHistory, 'id' | 'vendorId'>)
            }
          />
        )}
      </div>
    </div>
  );
}

// Add/Edit Price Modal Component
function AddEditPriceModal({
  price,
  onClose,
  onSubmit,
}: {
  price?: PriceHistory;
  onClose: () => void;
  onSubmit: (data: Omit<PriceHistory, 'id' | 'vendorId'> | Partial<PriceHistory>) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const [formData, setFormData] = useState({
    productName: price?.productName || '',
    price: price?.price.toString() || '',
    currency: price?.currency || 'USD',
    quantity: price?.quantity?.toString() || '',
    date: price?.date || new Date().toISOString().split('T')[0],
    notes: price?.notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (formData.quantity && (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0)) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      productName: formData.productName || undefined,
      price: Number(formData.price),
      currency: formData.currency,
      quantity: formData.quantity ? Number(formData.quantity) : undefined,
      date: formData.date || new Date().toISOString().split('T')[0],
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="relative max-w-2xl w-full mx-4 max-h-[90vh]">
      <div
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {price ? 'Edit Price History' : 'Add Price History'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Input
                label="Product Name"
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="Product name (optional)"
              />
            </div>

            <div>
              <Input
                label={
                  <>
                Price <span className="text-red-500">*</span>
                  </>
                }
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  if (errors.price) setErrors({ ...errors, price: '' });
                }}
                error={errors.price}
                placeholder="0.00"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <CustomDropdown
                value={formData.currency}
                onChange={(value) => setFormData({ ...formData, currency: value })}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'CNY', label: 'CNY' },
                  { value: 'JPY', label: 'JPY' },
                ]}
              />
            </div>

            <div>
              <Input
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  if (errors.quantity) setErrors({ ...errors, quantity: '' });
                }}
                error={errors.quantity}
                placeholder="Quantity (optional)"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={formData.date}
                onChange={(date) => {
                  setFormData({ ...formData, date: date || new Date().toISOString().split('T')[0] });
                  if (errors.date) setErrors({ ...errors, date: '' });
                }}
                placeholder="Select date"
              />
              {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes about this price..."
              />
            </div>
          </div>

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
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {price ? 'Update' : 'Add'} Price
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

// Negotiation Notes Modal Component
function NegotiationNotesModal({
  vendor,
  onClose,
  isShowing,
}: {
  vendor: Vendor;
  onClose: () => void;
  isShowing: boolean;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NegotiationNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch negotiation notes from API
  const { data: notesData } = useQuery({
    queryKey: ['supplier-negotiation-notes', vendor.id],
    queryFn: async () => {
      const response = await api.get(`/supplier-negotiation-notes?supplierId=${vendor.id}`);
      return response.data || [];
    },
    enabled: isShowing && !!vendor.id,
  });

  const notes: NegotiationNote[] = useMemo(() => {
    if (!notesData) return [];
    return notesData.map((n: any) => ({
      id: n.id,
      vendorId: n.supplierId,
      title: n.title,
      content: n.content,
      date: n.date,
      createdBy: n.createdBy,
      tags: n.tags || [],
    }));
  }, [notesData]);

  // Mutations for negotiation notes
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: Omit<NegotiationNote, 'id' | 'vendorId'>) => {
      const response = await api.post('/supplier-negotiation-notes', {
        ...noteData,
        supplierId: vendor.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-negotiation-notes', vendor.id] });
      setIsAddModalOpen(false);
      toast.success('Negotiation note added successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add negotiation note');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, noteData }: { id: string | number; noteData: Partial<NegotiationNote> }) => {
      const response = await api.patch(`/supplier-negotiation-notes/${id}`, noteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-negotiation-notes', vendor.id] });
      setEditingNote(null);
      toast.success('Negotiation note updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update negotiation note');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/supplier-negotiation-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-negotiation-notes', vendor.id] });
      toast.success('Negotiation note deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete negotiation note');
    },
  });

  const handleAddNote = (noteData: Omit<NegotiationNote, 'id' | 'vendorId'>) => {
    createNoteMutation.mutate(noteData);
  };

  const handleUpdateNote = (id: string | number, noteData: Partial<NegotiationNote>) => {
    updateNoteMutation.mutate({ id, noteData });
  };

  const handleDeleteNote = (id: string | number) => {
    if (window.confirm('Are you sure you want to delete this negotiation note?')) {
      deleteNoteMutation.mutate(id);
    }
  };

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((note) => {
      note.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    // Filter by tag
    if (tagFilter !== 'all') {
      filtered = filtered.filter((note) => note.tags?.includes(tagFilter));
    }

    return filtered;
  }, [notes, searchQuery, tagFilter]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="relative max-w-5xl w-full mx-4 max-h-[90vh]">
      <div
          ref={modalRef}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto  transform transition-all duration-300 ${
          isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Negotiation Notes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{vendor.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <ButtonWithWaves onClick={() => setIsAddModalOpen(true)} className="!px-3 !py-2">
              <Plus className="w-4 h-4" />
              Add Note
            </ButtonWithWaves>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Filter */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            {allTags.length > 0 && (
              <div>
                <CustomDropdown
                  value={tagFilter}
                  onChange={setTagFilter}
                  options={[
                    { value: 'all', label: 'All Tags' },
                    ...allTags.map((tag) => ({ value: tag, label: tag })),
                  ]}
                  placeholder="Filter by tag"
                />
              </div>
            )}
          </div>

          {/* Notes List */}
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || tagFilter !== 'all'
                  ? 'No matching notes found'
                  : 'No negotiation notes recorded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {note.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(note.date).toLocaleDateString()} • {note.createdBy}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingNote(note)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id!)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">
                    {note.content}
                  </p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {note.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
        </div>

        {/* Add/Edit Note Modal */}
        {(isAddModalOpen || editingNote) && (
          <AddEditNoteModal
            note={editingNote || undefined}
            allTags={allTags}
            onClose={() => {
              setIsAddModalOpen(false);
              setEditingNote(null);
            }}
            onSubmit={
              editingNote
                ? (data) => handleUpdateNote(editingNote.id!, data as Partial<NegotiationNote>)
                : (data) => handleAddNote(data as Omit<NegotiationNote, 'id' | 'vendorId'>)
            }
          />
        )}
    </div>
  );
}

// Add/Edit Note Modal Component
function AddEditNoteModal({
  note,
  allTags,
  onClose,
  onSubmit,
}: {
  note?: NegotiationNote;
  allTags: string[];
  onClose: () => void;
  onSubmit: (
    data: Omit<NegotiationNote, 'id' | 'vendorId'> | Partial<NegotiationNote>
  ) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    title: note?.title || '',
    content: note?.content || '',
    date: note?.date || new Date().toISOString().split('T')[0],
    tags: note?.tags || [],
  });
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      title: formData.title,
      content: formData.content,
      date: formData.date || new Date().toISOString().split('T')[0],
      tags: formData.tags,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="relative max-w-2xl w-full mx-4 max-h-[90vh]">
      <div
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {note ? 'Edit Negotiation Note' : 'Add Negotiation Note'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <Input
              label={
                <>
              Title <span className="text-red-500">*</span>
                </>
              }
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              error={errors.title}
              placeholder="Note title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={formData.date}
              onChange={(date) => {
                setFormData({ ...formData, date: date || new Date().toISOString().split('T')[0] });
                if (errors.date) setErrors({ ...errors, date: '' });
              }}
              placeholder="Select date"
            />
            {errors.date && <p className="mt-1 text-sm text-red-500">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => {
                setFormData({ ...formData, content: e.target.value });
                if (errors.content) setErrors({ ...errors, content: '' });
              }}
              rows={8}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.content ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter negotiation notes, discussion points, agreements, etc."
            />
            {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-primary-600 dark:hover:text-primary-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                containerClassName="flex-1"
                className="mb-0"
                placeholder="Add tag and press Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Add
              </button>
            </div>
            {allTags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suggested tags:</p>
                <div className="flex flex-wrap gap-1">
                  {allTags
                    .filter((tag) => !formData.tags.includes(tag))
                    .slice(0, 10)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!formData.tags.includes(tag)) {
                            setFormData({ ...formData, tags: [...formData.tags, tag] });
                          }
                        }}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

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
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {note ? 'Update' : 'Add'} Note
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
