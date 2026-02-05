import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Package, Plus, X, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Pencil, Trash2, AlertTriangle, Upload, Inbox, Eye, ChevronLeft } from 'lucide-react';
import { validators } from '../utils/validation';
import { generateEAN13 } from '../utils/ean';
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
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between ${error ? 'border-red-500' : 'border-gray-300'
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
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl custom-dropdown-menu"
          style={{
            zIndex: 10000,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            maxHeight: '400px',
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
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : isHighlighted
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
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

// Waves effect button component matching sample
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

export default function Products() {
  const [page, setPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalShowing, setIsViewModalShowing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'variants'>('table'); // Default: table view
  const [activeTab, setActiveTab] = useState<'products' | 'attributes' | 'bundles'>('products'); // Tab state for Catalog sections
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set()); // Track expanded styles in variant view
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set()); // Track expanded colors (key: "style-color")
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(new Set()); // Track expanded sizes (key: "style-color-size")
  const queryClient = useQueryClient();

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen || isViewModalOpen) {
      document.body.classList.add('modal-open');
      // Trigger show animation after a brief delay
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isModalOpen) setIsModalShowing(true);
          if (isEditModalOpen) setIsEditModalShowing(true);
          if (isDeleteModalOpen) setIsDeleteModalShowing(true);
          if (isViewModalOpen) setIsViewModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
      setIsEditModalShowing(false);
      setIsDeleteModalShowing(false);
      setIsViewModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen, isViewModalOpen]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page],
    queryFn: async () => {
      const response = await api.get(`/products?skip=${page * 10}&take=10`);
      return response.data;
    },
  });

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await api.get('/collections');
      return response.data;
    },
  });

  // Fetch all products for variant organization (without pagination)
  const { data: allProductsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=10000');
      return response.data;
    },
  });

  // Organize products by Style → Color → Size → Variant
  const organizeProductsByVariants = (products: any[]) => {
    const variantMap: Record<string, {
      style: string;
      colors: Record<string, {
        color: string;
        sizes: Record<string, {
          size: string;
          variants: any[];
        }>;
      }>;
    }> = {};

    products.forEach((product) => {
      const style = product.style || 'Uncategorized';
      const colors = product.colors || [];
      const sizes = product.sizes || [];

      if (!variantMap[style]) {
        variantMap[style] = { style, colors: {} };
      }

      // Create variants for each color-size combination
      colors.forEach((color: string) => {
        if (!variantMap[style].colors[color]) {
          variantMap[style].colors[color] = { color, sizes: {} };
        }

        sizes.forEach((size: string) => {
          if (!variantMap[style].colors[color].sizes[size]) {
            variantMap[style].colors[color].sizes[size] = { size, variants: [] };
          }

          // Create variant entry
          variantMap[style].colors[color].sizes[size].variants.push({
            ...product,
            variantKey: `${product.id}-${color}-${size}`,
            variantColor: color,
            variantSize: size,
          });
        });
      });
    });

    return Object.values(variantMap);
  };

  const variantGroups = allProductsData?.data ? organizeProductsByVariants(allProductsData.data) : [];

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      // Convert images to base64 if they exist
      let imageUrls: string[] = [];
      if (productData.images && productData.images.length > 0) {
        const imagePromises = productData.images.map(async (file: File) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
          });
        });
        imageUrls = await Promise.all(imagePromises);
      }

      // Include images in product data
      const { images, ...restProductData } = productData;
      const productPayload = {
        ...restProductData,
        images: imageUrls,
      };

      const response = await api.post('/products', productPayload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product added successfully!');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add product';
      toast.error(errorMessage);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, productData }: { id: number; productData: any }) => {
      // Get current product to merge existing images
      const currentProduct = await api.get(`/products/${id}`);
      const currentImages = currentProduct.data.images || [];

      // Convert new images to base64
      let newImageUrls: string[] = [];
      if (productData.images && productData.images.length > 0) {
        const imagePromises = productData.images.map(async (file: File) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
          });
        });
        newImageUrls = await Promise.all(imagePromises);
      }

      // Merge existing images (excluding deleted ones) with new images
      const imagesToKeep = currentImages.filter((_img: string, index: number) => {
        // If imagesToDelete contains indices, filter them out
        // Otherwise, keep all existing images
        return !productData.imagesToDelete || !productData.imagesToDelete.includes(index);
      });

      const allImages = [...imagesToKeep, ...newImageUrls];

      // Remove image-related fields and add merged images
      const { images, imagesToDelete, ...restProductData } = productData;
      const productPayload = {
        ...restProductData,
        images: allImages,
      };

      const response = await api.patch(`/products/${id}`, productPayload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dam'] });
      toast.success('Product updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update product';
      toast.error(errorMessage);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete product';
      toast.error(errorMessage);
    },
  });

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    // Wait for fade out animation (300ms)
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedProduct(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
    }, 300);
  };

  const closeViewModal = () => {
    setIsViewModalShowing(false);
    setTimeout(() => {
      setIsViewModalOpen(false);
      setSelectedProduct(null);
    }, 300);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Catalog" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Catalog</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Products (Style → Color → Size → Variant), Attributes & Taxonomy, Bundles & Kits</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'products'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            Products (Variants)
          </button>
          <button
            onClick={() => setActiveTab('attributes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'attributes'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            Attributes & Taxonomy
          </button>
          <button
            onClick={() => setActiveTab('bundles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'bundles'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
          >
            Bundles & Kits
          </button>
        </nav>
      </div>

      {/* Products Tab - Variant Hierarchy View */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* View Mode Toggle */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'table'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('variants')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'variants'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                Variant View (Style → Color → Size)
              </button>
            </div>
            <ButtonWithWaves onClick={openModal}>
              <Plus className="w-4 h-4" />
              Add Product
            </ButtonWithWaves>
          </div>

          {/* Variant Hierarchy View */}
          {viewMode === 'variants' ? (
            !variantGroups || variantGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                  Get started by adding your first product to the catalog.
                </p>
                <ButtonWithWaves onClick={openModal}>
                  <Plus className="w-4 h-4" />
                  Add Product
                </ButtonWithWaves>
              </div>
            ) : (
              <div className="p-6">
                {variantGroups.map((styleGroup, styleIdx) => {
                  const styleKey = styleGroup.style;
                  const isExpanded = expandedStyles.has(styleKey);

                  return (
                    <div key={styleIdx} className="mb-8 last:mb-0">
                      <h3
                        onClick={() => {
                          const newExpanded = new Set(expandedStyles);
                          if (newExpanded.has(styleKey)) {
                            newExpanded.delete(styleKey);
                          } else {
                            newExpanded.add(styleKey);
                          }
                          setExpandedStyles(newExpanded);
                        }}
                        className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                        Style: {styleGroup.style}
                      </h3>
                      {isExpanded && Object.values(styleGroup.colors).map((colorGroup, colorIdx) => {
                        const colorKey = `${styleKey}-${colorGroup.color}`;
                        const isColorExpanded = expandedColors.has(colorKey);

                        return (
                          <div key={colorIdx} className="ml-4 mb-6">
                            <h4
                              onClick={() => {
                                const newExpanded = new Set(expandedColors);
                                if (newExpanded.has(colorKey)) {
                                  newExpanded.delete(colorKey);
                                } else {
                                  newExpanded.add(colorKey);
                                }
                                setExpandedColors(newExpanded);
                              }}
                              className="text-[14px] font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                              {isColorExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              Color: {colorGroup.color}
                            </h4>
                            {isColorExpanded && Object.values(colorGroup.sizes).map((sizeGroup, sizeIdx) => {
                              const sizeKey = `${colorKey}-${sizeGroup.size}`;
                              const isSizeExpanded = expandedSizes.has(sizeKey);

                              return (
                                <div key={sizeIdx} className="ml-4 mb-4">
                                  <h5
                                    onClick={() => {
                                      const newExpanded = new Set(expandedSizes);
                                      if (newExpanded.has(sizeKey)) {
                                        newExpanded.delete(sizeKey);
                                      } else {
                                        newExpanded.add(sizeKey);
                                      }
                                      setExpandedSizes(newExpanded);
                                    }}
                                    className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                  >
                                    {isSizeExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                    Size: {sizeGroup.size}
                                  </h5>
                                  {isSizeExpanded && (
                                    <div className="ml-4 space-y-2">
                                      {sizeGroup.variants.map((variant: any) => (
                                        <div
                                          key={variant.variantKey}
                                          className="flex items-center justify-between p-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {variant.name}
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                SKU: {variant.sku}
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                Collection: {variant.collection?.name || '-'}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => {
                                                setSelectedProduct(variant);
                                                setIsEditModalOpen(true);
                                              }}
                                              className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                              title="Edit"
                                            >
                                              <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => {
                                                setSelectedProduct(variant);
                                                setIsDeleteModalOpen(true);
                                              }}
                                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                              title="Delete"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Table View */
            !data?.data || data.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No catalogs found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
                  Get started by adding your first product to the inventory.
                </p>
                <ButtonWithWaves onClick={openModal}>
                  <Plus className="w-5 h-5" />
                  Add Catalog
                </ButtonWithWaves>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-5">
                {data.data.map((product: any) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      {/* Action buttons overlay */}
                      <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsViewModalOpen(true);
                          }}
                          className="p-2 bg-white dark:bg-gray-800 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg shadow-md hover:shadow-lg transition-all"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 bg-white dark:bg-gray-800 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 rounded-lg shadow-md hover:shadow-lg transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 bg-white dark:bg-gray-800 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg shadow-md hover:shadow-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Image count badge */}
                      {product.images && product.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                          +{product.images.length - 1}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
                          Name: {product.name}
                        </h3>
                      </div>

                      <div className="mb-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>

                        {/* Collection */}
                        {product.collection?.name && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Collection:</span>
                            <span className="text-xs font-medium text-gray-900 dark:text-white ml-1">
                              {product.collection.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* EAN */}
                      {product.ean && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">EAN: {product.ean}</p>
                        </div>
                      )}

                      {/* Sizes and Colors */}
                      <div className="space-y-1.5">
                        {product.sizes && product.sizes.length > 0 && (
                          <div className="flex items-start gap-1 flex-wrap">
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Sizes:</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {product.sizes.map((size: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                >
                                  {size}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {product.colors && product.colors.length > 0 && (
                          <div className="flex items-start gap-1 flex-wrap">
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Colors:</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {product.colors.map((color: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                >
                                  {color}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Materials */}
                        {product.materials && (
                          <div className="flex items-start gap-1 flex-wrap">
                            <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Materials:</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {Array.isArray(product.materials) ? (
                                product.materials.map((material: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                  >
                                    {material}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                  {product.materials}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Pagination */}
          {data?.data && data.data.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 pb-6">
              <div className="text-sm text-gray-600 dark:text-white">
                Showing <span className="font-medium text-gray-900 dark:text-white">{page * 10 + 1}</span> to{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.min((page + 1) * 10, data.total)}
                </span>{' '}
                of <span className="font-medium text-gray-900 dark:text-white">{data.total}</span> results
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
                  Page {page + 1} of {Math.ceil(data.total / 10)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(data.total / 10) - 1, p + 1))}
                  disabled={page >= Math.ceil(data.total / 10) - 1}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.ceil(data.total / 10) - 1)}
                  disabled={page >= Math.ceil(data.total / 10) - 1}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attributes & Taxonomy Tab */}
      {activeTab === 'attributes' && (
        <AttributesTaxonomySection />
      )}

      {/* Bundles & Kits Tab */}
      {activeTab === 'bundles' && (
        <BundlesKitsSection />
      )}


      {/* Add Product Modal */}
      {isModalOpen && (
        <AddProductModal
          collections={collections || []}
          onClose={closeModal}
          onSubmit={(productData) => createProductMutation.mutate(productData)}
          isLoading={createProductMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && selectedProduct && (
        <EditProductModal
          product={selectedProduct}
          collections={collections || []}
          onClose={closeEditModal}
          onSubmit={(productData) => updateProductMutation.mutate({ id: selectedProduct.id, productData })}
          isLoading={updateProductMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {/* Delete Product Modal */}
      {isDeleteModalOpen && selectedProduct && (
        <DeleteProductModal
          product={selectedProduct}
          onClose={closeDeleteModal}
          onConfirm={() => deleteProductMutation.mutate(selectedProduct.id)}
          isLoading={deleteProductMutation.isPending}
          isShowing={isDeleteModalShowing}
        />
      )}

      {/* View Product Modal */}
      {isViewModalOpen && selectedProduct && (
        <ViewProductModal
          product={selectedProduct}
          onClose={closeViewModal}
          isShowing={isViewModalShowing}
        />
      )}
    </div>
  );
}

// Add Product Modal Component
function AddProductModal({
  collections,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  collections: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    style: '',
    sizes: '',
    colors: '',
    materials: '',
    ean: '',
    description: '',
    basePrice: '',
    collectionId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete for sizes
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizesInputValue, setSizesInputValue] = useState('');
  const [sizesSuggestions, setSizesSuggestions] = useState<string[]>([]);
  const [showSizesSuggestions, setShowSizesSuggestions] = useState(false);
  const sizesInputRef = useRef<HTMLInputElement>(null);
  const sizesDropdownRef = useRef<HTMLDivElement>(null);
  const sizesContainerRef = useRef<HTMLDivElement>(null);

  // Common sizes list
  const commonSizes = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
    '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50',
    '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24',
    'One Size', 'OS', 'Free Size',
  ];

  // Autocomplete for colors
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [colorsInputValue, setColorsInputValue] = useState('');
  const [colorsSuggestions, setColorsSuggestions] = useState<string[]>([]);
  const [showColorsSuggestions, setShowColorsSuggestions] = useState(false);
  const colorsInputRef = useRef<HTMLInputElement>(null);
  const colorsDropdownRef = useRef<HTMLDivElement>(null);
  const colorsContainerRef = useRef<HTMLDivElement>(null);

  // Common colors list
  const commonColors = [
    'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Black', 'White',
    'Gray', 'Grey', 'Navy', 'Beige', 'Tan', 'Khaki', 'Olive', 'Maroon', 'Burgundy', 'Crimson',
    'Coral', 'Salmon', 'Peach', 'Lavender', 'Violet', 'Indigo', 'Turquoise', 'Teal', 'Cyan',
    'Magenta', 'Lime', 'Mint', 'Emerald', 'Forest', 'Sage', 'Ivory', 'Cream', 'Gold', 'Silver',
    'Bronze', 'Copper', 'Rose', 'Fuchsia', 'Aqua', 'Sky', 'Royal', 'Midnight', 'Charcoal',
    'Slate', 'Taupe', 'Camel', 'Cognac', 'Burgundy', 'Wine', 'Plum', 'Mauve', 'Lilac',
  ];

  // Autocomplete for materials
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [materialsInputValue, setMaterialsInputValue] = useState('');
  const [materialsSuggestions, setMaterialsSuggestions] = useState<string[]>([]);
  const [showMaterialsSuggestions, setShowMaterialsSuggestions] = useState(false);
  const materialsInputRef = useRef<HTMLInputElement>(null);
  const materialsDropdownRef = useRef<HTMLDivElement>(null);
  const materialsContainerRef = useRef<HTMLDivElement>(null);

  // Common materials list
  const commonMaterials = [
    'Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather', 'Suede', 'Cashmere',
    'Rayon', 'Nylon', 'Spandex', 'Elastane', 'Bamboo', 'Hemp', 'Modal', 'Tencel', 'Lyocell',
    'Acrylic', 'Viscose', 'Chiffon', 'Satin', 'Velvet', 'Corduroy', 'Flannel', 'Jersey',
    'Mesh', 'Organza', 'Tulle', 'Twill', 'Canvas', 'Fleece', 'Terry', 'Towel', 'Microfiber',
    'Faux Leather', 'Faux Fur', 'Synthetic', 'Blend', 'Organic Cotton', 'Recycled Polyester',
  ];

  // Initialize sizes from formData
  useEffect(() => {
    if (formData.sizes) {
      const sizesArray = formData.sizes.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedSizes(sizesArray);
    } else {
      setSelectedSizes([]);
    }
  }, [formData.sizes]);

  // Initialize colors from formData
  useEffect(() => {
    if (formData.colors) {
      const colorsArray = formData.colors.split(',').map(c => c.trim()).filter(Boolean);
      setSelectedColors(colorsArray);
    } else {
      setSelectedColors([]);
    }
  }, [formData.colors]);

  // Initialize materials from formData
  useEffect(() => {
    if (formData.materials) {
      const materialsArray = formData.materials.split(',').map(m => m.trim()).filter(Boolean);
      setSelectedMaterials(materialsArray);
    } else {
      setSelectedMaterials([]);
    }
  }, [formData.materials]);

  // Reset images when modal closes
  useEffect(() => {
    if (!isShowing) {
      setSelectedImages([]);
      setImagePreviews([]);
      setShowSizesSuggestions(false);
      setShowColorsSuggestions(false);
      setShowMaterialsSuggestions(false);
      setSelectedSizes([]);
      setSelectedColors([]);
      setSelectedMaterials([]);
      setSizesInputValue('');
      setColorsInputValue('');
      setMaterialsInputValue('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isShowing]);

  // Handle sizes input change with autocomplete
  const handleSizesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSizesInputValue(value);

    if (value.trim().length > 0) {
      // Filter suggestions based on current input (limit to 5)
      const filtered = commonSizes
        .filter(size =>
          size.toLowerCase().includes(value.toLowerCase()) &&
          !selectedSizes.includes(size) // Don't suggest already added sizes
        )
        .slice(0, 5); // Limit to 5 suggestions
      setSizesSuggestions(filtered);
      setShowSizesSuggestions(filtered.length > 0);
    } else {
      setSizesSuggestions([]);
      setShowSizesSuggestions(false);
    }
  };

  // Handle size suggestion selection
  const handleSizeSelect = (size: string) => {
    if (!selectedSizes.includes(size)) {
      const newSizes = [...selectedSizes, size];
      setSelectedSizes(newSizes);
      setSizesInputValue('');
      setShowSizesSuggestions(false);
      setSizesSuggestions([]);

      // Update form data with comma-separated string
      handleChange('sizes', newSizes.join(', '));
    }

    // Focus back on input
    if (sizesInputRef.current) {
      sizesInputRef.current.focus();
    }
  };

  // Handle removing a size tag
  const handleRemoveSize = (sizeToRemove: string) => {
    const newSizes = selectedSizes.filter(size => size !== sizeToRemove);
    setSelectedSizes(newSizes);

    // Update form data with comma-separated string
    handleChange('sizes', newSizes.join(', '));

    // Focus back on input
    if (sizesInputRef.current) {
      sizesInputRef.current.focus();
    }
  };

  // Handle Enter key to add size
  const handleSizesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && sizesInputValue.trim()) {
      e.preventDefault();
      const sizeToAdd = sizesInputValue.trim();
      if (!selectedSizes.includes(sizeToAdd) && commonSizes.some(s => s.toLowerCase() === sizeToAdd.toLowerCase())) {
        handleSizeSelect(commonSizes.find(s => s.toLowerCase() === sizeToAdd.toLowerCase()) || sizeToAdd);
      }
    } else if (e.key === 'Backspace' && sizesInputValue === '' && selectedSizes.length > 0) {
      // Remove last size if backspace is pressed on empty input
      handleRemoveSize(selectedSizes[selectedSizes.length - 1]);
    }
  };

  // Handle colors input change with autocomplete
  const handleColorsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setColorsInputValue(value);

    if (value.trim().length > 0) {
      // Filter suggestions based on current input (limit to 5)
      const filtered = commonColors
        .filter(color =>
          color.toLowerCase().includes(value.toLowerCase()) &&
          !selectedColors.includes(color) // Don't suggest already added colors
        )
        .slice(0, 5); // Limit to 5 suggestions
      setColorsSuggestions(filtered);
      setShowColorsSuggestions(filtered.length > 0);
    } else {
      setColorsSuggestions([]);
      setShowColorsSuggestions(false);
    }
  };

  // Handle color suggestion selection
  const handleColorSelect = (color: string) => {
    if (!selectedColors.includes(color)) {
      const newColors = [...selectedColors, color];
      setSelectedColors(newColors);
      setColorsInputValue('');
      setShowColorsSuggestions(false);
      setColorsSuggestions([]);

      // Update form data with comma-separated string
      handleChange('colors', newColors.join(', '));
    }

    // Focus back on input
    if (colorsInputRef.current) {
      colorsInputRef.current.focus();
    }
  };

  // Handle removing a color tag
  const handleRemoveColor = (colorToRemove: string) => {
    const newColors = selectedColors.filter(color => color !== colorToRemove);
    setSelectedColors(newColors);

    // Update form data with comma-separated string
    handleChange('colors', newColors.join(', '));

    // Focus back on input
    if (colorsInputRef.current) {
      colorsInputRef.current.focus();
    }
  };

  // Handle Enter key to add color
  const handleColorsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && colorsInputValue.trim()) {
      e.preventDefault();
      const colorToAdd = colorsInputValue.trim();
      if (!selectedColors.includes(colorToAdd) && commonColors.some(c => c.toLowerCase() === colorToAdd.toLowerCase())) {
        handleColorSelect(commonColors.find(c => c.toLowerCase() === colorToAdd.toLowerCase()) || colorToAdd);
      }
    } else if (e.key === 'Backspace' && colorsInputValue === '' && selectedColors.length > 0) {
      // Remove last color if backspace is pressed on empty input
      handleRemoveColor(selectedColors[selectedColors.length - 1]);
    }
  };

  // Handle materials input change with autocomplete
  const handleMaterialsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaterialsInputValue(value);

    if (value.trim().length > 0) {
      // Filter suggestions based on current input (limit to 5)
      const filtered = commonMaterials
        .filter(material =>
          material.toLowerCase().includes(value.toLowerCase()) &&
          !selectedMaterials.includes(material) // Don't suggest already added materials
        )
        .slice(0, 5); // Limit to 5 suggestions
      setMaterialsSuggestions(filtered);
      setShowMaterialsSuggestions(filtered.length > 0);
    } else {
      setMaterialsSuggestions([]);
      setShowMaterialsSuggestions(false);
    }
  };

  // Handle material suggestion selection
  const handleMaterialSelect = (material: string) => {
    if (!selectedMaterials.includes(material)) {
      const newMaterials = [...selectedMaterials, material];
      setSelectedMaterials(newMaterials);
      setMaterialsInputValue('');
      setShowMaterialsSuggestions(false);
      setMaterialsSuggestions([]);

      // Update form data with comma-separated string
      handleChange('materials', newMaterials.join(', '));
    }

    // Focus back on input
    if (materialsInputRef.current) {
      materialsInputRef.current.focus();
    }
  };

  // Handle removing a material tag
  const handleRemoveMaterial = (materialToRemove: string) => {
    const newMaterials = selectedMaterials.filter(material => material !== materialToRemove);
    setSelectedMaterials(newMaterials);

    // Update form data with comma-separated string
    handleChange('materials', newMaterials.join(', '));

    // Focus back on input
    if (materialsInputRef.current) {
      materialsInputRef.current.focus();
    }
  };

  // Handle Enter key to add material
  const handleMaterialsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && materialsInputValue.trim()) {
      e.preventDefault();
      const materialToAdd = materialsInputValue.trim();
      if (!selectedMaterials.includes(materialToAdd) && commonMaterials.some(m => m.toLowerCase() === materialToAdd.toLowerCase())) {
        handleMaterialSelect(commonMaterials.find(m => m.toLowerCase() === materialToAdd.toLowerCase()) || materialToAdd);
      }
    } else if (e.key === 'Backspace' && materialsInputValue === '' && selectedMaterials.length > 0) {
      // Remove last material if backspace is pressed on empty input
      handleRemoveMaterial(selectedMaterials[selectedMaterials.length - 1]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sizesDropdownRef.current &&
        !sizesDropdownRef.current.contains(event.target as Node) &&
        sizesInputRef.current &&
        !sizesInputRef.current.contains(event.target as Node) &&
        sizesContainerRef.current &&
        !sizesContainerRef.current.contains(event.target as Node)
      ) {
        setShowSizesSuggestions(false);
      }
      if (
        colorsDropdownRef.current &&
        !colorsDropdownRef.current.contains(event.target as Node) &&
        colorsInputRef.current &&
        !colorsInputRef.current.contains(event.target as Node) &&
        colorsContainerRef.current &&
        !colorsContainerRef.current.contains(event.target as Node)
      ) {
        setShowColorsSuggestions(false);
      }
      if (
        materialsDropdownRef.current &&
        !materialsDropdownRef.current.contains(event.target as Node) &&
        materialsInputRef.current &&
        !materialsInputRef.current.contains(event.target as Node) &&
        materialsContainerRef.current &&
        !materialsContainerRef.current.contains(event.target as Node)
      ) {
        setShowMaterialsSuggestions(false);
      }
    };

    if (showSizesSuggestions || showColorsSuggestions || showMaterialsSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSizesSuggestions, showColorsSuggestions, showMaterialsSuggestions]);

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
    const nameError = validators.required(formData.name, 'Product Name');
    if (nameError) newErrors.name = nameError;
    else {
      const nameLengthError = validators.minLength(formData.name, 2, 'Product Name');
      if (nameLengthError) newErrors.name = nameLengthError;
    }

    const skuError = validators.sku(formData.sku);
    if (skuError) newErrors.sku = skuError;

    const sizesError = validators.commaSeparatedList(formData.sizes, 'Sizes', 1);
    if (sizesError) newErrors.sizes = sizesError;

    const colorsError = validators.commaSeparatedList(formData.colors, 'Colors', 1);
    if (colorsError) newErrors.colors = colorsError;

    const materialsError = validators.commaSeparatedList(formData.materials, 'Materials', 1);
    if (materialsError) newErrors.materials = materialsError;

    const collectionError = validators.required(formData.collectionId, 'Collection');
    if (collectionError) newErrors.collectionId = collectionError;

    if (formData.ean) {
      const eanError = validators.ean(formData.ean);
      if (eanError) newErrors.ean = eanError;
    }

    if (formData.basePrice) {
      const priceError = validators.nonNegative(formData.basePrice, 'Base Price');
      if (priceError) newErrors.basePrice = priceError;
    }

    if (formData.style) {
      const styleLengthError = validators.maxLength(formData.style, 100, 'Style');
      if (styleLengthError) newErrors.style = styleLengthError;
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

    // Convert comma-separated strings to arrays
    const productData = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      style: formData.style.trim() || undefined,
      sizes: formData.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      colors: formData.colors.split(',').map((c) => c.trim()).filter(Boolean),
      materials: formData.materials.split(',').map((m) => m.trim()).filter(Boolean),
      ean: formData.ean.trim() || undefined,
      description: formData.description.trim() || undefined,
      basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
      collectionId: parseInt(formData.collectionId),
      images: selectedImages, // Include images for upload
    };

    onSubmit(productData);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please select valid image files');
      return;
    }

    // Limit to 10 images
    const newImages = [...selectedImages, ...imageFiles].slice(0, 10);
    setSelectedImages(newImages);

    // Create previews
    const newPreviews: string[] = [];
    newImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        if (newPreviews.filter(Boolean).length === newImages.length) {
          setImagePreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        aria-labelledby="addProductModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full flex flex-col" style={{ overflow: 'visible' }}>
            {/* Modal Header */}
            <div className="modal-header">
              <h5 id="addProductModalLabel" className="modal-title text-[16px] font-semibold text-gray-900 dark:text-white">
                Add New Product
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

            {/* Modal Body */}
            <form id="addProductForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', position: 'relative' }}>
                <div className="space-y-4">
                  {/* Name and SKU */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none text-[14px] ::placeholder-[12px] focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter product name"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        SKU <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => handleChange('sku', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.sku ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter SKU"
                      />
                      {errors.sku && <p className="mt-1 text-sm text-red-500">{errors.sku}</p>}
                    </div>
                  </div>

                  {/* Collection and Style */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Collection <span className="text-red-500">*</span>
                      </label>
                      <CustomSelect
                        value={formData.collectionId}
                        onChange={(value) => handleChange('collectionId', value)}
                        options={collections.map((collection: any) => ({
                          value: collection.id.toString(),
                          label: collection.name,
                        }))}
                        placeholder="Select collection"
                        error={!!errors.collectionId}
                      />
                      {errors.collectionId && <p className="mt-1 text-sm text-red-500">{errors.collectionId}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style</label>
                      <input
                        type="text"
                        value={formData.style}
                        onChange={(e) => handleChange('style', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter style"
                      />
                    </div>
                  </div>

                  {/* Sizes, Colors, Materials */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative" ref={sizesContainerRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sizes <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`min-h-[42px] w-full px-2 py-1 border rounded-lg focus-within:ring-2 focus-within:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 flex flex-wrap items-center gap-2 ${errors.sizes ? 'border-red-500' : 'border-gray-300'
                          }`}
                        onClick={() => sizesInputRef.current?.focus()}
                      >
                        {/* Size Tags */}
                        {selectedSizes.map((size, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-md text-sm font-medium"
                          >
                            {size}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSize(size);
                              }}
                              className="ml-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-full p-0.5 transition-colors"
                              aria-label={`Remove ${size}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        {/* Input Field */}
                        <input
                          ref={sizesInputRef}
                          type="text"
                          value={sizesInputValue}
                          onChange={handleSizesInputChange}
                          onKeyDown={handleSizesKeyDown}
                          onFocus={() => {
                            if (sizesInputValue.trim().length > 0) {
                              const filtered = commonSizes
                                .filter(size =>
                                  size.toLowerCase().includes(sizesInputValue.toLowerCase()) &&
                                  !selectedSizes.includes(size)
                                )
                                .slice(0, 5);
                              setSizesSuggestions(filtered);
                              setShowSizesSuggestions(filtered.length > 0);
                            }
                          }}
                          className="flex-1 min-w-[120px] ::placeholder-[12px] text-[14px]  px-2 py-1 border-0 bg-transparent focus:outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          placeholder={selectedSizes.length === 0 ? "Type to search sizes..." : ""}
                        />
                      </div>
                      {errors.sizes && <p className="mt-1 text-sm text-red-500">{errors.sizes}</p>}

                      {/* Autocomplete Dropdown */}
                      {showSizesSuggestions && sizesSuggestions.length > 0 && (
                        <div
                          ref={sizesDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {sizesSuggestions.map((size, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSizeSelect(size)}
                              className="w-full text-left px-4 py-2 text-[14px] hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                              onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={colorsContainerRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Colors <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`min-h-[42px] w-full px-2 py-1 border rounded-lg focus-within:ring-2 focus-within:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 flex flex-wrap items-center gap-2 ${errors.colors ? 'border-red-500' : 'border-gray-300'
                          }`}
                        onClick={() => colorsInputRef.current?.focus()}
                      >
                        {/* Color Tags */}
                        {selectedColors.map((color, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-md text-sm font-medium"
                          >
                            {color}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveColor(color);
                              }}
                              className="ml-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-full p-0.5 transition-colors"
                              aria-label={`Remove ${color}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        {/* Input Field */}
                        <input
                          ref={colorsInputRef}
                          type="text"
                          value={colorsInputValue}
                          onChange={handleColorsInputChange}
                          onKeyDown={handleColorsKeyDown}
                          onFocus={() => {
                            if (colorsInputValue.trim().length > 0) {
                              const filtered = commonColors
                                .filter(color =>
                                  color.toLowerCase().includes(colorsInputValue.toLowerCase()) &&
                                  !selectedColors.includes(color)
                                )
                                .slice(0, 5);
                              setColorsSuggestions(filtered);
                              setShowColorsSuggestions(filtered.length > 0);
                            }
                          }}
                          className="flex-1 min-w-[120px] px-2 py-1 border-0 bg-transparent ::placeholder-[12px] text-[14px] focus:outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          placeholder={selectedColors.length === 0 ? "Type to search colors..." : ""}
                        />
                      </div>
                      {errors.colors && <p className="mt-1 text-sm text-red-500">{errors.colors}</p>}

                      {/* Autocomplete Dropdown */}
                      {showColorsSuggestions && colorsSuggestions.length > 0 && (
                        <div
                          ref={colorsDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {colorsSuggestions.map((color, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleColorSelect(color)}
                              className="w-full text-left px-4 text-[14px] py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                              onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={materialsContainerRef}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Materials <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`min-h-[42px] w-full px-2 py-1 border rounded-lg focus-within:ring-2 focus-within:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 flex flex-wrap items-center gap-2 ${errors.materials ? 'border-red-500' : 'border-gray-300'
                          }`}
                        onClick={() => materialsInputRef.current?.focus()}
                      >
                        {/* Material Tags */}
                        {selectedMaterials.map((material, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-md text-sm font-medium"
                          >
                            {material}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMaterial(material);
                              }}
                              className="ml-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-full p-0.5 transition-colors"
                              aria-label={`Remove ${material}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}

                        {/* Input Field */}
                        <input
                          ref={materialsInputRef}
                          type="text"
                          value={materialsInputValue}
                          onChange={handleMaterialsInputChange}
                          onKeyDown={handleMaterialsKeyDown}
                          onFocus={() => {
                            if (materialsInputValue.trim().length > 0) {
                              const filtered = commonMaterials
                                .filter(material =>
                                  material.toLowerCase().includes(materialsInputValue.toLowerCase()) &&
                                  !selectedMaterials.includes(material)
                                )
                                .slice(0, 5);
                              setMaterialsSuggestions(filtered);
                              setShowMaterialsSuggestions(filtered.length > 0);
                            }
                          }}
                          className="flex-1 min-w-[120px] px-2 py-1 border-0 bg-transparent ::placeholder-[12px] text-[14px] focus:outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                          placeholder={selectedMaterials.length === 0 ? "Type to search materials..." : ""}
                        />
                      </div>
                      {errors.materials && <p className="mt-1 text-sm text-red-500">{errors.materials}</p>}

                      {/* Autocomplete Dropdown */}
                      {showMaterialsSuggestions && materialsSuggestions.length > 0 && (
                        <div
                          ref={materialsDropdownRef}
                          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {materialsSuggestions.map((material, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleMaterialSelect(material)}
                              className="w-full text-left text-[14px] px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                              onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                            >
                              {material}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EAN and Base Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">EAN</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newEAN = generateEAN13('200');
                            handleChange('ean', newEAN);
                            // Clear any existing EAN error
                            if (errors.ean) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.ean;
                                return newErrors;
                              });
                            }
                          }}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          Auto-generate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.ean}
                        onChange={(e) => {
                          // Only allow digits and limit to 13 characters
                          const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                          handleChange('ean', value);
                          // Real-time validation
                          if (value.length === 13) {
                            const eanError = validators.ean(value);
                            if (eanError) {
                              setErrors(prev => ({ ...prev, ean: eanError }));
                            } else {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.ean;
                                return newErrors;
                              });
                            }
                          } else if (value.length > 0) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.ean;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${errors.ean ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        placeholder="Enter EAN (13 digits)"
                        maxLength={13}
                      />
                      {errors.ean && <p className="mt-1 text-sm text-red-500">{errors.ean}</p>}
                      {formData.ean && formData.ean.length === 13 && !errors.ean && (
                        <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Valid EAN</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.basePrice}
                        onChange={(e) => handleChange('basePrice', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter product description"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product Images
                    </label>
                    <div className="space-y-3">
                      {/* File Input */}
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                          id="product-images-input"
                        />
                        <label
                          htmlFor="product-images-input"
                          className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors bg-gray-50 dark:bg-gray-800/50"
                        >
                          <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Click to upload images or drag and drop
                          </span>
                        </label>
                      </div>

                      {/* Image Previews */}
                      {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/50 text-white text-xs rounded truncate max-w-[calc(100%-0.5rem)]">
                                {selectedImages[index]?.name || `Image ${index + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedImages.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                          {selectedImages.length >= 10 && ' (maximum 10 images)'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border text-[14px] border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  onClick={(e) => {
                    handleButtonClick(e);
                    // Form submission is handled by form's onSubmit
                  }}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-[14px] bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Adding...' : 'Add Product'}
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

// Edit Product Modal Component
function EditProductModal({
  product,
  collections,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  product: any;
  collections: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    name: product.name || '',
    sku: product.sku || '',
    style: product.style || '',
    sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes || '',
    colors: Array.isArray(product.colors) ? product.colors.join(', ') : product.colors || '',
    materials: Array.isArray(product.materials) ? product.materials.join(', ') : product.materials || '',
    ean: product.ean || '',
    description: product.description || '',
    basePrice: product.basePrice?.toString() || '',
    collectionId: product.collectionId?.toString() || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete for sizes
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizesInputValue, setSizesInputValue] = useState('');
  const [sizesSuggestions, setSizesSuggestions] = useState<string[]>([]);
  const [showSizesSuggestions, setShowSizesSuggestions] = useState(false);
  const sizesInputRef = useRef<HTMLInputElement>(null);
  const sizesDropdownRef = useRef<HTMLDivElement>(null);
  const sizesContainerRef = useRef<HTMLDivElement>(null);

  // Common sizes list
  const commonSizes = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
    '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50',
    '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24',
    'One Size', 'OS', 'Free Size',
  ];

  // Autocomplete for colors
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [colorsInputValue, setColorsInputValue] = useState('');
  const [colorsSuggestions, setColorsSuggestions] = useState<string[]>([]);
  const [showColorsSuggestions, setShowColorsSuggestions] = useState(false);
  const colorsInputRef = useRef<HTMLInputElement>(null);
  const colorsDropdownRef = useRef<HTMLDivElement>(null);
  const colorsContainerRef = useRef<HTMLDivElement>(null);

  // Common colors list
  const commonColors = [
    'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Black', 'White',
    'Gray', 'Grey', 'Navy', 'Beige', 'Tan', 'Khaki', 'Olive', 'Maroon', 'Burgundy', 'Crimson',
    'Coral', 'Salmon', 'Peach', 'Lavender', 'Violet', 'Indigo', 'Turquoise', 'Teal', 'Cyan',
    'Magenta', 'Lime', 'Mint', 'Emerald', 'Forest', 'Sage', 'Ivory', 'Cream', 'Gold', 'Silver',
    'Bronze', 'Copper', 'Rose', 'Fuchsia', 'Aqua', 'Sky', 'Royal', 'Midnight', 'Charcoal',
    'Slate', 'Taupe', 'Camel', 'Cognac', 'Burgundy', 'Wine', 'Plum', 'Mauve', 'Lilac',
  ];

  // Autocomplete for materials
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [materialsInputValue, setMaterialsInputValue] = useState('');
  const [materialsSuggestions, setMaterialsSuggestions] = useState<string[]>([]);
  const [showMaterialsSuggestions, setShowMaterialsSuggestions] = useState(false);
  const materialsInputRef = useRef<HTMLInputElement>(null);
  const materialsDropdownRef = useRef<HTMLDivElement>(null);
  const materialsContainerRef = useRef<HTMLDivElement>(null);

  // Common materials list
  const commonMaterials = [
    'Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather', 'Suede', 'Cashmere',
    'Rayon', 'Nylon', 'Spandex', 'Elastane', 'Bamboo', 'Hemp', 'Modal', 'Tencel', 'Lyocell',
    'Acrylic', 'Viscose', 'Chiffon', 'Satin', 'Velvet', 'Corduroy', 'Flannel', 'Jersey',
    'Mesh', 'Organza', 'Tulle', 'Twill', 'Canvas', 'Fleece', 'Terry', 'Towel', 'Microfiber',
    'Faux Leather', 'Faux Fur', 'Synthetic', 'Blend', 'Organic Cotton', 'Recycled Polyester',
  ];

  // Fetch existing product images from product data
  useEffect(() => {
    if (product && product.images && Array.isArray(product.images)) {
      setExistingImages(product.images);
    } else {
      setExistingImages([]);
    }
  }, [product]);

  // Initialize selected arrays from formData
  useEffect(() => {
    if (formData.sizes) {
      const sizesArray = formData.sizes.split(',').map((s: string) => s.trim()).filter(Boolean);
      setSelectedSizes(sizesArray);
    } else {
      setSelectedSizes([]);
    }
  }, [formData.sizes]);

  useEffect(() => {
    if (formData.colors) {
      const colorsArray = formData.colors.split(',').map((c: string) => c.trim()).filter(Boolean);
      setSelectedColors(colorsArray);
    } else {
      setSelectedColors([]);
    }
  }, [formData.colors]);

  useEffect(() => {
    if (formData.materials) {
      const materialsArray = formData.materials.split(',').map((m: string) => m.trim()).filter(Boolean);
      setSelectedMaterials(materialsArray);
    } else {
      setSelectedMaterials([]);
    }
  }, [formData.materials]);

  // Reset images when modal closes
  useEffect(() => {
    if (!isShowing) {
      setSelectedImages([]);
      setImagePreviews([]);
      setImagesToDelete([]);
      setShowSizesSuggestions(false);
      setShowColorsSuggestions(false);
      setShowMaterialsSuggestions(false);
      setSelectedSizes([]);
      setSelectedColors([]);
      setSelectedMaterials([]);
      setSizesInputValue('');
      setColorsInputValue('');
      setMaterialsInputValue('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isShowing]);

  // Handle sizes input change with autocomplete
  const handleSizesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSizesInputValue(value);

    if (value.trim().length > 0) {
      // Filter suggestions based on current input (limit to 5)
      const filtered = commonSizes
        .filter(size =>
          size.toLowerCase().includes(value.toLowerCase()) &&
          !selectedSizes.includes(size) // Don't suggest already added sizes
        )
        .slice(0, 5); // Limit to 5 suggestions
      setSizesSuggestions(filtered);
      setShowSizesSuggestions(filtered.length > 0);
    } else {
      setSizesSuggestions([]);
      setShowSizesSuggestions(false);
    }
  };

  // Handle size suggestion selection
  const handleSizeSelect = (size: string) => {
    if (!selectedSizes.includes(size)) {
      const newSizes = [...selectedSizes, size];
      setSelectedSizes(newSizes);
      setSizesInputValue('');
      setShowSizesSuggestions(false);
      setSizesSuggestions([]);

      // Update form data with comma-separated string
      handleChange('sizes', newSizes.join(', '));
    }

    // Focus back on input
    if (sizesInputRef.current) {
      sizesInputRef.current.focus();
    }
  };

  // Handle removing a size tag
  const handleRemoveSize = (sizeToRemove: string) => {
    const newSizes = selectedSizes.filter(size => size !== sizeToRemove);
    setSelectedSizes(newSizes);

    // Update form data with comma-separated string
    handleChange('sizes', newSizes.join(', '));

    // Focus back on input
    if (sizesInputRef.current) {
      sizesInputRef.current.focus();
    }
  };

  // Handle Enter key to add size
  const handleSizesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && sizesInputValue.trim()) {
      e.preventDefault();
      const sizeToAdd = sizesInputValue.trim();
      if (!selectedSizes.includes(sizeToAdd) && commonSizes.some(s => s.toLowerCase() === sizeToAdd.toLowerCase())) {
        handleSizeSelect(commonSizes.find(s => s.toLowerCase() === sizeToAdd.toLowerCase()) || sizeToAdd);
      }
    } else if (e.key === 'Backspace' && sizesInputValue === '' && selectedSizes.length > 0) {
      // Remove last size if backspace is pressed on empty input
      handleRemoveSize(selectedSizes[selectedSizes.length - 1]);
    }
  };

  // Handle colors input change with autocomplete
  const handleColorsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setColorsInputValue(value);

    if (value.trim().length > 0) {
      // Filter suggestions based on current input (limit to 5)
      const filtered = commonColors
        .filter(color =>
          color.toLowerCase().includes(value.toLowerCase()) &&
          !selectedColors.includes(color) // Don't suggest already added colors
        )
        .slice(0, 5); // Limit to 5 suggestions
      setColorsSuggestions(filtered);
      setShowColorsSuggestions(filtered.length > 0);
    } else {
      setColorsSuggestions([]);
      setShowColorsSuggestions(false);
    }
  };

  // Handle color suggestion selection
  const handleColorSelect = (color: string) => {
    if (!selectedColors.includes(color)) {
      const newColors = [...selectedColors, color];
      setSelectedColors(newColors);
      setColorsInputValue('');
      setShowColorsSuggestions(false);
      setColorsSuggestions([]);

      // Update form data with comma-separated string
      handleChange('colors', newColors.join(', '));
    }

    // Focus back on input
    if (colorsInputRef.current) {
      colorsInputRef.current.focus();
    }
  };

  // Handle removing a color tag
  const handleRemoveColor = (colorToRemove: string) => {
    const newColors = selectedColors.filter(color => color !== colorToRemove);
    setSelectedColors(newColors);

    // Update form data with comma-separated string
    handleChange('colors', newColors.join(', '));

    // Focus back on input
    if (colorsInputRef.current) {
      colorsInputRef.current.focus();
    }
  };

  // Handle Enter key to add color
  const handleColorsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && colorsInputValue.trim()) {
      e.preventDefault();
      const colorToAdd = colorsInputValue.trim();
      if (!selectedColors.includes(colorToAdd) && commonColors.some(c => c.toLowerCase() === colorToAdd.toLowerCase())) {
        handleColorSelect(commonColors.find(c => c.toLowerCase() === colorToAdd.toLowerCase()) || colorToAdd);
      }
    } else if (e.key === 'Backspace' && colorsInputValue === '' && selectedColors.length > 0) {
      // Remove last color if backspace is pressed on empty input
      handleRemoveColor(selectedColors[selectedColors.length - 1]);
    }
  };

  // Handle materials input change with autocomplete
  const handleMaterialsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaterialsInputValue(value);

    if (value.trim().length > 0) {
      // Filter suggestions based on current input (limit to 5)
      const filtered = commonMaterials
        .filter(material =>
          material.toLowerCase().includes(value.toLowerCase()) &&
          !selectedMaterials.includes(material) // Don't suggest already added materials
        )
        .slice(0, 5); // Limit to 5 suggestions
      setMaterialsSuggestions(filtered);
      setShowMaterialsSuggestions(filtered.length > 0);
    } else {
      setMaterialsSuggestions([]);
      setShowMaterialsSuggestions(false);
    }
  };

  // Handle material suggestion selection
  const handleMaterialSelect = (material: string) => {
    if (!selectedMaterials.includes(material)) {
      const newMaterials = [...selectedMaterials, material];
      setSelectedMaterials(newMaterials);
      setMaterialsInputValue('');
      setShowMaterialsSuggestions(false);
      setMaterialsSuggestions([]);

      // Update form data with comma-separated string
      handleChange('materials', newMaterials.join(', '));
    }

    // Focus back on input
    if (materialsInputRef.current) {
      materialsInputRef.current.focus();
    }
  };

  // Handle removing a material tag
  const handleRemoveMaterial = (materialToRemove: string) => {
    const newMaterials = selectedMaterials.filter(material => material !== materialToRemove);
    setSelectedMaterials(newMaterials);

    // Update form data with comma-separated string
    handleChange('materials', newMaterials.join(', '));

    // Focus back on input
    if (materialsInputRef.current) {
      materialsInputRef.current.focus();
    }
  };

  // Handle Enter key to add material
  const handleMaterialsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && materialsInputValue.trim()) {
      e.preventDefault();
      const materialToAdd = materialsInputValue.trim();
      if (!selectedMaterials.includes(materialToAdd) && commonMaterials.some(m => m.toLowerCase() === materialToAdd.toLowerCase())) {
        handleMaterialSelect(commonMaterials.find(m => m.toLowerCase() === materialToAdd.toLowerCase()) || materialToAdd);
      }
    } else if (e.key === 'Backspace' && materialsInputValue === '' && selectedMaterials.length > 0) {
      // Remove last material if backspace is pressed on empty input
      handleRemoveMaterial(selectedMaterials[selectedMaterials.length - 1]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sizesDropdownRef.current &&
        !sizesDropdownRef.current.contains(event.target as Node) &&
        sizesInputRef.current &&
        !sizesInputRef.current.contains(event.target as Node) &&
        sizesContainerRef.current &&
        !sizesContainerRef.current.contains(event.target as Node)
      ) {
        setShowSizesSuggestions(false);
      }
      if (
        colorsDropdownRef.current &&
        !colorsDropdownRef.current.contains(event.target as Node) &&
        colorsInputRef.current &&
        !colorsInputRef.current.contains(event.target as Node) &&
        colorsContainerRef.current &&
        !colorsContainerRef.current.contains(event.target as Node)
      ) {
        setShowColorsSuggestions(false);
      }
      if (
        materialsDropdownRef.current &&
        !materialsDropdownRef.current.contains(event.target as Node) &&
        materialsInputRef.current &&
        !materialsInputRef.current.contains(event.target as Node) &&
        materialsContainerRef.current &&
        !materialsContainerRef.current.contains(event.target as Node)
      ) {
        setShowMaterialsSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please select valid image files');
      return;
    }

    // Limit to 10 images total (existing + new)
    const totalImages = existingImages.length - imagesToDelete.length + selectedImages.length + imageFiles.length;
    if (totalImages > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    const newImages = [...selectedImages, ...imageFiles];
    setSelectedImages(newImages);

    // Create previews
    const newPreviews: string[] = [];
    newImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        if (newPreviews.filter(Boolean).length === newImages.length) {
          setImagePreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setImagesToDelete((prev) => [...prev, index]);
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validation
    const nameError = validators.required(formData.name, 'Name');
    if (nameError) newErrors.name = nameError;
    else {
      const nameLengthError = validators.minLength(formData.name, 2, 'Name');
      if (nameLengthError) newErrors.name = nameLengthError;
    }

    const skuError = validators.sku(formData.sku);
    if (skuError) newErrors.sku = skuError;

    const sizesError = validators.commaSeparatedList(formData.sizes, 'Sizes', 1);
    if (sizesError) newErrors.sizes = sizesError;

    const colorsError = validators.commaSeparatedList(formData.colors, 'Colors', 1);
    if (colorsError) newErrors.colors = colorsError;

    const materialsError = validators.commaSeparatedList(formData.materials, 'Materials', 1);
    if (materialsError) newErrors.materials = materialsError;

    const collectionError = validators.required(formData.collectionId, 'Collection');
    if (collectionError) newErrors.collectionId = collectionError;

    if (formData.ean) {
      const eanError = validators.ean(formData.ean);
      if (eanError) newErrors.ean = eanError;
    }

    if (formData.basePrice) {
      const priceError = validators.nonNegative(formData.basePrice, 'Base Price');
      if (priceError) newErrors.basePrice = priceError;
    }

    if (formData.style) {
      const styleLengthError = validators.maxLength(formData.style, 100, 'Style');
      if (styleLengthError) newErrors.style = styleLengthError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Show toast with first error message
      const firstErrorKey = Object.keys(newErrors)[0];
      const firstErrorMessage = newErrors[firstErrorKey];
      toast.error(`Validation Error: ${firstErrorMessage}`);
      return;
    }

    // Convert comma-separated strings to arrays
    const productData = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      style: formData.style.trim() || undefined,
      sizes: formData.sizes.split(',').map((s: string) => s.trim()).filter(Boolean),
      colors: formData.colors.split(',').map((c: string) => c.trim()).filter(Boolean),
      materials: formData.materials.split(',').map((m: string) => m.trim()).filter(Boolean),
      ean: formData.ean.trim() || undefined,
      description: formData.description.trim() || undefined,
      basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
      collectionId: parseInt(formData.collectionId),
      images: selectedImages, // New images to upload
      imagesToDelete: imagesToDelete, // Images to delete
    };

    onSubmit(productData);
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
        aria-labelledby="editProductModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full max-h-[90vh] flex flex-col" style={{ overflow: 'visible' }}>
            {/* Modal Header */}
            <div className="modal-header">
              <h5 id="editProductModalLabel" className="modal-title font-semibold text-gray-900 dark:text-white">
                Edit Product
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

            {/* Modal Body */}
            <form id="editProductForm" onSubmit={handleSubmit} className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', position: 'relative' }}>
              <div className="space-y-4">
                {/* Name and SKU */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none text-[14px] ::placeholder-[12px] focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter product name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.sku ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter SKU"
                    />
                    {errors.sku && <p className="mt-1 text-sm text-red-500">{errors.sku}</p>}
                  </div>
                </div>

                {/* Collection and Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Collection <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={formData.collectionId}
                      onChange={(value) => handleChange('collectionId', value)}
                      options={collections.map((collection: any) => ({
                        value: collection.id.toString(),
                        label: collection.name,
                      }))}
                      placeholder="Select collection"
                      error={!!errors.collectionId}
                    />
                    {errors.collectionId && <p className="mt-1 text-sm text-red-500">{errors.collectionId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style</label>
                    <input
                      type="text"
                      value={formData.style}
                      onChange={(e) => handleChange('style', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter style"
                    />
                  </div>
                </div>

                {/* Sizes, Colors, Materials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative" ref={sizesContainerRef}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sizes <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`min-h-[42px] w-full px-2 py-1 border rounded-lg focus-within:ring-2 focus-within:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 flex flex-wrap items-center gap-2 ${errors.sizes ? 'border-red-500' : 'border-gray-300'
                        }`}
                      onClick={() => sizesInputRef.current?.focus()}
                    >
                      {/* Size Tags */}
                      {selectedSizes.map((size, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-md text-sm font-medium"
                        >
                          {size}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSize(size);
                            }}
                            className="ml-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${size}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Input Field */}
                      <input
                        ref={sizesInputRef}
                        type="text"
                        value={sizesInputValue}
                        onChange={handleSizesInputChange}
                        onKeyDown={handleSizesKeyDown}
                        onFocus={() => {
                          if (sizesInputValue.trim().length > 0) {
                            const filtered = commonSizes
                              .filter(size =>
                                size.toLowerCase().includes(sizesInputValue.toLowerCase()) &&
                                !selectedSizes.includes(size)
                              )
                              .slice(0, 5);
                            setSizesSuggestions(filtered);
                            setShowSizesSuggestions(filtered.length > 0);
                          }
                        }}
                        className="flex-1 min-w-[120px] px-2 py-1 ::placeholder-[12px] text-[14px] border-0 bg-transparent focus:outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder={selectedSizes.length === 0 ? "Type to search sizes..." : ""}
                      />
                    </div>
                    {errors.sizes && <p className="mt-1 text-sm text-red-500">{errors.sizes}</p>}

                    {/* Autocomplete Dropdown */}
                    {showSizesSuggestions && sizesSuggestions.length > 0 && (
                      <div
                        ref={sizesDropdownRef}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {sizesSuggestions.map((size, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSizeSelect(size)}
                            className="w-full text-left text-[14px] px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={colorsContainerRef}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Colors <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`min-h-[42px] w-full px-2 py-1 border rounded-lg focus-within:ring-2 focus-within:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 flex flex-wrap items-center gap-2 ${errors.colors ? 'border-red-500' : 'border-gray-300'
                        }`}
                      onClick={() => colorsInputRef.current?.focus()}
                    >
                      {/* Color Tags */}
                      {selectedColors.map((color, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-md text-sm font-medium"
                        >
                          {color}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveColor(color);
                            }}
                            className="ml-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${color}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Input Field */}
                      <input
                        ref={colorsInputRef}
                        type="text"
                        value={colorsInputValue}
                        onChange={handleColorsInputChange}
                        onKeyDown={handleColorsKeyDown}
                        onFocus={() => {
                          if (colorsInputValue.trim().length > 0) {
                            const filtered = commonColors
                              .filter(color =>
                                color.toLowerCase().includes(colorsInputValue.toLowerCase()) &&
                                !selectedColors.includes(color)
                              )
                              .slice(0, 5);
                            setColorsSuggestions(filtered);
                            setShowColorsSuggestions(filtered.length > 0);
                          }
                        }}
                        className="flex-1 min-w-[120px] px-2 py-1 ::placeholder-[12px] text-[14px] border-0 bg-transparent focus:outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder={selectedColors.length === 0 ? "Type to search colors..." : ""}
                      />
                    </div>
                    {errors.colors && <p className="mt-1 text-sm text-red-500">{errors.colors}</p>}

                    {/* Autocomplete Dropdown */}
                    {showColorsSuggestions && colorsSuggestions.length > 0 && (
                      <div
                        ref={colorsDropdownRef}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {colorsSuggestions.map((color, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleColorSelect(color)}
                            className="w-full text-left text-[14px] px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative" ref={materialsContainerRef}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Materials <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`min-h-[42px] w-full px-2 py-1 border rounded-lg focus-within:ring-2 focus-within:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 flex flex-wrap items-center gap-2 ${errors.materials ? 'border-red-500' : 'border-gray-300'
                        }`}
                      onClick={() => materialsInputRef.current?.focus()}
                    >
                      {/* Material Tags */}
                      {selectedMaterials.map((material, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-md text-sm font-medium"
                        >
                          {material}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMaterial(material);
                            }}
                            className="ml-1 hover:bg-primary-200 dark:hover:bg-primary-900/50 rounded-full p-0.5 transition-colors"
                            aria-label={`Remove ${material}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Input Field */}
                      <input
                        ref={materialsInputRef}
                        type="text"
                        value={materialsInputValue}
                        onChange={handleMaterialsInputChange}
                        onKeyDown={handleMaterialsKeyDown}
                        onFocus={() => {
                          if (materialsInputValue.trim().length > 0) {
                            const filtered = commonMaterials
                              .filter(material =>
                                material.toLowerCase().includes(materialsInputValue.toLowerCase()) &&
                                !selectedMaterials.includes(material)
                              )
                              .slice(0, 5);
                            setMaterialsSuggestions(filtered);
                            setShowMaterialsSuggestions(filtered.length > 0);
                          }
                        }}
                        className="flex-1 min-w-[120px] px-2 py-1 border-0 bg-transparent ::placeholder-[12px] text-[14px] focus:outline-none dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder={selectedMaterials.length === 0 ? "Type to search materials..." : ""}
                      />
                    </div>
                    {errors.materials && <p className="mt-1 text-sm text-red-500">{errors.materials}</p>}

                    {/* Autocomplete Dropdown */}
                    {showMaterialsSuggestions && materialsSuggestions.length > 0 && (
                      <div
                        ref={materialsDropdownRef}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {materialsSuggestions.map((material, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleMaterialSelect(material)}
                            className="w-full text-left text-[14px] px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                          >
                            {material}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* EAN and Base Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">EAN</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newEAN = generateEAN13('200', product?.id);
                          handleChange('ean', newEAN);
                          // Clear any existing EAN error
                          if (errors.ean) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.ean;
                              return newErrors;
                            });
                          }
                        }}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Auto-generate
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.ean}
                      onChange={(e) => {
                        // Only allow digits and limit to 13 characters
                        const value = e.target.value.replace(/\D/g, '').slice(0, 13);
                        handleChange('ean', value);
                        // Real-time validation
                        if (value.length === 13) {
                          const eanError = validators.ean(value);
                          if (eanError) {
                            setErrors(prev => ({ ...prev, ean: eanError }));
                          } else {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.ean;
                              return newErrors;
                            });
                          }
                        } else if (value.length > 0) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.ean;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white ${errors.ean ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      placeholder="Enter EAN (13 digits)"
                      maxLength={13}
                    />
                    {errors.ean && <p className="mt-1 text-sm text-red-500">{errors.ean}</p>}
                    {formData.ean && formData.ean.length === 13 && !errors.ean && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Valid EAN</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => handleChange('basePrice', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ::placeholder-[12px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter product description"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Images
                  </label>
                  <div className="space-y-3">
                    {/* File Input */}
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                        id="edit-product-images-input"
                      />
                      <label
                        htmlFor="edit-product-images-input"
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors bg-gray-50 dark:bg-gray-800/50"
                      >
                        <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Click to upload images or drag and drop
                        </span>
                      </label>
                    </div>

                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Existing Images</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {existingImages.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={imageUrl}
                                  alt={`Product image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeExistingImage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/50 text-white text-xs rounded truncate max-w-[calc(100%-0.5rem)]">
                                Image {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Images</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeNewImage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/50 text-white text-xs rounded truncate max-w-[calc(100%-0.5rem)]">
                                {selectedImages[index]?.name || `Image ${index + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(existingImages.length > 0 || selectedImages.length > 0) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {existingImages.length + selectedImages.length} image{(existingImages.length + selectedImages.length) !== 1 ? 's' : ''} total
                        {(existingImages.length + selectedImages.length) >= 10 && ' (maximum 10 images)'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 text-[14px] py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  onClick={handleButtonClick}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-[14px] bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Updating...' : 'Update Product'}
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

// Delete Product Modal Component
function DeleteProductModal({
  product,
  onClose,
  onConfirm,
  isLoading,
  isShowing,
}: {
  product: any;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
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
        aria-labelledby="deleteProductModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '24rem' }}
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
              <h5 id="deleteProductModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
                Delete Product
              </h5>

              {/* Description */}
              <p className="text-[14px] text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-[14px] text-gray-900 dark:text-white font-semibold mb-4">
                "{product.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 w-full items-center flex">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border text-[14px] border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="px-5 text-[14px] py-2.5 ml-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isLoading ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Attributes & Taxonomy Section Component
function AttributesTaxonomySection() {
  const [attributes, setAttributes] = useState<Array<{
    id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
    values?: string[];
    required: boolean;
  }>>([]);
  const [taxonomy, setTaxonomy] = useState<Array<{
    id: string;
    category: string;
    subcategories: string[];
  }>>([]);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [isTaxonomyModalOpen, setIsTaxonomyModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<any>(null);
  const [editingTaxonomy, setEditingTaxonomy] = useState<any>(null);

  // Load attributes and taxonomy from localStorage (or API in future)
  useEffect(() => {
    const savedAttributes = localStorage.getItem('productAttributes');
    const savedTaxonomy = localStorage.getItem('productTaxonomy');
    if (savedAttributes) setAttributes(JSON.parse(savedAttributes));
    if (savedTaxonomy) setTaxonomy(JSON.parse(savedTaxonomy));
  }, []);

  const saveAttributes = (newAttributes: typeof attributes) => {
    setAttributes(newAttributes);
    localStorage.setItem('productAttributes', JSON.stringify(newAttributes));
  };

  const saveTaxonomy = (newTaxonomy: typeof taxonomy) => {
    setTaxonomy(newTaxonomy);
    localStorage.setItem('productTaxonomy', JSON.stringify(newTaxonomy));
  };

  return (
    <div className="space-y-6">
      {/* Attributes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product Attributes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define custom attributes for products (e.g., Material, Brand, Season)</p>
          </div>
          <ButtonWithWaves onClick={() => {
            setEditingAttribute(null);
            setIsAttributeModalOpen(true);
          }}>
            <Plus className="w-5 h-5" />
            Add Attribute
          </ButtonWithWaves>
        </div>

        {attributes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No attributes defined yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Values</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Required</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {attributes.map((attr) => (
                  <tr key={attr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{attr.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{attr.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {attr.values ? attr.values.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${attr.required ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {attr.required ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAttribute(attr);
                            setIsAttributeModalOpen(true);
                          }}
                          className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            saveAttributes(attributes.filter(a => a.id !== attr.id));
                            toast.success('Attribute deleted');
                          }}
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
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

      {/* Taxonomy Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product Taxonomy</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organize products into categories and subcategories</p>
          </div>
          <ButtonWithWaves onClick={() => {
            setEditingTaxonomy(null);
            setIsTaxonomyModalOpen(true);
          }}>
            <Plus className="w-5 h-5" />
            Add Category
          </ButtonWithWaves>
        </div>

        {taxonomy.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No taxonomy defined yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {taxonomy.map((tax) => (
              <div key={tax.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tax.category}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTaxonomy(tax);
                        setIsTaxonomyModalOpen(true);
                      }}
                      className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        saveTaxonomy(taxonomy.filter(t => t.id !== tax.id));
                        toast.success('Category deleted');
                      }}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {tax.subcategories.length > 0 && (
                  <div className="ml-4 mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Subcategories:</p>
                    <div className="flex flex-wrap gap-2">
                      {tax.subcategories.map((sub, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attribute Modal */}
      {isAttributeModalOpen && (
        <AttributeModal
          attribute={editingAttribute}
          onClose={() => {
            setIsAttributeModalOpen(false);
            setEditingAttribute(null);
          }}
          onSave={(attr) => {
            if (editingAttribute) {
              saveAttributes(attributes.map(a => a.id === editingAttribute.id ? attr : a));
              toast.success('Attribute updated');
            } else {
              saveAttributes([...attributes, attr]);
              toast.success('Attribute created');
            }
            setIsAttributeModalOpen(false);
            setEditingAttribute(null);
          }}
        />
      )}

      {/* Taxonomy Modal */}
      {isTaxonomyModalOpen && (
        <TaxonomyModal
          taxonomy={editingTaxonomy}
          onClose={() => {
            setIsTaxonomyModalOpen(false);
            setEditingTaxonomy(null);
          }}
          onSave={(tax) => {
            if (editingTaxonomy) {
              saveTaxonomy(taxonomy.map(t => t.id === editingTaxonomy.id ? tax : t));
              toast.success('Category updated');
            } else {
              saveTaxonomy([...taxonomy, tax]);
              toast.success('Category created');
            }
            setIsTaxonomyModalOpen(false);
            setEditingTaxonomy(null);
          }}
        />
      )}
    </div>
  );
}

// Attribute Modal Component
function AttributeModal({ attribute, onClose, onSave }: {
  attribute: any;
  onClose: () => void;
  onSave: (attr: any) => void;
}) {
  const [name, setName] = useState(attribute?.name || '');
  const [type, setType] = useState(attribute?.type || 'text');
  const [values, setValues] = useState(attribute?.values?.join('\n') || '');
  const [required, setRequired] = useState(attribute?.required || false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {attribute ? 'Edit Attribute' : 'Add Attribute'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border ::placeholder-[12px] text-[14px] border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter attribute name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <CustomSelect
              value={type}
              onChange={(value) => setType(value as any)}
              options={[
                { value: 'text', label: 'Text' },
                { value: 'number', label: 'Number' },
                { value: 'select', label: 'Select (Single)' },
                { value: 'multiselect', label: 'Multi-Select' },
                { value: 'boolean', label: 'Boolean (Yes/No)' },
              ]}
              placeholder="Select type..."
            />
          </div>
          {(type === 'select' || type === 'multiselect') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Values (one per line)</label>
              <textarea
                value={values}
                onChange={(e) => setValues(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Value 1&#10;Value 2&#10;Value 3"
              />
            </div>
          )}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 rounded border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="required" className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer">Required</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 text-[14px] py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name) {
                toast.error('Name is required');
                return;
              }
              onSave({
                id: attribute?.id || Date.now().toString(),
                name,
                type,
                values: (type === 'select' || type === 'multiselect') ? values.split('\n').filter((v: string) => v.trim()) : undefined,
                required,
              });
            }}
            className="px-4 py-2 bg-primary-600 text-[14px] text-white rounded-lg hover:bg-primary-700"
          >
            {attribute ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Taxonomy Modal Component
function TaxonomyModal({ taxonomy, onClose, onSave }: {
  taxonomy: any;
  onClose: () => void;
  onSave: (tax: any) => void;
}) {
  const [category, setCategory] = useState(taxonomy?.category || '');
  const [subcategories, setSubcategories] = useState(taxonomy?.subcategories?.join('\n') || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {taxonomy ? 'Edit Category' : 'Add Category'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category Name</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subcategories (one per line)</label>
            <textarea
              value={subcategories}
              onChange={(e) => setSubcategories(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Subcategory 1&#10;Subcategory 2&#10;Subcategory 3"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!category) {
                toast.error('Category name is required');
                return;
              }
              onSave({
                id: taxonomy?.id || Date.now().toString(),
                category,
                subcategories: subcategories.split('\n').filter((s: string) => s.trim()),
              });
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {taxonomy ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bundles & Kits Section Component
function BundlesKitsSection() {
  const [bundles, setBundles] = useState<Array<{
    id: string;
    name: string;
    sku: string;
    type: 'static' | 'dynamic';
    products: Array<{ productId: number; quantity: number; sku?: string; name?: string }>;
    rules?: string; // For dynamic bundles
    price?: number;
    discount?: number;
  }>>([]);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const { data: allProducts } = useQuery({
    queryKey: ['products', 'all-for-bundles'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=10000');
      return response.data?.data || [];
    },
  });

  // Load bundles from localStorage (or API in future)
  useEffect(() => {
    const savedBundles = localStorage.getItem('productBundles');
    if (savedBundles) setBundles(JSON.parse(savedBundles));
  }, []);

  const saveBundles = (newBundles: typeof bundles) => {
    setBundles(newBundles);
    localStorage.setItem('productBundles', JSON.stringify(newBundles));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bundles & Kits</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create static (fixed products) and dynamic (rule-based) product bundles</p>
        </div>
        <ButtonWithWaves onClick={() => {
          setEditingBundle(null);
          setIsBundleModalOpen(true);
        }}>
          <Plus className="w-5 h-5" />
          Add Bundle
        </ButtonWithWaves>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No bundles created yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {bundles.map((bundle) => (
                <tr key={bundle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{bundle.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{bundle.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${bundle.type === 'static' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                      {bundle.type === 'static' ? 'Static' : 'Dynamic'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {bundle.products.length} product{bundle.products.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {bundle.price ? `$${bundle.price.toFixed(2)}` : '-'}
                    {bundle.discount && bundle.discount > 0 && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                        ({bundle.discount}% off)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingBundle(bundle);
                          setIsBundleModalOpen(true);
                        }}
                        className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          saveBundles(bundles.filter(b => b.id !== bundle.id));
                          toast.success('Bundle deleted');
                        }}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
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

      {/* Bundle Modal */}
      {isBundleModalOpen && (
        <BundleModal
          bundle={editingBundle}
          products={allProducts || []}
          onClose={() => {
            setIsBundleModalOpen(false);
            setEditingBundle(null);
          }}
          onSave={(bundle) => {
            if (editingBundle) {
              saveBundles(bundles.map(b => b.id === editingBundle.id ? bundle : b));
              toast.success('Bundle updated');
            } else {
              saveBundles([...bundles, bundle]);
              toast.success('Bundle created');
            }
            setIsBundleModalOpen(false);
            setEditingBundle(null);
          }}
        />
      )}
    </div>
  );
}

// Bundle Modal Component
function BundleModal({ bundle, products, onClose, onSave }: {
  bundle: any;
  products: any[];
  onClose: () => void;
  onSave: (bundle: any) => void;
}) {
  const [name, setName] = useState(bundle?.name || '');
  const [sku, setSku] = useState(bundle?.sku || '');
  const [type, setType] = useState<'static' | 'dynamic'>(bundle?.type || 'static');
  const [selectedProducts, setSelectedProducts] = useState<Array<{ productId: number; quantity: number }>>(
    bundle?.products || []
  );
  const [rules, setRules] = useState(bundle?.rules || '');
  const [price, setPrice] = useState(bundle?.price?.toString() || '');
  const [discount, setDiscount] = useState(bundle?.discount?.toString() || '');

  const addProduct = () => {
    setSelectedProducts([...selectedProducts, { productId: 0, quantity: 1 }]);
  };

  const updateProduct = (index: number, field: 'productId' | 'quantity', value: number) => {
    const updated = [...selectedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProducts(updated);
  };

  const removeProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {bundle ? 'Edit Bundle' : 'Create Bundle'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bundle Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
              <button
                type="button"
                onClick={() => {
                  // Auto-generate SKU based on bundle name and timestamp
                  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 10);
                  const timestamp = Date.now().toString().slice(-6);
                  setSku(`BUNDLE-${nameSlug || 'bundle'}-${timestamp}`);
                }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                Auto-generate
              </button>
            </div>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., BUNDLE-001 or leave empty to auto-generate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <CustomSelect
              value={type}
              onChange={(value) => setType(value as 'static' | 'dynamic')}
              options={[
                { value: 'static', label: 'Static (Fixed Products)' },
                { value: 'dynamic', label: 'Dynamic (Rule-based)' },
              ]}
              placeholder="Select type..."
            />
          </div>

          {type === 'static' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Products</label>
                <button
                  onClick={addProduct}
                  className="px-3 py-2 text-[14px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex h-full justify-center items-center"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Product
                </button>
              </div>
              <div className="space-y-2">
                {selectedProducts.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <CustomSelect
                        value={item.productId > 0 ? item.productId.toString() : ''}
                        onChange={(value) => updateProduct(index, 'productId', Number(value))}
                        options={products && products.length > 0 ? products.map((p: any) => ({
                          value: p.id.toString(),
                          label: `${p.name} (${p.sku})`
                        })) : []}
                        placeholder="Select Product"
                      />
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', Number(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Qty"
                    />
                    <button
                      onClick={() => removeProduct(index)}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rules (e.g., "All products from Collection X" or "Products with price &gt; $50")</label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter bundle rules..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (optional)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ::placeholder-[12px] text-[14px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount % (optional)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name || !sku) {
                toast.error('Name and SKU are required');
                return;
              }
              if (type === 'static' && selectedProducts.length === 0) {
                toast.error('At least one product is required for static bundles');
                return;
              }
              if (type === 'dynamic' && !rules) {
                toast.error('Rules are required for dynamic bundles');
                return;
              }
              onSave({
                id: bundle?.id || Date.now().toString(),
                name,
                sku,
                type,
                products: type === 'static' ? selectedProducts : [],
                rules: type === 'dynamic' ? rules : undefined,
                price: price ? Number(price) : undefined,
                discount: discount ? Number(discount) : undefined,
              });
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-[14px]"
          >
            {bundle ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// View Product Modal Component
function ViewProductModal({
  product,
  onClose,
  isShowing,
}: {
  product: any;
  onClose: () => void;
  isShowing: boolean;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const images = product.images || [];

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close if clicking the backdrop or outside the modal content
    if (e.target === e.currentTarget || (modalRef.current && !modalRef.current.contains(e.target as Node))) {
      onClose();
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailRefs.current[currentImageIndex] && thumbnailContainerRef.current) {
      const thumbnail = thumbnailRefs.current[currentImageIndex];
      const container = thumbnailContainerRef.current;
      
      if (thumbnail) {
        const containerRect = container.getBoundingClientRect();
        const thumbnailRect = thumbnail.getBoundingClientRect();
        
        // Check if thumbnail is not fully visible
        const isVisible = 
          thumbnailRect.left >= containerRect.left &&
          thumbnailRect.right <= containerRect.right;
        
        if (!isVisible) {
          thumbnail.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
      }
    }
  }, [currentImageIndex, images.length]);

  useEffect(() => {
    if (isShowing) {
      setCurrentImageIndex(0);
      // Reset thumbnail refs array
      thumbnailRefs.current = [];
    }
  }, [isShowing]);

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className={`modal-backdrop fade ${isShowing ? 'show' : ''}`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`modal fade ${isShowing ? 'show' : ''}`}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewProductModalLabel"
        tabIndex={-1}
        style={{ zIndex: 1050 }}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ maxWidth: '1100px' }}
        >
          <div className="modal-content w-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="modal-header border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  View Product
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body p-0 overflow-hidden" style={{ maxHeight: '85vh' }}>
              <div className="flex flex-col lg:flex-row h-full">
                {/* Left Side - Images */}
                <div className="lg:w-1/2 p-6 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700">
                  {images.length > 0 ? (
                    <div className="sticky top-6">
                      {/* Main Image Slider */}
                      <div className="relative w-full aspect-square bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={images[currentImageIndex]}
                          alt={`Product image ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain transition-opacity duration-300"
                        />

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                prevImage();
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 rounded-full shadow-xl transition-all z-10 backdrop-blur-sm border border-gray-200 dark:border-gray-700"
                              aria-label="Previous image"
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                nextImage();
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 rounded-full shadow-xl transition-all z-10 backdrop-blur-sm border border-gray-200 dark:border-gray-700"
                              aria-label="Next image"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </button>
                          </>
                        )}

                        {/* Image Counter */}
                        {images.length > 1 && (
                          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
                            {currentImageIndex + 1} / {images.length}
                          </div>
                        )}
                      </div>

                      {/* Thumbnail Navigation */}
                      {images.length > 1 && (
                        <div 
                          ref={thumbnailContainerRef}
                          className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                        >
                          {images.map((image: string, index: number) => (
                            <button
                              key={index}
                              ref={(el) => {
                                thumbnailRefs.current[index] = el;
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                goToImage(index);
                              }}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${index === currentImageIndex
                                ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/30 shadow-md scale-105'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 opacity-70 hover:opacity-100'
                                }`}
                            >
                              <img
                                src={image}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <Package className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">No images available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side - Product Details */}
                <div className="lg:w-1/2 ml-5 overflow-y-auto" style={{ maxHeight: '85vh' }}>
                  <div className="space-y-6">
                    {/* Basic Information Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <h6 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                        Basic Information
                      </h6>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Name</label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{product.name || '-'}</p>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">SKU</label>
                          <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">{product.sku || '-'}</p>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">EAN</label>
                          <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">{product.ean || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-5">
                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Style</label>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.style || '-'}</p>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Collection</label>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{product.collection?.name || '-'}</p>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Base Price</label>
                          <p className="text-sm font-bold text-primary-600 dark:text-primary-400">
                            {product.basePrice ? `$${Number(product.basePrice).toFixed(2)}` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Attributes Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <h6 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                        Attributes
                      </h6>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Sizes</label>
                          <div className="flex flex-wrap gap-2">
                            {product.sizes && product.sizes.length > 0 ? (
                              product.sizes.map((size: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg border border-primary-200 dark:border-primary-800"
                                >
                                  {size}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">No sizes available</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Colors</label>
                          <div className="flex flex-wrap gap-2">
                            {product.colors && product.colors.length > 0 ? (
                              product.colors.map((color: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800"
                                >
                                  {color}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">No colors available</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Materials</label>
                          <div className="flex flex-wrap gap-2">
                            {product.materials ? (
                              Array.isArray(product.materials) ? (
                                product.materials.map((material: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800"
                                  >
                                    {material}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800">
                                  {product.materials}
                                </span>
                              )
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">No materials available</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description Card */}
                    {product.description && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h6 className="text-base font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                          Description
                        </h6>
                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{product.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div >
    </>
  );
}

