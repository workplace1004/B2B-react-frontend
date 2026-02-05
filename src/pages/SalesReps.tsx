import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { User, MapPin, Users, DollarSign, Search, Plus, X, Pencil, Trash2, ChevronDown, Inbox, Calculator } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'accounts-territories' | 'client-assignments' | 'commissions';

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

export default function SalesReps() {
  const [activeTab, setActiveTab] = useState<TabType>('accounts-territories');

  const tabs = [
    { id: 'accounts-territories' as TabType, label: 'Rep Accounts & Territories', icon: MapPin },
    { id: 'client-assignments' as TabType, label: 'Client Assignments', icon: Users },
    { id: 'commissions' as TabType, label: 'Commissions', icon: DollarSign },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Sales Reps" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Sales Reps</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Manage sales rep accounts, territories, client assignments, and commissions</p>
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
        {activeTab === 'accounts-territories' && <RepAccountsTerritoriesSection />}
        {activeTab === 'client-assignments' && <ClientAssignmentsSection />}
        {activeTab === 'commissions' && <CommissionsSection />}
      </div>
    </div>
  );
}

// Rep Accounts & Territories Section Component
function RepAccountsTerritoriesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch sales reps
  const { data: repsData, isLoading } = useQuery({
    queryKey: ['users', 'sales-reps', searchQuery],
    queryFn: async () => {
      try {
        const response = await api.get('/users');
        let reps = (response.data || []).filter((user: any) => user.role === 'SALES' || user.role === 'B2B');
        
        // Filter by search query
        if (searchQuery) {
          reps = reps.filter((rep: any) => {
            const fullName = `${rep.firstName || ''} ${rep.lastName || ''}`.trim();
            return (
              fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rep.email?.toLowerCase().includes(searchQuery.toLowerCase())
            );
          });
        }
        
        return reps;
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch territories - using placeholder until backend is ready
  const { data: territoriesData } = useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      // TODO: Replace with actual territories API endpoint when backend is ready
      return [];
    },
  });

  const reps = repsData || [];
  const territories = territoriesData || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Sales rep deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedRep(null);
    },
    onError: () => {
      toast.error('Failed to delete sales rep');
    },
  });

  const handleDelete = () => {
    if (selectedRep) {
      deleteMutation.mutate(selectedRep.id);
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sales reps..."
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
            Add Sales Rep
          </button>
        </div>
      </div>

      {/* Sales Reps Table */}
      {reps.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No sales reps found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by adding your first sales rep account.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Sales Rep
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Territory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reps.map((rep: any) => {
                  const fullName = `${rep.firstName || ''} ${rep.lastName || ''}`.trim() || rep.email || 'Unknown';
                  const territory: any = territories.find((t: any) => t.userId === rep.id);
                  return (
                    <tr key={rep.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {rep.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                          {rep.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {territory ? (
                          <div>
                            <div className="font-medium">{territory.name}</div>
                            {territory.region && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">{territory.region}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rep.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {rep.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRep(rep);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRep(rep);
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal - Placeholder */}
      {isModalOpen && (
        <RepTerritoryModal
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['users', 'sales-reps'] });
            setIsModalOpen(false);
          }}
        />
      )}

      {isEditModalOpen && selectedRep && (
        <RepTerritoryModal
          rep={selectedRep}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRep(null);
          }}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['users', 'sales-reps'] });
            setIsEditModalOpen(false);
            setSelectedRep(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Sales Rep</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedRep(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-semibold">"{selectedRep.firstName} {selectedRep.lastName}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedRep(null);
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

// Rep Territory Modal Component
function RepTerritoryModal({ rep, onClose, onSave }: { rep?: any; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    firstName: rep?.firstName || '',
    lastName: rep?.lastName || '',
    email: rep?.email || '',
    role: rep?.role || 'SALES',
    territoryName: '',
    region: '',
    countries: [] as string[],
    states: [] as string[],
    cities: [] as string[],
    description: '',
  });
  const [newCountry, setNewCountry] = useState('');
  const [newState, setNewState] = useState('');
  const [newCity, setNewCity] = useState('');

  const addCountry = () => {
    if (newCountry.trim() && !formData.countries.includes(newCountry.trim())) {
      setFormData({ ...formData, countries: [...formData.countries, newCountry.trim()] });
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    setFormData({ ...formData, countries: formData.countries.filter((c) => c !== country) });
  };

  const addState = () => {
    if (newState.trim() && !formData.states.includes(newState.trim())) {
      setFormData({ ...formData, states: [...formData.states, newState.trim()] });
      setNewState('');
    }
  };

  const removeState = (state: string) => {
    setFormData({ ...formData, states: formData.states.filter((s) => s !== state) });
  };

  const addCity = () => {
    if (newCity.trim() && !formData.cities.includes(newCity.trim())) {
      setFormData({ ...formData, cities: [...formData.cities, newCity.trim()] });
      setNewCity('');
    }
  };

  const removeCity = (city: string) => {
    setFormData({ ...formData, cities: formData.cities.filter((c) => c !== city) });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {rep ? 'Edit Sales Rep & Territory' : 'Add Sales Rep & Territory'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Rep Account Info */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Rep Account Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter first name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter last name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role *</label>
                <CustomSelect
                  value={formData.role}
                  onChange={(value) => setFormData({ ...formData, role: value })}
                  options={[
                    { value: 'SALES', label: 'Sales' },
                    { value: 'B2B', label: 'B2B' },
                  ]}
                  placeholder="Select role"
                />
              </div>
            </div>
          </div>

          {/* Territory Info */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Territory Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Territory Name *</label>
                <input
                  type="text"
                  value={formData.territoryName}
                  onChange={(e) => setFormData({ ...formData, territoryName: e.target.value })}
                  placeholder="e.g., North America East"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="e.g., North America"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Countries</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCountry();
                    }
                  }}
                  placeholder="Add country (e.g., USA, Canada)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addCountry}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.countries.map((country) => (
                  <span key={country} className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 rounded-full text-sm flex items-center gap-2">
                    {country}
                    <button
                      type="button"
                      onClick={() => removeCountry(country)}
                      className="hover:text-primary-600 dark:hover:text-primary-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">States/Provinces (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addState();
                    }
                  }}
                  placeholder="Add state/province"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addState}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.states.map((state) => (
                  <span key={state} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm flex items-center gap-2">
                    {state}
                    <button
                      type="button"
                      onClick={() => removeState(state)}
                      className="hover:text-gray-600 dark:hover:text-gray-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cities (Optional)</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCity();
                    }
                  }}
                  placeholder="Add city"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addCity}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.cities.map((city) => (
                  <span key={city} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full text-sm flex items-center gap-2">
                    {city}
                    <button
                      type="button"
                      onClick={() => removeCity(city)}
                      className="hover:text-gray-600 dark:hover:text-gray-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                // TODO: Implement save functionality when backend is ready
                toast.success(rep ? 'Sales rep updated successfully!' : 'Sales rep created successfully!');
                onSave();
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              {rep ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client Assignments Section Component
function ClientAssignmentsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch sales reps
  const { data: repsData } = useQuery({
    queryKey: ['users', 'sales-reps'],
    queryFn: async () => {
      try {
        const response = await api.get('/users');
        return (response.data || []).filter((user: any) => user.role === 'SALES' || user.role === 'B2B');
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch customers
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', 'assignments', searchQuery, repFilter],
    queryFn: async () => {
      try {
        const response = await api.get('/customers?skip=0&take=1000');
        let customers = response.data?.data || [];
        
        // Filter by sales rep
        if (repFilter !== 'all') {
          customers = customers.filter((customer: any) => customer.ownerId?.toString() === repFilter);
        }
        
        // Filter by search query
        if (searchQuery) {
          customers = customers.filter((customer: any) =>
            customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        return customers;
      } catch (error) {
        return [];
      }
    },
  });

  const customers = customersData || [];
  const reps = repsData || [];

  // Update assignment mutation
  const assignMutation = useMutation({
    mutationFn: async ({ customerId, repId }: { customerId: number; repId: number | null }) => {
      await api.patch(`/customers/${customerId}`, { ownerId: repId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client assignment updated successfully!');
      setIsAssignModalOpen(false);
      setSelectedCustomer(null);
    },
    onError: () => {
      toast.error('Failed to update assignment');
    },
  });

  const handleAssign = (customer: any) => {
    setSelectedCustomer(customer);
    setIsAssignModalOpen(true);
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter by sales rep:</span>
            <CustomSelect
              value={repFilter}
              onChange={(value) => setRepFilter(value)}
              options={[
                { value: 'all', label: 'All Sales Reps' },
                ...(reps || []).map((rep: any) => ({
                  value: rep.id.toString(),
                  label: `${rep.firstName} ${rep.lastName}`.trim() || rep.email,
                })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Clients Table */}
      {customers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No clients found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || repFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'No clients available for assignment.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Assigned Rep</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {customers.map((customer: any) => {
                  const assignedRep = reps.find((r: any) => r.id === customer.ownerId);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {customer.companyName || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {customer.email || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {customer.city && customer.country ? `${customer.city}, ${customer.country}` : customer.country || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {assignedRep ? (
                          <span className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 rounded">
                            {`${assignedRep.firstName} ${assignedRep.lastName}`.trim() || assignedRep.email}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          customer.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleAssign(customer)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          {assignedRep ? 'Reassign' : 'Assign'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && selectedCustomer && (
        <AssignClientModal
          customer={selectedCustomer}
          reps={reps || []}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedCustomer(null);
          }}
          onSave={(repId) => {
            assignMutation.mutate({ customerId: selectedCustomer.id, repId });
          }}
          isLoading={assignMutation.isPending}
        />
      )}
    </div>
  );
}

// Assign Client Modal Component
function AssignClientModal({ customer, reps, onClose, onSave, isLoading }: { customer: any; reps: any[]; onClose: () => void; onSave: (repId: number | null) => void; isLoading: boolean }) {
  const [selectedRepId, setSelectedRepId] = useState<string>(customer.ownerId?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selectedRepId ? parseInt(selectedRepId) : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Client</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Assign <span className="font-semibold">{customer.name}</span> to a sales rep:
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sales Rep</label>
            <CustomSelect
              value={selectedRepId}
              onChange={(value) => setSelectedRepId(value)}
              options={[
                { value: '', label: 'Unassigned' },
                ...reps.map((rep: any) => ({
                  value: rep.id.toString(),
                  label: `${rep.firstName} ${rep.lastName}`.trim() || rep.email,
                })),
              ]}
            />
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
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Calculate Commissions Modal Component
function CalculateCommissionsModal({
  isOpen,
  onClose,
  selectedCommission,
  reps,
  onCalculate,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedCommission?: any;
  reps: any[];
  onCalculate: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    commissionType: 'SALES_VOLUME',
    salesVolumeRate: 5, // percentage
    marginRate: 10, // percentage
    selectedRepIds: [] as number[],
    calculateForAll: true,
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Fetch orders for the selected period
  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'commission-calculation', formData.period],
    queryFn: async () => {
      try {
        const response = await api.get('/orders?skip=0&take=1000');
        const orders = response.data?.data || [];
        // Filter by period
        const periodStart = new Date(formData.period + '-01');
        const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
        return orders.filter((order: any) => {
          const orderDate = new Date(order.orderDate);
          return orderDate >= periodStart && orderDate <= periodEnd && 
                 (order.status === 'FULFILLED' || order.status === 'DELIVERED') &&
                 order.userId;
        });
      } catch (error) {
        return [];
      }
    },
    enabled: isOpen,
  });

  // Calculate preview
  const calculatePreview = () => {
    if (!ordersData || ordersData.length === 0) {
      toast.error('No orders found for the selected period');
      return;
    }

    const filteredOrders = formData.calculateForAll
      ? ordersData
      : ordersData.filter((order: any) => formData.selectedRepIds.includes(order.userId));

    if (filteredOrders.length === 0) {
      toast.error('No orders found for selected sales reps');
      return;
    }

    setIsCalculating(true);
    setTimeout(() => {
      const commissionMap: any = {};

    filteredOrders.forEach((order: any) => {
      const repId = order.userId;
      if (!repId) return;

      const salesAmount = parseFloat(order.totalAmount || 0);
      const marginAmount = salesAmount * 0.3; // Assuming 30% margin
      
      let commissionAmount = 0;
      if (formData.commissionType === 'SALES_VOLUME') {
        commissionAmount = salesAmount * (formData.salesVolumeRate / 100);
      } else if (formData.commissionType === 'MARGIN') {
        commissionAmount = marginAmount * (formData.marginRate / 100);
      } else if (formData.commissionType === 'HYBRID') {
        commissionAmount = (salesAmount * (formData.salesVolumeRate / 100)) + 
                          (marginAmount * (formData.marginRate / 100));
      }

      if (!commissionMap[repId]) {
        const rep = reps.find((r: any) => r.id === repId);
        commissionMap[repId] = {
          repId,
          rep,
          salesAmount: 0,
          marginAmount: 0,
          commissionAmount: 0,
          orderCount: 0,
        };
      }

      commissionMap[repId].salesAmount += salesAmount;
      commissionMap[repId].marginAmount += marginAmount;
      commissionMap[repId].commissionAmount += commissionAmount;
      commissionMap[repId].orderCount += 1;
    });

    setPreviewData(Object.values(commissionMap));
    setIsPreviewMode(true);
    setIsCalculating(false);
    }, 500);
  };

  // Save commissions
  const saveCommissions = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual commissions API endpoint when backend is ready
      const commissions = previewData.map((data: any) => ({
        userId: data.repId,
        period: formData.period,
        type: formData.commissionType,
        salesAmount: data.salesAmount,
        marginAmount: data.marginAmount,
        commissionAmount: data.commissionAmount,
        commissionRate: formData.commissionType === 'SALES_VOLUME' 
          ? formData.salesVolumeRate / 100 
          : formData.commissionType === 'MARGIN'
          ? formData.marginRate / 100
          : (formData.salesVolumeRate / 100) + (formData.marginRate / 100),
        status: 'CALCULATED',
      }));
      
      // For now, just simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return commissions;
    },
    onSuccess: () => {
      toast.success('Commissions calculated and saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      onCalculate();
      onClose();
    },
    onError: () => {
      toast.error('Failed to save commissions');
    },
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedCommission ? 'Commission Details' : 'Calculate Commissions'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors dark:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {selectedCommission ? (
            // Commission Details View
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Rep</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedCommission.rep 
                      ? `${selectedCommission.rep.firstName} ${selectedCommission.rep.lastName}`.trim()
                      : selectedCommission.rep?.email || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedCommission.period + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Amount</label>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${(selectedCommission.salesAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission Amount</label>
                  <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    ${(selectedCommission.commissionAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ) : isPreviewMode ? (
            // Preview Mode
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Preview of commissions to be calculated for {new Date(formData.period + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Sales Rep</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Orders</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Sales Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {previewData.map((data: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {data.rep 
                            ? `${data.rep.firstName} ${data.rep.lastName}`.trim()
                            : data.rep?.email || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {data.orderCount}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          ${data.salesAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-primary-600 dark:text-primary-400">
                          ${data.commissionAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Total</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        ${previewData.reduce((sum: number, d: any) => sum + d.salesAmount, 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-primary-600 dark:text-primary-400">
                        ${previewData.reduce((sum: number, d: any) => sum + d.commissionAmount, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsPreviewMode(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => saveCommissions.mutate()}
                  disabled={saveCommissions.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saveCommissions.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Save Commissions
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // Calculation Form
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period *</label>
                  <input
                    type="month"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Commission Type *</label>
                  <CustomSelect
                    value={formData.commissionType}
                    onChange={(value) => setFormData({ ...formData, commissionType: value })}
                    options={[
                      { value: 'SALES_VOLUME', label: 'Sales Volume' },
                      { value: 'MARGIN', label: 'Margin' },
                      { value: 'HYBRID', label: 'Hybrid' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.commissionType !== 'MARGIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sales Volume Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.salesVolumeRate}
                      onChange={(e) => setFormData({ ...formData, salesVolumeRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="5.0"
                    />
                  </div>
                )}
                {formData.commissionType !== 'SALES_VOLUME' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Margin Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.marginRate}
                      onChange={(e) => setFormData({ ...formData, marginRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="10.0"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.calculateForAll}
                    onChange={(e) => setFormData({ ...formData, calculateForAll: e.target.checked, selectedRepIds: [] })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Calculate for all sales reps</span>
                </label>

                {!formData.calculateForAll && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Sales Reps *
                    </label>
                    {reps.length === 0 ? (
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No sales reps available</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                        {reps.map((rep: any) => (
                          <label key={rep.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={formData.selectedRepIds.includes(rep.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, selectedRepIds: [...formData.selectedRepIds, rep.id] });
                                } else {
                                  setFormData({ ...formData, selectedRepIds: formData.selectedRepIds.filter((id: number) => id !== rep.id) });
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {`${rep.firstName || ''} ${rep.lastName || ''}`.trim() || rep.email}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={calculatePreview}
                  disabled={isCalculating || (!formData.calculateForAll && formData.selectedRepIds.length === 0)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isCalculating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Calculate Preview
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Commissions Section Component
function CommissionsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch sales reps
  const { data: repsData } = useQuery({
    queryKey: ['users', 'sales-reps'],
    queryFn: async () => {
      try {
        const response = await api.get('/users');
        return (response.data || []).filter((user: any) => user.role === 'SALES' || user.role === 'B2B');
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch commissions - using orders as placeholder until backend is ready
  const { data: commissionsData, isLoading } = useQuery({
    queryKey: ['commissions', searchQuery, periodFilter, typeFilter, statusFilter],
    queryFn: async () => {
      try {
        // TODO: Replace with actual commissions API endpoint when backend is ready
        const response = await api.get('/orders?skip=0&take=1000');
        const orders = response.data?.data || [];
        
        // Calculate commissions from orders (placeholder logic)
        const commissions = orders
          .filter((order: any) => order.userId && (order.status === 'FULFILLED' || order.status === 'DELIVERED'))
          .map((order: any) => {
            const salesAmount = parseFloat(order.totalAmount || 0);
            // Estimate margin at 30% (placeholder)
            const marginAmount = salesAmount * 0.3;
            const commissionRate = 0.05; // 5% placeholder
            const commissionAmount = salesAmount * commissionRate;
            
            return {
              id: order.id,
              userId: order.userId,
              rep: repsData?.find((r: any) => r.id === order.userId),
              period: new Date(order.orderDate).toISOString().slice(0, 7), // YYYY-MM
              type: 'SALES_VOLUME',
              salesAmount,
              marginAmount,
              commissionRate,
              commissionAmount,
              status: 'CALCULATED',
              orderDate: order.orderDate,
            };
          });
        
        // Group by user and period
        const grouped = commissions.reduce((acc: any, comm: any) => {
          const key = `${comm.userId}-${comm.period}`;
          if (!acc[key]) {
            acc[key] = {
              ...comm,
              orders: [comm],
            };
          } else {
            acc[key].salesAmount += comm.salesAmount;
            acc[key].marginAmount += comm.marginAmount;
            acc[key].commissionAmount += comm.commissionAmount;
            acc[key].orders.push(comm);
          }
          return acc;
        }, {});
        
        let result = Object.values(grouped);
        
        // Filter by period
        if (periodFilter !== 'all') {
          result = result.filter((c: any) => c.period === periodFilter);
        }
        
        // Filter by type
        if (typeFilter !== 'all') {
          result = result.filter((c: any) => c.type === typeFilter);
        }
        
        // Filter by status
        if (statusFilter !== 'all') {
          result = result.filter((c: any) => c.status === statusFilter);
        }
        
        // Filter by search query
        if (searchQuery) {
          result = result.filter((c: any) => {
            const repName = c.rep ? `${c.rep.firstName} ${c.rep.lastName}`.trim() : '';
            return (
              repName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.rep?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              c.period?.includes(searchQuery)
            );
          });
        }
        
        return result;
      } catch (error) {
        return [];
      }
    },
  });

  const commissions = commissionsData || [];

  // Generate period options (last 12 months)
  const periodOptions = [
    { value: 'all', label: 'All Periods' },
    ...Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      return { value: period, label };
    }),
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'CALCULATED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'PENDING':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search commissions..."
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
              Calculate Commissions
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Period</label>
              <CustomSelect
                value={periodFilter}
                onChange={(value) => setPeriodFilter(value)}
                options={periodOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
              <CustomSelect
                value={typeFilter}
                onChange={(value) => setTypeFilter(value)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'SALES_VOLUME', label: 'Sales Volume' },
                  { value: 'MARGIN', label: 'Margin' },
                  { value: 'HYBRID', label: 'Hybrid' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <CustomSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'CALCULATED', label: 'Calculated' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'PAID', label: 'Paid' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${commissions.reduce((sum: number, c: any) => sum + (c.salesAmount || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Margin</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${commissions.reduce((sum: number, c: any) => sum + (c.marginAmount || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Commissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${commissions.reduce((sum: number, c: any) => sum + (c.commissionAmount || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Reps with Commissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {new Set(commissions.map((c: any) => c.userId)).size}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Commissions Table */}
      {commissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No commissions found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || periodFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'No commission records available. Commissions are calculated from completed orders.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Sales Rep</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Sales Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Margin Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Commission Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Commission Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {commissions.map((commission: any) => {
                  const repName = commission.rep ? `${commission.rep.firstName} ${commission.rep.lastName}`.trim() : 'Unknown';
                  return (
                    <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {repName || commission.rep?.email || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(commission.period + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                          {commission.type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${(commission.salesAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${(commission.marginAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {((commission.commissionRate || 0) * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 dark:text-primary-400">
                        ${(commission.commissionAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(commission.status)}`}>
                          {commission.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedCommission(commission);
                            setIsModalOpen(true);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission Calculation Modal */}
      {isModalOpen && (
        <CalculateCommissionsModal
          isOpen={isModalOpen}
          onClose={() => {
                  setIsModalOpen(false);
                  setSelectedCommission(null);
                }}
          selectedCommission={selectedCommission}
          reps={repsData || []}
          onCalculate={() => {
            queryClient.invalidateQueries({ queryKey: ['commissions'] });
            setIsModalOpen(false);
            setSelectedCommission(null);
          }}
        />
      )}
    </div>
  );
}
