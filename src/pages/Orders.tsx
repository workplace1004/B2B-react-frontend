import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { ShoppingCart, Plus, X, ChevronsLeft, ChevronsRight, Pencil, Trash2, AlertTriangle, ChevronDown } from 'lucide-react';
import { validators } from '../utils/validation';
import { SkeletonPage } from '../components/Skeleton';

// Custom Select Component
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  error = false,
  noOverflow = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  error?: boolean;
  noOverflow?: boolean;
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
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className={`absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl custom-dropdown-menu ${noOverflow ? '' : 'overflow-auto'}`}
          style={{
            zIndex: 10000,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            ...(noOverflow ? {} : { maxHeight: '400px' }), // Limit to 10 items (10 * ~40px per item) only if overflow is enabled
          }}
        >
          {options.map((option, index) => {
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

const ORDER_STATUSES = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_FULFILLED', 'FULFILLED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
const ORDER_TYPES = ['B2B', 'WHOLESALE', 'DTC'];

export default function Orders() {
  const [page, setPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
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
    queryKey: ['orders', page],
    queryFn: async () => {
      const response = await api.get(`/orders?skip=${page * 10}&take=10`);
      return response.data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await api.post('/orders', orderData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create order';
      toast.error(errorMessage);
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, orderData }: { id: number; orderData: any }) => {
      const response = await api.patch(`/orders/${id}`, orderData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update order';
      toast.error(errorMessage);
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/orders/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete order';
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
      setSelectedOrder(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setSelectedOrder(null);
    }, 300);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      PENDING: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      CONFIRMED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      PROCESSING: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      FULFILLED: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      SHIPPED: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
      DELIVERED: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300',
      CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      RETURNED: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
        {(!data?.data || data.data.length === 0) ? null : (
          <ButtonWithWaves onClick={openModal}>
            <Plus className="w-5 h-5" />
            Create Order
          </ButtonWithWaves>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!data?.data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by creating your first order.
            </p>
            <ButtonWithWaves onClick={openModal}>
              <Plus className="w-5 h-5" />
              Create Order
            </ButtonWithWaves>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.data.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {order.orderNumber || `#${order.id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {order.customer?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {order.type || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    ${typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : (order.totalAmount ? parseFloat(order.totalAmount).toFixed(2) : '0.00')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
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
        )}
      </div>

      {data?.data && data.data.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{page * 10 + 1}</span> to{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.min((page + 1) * 10, data?.total || 0)}
            </span>{' '}
            of <span className="font-medium text-gray-900 dark:text-white">{data?.total || 0}</span> results
          </div>
          <nav aria-label="Page navigation">
            <ul className="pagination pagination-rounded pagination-primary">
              <li className="page-item">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="page-link"
                  aria-label="Previous"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
              </li>
              {(() => {
                const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 10));
                const currentPage = page + 1;
                const pages: (number | string)[] = [];

                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  pages.push(1);
                  if (currentPage > 3) {
                    pages.push('...');
                  }
                  const start = Math.max(2, currentPage - 1);
                  const end = Math.min(totalPages - 1, currentPage + 1);
                  for (let i = start; i <= end; i++) {
                    if (i !== 1 && i !== totalPages) {
                      pages.push(i);
                    }
                  }
                  if (currentPage < totalPages - 2) {
                    pages.push('...');
                  }
                  if (totalPages > 1) {
                    pages.push(totalPages);
                  }
                }

                return pages.map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <li key={`ellipsis-${idx}`} className="page-item">
                        <span className="page-link" style={{ cursor: 'default', pointerEvents: 'none' }}>
                          ...
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={pageNum} className="page-item">
                      <button
                        type="button"
                        onClick={() => setPage((pageNum as number) - 1)}
                        className={`page-link ${currentPage === pageNum ? 'active' : ''}`}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                });
              })()}
              <li className="page-item">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data?.data || data.data.length < 10 || page + 1 >= Math.ceil((data?.total || 0) / 10)}
                  className="page-link"
                  aria-label="Next"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Add Order Modal */}
      {isModalOpen && (
        <AddOrderModal
          customers={customers || []}
          products={products || []}
          onClose={closeModal}
          onSubmit={(orderData) => createOrderMutation.mutate(orderData)}
          isLoading={createOrderMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Order Modal */}
      {isEditModalOpen && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          customers={customers || []}
          products={products || []}
          onClose={closeEditModal}
          onSubmit={(orderData) => updateOrderMutation.mutate({ id: selectedOrder.id, orderData })}
          isLoading={updateOrderMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Order Modal */}
      {isDeleteModalOpen && selectedOrder && (
        <DeleteOrderModal
          order={selectedOrder}
          onClose={closeDeleteModal}
          onConfirm={() => deleteOrderMutation.mutate(selectedOrder.id)}
          isLoading={deleteOrderMutation.isPending}
          isShowing={isDeleteModalShowing}
        />
      )}
    </div>
  );
}

// Add Order Modal Component
function AddOrderModal({
  customers,
  products,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  customers: any[];
  products: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    customerId: '',
    type: ORDER_TYPES[0],
    status: ORDER_STATUSES[0],
    notes: '',
    shippingAddress: '',
    billingAddress: '',
    orderLines: [{ productId: '', quantity: '', unitPrice: '' }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;
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
    const newErrors: Record<string, string> = {};

    // Validation
    const customerError = validators.required(formData.customerId, 'Customer');
    if (customerError) newErrors.customerId = customerError;

    // Validate order lines
    if (!formData.orderLines.length) {
      newErrors.orderLines = 'At least one order line is required';
    } else {
      formData.orderLines.forEach((line, index) => {
        if (!line.productId) {
          newErrors[`orderLines.${index}.productId`] = 'Product is required';
        }
        if (!line.quantity || parseInt(line.quantity) <= 0) {
          newErrors[`orderLines.${index}.quantity`] = 'Quantity must be greater than 0';
        }
        if (!line.unitPrice || parseFloat(line.unitPrice) <= 0) {
          newErrors[`orderLines.${index}.unitPrice`] = 'Unit price must be greater than 0';
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const orderData = {
      customerId: parseInt(formData.customerId),
      type: formData.type,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      shippingAddress: formData.shippingAddress.trim() || undefined,
      billingAddress: formData.billingAddress.trim() || undefined,
      orderLines: formData.orderLines.map((line: any) => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        unitPrice: parseFloat(line.unitPrice),
      })),
    };

    onSubmit(orderData);
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

  const handleOrderLineChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newLines = [...prev.orderLines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, orderLines: newLines };
    });
    // Clear errors for this field
    const errorKey = `orderLines.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
    // Clear general orderLines error if it exists
    if (errors.orderLines) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.orderLines;
        return newErrors;
      });
    }
  };

  const addOrderLine = () => {
    setFormData((prev) => ({
      ...prev,
      orderLines: [...prev.orderLines, { productId: '', quantity: '', unitPrice: '' }],
    }));
  };

  const removeOrderLine = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      orderLines: prev.orderLines.filter((_, i) => i !== index),
    }));
  };

  const customerOptions = customers.map((c) => ({ value: c.id.toString(), label: c.name }));
  const productOptions = products.map((p) => ({ value: p.id.toString(), label: p.name }));
  const statusOptions = ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));
  const typeOptions = ORDER_TYPES.map((t) => ({ value: t, label: t }));

  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="addOrderModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full flex flex-col" style={{ overflow: 'visible' }}>
            <div className="modal-header">
              <h5 id="addOrderModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                Create New Order
              </h5>
              <button
                type="button"
                onClick={onClose}
                className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form id="addOrderForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', position: 'relative' }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Customer <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={customerOptions}
                        value={formData.customerId}
                        onChange={(value) => handleChange('customerId', value)}
                        placeholder="Select customer"
                        error={!!errors.customerId}
                      />
                      {errors.customerId && <p className="mt-1 text-sm text-red-500">{errors.customerId}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                      <CustomSelect
                        options={typeOptions}
                        value={formData.type}
                        onChange={(value) => handleChange('type', value)}
                        placeholder="Select type"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                      <CustomSelect
                        options={statusOptions}
                        value={formData.status}
                        onChange={(value) => handleChange('status', value)}
                        placeholder="Select status"
                        noOverflow={true}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Lines <span className="text-red-500">*</span></label>
                    <div className="space-y-3">
                      {formData.orderLines.map((line: any, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-12 gap-2">
                            <div className="col-span-5">
                              <CustomSelect
                                options={productOptions}
                                value={line.productId}
                                onChange={(value) => handleOrderLineChange(index, 'productId', value)}
                                placeholder="Product"
                                error={!!errors[`orderLines.${index}.productId`]}
                              />
                              {errors[`orderLines.${index}.productId`] && (
                                <p className="mt-1 text-sm text-red-500">{errors[`orderLines.${index}.productId`]}</p>
                              )}
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                value={line.quantity}
                                onChange={(e) => handleOrderLineChange(index, 'quantity', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                                  errors[`orderLines.${index}.quantity`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                                placeholder="Qty"
                              />
                              {errors[`orderLines.${index}.quantity`] && (
                                <p className="mt-1 text-sm text-red-500">{errors[`orderLines.${index}.quantity`]}</p>
                              )}
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => handleOrderLineChange(index, 'unitPrice', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                                  errors[`orderLines.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                                placeholder="Price"
                              />
                              {errors[`orderLines.${index}.unitPrice`] && (
                                <p className="mt-1 text-sm text-red-500">{errors[`orderLines.${index}.unitPrice`]}</p>
                              )}
                            </div>
                          </div>
                          {formData.orderLines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOrderLine(index)}
                              className="mt-0.5 flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 rounded-lg transition-colors flex-shrink-0"
                              title="Remove line"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addOrderLine}
                      className="mt-3 px-4 py-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 border border-primary-300 dark:border-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-medium"
                    >
                      + Add Line
                    </button>
                    {errors.orderLines && <p className="mt-1 text-sm text-red-500">{errors.orderLines}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shipping Address</label>
                    <textarea
                      value={formData.shippingAddress}
                      onChange={(e) => handleChange('shippingAddress', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                      rows={3}
                      placeholder="Enter shipping address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing Address</label>
                    <textarea
                      value={formData.billingAddress}
                      onChange={(e) => handleChange('billingAddress', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                      rows={3}
                      placeholder="Enter billing address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                      rows={3}
                      placeholder="Enter notes"
                    />
                  </div>
                </div>
              </div>

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
                  onClick={handleButtonClick}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Creating...' : 'Create Order'}
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

// Edit Order Modal Component (simplified - similar structure)
function EditOrderModal({
  order,
  customers,
  products,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  order: any;
  customers: any[];
  products: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    customerId: order.customerId?.toString() || '',
    type: order.type || ORDER_TYPES[0],
    status: order.status || ORDER_STATUSES[0],
    notes: order.notes || '',
    shippingAddress: order.shippingAddress || '',
    billingAddress: order.billingAddress || '',
    orderLines: order.orderLines?.length > 0 
      ? order.orderLines.map((line: any) => ({
          productId: line.productId?.toString() || '',
          quantity: line.quantity?.toString() || '',
          unitPrice: line.unitPrice?.toString() || '',
        }))
      : [{ productId: '', quantity: '', unitPrice: '' }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;
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
    const customerError = validators.required(formData.customerId, 'Customer');
    if (customerError) newErrors.customerId = customerError;

    // Validate order lines
    if (!formData.orderLines.length) {
      newErrors.orderLines = 'At least one order line is required';
    } else {
      formData.orderLines.forEach((line: any, index: number) => {
        if (!line.productId) {
          newErrors[`orderLines.${index}.productId`] = 'Product is required';
        }
        if (!line.quantity || parseInt(line.quantity) <= 0) {
          newErrors[`orderLines.${index}.quantity`] = 'Quantity must be greater than 0';
        }
        if (!line.unitPrice || parseFloat(line.unitPrice) <= 0) {
          newErrors[`orderLines.${index}.unitPrice`] = 'Unit price must be greater than 0';
        }
      });
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

    const orderData = {
      customerId: parseInt(formData.customerId),
      type: formData.type,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
      shippingAddress: formData.shippingAddress.trim() || undefined,
      billingAddress: formData.billingAddress.trim() || undefined,
      orderLines: formData.orderLines.map((line: any) => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        unitPrice: parseFloat(line.unitPrice),
      })),
    };

    onSubmit(orderData);
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

  const handleOrderLineChange = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newLines = [...prev.orderLines];
      newLines[index] = { ...newLines[index], [field]: value };
      return { ...prev, orderLines: newLines };
    });
    // Clear errors for this field
    const errorKey = `orderLines.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
    // Clear general orderLines error if it exists
    if (errors.orderLines) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.orderLines;
        return newErrors;
      });
    }
  };

  const addOrderLine = () => {
    setFormData((prev) => ({
      ...prev,
      orderLines: [...prev.orderLines, { productId: '', quantity: '', unitPrice: '' }],
    }));
  };

  const removeOrderLine = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      orderLines: prev.orderLines.filter((_: any, i: number) => i !== index),
    }));
  };

  const customerOptions = customers.map((c) => ({ value: c.id.toString(), label: c.name }));
  const productOptions = products.map((p) => ({ value: p.id.toString(), label: p.name }));
  const statusOptions = ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));
  const typeOptions = ORDER_TYPES.map((t) => ({ value: t, label: t }));

  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editOrderModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full flex flex-col" style={{ overflow: 'visible' }}>
            <div className="modal-header">
              <h5 id="editOrderModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                Edit Order
              </h5>
              <button
                type="button"
                onClick={onClose}
                className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form id="editOrderForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', position: 'relative' }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Customer <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        options={customerOptions}
                        value={formData.customerId}
                        onChange={(value) => handleChange('customerId', value)}
                        placeholder="Select customer"
                        error={!!errors.customerId}
                      />
                      {errors.customerId && <p className="mt-1 text-sm text-red-500">{errors.customerId}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                      <CustomSelect
                        options={typeOptions}
                        value={formData.type}
                        onChange={(value) => handleChange('type', value)}
                        placeholder="Select type"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <CustomSelect
                      options={statusOptions}
                      value={formData.status}
                      onChange={(value) => handleChange('status', value)}
                      placeholder="Select status"
                      noOverflow={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Lines <span className="text-red-500">*</span></label>
                    {formData.orderLines.map((line: any, index: number) => (
                      <div key={index} className="mb-4">
                        <div className="grid grid-cols-12 gap-2 mb-1">
                          <div className="col-span-5">
                            <CustomSelect
                              options={productOptions}
                              value={line.productId}
                              onChange={(value) => handleOrderLineChange(index, 'productId', value)}
                              placeholder="Product"
                              error={!!errors[`orderLines.${index}.productId`]}
                            />
                            {errors[`orderLines.${index}.productId`] && (
                              <p className="mt-1 text-sm text-red-500">{errors[`orderLines.${index}.productId`]}</p>
                            )}
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => handleOrderLineChange(index, 'quantity', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                                errors[`orderLines.${index}.quantity`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="Qty"
                              min="1"
                            />
                            {errors[`orderLines.${index}.quantity`] && (
                              <p className="mt-1 text-sm text-red-500">{errors[`orderLines.${index}.quantity`]}</p>
                            )}
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => handleOrderLineChange(index, 'unitPrice', e.target.value)}
                              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${
                                errors[`orderLines.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="Price"
                              min="0"
                            />
                            {errors[`orderLines.${index}.unitPrice`] && (
                              <p className="mt-1 text-sm text-red-500">{errors[`orderLines.${index}.unitPrice`]}</p>
                            )}
                          </div>
                          <div className="col-span-1 flex items-center">
                            {formData.orderLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOrderLine(index)}
                                className="w-full h-full min-h-[42px] flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 rounded-lg transition-colors"
                                title="Remove line"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOrderLine}
                      className="mt-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 border border-primary-300 dark:border-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-medium"
                    >
                      + Add Line
                    </button>
                    {errors.orderLines && (
                      <p className="mt-1 text-sm text-red-500">{errors.orderLines}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Shipping Address</label>
                    <textarea
                      value={formData.shippingAddress}
                      onChange={(e) => handleChange('shippingAddress', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                      placeholder="Enter shipping address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing Address</label>
                    <textarea
                      value={formData.billingAddress}
                      onChange={(e) => handleChange('billingAddress', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                      placeholder="Enter billing address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                      placeholder="Enter notes"
                    />
                  </div>
                </div>
              </div>

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
                  onClick={handleButtonClick}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Updating...' : 'Update Order'}
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

// Delete Order Modal Component
function DeleteOrderModal({
  order,
  onClose,
  onConfirm,
  isLoading,
  isShowing,
}: {
  order: any;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  return (
    <>
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />
      <div
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deleteOrderModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '28rem' }}
        >
          <div className="modal-content">
            <div className="modal-body text-center py-8 px-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
                </div>
              </div>
              <h5 id="deleteOrderModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Order
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete order
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{order.orderNumber || `#${order.id}`}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="px-5 py-2.5 ml-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isLoading ? 'Deleting...' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
