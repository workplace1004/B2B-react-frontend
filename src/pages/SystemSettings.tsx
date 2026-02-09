import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import {
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle,
  Trash2,
  Hash,
  Receipt,
  Warehouse,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown, SearchInput } from '../components/ui';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const queryClient = useQueryClient();

  // Fetch numbering rules from API
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['numbering-rules', typeFilter, statusFilter],
    queryFn: async () => {
      try {
        const typeParam = typeFilter !== 'all' ? `&type=${typeFilter}` : '';
        const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const response = await api.get(`/numbering-rules?skip=0&take=1000${typeParam}${statusParam}`);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching numbering rules:', error);
        return [];
      }
    },
  });

  const rules: NumberingRule[] = (rulesData || []).map((rule: any) => ({
    ...rule,
    type: rule.type?.toLowerCase() || 'sku',
    status: rule.status?.toLowerCase() || 'active',
  }));

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

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRules.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRules = filteredRules.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

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

  // Create numbering rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      const response = await api.post('/numbering-rules', {
        ...ruleData,
        type: ruleData.type?.toUpperCase() || 'SKU',
        status: ruleData.status?.toUpperCase() || 'ACTIVE',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbering-rules'] });
      setShowCreateModal(false);
      toast.success('Numbering rule created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create numbering rule');
    },
  });

  // Update numbering rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: any }) => {
      const response = await api.patch(`/numbering-rules/${id}`, {
        ...updates,
        type: updates.type?.toUpperCase(),
        status: updates.status?.toUpperCase(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbering-rules'] });
      toast.success('Numbering rule updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update numbering rule');
    },
  });

  // Delete numbering rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/numbering-rules/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbering-rules'] });
      toast.success('Numbering rule deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete numbering rule');
    },
  });

  const handleCreateRule = (ruleData: any) => {
    createRuleMutation.mutate(ruleData);
  };

  const handleUpdateRule = (ruleId: string | number, updates: any) => {
    updateRuleMutation.mutate({ id: ruleId, updates });
  };

  const handleDeleteRule = (ruleId: string | number) => {
    deleteRuleMutation.mutate(ruleId);
  };

  const handleConfirmDeleteRule = () => {
    if (ruleToDelete) {
      handleDeleteRule(ruleToDelete.id);
      setIsDeleteRuleModalShowing(false);
      setRuleToDelete(null);
    }
  };

  // Show loading state (after all hooks)
  if (rulesLoading) {
    return <SkeletonPage />;
  }

  const generateExample = (rule: NumberingRule) => {
    const sequence = rule.currentSequence.toString().padStart(rule.length - (rule.prefix.length + rule.suffix.length), '0');
    return rule.format
      .replace('{prefix}', rule.prefix)
      .replace('{suffix}', rule.suffix)
      .replace('{sequence}', sequence);
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
              value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by rule name, type, or format..."
            />
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
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
                paginatedRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Pagination */}
      {filteredRules.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredRules.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredRules.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="First page"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="Last page"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

        <div className="px-6 py-3 space-y-4">
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const queryClient = useQueryClient();

  // Fetch tax defaults from API
  const { data: taxDefaultsData, isLoading: taxDefaultsLoading } = useQuery({
    queryKey: ['tax-defaults', typeFilter],
    queryFn: async () => {
      try {
        const typeParam = typeFilter !== 'all' ? `&type=${typeFilter}` : '';
        const response = await api.get(`/tax-defaults?skip=0&take=1000${typeParam}`);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching tax defaults:', error);
        return [];
      }
    },
  });

  const taxDefaults: TaxDefault[] = taxDefaultsData || [];

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

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTaxes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTaxes = filteredTaxes.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

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

  // Create tax default mutation
  const createTaxMutation = useMutation({
    mutationFn: async (taxData: any) => {
      const response = await api.post('/tax-defaults', {
        ...taxData,
        type: taxData.type?.toUpperCase().replace('-', '_') || 'VAT',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-defaults'] });
      setShowCreateModal(false);
      toast.success('Tax default created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tax default');
    },
  });

  // Update tax default mutation
  const updateTaxMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: any }) => {
      const response = await api.patch(`/tax-defaults/${id}`, {
        ...updates,
        type: updates.type?.toUpperCase().replace('-', '_'),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-defaults'] });
      toast.success('Tax default updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tax default');
    },
  });

  // Delete tax default mutation
  const deleteTaxMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/tax-defaults/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-defaults'] });
      toast.success('Tax default deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete tax default');
    },
  });

  const handleCreateTax = (taxData: any) => {
    createTaxMutation.mutate(taxData);
  };

  const handleUpdateTax = (taxId: string | number, updates: any) => {
    updateTaxMutation.mutate({ id: taxId, updates });
  };

  const handleDeleteTax = (taxId: string | number) => {
    deleteTaxMutation.mutate(taxId);
  };

  const handleConfirmDeleteTax = () => {
    if (taxToDelete) {
      handleDeleteTax(taxToDelete.id);
      setIsDeleteTaxModalShowing(false);
      setTaxToDelete(null);
    }
  };

  // Show loading state (after all hooks)
  if (taxDefaultsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
              value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, country, or type..."
            />
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
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
                paginatedTaxes.map((tax) => (
                  <tr
                    key={tax.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Pagination */}
      {filteredTaxes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredTaxes.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredTaxes.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="First page"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="Last page"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                options={countries.map((c) => ({ value: c, label: c }))}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const queryClient = useQueryClient();

  // Fetch warehouse defaults from API
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouse-defaults', statusFilter],
    queryFn: async () => {
      try {
        const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const response = await api.get(`/warehouse-defaults?skip=0&take=1000${statusParam}`);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching warehouse defaults:', error);
        return [];
      }
    },
  });

  const warehouses: WarehouseDefault[] = (warehousesData || []).map((warehouse: any) => ({
    ...warehouse,
    status: warehouse.status?.toLowerCase() || 'active',
  }));

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

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredWarehouses.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWarehouses = filteredWarehouses.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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

  // Create warehouse default mutation
  const createWarehouseMutation = useMutation({
    mutationFn: async (warehouseData: any) => {
      const response = await api.post('/warehouse-defaults', {
        ...warehouseData,
        status: warehouseData.status?.toUpperCase() || 'ACTIVE',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-defaults'] });
      setShowCreateModal(false);
      toast.success('Warehouse default created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create warehouse default');
    },
  });

  // Update warehouse default mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: any }) => {
      const response = await api.patch(`/warehouse-defaults/${id}`, {
        ...updates,
        status: updates.status?.toUpperCase(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-defaults'] });
      toast.success('Warehouse default updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update warehouse default');
    },
  });

  // Delete warehouse default mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/warehouse-defaults/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-defaults'] });
      toast.success('Warehouse default deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete warehouse default');
    },
  });

  const handleCreateWarehouse = (warehouseData: any) => {
    createWarehouseMutation.mutate(warehouseData);
  };

  const handleUpdateWarehouse = (warehouseId: string | number, updates: any) => {
    updateWarehouseMutation.mutate({ id: warehouseId, updates });
  };

  const handleDeleteWarehouse = (warehouseId: string | number) => {
    deleteWarehouseMutation.mutate(warehouseId);
  };

  const handleConfirmDeleteWarehouse = () => {
    if (warehouseToDelete) {
      handleDeleteWarehouse(warehouseToDelete.id);
      setIsDeleteWarehouseModalShowing(false);
      setWarehouseToDelete(null);
    }
  };

  // Show loading state (after all hooks)
  if (warehousesLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <SearchInput
              value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, code, city, or country..."
            />
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
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
                paginatedWarehouses.map((warehouse) => (
                  <tr
                    key={warehouse.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Pagination */}
      {filteredWarehouses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredWarehouses.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredWarehouses.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="First page"
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-900 dark:text-white"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                  title="Last page"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                options={countries.map((c) => ({ value: c, label: c }))}
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