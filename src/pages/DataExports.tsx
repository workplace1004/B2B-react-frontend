import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import {
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  File,
  Trash2,
  Clock,
  User,
  XCircle,
  Loader,
  Package,
  Edit,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'imports' | 'exports';
type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
type ExportFormat = 'csv' | 'excel';
type ImportType = 'products' | 'orders' | 'customers' | 'inventory' | 'custom';

interface ImportRecord {
  id: string | number;
  fileName: string;
  type: ImportType;
  status: ImportStatus;
  recordsTotal: number;
  recordsProcessed: number;
  recordsFailed: number;
  uploadedBy: string;
  uploadedAt: string;
  completedAt?: string;
  errorMessage?: string;
  fileUrl?: string;
}

interface ExportRecord {
  id: string | number;
  name: string;
  format: ExportFormat;
  type: ImportType;
  status: ExportStatus;
  recordsCount: number;
  fileSize?: number;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  fileUrl?: string;
  errorMessage?: string;
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

export default function DataExports() {
  const [activeTab, setActiveTab] = useState<TabType>('imports');

  const tabs = [
    { id: 'imports' as TabType, label: 'Imports', icon: Upload },
    { id: 'exports' as TabType, label: 'Exports (CSV/Excel)', icon: Download },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Data & Exports" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Data & Exports</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage data imports and exports (CSV/Excel)
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
        {activeTab === 'imports' && <ImportsSection />}
        {activeTab === 'exports' && <ExportsSection />}
      </div>
    </div>
  );
}

// Imports Section
function ImportsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedImport, setSelectedImport] = useState<ImportRecord | null>(null);
  const [importToEdit, setImportToEdit] = useState<ImportRecord | null>(null);
  const [importToDelete, setImportToDelete] = useState<ImportRecord | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Fetch imports from API
  const { data: importsData, isLoading: importsLoading } = useQuery({
    queryKey: ['data-imports'],
    queryFn: async () => {
      try {
        const response = await api.get('/data-imports?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching data imports:', error);
        return [];
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      // Poll every 2 seconds if there are pending or processing imports
      const data = query.state.data as ImportRecord[] | undefined;
      if (data && Array.isArray(data)) {
        const hasPendingOrProcessing = data.some(
          (imp) => imp.status === 'pending' || imp.status === 'processing'
        );
        return hasPendingOrProcessing ? 2000 : false;
      }
      return false;
    },
  });

  // Transform API data to match ImportRecord interface
  const imports: ImportRecord[] = useMemo(() => {
    if (!importsData || !Array.isArray(importsData)) {
      return [];
    }

    return importsData.map((item: any) => ({
      id: item.id,
      fileName: item.fileName || item.name || '',
      type: (item.type || item.importType || 'custom').toLowerCase() as ImportType,
      status: (item.status || 'pending').toLowerCase() as ImportStatus,
      recordsTotal: item.recordsTotal || item.totalRecords || 0,
      recordsProcessed: item.recordsProcessed || item.processedRecords || 0,
      recordsFailed: item.recordsFailed || item.failedRecords || 0,
      uploadedBy: item.uploadedBy || item.user?.firstName + ' ' + item.user?.lastName || item.user?.email || 'System',
      uploadedAt: item.uploadedAt || item.createdAt || new Date().toISOString(),
      completedAt: item.completedAt || item.finishedAt,
      errorMessage: item.errorMessage || item.error,
      fileUrl: item.fileUrl || item.filePath,
    }));
  }, [importsData]);

  // Create import mutation
  const createImportMutation = useMutation({
    mutationFn: async (data: { file: File; type: ImportType }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('type', data.type);
      const response = await api.post('/data-imports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-imports'] });
      toast.success('File uploaded successfully! Processing will begin shortly.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload file');
    },
  });

  // Update import mutation
  const updateImportMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: Partial<ImportRecord> }) => {
      const response = await api.patch(`/data-imports/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-imports'] });
      toast.success('Import record updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update import record');
    },
  });

  // Delete import mutation
  const deleteImportMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/data-imports/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-imports'] });
      toast.success('Import record deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete import record');
    },
  });

  // Filter imports
  const filteredImports = useMemo(() => {
    let filtered = imports;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((imp) =>
        imp.fileName.toLowerCase().includes(query) ||
        imp.type.toLowerCase().includes(query) ||
        imp.uploadedBy.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((imp) => imp.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((imp) => imp.status === statusFilter);
    }

    // Sort by uploaded date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [imports, searchQuery, typeFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredImports.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedImports = filteredImports.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = imports.length;
    const completed = imports.filter((imp) => imp.status === 'completed');
    const processing = imports.filter((imp) => imp.status === 'processing');
    const failed = imports.filter((imp) => imp.status === 'failed');
    const totalRecords = imports.reduce((sum, imp) => sum + imp.recordsTotal, 0);

    return {
      total,
      completed: completed.length,
      processing: processing.length,
      failed: failed.length,
      totalRecords,
    };
  }, [imports]);

  const handleFileUpload = (file: File, type: ImportType) => {
    createImportMutation.mutate({ file, type });
    setShowUploadModal(false);
    setSelectedFile(null);
  };

  const handleDeleteImport = (importId: string | number) => {
    deleteImportMutation.mutate(importId);
    setImportToDelete(null);
  };

  const handleUpdateImport = (importId: string | number, updates: Partial<ImportRecord>) => {
    updateImportMutation.mutate(
      { id: importId, updates },
      {
        onSuccess: () => {
          setImportToEdit(null);
        },
      }
    );
  };

  const getStatusIcon = (status: ImportStatus) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Loader;
      case 'failed':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status: ImportStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: ImportType) => {
    switch (type) {
      case 'products':
        return FileText;
      case 'orders':
        return FileSpreadsheet;
      case 'customers':
        return User;
      case 'inventory':
        return Package;
      default:
        return File;
    }
  };

  if (importsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Imports</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.completed}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.processing}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Loader className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
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
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalRecords.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              placeholder="Search by file name, type, or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                  { value: 'products', label: 'Products' },
                  { value: 'orders', label: 'Orders' },
                  { value: 'customers', label: 'Customers' },
                  { value: 'inventory', label: 'Inventory' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          </div>
        </div>
      </div>

      {/* Imports Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Uploaded By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Uploaded At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredImports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No imports found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Upload your first file to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedImports.map((imp) => {
                  const StatusIcon = getStatusIcon(imp.status);
                  const TypeIcon = getTypeIcon(imp.type);
                  return (
                    <tr
                      key={imp.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {imp.fileName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 capitalize">
                          {imp.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 dark:text-white ${imp.status === 'processing' ? 'animate-spin' : ''}`} />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(imp.status)}`}>
                            {imp.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {imp.recordsProcessed} / {imp.recordsTotal}
                          {imp.recordsFailed > 0 && (
                            <span className="text-red-600 dark:text-red-400 ml-1">
                              ({imp.recordsFailed} failed)
                            </span>
                          )}
                        </div>
                        {imp.recordsTotal > 0 && (
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-primary-600 h-1.5 rounded-full"
                              style={{
                                width: `${(imp.recordsProcessed / imp.recordsTotal) * 100}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {imp.uploadedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(imp.uploadedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImport(imp);
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setImportToEdit(imp);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setImportToDelete(imp);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredImports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredImports.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredImports.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                <CustomDropdown
                  value={itemsPerPage.toString()}
                  onChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                />
              </div>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadFileModal
          onClose={() => {
            setShowUploadModal(false);
            setSelectedFile(null);
          }}
          onUpload={handleFileUpload}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />
      )}

      {/* View Import Modal */}
      {selectedImport && (
        <ViewImportModal
          importRecord={selectedImport}
          onClose={() => setSelectedImport(null)}
        />
      )}

      {/* Edit Import Modal */}
      {importToEdit && (
        <EditImportModal
          importRecord={importToEdit}
          onClose={() => setImportToEdit(null)}
          onUpdate={handleUpdateImport}
        />
      )}

      {/* Delete Import Modal */}
      {importToDelete && (
        <DeleteImportModal
          importRecord={importToDelete}
          onClose={() => setImportToDelete(null)}
          onConfirm={() => handleDeleteImport(importToDelete.id)}
        />
      )}
    </div>
  );
}

