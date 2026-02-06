import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Search,
  Filter,
  ChevronDown,
  Settings,
  FileText,
  RefreshCw,
  CheckCircle,
  X,
  Eye,
  AlertCircle,
  Clock,
  Database,
  MapPin,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'mapping' | 'sync-logs';
type SyncStatus = 'success' | 'failed' | 'in-progress' | 'pending';
type MappingStatus = 'active' | 'inactive' | 'pending';

export default function AccountingIntegrations() {
  const [activeTab, setActiveTab] = useState<TabType>('mapping');

  const tabs = [
    { id: 'mapping' as TabType, label: 'Visma/eAccounting Mapping', icon: MapPin },
    { id: 'sync-logs' as TabType, label: 'Sync Logs', icon: FileText },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Accounting Integrations" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Accounting Integrations</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Visma/eAccounting mapping and sync logs management
            </p>
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
      <div>
        {activeTab === 'mapping' && <VismaMappingSection />}
        {activeTab === 'sync-logs' && <SyncLogsSection />}
      </div>
    </div>
  );
}

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

function CustomDropdown({ value, onChange, options, placeholder }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-between cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'hover:border-gray-400 dark:hover:border-gray-500'
          }`}
      >
        <span>{selectedOption?.label || placeholder || 'Select...'}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${option.value === value
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Visma/eAccounting Mapping Section
function VismaMappingSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMapping, setSelectedMapping] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Common accounting fields
  const accountingFields = [
    { id: 'customer', label: 'Customer', type: 'entity' },
    { id: 'supplier', label: 'Supplier', type: 'entity' },
    { id: 'product', label: 'Product', type: 'entity' },
    { id: 'invoice', label: 'Invoice', type: 'document' },
    { id: 'credit-note', label: 'Credit Note', type: 'document' },
    { id: 'payment', label: 'Payment', type: 'transaction' },
    { id: 'tax-code', label: 'Tax Code', type: 'reference' },
    { id: 'account', label: 'Account', type: 'reference' },
    { id: 'cost-center', label: 'Cost Center', type: 'reference' },
    { id: 'project', label: 'Project', type: 'reference' },
  ];

  // Visma/eAccounting fields
  const vismaFields = [
    { id: 'customer-id', label: 'Customer ID', category: 'customer' },
    { id: 'customer-name', label: 'Customer Name', category: 'customer' },
    { id: 'supplier-id', label: 'Supplier ID', category: 'supplier' },
    { id: 'supplier-name', label: 'Supplier Name', category: 'supplier' },
    { id: 'product-code', label: 'Product Code', category: 'product' },
    { id: 'product-name', label: 'Product Name', category: 'product' },
    { id: 'invoice-number', label: 'Invoice Number', category: 'invoice' },
    { id: 'invoice-date', label: 'Invoice Date', category: 'invoice' },
    { id: 'invoice-amount', label: 'Invoice Amount', category: 'invoice' },
    { id: 'tax-amount', label: 'Tax Amount', category: 'invoice' },
    { id: 'account-code', label: 'Account Code', category: 'account' },
    { id: 'tax-code', label: 'Tax Code', category: 'tax' },
  ];

  // Load mappings from localStorage
  const [mappings, setMappings] = useState<any[]>(() => {
    const saved = localStorage.getItem('visma-mappings');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default mappings
    return [
      {
        id: 1,
        name: 'Customer Mapping',
        sourceField: 'customer',
        targetField: 'customer-id',
        status: 'active' as MappingStatus,
        syncDirection: 'bidirectional',
        transformation: 'none',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Invoice Mapping',
        sourceField: 'invoice',
        targetField: 'invoice-number',
        status: 'active' as MappingStatus,
        syncDirection: 'export',
        transformation: 'none',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Product Mapping',
        sourceField: 'product',
        targetField: 'product-code',
        status: 'active' as MappingStatus,
        syncDirection: 'bidirectional',
        transformation: 'uppercase',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save mappings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('visma-mappings', JSON.stringify(mappings));
  }, [mappings]);

  // Filter mappings
  const filteredMappings = useMemo(() => {
    let filtered = mappings;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((mapping: any) =>
        mapping.name.toLowerCase().includes(query) ||
        mapping.sourceField.toLowerCase().includes(query) ||
        mapping.targetField.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((mapping: any) => mapping.status === statusFilter);
    }

    // Sort by name
    return filtered.sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [mappings, searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredMappings.length;
    const active = filteredMappings.filter((mapping: any) => mapping.status === 'active');
    const inactive = filteredMappings.filter((mapping: any) => mapping.status === 'inactive');
    const pending = filteredMappings.filter((mapping: any) => mapping.status === 'pending');

    return {
      total,
      active: active.length,
      inactive: inactive.length,
      pending: pending.length,
    };
  }, [filteredMappings]);

  const handleCreateMapping = (mappingData: any) => {
    const newMapping = {
      id: Date.now(),
      ...mappingData,
      createdAt: new Date().toISOString(),
    };
    setMappings([...mappings, newMapping]);
    setShowCreateModal(false);
    toast.success('Mapping created successfully!');
  };

  const handleUpdateMapping = (mappingId: number, updates: any) => {
    setMappings(mappings.map((m: any) =>
      m.id === mappingId ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
    ));
    toast.success('Mapping updated successfully!');
  };

  const handleDeleteMapping = (mappingId: number) => {
    setMappings(mappings.filter((m: any) => m.id !== mappingId));
    toast.success('Mapping deleted successfully!');
  };

  const getStatusColor = (status: MappingStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Mappings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.active}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                {summaryMetrics.inactive}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by mapping name, source field, target field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              New Mapping
            </button>
          </div>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Mapping Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Source Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Target Field
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Sync Direction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <MapPin className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No mappings found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first mapping to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMappings.map((mapping: any) => (
                  <tr
                    key={mapping.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setSelectedMapping(mapping)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {mapping.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {accountingFields.find((f) => f.id === mapping.sourceField)?.label || mapping.sourceField}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {vismaFields.find((f) => f.id === mapping.targetField)?.label || mapping.targetField}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {mapping.syncDirection}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(mapping.status)}`}>
                        {mapping.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMapping(mapping);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Mapping Modal */}
      {showCreateModal && (
        <CreateMappingModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateMapping}
          accountingFields={accountingFields}
          vismaFields={vismaFields}
        />
      )}

      {/* Mapping Details Modal */}
      {selectedMapping && (
        <MappingDetailsModal
          mapping={selectedMapping}
          onClose={() => setSelectedMapping(null)}
          onUpdate={handleUpdateMapping}
          onDelete={handleDeleteMapping}
          accountingFields={accountingFields}
          vismaFields={vismaFields}
        />
      )}
    </div>
  );
}

