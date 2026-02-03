import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Ruler, Plus, X, Pencil, Trash2, Search, ChevronDown, Globe, ArrowLeftRight, Inbox, Languages } from 'lucide-react';
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

type TabType = 'size-charts' | 'localization';

interface SizeChart {
  id: number;
  name: string;
  category?: string;
  description?: string;
  measurements: Record<string, Record<string, string | number>>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SizeFit() {
  const [activeTab, setActiveTab] = useState<TabType>('size-charts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [selectedChart, setSelectedChart] = useState<SizeChart | null>(null);
  const [deleteChart, setDeleteChart] = useState<SizeChart | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const categoryFilterRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const tabs = [
    { id: 'size-charts' as TabType, label: 'Size Charts', icon: Ruler },
    { id: 'localization' as TabType, label: 'Localization & Conversions', icon: Globe },
  ];

  // Fetch size charts from API
  const { data: chartsData, isLoading } = useQuery({
    queryKey: ['size-fit', searchQuery, filterCategory],
    queryFn: async () => {
      const params: any = { skip: 0, take: 1000 };
      if (searchQuery) params.search = searchQuery;
      if (filterCategory !== 'all') params.category = filterCategory;
      const response = await api.get('/size-fit', { params });
      return response.data;
    },
  });

  const sizeCharts: SizeChart[] = chartsData?.data || [];

  // Get unique categories
  const categories = Array.from(new Set(sizeCharts.map(chart => chart.category).filter(Boolean))) as string[];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (chartData: Partial<SizeChart> & { name: string; measurements: Record<string, Record<string, string | number>> }) => {
      const response = await api.post('/size-fit', chartData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-fit'] });
      toast.success('Size chart created successfully!');
      closeModal();
    },
    onError: () => {
      toast.error('Failed to create size chart');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...chartData }: Partial<SizeChart> & { id: number }) => {
      const response = await api.patch(`/size-fit/${id}`, chartData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-fit'] });
      toast.success('Size chart updated successfully!');
      closeEditModal();
    },
    onError: () => {
      toast.error('Failed to update size chart');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/size-fit/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-fit'] });
      toast.success('Size chart deleted successfully!');
      closeDeleteModal();
    },
    onError: () => {
      toast.error('Failed to delete size chart');
    },
  });

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

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const openEditModal = (chart: SizeChart) => {
    setSelectedChart(chart);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedChart(null);
    }, 300);
  };

  const openDeleteModal = (chart: SizeChart) => {
    setDeleteChart(chart);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setDeleteChart(null);
    }, 300);
  };

  const handleDeleteChart = () => {
    if (!deleteChart) return;
    deleteMutation.mutate(deleteChart.id);
  };

  // Close category filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(event.target as Node)) {
        setIsCategoryFilterOpen(false);
      }
    };

    if (isCategoryFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryFilterOpen]);

  // Filter charts
  const filteredCharts = sizeCharts;

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Size & Fit" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Size & Fit</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Size charts, Localization & Conversions</p>
          </div>
          {activeTab === 'size-charts' && (
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Size Chart
            </button>
          )}
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

      {/* Size Charts Tab */}
      {activeTab === 'size-charts' && (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search size charts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="relative" ref={categoryFilterRef}>
          <button
            type="button"
            onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
            className="flex items-center justify-between gap-2 px-4 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[160px]"
          >
            <span className="text-sm">
              {filterCategory === 'all' ? 'All Categories' : filterCategory}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isCategoryFilterOpen && (
            <div className="custom-dropdown-menu absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" style={{ zIndex: 10001 }}>
              <button
                type="button"
                onClick={() => {
                  setFilterCategory('all');
                  setIsCategoryFilterOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                  filterCategory === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat);
                    setIsCategoryFilterOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                    filterCategory === cat
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Size Charts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredCharts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Ruler className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No size charts found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || filterCategory !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first size chart.'}
            </p>
            {!searchQuery && filterCategory === 'all' && (
              <button
                onClick={openModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Size Chart
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Sizes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCharts.map((chart) => {
                  const sizes = Object.keys(chart.measurements || {});
                  return (
                    <tr key={chart.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{chart.name}</div>
                        {chart.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{chart.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {chart.category ? (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {chart.category}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {sizes.slice(0, 5).map((size) => (
                            <span key={size} className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 rounded">
                              {size}
                            </span>
                          ))}
                          {sizes.length > 5 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              +{sizes.length - 5}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          chart.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {chart.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openEditModal(chart)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(chart)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Delete"
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

      {/* Create Size Chart Modal */}
      {isModalOpen && (
        <SizeChartModal
          onClose={closeModal}
          onSave={(chartData) => createMutation.mutate(chartData)}
          isShowing={isModalShowing}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Size Chart Modal */}
      {isEditModalOpen && selectedChart && (
        <SizeChartModal
          chart={selectedChart}
          onClose={closeEditModal}
          onSave={(chartData) => updateMutation.mutate({ id: selectedChart.id, ...chartData })}
          isShowing={isEditModalShowing}
          isLoading={updateMutation.isPending}
        />
      )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deleteChart && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
            isDeleteModalShowing ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeDeleteModal}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Size Chart</h5>
              <button type="button" onClick={closeDeleteModal} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body p-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete the size chart <span className="font-semibold">"{deleteChart.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteChart}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Localization & Conversions Tab */}
      {activeTab === 'localization' && <LocalizationConversionsSection />}
    </div>
  );
}

// Localization & Conversions Section Component
function LocalizationConversionsSection() {
  const [unitFrom, setUnitFrom] = useState<'cm' | 'inches'>('cm');
  const [unitTo, setUnitTo] = useState<'cm' | 'inches'>('inches');
  const [conversionValue, setConversionValue] = useState<string>('');
  const [convertedValue, setConvertedValue] = useState<number | null>(null);

  // Unit conversion
  const handleUnitConversion = (value: string) => {
    setConversionValue(value);
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setConvertedValue(null);
      return;
    }

    if (unitFrom === 'cm' && unitTo === 'inches') {
      setConvertedValue(numValue / 2.54);
    } else if (unitFrom === 'inches' && unitTo === 'cm') {
      setConvertedValue(numValue * 2.54);
    } else {
      setConvertedValue(numValue);
    }
  };

  useEffect(() => {
    if (conversionValue) {
      handleUnitConversion(conversionValue);
    }
  }, [unitFrom, unitTo]);

  return (
    <div className="space-y-6">
      {/* Unit Conversion */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ArrowLeftRight className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unit Conversion</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From
            </label>
            <CustomSelect
              value={unitFrom}
              onChange={(value) => {
                setUnitFrom(value as 'cm' | 'inches');
                // Swap if same as "to"
                if (value === unitTo) {
                  setUnitTo(unitFrom);
                }
              }}
              options={[
                { value: 'cm', label: 'Centimeters (cm)' },
                { value: 'inches', label: 'Inches (in)' },
              ]}
              placeholder="Select unit..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Value
            </label>
            <input
              type="number"
              step="0.01"
              value={conversionValue}
              onChange={(e) => handleUnitConversion(e.target.value)}
              placeholder="Enter value"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To
            </label>
            <CustomSelect
              value={unitTo}
              onChange={(value) => {
                setUnitTo(value as 'cm' | 'inches');
                // Swap if same as "from"
                if (value === unitFrom) {
                  setUnitFrom(unitTo);
                }
              }}
              options={[
                { value: 'cm', label: 'Centimeters (cm)' },
                { value: 'inches', label: 'Inches (in)' },
              ]}
              placeholder="Select unit..."
            />
          </div>
        </div>

        {convertedValue !== null && (
          <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Converted Value:</span>
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {convertedValue.toFixed(2)} {unitTo}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Language & Localization Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Languages className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Language & Localization Settings</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Language for Size Charts
            </label>
            <CustomSelect
              value={localStorage.getItem('sizeChartLanguage') || 'en'}
              onChange={(value) => {
                localStorage.setItem('sizeChartLanguage', value);
                toast.success('Language preference saved');
              }}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish (Español)' },
                { value: 'fr', label: 'French (Français)' },
                { value: 'de', label: 'German (Deutsch)' },
                { value: 'it', label: 'Italian (Italiano)' },
                { value: 'pt', label: 'Portuguese (Português)' },
                { value: 'zh', label: 'Chinese (中文)' },
                { value: 'ja', label: 'Japanese (日本語)' },
                { value: 'ko', label: 'Korean (한국어)' },
                { value: 'ar', label: 'Arabic (العربية)' },
              ]}
              placeholder="Select language..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This language will be used as the default for size chart labels and descriptions
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Unit System
            </label>
            <CustomSelect
              value={localStorage.getItem('sizeChartUnitSystem') || 'metric'}
              onChange={(value) => {
                localStorage.setItem('sizeChartUnitSystem', value);
                toast.success('Unit system preference saved');
              }}
              options={[
                { value: 'metric', label: 'Metric (cm, kg)' },
                { value: 'imperial', label: 'Imperial (inches, lbs)' },
              ]}
              placeholder="Select unit system..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Default measurement units for size charts
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Regional Size System
            </label>
            <CustomSelect
              value={localStorage.getItem('sizeChartRegionalSystem') || 'us'}
              onChange={(value) => {
                localStorage.setItem('sizeChartRegionalSystem', value);
                toast.success('Regional size system preference saved');
              }}
              options={[
                { value: 'us', label: 'US Sizes' },
                { value: 'eu', label: 'EU Sizes' },
                { value: 'uk', label: 'UK Sizes' },
                { value: 'jp', label: 'JP Sizes' },
                { value: 'au', label: 'AU Sizes' },
              ]}
              placeholder="Select regional system..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Default regional sizing system for new size charts
            </p>
          </div>
        </div>
      </div>

      {/* Regional Size Conversions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Regional Size Conversions</h3>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Common size conversions between different regional sizing systems
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">US</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">EU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">UK</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">JP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">AU</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { us: 'XS', eu: '32', uk: '4', jp: 'S', au: '6' },
                { us: 'S', eu: '34-36', uk: '6-8', jp: 'M', au: '8-10' },
                { us: 'M', eu: '38-40', uk: '10-12', jp: 'L', au: '12-14' },
                { us: 'L', eu: '42-44', uk: '14-16', jp: 'XL', au: '16-18' },
                { us: 'XL', eu: '46-48', uk: '18-20', jp: 'XXL', au: '20-22' },
                { us: 'XXL', eu: '50-52', uk: '22-24', jp: 'XXXL', au: '24-26' },
              ].map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.us}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.eu}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.uk}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.jp}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.au}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Size Chart Modal Component
function SizeChartModal({
  chart,
  onClose,
  onSave,
  isShowing,
  isLoading,
}: {
  chart?: SizeChart;
  onClose: () => void;
  onSave: (chartData: Partial<SizeChart> & { name: string; measurements: Record<string, Record<string, string | number>> }) => void;
  isShowing: boolean;
  isLoading: boolean;
}) {
  const [name, setName] = useState(chart?.name || '');
  const [category, setCategory] = useState(chart?.category || '');
  const [description, setDescription] = useState(chart?.description || '');
  const [isActive, setIsActive] = useState(chart?.isActive !== false);
  const [sizes, setSizes] = useState<string[]>(chart ? Object.keys(chart.measurements || {}) : ['XS', 'S', 'M', 'L', 'XL']);
  const [measurementTypes, setMeasurementTypes] = useState<string[]>(() => {
    if (chart && chart.measurements) {
      const allTypes = new Set<string>();
      Object.values(chart.measurements).forEach((measurements) => {
        Object.keys(measurements).forEach((type) => allTypes.add(type));
      });
      return Array.from(allTypes);
    }
    return ['Chest', 'Waist', 'Length', 'Sleeve'];
  });
  const [measurements, setMeasurements] = useState<Record<string, Record<string, string>>>(() => {
    if (chart && chart.measurements) {
      const result: Record<string, Record<string, string>> = {};
      Object.entries(chart.measurements).forEach(([size, measures]) => {
        result[size] = {};
        Object.entries(measures).forEach(([type, value]) => {
          result[size][type] = String(value);
        });
      });
      return result;
    }
    return {};
  });

  const handleAddSize = () => {
    const newSize = prompt('Enter size name (e.g., XXL, 2XL):');
    if (newSize && newSize.trim() && !sizes.includes(newSize.trim())) {
      setSizes([...sizes, newSize.trim()]);
      setMeasurements({
        ...measurements,
        [newSize.trim()]: {},
      });
    }
  };

  const handleRemoveSize = (size: string) => {
    if (sizes.length <= 1) {
      toast.error('At least one size is required');
      return;
    }
    setSizes(sizes.filter(s => s !== size));
    const newMeasurements = { ...measurements };
    delete newMeasurements[size];
    setMeasurements(newMeasurements);
  };

  const handleAddMeasurementType = () => {
    const newType = prompt('Enter measurement type (e.g., Shoulder, Hip):');
    if (newType && newType.trim() && !measurementTypes.includes(newType.trim())) {
      setMeasurementTypes([...measurementTypes, newType.trim()]);
    }
  };

  const handleRemoveMeasurementType = (type: string) => {
    if (measurementTypes.length <= 1) {
      toast.error('At least one measurement type is required');
      return;
    }
    setMeasurementTypes(measurementTypes.filter(t => t !== type));
    const newMeasurements = { ...measurements };
    sizes.forEach(size => {
      if (newMeasurements[size]) {
        delete newMeasurements[size][type];
      }
    });
    setMeasurements(newMeasurements);
  };

  const handleMeasurementChange = (size: string, type: string, value: string) => {
    setMeasurements({
      ...measurements,
      [size]: {
        ...(measurements[size] || {}),
        [type]: value,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    // Convert measurements to proper format
    const formattedMeasurements: Record<string, Record<string, string | number>> = {};
    sizes.forEach(size => {
      formattedMeasurements[size] = {};
      measurementTypes.forEach(type => {
        const value = measurements[size]?.[type] || '';
        formattedMeasurements[size][type] = value ? (isNaN(Number(value)) ? value : Number(value)) : '';
      });
    });

    onSave({
      name: name.trim(),
      category: category.trim() || undefined,
      description: description.trim() || undefined,
      isActive,
      measurements: formattedMeasurements,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isShowing ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden transform transition-transform duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h5 className="text-xl font-semibold text-gray-900 dark:text-white">
            {chart ? 'Edit Size Chart' : 'Create Size Chart'}
          </h5>
          <button type="button" onClick={onClose} className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="modal-body p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Men's T-Shirt Size Chart"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Tops, Bottoms, Shoes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter description"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h6 className="text-sm font-semibold text-gray-900 dark:text-white">Measurements</h6>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                  >
                    + Add Size
                  </button>
                  <button
                    type="button"
                    onClick={handleAddMeasurementType}
                    className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                  >
                    + Add Measurement
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-white uppercase border-r border-gray-200 dark:border-gray-600">
                        Size
                      </th>
                      {measurementTypes.map((type) => (
                        <th key={type} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-white uppercase border-r border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <span>{type}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMeasurementType(type)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sizes.map((size) => (
                      <tr key={size}>
                        <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{size}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSize(size)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {measurementTypes.map((type) => (
                          <td key={type} className="px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                            <input
                              type="text"
                              value={measurements[size]?.[type] || ''}
                              onChange={(e) => handleMeasurementChange(size, type, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                              placeholder="—"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="modal-footer border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : chart ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
