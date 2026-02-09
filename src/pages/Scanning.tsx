import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  ScanLine,
  QrCode,
  Radio,
  Package,
  History,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Warehouse,
  Trash2,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { SearchInput, DeleteModal } from '../components/ui';
import { CustomDropdown } from '../components/ui';
import { SkeletonPage } from '../components/Skeleton';

// Types
interface ScanResult {
  id: string;
  code: string;
  codeType: 'BARCODE' | 'QR' | 'RFID';
  productId?: number;
  productName?: string;
  sku?: string;
  warehouseId?: number;
  warehouseName?: string;
  action: 'LOOKUP' | 'INVENTORY_UPDATE' | 'TRANSFER' | 'RECEIVING' | 'SHIPPING';
  quantity?: number;
  status: 'SUCCESS' | 'ERROR' | 'WARNING';
  message?: string;
  scannedAt: string;
  scannedBy?: string;
  metadata?: Record<string, any>;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  ean?: string;
  description?: string;
}

interface Warehouse {
  id: number;
  name: string;
  location?: string;
}



export default function Scanning() {
  const [activeMode, setActiveMode] = useState<'BARCODE' | 'QR' | 'RFID'>('BARCODE');
  const [scanInput, setScanInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [actionType, setActionType] = useState<string>('LOOKUP');
  const [searchQuery, setSearchQuery] = useState('');
  const [codeTypeFilter, setCodeTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const itemsPerPage = 10;
  const scanInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // Fetch warehouses
  const { data: warehousesData, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      try {
        const response = await api.get('/warehouses');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
  });

  const warehouses: Warehouse[] = useMemo(() => {
    return Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data || []);
  }, [warehousesData]);

  // Mutations for scan history
  const createScanHistoryMutation = useMutation({
    mutationFn: async (scanData: {
      code: string;
      codeType: 'BARCODE' | 'QR' | 'RFID';
      productId?: number;
      warehouseId?: number;
      action: string;
      quantity?: number;
      status: 'SUCCESS' | 'ERROR' | 'WARNING';
      message?: string;
      metadata?: Record<string, any>;
    }) => {
      const response = await api.post('/scan-history', scanData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-history'] });
    },
  });

  const deleteAllScanHistoryMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/scan-history');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-history'] });
      setIsDeleteModalOpen(false);
      toast.success('Scan history cleared');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to clear scan history');
    },
  });

  // Handle clear history
  const handleClearHistory = () => {
    deleteAllScanHistoryMutation.mutate();
  };

  // Fetch scan history from API
  const { data: scanHistoryData } = useQuery({
    queryKey: ['scan-history', currentPage, itemsPerPage, codeTypeFilter],
    queryFn: async () => {
      try {
        const params: any = {
          skip: (currentPage - 1) * itemsPerPage,
          take: itemsPerPage,
        };
        if (codeTypeFilter !== 'all') {
          params.codeType = codeTypeFilter;
        }
        const response = await api.get('/scan-history', { params });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        console.error('Error fetching scan history:', error);
        return { data: [], total: 0 };
      }
    },
  });

  const scanHistory: any[] = useMemo(() => {
    const historyData = scanHistoryData?.data || [];
    if (!Array.isArray(historyData)) return [];
    return historyData.map((h: any) => ({
      id: h.id,
      code: h.code,
      codeType: h.codeType,
      result: {
        id: h.id,
        code: h.code,
        codeType: h.codeType,
        productId: h.productId,
        productName: h.product?.name,
        sku: h.product?.sku,
        warehouseId: h.warehouseId,
        warehouseName: h.warehouse?.name,
        action: h.action as ScanResult['action'],
        status: h.status as ScanResult['status'],
        message: h.message,
        scannedAt: h.scannedAt,
        metadata: h.metadata,
      },
      scannedAt: h.scannedAt,
      scannedBy: h.scannedBy,
    }));
  }, [scanHistoryData]);

  // Focus on scan input when mode changes
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [activeMode]);

  // Handle keyboard input for scanning
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Auto-focus scan input when typing (if not already focused)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (scanInputRef.current && !scanInputRef.current.matches(':focus')) {
        scanInputRef.current.focus();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // Process scan
  const processScan = async (code: string, codeType: 'BARCODE' | 'QR' | 'RFID') => {
    if (!code.trim()) {
      toast.error('Please enter a code to scan');
      return;
    }

    setIsScanning(true);
    const scanId = Date.now().toString();

    try {
      // Simulate scanning delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Lookup product by SKU, EAN, or code
      let product: Product | null = null;
      let warehouse: Warehouse | null = null;

      try {
        // Try to find product by SKU or EAN
        const productsResponse = await api.get('/products');
        const products = Array.isArray(productsResponse.data) 
          ? productsResponse.data 
          : (productsResponse.data?.data || []);
        
        product = products.find(
          (p: Product) => p.sku === code || p.ean === code
        ) || null;

        // Get warehouse if selected
        if (selectedWarehouse !== 'all') {
          warehouse = warehouses.find((w) => w.id === Number(selectedWarehouse)) || null;
        }
      } catch (error) {
        console.error('Error looking up product:', error);
      }

      // Create scan result
      const result: ScanResult = {
        id: scanId,
        code,
        codeType,
        productId: product?.id,
        productName: product?.name,
        sku: product?.sku,
        warehouseId: warehouse?.id,
        warehouseName: warehouse?.name,
         action: actionType as ScanResult['action'],
        status: product ? 'SUCCESS' : 'WARNING',
        message: product 
          ? `Product found: ${product.name}` 
          : `Code "${code}" not found in product database`,
        scannedAt: new Date().toISOString(),
        metadata: {
          mode: activeMode,
          action: actionType,
        },
      };

      // Save to API (already done by createScanHistoryMutation)

      // Show toast
      if (result.status === 'SUCCESS') {
        toast.success(result.message || 'Scan successful!');
      } else if (result.status === 'WARNING') {
        toast.error(result.message || 'Product not found');
      }

      // Clear input
      setScanInput('');
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    } catch (error) {
      // Save error to API
      createScanHistoryMutation.mutate({
        code,
        codeType,
        action: 'LOOKUP',
        status: 'ERROR',
        message: 'Error processing scan',
        metadata: {
          mode: activeMode,
          action: actionType,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      toast.error('Error processing scan');
    } finally {
      setIsScanning(false);
    }
  };

  // Handle scan input submit
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim() && !isScanning) {
      processScan(scanInput.trim(), activeMode);
    }
  };

  // Filter scan history (client-side search only, other filters done by API)
  const filteredHistory = useMemo(() => {
    let filtered = scanHistory;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry: any) =>
          entry.code.toLowerCase().includes(query) ||
          entry.result?.productName?.toLowerCase().includes(query) ||
          entry.result?.sku?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [scanHistory, searchQuery]);

  // Pagination - use API pagination
  const totalHistory = scanHistoryData?.total || 0;
  const totalPages = Math.ceil(totalHistory / itemsPerPage);
  const paginatedHistory = filteredHistory; // Already paginated by API

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const total = scanHistory.length;
    const successful = scanHistory.filter((h: any) => h.result?.status === 'SUCCESS').length;
    const errors = scanHistory.filter((h: any) => h.result?.status === 'ERROR').length;
    const warnings = scanHistory.filter((h: any) => h.result?.status === 'WARNING').length;
    const today = scanHistory.filter(
      (h: any) => new Date(h.scannedAt).toDateString() === new Date().toDateString()
    ).length;

    return { total, successful, errors, warnings, today };
  }, [scanHistory]);

  const getCodeTypeIcon = (type: string) => {
    switch (type) {
      case 'BARCODE':
        return <ScanLine className="w-5 h-5" />;
      case 'QR':
        return <QrCode className="w-5 h-5" />;
      case 'RFID':
        return <Radio className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'ERROR':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (isLoadingWarehouses) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Scanning" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Scanning</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Scan barcodes, QR codes, and RFID tags for inventory management
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Scans</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Successful</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.successful}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Warnings</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.warnings}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Errors</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.errors}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <X className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {summaryMetrics.today}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Scanner Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Scanner</h2>
          
          {/* Mode Selection */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveMode('BARCODE')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                activeMode === 'BARCODE'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ScanLine className="w-5 h-5" />
                <span className="font-medium">Barcode</span>
              </div>
            </button>
            <button
              onClick={() => setActiveMode('QR')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                activeMode === 'QR'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                <span className="font-medium">QR Code</span>
              </div>
            </button>
            <button
              onClick={() => setActiveMode('RFID')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                activeMode === 'RFID'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Radio className="w-5 h-5" />
                <span className="font-medium">RFID</span>
              </div>
            </button>
          </div>

          {/* Scan Input */}
          <form onSubmit={handleScanSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scan Code ({activeMode})
              </label>
              <div className="flex gap-2">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder={`Enter or scan ${activeMode === 'BARCODE' ? 'barcode' : activeMode === 'QR' ? 'QR code' : 'RFID tag'}`}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-lg"
                  disabled={isScanning}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!scanInput.trim() || isScanning}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isScanning ? 'Scanning...' : 'Scan'}
                </button>
              </div>
            </div>

            {/* Action and Warehouse Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action Type
                </label>
                <CustomDropdown
                  value={actionType}
                  onChange={setActionType}
                  options={[
                    { value: 'LOOKUP', label: 'Lookup Product' },
                    { value: 'INVENTORY_UPDATE', label: 'Update Inventory' },
                    { value: 'TRANSFER', label: 'Transfer' },
                    { value: 'RECEIVING', label: 'Receiving' },
                    { value: 'SHIPPING', label: 'Shipping' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Warehouse (Optional)
                </label>
                <CustomDropdown
                  value={selectedWarehouse}
                  onChange={setSelectedWarehouse}
                  options={[
                    { value: 'all', label: 'All Warehouses' },
                    ...warehouses.map((w) => ({ value: w.id.toString(), label: w.name })),
                  ]}
                />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Scan History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scan History</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-1" />
                Clear
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchInput
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder="Search by code, product name, or SKU..."
            />
            <div>
              <CustomDropdown
                value={codeTypeFilter}
                onChange={(value) => {
                  setCodeTypeFilter(value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'BARCODE', label: 'Barcode' },
                  { value: 'QR', label: 'QR Code' },
                  { value: 'RFID', label: 'RFID' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="p-6">
          {paginatedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <History className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || codeTypeFilter !== 'all' ? 'No matching scans found' : 'No scan history yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedHistory.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(entry.scannedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getCodeTypeIcon(entry.codeType)}
                            <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                              {entry.code}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                            {entry.codeType}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.result?.productName ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {entry.result.productName}
                              </div>
                              {entry.result.sku && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  SKU: {entry.result.sku}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.result?.status && (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.result.status)}`}
                            >
                              {entry.result.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {entry.result?.message || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalHistory)}</span> of{' '}
                    <span className="font-medium">{totalHistory}</span> scans
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ‹
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300 px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <DeleteModal
          title="Clear Scan History"
          message="Are you sure you want to clear all scan history? This action cannot be undone."
          itemName="all scan history"
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleClearHistory}
        />
      )}
    </div>
  );
}

