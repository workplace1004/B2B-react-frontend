import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Warehouse, Plus, X, ChevronsLeft, ChevronsRight, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { validators } from '../utils/validation';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { ButtonWithWaves, CustomDropdown } from '../components/ui';


export default function Inventory() {
  const [page, setPage] = useState(0);
  const [warehouseFilter, setWarehouseFilter] = useState<string | number>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<any>(null);
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

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data?.data || response.data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', warehouseFilter],
    queryFn: async () => {
      const url = warehouseFilter
        ? `/inventory?warehouseId=${warehouseFilter}`
        : '/inventory';
      const response = await api.get(url);
      return response.data?.data || response.data || [];
    },
  });

  const createInventoryMutation = useMutation({
    mutationFn: async (inventoryData: any) => {
      const response = await api.post('/inventory', inventoryData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create inventory item';
      toast.error(errorMessage);
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, inventoryData }: { id: number; inventoryData: any }) => {
      const response = await api.patch(`/inventory/${id}`, inventoryData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update inventory item';
      toast.error(errorMessage);
    },
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/inventory/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete inventory item';
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
      setSelectedInventory(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setSelectedInventory(null);
    }, 300);
  };

  // Pagination logic
  const itemsPerPage = 10;
  const filteredData = Array.isArray(data) ? data : [];
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Inventory" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Inventory</h1>
        <div className="flex items-center gap-4">
          {warehouses && warehouses.length > 0 && (
            <CustomDropdown
              options={[
                { value: '', label: 'All Warehouses' },
                ...warehouses.map((w: any) => ({ value: w.id.toString(), label: w.name })),
              ]}
            value={warehouseFilter.toString()}
              onChange={(value) => {
                setWarehouseFilter(value === '' ? '' : Number(value));
                setPage(0);
              }}
              placeholder="Filter by warehouse"
              className="min-w-[200px]"
            />
          )}
          {(!filteredData || filteredData.length === 0) ? null : (
            <ButtonWithWaves onClick={openModal}>
              <Plus className="w-5 h-5" />
            Add Inventory
            </ButtonWithWaves>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!filteredData || filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Warehouse className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No inventory found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding inventory items to track your stock levels.
            </p>
            <ButtonWithWaves onClick={openModal}>
              <Plus className="w-5 h-5" />
              Add Inventory
            </ButtonWithWaves>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Warehouse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Reserved</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {item.product?.name || '-'}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {item.warehouse?.name || '-'}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                  {item.quantity}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {item.reservedQty || 0}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {item.availableQty || item.quantity - (item.reservedQty || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    {item.quantity <= (item.reorderPoint || 0) ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                      Low Stock
                    </span>
                  ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      In Stock
                    </span>
                  )}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedInventory(item);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedInventory(item);
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

      {filteredData && filteredData.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-white">
            Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.min(endIndex, totalItems)}
            </span>{' '}
            of <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> results
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
                  disabled={page + 1 >= totalPages}
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

      {/* Add Inventory Modal */}
      {isModalOpen && (
        <AddInventoryModal
          warehouses={warehouses || []}
          products={products || []}
          onClose={closeModal}
          onSubmit={(inventoryData) => createInventoryMutation.mutate(inventoryData)}
          isLoading={createInventoryMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Inventory Modal */}
      {isEditModalOpen && selectedInventory && (
        <EditInventoryModal
          inventory={selectedInventory}
          warehouses={warehouses || []}
          products={products || []}
          onClose={closeEditModal}
          onSubmit={(inventoryData) => updateInventoryMutation.mutate({ id: selectedInventory.id, inventoryData })}
          isLoading={updateInventoryMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Inventory Modal */}
      {isDeleteModalOpen && selectedInventory && (
        <DeleteInventoryModal
          inventory={selectedInventory}
          onClose={closeDeleteModal}
          onConfirm={() => deleteInventoryMutation.mutate(selectedInventory.id)}
          isLoading={deleteInventoryMutation.isPending}
          isShowing={isDeleteModalShowing}
        />
      )}
    </div>
  );
}

// Add Inventory Modal Component
function AddInventoryModal({
  warehouses,
  products,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  warehouses: any[];
  products: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    quantity: '',
    reorderPoint: '',
    safetyStock: '',
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
    const productError = validators.required(formData.productId, 'Product');
    if (productError) newErrors.productId = productError;

    const warehouseError = validators.required(formData.warehouseId, 'Warehouse');
    if (warehouseError) newErrors.warehouseId = warehouseError;

    const quantityError = validators.required(formData.quantity, 'Quantity');
    if (quantityError) {
      newErrors.quantity = quantityError;
    } else {
      const quantityNonNegativeError = validators.integer(formData.quantity, 'Quantity', 0);
      if (quantityNonNegativeError) newErrors.quantity = quantityNonNegativeError;
    }

    if (formData.reorderPoint) {
      const reorderPointError = validators.integer(formData.reorderPoint, 'Reorder Point', 0);
      if (reorderPointError) newErrors.reorderPoint = reorderPointError;
    }

    if (formData.safetyStock) {
      const safetyStockError = validators.integer(formData.safetyStock, 'Safety Stock', 0);
      if (safetyStockError) newErrors.safetyStock = safetyStockError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const inventoryData = {
      productId: parseInt(formData.productId),
      warehouseId: parseInt(formData.warehouseId),
      quantity: parseInt(formData.quantity),
      reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : 0,
      safetyStock: formData.safetyStock ? parseInt(formData.safetyStock) : 0,
    };

    onSubmit(inventoryData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const warehouseOptions = warehouses.map((w) => ({ value: w.id.toString(), label: w.name }));
  const productOptions = products.map((p) => ({ value: p.id.toString(), label: p.name }));

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
        aria-labelledby="addInventoryModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full max-h-[90vh] flex flex-col" style={{ overflow: 'visible' }}>
            <div className="modal-header">
              <h5 id="addInventoryModalLabel" className="modal-title font-semibold text-gray-900 dark:text-white">
                Add Inventory
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

            <form id="addInventoryForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', position: 'relative' }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={productOptions}
                        value={formData.productId.toString()}
                        onChange={(value) => handleChange('productId', value)}
                        placeholder="Select product"
                        error={!!errors.productId}
                      />
                      {errors.productId && <p className="mt-1 text-sm text-red-500">{errors.productId}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Warehouse <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={warehouseOptions}
                        value={formData.warehouseId.toString()}
                        onChange={(value) => handleChange('warehouseId', value)}
                        placeholder="Select warehouse"
                        error={!!errors.warehouseId}
                      />
                      {errors.warehouseId && <p className="mt-1 text-sm text-red-500">{errors.warehouseId}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => handleChange('quantity', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.quantity ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                      {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reorder Point</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.reorderPoint}
                        onChange={(e) => handleChange('reorderPoint', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Safety Stock</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.safetyStock}
                        onChange={(e) => handleChange('safetyStock', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
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
                  {isLoading ? 'Adding...' : 'Add Inventory'}
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

// Edit Inventory Modal Component
function EditInventoryModal({
  inventory,
  warehouses,
  products,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  inventory: any;
  warehouses: any[];
  products: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    productId: inventory.productId?.toString() || '',
    warehouseId: inventory.warehouseId?.toString() || '',
    quantity: inventory.quantity?.toString() || '0',
    reorderPoint: inventory.reorderPoint?.toString() || '0',
    safetyStock: inventory.safetyStock?.toString() || '0',
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
    const productError = validators.required(formData.productId, 'Product');
    if (productError) newErrors.productId = productError;

    const warehouseError = validators.required(formData.warehouseId, 'Warehouse');
    if (warehouseError) newErrors.warehouseId = warehouseError;

    const quantityError = validators.required(formData.quantity, 'Quantity');
    if (quantityError) {
      newErrors.quantity = quantityError;
    } else {
      const quantityNonNegativeError = validators.integer(formData.quantity, 'Quantity', 0);
      if (quantityNonNegativeError) newErrors.quantity = quantityNonNegativeError;
    }

    if (formData.reorderPoint) {
      const reorderPointError = validators.integer(formData.reorderPoint, 'Reorder Point', 0);
      if (reorderPointError) newErrors.reorderPoint = reorderPointError;
    }

    if (formData.safetyStock) {
      const safetyStockError = validators.integer(formData.safetyStock, 'Safety Stock', 0);
      if (safetyStockError) newErrors.safetyStock = safetyStockError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const inventoryData = {
      productId: parseInt(formData.productId),
      warehouseId: parseInt(formData.warehouseId),
      quantity: parseInt(formData.quantity),
      reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : 0,
      safetyStock: formData.safetyStock ? parseInt(formData.safetyStock) : 0,
    };

    onSubmit(inventoryData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const warehouseOptions = warehouses.map((w) => ({ value: w.id.toString(), label: w.name }));
  const productOptions = products.map((p) => ({ value: p.id.toString(), label: p.name }));

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
        aria-labelledby="editInventoryModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full max-h-[90vh] flex flex-col" style={{ overflow: 'visible' }}>
            <div className="modal-header">
              <h5 id="editInventoryModalLabel" className="modal-title font-semibold text-gray-900 dark:text-white">
                Edit Inventory
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

            <form id="editInventoryForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', position: 'relative' }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={productOptions}
                        value={formData.productId.toString()}
                        onChange={(value) => handleChange('productId', value)}
                        placeholder="Select product"
                        error={!!errors.productId}
                      />
                      {errors.productId && <p className="mt-1 text-sm text-red-500">{errors.productId}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Warehouse <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={warehouseOptions}
                        value={formData.warehouseId.toString()}
                        onChange={(value) => handleChange('warehouseId', value)}
                        placeholder="Select warehouse"
                        error={!!errors.warehouseId}
                      />
                      {errors.warehouseId && <p className="mt-1 text-sm text-red-500">{errors.warehouseId}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => handleChange('quantity', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.quantity ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0"
                      />
                      {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reorder Point</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.reorderPoint}
                        onChange={(e) => handleChange('reorderPoint', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Safety Stock</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.safetyStock}
                        onChange={(e) => handleChange('safetyStock', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
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
                  {isLoading ? 'Updating...' : 'Update Inventory'}
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

// Delete Inventory Modal Component
function DeleteInventoryModal({
  inventory,
  onClose,
  onConfirm,
  isLoading,
  isShowing,
}: {
  inventory: any;
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
        aria-labelledby="deleteInventoryModalLabel"
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
              <h5 id="deleteInventoryModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Inventory
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete inventory for
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{inventory.product?.name || 'Product'}" at "{inventory.warehouse?.name || 'Warehouse'}"?
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
                {isLoading ? 'Deleting...' : 'Delete Inventory'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
