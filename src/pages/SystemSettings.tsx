import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Eye,
  X,
  CheckCircle,
  Trash2,
  Hash,
  Receipt,
  Warehouse,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'sku-ean-rules' | 'tax-defaults' | 'warehouse-defaults';
type RuleType = 'sku' | 'ean' | 'barcode';
type RuleStatus = 'active' | 'inactive';
type TaxType = 'vat' | 'sales-tax' | 'gst';
type WarehouseStatus = 'active' | 'inactive';

interface NumberingRule {
  id: string | number;
  name: string;
  type: RuleType;
  prefix: string;
  suffix: string;
  length: number;
  sequenceStart: number;
  currentSequence: number;
  format: string;
  status: RuleStatus;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface TaxDefault {
  id: string | number;
  name: string;
  type: TaxType;
  rate: number;
  country: string;
  region?: string;
  isDefault: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface WarehouseDefault {
  id: string | number;
  name: string;
  code: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  status: WarehouseStatus;
  capacity?: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
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

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('sku-ean-rules');

  const tabs = [
    { id: 'sku-ean-rules' as TabType, label: 'SKU/EAN Numbering Rules', icon: Hash },
    { id: 'tax-defaults' as TabType, label: 'Tax Defaults', icon: Receipt },
    { id: 'warehouse-defaults' as TabType, label: 'Warehouse Defaults', icon: Warehouse },
  ];

  return (
    <div>
      <Breadcrumb currentPage="System Settings" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">System Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage SKU/EAN numbering rules, tax defaults, and warehouse defaults
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
        {activeTab === 'sku-ean-rules' && <SKUEANRulesSection />}
        {activeTab === 'tax-defaults' && <TaxDefaultsSection />}
        {activeTab === 'warehouse-defaults' && <WarehouseDefaultsSection />}
      </div>
    </div>
  );
}

// SKU/EAN Numbering Rules Section
function SKUEANRulesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ruleToView, setRuleToView] = useState<NumberingRule | null>(null);
  const [ruleToEdit, setRuleToEdit] = useState<NumberingRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<NumberingRule | null>(null);
  const [isDeleteRuleModalShowing, setIsDeleteRuleModalShowing] = useState(false);

