import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { List, DollarSign, Calculator, Plus, ChevronRight, ChevronDown, Package, Factory, Users, TrendingUp, X, Pencil, Trash2, Save, Inbox, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

// Custom Select Component with beautiful dropdown
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
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between transition-all ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''} hover:border-gray-400 dark:hover:border-gray-500`}
        style={{
          padding: '0.532rem 0.8rem 0.532rem 1.2rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.6,
          backgroundColor: 'transparent',
        }}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl custom-dropdown-menu"
          style={{
            zIndex: 10000,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            maxHeight: '210px', // Approximately 5 items (42px per item)
            overflowY: 'auto',
            overflowX: 'hidden',
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
              

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${isSelected
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
            })
          )}
        </div>
      )}
    </div>
  );
};

type TabType = 'bom' | 'cost-sheets' | 'margin-simulator';

export default function BOMCosting() {
  const [activeTab, setActiveTab] = useState<TabType>('bom');

  const tabs = [
    { id: 'bom' as TabType, label: 'Bill of Materials', icon: List },
    { id: 'cost-sheets' as TabType, label: 'Cost Sheets', icon: DollarSign },
    { id: 'margin-simulator' as TabType, label: 'Margin Simulator', icon: Calculator },
  ];

  return (
    <div>
      <Breadcrumb currentPage="BOM & Costing" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">BOM & Costing</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Bill of Materials, Cost Sheets, and Margin Analysis</p>
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
      <div className="mt-6">
        {activeTab === 'bom' && <BillOfMaterialsSection />}
        {activeTab === 'cost-sheets' && <CostSheetsSection />}
        {activeTab === 'margin-simulator' && <MarginSimulatorSection />}
      </div>
    </div>
  );
}

// Bill of Materials Section Component
function BillOfMaterialsSection() {
  const [expandedBoms, setExpandedBoms] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [bomToDelete, setBomToDelete] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch BOMs from API
  const { data: bomsData, isLoading } = useQuery({
    queryKey: ['boms'],
    queryFn: async () => {
      try {
        const response = await api.get('/bom?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch products for BOM creation
  const { data: productsData } = useQuery({
    queryKey: ['products', 'bom-select'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  const rawBoms = bomsData || [];

  // Transform BOMs from API to display format
  const boms = rawBoms.map((bom: any) => {
    // Calculate total cost from components
    const totalCost = bom.components?.reduce((sum: number, comp: any) => {
      const cost = parseFloat(comp.cost) || 0;
      const qty = parseFloat(comp.quantity) || 0;
      return sum + (cost * qty);
    }, 0) || 0;

    return {
      id: bom.id,
      name: bom.name,
      productId: bom.productId,
      product: bom.product,
      sku: bom.product?.sku || 'N/A',
      status: bom.status || 'ACTIVE',
      description: bom.description,
      items: bom.components || [],
      totalCost: totalCost,
    };
  });

  // Mutations
  const createBOMMutation = useMutation({
    mutationFn: async ({ productId, bomData }: { productId: number; bomData: any }) => {
      const response = await api.post(`/bom/${productId}`, bomData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      toast.success('BOM created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create BOM');
    },
  });

  const updateBOMMutation = useMutation({
    mutationFn: async ({ id, bomData }: { id: number; bomData: any }) => {
      const response = await api.patch(`/bom/${id}`, bomData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      toast.success('BOM updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update BOM');
    },
  });

  const deleteBOMMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/bom/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      toast.success('BOM deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete BOM');
    },
  });

  // Delete modal handlers
  const openDeleteModal = (bom: any) => {
    setBomToDelete(bom);
    setIsDeleteModalOpen(true);
    setTimeout(() => setIsDeleteModalShowing(true), 10);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setBomToDelete(null);
    }, 300);
  };

  const handleConfirmDelete = () => {
    if (bomToDelete) {
      deleteBOMMutation.mutate(bomToDelete.id);
    }
  };

  // Modal handlers
  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const openEditModal = (bom: any) => {
    setSelectedBOM(bom);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedBOM(null);
    }, 300);
  };

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isEditModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsEditModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsEditModalShowing(false);
    }
  }, [isEditModalOpen]);

  const filteredBoms = boms.filter((bom: any) =>
    bom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bom.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleBOM = (bomId: number) => {
    const newExpanded = new Set(expandedBoms);
    if (newExpanded.has(bomId)) {
      newExpanded.delete(bomId);
    } else {
      newExpanded.add(bomId);
    }
    setExpandedBoms(newExpanded);
  };

  const renderBOMItem = (item: any, level: number = 0) => {
    const cost = parseFloat(item.cost) || 0;
    const qty = parseFloat(item.quantity) || 0;

    return (
      <div key={item.id} className="border-l-2 border-gray-200 dark:border-gray-700 ml-4">
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${level > 0 ? 'ml-4' : ''
            }`}
        >
          <div className="w-6" />
          <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {level > 0 && <span className="text-gray-400 dark:text-gray-500">└─ </span>}
              {item.name}
            </div>
            <div className="text-gray-600 dark:text-gray-400">{qty}</div>
            <div className="text-gray-600 dark:text-gray-400">{item.unit || 'pcs'}</div>
            <div className="text-gray-600 dark:text-gray-400">${cost.toFixed(2)}</div>
            <div className="font-medium text-gray-900 dark:text-white">
              ${(cost * qty).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search BOMs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
          }}
          className="flex text-[14px] items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add BOM
        </button>
      </div>

      {/* BOM List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredBoms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <List className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No BOMs found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first Bill of Materials.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBoms.map((bom: any) => (
              <div key={bom.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleBOM(bom.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    >
                      {expandedBoms.has(bom.id) ? (
                        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{bom.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {bom.sku}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        ${bom.totalCost.toFixed(2)}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {bom.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(bom)}
                        className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(bom)}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {expandedBoms.has(bom.id) && (
                  <div className="ml-8 mt-4">
                    <div className="grid grid-cols-5 gap-4 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <div>Item</div>
                      <div>Quantity</div>
                      <div>Unit</div>
                      <div>Unit Cost</div>
                      <div>Total Cost</div>
                    </div>
                    {bom.items.map((item: any) => renderBOMItem(item, 0))}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Grand Total</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          ${bom.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add BOM Modal */}
      {isModalOpen && (
        <BOMModal
          products={products}
          onClose={closeModal}
          onSubmit={(bomData) => {
            if ('productId' in bomData) {
              createBOMMutation.mutate(bomData);
            }
          }}
          isLoading={createBOMMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit BOM Modal */}
      {isEditModalOpen && selectedBOM && (
        <BOMModal
          bom={selectedBOM}
          products={products}
          onClose={closeEditModal}
          onSubmit={(bomData) => updateBOMMutation.mutate({ id: selectedBOM.id, bomData })}
          isLoading={updateBOMMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && bomToDelete && (
        <>
          <div className={`modal-backdrop fade ${isDeleteModalShowing ? 'show' : ''}`} onClick={closeDeleteModal} />
          <div className={`modal fade ${isDeleteModalShowing ? 'show' : ''}`} onClick={closeDeleteModal} role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title font-semibold text-gray-900 dark:text-white">
                    Delete BOM
                  </h5>
                  <button type="button" onClick={closeDeleteModal} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Are you sure you want to delete this BOM?
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium">BOM Name:</span> {bomToDelete.name}
                      </p>
                      {bomToDelete.product && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span className="font-medium">Product:</span> {bomToDelete.product.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Total Cost:</span> ${bomToDelete.totalCost.toFixed(2)}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-3 font-medium">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="px-4 text-[14px] py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteBOMMutation.isPending}
                    className="px-4 py-2 text-[14px] bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {deleteBOMMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete BOM
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// BOM Modal Component
function BOMModal({
  bom,
  products,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  bom?: any;
  products: any[];
  onClose: () => void;
  onSubmit: (data: { productId: number; bomData: any } | { id: number; bomData: any }) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    productId: bom?.productId || 0,
    name: bom?.name || '',
    status: bom?.status || 'ACTIVE',
    description: bom?.description || '',
    components: bom?.items || [],
  });

  const [componentForm, setComponentForm] = useState({
    name: '',
    quantity: 1,
    unit: 'pcs',
    cost: 0,
    notes: '',
  });

  const addComponent = () => {
    if (!componentForm.name.trim()) {
      toast.error('Component name is required');
      return;
    }
    if (!componentForm.cost || componentForm.cost <= 0) {
      toast.error('Unit cost is required and must be greater than 0');
      return;
    }
    setFormData({
      ...formData,
      components: [
        ...formData.components,
        {
          name: componentForm.name,
          quantity: componentForm.quantity,
          unit: componentForm.unit,
          cost: componentForm.cost,
          notes: componentForm.notes,
        },
      ],
    });
    setComponentForm({ name: '', quantity: 1, unit: 'pcs', cost: 0, notes: '' });
  };

  const removeComponent = (index: number) => {
    setFormData({
      ...formData,
      components: formData.components.filter((_: any, i: number) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) {
      toast.error('Please select a product');
      return;
    }
    if (formData.components.length === 0) {
      toast.error('Please add at least one component');
      return;
    }

    const bomData = {
      name: formData.name,
      status: formData.status,
      description: formData.description,
      components: formData.components,
    };

    if (bom) {
      onSubmit({ id: bom.id, bomData });
    } else {
      onSubmit({ productId: formData.productId, bomData });
    }
  };

  return (
    <>
      <div className={`modal-backdrop fade ${isShowing ? 'show' : ''}`} onClick={onClose} />
      <div className={`modal fade ${isShowing ? 'show' : ''}`} onClick={onClose} role="dialog" aria-modal="true" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title font-semibold text-gray-900 dark:text-white">
                {bom ? 'Edit BOM' : 'Create New BOM'}
              </h5>
              <button type="button" onClick={onClose} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {!bom && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product *</label>
                      <CustomSelect
                        value={formData.productId > 0 ? formData.productId.toString() : ''}
                        onChange={(value) => setFormData({ ...formData, productId: parseInt(value) || 0 })}
                        options={products && products.length > 0 ? products.map((product) => ({
                          value: product.id.toString(),
                          label: `${product.name} (${product.sku})`
                        })) : []}
                        placeholder="Select a product"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">BOM Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter BOM name"
                      className="w-full px-4 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <CustomSelect
                      value={formData.status}
                      onChange={(value) => setFormData({ ...formData, status: value })}
                      options={[
                        { value: 'DRAFT', label: 'Draft' },
                        { value: 'ACTIVE', label: 'Active' },
                        { value: 'ARCHIVED', label: 'Archived' },
                      ]}
                      placeholder="Select status..."
                    />
                  </div>

                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter BOM description (optional)"
                    rows={3}
                    className="w-full px-4 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Components</h4>

                  {/* Column Headers */}
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Name *</label>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit</label>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Unit Cost *</label>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Action</label>
                  </div>

                  {/* Input Fields */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Component name"
                      value={componentForm.name}
                      onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                      className="px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={componentForm.quantity}
                      onChange={(e) => setComponentForm({ ...componentForm, quantity: parseFloat(e.target.value) || 0 })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                    <CustomSelect
                      value={componentForm.unit}
                      onChange={(value) => setComponentForm({ ...componentForm, unit: value })}
                      options={[
                        { value: 'pcs', label: 'pcs' },
                        { value: 'kg', label: 'kg' },
                        { value: 'g', label: 'g' },
                        { value: 'm', label: 'm' },
                        { value: 'cm', label: 'cm' },
                        { value: 'mm', label: 'mm' },
                        { value: 'L', label: 'L' },
                        { value: 'mL', label: 'mL' },
                        { value: 'm²', label: 'm²' },
                        { value: 'm³', label: 'm³' },
                        { value: 'oz', label: 'oz' },
                        { value: 'lb', label: 'lb' },
                        { value: 'ft', label: 'ft' },
                        { value: 'in', label: 'in' },
                        { value: 'yd', label: 'yd' },
                      ]}
                      placeholder="Select unit"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={componentForm.cost}
                      onChange={(e) => setComponentForm({ ...componentForm, cost: parseFloat(e.target.value) || 0 })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={addComponent}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mx-auto" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {formData.components.map((comp: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">{comp.name}</span>
                          <span className="text-gray-600 dark:text-gray-400">{comp.quantity} {comp.unit}</span>
                          <span className="text-gray-600 dark:text-gray-400">${comp.cost}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${(comp.cost * comp.quantity).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeComponent(index)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 text-[14px] py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-[14px] bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 text-[14px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {bom ? 'Update' : 'Create'} BOM
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Cost Sheets Section Component
function CostSheetsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [selectedCostSheet, setSelectedCostSheet] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [costSheetToDelete, setCostSheetToDelete] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch cost sheets from API
  const { data: costSheetsData, isLoading } = useQuery({
    queryKey: ['cost-sheets'],
    queryFn: async () => {
      try {
        const response = await api.get('/cost-sheets?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch products for cost sheet creation
  const { data: productsData } = useQuery({
    queryKey: ['products', 'cost-sheet-select'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];
  const costSheets = (costSheetsData || []).map((sheet: any) => ({
    id: sheet.id,
    productId: sheet.productId,
    productName: sheet.product?.name || sheet.product?.sku || 'Product',
    sku: sheet.product?.sku || 'N/A',
    materials: parseFloat(sheet.materials.toString()) || 0,
    labor: parseFloat(sheet.labor.toString()) || 0,
    overhead: parseFloat(sheet.overhead.toString()) || 0,
    totalCost: parseFloat(sheet.totalCost.toString()) || 0,
    sellingPrice: sheet.sellingPrice ? parseFloat(sheet.sellingPrice.toString()) : 0,
    margin: sheet.margin ? parseFloat(sheet.margin.toString()) : 0,
    notes: sheet.notes,
  }));

  // Mutations
  const createCostSheetMutation = useMutation({
    mutationFn: async ({ productId, costSheetData }: { productId: number; costSheetData: any }) => {
      const response = await api.post(`/cost-sheets/${productId}`, costSheetData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-sheets'] });
      toast.success('Cost sheet created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create cost sheet');
    },
  });

  const updateCostSheetMutation = useMutation({
    mutationFn: async ({ id, costSheetData }: { id: number; costSheetData: any }) => {
      const response = await api.patch(`/cost-sheets/${id}`, costSheetData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-sheets'] });
      toast.success('Cost sheet updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update cost sheet');
    },
  });

  const deleteCostSheetMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/cost-sheets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-sheets'] });
      toast.success('Cost sheet deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete cost sheet');
    },
  });

  // Delete modal handlers
  const openDeleteModal = (costSheet: any) => {
    setCostSheetToDelete(costSheet);
    setIsDeleteModalOpen(true);
    setTimeout(() => setIsDeleteModalShowing(true), 10);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setCostSheetToDelete(null);
    }, 300);
  };

  const handleConfirmDelete = () => {
    if (costSheetToDelete) {
      deleteCostSheetMutation.mutate(costSheetToDelete.id);
    }
  };

  // Modal handlers
  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const openEditModal = (costSheet: any) => {
    setSelectedCostSheet(costSheet);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedCostSheet(null);
    }, 300);
  };

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isEditModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsEditModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsEditModalShowing(false);
    }
  }, [isEditModalOpen]);

  const filteredCostSheets = costSheets.filter((sheet: any) =>
    sheet.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sheet.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search cost sheets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={openModal}
          className="flex text-[14px] items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Cost Sheet
        </button>
      </div>

      {/* Cost Sheets List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredCostSheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No cost sheets found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              Get started by adding your first cost sheet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-1">
                      <Package className="w-4 h-4" />
                      Materials
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="w-4 h-4" />
                      Labor
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-1">
                      <Factory className="w-4 h-4" />
                      Overhead
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Total Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Selling Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Margin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCostSheets.map((sheet: any) => (
                  <tr key={sheet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {sheet.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {sheet.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-right">
                      ${sheet.materials.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-right">
                      ${sheet.labor.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-right">
                      ${sheet.overhead.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                      ${sheet.totalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 text-right">
                      ${sheet.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <span className={`${sheet.margin >= 30 ? 'text-green-600 dark:text-green-400' : sheet.margin >= 20 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {sheet.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(sheet)}
                          className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(sheet)}
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
          </div>
        )}
      </div>

      {/* Add Cost Sheet Modal */}
      {isModalOpen && (
        <CostSheetModal
          products={products}
          onClose={closeModal}
          onSubmit={(costSheetData) => {
            if ('productId' in costSheetData) {
              createCostSheetMutation.mutate(costSheetData);
            }
          }}
          isLoading={createCostSheetMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Cost Sheet Modal */}
      {isEditModalOpen && selectedCostSheet && (
        <CostSheetModal
          costSheet={selectedCostSheet}
          products={products}
          onClose={closeEditModal}
          onSubmit={(costSheetData) => updateCostSheetMutation.mutate({ id: selectedCostSheet.id, costSheetData })}
          isLoading={updateCostSheetMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && costSheetToDelete && (
        <>
          <div className={`modal-backdrop fade ${isDeleteModalShowing ? 'show' : ''}`} onClick={closeDeleteModal} />
          <div className={`modal fade ${isDeleteModalShowing ? 'show' : ''}`} onClick={closeDeleteModal} role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title font-semibold text-gray-900 dark:text-white">
                    Delete Cost Sheet
                  </h5>
                  <button type="button" onClick={closeDeleteModal} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Are you sure you want to delete this cost sheet?
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium">Product:</span> {costSheetToDelete.productName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium">SKU:</span> {costSheetToDelete.sku}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Total Cost:</span> ${costSheetToDelete.totalCost.toFixed(2)}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-3 font-medium">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="px-4 text-[14px] py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteCostSheetMutation.isPending}
                    className="px-4 text-[14px] py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {deleteCostSheetMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Cost Sheet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Cost Sheet Modal Component
function CostSheetModal({
  costSheet,
  products,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  costSheet?: any;
  products: any[];
  onClose: () => void;
  onSubmit: (data: { productId: number; costSheetData: any } | { id: number; costSheetData: any }) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    productId: costSheet?.productId || 0,
    materials: costSheet?.materials || 0,
    labor: costSheet?.labor || 0,
    overhead: costSheet?.overhead || 0,
    sellingPrice: costSheet?.sellingPrice || 0,
    notes: costSheet?.notes || '',
  });

  const totalCost = formData.materials + formData.labor + formData.overhead;
  const margin = formData.sellingPrice > 0
    ? ((formData.sellingPrice - totalCost) / formData.sellingPrice) * 100
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId) {
      toast.error('Please select a product');
      return;
    }

    const costSheetData = {
      materials: formData.materials,
      labor: formData.labor,
      overhead: formData.overhead,
      sellingPrice: formData.sellingPrice || null,
      notes: formData.notes || null,
    };

    if (costSheet) {
      onSubmit({ id: costSheet.id, costSheetData });
    } else {
      onSubmit({ productId: formData.productId, costSheetData });
    }
  };

  return (
    <>
      <div className={`modal-backdrop fade ${isShowing ? 'show' : ''}`} onClick={onClose} />
      <div className={`modal fade ${isShowing ? 'show' : ''}`} onClick={onClose} role="dialog" aria-modal="true" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title font-semibold text-gray-900 dark:text-white">
                {costSheet ? 'Edit Cost Sheet' : 'Create New Cost Sheet'}
              </h5>
              <button type="button" onClick={onClose} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="space-y-4">
                  {!costSheet && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product *</label>
                      <CustomSelect
                        value={formData.productId > 0 ? formData.productId.toString() : ''}
                        onChange={(value) => setFormData({ ...formData, productId: parseInt(value) || 0 })}
                        options={products && products.length > 0 ? products.map((product) => ({
                          value: product.id.toString(),
                          label: `${product.name} (${product.sku})`
                        })) : []}
                        placeholder="Select a product"
                        error={!formData.productId}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Materials Cost ($)
                      </div>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.materials}
                      onChange={(e) => setFormData({ ...formData, materials: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Labor Cost ($)
                      </div>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.labor}
                      onChange={(e) => setFormData({ ...formData, labor: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4" />
                        Overhead Cost ($)
                      </div>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.overhead}
                      onChange={(e) => setFormData({ ...formData, overhead: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cost</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        ${totalCost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selling Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {formData.sellingPrice > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Margin</span>
                        <span className={`text-lg font-bold ${margin >= 30 ? 'text-green-600 dark:text-green-400' :
                            margin >= 20 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                          }`}>
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 text-[14px] py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 text-[14px] py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {costSheet ? 'Update' : 'Create'} Cost Sheet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Margin Simulator Section Component
function MarginSimulatorSection() {
  const [costs, setCosts] = useState({
    materials: 25.00,
    labor: 10.00,
    overhead: 5.00,
  });
  const [targetMargin, setTargetMargin] = useState(40);
  const [targetPrice, setTargetPrice] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch products for selection
  const { data: productsData } = useQuery({
    queryKey: ['products', 'margin-simulator'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const products = productsData || [];

  const totalCost = costs.materials + costs.labor + costs.overhead;
  const calculatedPrice = totalCost / (1 - targetMargin / 100);
  const calculatedMargin = targetPrice > 0 ? ((targetPrice - totalCost) / targetPrice) * 100 : 0;

  const handleCostChange = (key: 'materials' | 'labor' | 'overhead', value: number) => {
    setCosts((prev) => ({ ...prev, [key]: value }));
  };

  const handleTargetMarginChange = (value: number) => {
    setTargetMargin(value);
    const newPrice = totalCost / (1 - value / 100);
    setTargetPrice(newPrice);
  };

  const handleTargetPriceChange = (value: number) => {
    setTargetPrice(value);
  };

  // Save cost sheet mutation
  const saveCostSheetMutation = useMutation({
    mutationFn: async ({ productId, costSheetData }: { productId: number; costSheetData: any }) => {
      // Check if cost sheet exists for this product
      try {
        const existingResponse = await api.get(`/cost-sheets?skip=0&take=1000`);
        const existingSheets = Array.isArray(existingResponse.data)
          ? existingResponse.data
          : (existingResponse.data?.data || []);
        const existingSheet = existingSheets.find((sheet: any) => sheet.productId === productId);

        if (existingSheet) {
          // Update existing cost sheet
          const response = await api.patch(`/cost-sheets/${existingSheet.id}`, costSheetData);
          return response.data;
        } else {
          // Create new cost sheet
          const response = await api.post(`/cost-sheets/${productId}`, costSheetData);
          return response.data;
        }
      } catch (error: any) {
        // If check fails, try to create
        const response = await api.post(`/cost-sheets/${productId}`, costSheetData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-sheets'] });
      toast.success('Cost sheet saved successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save cost sheet');
    },
  });

  const handleSave = () => {
    if (!selectedProductId) {
      toast.error('Please select a product to save');
      return;
    }

    const costSheetData = {
      materials: costs.materials,
      labor: costs.labor,
      overhead: costs.overhead,
      sellingPrice: calculatedPrice,
      notes: `Margin Simulator: Target margin ${targetMargin}%, Calculated price $${calculatedPrice.toFixed(2)}`,
    };

    saveCostSheetMutation.mutate({
      productId: selectedProductId,
      costSheetData,
    });
  };

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Product
        </label>
        <CustomSelect
          value={selectedProductId ? selectedProductId.toString() : ''}
          onChange={(value) => setSelectedProductId(value ? parseInt(value) : null)}
          options={products && products.length > 0 ? products.map((product: any) => ({
            value: product.id.toString(),
            label: `${product.name} (${product.sku})`
          })) : []}
          placeholder="Select a product"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Inputs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-6">Cost Breakdown</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Materials Cost
                </div>
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.materials}
                onChange={(e) => handleCostChange('materials', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Labor Cost
                </div>
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.labor}
                onChange={(e) => handleCostChange('labor', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4" />
                  Overhead Cost
                </div>
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.overhead}
                onChange={(e) => handleCostChange('overhead', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Cost</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Margin & Price Calculator */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-6">Margin & Pricing</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Margin (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={targetMargin}
                  onChange={(e) => handleTargetMarginChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={targetMargin}
                  onChange={(e) => handleTargetMarginChange(parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-right"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Calculated Price (from margin)
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  ${calculatedPrice.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Cost: ${totalCost.toFixed(2)} ÷ (1 - {targetMargin}%) = ${calculatedPrice.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Price (to calculate margin)
              </label>
              <input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => handleTargetPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter target price"
              />
            </div>

            {targetPrice > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resulting Margin</span>
                  <span className={`text-xl font-bold ${calculatedMargin >= 30 ? 'text-green-600 dark:text-green-400' :
                      calculatedMargin >= 20 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                    }`}>
                    {calculatedMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Profit: ${(targetPrice - totalCost).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg shadow-sm border border-primary-200 dark:border-primary-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">Pricing Summary</h3>
          </div>
          <button
            onClick={handleSave}
            disabled={!selectedProductId || saveCostSheetMutation.isPending}
            className="flex text-[14px] items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveCostSheetMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Cost Sheet
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Cost</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">${totalCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Target Margin</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{targetMargin.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Recommended Price</p>
            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">${calculatedPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Profit per Unit</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              ${(calculatedPrice - totalCost).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



