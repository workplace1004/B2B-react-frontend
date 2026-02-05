import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Barcode, Plus, Search, Pencil, Download, X, Check, AlertCircle, ChevronsLeft, ChevronsRight, ChevronDown, Inbox } from 'lucide-react';
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
            })
          )}
        </div>
      )}
    </div>
  );
};

export default function SkuEanBarcodes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'missing-sku' | 'missing-ean' | 'missing-barcode'>('all');
  const [page, setPage] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const queryClient = useQueryClient();

  // Handle body scroll lock when modal is open
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

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'sku-ean'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=10000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, productData }: { id: number; productData: any }) => {
      const response = await api.patch(`/products/${id}`, productData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'sku-ean'] });
      toast.success('Product updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update product';
      toast.error(errorMessage);
    },
  });

  const products = data || [];

  // Generate variants for products (Style → Color → Size combinations)
  const generateVariants = (products: any[]) => {
    const variants: any[] = [];
    products.forEach((product) => {
      const colors = product.colors || [];
      const sizes = product.sizes || [];
      
      if (colors.length === 0 && sizes.length === 0) {
        // No variants, just the base product
        variants.push({
          ...product,
          variantKey: `base-${product.id}`,
          variantColor: null,
          variantSize: null,
          variantSku: product.sku,
          variantEan: product.ean,
        });
      } else {
        // Generate variants for each color-size combination
        const colorList = colors.length > 0 ? colors : [null];
        const sizeList = sizes.length > 0 ? sizes : [null];
        
        colorList.forEach((color: string | null) => {
          sizeList.forEach((size: string | null) => {
            const variantSuffix = [color, size].filter(Boolean).join('-').toUpperCase().replace(/\s+/g, '-');
            variants.push({
              ...product,
              variantKey: `${product.id}-${color || 'no-color'}-${size || 'no-size'}`,
              variantColor: color,
              variantSize: size,
              variantSku: variantSuffix ? `${product.sku}-${variantSuffix}` : product.sku,
              variantEan: product.ean ? `${product.ean}-${variantSuffix}` : null,
            });
          });
        });
      }
    });
    return variants;
  };

  const allVariants = generateVariants(products);

  // Filter variants
  const filteredVariants = useMemo(() => {
    return allVariants.filter((variant) => {
      const matchesSearch = searchQuery === '' || 
        variant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.variantSku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (variant.variantEan && variant.variantEan.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterType === 'all' ||
        (filterType === 'missing-sku' && !variant.variantSku) ||
        (filterType === 'missing-ean' && !variant.variantEan) ||
        (filterType === 'missing-barcode' && !variant.variantEan);
      
      return matchesSearch && matchesFilter;
    });
  }, [allVariants, searchQuery, filterType]);

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredVariants.length / itemsPerPage);
  const paginatedVariants = filteredVariants.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  // Reset to page 0 when search or filter changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterType]);

  const openEditModal = (variant: any) => {
    setSelectedProduct(variant);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    }, 300);
  };

  // Generate barcode image URL (using a barcode generation service or library)
  const generateBarcodeUrl = (code: string) => {
    if (!code) return null;
    // Using a barcode generation API (you can replace with a library like jsbarcode)
    return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(code)}&code=Code128&dpi=96`;
  };

  // Bulk generate missing SKUs
  const bulkGenerateSkus = () => {
    const productsToUpdate = allVariants.filter(v => !v.variantSku);
    if (productsToUpdate.length === 0) {
      toast('No missing SKUs', { icon: 'ℹ️' });
      return;
    }
    
    // Generate SKUs for products missing them
    const updates = productsToUpdate.map((variant) => {
      const baseSku = variant.sku || `PROD-${variant.id}`;
      const suffix = [variant.variantColor, variant.variantSize].filter(Boolean).join('-').toUpperCase().replace(/\s+/g, '-');
      const newSku = suffix ? `${baseSku}-${suffix}` : baseSku;
      
      return {
        id: variant.id,
        sku: newSku,
      };
    });

    // Update products (in a real scenario, you'd batch these)
    toast(`Generating SKUs for ${updates.length} products...`, { icon: 'ℹ️' });
    // For now, just show a message - in production, you'd make API calls
    toast.success(`Would generate SKUs for ${updates.length} products`);
  };

  // Bulk generate missing EANs
  const bulkGenerateEans = () => {
    const productsToUpdate = allVariants.filter(v => !v.variantEan);
    if (productsToUpdate.length === 0) {
      toast('No missing EANs', { icon: 'ℹ️' });
      return;
    }
    
    toast(`Generating EANs for ${productsToUpdate.length} products...`, { icon: 'ℹ️' });
    // Generate EAN-13 format (13 digits)
    const updates = productsToUpdate.map((variant: any) => {
      // Generate a valid EAN-13 (simplified - in production, use proper EAN generation)
      const baseNumber = variant.id.toString().padStart(6, '0');
      const variantNumber = variant.variantKey.split('-').slice(-2).join('').substring(0, 6).padStart(6, '0');
      const newEan = `200${baseNumber}${variantNumber}`.substring(0, 13);
      
      return {
        id: variant.id,
        ean: newEan,
      };
    });

    toast.success(`Would generate EANs for ${updates.length} products`);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="SKU / EAN / Barcodes" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">SKU / EAN / Barcodes</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Manage product identifiers, generate barcodes, and track variants</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkGenerateSkus}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate Missing SKUs
            </button>
            <button
              onClick={bulkGenerateEans}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate Missing EANs
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by SKU, EAN, or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <CustomSelect
              value={filterType}
              onChange={(value) => setFilterType(value as any)}
              options={[
                { value: 'all', label: 'All Products' },
                { value: 'missing-sku', label: 'Missing SKU' },
                { value: 'missing-ean', label: 'Missing EAN' },
                { value: 'missing-barcode', label: 'Missing Barcode' },
              ]}
              placeholder="Select filter..."
              className="min-w-[180px]"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Variants</p>
              <p className="text-[28px] font-bold text-gray-900 dark:text-white">{allVariants.length}</p>
            </div>
            <Barcode className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">With SKU</p>
              <p className="text-[28px] font-bold text-gray-900 dark:text-white">
                {allVariants.filter(v => v.variantSku).length}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">With EAN</p>
              <p className="text-[28px] font-bold text-gray-900 dark:text-white">
                {allVariants.filter(v => v.variantEan).length}
              </p>
            </div>
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Missing</p>
              <p className="text-[28px] font-bold text-gray-900 dark:text-white">
                {allVariants.filter(v => !v.variantSku || !v.variantEan).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredVariants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Barcode className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search or filter criteria.' : 'Get started by adding products with SKU/EAN/Barcode to the inventory.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Variant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">EAN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Barcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedVariants.map((variant) => {
                  const barcodeUrl = generateBarcodeUrl(variant.variantEan || variant.variantSku);
                  return (
                    <tr key={variant.variantKey} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{variant.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{variant.collection?.name || 'No Collection'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {variant.variantColor && (
                            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                              {variant.variantColor}
                            </span>
                          )}
                          {variant.variantSize && (
                            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded">
                              {variant.variantSize}
                            </span>
                          )}
                          {!variant.variantColor && !variant.variantSize && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">Base</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {variant.variantSku || (
                            <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {variant.variantEan || (
                            <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {barcodeUrl ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={barcodeUrl}
                              alt={`Barcode for ${variant.variantEan || variant.variantSku}`}
                              className="h-12"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = barcodeUrl;
                                link.download = `barcode-${variant.variantEan || variant.variantSku}.png`;
                                link.click();
                              }}
                              className="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 rounded"
                              title="Download barcode"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500 italic">No barcode</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(variant)}
                          className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredVariants.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-6">
            <div className="text-sm text-gray-600 dark:text-white">
              Showing <span className="font-medium text-gray-900 dark:text-white">{page * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min((page + 1) * itemsPerPage, filteredVariants.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredVariants.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && selectedProduct && (
        <EditSkuEanModal
          product={selectedProduct}
          onClose={closeEditModal}
          onSave={(data) => {
            updateProductMutation.mutate({
              id: selectedProduct.id,
              productData: data,
            });
          }}
          isLoading={updateProductMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}
    </div>
  );
}

// Edit SKU/EAN Modal Component
function EditSkuEanModal({
  product,
  onClose,
  onSave,
  isLoading,
  isShowing,
}: {
  product: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [sku, setSku] = useState(product.variantSku || product.sku || '');
  const [ean, setEan] = useState(product.variantEan || product.ean || '');

  useEffect(() => {
    setSku(product.variantSku || product.sku || '');
    setEan(product.variantEan || product.ean || '');
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For variants, we need to update the base product
    // In a real system, you might have variant-specific SKU/EAN storage
    const updateData: any = {};
    
    if (product.variantColor || product.variantSize) {
      // This is a variant - in a real system, you'd update variant-specific fields
      // For now, we'll update the base product
      if (sku && sku !== product.sku) {
        updateData.sku = sku;
      }
      if (ean && ean !== product.ean) {
        updateData.ean = ean;
      }
    } else {
      // Base product
      if (sku) updateData.sku = sku;
      if (ean) updateData.ean = ean;
    }

    if (Object.keys(updateData).length > 0) {
      onSave(updateData);
    } else {
      toast.error('No changes to save');
    }
  };

  const generateSku = () => {
    const baseSku = product.sku || `PROD-${product.id}`;
    const suffix = [product.variantColor, product.variantSize].filter(Boolean).join('-').toUpperCase().replace(/\s+/g, '-');
    setSku(suffix ? `${baseSku}-${suffix}` : baseSku);
  };

  const generateEan = () => {
    // Generate EAN-13 format
    const baseNumber = product.id.toString().padStart(6, '0');
    const variantNumber = product.variantKey?.split('-').slice(-2).join('').substring(0, 6).padStart(6, '0') || '000000';
    const newEan = `200${baseNumber}${variantNumber}`.substring(0, 13);
    setEan(newEan);
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
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '600px' }}
        >
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <h5 className="modal-title font-semibold text-gray-900 dark:text-white">
                Edit SKU / EAN / Barcode
              </h5>
              <button
                type="button"
                onClick={onClose}
                className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                    {(product.variantColor || product.variantSize) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Variant: {[product.variantColor, product.variantSize].filter(Boolean).join(' / ') || 'Base'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      SKU
                    </label>
                    <button
                      type="button"
                      onClick={generateSku}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter SKU"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      EAN (Barcode)
                    </label>
                    <button
                      type="button"
                      onClick={generateEan}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ean}
                    onChange={(e) => setEan(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter EAN (13 digits)"
                    maxLength={13}
                  />
                  {ean && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Barcode Preview:</p>
                      <img
                        src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(ean)}&code=Code128&dpi=96`}
                        alt={`Barcode for ${ean}`}
                        className="h-16"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border text-[14px] border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 text-[14px] ml-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