  // Load rules from localStorage
  const [rules, setRules] = useState<NumberingRule[]>(() => {
    const saved = localStorage.getItem('system-settings-numbering-rules');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default rules
    return [
      {
        id: 1,
        name: 'Standard SKU Rule',
        type: 'sku' as RuleType,
        prefix: 'SKU',
        suffix: '',
        length: 8,
        sequenceStart: 1000,
        currentSequence: 1542,
        format: '{prefix}-{sequence}',
        status: 'active' as RuleStatus,
        description: 'Standard SKU numbering rule',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'EAN-13 Barcode Rule',
        type: 'ean' as RuleType,
        prefix: '',
        suffix: '',
        length: 13,
        sequenceStart: 1000000000000,
        currentSequence: 1000000001234,
        format: '{sequence}',
        status: 'active' as RuleStatus,
        description: 'EAN-13 barcode numbering rule',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Product Barcode Rule',
        type: 'barcode' as RuleType,
        prefix: 'PRD',
        suffix: '',
        length: 10,
        sequenceStart: 1,
        currentSequence: 456,
        format: '{prefix}-{sequence}',
        status: 'inactive' as RuleStatus,
        description: 'Product barcode numbering rule',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('system-settings-numbering-rules', JSON.stringify(rules));
  }, [rules]);

  // Filter rules
  const filteredRules = useMemo(() => {
    let filtered = rules;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((rule) =>
        rule.name.toLowerCase().includes(query) ||
        rule.type.toLowerCase().includes(query) ||
        rule.prefix.toLowerCase().includes(query) ||
        rule.format.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((rule) => rule.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((rule) => rule.status === statusFilter);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [rules, searchQuery, typeFilter, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((rule) => rule.status === 'active');
    const skuRules = rules.filter((rule) => rule.type === 'sku');
    const eanRules = rules.filter((rule) => rule.type === 'ean');

    return {
      total,
      active: active.length,
      skuRules: skuRules.length,
      eanRules: eanRules.length,
    };
  }, [rules]);

  const handleCreateRule = (ruleData: any) => {
    const newRule: NumberingRule = {
      id: Date.now(),
      ...ruleData,
      currentSequence: ruleData.sequenceStart,
      createdAt: new Date().toISOString(),
    };
    setRules([...rules, newRule]);
    setShowCreateModal(false);
    toast.success('Numbering rule created successfully!');
  };

  const handleUpdateRule = (ruleId: string | number, updates: any) => {
    setRules(rules.map((rule) =>
      rule.id === ruleId
        ? { ...rule, ...updates, updatedAt: new Date().toISOString() }
        : rule
    ));
    toast.success('Numbering rule updated successfully!');
  };

  const handleDeleteRule = (ruleId: string | number) => {
    setRules(rules.filter((rule) => rule.id !== ruleId));
    toast.success('Numbering rule deleted successfully!');
    setIsDeleteRuleModalShowing(false);
    setRuleToDelete(null);
  };

  const handleConfirmDeleteRule = () => {
    if (ruleToDelete) {
      handleDeleteRule(ruleToDelete.id);
    }
  };

  const generateExample = (rule: NumberingRule) => {
    const sequence = rule.currentSequence.toString().padStart(rule.length - (rule.prefix.length + rule.suffix.length), '0');
    return rule.format
      .replace('{prefix}', rule.prefix)
      .replace('{suffix}', rule.suffix)
      .replace('{sequence}', sequence);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rules</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Hash className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Rules</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400">SKU Rules</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.skuRules}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Hash className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">EAN Rules</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.eanRules}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Hash className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by rule name, type, or format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 text-[14px] ::placeholder-[12px] pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'sku', label: 'SKU' },
                  { value: 'ean', label: 'EAN' },
                  { value: 'barcode', label: 'Barcode' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Rule Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Example
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Current Sequence
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
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Hash className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No numbering rules found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first numbering rule to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setRuleToView(rule)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {rule.name}
                      </div>
                      {rule.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {rule.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.type === 'sku'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : rule.type === 'ean'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {rule.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {rule.format}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                        {generateExample(rule)}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {rule.currentSequence.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {rule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRuleToView(rule);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRuleToEdit(rule);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRuleToDelete(rule);
                            setIsDeleteRuleModalShowing(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Rule Modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRule}
        />
      )}

      {/* Rule Details Modal */}
      {/* Rule View Modal */}
      {ruleToView && (
        <RuleViewModal
          rule={ruleToView}
          onClose={() => setRuleToView(null)}
        />
      )}

      {/* Rule Edit Modal */}
      {ruleToEdit && (
        <RuleEditModal
          rule={ruleToEdit}
          onClose={() => setRuleToEdit(null)}
          onUpdate={handleUpdateRule}
        />
      )}

      {/* Delete Rule Modal */}
      {ruleToDelete && (
        <DeleteRuleModal
          rule={ruleToDelete}
          onClose={() => {
            setIsDeleteRuleModalShowing(false);
            setRuleToDelete(null);
          }}
          onConfirm={handleConfirmDeleteRule}
          isShowing={isDeleteRuleModalShowing}
        />
      )}
    </div>
  );
}

// Rule View Modal (Read-only)
interface RuleViewModalProps {
  rule: NumberingRule;
  onClose: () => void;
}

function RuleViewModal({ rule, onClose }: RuleViewModalProps) {
  const generateExample = (rule: NumberingRule) => {
    const sequence = rule.currentSequence.toString().padStart(rule.length - (rule.prefix.length + rule.suffix.length), '0');
    return rule.format
      .replace('{prefix}', rule.prefix)
      .replace('{sequence}', sequence)
      .replace('{suffix}', rule.suffix);
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Numbering Rule Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rule.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {rule.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {rule.type.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prefix
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white font-mono">
                {rule.prefix || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suffix
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white font-mono">
                {rule.suffix || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Length
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {rule.length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white font-mono">
                {rule.format}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Example
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white font-mono">
                {generateExample(rule)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Sequence
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {rule.currentSequence.toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  rule.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {rule.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white min-h-[80px]">
                {rule.description}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6 text-[14px]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Rule Modal
interface CreateRuleModalProps {
  onClose: () => void;
  onCreate: (ruleData: any) => void;
}

function CreateRuleModal({ onClose, onCreate }: CreateRuleModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<RuleType>('sku');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [length, setLength] = useState(8);
  const [sequenceStart, setSequenceStart] = useState(1);
  const [format, setFormat] = useState('{prefix}-{sequence}');
  const [status, setStatus] = useState<RuleStatus>('active');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a rule name');
      return;
    }
    onCreate({
      name: name.trim(),
      type,
      prefix: prefix.trim(),
      suffix: suffix.trim(),
      length,
      sequenceStart,
      format: format.trim(),
      status,
      description: description.trim(),
    });
  };

  const updateFormat = () => {
    let newFormat = '';
    if (prefix) newFormat += '{prefix}';
    if (prefix && (suffix || true)) newFormat += '-';
    newFormat += '{sequence}';
    if (suffix) newFormat += '-' + '{suffix}';
    setFormat(newFormat);
  };

  useEffect(() => {
    updateFormat();
  }, [prefix, suffix]);

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
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New Numbering Rule</h2>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard SKU Rule"
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={type}
                onChange={(value) => setType(value as RuleType)}
                options={[
                  { value: 'sku', label: 'SKU' },
                  { value: 'ean', label: 'EAN' },
                  { value: 'barcode', label: 'Barcode' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as RuleStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="e.g., SKU"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suffix
              </label>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value.toUpperCase())}
                placeholder="e.g., END"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Length <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value) || 8)}
                min={1}
                max={20}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sequence Start <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={sequenceStart}
                onChange={(e) => setSequenceStart(parseInt(e.target.value) || 1)}
                min={0}
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format Pattern <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="e.g., {prefix}-{sequence}"
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use {'{prefix}'}, {'{suffix}'}, and {'{sequence}'} as placeholders
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this numbering rule..."
              rows={3}
              className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              Create Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Rule Edit Modal
interface RuleEditModalProps {
  rule: NumberingRule;
  onClose: () => void;
  onUpdate: (ruleId: string | number, updates: any) => void;
}

function RuleEditModal({ rule, onClose, onUpdate }: RuleEditModalProps) {
  const [name, setName] = useState(rule.name);
  const [type, setType] = useState<RuleType>(rule.type);
  const [prefix, setPrefix] = useState(rule.prefix);
  const [suffix, setSuffix] = useState(rule.suffix);
  const [length, setLength] = useState(rule.length);
  const [currentSequence, setCurrentSequence] = useState(rule.currentSequence);
  const [format, setFormat] = useState(rule.format);
  const [status, setStatus] = useState<RuleStatus>(rule.status);
  const [description, setDescription] = useState(rule.description || '');

  const generateExample = () => {
    const sequence = currentSequence.toString().padStart(length - (prefix.length + suffix.length), '0');
    return format
      .replace('{prefix}', prefix)
      .replace('{suffix}', suffix)
      .replace('{sequence}', sequence);
  };

  const handleSave = () => {
    onUpdate(rule.id, {
      name: name.trim(),
      type,
      prefix: prefix.trim(),
      suffix: suffix.trim(),
      length,
      currentSequence,
      format: format.trim(),
      status,
      description: description.trim(),
    });
    onClose();
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Numbering Rule Details</h2>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">{rule.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rule Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard SKU Rule"
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <CustomDropdown
                value={type}
                onChange={(value) => setType(value as RuleType)}
                options={[
                  { value: 'sku', label: 'SKU' },
                  { value: 'ean', label: 'EAN' },
                  { value: 'barcode', label: 'Barcode' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as RuleStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="e.g., SKU"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suffix
              </label>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value.toUpperCase())}
                placeholder="e.g., END"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Length
              </label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value) || 8)}
                min={1}
                max={20}
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Sequence
              </label>
              <input
                type="number"
                value={currentSequence}
                onChange={(e) => setCurrentSequence(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format Pattern
            </label>
            <input
              type="text"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="e.g., {prefix}-{sequence}"
              className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Example: <code className="bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">{generateExample()}</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the purpose of this numbering rule..."
              className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(rule.createdAt).toLocaleString()}
              </span>
            </div>
            {rule.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(rule.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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

// Delete Rule Modal Component
function DeleteRuleModal({
  rule,
  onClose,
  onConfirm,
  isShowing,
}: {
  rule: NumberingRule;
  onClose: () => void;
  onConfirm: () => void;
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
        aria-labelledby="deleteRuleModalLabel"
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
              <h5 id="deleteRuleModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
                Delete Numbering Rule
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{rule.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3 px-6 pb-6 text-[14px]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Tax Defaults Section
function TaxDefaultsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taxToView, setTaxToView] = useState<TaxDefault | null>(null);
  const [taxToEdit, setTaxToEdit] = useState<TaxDefault | null>(null);
  const [taxToDelete, setTaxToDelete] = useState<TaxDefault | null>(null);
  const [isDeleteTaxModalShowing, setIsDeleteTaxModalShowing] = useState(false);

  // Load tax defaults from localStorage
  const [taxDefaults, setTaxDefaults] = useState<TaxDefault[]>(() => {
    const saved = localStorage.getItem('system-settings-tax-defaults');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default tax defaults
    return [
      {
        id: 1,
        name: 'Standard VAT',
        type: 'vat' as TaxType,
        rate: 20.0,
        country: 'United Kingdom',
        region: 'England',
        isDefault: true,
        description: 'Standard VAT rate for UK',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'US Sales Tax',
        type: 'sales-tax' as TaxType,
        rate: 8.5,
        country: 'United States',
        region: 'California',
        isDefault: false,
        description: 'Sales tax for California',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'GST Australia',
        type: 'gst' as TaxType,
        rate: 10.0,
        country: 'Australia',
        isDefault: false,
        description: 'GST for Australia',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('system-settings-tax-defaults', JSON.stringify(taxDefaults));
  }, [taxDefaults]);

  // Filter tax defaults
  const filteredTaxes = useMemo(() => {
    let filtered = taxDefaults;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((tax) =>
        tax.name.toLowerCase().includes(query) ||
        tax.country.toLowerCase().includes(query) ||
        tax.type.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((tax) => tax.type === typeFilter);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [taxDefaults, searchQuery, typeFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = taxDefaults.length;
    const defaults = taxDefaults.filter((tax) => tax.isDefault);
    const vatTaxes = taxDefaults.filter((tax) => tax.type === 'vat');
    const avgRate = taxDefaults.reduce((sum, tax) => sum + tax.rate, 0) / taxDefaults.length;

    return {
      total,
      defaults: defaults.length,
      vatTaxes: vatTaxes.length,
      avgRate: avgRate.toFixed(2),
    };
  }, [taxDefaults]);

  const handleCreateTax = (taxData: any) => {
    // If this is set as default, unset other defaults
    if (taxData.isDefault) {
      setTaxDefaults(taxDefaults.map((tax) => ({ ...tax, isDefault: false })));
    }
    const newTax: TaxDefault = {
      id: Date.now(),
      ...taxData,
      createdAt: new Date().toISOString(),
    };
    setTaxDefaults([...taxDefaults, newTax]);
    setShowCreateModal(false);
    toast.success('Tax default created successfully!');
  };

  const handleUpdateTax = (taxId: string | number, updates: any) => {
    // If this is set as default, unset other defaults
    if (updates.isDefault) {
      setTaxDefaults(taxDefaults.map((tax) =>
        tax.id === taxId ? { ...tax, ...updates } : { ...tax, isDefault: false }
      ));
    } else {
      setTaxDefaults(taxDefaults.map((tax) =>
        tax.id === taxId
          ? { ...tax, ...updates, updatedAt: new Date().toISOString() }
          : tax
      ));
    }
    toast.success('Tax default updated successfully!');
  };

  const handleDeleteTax = (taxId: string | number) => {
    setTaxDefaults(taxDefaults.filter((tax) => tax.id !== taxId));
    toast.success('Tax default deleted successfully!');
    setIsDeleteTaxModalShowing(false);
    setTaxToDelete(null);
  };

  const handleConfirmDeleteTax = () => {
    if (taxToDelete) {
      handleDeleteTax(taxToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tax Rules</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Default Rules</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.defaults}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">VAT Rules</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.vatTaxes}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.avgRate}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, country, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[14px] ::placeholder-[12px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'vat', label: 'VAT' },
                  { value: 'sales-tax', label: 'Sales Tax' },
                  { value: 'gst', label: 'GST' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Tax Default
            </button>
          </div>
        </div>
      </div>

      {/* Tax Defaults Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Tax Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Default
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTaxes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Receipt className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No tax defaults found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first tax default to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTaxes.map((tax) => (
                  <tr
                    key={tax.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setTaxToView(tax)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tax.name}
                      </div>
                      {tax.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {tax.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tax.type === 'vat'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : tax.type === 'sales-tax'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {tax.type === 'vat' ? 'VAT' : tax.type === 'sales-tax' ? 'Sales Tax' : 'GST'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tax.rate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tax.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tax.region || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tax.isDefault ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Default
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaxToView(tax);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaxToEdit(tax);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaxToDelete(tax);
                            setIsDeleteTaxModalShowing(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Tax Default Modal */}
      {showCreateModal && (
        <CreateTaxModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTax}
        />
      )}

      {/* Tax View Modal */}
      {taxToView && (
        <TaxViewModal
          tax={taxToView}
          onClose={() => setTaxToView(null)}
        />
      )}

      {/* Tax Edit Modal */}
      {taxToEdit && (
        <TaxEditModal
          tax={taxToEdit}
          onClose={() => setTaxToEdit(null)}
          onUpdate={handleUpdateTax}
        />
      )}

      {/* Delete Tax Modal */}
      {taxToDelete && (
        <DeleteTaxModal
          tax={taxToDelete}
          onClose={() => {
            setIsDeleteTaxModalShowing(false);
            setTaxToDelete(null);
          }}
          onConfirm={handleConfirmDeleteTax}
          isShowing={isDeleteTaxModalShowing}
        />
      )}
    </div>
  );
}

// Create Tax Modal
interface CreateTaxModalProps {
  onClose: () => void;
  onCreate: (taxData: any) => void;
}

function CreateTaxModal({ onClose, onCreate }: CreateTaxModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TaxType>('vat');
  const [rate, setRate] = useState(0);
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [description, setDescription] = useState('');

  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
    'Italy', 'Spain', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Poland', 'Portugal', 'Greece', 'Ireland', 'Austria', 'Switzerland',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !country.trim() || rate <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      name: name.trim(),
      type,
      rate: parseFloat(rate.toString()),
      country: country.trim(),
      region: region.trim(),
      isDefault,
      description: description.trim(),
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
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New Tax Default</h2>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tax Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard VAT"
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-[14px]">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={type}
                onChange={(value) => setType(value as TaxType)}
                options={[
                  { value: 'vat', label: 'VAT' },
                  { value: 'sales-tax', label: 'Sales Tax' },
                  { value: 'gst', label: 'GST' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step={0.01}
                placeholder="e.g., 20.0"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={country}
                onChange={setCountry}
                options={[
                  { value: '', label: 'Select country...' },
                  ...countries.map((c) => ({ value: c, label: c })),
                ]}
                placeholder="Select country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., California"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Set as default tax</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the tax default..."
              rows={3}
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              Create Tax Default
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tax View Modal (Read-only)
interface TaxViewModalProps {
  tax: TaxDefault;
  onClose: () => void;
}

function TaxViewModal({ tax, onClose }: TaxViewModalProps) {
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Tax Default Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tax.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {tax.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  tax.type === 'vat' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  tax.type === 'sales-tax' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                }`}>
                  {tax.type === 'vat' ? 'VAT' : tax.type === 'sales-tax' ? 'Sales Tax' : 'GST'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rate
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {tax.rate}%
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {tax.country}
              </div>
            </div>
          </div>

          {tax.region && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {tax.region}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
              {tax.isDefault ? (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Default
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">-</span>
              )}
            </div>
          </div>

          {tax.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white min-h-[80px]">
                {tax.description}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6 text-[14px]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Tax Edit Modal
interface TaxEditModalProps {
  tax: TaxDefault;
  onClose: () => void;
  onUpdate: (taxId: string | number, updates: any) => void;
}

function TaxEditModal({ tax, onClose, onUpdate }: TaxEditModalProps) {
  const [name, setName] = useState(tax.name);
  const [type, setType] = useState<TaxType>(tax.type);
  const [rate, setRate] = useState(tax.rate);
  const [country, setCountry] = useState(tax.country);
  const [region, setRegion] = useState(tax.region || '');
  const [isDefault, setIsDefault] = useState(tax.isDefault);
  const [description, setDescription] = useState(tax.description || '');

  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
    'Italy', 'Spain', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Poland', 'Portugal', 'Greece', 'Ireland', 'Austria', 'Switzerland',
  ];

  const handleSave = () => {
    onUpdate(tax.id, {
      name: name.trim(),
      type,
      rate: parseFloat(rate.toString()),
      country: country.trim(),
      region: region.trim(),
      isDefault,
      description: description.trim(),
    });
    onClose();
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Tax Default Details</h2>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">{tax.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tax Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard VAT"
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <CustomDropdown
                value={type}
                onChange={(value) => setType(value as TaxType)}
                options={[
                  { value: 'vat', label: 'VAT' },
                  { value: 'sales-tax', label: 'Sales Tax' },
                  { value: 'gst', label: 'GST' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rate (%)
              </label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step={0.01}
                placeholder="e.g., 20.0"
                className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <CustomDropdown
                value={country}
                onChange={setCountry}
                options={countries.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., California"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Set as default tax</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the tax default..."
              className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(tax.createdAt).toLocaleString()}
              </span>
            </div>
            {tax.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(tax.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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

// Delete Tax Modal Component
function DeleteTaxModal({
  tax,
  onClose,
  onConfirm,
  isShowing,
}: {
  tax: TaxDefault;
  onClose: () => void;
  onConfirm: () => void;
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
        aria-labelledby="deleteTaxModalLabel"
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
              <h5 id="deleteTaxModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
                Delete Tax Default
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{tax.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3 px-6 pb-6 text-[14px]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Tax Default
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Warehouse Defaults Section
function WarehouseDefaultsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [warehouseToView, setWarehouseToView] = useState<WarehouseDefault | null>(null);
  const [warehouseToEdit, setWarehouseToEdit] = useState<WarehouseDefault | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseDefault | null>(null);
  const [isDeleteWarehouseModalShowing, setIsDeleteWarehouseModalShowing] = useState(false);

  // Load warehouse defaults from localStorage
  const [warehouses, setWarehouses] = useState<WarehouseDefault[]>(() => {
    const saved = localStorage.getItem('system-settings-warehouse-defaults');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default warehouses
    return [
      {
        id: 1,
        name: 'Main Warehouse',
        code: 'WH-001',
        address: '123 Industrial Blvd',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        postalCode: '10001',
        isDefault: true,
        status: 'active' as WarehouseStatus,
        capacity: 10000,
        description: 'Primary warehouse for inventory storage',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'West Coast Distribution',
        code: 'WH-002',
        address: '456 Commerce St',
        city: 'Los Angeles',
        state: 'CA',
        country: 'United States',
        postalCode: '90001',
        isDefault: false,
        status: 'active' as WarehouseStatus,
        capacity: 5000,
        description: 'West coast distribution center',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('system-settings-warehouse-defaults', JSON.stringify(warehouses));
  }, [warehouses]);

  // Filter warehouses
  const filteredWarehouses = useMemo(() => {
    let filtered = warehouses;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((warehouse) =>
        warehouse.name.toLowerCase().includes(query) ||
        warehouse.code.toLowerCase().includes(query) ||
        warehouse.city.toLowerCase().includes(query) ||
        warehouse.country.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((warehouse) => warehouse.status === statusFilter);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [warehouses, searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = warehouses.length;
    const active = warehouses.filter((warehouse) => warehouse.status === 'active');
    const defaults = warehouses.filter((warehouse) => warehouse.isDefault);
    const totalCapacity = warehouses.reduce((sum, warehouse) => sum + (warehouse.capacity || 0), 0);

    return {
      total,
      active: active.length,
      defaults: defaults.length,
      totalCapacity,
    };
  }, [warehouses]);

  const handleCreateWarehouse = (warehouseData: any) => {
    // If this is set as default, unset other defaults
    if (warehouseData.isDefault) {
      setWarehouses(warehouses.map((warehouse) => ({ ...warehouse, isDefault: false })));
    }
    const newWarehouse: WarehouseDefault = {
      id: Date.now(),
      ...warehouseData,
      createdAt: new Date().toISOString(),
    };
    setWarehouses([...warehouses, newWarehouse]);
    setShowCreateModal(false);
    toast.success('Warehouse default created successfully!');
  };

  const handleUpdateWarehouse = (warehouseId: string | number, updates: any) => {
    // If this is set as default, unset other defaults
    if (updates.isDefault) {
      setWarehouses(warehouses.map((warehouse) =>
        warehouse.id === warehouseId ? { ...warehouse, ...updates } : { ...warehouse, isDefault: false }
      ));
    } else {
      setWarehouses(warehouses.map((warehouse) =>
        warehouse.id === warehouseId
          ? { ...warehouse, ...updates, updatedAt: new Date().toISOString() }
          : warehouse
      ));
    }
    toast.success('Warehouse default updated successfully!');
  };

  const handleDeleteWarehouse = (warehouseId: string | number) => {
    setWarehouses(warehouses.filter((warehouse) => warehouse.id !== warehouseId));
    toast.success('Warehouse default deleted successfully!');
    setIsDeleteWarehouseModalShowing(false);
    setWarehouseToDelete(null);
  };

  const handleConfirmDeleteWarehouse = () => {
    if (warehouseToDelete) {
      handleDeleteWarehouse(warehouseToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Warehouses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Default</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.defaults}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalCapacity.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, city, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 text-[14px] ::placeholder-[12px] pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Warehouse
            </button>
          </div>
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Default
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Warehouse className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No warehouses found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first warehouse to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setWarehouseToView(warehouse)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {warehouse.name}
                      </div>
                      {warehouse.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {warehouse.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {warehouse.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {warehouse.city}, {warehouse.state || warehouse.country}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {warehouse.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {warehouse.capacity ? warehouse.capacity.toLocaleString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        warehouse.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {warehouse.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {warehouse.isDefault ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Default
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWarehouseToView(warehouse);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWarehouseToEdit(warehouse);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWarehouseToDelete(warehouse);
                            setIsDeleteWarehouseModalShowing(true);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Warehouse Modal */}
      {showCreateModal && (
        <CreateWarehouseModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWarehouse}
        />
      )}

      {/* Warehouse Details Modal */}
      {/* Warehouse View Modal */}
      {warehouseToView && (
        <WarehouseViewModal
          warehouse={warehouseToView}
          onClose={() => setWarehouseToView(null)}
        />
      )}

      {/* Warehouse Edit Modal */}
      {warehouseToEdit && (
        <WarehouseEditModal
          warehouse={warehouseToEdit}
          onClose={() => setWarehouseToEdit(null)}
          onUpdate={handleUpdateWarehouse}
        />
      )}

      {/* Delete Warehouse Modal */}
      {warehouseToDelete && (
        <DeleteWarehouseModal
          warehouse={warehouseToDelete}
          onClose={() => {
            setIsDeleteWarehouseModalShowing(false);
            setWarehouseToDelete(null);
          }}
          onConfirm={handleConfirmDeleteWarehouse}
          isShowing={isDeleteWarehouseModalShowing}
        />
      )}
    </div>
  );
}

// Create Warehouse Modal
interface CreateWarehouseModalProps {
  onClose: () => void;
  onCreate: (warehouseData: any) => void;
}

function CreateWarehouseModal({ onClose, onCreate }: CreateWarehouseModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [status, setStatus] = useState<WarehouseStatus>('active');
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState('');

  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
    'Italy', 'Spain', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Poland', 'Portugal', 'Greece', 'Ireland', 'Austria', 'Switzerland',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !address.trim() || !city.trim() || !country.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      postalCode: postalCode.trim(),
      isDefault,
      status,
      capacity: capacity ? parseInt(capacity.toString()) : undefined,
      description: description.trim(),
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
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New Warehouse</h2>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Warehouse"
                className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., WH-001"
                className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Industrial Blvd"
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., New York"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State/Province
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., NY"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g., 10001"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={country}
                onChange={setCountry}
                options={[
                  { value: '', label: 'Select country...' },
                  ...countries.map((c) => ({ value: c, label: c })),
                ]}
                placeholder="Select country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as WarehouseStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Capacity
              </label>
              <input
                type="number"
                value={capacity || ''}
                onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : undefined)}
                min={0}
                placeholder="e.g., 10000"
                className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                &nbsp;
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Set as default warehouse</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the warehouse..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              Create Warehouse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Warehouse Edit Modal
interface WarehouseEditModalProps {
  warehouse: WarehouseDefault;
  onClose: () => void;
  onUpdate: (warehouseId: string | number, updates: any) => void;
}

function WarehouseEditModal({ warehouse, onClose, onUpdate }: WarehouseEditModalProps) {
  const [name, setName] = useState(warehouse.name);
  const [code, setCode] = useState(warehouse.code);
  const [address, setAddress] = useState(warehouse.address);
  const [city, setCity] = useState(warehouse.city);
  const [state, setState] = useState(warehouse.state || '');
  const [country, setCountry] = useState(warehouse.country);
  const [postalCode, setPostalCode] = useState(warehouse.postalCode);
  const [isDefault, setIsDefault] = useState(warehouse.isDefault);
  const [status, setStatus] = useState<WarehouseStatus>(warehouse.status);
  const [capacity, setCapacity] = useState<number | undefined>(warehouse.capacity);
  const [description, setDescription] = useState(warehouse.description || '');

  const countries = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
    'Italy', 'Spain', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Poland', 'Portugal', 'Greece', 'Ireland', 'Austria', 'Switzerland',
  ];

  const handleSave = () => {
    onUpdate(warehouse.id, {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: country.trim(),
      postalCode: postalCode.trim(),
      isDefault,
      status,
      capacity: capacity ? parseInt(capacity.toString()) : undefined,
      description: description.trim(),
    });
    onClose();
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Warehouse Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{warehouse.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Warehouse"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Warehouse Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., WH-001"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Industrial Blvd"
              className="w-full px-3 py-2 border border-gray-300 text-[14px] ::placeholder-[12px] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., New York"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State/Province
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g., New York"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g., 10001"
                className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <CustomDropdown
                value={country}
                onChange={setCountry}
                options={countries.map((c) => ({ value: c, label: c }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as WarehouseStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Capacity
              </label>
              <input
                type="number"
                value={capacity || ''}
                onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : undefined)}
                min={0}
                placeholder="e.g., 10000"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                &nbsp;
              </label>
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Set as default warehouse</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the warehouse..."
              className="w-full px-3 text-[14px] ::placeholder-[12px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(warehouse.createdAt).toLocaleString()}
              </span>
            </div>
            {warehouse.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(warehouse.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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

// Warehouse View Modal (Read-only)
interface WarehouseViewModalProps {
  warehouse: WarehouseDefault;
  onClose: () => void;
}

function WarehouseViewModal({ warehouse, onClose }: WarehouseViewModalProps) {
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Warehouse Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{warehouse.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {warehouse.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Code
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {warehouse.code}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
              {warehouse.address}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {warehouse.city}
              </div>
            </div>

            {warehouse.state && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                  {warehouse.state}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {warehouse.country}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Postal Code
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {warehouse.postalCode}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  warehouse.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {warehouse.status.charAt(0).toUpperCase() + warehouse.status.slice(1)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  warehouse.isDefault
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {warehouse.isDefault ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {warehouse.capacity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Capacity
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {warehouse.capacity.toLocaleString()}
              </div>
            </div>
          )}

          {warehouse.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {warehouse.description}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6 text-[14px]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Warehouse Modal Component
interface DeleteWarehouseModalProps {
  warehouse: WarehouseDefault;
  onClose: () => void;
  onConfirm: () => void;
  isShowing: boolean;
}

function DeleteWarehouseModal({ warehouse, onClose, onConfirm, isShowing }: DeleteWarehouseModalProps) {
  if (!isShowing) return null;

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
        aria-labelledby="deleteWarehouseModalLabel"
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
              <h5 id="deleteWarehouseModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
                Delete Warehouse Default
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{warehouse.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3 px-6 pb-6 text-[14px]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Warehouse Default
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}