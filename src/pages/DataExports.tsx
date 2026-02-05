import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  File,
  Trash2,
  Clock,
  User,
  XCircle,
  Loader,
  Package,
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load imports from localStorage
  const [imports, setImports] = useState<ImportRecord[]>(() => {
    const saved = localStorage.getItem('data-exports-imports');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default imports
    return [
      {
        id: 1,
        fileName: 'products_import_2024.csv',
        type: 'products' as ImportType,
        status: 'completed' as ImportStatus,
        recordsTotal: 1500,
        recordsProcessed: 1500,
        recordsFailed: 0,
        uploadedBy: 'John Doe',
        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86300000).toISOString(),
      },
      {
        id: 2,
        fileName: 'orders_batch_2024.xlsx',
        type: 'orders' as ImportType,
        status: 'processing' as ImportStatus,
        recordsTotal: 500,
        recordsProcessed: 350,
        recordsFailed: 5,
        uploadedBy: 'Jane Smith',
        uploadedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 3,
        fileName: 'customers_list.csv',
        type: 'customers' as ImportType,
        status: 'failed' as ImportStatus,
        recordsTotal: 200,
        recordsProcessed: 0,
        recordsFailed: 200,
        uploadedBy: 'Bob Johnson',
        uploadedAt: new Date(Date.now() - 7200000).toISOString(),
        errorMessage: 'Invalid file format or missing required columns',
      },
      {
        id: 4,
        fileName: 'inventory_update.csv',
        type: 'inventory' as ImportType,
        status: 'pending' as ImportStatus,
        recordsTotal: 800,
        recordsProcessed: 0,
        recordsFailed: 0,
        uploadedBy: 'Alice Williams',
        uploadedAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('data-exports-imports', JSON.stringify(imports));
  }, [imports]);

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
    const newImport: ImportRecord = {
      id: Date.now(),
      fileName: file.name,
      type,
      status: 'pending' as ImportStatus,
      recordsTotal: 0, // Would be calculated after processing
      recordsProcessed: 0,
      recordsFailed: 0,
      uploadedBy: 'Current User', // Would come from auth context
      uploadedAt: new Date().toISOString(),
    };
    setImports([newImport, ...imports]);
    setShowUploadModal(false);
    setSelectedFile(null);
    toast.success('File uploaded successfully! Processing will begin shortly.');
    
    // Simulate processing
    setTimeout(() => {
      setImports((prev) =>
        prev.map((imp) =>
          imp.id === newImport.id
            ? { ...imp, status: 'processing' as ImportStatus }
            : imp
        )
      );
    }, 1000);
  };

  const handleDeleteImport = (importId: string | number) => {
    setImports(imports.filter((imp) => imp.id !== importId));
    toast.success('Import record deleted successfully!');
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by file name, type, or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
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
                filteredImports.map((imp) => {
                  const StatusIcon = getStatusIcon(imp.status);
                  const TypeIcon = getTypeIcon(imp.type);
                  return (
                    <tr
                      key={imp.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedImport(imp)}
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
                          <StatusIcon className={`w-4 h-4 ${imp.status === 'processing' ? 'animate-spin' : ''}`} />
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
                              handleDeleteImport(imp.id);
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

      {/* Import Details Modal */}
      {selectedImport && (
        <ImportDetailsModal
          importRecord={selectedImport}
          onClose={() => setSelectedImport(null)}
          onDelete={handleDeleteImport}
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
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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

// Import Details Modal
interface ImportDetailsModalProps {
  importRecord: ImportRecord;
  onClose: () => void;
  onDelete: (id: string | number) => void;
}

function ImportDetailsModal({ importRecord, onClose, onDelete }: ImportDetailsModalProps) {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this import record?')) {
      onDelete(importRecord.id);
      onClose();
    }
  };

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Details</h2>
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
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
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

  // Load exports from localStorage
  const [exports, setExports] = useState<ExportRecord[]>(() => {
    const saved = localStorage.getItem('data-exports-exports');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default exports
    return [
      {
        id: 1,
        name: 'Products Export - 2024',
        format: 'csv' as ExportFormat,
        type: 'products' as ImportType,
        status: 'completed' as ExportStatus,
        recordsCount: 1500,
        fileSize: 2456789,
        createdBy: 'John Doe',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86300000).toISOString(),
        fileUrl: '#',
      },
      {
        id: 2,
        name: 'Orders Report - Q1 2024',
        format: 'excel' as ExportFormat,
        type: 'orders' as ImportType,
        status: 'completed' as ExportStatus,
        recordsCount: 500,
        fileSize: 1234567,
        createdBy: 'Jane Smith',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        completedAt: new Date(Date.now() - 172700000).toISOString(),
        fileUrl: '#',
      },
      {
        id: 3,
        name: 'Customer List Export',
        format: 'csv' as ExportFormat,
        type: 'customers' as ImportType,
        status: 'processing' as ExportStatus,
        recordsCount: 0,
        createdBy: 'Bob Johnson',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 4,
        name: 'Inventory Snapshot',
        format: 'excel' as ExportFormat,
        type: 'inventory' as ImportType,
        status: 'failed' as ExportStatus,
        recordsCount: 0,
        createdBy: 'Alice Williams',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        errorMessage: 'Export failed due to insufficient permissions',
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('data-exports-exports', JSON.stringify(exports));
  }, [exports]);

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


  const handleDeleteExport = (exportId: string | number) => {
    setExports(exports.filter((exp) => exp.id !== exportId));
    toast.success('Export record deleted successfully!');
  };

  const handleDownload = (exportRecord: ExportRecord) => {
    if (exportRecord.fileUrl && exportRecord.status === 'completed') {
      // In a real app, this would download the file
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
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
                filteredExports.map((exp) => {
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
                          <StatusIcon className={`w-4 h-4 ${exp.status === 'processing' ? 'animate-spin' : ''}`} />
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
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExport(exp.id)}
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
    </div>
  );
}