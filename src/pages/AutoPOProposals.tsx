import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Plus, CheckCircle, Clock, Send, Edit, Eye, AlertTriangle, DollarSign, Package, Calendar, TrendingUp, X, ChevronDown } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type ProposalStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SENT';
type FilterStatus = 'all' | 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SENT';

// Custom Dropdown Component for Status Filter
interface StatusFilterDropdownProps {
  value: FilterStatus;
  onChange: (value: FilterStatus) => void;
}

function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
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

  const options: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All Status' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'REVIEW', label: 'Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'SENT', label: 'Sent' },
  ];

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium flex items-center justify-between cursor-pointer transition-colors ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20'
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
        }`}
      >
        <span>{selectedOption?.label || value}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                option.value === value
                  ? 'bg-blue-600 text-white'
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

// Helper functions for status styling
const getStatusColor = (status: ProposalStatus) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'REVIEW':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'APPROVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'SENT':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getStatusIcon = (status: ProposalStatus) => {
  switch (status) {
    case 'DRAFT':
      return <Edit className="w-4 h-4" />;
    case 'REVIEW':
      return <Clock className="w-4 h-4" />;
    case 'APPROVED':
      return <CheckCircle className="w-4 h-4" />;
    case 'SENT':
      return <Send className="w-4 h-4" />;
    default:
      return null;
  }
};

interface POProposal {
  id: string;
  productId: number;
  productName: string;
  sku: string;
  warehouseId: number;
  warehouseName: string;
  supplierId: number;
  supplierName: string;
  currentQty: number;
  reorderPoint: number;
  safetyStock: number;
  suggestedQty: number;
  moqQty: number; // Minimum Order Quantity
  adjustedQty: number; // After MOQ adjustment
  unitCost: number;
  totalCost: number;
  leadTimeDays: number;
  expectedDate: Date;
  status: ProposalStatus;
  thresholdMet: boolean;
  stockAfterPO: number;
  cashImpact: number;
}

interface ImpactPreview {
  totalCashImpact: number;
  totalLeadTimeDays: number;
  totalStockIncrease: number;
  affectedProducts: number;
  warnings: string[];
}

export default function AutoPOProposals() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set());
  const [isImpactModalOpen, setIsImpactModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<POProposal | null>(null);
  const [proposalsList, setProposalsList] = useState<POProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch inventory data
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory', 'auto-po'],
    queryFn: async () => {
      try {
        const response = await api.get('/inventory');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch suppliers
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const response = await api.get('/suppliers?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  // Fetch products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'auto-po'],
    queryFn: async () => {
      try {
        const response = await api.get('/products?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const inventory = inventoryData || [];
  const suppliers = suppliersData || [];
  const products = productsData || [];

  // Generate PO proposals based on thresholds
  const generateProposals = () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    // Simulate API call delay for better UX
    setTimeout(() => {
      const newProposals = inventory
        .filter((item: any) => {
          const currentQty = item.quantity || 0;
          const reorderPoint = item.reorderPoint || 0;
          return currentQty <= reorderPoint;
        })
        .map((item: any): POProposal => {
          const product = products.find((p: any) => p.id === item.productId);
          const productName = product?.name || 'Unknown Product';
          const sku = product?.sku || 'N/A';
          const warehouseName = item.warehouse?.name || 'Warehouse';
          
          const currentQty = item.quantity || 0;
          const reorderPoint = item.reorderPoint || 0;
          const safetyStock = item.safetyStock || 0;
          
          // Calculate suggested quantity
          const suggestedQty = Math.max(
            (reorderPoint + safetyStock * 2) - currentQty,
            safetyStock
          );
          
          // Assign supplier (simplified: use first active supplier or random)
          const activeSuppliers = suppliers.filter((s: any) => s.isActive);
          const supplier = activeSuppliers[0] || suppliers[0] || { id: 0, name: 'No Supplier', leadTimeDays: 30 };
          
          // MOQ (Minimum Order Quantity) - simulate based on product type
          // In real system, this would come from supplier data
          const moqQty = Math.max(50, Math.ceil(suggestedQty / 10) * 10); // Round up to nearest 10, min 50
          
          // Adjust quantity to meet MOQ
          const adjustedQty = Math.max(suggestedQty, moqQty);
          
          // Calculate costs (assume 50% of product base price as cost)
          const unitCost = product ? parseFloat(product.basePrice || 0) * 0.5 : 10;
          const totalCost = unitCost * adjustedQty;
          
          // Lead time
          const leadTimeDays = supplier.leadTimeDays || 30;
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() + leadTimeDays);
          
          // Calculate stock after PO
          const stockAfterPO = currentQty + adjustedQty;
          
          return {
            id: `proposal-${item.id}-${Date.now()}`,
            productId: item.productId,
            productName,
            sku,
            warehouseId: item.warehouseId,
            warehouseName,
            supplierId: supplier.id,
            supplierName: supplier.name,
            currentQty,
            reorderPoint,
            safetyStock,
            suggestedQty,
            moqQty,
            adjustedQty,
            unitCost,
            totalCost,
            leadTimeDays,
            expectedDate,
            status: 'DRAFT' as ProposalStatus,
            thresholdMet: currentQty <= reorderPoint,
            stockAfterPO,
            cashImpact: totalCost,
          };
        });
      
      setProposalsList(newProposals);
      setIsGenerating(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory', 'auto-po'] });
    }, 500);
  };

  // Auto-generate proposals on mount if inventory is loaded
  useEffect(() => {
    if (inventory.length > 0 && suppliers.length > 0 && products.length > 0 && proposalsList.length === 0) {
      // Don't auto-generate, wait for user to click button
    }
  }, [inventory, suppliers, products]);

  // Use proposalsList state instead of useMemo
  const proposals = proposalsList;

  // Filter proposals
  const filteredProposals = useMemo(() => {
    let filtered = proposals;
    
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    
    return filtered;
  }, [proposals, searchQuery, statusFilter]);

  // Calculate impact preview for selected proposals
  const impactPreview = useMemo((): ImpactPreview => {
    const selected = filteredProposals.filter((p) => selectedProposals.has(p.id));
    
    if (selected.length === 0) {
      return {
        totalCashImpact: 0,
        totalLeadTimeDays: 0,
        totalStockIncrease: 0,
        affectedProducts: 0,
        warnings: [],
      };
    }
    
    const totalCashImpact = selected.reduce((sum, p) => sum + p.cashImpact, 0);
    const maxLeadTime = Math.max(...selected.map((p) => p.leadTimeDays), 0);
    const totalStockIncrease = selected.reduce((sum, p) => sum + p.adjustedQty, 0);
    const affectedProducts = selected.length;
    
    const warnings: string[] = [];
    if (totalCashImpact > 100000) {
      warnings.push('Total cash impact exceeds $100,000');
    }
    if (maxLeadTime > 60) {
      warnings.push('Some suppliers have lead times exceeding 60 days');
    }
    if (selected.some((p) => p.adjustedQty > p.suggestedQty * 2)) {
      warnings.push('Some quantities significantly exceed suggested amounts due to MOQ requirements');
    }
    
    return {
      totalCashImpact,
      totalLeadTimeDays: maxLeadTime,
      totalStockIncrease,
      affectedProducts,
      warnings,
    };
  }, [filteredProposals, selectedProposals]);

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ proposalId, newStatus }: { proposalId: string; newStatus: ProposalStatus }) => {
      // In a real system, this would call an API
      return Promise.resolve({ proposalId, newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'auto-po'] });
    },
  });

  const handleStatusUpdate = (proposalId: string, newStatus: ProposalStatus) => {
    // Update local state immediately
    setProposalsList((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, status: newStatus } : p))
    );
    
    // Also call mutation for API update (if needed)
    updateStatusMutation.mutate({ proposalId, newStatus });
  };

  const handleSelectProposal = (proposalId: string) => {
    setSelectedProposals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(proposalId)) {
        newSet.delete(proposalId);
      } else {
        newSet.add(proposalId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProposals.size === filteredProposals.length) {
      setSelectedProposals(new Set());
    } else {
      setSelectedProposals(new Set(filteredProposals.map((p) => p.id)));
    }
  };


  const isLoading = isLoadingInventory || isLoadingSuppliers || isLoadingProducts;

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Auto PO Proposals" />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Auto PO Proposals</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Threshold-based PO generation, Supplier/MOQ-aware suggestions, Approval workflow
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedProposals.size > 0 && (
              <button
                onClick={() => setIsImpactModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Eye className="w-5 h-5" />
                View Impact ({selectedProposals.size})
              </button>
            )}
            <button
              onClick={generateProposals}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Generate Proposals
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Proposals</p>
              <p className="text-[24px] font-bold text-gray-900 dark:text-white">{proposals.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Draft</p>
              <p className="text-[24px] font-bold text-gray-900 dark:text-white">
                {proposals.filter((p) => p.status === 'DRAFT').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Edit className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Review</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {proposals.filter((p) => p.status === 'REVIEW').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                ${proposals.reduce((sum, p) => sum + p.cashImpact, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search products, SKU, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="w-[160px]">
            <StatusFilterDropdown
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No PO proposals found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more proposals.'
                : proposalsList.length === 0
                ? 'No products are below reorder point thresholds. Generate proposals to get started.'
                : 'No proposals match your current filters.'}
            </p>
            <button
              onClick={generateProposals}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Generate Proposals
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProposals.size === filteredProposals.length && filteredProposals.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Product / SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Suggested Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    MOQ / Adjusted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                    Lead Time
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
                {filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProposals.has(proposal.id)}
                        onChange={() => handleSelectProposal(proposal.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {proposal.productName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        SKU: {proposal.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {proposal.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{proposal.supplierName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {proposal.leadTimeDays} days
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{proposal.currentQty}</span>
                        {proposal.thresholdMet && (
                          <span className="ml-2 text-xs text-red-600 dark:text-red-400">⚠ Below threshold</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Reorder: {proposal.reorderPoint}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {proposal.suggestedQty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white font-medium">{proposal.adjustedQty}</div>
                        {proposal.adjustedQty > proposal.suggestedQty && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            MOQ: {proposal.moqQty}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ${proposal.unitCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${proposal.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {proposal.leadTimeDays} days
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {proposal.expectedDate.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 w-fit ${getStatusColor(proposal.status)}`}>
                        {getStatusIcon(proposal.status)}
                        {proposal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setIsProposalModalOpen(true);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          View
                        </button>
                        {proposal.status === 'DRAFT' && (
                          <button
                            onClick={() => handleStatusUpdate(proposal.id, 'REVIEW')}
                            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                          >
                            Submit
                          </button>
                        )}
                        {proposal.status === 'REVIEW' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(proposal.id, 'APPROVED')}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(proposal.id, 'DRAFT')}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {proposal.status === 'APPROVED' && (
                          <button
                            onClick={() => handleStatusUpdate(proposal.id, 'SENT')}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            Send
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Impact Preview Modal */}
      {isImpactModalOpen && (
        <ImpactPreviewModal
          impact={impactPreview}
          proposals={filteredProposals.filter((p) => selectedProposals.has(p.id))}
          onClose={() => setIsImpactModalOpen(false)}
        />
      )}

      {/* Proposal Detail Modal */}
      {isProposalModalOpen && selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          onClose={() => {
            setIsProposalModalOpen(false);
            setSelectedProposal(null);
          }}
          onStatusUpdate={(newStatus) => {
            handleStatusUpdate(selectedProposal.id, newStatus);
            setIsProposalModalOpen(false);
            setSelectedProposal(null);
          }}
        />
      )}
    </div>
  );
}

