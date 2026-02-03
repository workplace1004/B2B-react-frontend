import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Leaf, FileText, Search, Plus, Shield, Globe, X, Pencil, Trash2, Eye, ChevronDown, Inbox } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'dpp' | 'compliance';

export default function SustainabilityCompliance() {
  const [activeTab, setActiveTab] = useState<TabType>('dpp');

  const tabs = [
    { id: 'dpp' as TabType, label: 'Digital Product Passport', icon: Globe },
    { id: 'compliance' as TabType, label: 'Materials / Compliance Evidence', icon: Shield },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Sustainability & Compliance" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sustainability & Compliance</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Digital Product Passport data and compliance evidence management</p>
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

      {/* Tab Content */}
      <div>
        {activeTab === 'dpp' && <DigitalProductPassportSection />}
        {activeTab === 'compliance' && <ComplianceEvidenceSection />}
      </div>
    </div>
  );
}

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

// Digital Product Passport Section Component
function DigitalProductPassportSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPassport, setSelectedPassport] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch products for dropdown
  const { data: productsData } = useQuery({
    queryKey: ['products', 'dropdown'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  // Fetch Digital Product Passports
  const { data: passportsData, isLoading } = useQuery({
    queryKey: ['digital-product-passport', searchQuery],
    queryFn: async () => {
      const response = await api.get('/digital-product-passport');
      const passports = response.data || [];
      if (searchQuery) {
        return passports.filter((p: any) =>
          p.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.passportId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.manufacturerName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return passports;
    },
  });

  const passports = passportsData || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/digital-product-passport/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-product-passport'] });
      toast.success('Digital Product Passport deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedPassport(null);
    },
    onError: () => {
      toast.error('Failed to delete passport');
    },
  });

  const handleDelete = () => {
    if (selectedPassport) {
      deleteMutation.mutate(selectedPassport.id);
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search passports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Passport
          </button>
        </div>
      </div>

      {/* Passports Table */}
      {passports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No passports found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first Digital Product Passport.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Passport
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Passport ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Manufacturer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Country</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Certifications</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {passports.map((passport: any) => (
                  <tr key={passport.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {passport.product?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {passport.passportId || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {passport.manufacturerName || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {passport.countryOfOrigin || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {passport.certifications && passport.certifications.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {passport.certifications.slice(0, 2).map((cert: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs">
                              {cert}
                            </span>
                          ))}
                          {passport.certifications.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">+{passport.certifications.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPassport(passport);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPassport(passport);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        </div>
      )}

      {/* Add/Edit Modal - Placeholder for now */}
      {isModalOpen && (
        <DPPModal
          products={productsData || []}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['digital-product-passport'] });
            setIsModalOpen(false);
          }}
        />
      )}

      {isEditModalOpen && selectedPassport && (
        <DPPModal
          passport={selectedPassport}
          products={productsData || []}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedPassport(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['digital-product-passport'] });
            setIsEditModalOpen(false);
            setSelectedPassport(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedPassport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Passport</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedPassport(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete the Digital Product Passport for <span className="font-semibold">"{selectedPassport.product?.name || 'this product'}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedPassport(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// DPP Modal Component (simplified for now)
function DPPModal({ passport, products, onClose, onSave }: { passport?: any; products: any[]; onClose: () => void; onSave: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    productId: passport?.productId || '',
    passportId: passport?.passportId || '',
    manufacturerName: passport?.manufacturerName || '',
    manufacturerAddress: passport?.manufacturerAddress || '',
    countryOfOrigin: passport?.countryOfOrigin || '',
    productionDate: passport?.productionDate ? new Date(passport.productionDate).toISOString().split('T')[0] : '',
    carbonFootprint: passport?.carbonFootprint || '',
    waterFootprint: passport?.waterFootprint || '',
    recyclability: passport?.recyclability || '',
    repairability: passport?.repairability || '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/digital-product-passport', data);
    },
    onSuccess: () => {
      toast.success('Digital Product Passport created successfully!');
      onSave();
    },
    onError: () => {
      toast.error('Failed to create passport');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.patch(`/digital-product-passport/${passport.id}`, data);
    },
    onSuccess: () => {
      toast.success('Digital Product Passport updated successfully!');
      onSave();
    },
    onError: () => {
      toast.error('Failed to update passport');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const submitData = {
      ...formData,
      productId: parseInt(formData.productId),
      carbonFootprint: formData.carbonFootprint ? parseFloat(formData.carbonFootprint) : undefined,
      waterFootprint: formData.waterFootprint ? parseFloat(formData.waterFootprint) : undefined,
    };

    if (passport) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
    
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {passport ? 'Edit' : 'Add'} Digital Product Passport
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product *</label>
            <CustomSelect
              value={formData.productId.toString()}
              onChange={(value) => setFormData({ ...formData, productId: value })}
              options={products.map((p) => ({ value: p.id.toString(), label: p.name }))}
              placeholder="Select product..."
              error={!formData.productId}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Passport ID</label>
              <input
                type="text"
                value={formData.passportId}
                onChange={(e) => setFormData({ ...formData, passportId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Country of Origin</label>
              <input
                type="text"
                value={formData.countryOfOrigin}
                onChange={(e) => setFormData({ ...formData, countryOfOrigin: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Manufacturer Name</label>
            <input
              type="text"
              value={formData.manufacturerName}
              onChange={(e) => setFormData({ ...formData, manufacturerName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Manufacturer Address</label>
            <textarea
              value={formData.manufacturerAddress}
              onChange={(e) => setFormData({ ...formData, manufacturerAddress: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Production Date</label>
              <input
                type="date"
                value={formData.productionDate}
                onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Carbon Footprint (kg CO2)</label>
              <input
                type="number"
                step="0.01"
                value={formData.carbonFootprint}
                onChange={(e) => setFormData({ ...formData, carbonFootprint: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Water Footprint (L)</label>
              <input
                type="number"
                step="0.01"
                value={formData.waterFootprint}
                onChange={(e) => setFormData({ ...formData, waterFootprint: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recyclability</label>
              <CustomSelect
                value={formData.recyclability}
                onChange={(value) => setFormData({ ...formData, recyclability: value })}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'Fully Recyclable', label: 'Fully Recyclable' },
                  { value: 'Partially Recyclable', label: 'Partially Recyclable' },
                  { value: 'Not Recyclable', label: 'Not Recyclable' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Repairability</label>
              <CustomSelect
                value={formData.repairability}
                onChange={(value) => setFormData({ ...formData, repairability: value })}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'Easy', label: 'Easy' },
                  { value: 'Moderate', label: 'Moderate' },
                  { value: 'Difficult', label: 'Difficult' },
                ]}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.productId || createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving || createMutation.isPending || updateMutation.isPending ? 'Saving...' : passport ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Materials / Compliance Evidence Section Component
function ComplianceEvidenceSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch products for dropdown
  const { data: productsData } = useQuery({
    queryKey: ['products', 'dropdown'],
    queryFn: async () => {
      const response = await api.get('/products?skip=0&take=1000');
      return response.data?.data || [];
    },
  });

  // Fetch Compliance Evidence
  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ['compliance-evidence', searchQuery, filterType],
    queryFn: async () => {
      const response = await api.get('/compliance-evidence');
      let evidence = response.data || [];
      
      // Filter by type
      if (filterType !== 'all') {
        evidence = evidence.filter((e: any) => e.type === filterType);
      }
      
      // Filter by search query
      if (searchQuery) {
        evidence = evidence.filter((e: any) =>
          e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.issuer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.standards?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      
      return evidence;
    },
  });

  const evidence = evidenceData || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/compliance-evidence/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-evidence'] });
      toast.success('Compliance Evidence deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedEvidence(null);
    },
    onError: () => {
      toast.error('Failed to delete evidence');
    },
  });

  const handleDelete = () => {
    if (selectedEvidence) {
      deleteMutation.mutate(selectedEvidence.id);
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  const evidenceTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'CERTIFICATION', label: 'Certification' },
    { value: 'TEST_REPORT', label: 'Test Report' },
    { value: 'MATERIAL_SAFETY', label: 'Material Safety' },
    { value: 'ENVIRONMENTAL_IMPACT', label: 'Environmental Impact' },
    { value: 'SUPPLY_CHAIN', label: 'Supply Chain' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Search, Filter, and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search evidence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Evidence
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter by type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              {evidenceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      {evidence.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No compliance evidence found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || filterType !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first compliance evidence.'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Evidence
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Issuer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Standards</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {evidence.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">{item.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                        {item.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.product?.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.issuer || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.standards && item.standards.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.standards.slice(0, 2).map((std: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {std}
                            </span>
                          ))}
                          {item.standards.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">+{item.standards.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {item.issueDate ? new Date(item.issueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {item.documentUrl && (
                          <button
                            onClick={() => window.open(item.documentUrl, '_blank')}
                            className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="View Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedEvidence(item);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEvidence(item);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <ComplianceEvidenceModal
          products={productsData || []}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['compliance-evidence'] });
            setIsModalOpen(false);
          }}
        />
      )}

      {isEditModalOpen && selectedEvidence && (
        <ComplianceEvidenceModal
          evidence={selectedEvidence}
          products={productsData || []}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEvidence(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['compliance-evidence'] });
            setIsEditModalOpen(false);
            setSelectedEvidence(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Evidence</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedEvidence(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-semibold">"{selectedEvidence.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedEvidence(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compliance Evidence Modal Component
function ComplianceEvidenceModal({ evidence, products, onClose, onSave }: { evidence?: any; products: any[]; onClose: () => void; onSave: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    productId: evidence?.productId?.toString() || '',
    name: evidence?.name || '',
    type: evidence?.type || 'OTHER',
    description: evidence?.description || '',
    documentUrl: evidence?.documentUrl || '',
    issuer: evidence?.issuer || '',
    issueDate: evidence?.issueDate ? new Date(evidence.issueDate).toISOString().split('T')[0] : '',
    expiryDate: evidence?.expiryDate ? new Date(evidence.expiryDate).toISOString().split('T')[0] : '',
    certificateNumber: evidence?.certificateNumber || '',
    standards: evidence?.standards || [],
    tags: evidence?.tags || [],
    isActive: evidence?.isActive !== false,
  });
  const [newStandard, setNewStandard] = useState('');
  const [newTag, setNewTag] = useState('');

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/compliance-evidence', data);
    },
    onSuccess: () => {
      toast.success('Compliance Evidence created successfully!');
      onSave();
    },
    onError: () => {
      toast.error('Failed to create evidence');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.patch(`/compliance-evidence/${evidence.id}`, data);
    },
    onSuccess: () => {
      toast.success('Compliance Evidence updated successfully!');
      onSave();
    },
    onError: () => {
      toast.error('Failed to update evidence');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const submitData = {
      ...formData,
      productId: formData.productId ? parseInt(formData.productId) : undefined,
      issueDate: formData.issueDate || undefined,
      expiryDate: formData.expiryDate || undefined,
    };

    if (evidence) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
    
    setIsSaving(false);
  };

  const addStandard = () => {
    if (newStandard.trim() && !formData.standards.includes(newStandard.trim())) {
      setFormData({ ...formData, standards: [...formData.standards, newStandard.trim()] });
      setNewStandard('');
    }
  };

  const removeStandard = (standard: string) => {
    setFormData({ ...formData, standards: formData.standards.filter((s) => s !== standard) });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {evidence ? 'Edit' : 'Add'} Compliance Evidence
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product</label>
            <CustomSelect
              value={formData.productId}
              onChange={(value) => setFormData({ ...formData, productId: value })}
              options={[
                { value: '', label: 'None (General)' },
                ...products.map((p) => ({ value: p.id.toString(), label: p.name })),
              ]}
              placeholder="Select product..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type *</label>
              <CustomSelect
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
                options={[
                  { value: 'CERTIFICATION', label: 'Certification' },
                  { value: 'TEST_REPORT', label: 'Test Report' },
                  { value: 'MATERIAL_SAFETY', label: 'Material Safety' },
                  { value: 'ENVIRONMENTAL_IMPACT', label: 'Environmental Impact' },
                  { value: 'SUPPLY_CHAIN', label: 'Supply Chain' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issuer</label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Certificate Number</label>
              <input
                type="text"
                value={formData.certificateNumber}
                onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Issue Date</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document URL</label>
            <input
              type="url"
              value={formData.documentUrl}
              onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Standards</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newStandard}
                onChange={(e) => setNewStandard(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addStandard();
                  }
                }}
                placeholder="Add standard (e.g., REACH, RoHS)"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={addStandard}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.standards.map((std) => (
                <span key={std} className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 rounded-full text-sm flex items-center gap-2">
                  {std}
                  <button
                    type="button"
                    onClick={() => removeStandard(std)}
                    className="hover:text-primary-600 dark:hover:text-primary-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm flex items-center gap-2">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-gray-600 dark:hover:text-gray-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !formData.name || createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving || createMutation.isPending || updateMutation.isPending ? 'Saving...' : evidence ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