// Upload File Modal
interface UploadFileModalProps {
  onClose: () => void;
  onUpload: (file: File, type: ImportType) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
}

function UploadFileModal({ onClose, onUpload, selectedFile, setSelectedFile }: UploadFileModalProps) {
  const [type, setType] = useState<ImportType>('products');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    onUpload(selectedFile, type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload File for Import</h2>
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
              Import Type <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              value={type}
              onChange={(value) => setType(value as ImportType)}
              options={[
                { value: 'products', label: 'Products' },
                { value: 'orders', label: 'Orders' },
                { value: 'customers', label: 'Customers' },
                { value: 'inventory', label: 'Inventory' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              File <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                selectedFile
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop a file here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supports CSV and Excel files
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    Select File
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">File Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>File must be in CSV or Excel format</li>
                  <li>First row should contain column headers</li>
                  <li>Maximum file size: 10MB</li>
                  <li>Ensure data matches the selected import type</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload & Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Import Modal (Read-only)
interface ViewImportModalProps {
  importRecord: ImportRecord;
  onClose: () => void;
}

function ViewImportModal({ importRecord, onClose }: ViewImportModalProps) {
  const StatusIcon = getStatusIcon(importRecord.status);
  const TypeIcon = getTypeIcon(importRecord.type);
  const progress = importRecord.recordsTotal > 0
    ? (importRecord.recordsProcessed / importRecord.recordsTotal) * 100
    : 0;

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">View Import Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{importRecord.fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <TypeIcon className="w-8 h-8 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {importRecord.type}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon className={`w-4 h-4 ${importRecord.status === 'processing' ? 'animate-spin' : ''}`} />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(importRecord.status)}`}>
                  {importRecord.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File Name
              </label>
              <p className="text-sm text-gray-900 dark:text-white">{importRecord.fileName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <p className="text-sm text-gray-900 dark:text-white capitalize">{importRecord.type}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Progress
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {importRecord.recordsProcessed} / {importRecord.recordsTotal} records processed
                </span>
                <span className="text-gray-600 dark:text-gray-400">{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {importRecord.recordsFailed > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {importRecord.recordsFailed} records failed
                </p>
              )}
            </div>
          </div>

          {importRecord.errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Error Message</p>
                  <p className="text-sm text-red-700 dark:text-red-400">{importRecord.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Uploaded By</span>
              <span className="text-gray-900 dark:text-white">{importRecord.uploadedBy}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Uploaded At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(importRecord.uploadedAt).toLocaleString()}
              </span>
            </div>
            {importRecord.completedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Completed At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(importRecord.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

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

// Edit Import Modal
interface EditImportModalProps {
  importRecord: ImportRecord;
  onClose: () => void;
  onUpdate: (id: string | number, updates: Partial<ImportRecord>) => void;
}

function EditImportModal({ importRecord, onClose, onUpdate }: EditImportModalProps) {
  const [fileName, setFileName] = useState(importRecord.fileName);
  const [type, setType] = useState<ImportType>(importRecord.type);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Update file name when a new file is selected
      setFileName(file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Partial<ImportRecord> = {
      fileName,
      type,
    };
    
    // If a new file is selected, update the file name
    if (selectedFile) {
      updates.fileName = selectedFile.name;
    }
    
    onUpdate(importRecord.id, updates);
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Import</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{importRecord.fileName}</p>
          </div>
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
              Import Type <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              value={type}
              onChange={(value) => setType(value as ImportType)}
              options={[
                { value: 'products', label: 'Products' },
                { value: 'orders', label: 'Orders' },
                { value: 'customers', label: 'Customers' },
                { value: 'inventory', label: 'Inventory' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              File
            </label>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                selectedFile || importRecord.fileName
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-300 dark:border-red-600 rounded-md px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : importRecord.fileName ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{importRecord.fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Current file
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm border border-primary-600 bg-primary-500 dark:border-primary-400 hover:bg-primary-600 dark:hover:bg-primary-600 dark:text-gray-200 dark:hover:text-gray-200 text-white dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 rounded-md px-2 py-1"
                  >
                    Replace File
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Drag and drop a file here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supports CSV and Excel files
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    Select File
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">File Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>File must be in CSV or Excel format</li>
                  <li>First row should contain column headers</li>
                  <li>Maximum file size: 10MB</li>
                  <li>Ensure data matches the selected import type</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center text-[14px] justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Import Modal
interface DeleteImportModalProps {
  importRecord: ImportRecord;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteImportModal({ importRecord, onClose, onConfirm }: DeleteImportModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
              Delete Import Record
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">
              Are you sure you want to delete
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white text-center mb-4">
              "{importRecord.fileName}"?
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 text-center mb-6">
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper functions for Imports section
function getStatusIcon(status: ImportStatus) {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'processing':
      return Loader;
    case 'failed':
      return XCircle;
    case 'pending':
      return Clock;
    default:
      return AlertCircle;
  }
}

function getStatusColor(status: ImportStatus) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'processing':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  }
}

function getTypeIcon(type: ImportType) {
  switch (type) {
    case 'products':
      return FileText;
    case 'orders':
      return FileSpreadsheet;
    case 'customers':
      return User;
    case 'inventory':
      return Package;
    default:
      return File;
  }
}

// Exports Section
function ExportsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportRecord | null>(null);
  const [exportToDelete, setExportToDelete] = useState<ExportRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Fetch exports from API
  const { data: exportsData, isLoading: exportsLoading } = useQuery({
    queryKey: ['data-exports'],
    queryFn: async () => {
      try {
        const response = await api.get('/data-exports?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching data exports:', error);
        return [];
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      // Poll every 2 seconds if there are pending or processing exports
      const data = query.state.data as ExportRecord[] | undefined;
      if (data && Array.isArray(data)) {
        const hasPendingOrProcessing = data.some(
          (exp) => exp.status === 'pending' || exp.status === 'processing'
        );
        return hasPendingOrProcessing ? 2000 : false;
      }
      return false;
    },
  });

  // Transform API data to match ExportRecord interface
  const exports: ExportRecord[] = useMemo(() => {
    if (!exportsData || !Array.isArray(exportsData)) {
      return [];
    }

    return exportsData.map((item: any) => ({
      id: item.id,
      name: item.name || item.fileName || '',
      format: (item.format || 'csv').toLowerCase() as ExportFormat,
      type: (item.type || item.exportType || 'custom').toLowerCase() as ImportType,
      status: (item.status || 'pending').toLowerCase() as ExportStatus,
      recordsCount: item.recordsCount || item.totalRecords || 0,
      fileSize: item.fileSize || item.size,
      createdBy: item.createdBy || item.user?.firstName + ' ' + item.user?.lastName || item.user?.email || 'System',
      createdAt: item.createdAt || new Date().toISOString(),
      completedAt: item.completedAt || item.finishedAt,
      fileUrl: item.fileUrl || item.filePath,
      errorMessage: item.errorMessage || item.error,
    }));
  }, [exportsData]);

  // Create export mutation
  const createExportMutation = useMutation({
    mutationFn: async (data: { name: string; format: ExportFormat; type: ImportType }) => {
      const response = await api.post('/data-exports', data);
      return response.data;
    },
    onSuccess: async () => {
      // Invalidate and refetch the exports list
      await queryClient.invalidateQueries({ queryKey: ['data-exports'] });
      await queryClient.refetchQueries({ queryKey: ['data-exports'] });
      toast.success('Export created successfully! Processing will begin shortly.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create export');
    },
  });

  // Delete export mutation
  const deleteExportMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/data-exports/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-exports'] });
      toast.success('Export record deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete export record');
    },
  });

  // Filter exports
  const filteredExports = useMemo(() => {
    let filtered = exports;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((exp) =>
        exp.name.toLowerCase().includes(query) ||
        exp.type.toLowerCase().includes(query) ||
        exp.createdBy.toLowerCase().includes(query)
      );
    }

    // Filter by format
    if (formatFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.format === formatFilter);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.status === statusFilter);
    }

    // Sort by created date (newest first)
    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [exports, searchQuery, formatFilter, typeFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredExports.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExports = filteredExports.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, formatFilter, typeFilter, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = exports.length;
    const completed = exports.filter((exp) => exp.status === 'completed');
    const processing = exports.filter((exp) => exp.status === 'processing');
    const failed = exports.filter((exp) => exp.status === 'failed');
    const totalRecords = exports.reduce((sum, exp) => sum + exp.recordsCount, 0);

    return {
      total,
      completed: completed.length,
      processing: processing.length,
      failed: failed.length,
      totalRecords,
    };
  }, [exports]);


  const handleDeleteExport = (exportRecord: ExportRecord) => {
    setExportToDelete(exportRecord);
  };

  const confirmDeleteExport = () => {
    if (exportToDelete) {
      deleteExportMutation.mutate(exportToDelete.id);
      setExportToDelete(null);
    }
  };

  const handleCreateExport = (data: { name: string; format: ExportFormat; type: ImportType }) => {
    createExportMutation.mutate(data);
    setShowCreateModal(false);
  };

  const handleDownload = (exportRecord: ExportRecord) => {
    if (exportRecord.fileUrl && exportRecord.status === 'completed') {
      // Download the file
      const link = document.createElement('a');
      link.href = exportRecord.fileUrl;
      link.download = `${exportRecord.name}.${exportRecord.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${exportRecord.name}...`);
    } else {
      toast.error('Export is not ready for download');
    }
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Loader;
      case 'failed':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status: ExportStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return FileText;
      case 'excel':
        return FileSpreadsheet;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (exportsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Exports</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.completed}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {summaryMetrics.processing}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Loader className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
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
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalRecords.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              placeholder="Search by name, type, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 text-[14px] ::placeholder-[12px] pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[180px]">
              <CustomDropdown
                value={formatFilter}
                onChange={setFormatFilter}
                options={[
                  { value: 'all', label: 'All Formats' },
                  { value: 'csv', label: 'CSV' },
                  { value: 'excel', label: 'Excel' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'products', label: 'Products' },
                  { value: 'orders', label: 'Orders' },
                  { value: 'customers', label: 'Customers' },
                  { value: 'inventory', label: 'Inventory' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Export
            </button>
          </div>
        </div>
      </div>

      {/* Exports Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Export Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  File Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Download className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No exports found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first export to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedExports.map((exp) => {
                  const StatusIcon = getStatusIcon(exp.status);
                  const FormatIcon = getFormatIcon(exp.format);
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FormatIcon className="w-4 h-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {exp.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 uppercase">
                          {exp.format}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 capitalize">
                          {exp.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 dark:text-white ${exp.status === 'processing' ? 'animate-spin' : ''}`} />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exp.status)}`}>
                            {exp.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {exp.recordsCount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(exp.fileSize)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {exp.createdBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(exp.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {exp.status === 'completed' && (
                            <button
                              onClick={() => handleDownload(exp)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedExport(exp)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExport(exp);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredExports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredExports.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredExports.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                <CustomDropdown
                  value={itemsPerPage.toString()}
                  onChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                />
              </div>
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

      {/* Create Export Modal */}
      {showCreateModal && (
        <CreateExportModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateExport}
        />
      )}

      {/* View Export Modal */}
      {selectedExport && (
        <ViewExportModal
          exportRecord={selectedExport}
          onClose={() => setSelectedExport(null)}
          onDownload={handleDownload}
        />
      )}

      {/* Delete Export Modal */}
      {exportToDelete && (
        <DeleteExportModal
          exportRecord={exportToDelete}
          onClose={() => setExportToDelete(null)}
          onConfirm={confirmDeleteExport}
        />
      )}
    </div>
  );
}

// Create Export Modal
interface CreateExportModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; format: ExportFormat; type: ImportType }) => void;
}

function CreateExportModal({ onClose, onCreate }: CreateExportModalProps) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [type, setType] = useState<ImportType>('products');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter an export name');
      return;
    }
    onCreate({ name: name.trim(), format, type });
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Export</h2>
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
              Export Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Products Export - 2024"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              value={format}
              onChange={(value) => setFormat(value as ExportFormat)}
              options={[
                { value: 'csv', label: 'CSV' },
                { value: 'excel', label: 'Excel' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Type <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              value={type}
              onChange={(value) => setType(value as ImportType)}
              options={[
                { value: 'products', label: 'Products' },
                { value: 'orders', label: 'Orders' },
                { value: 'customers', label: 'Customers' },
                { value: 'inventory', label: 'Inventory' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Export Information:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Export will be processed in the background</li>
                  <li>You will be notified when the export is ready</li>
                  <li>Exports are available for download for 30 days</li>
                  <li>Large exports may take several minutes to complete</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
              Create Export
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Export Modal
interface ViewExportModalProps {
  exportRecord: ExportRecord;
  onClose: () => void;
  onDownload: (exportRecord: ExportRecord) => void;
}

function ViewExportModal({ exportRecord, onClose, onDownload }: ViewExportModalProps) {
  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Loader;
      case 'failed':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status: ExportStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'csv':
        return FileText;
      case 'excel':
        return FileSpreadsheet;
      default:
        return File;
    }
  };

  const StatusIcon = getStatusIcon(exportRecord.status);
  const FormatIcon = getFormatIcon(exportRecord.format);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{exportRecord.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FormatIcon className="w-8 h-8 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {exportRecord.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon className={`w-4 h-4 ${exportRecord.status === 'processing' ? 'animate-spin' : ''}`} />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exportRecord.status)}`}>
                  {exportRecord.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format
              </label>
              <p className="text-sm text-gray-900 dark:text-white uppercase">{exportRecord.format}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <p className="text-sm text-gray-900 dark:text-white capitalize">{exportRecord.type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Records
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {exportRecord.recordsCount.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                File Size
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatFileSize(exportRecord.fileSize)}
              </p>
            </div>
          </div>

          {exportRecord.errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Error Message</p>
                  <p className="text-sm text-red-700 dark:text-red-400">{exportRecord.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created By</span>
              <span className="text-gray-900 dark:text-white">{exportRecord.createdBy}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(exportRecord.createdAt).toLocaleString()}
              </span>
            </div>
            {exportRecord.completedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Completed At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(exportRecord.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {exportRecord.status === 'completed' && exportRecord.fileUrl && (
              <button
                onClick={() => onDownload(exportRecord)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delete Export Modal
interface DeleteExportModalProps {
  exportRecord: ExportRecord;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteExportModal({ exportRecord, onClose, onConfirm }: DeleteExportModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
              Delete Export Record
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">
              Are you sure you want to delete
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white text-center mb-4">
              "{exportRecord.name}"?
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 text-center mb-6">
              This action cannot be undone.
            </p>
            <div className="flex text-[14px] items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}