// Create Mapping Modal
interface CreateMappingModalProps {
  onClose: () => void;
  onCreate: (mappingData: any) => void;
  accountingFields: any[];
  vismaFields: any[];
}

function CreateMappingModal({ onClose, onCreate, accountingFields, vismaFields }: CreateMappingModalProps) {
  const [name, setName] = useState('');
  const [sourceField, setSourceField] = useState('');
  const [targetField, setTargetField] = useState('');
  const [syncDirection, setSyncDirection] = useState('bidirectional');
  const [transformation, setTransformation] = useState('none');
  const [status, setStatus] = useState<MappingStatus>('pending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sourceField || !targetField) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      name: name.trim(),
      sourceField,
      targetField,
      syncDirection,
      transformation,
      status,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Mapping</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mapping Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Customer ID Mapping"
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Field (System) <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={sourceField}
                onChange={setSourceField}
                options={accountingFields.map((field) => ({
                  value: field.id,
                  label: field.label,
                }))}
                placeholder="Select source field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Field (Visma/eAccounting) <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={targetField}
                onChange={setTargetField}
                options={vismaFields.map((field) => ({
                  value: field.id,
                  label: field.label,
                }))}
                placeholder="Select target field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync Direction
              </label>
              <CustomDropdown
                value={syncDirection}
                onChange={setSyncDirection}
                options={[
                  { value: 'export', label: 'Export Only' },
                  { value: 'import', label: 'Import Only' },
                  { value: 'bidirectional', label: 'Bidirectional' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transformation
              </label>
              <CustomDropdown
                value={transformation}
                onChange={setTransformation}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'uppercase', label: 'Uppercase' },
                  { value: 'lowercase', label: 'Lowercase' },
                  { value: 'trim', label: 'Trim' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <CustomDropdown
              value={status}
              onChange={(value) => setStatus(value as MappingStatus)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Mapping
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Mapping Details Modal
interface MappingDetailsModalProps {
  mapping: any;
  onClose: () => void;
  onUpdate: (mappingId: number, updates: any) => void;
  onDelete: (mappingId: number) => void;
  accountingFields: any[];
  vismaFields: any[];
}

function MappingDetailsModal({ mapping, onClose, onUpdate, onDelete, accountingFields, vismaFields }: MappingDetailsModalProps) {
  const [name, setName] = useState(mapping.name);
  const [sourceField, setSourceField] = useState(mapping.sourceField);
  const [targetField, setTargetField] = useState(mapping.targetField);
  const [syncDirection, setSyncDirection] = useState(mapping.syncDirection);
  const [transformation, setTransformation] = useState(mapping.transformation);
  const [status, setStatus] = useState<MappingStatus>(mapping.status);

  const handleSave = () => {
    onUpdate(mapping.id, {
      name: name.trim(),
      sourceField,
      targetField,
      syncDirection,
      transformation,
      status,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this mapping?')) {
      onDelete(mapping.id);
      onClose();
    }
  };

  const getStatusColor = (status: MappingStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mapping Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mapping.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(status)}`}>
              {status}
            </span>
          </div>

          {/* Mapping Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mapping Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Source Field (System)
                </label>
                <CustomDropdown
                  value={sourceField}
                  onChange={setSourceField}
                  options={accountingFields.map((field) => ({
                    value: field.id,
                    label: field.label,
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Field (Visma/eAccounting)
                </label>
                <CustomDropdown
                  value={targetField}
                  onChange={setTargetField}
                  options={vismaFields.map((field) => ({
                    value: field.id,
                    label: field.label,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sync Direction
                </label>
                <CustomDropdown
                  value={syncDirection}
                  onChange={setSyncDirection}
                  options={[
                    { value: 'export', label: 'Export Only' },
                    { value: 'import', label: 'Import Only' },
                    { value: 'bidirectional', label: 'Bidirectional' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transformation
                </label>
                <CustomDropdown
                  value={transformation}
                  onChange={setTransformation}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'uppercase', label: 'Uppercase' },
                    { value: 'lowercase', label: 'Lowercase' },
                    { value: 'trim', label: 'Trim' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as MappingStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(mapping.createdAt).toLocaleString()}
              </span>
            </div>
            {mapping.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(mapping.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sync Logs Section
function SyncLogsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Load sync logs from localStorage
  const [syncLogs, setSyncLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('sync-logs');
    if (saved) {
      return JSON.parse(saved);
    }
    // Generate default sync logs
    const logs = [];
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const date = new Date(now);
      date.setHours(date.getHours() - i);
      const statuses: SyncStatus[] = ['success', 'failed', 'in-progress', 'pending'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      logs.push({
        id: i + 1,
        syncType: ['customer', 'invoice', 'product', 'payment'][Math.floor(Math.random() * 4)],
        status,
        recordsProcessed: Math.floor(Math.random() * 1000),
        recordsFailed: status === 'failed' ? Math.floor(Math.random() * 50) : 0,
        startedAt: date.toISOString(),
        completedAt: status === 'in-progress' || status === 'pending' ? null : new Date(date.getTime() + Math.random() * 3600000).toISOString(),
        errorMessage: status === 'failed' ? 'Connection timeout' : null,
        mappingId: Math.floor(Math.random() * 3) + 1,
      });
    }
    return logs;
  });

  // Save sync logs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sync-logs', JSON.stringify(syncLogs));
  }, [syncLogs]);

  // Filter sync logs
  const filteredLogs = useMemo(() => {
    let filtered = syncLogs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log: any) =>
        log.syncType.toLowerCase().includes(query) ||
        log.errorMessage?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((log: any) => log.status === statusFilter);
    }

    // Sort by startedAt (newest first)
    return filtered.sort((a: any, b: any) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [syncLogs, searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter((log: any) => log.status === 'success');
    const failed = filteredLogs.filter((log: any) => log.status === 'failed');
    const inProgress = filteredLogs.filter((log: any) => log.status === 'in-progress');
    const totalRecords = filteredLogs.reduce((sum: number, log: any) => sum + log.recordsProcessed, 0);

    return {
      total,
      success: success.length,
      failed: failed.length,
      inProgress: inProgress.length,
      totalRecords,
    };
  }, [filteredLogs]);

  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case 'success':
        return CheckCircle;
      case 'failed':
        return X;
      case 'in-progress':
        return RefreshCw;
      case 'pending':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Syncs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.success}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.failed}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <X className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.inProgress}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Records Processed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalRecords.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by sync type, error message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'success', label: 'Success' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
            <button
              onClick={() => {
                // Refresh sync logs
                const now = new Date();
                const newLog = {
                  id: Date.now(),
                  syncType: ['customer', 'invoice', 'product', 'payment'][Math.floor(Math.random() * 4)],
                  status: 'in-progress' as SyncStatus,
                  recordsProcessed: 0,
                  recordsFailed: 0,
                  startedAt: now.toISOString(),
                  completedAt: null,
                  errorMessage: null,
                  mappingId: Math.floor(Math.random() * 3) + 1,
                };
                setSyncLogs([newLog, ...syncLogs]);
                toast.success('Sync started');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Start Sync
            </button>
          </div>
        </div>
      </div>

      {/* Sync Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Sync Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Records Processed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Records Failed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Started At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Completed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No sync logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any) => {
                  const StatusIcon = getStatusIcon(log.status);
                  const duration = log.completedAt
                    ? Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                    : null;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${log.status === 'success' ? 'text-green-600 dark:text-green-400' : log.status === 'failed' ? 'text-red-600 dark:text-red-400' : log.status === 'in-progress' ? 'text-blue-600 dark:text-blue-400 animate-spin' : 'text-yellow-600 dark:text-yellow-400'}`} />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {log.syncType}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.recordsProcessed.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${log.recordsFailed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {log.recordsFailed.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(log.startedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.completedAt ? new Date(log.completedAt).toLocaleString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {duration !== null ? `${duration}s` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync Log Details Modal */}
      {selectedLog && (
        <SyncLogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

// Sync Log Details Modal
interface SyncLogDetailsModalProps {
  log: any;
  onClose: () => void;
}

function SyncLogDetailsModal({ log, onClose }: SyncLogDetailsModalProps) {
  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case 'success':
        return CheckCircle;
      case 'failed':
        return X;
      case 'in-progress':
        return RefreshCw;
      case 'pending':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const StatusIcon = getStatusIcon(log.status);
  const duration = log.completedAt
    ? Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
    : null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sync Log Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
              {log.syncType} Sync
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${log.status === 'success' ? 'text-green-600 dark:text-green-400' : log.status === 'failed' ? 'text-red-600 dark:text-red-400' : log.status === 'in-progress' ? 'text-blue-600 dark:text-blue-400 animate-spin' : 'text-yellow-600 dark:text-yellow-400'}`} />
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(log.status)}`}>
                {log.status}
              </span>
            </div>
          </div>

          {/* Sync Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync Type
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white capitalize">
                {log.syncType}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mapping ID
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {log.mappingId}
              </div>
            </div>
          </div>

          {/* Records Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Records Processed
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {log.recordsProcessed.toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Records Failed
              </label>
              <div className={`px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm ${log.recordsFailed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {log.recordsFailed.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Timing Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Started At
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {new Date(log.startedAt).toLocaleString()}
              </div>
            </div>

            {log.completedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Completed At
                </label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                  {new Date(log.completedAt).toLocaleString()}
                </div>
              </div>
            )}

            {duration !== null && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration
                </label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                  {duration} seconds
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {log.errorMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Message
              </label>
              <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {log.errorMessage}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
