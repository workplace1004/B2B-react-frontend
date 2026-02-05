 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Warehouse, Plus, X, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { validators } from '../utils/validation';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

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
    <div ref={selectRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 9999 : 'auto' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isOpen ? 'ring-2 ring-primary-500' : ''}`}
        style={{
          padding: '0.532rem 0.8rem 0.532rem 1.2rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.6,
        }}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            maxHeight: '400px', // Limit to 10 items (10 * ~40px per item)
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
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
          })}
        </div>
      )}
    </div>
  );
};

// Waves effect button component
const ButtonWithWaves = ({ 
  children, 
  onClick, 
  className = '',
  disabled = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);

    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      className={`btn-primary-lg relative overflow-hidden ${className} ${disabled ? 'opacity-65 cursor-not-allowed pointer-events-none' : ''}`}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  );
};

export default function Warehouses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Fixed limit of 10 items per page
  const queryClient = useQueryClient();

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isModalOpen) setIsModalShowing(true);
          if (isEditModalOpen) setIsEditModalShowing(true);
          if (isDeleteModalOpen) setIsDeleteModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
      setIsEditModalShowing(false);
      setIsDeleteModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', currentPage, itemsPerPage],
    queryFn: async () => {
      const skip = (currentPage - 1) * itemsPerPage;
      const response = await api.get('/warehouses', {
        params: {
          skip,
          take: itemsPerPage,
        },
      });
      return response.data;
    },
  });

  // Handle both paginated response (object with data/total) and array response (backward compatibility)
  const warehouses = Array.isArray(data) ? data : (data?.data || []);
  const totalWarehouses = Array.isArray(data) ? data.length : (data?.total || 0);
  const totalPages = Math.ceil(totalWarehouses / itemsPerPage);

  const createWarehouseMutation = useMutation({
    mutationFn: async (warehouseData: any) => {
      const response = await api.post('/warehouses', warehouseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create warehouse';
      toast.error(errorMessage);
    },
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: async ({ id, warehouseData }: { id: number; warehouseData: any }) => {
      const response = await api.patch(`/warehouses/${id}`, warehouseData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update warehouse';
      toast.error(errorMessage);
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/warehouses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete warehouse';
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
      setSelectedWarehouse(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setSelectedWarehouse(null);
    }, 300);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Warehouses" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Warehouses</h1>
          </div>
          {(!warehouses || warehouses.length === 0) ? null : (
            <ButtonWithWaves onClick={openModal}>
              <Plus className="w-5 h-5" />
              Add Warehouse
            </ButtonWithWaves>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!warehouses || warehouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Warehouse className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No warehouses found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by creating your first warehouse to manage inventory.
            </p>
            <ButtonWithWaves onClick={openModal}>
              <Plus className="w-5 h-5" />
              Add Warehouse
            </ButtonWithWaves>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {warehouses.map((warehouse: any) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                      {warehouse.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                      {warehouse.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                      {warehouse.country || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        warehouse.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {warehouse.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                      {warehouse._count?.inventory || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedWarehouse(warehouse);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedWarehouse(warehouse);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
            
            {/* Pagination */}
            {totalWarehouses > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-white">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalWarehouses)} of {totalWarehouses} entries
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Pagination buttons */}
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
                  <ChevronLeft className="w-4 h-4 text-gray-900 dark:text-white" />
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
                          ? 'bg-primary text-white border-primary'
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
                  <ChevronRight className="w-4 h-4 text-gray-900 dark:text-white" />
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
            )}
          </>
        )}
      </div>

      {/* Add Warehouse Modal */}
      {isModalOpen && (
        <AddWarehouseModal
          onClose={closeModal}
          onSubmit={(warehouseData) => createWarehouseMutation.mutate(warehouseData)}
          isLoading={createWarehouseMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Warehouse Modal */}
      {isEditModalOpen && selectedWarehouse && (
        <EditWarehouseModal
          warehouse={selectedWarehouse}
          onClose={closeEditModal}
          onSubmit={(warehouseData) => updateWarehouseMutation.mutate({ id: selectedWarehouse.id, warehouseData })}
          isLoading={updateWarehouseMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Warehouse Modal */}
      {isDeleteModalOpen && selectedWarehouse && (
        <DeleteWarehouseModal
          warehouse={selectedWarehouse}
          onClose={closeDeleteModal}
          onConfirm={() => deleteWarehouseMutation.mutate(selectedWarehouse.id)}
          isLoading={deleteWarehouseMutation.isPending}
          isShowing={isDeleteModalShowing}
        />
      )}
    </div>
  );
}

// Add Warehouse Modal Component
function AddWarehouseModal({
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
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    tplReference: '',
    isActive: 'true',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      e.preventDefault();
      return;
    }

    const button = submitButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newErrors: Record<string, string> = {};

    // Validation
    const nameError = validators.required(formData.name, 'Warehouse Name');
    if (nameError) newErrors.name = nameError;
    else {
      const nameLengthError = validators.minLength(formData.name, 2, 'Warehouse Name');
      if (nameLengthError) newErrors.name = nameLengthError;
    }

    if (formData.postalCode) {
      const postalCodeError = validators.postalCode(formData.postalCode);
      if (postalCodeError) newErrors.postalCode = postalCodeError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Show toast with first error message
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorMessage = newErrors[firstErrorKey];
      toast.error(`Validation Error: ${firstErrorMessage}`);
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || 
                          document.querySelector(`#${firstErrorField}`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (errorElement as HTMLElement).focus();
      }
      return;
    }

    const warehouseData = {
      name: formData.name.trim(),
      location: formData.location.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      country: formData.country.trim() || undefined,
      postalCode: formData.postalCode.trim() || undefined,
      tplReference: formData.tplReference.trim() || undefined,
      isActive: formData.isActive === 'true',
    };

    onSubmit(warehouseData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const statusOptions = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ];

  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        style={{ display: isShowing ? 'block' : 'none' }}
        onClick={onClose}
      >
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Warehouse</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="addWarehouseForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto py-6" style={{ overflowX: 'visible', overflowY: 'auto', position: 'relative', overflow: 'visible' }}>
                <div className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Warehouse Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter warehouse name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  {/* Location and Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter address"
                      />
                    </div>
                  </div>

                  {/* City, Country, Postal Code */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.postalCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter postal code"
                      />
                      {errors.postalCode && <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>}
                    </div>
                  </div>

                  {/* 3PL Reference and Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">3PL Reference</label>
                      <input
                        type="text"
                        value={formData.tplReference}
                        onChange={(e) => handleChange('tplReference', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter 3PL reference"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                      <CustomSelect
                        value={formData.isActive}
                        onChange={(value) => handleChange('isActive', value)}
                        options={statusOptions}
                        placeholder="Select status"
                        error={!!errors.isActive}
                      />
                      {errors.isActive && <p className="mt-1 text-sm text-red-500">{errors.isActive}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-5 mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  onClick={(e) => {
                    handleButtonClick(e);
                  }}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Adding...' : 'Add Warehouse'}
                  {ripples.map((ripple) => (
                    <span
                      key={ripple.id}
                      className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
                      style={{
                        left: `${ripple.x}px`,
                        top: `${ripple.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  ))}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Edit Warehouse Modal Component
function EditWarehouseModal({
  warehouse,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  warehouse: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    name: warehouse.name || '',
    location: warehouse.location || '',
    address: warehouse.address || '',
    city: warehouse.city || '',
    country: warehouse.country || '',
    postalCode: warehouse.postalCode || '',
    tplReference: warehouse.tplReference || '',
    isActive: warehouse.isActive ? 'true' : 'false',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      e.preventDefault();
      return;
    }

    const button = submitButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newErrors: Record<string, string> = {};

    // Validation
    const nameError = validators.required(formData.name, 'Warehouse Name');
    if (nameError) newErrors.name = nameError;
    else {
      const nameLengthError = validators.minLength(formData.name, 2, 'Warehouse Name');
      if (nameLengthError) newErrors.name = nameLengthError;
    }

    if (formData.postalCode) {
      const postalCodeError = validators.postalCode(formData.postalCode);
      if (postalCodeError) newErrors.postalCode = postalCodeError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Show toast with first error message
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorMessage = newErrors[firstErrorKey];
      toast.error(`Validation Error: ${firstErrorMessage}`);
      return;
    }

    const warehouseData = {
      name: formData.name.trim(),
      location: formData.location.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      country: formData.country.trim() || undefined,
      postalCode: formData.postalCode.trim() || undefined,
      tplReference: formData.tplReference.trim() || undefined,
      isActive: formData.isActive === 'true',
    };

    onSubmit(warehouseData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const statusOptions = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ];

  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        style={{ display: isShowing ? 'block' : 'none' }}
        onClick={onClose}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Warehouse</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="editWarehouseForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', position: 'relative' }}>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Warehouse Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter warehouse name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  {/* Location and Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter location"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter address"
                      />
                    </div>
                  </div>

                  {/* City, Country, Postal Code */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Postal Code</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => handleChange('postalCode', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.postalCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter postal code"
                      />
                      {errors.postalCode && <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>}
                    </div>
                  </div>

                  {/* 3PL Reference and Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">3PL Reference</label>
                      <input
                        type="text"
                        value={formData.tplReference}
                        onChange={(e) => handleChange('tplReference', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter 3PL reference"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                      <CustomSelect
                        value={formData.isActive}
                        onChange={(value) => handleChange('isActive', value)}
                        options={statusOptions}
                        placeholder="Select status"
                        error={!!errors.isActive}
                      />
                      {errors.isActive && <p className="mt-1 text-sm text-red-500">{errors.isActive}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                  </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  onClick={(e) => {
                    handleButtonClick(e);
                  }}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Updating...' : 'Update Warehouse'}
                  {ripples.map((ripple) => (
                    <span
                      key={ripple.id}
                      className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
                      style={{
                        left: `${ripple.x}px`,
                        top: `${ripple.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  ))}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Delete Warehouse Modal Component
function DeleteWarehouseModal({
  warehouse,
  onClose,
  onConfirm,
  isLoading,
  isShowing,
}: {
  warehouse: any;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      e.preventDefault();
      return;
    }

    const button = confirmButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteWarehouseModalLabel"
        tabIndex={-1}
        style={{ display: isShowing ? 'block' : 'none' }}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '28rem' }}
        >
          <div className="modal-content">
            {/* Modal Body with Icon */}
            <div className="modal-body text-center py-8 px-6">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
              </div>

              {/* Title */}
              <h5 id="deleteWarehouseModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Warehouse
              </h5>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{warehouse.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={(e) => {
                  handleButtonClick(e);
                  onConfirm();
                }}
                disabled={isLoading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed flex items-center gap-2 relative overflow-hidden"
              >
                <Trash2 className="w-4 h-4" />
                {isLoading ? 'Deleting...' : 'Delete Warehouse'}
                {ripples.map((ripple) => (
                  <span
                    key={ripple.id}
                    className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
                    style={{
                      left: `${ripple.x}px`,
                      top: `${ripple.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}