// Impact Preview Modal Component
function ImpactPreviewModal({
  impact,
  proposals,
  onClose,
}: {
  impact: ImpactPreview;
  proposals: POProposal[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-bold text-gray-900 dark:text-white">PO Change Impact Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Impact Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Cash Impact</p>
              </div>
              <p className="text-[24px] font-bold text-gray-900 dark:text-white">
                ${impact.totalCashImpact.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Max Lead Time</p>
              </div>
              <p className="text-[24px] font-bold text-gray-900 dark:text-white">
                {impact.totalLeadTimeDays} days
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Stock Increase</p>
              </div>
              <p className="text-[24px] font-bold text-gray-900 dark:text-white">
                {impact.totalStockIncrease.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Warnings */}
          {impact.warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Warnings</p>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {impact.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Selected Proposals List */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">
              Selected Proposals ({proposals.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {proposal.productName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {proposal.warehouseName} • Qty: {proposal.adjustedQty}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${proposal.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {proposal.leadTimeDays} days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Proceed with Purchase Orders
          </button>
        </div>
      </div>
    </div>
  );
}

// Proposal Detail Modal Component
function ProposalDetailModal({
  proposal,
  onClose,
  onStatusUpdate,
}: {
  proposal: POProposal;
  onClose: () => void;
  onStatusUpdate: (status: ProposalStatus) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-bold text-gray-900 dark:text-white">PO Proposal Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Information */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Product Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Product Name</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{proposal.productName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">SKU</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{proposal.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Warehouse</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{proposal.warehouseName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Supplier</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{proposal.supplierName}</p>
              </div>
            </div>
          </div>

          {/* Stock Information */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Stock Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
                <p className="text-[24px] font-bold text-gray-900 dark:text-white">{proposal.currentQty}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Reorder Point</p>
                <p className="text-[24px] font-bold text-gray-900 dark:text-white">{proposal.reorderPoint}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Stock After PO</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{proposal.stockAfterPO}</p>
              </div>
            </div>
          </div>

          {/* Purchase Details */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Purchase Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Suggested Quantity</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{proposal.suggestedQty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">MOQ (Minimum Order Quantity)</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{proposal.moqQty}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Adjusted Quantity</p>
                <p className="text-base font-medium text-orange-600 dark:text-orange-400">{proposal.adjustedQty}</p>
                {proposal.adjustedQty > proposal.suggestedQty && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Adjusted to meet MOQ requirement
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Unit Cost</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  ${proposal.unitCost.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${proposal.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lead Time</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {proposal.leadTimeDays} days
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Expected: {proposal.expectedDate.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Impact Preview */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Impact Preview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cash Impact</p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ${proposal.cashImpact.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lead Time</p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {proposal.leadTimeDays} days
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Stock Increase</p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  +{proposal.adjustedQty}
                </p>
              </div>
            </div>
          </div>

          {/* Status Workflow */}
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Approval Workflow</h3>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getStatusColor(proposal.status)}`}>
                {getStatusIcon(proposal.status)}
                <span className="font-medium">{proposal.status}</span>
              </div>
              <div className="flex items-center gap-2">
                {proposal.status === 'DRAFT' && (
                  <button
                    onClick={() => onStatusUpdate('REVIEW')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Submit for Review
                  </button>
                )}
                {proposal.status === 'REVIEW' && (
                  <>
                    <button
                      onClick={() => onStatusUpdate('APPROVED')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onStatusUpdate('DRAFT')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                {proposal.status === 'APPROVED' && (
                  <button
                    onClick={() => onStatusUpdate('SENT')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Send to Supplier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}