import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { Package, Plus, X, ChevronDown, ChevronsLeft, ChevronsRight, Pencil, Trash2, AlertTriangle, Upload, Inbox } from 'lucide-react';
import { validators } from '../utils/validation';
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
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl custom-dropdown-menu"
          style={{
            zIndex: 10000,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            maxHeight: '400px', // Limit to 10 items (10 * ~40px per item)
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
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${isSelected || isHighlighted
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
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'variants'>('variants'); // New: variant view mode
  const [activeTab, setActiveTab] = useState<'products' | 'attributes' | 'bundles'>('products'); // Tab state for Catalog sections
  const queryClient = useQueryClient();

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen) {
      document.body.classList.add('modal-open');
      // Trigger show animation after a brief delay
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

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Catalog" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Catalog</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Products (Style → Color → Size → Variant), Attributes & Taxonomy, Bundles & Kits</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'products'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Products (Variants)
          </button>
          <button
            onClick={() => setActiveTab('attributes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'attributes'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Attributes & Taxonomy
          </button>
          <button
            onClick={() => setActiveTab('bundles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bundles'
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
                onClick={() => setViewMode('variants')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'variants'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Variant View (Style → Color → Size)
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Table View
              </button>
            </div>
            <ButtonWithWaves onClick={openModal}>
              <Plus className="w-5 h-5" />
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
                  <Plus className="w-5 h-5" />
                  Add Product
                </ButtonWithWaves>
              </div>
            ) : (
              <div className="p-6">
                {variantGroups.map((styleGroup, styleIdx) => (
                  <div key={styleIdx} className="mb-8 last:mb-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Style: {styleGroup.style}
                    </h3>
                    {Object.values(styleGroup.colors).map((colorGroup, colorIdx) => (
                      <div key={colorIdx} className="ml-4 mb-6">
                        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                          Color: {colorGroup.color}
                        </h4>
                        {Object.values(colorGroup.sizes).map((sizeGroup, sizeIdx) => (
                          <div key={sizeIdx} className="ml-4 mb-4">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Size: {sizeGroup.size}
                            </h5>
                            <div className="ml-4 space-y-2">
                              {sizeGroup.variants.map((variant: any) => (
                                <div
                                  key={variant.variantKey}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
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
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Collection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Sizes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Colors</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.data.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {product.collection?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {product.sizes?.join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-white">
                    {product.colors?.join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
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
        )
          )}
          
          {/* Pagination - Only show in table view */}
          {viewMode === 'table' && data?.data && data.data.length > 0 && (
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

      {data?.data && data.data.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-white">
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
                  // Show all pages if 7 or fewer
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Always show first page
                  pages.push(1);

                  if (currentPage > 3) {
                    pages.push('...');
                  }

                  // Show pages around current
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

                  // Always show last page
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

  // Reset images when modal closes
  useEffect(() => {
    if (!isShowing) {
      setSelectedImages([]);
      setImagePreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isShowing]);

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
              <h5 id="addProductModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
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
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300'
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
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.sku ? 'border-red-500' : 'border-gray-300'
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter style"
                      />
                    </div>
                  </div>

                  {/* Sizes, Colors, Materials */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sizes <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.sizes}
                        onChange={(e) => handleChange('sizes', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.sizes ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="S, M, L, XL"
                      />
                      {errors.sizes && <p className="mt-1 text-sm text-red-500">{errors.sizes}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Colors <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.colors}
                        onChange={(e) => handleChange('colors', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.colors ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Red, Blue, Green"
                      />
                      {errors.colors && <p className="mt-1 text-sm text-red-500">{errors.colors}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Materials <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.materials}
                        onChange={(e) => handleChange('materials', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.materials ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Cotton, Polyester"
                      />
                      {errors.materials && <p className="mt-1 text-sm text-red-500">{errors.materials}</p>}
                    </div>
                  </div>

                  {/* EAN and Base Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">EAN</label>
                      <input
                        type="text"
                        value={formData.ean}
                        onChange={(e) => handleChange('ean', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter EAN"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.basePrice}
                        onChange={(e) => handleChange('basePrice', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
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
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
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
  const [sizesInputValue, setSizesInputValue] = useState('');
  const [sizesSuggestions, setSizesSuggestions] = useState<string[]>([]);
  const [showSizesSuggestions, setShowSizesSuggestions] = useState(false);
  const sizesInputRef = useRef<HTMLInputElement>(null);
  const sizesDropdownRef = useRef<HTMLDivElement>(null);

  // Common sizes list
  const commonSizes = [
    'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
    '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50',
    '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24',
    'One Size', 'OS', 'Free Size',
  ];

  // Fetch existing product images from product data
  useEffect(() => {
    if (product && product.images && Array.isArray(product.images)) {
      setExistingImages(product.images);
    } else {
      setExistingImages([]);
    }
  }, [product]);

  // Initialize sizes input value
  useEffect(() => {
    setSizesInputValue(formData.sizes);
  }, [formData.sizes]);

  // Reset images when modal closes
  useEffect(() => {
    if (!isShowing) {
      setSelectedImages([]);
      setImagePreviews([]);
      setImagesToDelete([]);
      setShowSizesSuggestions(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isShowing]);

  // Handle sizes input change with autocomplete
  const handleSizesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSizesInputValue(value);

    // Get the last part after the last comma (what user is currently typing)
    const lastCommaIndex = value.lastIndexOf(',');
    const currentInput = lastCommaIndex === -1 ? value.trim() : value.substring(lastCommaIndex + 1).trim();

    if (currentInput.length > 0) {
      // Filter suggestions based on current input
      const filtered = commonSizes.filter(size =>
        size.toLowerCase().includes(currentInput.toLowerCase()) &&
        !value.toLowerCase().includes(size.toLowerCase()) // Don't suggest already added sizes
      );
      setSizesSuggestions(filtered);
      setShowSizesSuggestions(filtered.length > 0);
    } else {
      setSizesSuggestions([]);
      setShowSizesSuggestions(false);
    }

    // Update form data
    handleChange('sizes', value);
  };

  // Handle size suggestion selection
  const handleSizeSelect = (size: string) => {
    const currentValue = sizesInputValue.trim();
    const lastCommaIndex = currentValue.lastIndexOf(',');

    let newValue: string;
    if (lastCommaIndex === -1) {
      // No comma, replace entire value
      newValue = size;
    } else {
      // Replace the part after the last comma
      const beforeComma = currentValue.substring(0, lastCommaIndex + 1).trim();
      newValue = beforeComma ? `${beforeComma} ${size}` : size;
    }

    setSizesInputValue(newValue);
    handleChange('sizes', newValue);
    setShowSizesSuggestions(false);
    setSizesSuggestions([]);

    // Focus back on input
    if (sizesInputRef.current) {
      sizesInputRef.current.focus();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sizesDropdownRef.current &&
        !sizesDropdownRef.current.contains(event.target as Node) &&
        sizesInputRef.current &&
        !sizesInputRef.current.contains(event.target as Node)
      ) {
        setShowSizesSuggestions(false);
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
              <h5 id="editProductModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
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
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300'
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
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.sku ? 'border-red-500' : 'border-gray-300'
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
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter style"
                    />
                  </div>
                </div>

                {/* Sizes, Colors, Materials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sizes <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={sizesInputRef}
                      type="text"
                      value={sizesInputValue}
                      onChange={handleSizesInputChange}
                      onFocus={() => {
                        const currentInput = sizesInputValue.split(',').pop()?.trim() || '';
                        if (currentInput.length > 0) {
                          const filtered = commonSizes.filter(size =>
                            size.toLowerCase().includes(currentInput.toLowerCase()) &&
                            !sizesInputValue.toLowerCase().includes(size.toLowerCase())
                          );
                          setSizesSuggestions(filtered);
                          setShowSizesSuggestions(filtered.length > 0);
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.sizes ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="S, M, L, XL"
                    />
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
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Colors <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.colors}
                      onChange={(e) => handleChange('colors', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.colors ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Red, Blue, Green"
                    />
                    {errors.colors && <p className="mt-1 text-sm text-red-500">{errors.colors}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Materials <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.materials}
                      onChange={(e) => handleChange('materials', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${errors.materials ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Cotton, Polyester"
                    />
                    {errors.materials && <p className="mt-1 text-sm text-red-500">{errors.materials}</p>}
                  </div>
                </div>

                {/* EAN and Base Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">EAN</label>
                    <input
                      type="text"
                      value={formData.ean}
                      onChange={(e) => handleChange('ean', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter EAN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Base Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => handleChange('basePrice', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              <h5 id="deleteProductModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Product
              </h5>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{product.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
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
            <ButtonWithWaves onClick={() => {
              setEditingAttribute(null);
              setIsAttributeModalOpen(true);
            }}>
              <Plus className="w-5 h-5" />
              Create First Attribute
            </ButtonWithWaves>
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
            <ButtonWithWaves onClick={() => {
              setEditingTaxonomy(null);
              setIsTaxonomyModalOpen(true);
            }}>
              <Plus className="w-5 h-5" />
              Create First Category
            </ButtonWithWaves>
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select (Single)</option>
              <option value="multiselect">Multi-Select</option>
              <option value="boolean">Boolean (Yes/No)</option>
            </select>
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
              className="w-4 h-4 text-primary-600 rounded border-gray-300"
            />
            <label htmlFor="required" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
          <ButtonWithWaves onClick={() => {
            setEditingBundle(null);
            setIsBundleModalOpen(true);
          }}>
            <Plus className="w-5 h-5" />
            Create First Bundle
          </ButtonWithWaves>
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
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'static' | 'dynamic')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="static">Static (Fixed Products)</option>
              <option value="dynamic">Dynamic (Rule-based)</option>
            </select>
          </div>

          {type === 'static' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Products</label>
                <button
                  onClick={addProduct}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Product
                </button>
              </div>
              <div className="space-y-2">
                {selectedProducts.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <select
                      value={item.productId}
                      onChange={(e) => updateProduct(index, 'productId', Number(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value={0}>Select Product</option>
                      {products.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
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
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {bundle ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

