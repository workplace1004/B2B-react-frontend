import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import {
  FileText,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  User,
  Calendar,
  Clock,
  Trash2,
  Download,
  Activity,
  Server,
  Shield,
  Database,
  Settings,
  Plus,
  Edit,
  Upload,
  LogIn,
  LogOut,
  Package,
  ShoppingCart,
  Warehouse,
  Users,
  Plug,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'audit-logs' | 'system-logs';
type AuditLogAction = 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'login' | 'logout';
type AuditLogEntity = 'product' | 'order' | 'customer' | 'inventory' | 'user' | 'role' | 'settings' | 'integration';
type SystemLogLevel = 'info' | 'warning' | 'error' | 'debug' | 'critical';
type SystemLogCategory = 'api' | 'database' | 'authentication' | 'integration' | 'scheduler' | 'system' | 'security';

interface AuditLog {
  id: string | number;
  action: AuditLogAction;
  entity: AuditLogEntity;
  entityId: string | number;
  entityName: string;
  userId: string | number;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
}

interface SystemLog {
  id: string | number;
  level: SystemLogLevel;
  category: SystemLogCategory;
  message: string;
  details?: string;
  stackTrace?: string;
  source: string;
  userId?: string | number;
  userName?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  resolved: boolean;
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

export default function Logs() {
  const [activeTab, setActiveTab] = useState<TabType>('audit-logs');

  const tabs = [
    { id: 'audit-logs' as TabType, label: 'Audit Logs', icon: Shield },
    { id: 'system-logs' as TabType, label: 'System Logs', icon: Server },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Logs" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Logs</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              View audit logs and system logs for monitoring and troubleshooting
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
        {activeTab === 'audit-logs' && <AuditLogsSection />}
        {activeTab === 'system-logs' && <SystemLogsSection />}
      </div>
    </div>
  );
}

// Audit Logs Section
function AuditLogsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [successFilter, setSuccessFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [dateRange, setDateRange] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch audit logs from API
  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery({
    queryKey: ['audit-logs', 'detailed'],
    queryFn: async () => {
      try {
        const response = await api.get('/audit-logs?skip=0&take=1000');
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }
    },
  });

  // Transform API data to match AuditLog interface
  const auditLogs: AuditLog[] = useMemo(() => {
    if (!auditLogsData || !Array.isArray(auditLogsData)) {
      return [];
    }

    return auditLogsData.map((log: any) => {
      // Map action from enum to lowercase
      const actionMap: Record<string, AuditLogAction> = {
        CREATE: 'create',
        UPDATE: 'update',
        DELETE: 'delete',
        VIEW: 'view',
        EXPORT: 'export',
      };
      const action = actionMap[log.action] || log.action.toLowerCase() as AuditLogAction;

      // Map entity type to entity enum
      const entityMap: Record<string, AuditLogEntity> = {
        Product: 'product',
        Order: 'order',
        Customer: 'customer',
        Inventory: 'inventory',
        User: 'user',
        Role: 'role',
        Settings: 'settings',
        Integration: 'integration',
      };
      const entity = entityMap[log.entityType] || log.entityType.toLowerCase() as AuditLogEntity;

      // Get user info
      const userName = log.user
        ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email || 'System'
        : 'System';

      return {
        id: log.id,
        action,
        entity,
        entityId: log.entityId || 0,
        entityName: log.entityId ? `${log.entityType} #${log.entityId}` : log.entityType,
        userId: log.userId,
        userName,
        userEmail: log.user?.email || '',
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || '',
        changes: log.changes || undefined,
        metadata: log.metadata || undefined,
        timestamp: log.createdAt,
        success: true, // API doesn't have success field, assume true
        errorMessage: undefined,
      };
    });
  }, [auditLogsData]);

  // Filter audit logs
  const filteredLogs = useMemo(() => {
    let filtered = auditLogs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) =>
        log.entityName.toLowerCase().includes(query) ||
        log.userName.toLowerCase().includes(query) ||
        log.userEmail.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.entity.toLowerCase().includes(query) ||
        log.ipAddress.toLowerCase().includes(query)
      );
    }

    // Filter by action
    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Filter by entity
    if (entityFilter !== 'all') {
      filtered = filtered.filter((log) => log.entity === entityFilter);
    }

    // Filter by user
    if (userFilter !== 'all') {
      filtered = filtered.filter((log) => log.userId.toString() === userFilter);
    }

    // Filter by success
    if (successFilter !== 'all') {
      filtered = filtered.filter((log) => 
        successFilter === 'success' ? log.success : !log.success
      );
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const cutoff = new Date();
      switch (dateRange) {
        case '1h':
          cutoff.setHours(cutoff.getHours() - 1);
          break;
        case '24h':
          cutoff.setHours(cutoff.getHours() - 24);
          break;
        case '7d':
          cutoff.setDate(cutoff.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(cutoff.getDate() - 30);
          break;
      }
      filtered = filtered.filter((log) => new Date(log.timestamp) >= cutoff);
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [auditLogs, searchQuery, actionFilter, entityFilter, userFilter, successFilter, dateRange]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, entityFilter, userFilter, successFilter, dateRange]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = auditLogs.length;
    const successful = auditLogs.filter((log) => log.success);
    const failed = auditLogs.filter((log) => !log.success);
    const uniqueUsers = new Set(auditLogs.map((log) => log.userId)).size;
    const today = auditLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    });

    return {
      total,
      successful: successful.length,
      failed: failed.length,
      uniqueUsers,
      today: today.length,
    };
  }, [auditLogs]);

  const handleDeleteLog = (_logId: string | number) => {
    // Audit logs are immutable for compliance and security reasons
    toast.error('Audit logs cannot be deleted for compliance and security reasons.');
  };

  const handleExportLogs = () => {
    const csvContent = [
      ['ID', 'Action', 'Entity', 'Entity Name', 'User', 'IP Address', 'Timestamp', 'Success'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.id,
          log.action,
          log.entity,
          log.entityName,
          log.userName,
          log.ipAddress,
          log.timestamp,
          log.success ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Audit logs exported successfully!');
  };

  const getActionIcon = (action: AuditLogAction) => {
    switch (action) {
      case 'create':
        return Plus;
      case 'update':
        return Edit;
      case 'delete':
        return Trash2;
      case 'view':
        return Eye;
      case 'export':
        return Download;
      case 'import':
        return Upload;
      case 'login':
        return LogIn;
      case 'logout':
        return LogOut;
      default:
        return Activity;
    }
  };

  const getActionColor = (action: AuditLogAction) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'view':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'export':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'import':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'login':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'logout':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getEntityIcon = (entity: AuditLogEntity) => {
    switch (entity) {
      case 'product':
        return Package;
      case 'order':
        return ShoppingCart;
      case 'customer':
        return User;
      case 'inventory':
        return Warehouse;
      case 'user':
        return Users;
      case 'role':
        return Shield;
      case 'settings':
        return Settings;
      case 'integration':
        return Plug;
      default:
        return FileText;
    }
  };

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const users = new Map<string | number, { id: string | number; name: string }>();
    auditLogs.forEach((log) => {
      if (!users.has(log.userId)) {
        users.set(log.userId, { id: log.userId, name: log.userName });
      }
    });
    return Array.from(users.values());
  }, [auditLogs]);

  if (auditLogsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.successful}
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
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.uniqueUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.today}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <CustomDropdown
              value={actionFilter}
              onChange={setActionFilter}
              options={[
                { value: 'all', label: 'All Actions' },
                { value: 'create', label: 'Create' },
                { value: 'update', label: 'Update' },
                { value: 'delete', label: 'Delete' },
                { value: 'view', label: 'View' },
                { value: 'export', label: 'Export' },
                { value: 'import', label: 'Import' },
                { value: 'login', label: 'Login' },
                { value: 'logout', label: 'Logout' },
              ]}
              placeholder="Action"
            />
          </div>

          {/* Entity Filter */}
          <div>
            <CustomDropdown
              value={entityFilter}
              onChange={setEntityFilter}
              options={[
                { value: 'all', label: 'All Entities' },
                { value: 'product', label: 'Product' },
                { value: 'order', label: 'Order' },
                { value: 'customer', label: 'Customer' },
                { value: 'inventory', label: 'Inventory' },
                { value: 'user', label: 'User' },
                { value: 'role', label: 'Role' },
                { value: 'settings', label: 'Settings' },
                { value: 'integration', label: 'Integration' },
              ]}
              placeholder="Entity"
            />
          </div>

          {/* User Filter */}
          <div>
            <CustomDropdown
              value={userFilter}
              onChange={setUserFilter}
              options={[
                { value: 'all', label: 'All Users' },
                ...uniqueUsers.map((user) => ({
                  value: user.id.toString(),
                  label: user.name,
                })),
              ]}
              placeholder="User"
            />
          </div>

          {/* Success Filter */}
          <div>
            <CustomDropdown
              value={successFilter}
              onChange={setSuccessFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'success', label: 'Success' },
                { value: 'failed', label: 'Failed' },
              ]}
              placeholder="Status"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Date Range Filter */}
          <div>
            <CustomDropdown
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: 'all', label: 'All Time' },
                { value: '1h', label: 'Last Hour' },
                { value: '24h', label: 'Last 24 Hours' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
              ]}
              placeholder="Date Range"
            />
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-5 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setActionFilter('all');
                setEntityFilter('all');
                setUserFilter('all');
                setSuccessFilter('all');
                setDateRange('all');
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
            <button
              onClick={handleExportLogs}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p>No audit logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  const EntityIcon = getEntityIcon(log.entity);
                  const timestamp = new Date(log.timestamp);
                  
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="w-4 h-4 text-gray-400" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <EntityIcon className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.entityName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {log.entity}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.userName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {log.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.ipAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{timestamp.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
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
      {filteredLogs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredLogs.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredLogs.length}</span> results
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

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
              onClick={() => setSelectedLog(null)}
            ></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const ActionIcon = getActionIcon(selectedLog.action);
                      return <ActionIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />;
                    })()}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Audit Log Details
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedLog.entityName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Action
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Entity
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white capitalize">
                      {selectedLog.entity}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Entity ID
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                      {selectedLog.entityId}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {selectedLog.success ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Information */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">User Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        User Name
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                        {selectedLog.userName}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        User Email
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                        {selectedLog.userEmail}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        IP Address
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                        {selectedLog.ipAddress}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Timestamp
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Changes */}
                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Changes</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedLog.changes).map(([key, change]) => (
                        <div key={key} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1 capitalize">
                            {key}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="line-through text-red-600 dark:text-red-400 mr-2">
                              {JSON.stringify(change.old)}
                            </span>
                            <span className="text-green-600 dark:text-green-400">
                              → {JSON.stringify(change.new)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {selectedLog.errorMessage && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Error Message</h4>
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-400">
                      {selectedLog.errorMessage}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Metadata</h4>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* User Agent */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">User Agent</h4>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 break-all">
                    {selectedLog.userAgent}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// System Logs Section
function SystemLogsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [dateRange, setDateRange] = useState<string>('all');

  // Load system logs from localStorage
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => {
    const saved = localStorage.getItem('logs-system-logs');
    if (saved) {
      return JSON.parse(saved);
    }
    // Generate default system logs
    const logs: SystemLog[] = [];
    const levels: SystemLogLevel[] = ['info', 'warning', 'error', 'debug', 'critical'];
    const categories: SystemLogCategory[] = ['api', 'database', 'authentication', 'integration', 'scheduler', 'system', 'security'];
    const sources = ['API Server', 'Database', 'Auth Service', 'Integration Engine', 'Scheduler', 'System Monitor', 'Security Service'];
    const messages = [
      'Database connection established',
      'API request processed successfully',
      'Authentication token expired',
      'Integration sync completed',
      'Scheduled task executed',
      'System health check passed',
      'Security alert triggered',
      'Failed to connect to external service',
      'Rate limit exceeded',
      'Cache miss occurred',
    ];
    const now = new Date();
    
    for (let i = 0; i < 50; i++) {
      const date = new Date(now);
      date.setHours(date.getHours() - Math.floor(i / 3));
      date.setMinutes(date.getMinutes() - (i % 3) * 20);
      const level = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      const resolved = Math.random() > 0.3; // 70% resolved
      
      logs.push({
        id: i + 1,
        level,
        category,
        message,
        details: level === 'error' || level === 'critical' ? `Detailed error information for ${message}` : undefined,
        stackTrace: level === 'error' || level === 'critical' ? `Error: ${message}\n  at function (file.js:123)\n  at handler (file.js:456)` : undefined,
        source,
        userId: Math.random() > 0.5 ? Math.floor(Math.random() * 4) + 1 : undefined,
        userName: Math.random() > 0.5 ? ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams'][Math.floor(Math.random() * 4)] : undefined,
        requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          environment: 'production',
          version: '1.2.3',
        },
        timestamp: date.toISOString(),
        resolved,
      });
    }
    return logs;
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('logs-system-logs', JSON.stringify(systemLogs));
  }, [systemLogs]);

  // Filter system logs
  const filteredLogs = useMemo(() => {
    let filtered = systemLogs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) =>
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        log.category.toLowerCase().includes(query) ||
        (log.userName && log.userName.toLowerCase().includes(query)) ||
        (log.requestId && log.requestId.toLowerCase().includes(query))
      );
    }

    // Filter by level
    if (levelFilter !== 'all') {
      filtered = filtered.filter((log) => log.level === levelFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((log) => log.category === categoryFilter);
    }

    // Filter by resolved
    if (resolvedFilter !== 'all') {
      filtered = filtered.filter((log) => 
        resolvedFilter === 'resolved' ? log.resolved : !log.resolved
      );
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const cutoff = new Date();
      switch (dateRange) {
        case '1h':
          cutoff.setHours(cutoff.getHours() - 1);
          break;
        case '24h':
          cutoff.setHours(cutoff.getHours() - 24);
          break;
        case '7d':
          cutoff.setDate(cutoff.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(cutoff.getDate() - 30);
          break;
      }
      filtered = filtered.filter((log) => new Date(log.timestamp) >= cutoff);
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [systemLogs, searchQuery, levelFilter, categoryFilter, resolvedFilter, dateRange]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = systemLogs.length;
    const errors = systemLogs.filter((log) => log.level === 'error' || log.level === 'critical');
    const warnings = systemLogs.filter((log) => log.level === 'warning');
    const unresolved = systemLogs.filter((log) => !log.resolved);
    const today = systemLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    });

    return {
      total,
      errors: errors.length,
      warnings: warnings.length,
      unresolved: unresolved.length,
      today: today.length,
    };
  }, [systemLogs]);

  const handleResolveLog = (logId: string | number) => {
    setSystemLogs(systemLogs.map((log) => 
      log.id === logId ? { ...log, resolved: true } : log
    ));
    toast.success('Log marked as resolved!');
  };

  const handleDeleteLog = (logId: string | number) => {
    setSystemLogs(systemLogs.filter((log) => log.id !== logId));
    toast.success('System log deleted successfully!');
  };

  const handleExportLogs = () => {
    const csvContent = [
      ['ID', 'Level', 'Category', 'Message', 'Source', 'Timestamp', 'Resolved'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.id,
          log.level,
          log.category,
          log.message,
          log.source,
          log.timestamp,
          log.resolved ? 'Yes' : 'No',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('System logs exported successfully!');
  };

  const getLevelIcon = (level: SystemLogLevel) => {
    switch (level) {
      case 'info':
        return Info;
      case 'warning':
        return AlertTriangle;
      case 'error':
      case 'critical':
        return AlertCircle;
      case 'debug':
        return Activity;
      default:
        return Info;
    }
  };

  const getLevelColor = (level: SystemLogLevel) => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'critical':
        return 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300';
      case 'debug':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getCategoryIcon = (category: SystemLogCategory) => {
    switch (category) {
      case 'api':
        return Activity;
      case 'database':
        return Database;
      case 'authentication':
        return Shield;
      case 'integration':
        return Plug;
      case 'scheduler':
        return Clock;
      case 'system':
        return Server;
      case 'security':
        return Shield;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.errors}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.warnings}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unresolved</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {summaryMetrics.unresolved}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.today}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Level Filter */}
          <div>
            <CustomDropdown
              value={levelFilter}
              onChange={setLevelFilter}
              options={[
                { value: 'all', label: 'All Levels' },
                { value: 'info', label: 'Info' },
                { value: 'warning', label: 'Warning' },
                { value: 'error', label: 'Error' },
                { value: 'critical', label: 'Critical' },
                { value: 'debug', label: 'Debug' },
              ]}
              placeholder="Level"
            />
          </div>

          {/* Category Filter */}
          <div>
            <CustomDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'api', label: 'API' },
                { value: 'database', label: 'Database' },
                { value: 'authentication', label: 'Authentication' },
                { value: 'integration', label: 'Integration' },
                { value: 'scheduler', label: 'Scheduler' },
                { value: 'system', label: 'System' },
                { value: 'security', label: 'Security' },
              ]}
              placeholder="Category"
            />
          </div>

          {/* Resolved Filter */}
          <div>
            <CustomDropdown
              value={resolvedFilter}
              onChange={setResolvedFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'unresolved', label: 'Unresolved' },
              ]}
              placeholder="Status"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Date Range Filter */}
          <div>
            <CustomDropdown
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: 'all', label: 'All Time' },
                { value: '1h', label: 'Last Hour' },
                { value: '24h', label: 'Last 24 Hours' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
              ]}
              placeholder="Date Range"
            />
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-5 flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setLevelFilter('all');
                setCategoryFilter('all');
                setResolvedFilter('all');
                setDateRange('all');
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
            <button
              onClick={handleExportLogs}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p>No system logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const LevelIcon = getLevelIcon(log.level);
                  const CategoryIcon = getCategoryIcon(log.category);
                  const timestamp = new Date(log.timestamp);
                  
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <LevelIcon className="w-4 h-4 text-gray-400" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                            {log.level}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white capitalize">
                            {log.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white max-w-md truncate">
                          {log.message}
                        </div>
                        {log.details && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md truncate">
                            {log.details}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {log.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{timestamp.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.resolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            <AlertCircle className="w-3 h-3" />
                            Unresolved
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!log.resolved && (
                            <button
                              onClick={() => handleResolveLog(log.id)}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
                              title="Mark as Resolved"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
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

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
              onClick={() => setSelectedLog(null)}
            ></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const LevelIcon = getLevelIcon(selectedLog.level);
                      return <LevelIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />;
                    })()}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        System Log Details
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedLog.message}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Level
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(selectedLog.level)}`}>
                        {selectedLog.level}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white capitalize">
                      {selectedLog.category}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Source
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                      {selectedLog.source}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {selectedLog.resolved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          <AlertCircle className="w-3 h-3" />
                          Unresolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Message</h4>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                    {selectedLog.message}
                  </div>
                </div>

                {/* Details */}
                {selectedLog.details && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Details</h4>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {selectedLog.details}
                    </div>
                  </div>
                )}

                {/* Stack Trace */}
                {selectedLog.stackTrace && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Stack Trace</h4>
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <pre className="text-xs text-red-800 dark:text-red-400 whitespace-pre-wrap font-mono">
                        {selectedLog.stackTrace}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Additional Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.userName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          User
                        </label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                          {selectedLog.userName}
                        </div>
                      </div>
                    )}
                    {selectedLog.requestId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Request ID
                        </label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white font-mono">
                          {selectedLog.requestId}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Timestamp
                      </label>
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                        {new Date(selectedLog.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Metadata</h4>
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex items-center justify-end gap-3">
                {!selectedLog.resolved && (
                  <button
                    onClick={() => {
                      handleResolveLog(selectedLog.id);
                      setSelectedLog({ ...selectedLog, resolved: true });
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}