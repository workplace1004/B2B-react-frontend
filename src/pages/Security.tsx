import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Shield,
  Plus,
  Search,
  Filter,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Key,
  Smartphone,
  QrCode,
  Download,
  Copy,
  RefreshCw,
  Lock,
  Unlock,
  Globe,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { CustomDropdown } from '../components/ui';

type TabType = '2fa' | 'sso';
type TwoFactorMethod = 'totp' | 'sms' | 'email' | 'backup-code';
type TwoFactorStatus = 'enabled' | 'disabled' | 'pending';
type SSOProvider = 'google' | 'microsoft' | 'okta' | 'auth0' | 'saml' | 'oauth2';
type SSOStatus = 'active' | 'inactive' | 'pending';

interface TwoFactorConfig {
  id: string | number;
  method: TwoFactorMethod;
  status: TwoFactorStatus;
  label: string;
  secret?: string;
  qrCode?: string;
  phoneNumber?: string;
  email?: string;
  backupCodes?: string[];
  lastUsed?: string;
  createdAt: string;
  updatedAt?: string;
}

interface SSOConfig {
  id: string | number;
  provider: SSOProvider;
  name: string;
  status: SSOStatus;
  clientId?: string;
  clientSecret?: string;
  domain?: string;
  redirectUri?: string;
  metadataUrl?: string;
  enabledForUsers: string[];
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

// Delete 2FA Modal Component
function Delete2FAModal({
  config,
  onClose,
  onConfirm,
  isShowing,
}: {
  config: TwoFactorConfig;
  onClose: () => void;
  onConfirm: () => void;
  isShowing: boolean;
}) {
  if (!isShowing) return null;

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
          <div className="modal-body text-center py-8 px-6">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={2} />
              </div>
            </div>
            <h5 id="delete2FAModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
              Delete 2FA Method
            </h5>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              Are you sure you want to delete
            </p>
            <p className="text-gray-900 dark:text-white font-semibold mb-4">
              "{config.label}"?
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
              Delete 2FA Method
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Delete SSO Modal Component
function DeleteSSOModal({
  sso,
  onClose,
  onConfirm,
  isShowing,
}: {
  sso: SSOConfig;
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
        aria-labelledby="deleteSSOModalLabel"
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
              <h5 id="deleteSSOModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
                Delete SSO Configuration
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{sso.name}"?
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
                Delete SSO Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Security() {
  const [activeTab, setActiveTab] = useState<TabType>('2fa');

  const tabs = [
    { id: '2fa' as TabType, label: '2FA (Two-Factor Authentication)', icon: Shield },
    { id: 'sso' as TabType, label: 'SSO (Single Sign-On)', icon: Globe },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Security" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Security</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage two-factor authentication and single sign-on settings
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
        {activeTab === '2fa' && <TwoFactorSection />}
        {activeTab === 'sso' && <SSOSection />}
      </div>
    </div>
  );
}

// 2FA Section
function TwoFactorSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConfig, setSelectedConfig] = useState<TwoFactorConfig | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [configToView, setConfigToView] = useState<TwoFactorConfig | null>(null);
  const [configToEdit, setConfigToEdit] = useState<TwoFactorConfig | null>(null);
  const [configToDelete, setConfigToDelete] = useState<TwoFactorConfig | null>(null);
  const [isDelete2FAModalShowing, setIsDelete2FAModalShowing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

  // Load 2FA configs from localStorage
  const [twoFactorConfigs, setTwoFactorConfigs] = useState<TwoFactorConfig[]>(() => {
    const saved = localStorage.getItem('security-2fa-configs');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default configs
    return [
      {
        id: 1,
        method: 'totp' as TwoFactorMethod,
        status: 'enabled' as TwoFactorStatus,
        label: 'Authenticator App',
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UVIgQ29kZTwvdGV4dD48L3N2Zz4=',
        backupCodes: ['12345678', '87654321', '11223344', '44332211', '55667788'],
        lastUsed: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        method: 'sms' as TwoFactorMethod,
        status: 'disabled' as TwoFactorStatus,
        label: 'SMS Verification',
        phoneNumber: '+1 (555) 123-4567',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        method: 'email' as TwoFactorMethod,
        status: 'enabled' as TwoFactorStatus,
        label: 'Email Verification',
        email: 'user@example.com',
        lastUsed: new Date(Date.now() - 7200000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('security-2fa-configs', JSON.stringify(twoFactorConfigs));
  }, [twoFactorConfigs]);

  // Filter configs
  const filteredConfigs = useMemo(() => {
    let filtered = twoFactorConfigs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((config) =>
        config.label.toLowerCase().includes(query) ||
        config.method.toLowerCase().includes(query) ||
        (config.phoneNumber && config.phoneNumber.toLowerCase().includes(query)) ||
        (config.email && config.email.toLowerCase().includes(query))
      );
    }

    // Filter by method
    if (methodFilter !== 'all') {
      filtered = filtered.filter((config) => config.method === methodFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((config) => config.status === statusFilter);
    }

    // Sort by status (enabled first) then by label
    return filtered.sort((a, b) => {
      if (a.status === 'enabled' && b.status !== 'enabled') return -1;
      if (a.status !== 'enabled' && b.status === 'enabled') return 1;
      return a.label.localeCompare(b.label);
    });
  }, [twoFactorConfigs, searchQuery, methodFilter, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = twoFactorConfigs.length;
    const enabled = twoFactorConfigs.filter((config) => config.status === 'enabled');
    const totpMethods = twoFactorConfigs.filter((config) => config.method === 'totp');
    const smsMethods = twoFactorConfigs.filter((config) => config.method === 'sms');

    return {
      total,
      enabled: enabled.length,
      totpMethods: totpMethods.length,
      smsMethods: smsMethods.length,
    };
  }, [twoFactorConfigs]);

  const handleEnable2FA = (configId: string | number) => {
    setTwoFactorConfigs(twoFactorConfigs.map((config) =>
      config.id === configId
        ? { ...config, status: 'enabled' as TwoFactorStatus, updatedAt: new Date().toISOString() }
        : config
    ));
    toast.success('2FA method enabled successfully!');
  };

  const handleDisable2FA = (configId: string | number) => {
    setTwoFactorConfigs(twoFactorConfigs.map((config) =>
      config.id === configId
        ? { ...config, status: 'disabled' as TwoFactorStatus, updatedAt: new Date().toISOString() }
        : config
    ));
    toast.success('2FA method disabled successfully!');
  };

  const handleSetup2FA = (configData: any) => {
    const newConfig: TwoFactorConfig = {
      id: Date.now(),
      ...configData,
      status: 'pending' as TwoFactorStatus,
      createdAt: new Date().toISOString(),
    };
    setTwoFactorConfigs([...twoFactorConfigs, newConfig]);
    setShowSetupModal(false);
    toast.success('2FA method setup initiated!');
  };

  const handleUpdate2FA = (configId: string | number, updates: any) => {
    setTwoFactorConfigs(twoFactorConfigs.map((config) =>
      config.id === configId
        ? { ...config, ...updates, updatedAt: new Date().toISOString() }
        : config
    ));
    toast.success('2FA method updated successfully!');
  };

  const handleDelete2FA = (configId: string | number) => {
    setTwoFactorConfigs(twoFactorConfigs.filter((config) => config.id !== configId));
    toast.success('2FA method deleted successfully!');
    setIsDelete2FAModalShowing(false);
    setConfigToDelete(null);
  };

  const handleConfirmDelete2FA = () => {
    if (configToDelete) {
      handleDelete2FA(configToDelete.id);
    }
  };

  const handleGenerateBackupCodes = (configId: string | number) => {
    const newCodes = Array.from({ length: 10 }, () =>
      Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
    );
    setTwoFactorConfigs(twoFactorConfigs.map((config) =>
      config.id === configId
        ? { ...config, backupCodes: newCodes, updatedAt: new Date().toISOString() }
        : config
    ));
    toast.success('New backup codes generated!');
  };

  const getMethodIcon = (method: TwoFactorMethod) => {
    switch (method) {
      case 'totp':
        return Smartphone;
      case 'sms':
        return Smartphone;
      case 'email':
        return Key;
      case 'backup-code':
        return Key;
      default:
        return Shield;
    }
  };

  const getMethodColor = (method: TwoFactorMethod) => {
    switch (method) {
      case 'totp':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'sms':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'email':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'backup-code':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: TwoFactorStatus) => {
    switch (status) {
      case 'enabled':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'disabled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Methods</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enabled</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.enabled}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Authenticator Apps</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totpMethods}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">SMS Methods</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.smsMethods}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
              placeholder="Search by method, label, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[14px] ::placeholder-[12px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={methodFilter}
                onChange={setMethodFilter}
                options={[
                  { value: 'all', label: 'All Methods' },
                  { value: 'totp', label: 'Authenticator App' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'email', label: 'Email' },
                  { value: 'backup-code', label: 'Backup Codes' },
                ]}
              />
            </div>
            <div className="min-w-[240px]">
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'enabled', label: 'Enabled' },
                  { value: 'disabled', label: 'Disabled' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowSetupModal(true)}
              className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Setup 2FA
            </button>
          </div>
        </div>
      </div>

      {/* 2FA Configs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Label
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No 2FA methods found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Setup your first 2FA method to get started
                      </p>
          </div>
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((config) => {
                  const MethodIcon = getMethodIcon(config.method);
                  return (
                    <tr
                      key={config.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedConfig(config)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MethodIcon className="w-4 h-4 text-gray-400" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMethodColor(config.method)}`}>
                            {config.method === 'totp' ? 'Authenticator' : config.method === 'sms' ? 'SMS' : config.method === 'email' ? 'Email' : 'Backup Code'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {config.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {config.phoneNumber || config.email || config.method === 'totp' ? 'Configured' : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(config.status)}`}>
                          {config.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {config.lastUsed
                            ? new Date(config.lastUsed).toLocaleString()
                            : 'Never'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {config.status === 'enabled' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDisable2FA(config.id);
                              }}
                              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                              title="Disable"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnable2FA(config.id);
                              }}
                              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                              title="Enable"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                          {config.method === 'totp' && config.qrCode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConfig(config);
                                setShowQRModal(true);
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              title="View QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}
                          {config.backupCodes && config.backupCodes.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConfig(config);
                                setShowBackupCodesModal(true);
                              }}
                              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                              title="View Backup Codes"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConfig(config);
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfigToDelete(config);
                              setIsDelete2FAModalShowing(true);
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

      {/* Setup 2FA Modal */}
      {showSetupModal && (
        <Setup2FAModal
          onClose={() => setShowSetupModal(false)}
          onSetup={handleSetup2FA}
        />
      )}

      {/* 2FA View Modal */}
      {configToView && (
        <TwoFactorViewModal
          config={configToView}
          onClose={() => setConfigToView(null)}
        />
      )}

      {/* 2FA Edit Modal */}
      {configToEdit && (
        <TwoFactorEditModal
          config={configToEdit}
          onClose={() => setConfigToEdit(null)}
          onUpdate={(id, updates) => {
            handleUpdate2FA(id, updates);
            setConfigToEdit(null);
          }}
          onGenerateBackupCodes={handleGenerateBackupCodes}
        />
      )}

      {/* Delete 2FA Modal */}
      {configToDelete && (
        <Delete2FAModal
          config={configToDelete}
          onClose={() => {
            setIsDelete2FAModalShowing(false);
            setConfigToDelete(null);
          }}
          onConfirm={handleConfirmDelete2FA}
          isShowing={isDelete2FAModalShowing}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedConfig && (
        <QRCodeModal
          config={selectedConfig}
          onClose={() => {
            setShowQRModal(false);
            setSelectedConfig(null);
          }}
        />
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && selectedConfig && (
        <BackupCodesModal
          config={selectedConfig}
          onClose={() => {
            setShowBackupCodesModal(false);
            setSelectedConfig(null);
          }}
          onGenerateNew={() => handleGenerateBackupCodes(selectedConfig.id)}
        />
      )}
    </div>
  );
}

// Setup 2FA Modal
interface Setup2FAModalProps {
  onClose: () => void;
  onSetup: (configData: any) => void;
}

function Setup2FAModal({ onClose, onSetup }: Setup2FAModalProps) {
  const [method, setMethod] = useState<TwoFactorMethod>('totp');
  const [label, setLabel] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error('Please enter a label');
      return;
    }
    if (method === 'sms' && !phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
    if (method === 'email' && !email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    onSetup({
      method,
      label: label.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
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
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b z-50 border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Setup Two-Factor Authentication</h2>
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
              Method <span className="text-red-500">*</span>
            </label>
            <CustomDropdown
              value={method}
              onChange={(value) => {
                setMethod(value as TwoFactorMethod);
                setPhoneNumber('');
                setEmail('');
              }}
              options={[
                { value: 'totp', label: 'Authenticator App (TOTP)' },
                { value: 'sms', label: 'SMS Verification' },
                { value: 'email', label: 'Email Verification' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., My Phone, Work Email"
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {method === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., +1 (555) 123-4567"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          )}

          {method === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., user@example.com"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Setup Instructions:</p>
                {method === 'totp' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Scan the QR code with your authenticator app</li>
                    <li>Enter the verification code to complete setup</li>
                    <li>Save your backup codes in a secure location</li>
                  </ul>
                )}
                {method === 'sms' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>You will receive a verification code via SMS</li>
                    <li>Enter the code to complete setup</li>
                  </ul>
                )}
                {method === 'email' && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>You will receive a verification code via email</li>
                    <li>Enter the code to complete setup</li>
                  </ul>
                )}
              </div>
            </div>
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
              Continue Setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Two Factor Edit Modal
interface TwoFactorEditModalProps {
  config: TwoFactorConfig;
  onClose: () => void;
  onUpdate: (id: string | number, updates: any) => void;
  onGenerateBackupCodes: (id: string | number) => void;
}

function TwoFactorEditModal({ config, onClose, onUpdate, onGenerateBackupCodes }: TwoFactorEditModalProps) {
  const [label, setLabel] = useState(config.label);
  const [phoneNumber, setPhoneNumber] = useState(config.phoneNumber || '');
  const [email, setEmail] = useState(config.email || '');

  const handleSave = () => {
    onUpdate(config.id, {
      label: label.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim(),
    });
    onClose();
  };


  const MethodIcon = getMethodIcon(config.method);

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">2FA Method Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{config.label}</p>
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
            <MethodIcon className="w-8 h-8 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {config.method === 'totp' ? 'Authenticator App' : config.method === 'sms' ? 'SMS Verification' : config.method === 'email' ? 'Email Verification' : 'Backup Codes'}
              </div>
              <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(config.status)}`}>
                {config.status}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {config.method === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {config.method === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {config.method === 'totp' && config.secret && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secret Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                  {config.secret}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(config.secret || '');
                    toast.success('Secret key copied to clipboard!');
                  }}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {config.backupCodes && config.backupCodes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Backup Codes ({config.backupCodes.length} remaining)
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Save these codes in a secure location. Each code can only be used once.
                </p>
                <button
                  type="button"
                  onClick={() => onGenerateBackupCodes(config.id)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  Generate New Codes
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {config.lastUsed && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Last Used</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(config.lastUsed).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(config.createdAt).toLocaleString()}
              </span>
            </div>
            {config.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(config.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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

// QR Code Modal
interface QRCodeModalProps {
  config: TwoFactorConfig;
  onClose: () => void;
}

function QRCodeModal({ config, onClose }: QRCodeModalProps) {
  const handleDownload = () => {
    if (config.qrCode) {
      const link = document.createElement('a');
      link.href = config.qrCode;
      link.download = `2fa-qr-${config.label.replace(/\s+/g, '-')}.png`;
      link.click();
      toast.success('QR code downloaded!');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Scan this QR code with your authenticator app
            </p>
            {config.qrCode ? (
              <div className="flex justify-center mb-4">
                <img
                  src={config.qrCode}
                  alt="QR Code"
                  className="w-64 h-64 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
                />
              </div>
            ) : (
              <div className="flex justify-center items-center w-64 h-64 border-2 border-gray-200 dark:border-gray-700 rounded-lg mx-auto bg-gray-50 dark:bg-gray-700">
                <QrCode className="w-32 h-32 text-gray-400" />
              </div>
            )}
            {config.secret && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or enter this code manually:</p>
                <code className="block px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                  {config.secret}
                </code>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {config.qrCode && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
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

// Two Factor View Modal (Read-only)
interface TwoFactorViewModalProps {
  config: TwoFactorConfig;
  onClose: () => void;
}

function TwoFactorViewModal({ config, onClose }: TwoFactorViewModalProps) {
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">2FA Method Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{config.label}</p>
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
                Method
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {config.method === 'totp' ? 'Authenticator App' : config.method === 'sms' ? 'SMS' : config.method === 'email' ? 'Email' : 'Backup Code'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  config.status === 'enabled'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : config.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {config.status.charAt(0).toUpperCase() + config.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Label
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
              {config.label}
            </div>
          </div>

          {config.phoneNumber && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {config.phoneNumber}
              </div>
            </div>
          )}

          {config.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {config.email}
              </div>
            </div>
          )}

          {config.lastUsed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Used
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {new Date(config.lastUsed).toLocaleString()}
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

// SSO View Modal (Read-only)
interface SSOViewModalProps {
  sso: SSOConfig;
  onClose: () => void;
}

function SSOViewModal({ sso, onClose }: SSOViewModalProps) {
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">SSO Configuration Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sso.name}</p>
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
                Provider
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {sso.provider}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  sso.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : sso.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {sso.status.charAt(0).toUpperCase() + sso.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
              {sso.name}
            </div>
          </div>

          {sso.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client ID
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {sso.clientId}
              </div>
            </div>
          )}

          {sso.domain && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Domain
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {sso.domain}
              </div>
            </div>
          )}

          {sso.redirectUri && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Redirect URI
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {sso.redirectUri}
              </div>
            </div>
          )}

          {sso.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {sso.description}
              </div>
            </div>
          )}

          {sso.enabledForUsers && sso.enabledForUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enabled For Users
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {sso.enabledForUsers.join(', ')}
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

// Backup Codes Modal
interface BackupCodesModalProps {
  config: TwoFactorConfig;
  onClose: () => void;
  onGenerateNew: () => void;
}

function BackupCodesModal({ config, onClose, onGenerateNew }: BackupCodesModalProps) {
  const handleCopyAll = () => {
    if (config.backupCodes) {
      navigator.clipboard.writeText(config.backupCodes.join('\n'));
      toast.success('All backup codes copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (config.backupCodes) {
      const content = `Backup Codes for ${config.label}\n\n${config.backupCodes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}\n\nImportant: Save these codes in a secure location. Each code can only be used once.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `backup-codes-${config.label.replace(/\s+/g, '-')}.txt`;
      link.click();
      toast.success('Backup codes downloaded!');
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Backup Codes</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-300">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Save these codes in a secure location</li>
                  <li>Each code can only be used once</li>
                  <li>Generate new codes if you run out</li>
                </ul>
              </div>
            </div>
          </div>

          {config.backupCodes && config.backupCodes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {config.backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <code className="text-sm font-mono text-gray-900 dark:text-white">{code}</code>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No backup codes available</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 text-[14px] pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onGenerateNew}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Generate New Codes
            </button>
            {config.backupCodes && config.backupCodes.length > 0 && (
              <>
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy All
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </>
            )}
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

// Helper functions for 2FA section
function getMethodIcon(method: TwoFactorMethod) {
  switch (method) {
    case 'totp':
      return Smartphone;
    case 'sms':
      return Smartphone;
    case 'email':
      return Key;
    case 'backup-code':
      return Key;
    default:
      return Shield;
  }
}


function getStatusColor(status: TwoFactorStatus) {
  switch (status) {
    case 'enabled':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'disabled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
  }
}

// SSO Section
function SSOSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ssoToView, setSsoToView] = useState<SSOConfig | null>(null);
  const [ssoToEdit, setSsoToEdit] = useState<SSOConfig | null>(null);
  const [ssoToDelete, setSsoToDelete] = useState<SSOConfig | null>(null);
  const [isDeleteSSOModalShowing, setIsDeleteSSOModalShowing] = useState(false);

  // Load SSO configs from localStorage
  const [ssoConfigs, setSsoConfigs] = useState<SSOConfig[]>(() => {
    const saved = localStorage.getItem('security-sso-configs');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default SSO configs
    return [
      {
        id: 1,
        provider: 'google' as SSOProvider,
        name: 'Google Workspace',
        status: 'active' as SSOStatus,
        clientId: '1234567890-abcdefghijklmnop.apps.googleusercontent.com',
        redirectUri: 'https://app.example.com/auth/google/callback',
        enabledForUsers: ['all'],
        description: 'Google Workspace SSO integration',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        provider: 'microsoft' as SSOProvider,
        name: 'Microsoft Azure AD',
        status: 'inactive' as SSOStatus,
        clientId: 'abcdef12-3456-7890-abcd-ef1234567890',
        redirectUri: 'https://app.example.com/auth/microsoft/callback',
        enabledForUsers: ['admin', 'manager'],
        description: 'Microsoft Azure AD SSO integration',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        provider: 'okta' as SSOProvider,
        name: 'Okta SSO',
        status: 'pending' as SSOStatus,
        metadataUrl: 'https://dev-123456.okta.com/app/abc123/sso/saml/metadata',
        enabledForUsers: ['all'],
        description: 'Okta SAML SSO integration',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('security-sso-configs', JSON.stringify(ssoConfigs));
  }, [ssoConfigs]);

  // Filter SSO configs
  const filteredSSOs = useMemo(() => {
    let filtered = ssoConfigs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((sso) =>
        sso.name.toLowerCase().includes(query) ||
        sso.provider.toLowerCase().includes(query) ||
        (sso.domain && sso.domain.toLowerCase().includes(query))
      );
    }

    // Filter by provider
    if (providerFilter !== 'all') {
      filtered = filtered.filter((sso) => sso.provider === providerFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((sso) => sso.status === statusFilter);
    }

    // Sort by status (active first) then by name
    return filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [ssoConfigs, searchQuery, providerFilter, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = ssoConfigs.length;
    const active = ssoConfigs.filter((sso) => sso.status === 'active');
    const googleSSO = ssoConfigs.filter((sso) => sso.provider === 'google');
    const microsoftSSO = ssoConfigs.filter((sso) => sso.provider === 'microsoft');

    return {
      total,
      active: active.length,
      googleSSO: googleSSO.length,
      microsoftSSO: microsoftSSO.length,
    };
  }, [ssoConfigs]);

  const handleCreateSSO = (ssoData: any) => {
    const newSSO: SSOConfig = {
      id: Date.now(),
      ...ssoData,
      status: 'pending' as SSOStatus,
      enabledForUsers: ssoData.enabledForUsers || [],
      createdAt: new Date().toISOString(),
    };
    setSsoConfigs([...ssoConfigs, newSSO]);
    setShowCreateModal(false);
    toast.success('SSO configuration created successfully!');
  };

  const handleUpdateSSO = (ssoId: string | number, updates: any) => {
    setSsoConfigs(ssoConfigs.map((sso) =>
      sso.id === ssoId
        ? { ...sso, ...updates, updatedAt: new Date().toISOString() }
        : sso
    ));
    toast.success('SSO configuration updated successfully!');
  };

  const handleDeleteSSO = (ssoId: string | number) => {
    setSsoConfigs(ssoConfigs.filter((sso) => sso.id !== ssoId));
    toast.success('SSO configuration deleted successfully!');
    setIsDeleteSSOModalShowing(false);
    setSsoToDelete(null);
  };

  const handleConfirmDeleteSSO = () => {
    if (ssoToDelete) {
      handleDeleteSSO(ssoToDelete.id);
    }
  };

  const getProviderIcon = (provider: SSOProvider) => {
    switch (provider) {
      case 'google':
        return Globe;
      case 'microsoft':
        return Globe;
      case 'okta':
        return Shield;
      case 'auth0':
        return Shield;
      case 'saml':
        return Lock;
      case 'oauth2':
        return Key;
      default:
        return Globe;
    }
  };

  const getProviderColor = (provider: SSOProvider) => {
    switch (provider) {
      case 'google':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'microsoft':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'okta':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'auth0':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'saml':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'oauth2':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getSSOStatusColor = (status: SSOStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total SSO Providers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Google SSO</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.googleSSO}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Microsoft SSO</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.microsoftSSO}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              placeholder="Search by name, provider, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border text-[14px] text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="min-w-[240px]">
              <CustomDropdown
                value={providerFilter}
                onChange={setProviderFilter}
                options={[
                  { value: 'all', label: 'All Providers' },
                  { value: 'google', label: 'Google' },
                  { value: 'microsoft', label: 'Microsoft' },
                  { value: 'okta', label: 'Okta' },
                  { value: 'auth0', label: 'Auth0' },
                  { value: 'saml', label: 'SAML' },
                  { value: 'oauth2', label: 'OAuth2' },
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
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center text-[14px] gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New SSO
            </button>
          </div>
        </div>
      </div>

      {/* SSO Configs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Enabled For
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
              {filteredSSOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Globe className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No SSO configurations found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first SSO configuration to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSSOs.map((sso) => {
                  const ProviderIcon = getProviderIcon(sso.provider);
                  return (
                    <tr
                      key={sso.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSsoToView(sso)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ProviderIcon className="w-4 h-4 text-gray-400" />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProviderColor(sso.provider)}`}>
                            {sso.provider === 'google' ? 'Google' : sso.provider === 'microsoft' ? 'Microsoft' : sso.provider === 'okta' ? 'Okta' : sso.provider === 'auth0' ? 'Auth0' : sso.provider === 'saml' ? 'SAML' : 'OAuth2'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {sso.name}
                        </div>
                        {sso.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {sso.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {sso.domain || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {sso.enabledForUsers.includes('all') ? 'All Users' : sso.enabledForUsers.join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSSOStatusColor(sso.status)}`}>
                          {sso.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSsoToView(sso);
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSsoToEdit(sso);
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSsoToDelete(sso);
                              setIsDeleteSSOModalShowing(true);
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

      {/* Create SSO Modal */}
      {showCreateModal && (
        <CreateSSOModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateSSO}
        />
      )}

      {/* SSO View Modal */}
      {ssoToView && (
        <SSOViewModal
          sso={ssoToView}
          onClose={() => setSsoToView(null)}
        />
      )}

      {/* SSO Edit Modal */}
      {ssoToEdit && (
        <SSOEditModal
          sso={ssoToEdit}
          onClose={() => setSsoToEdit(null)}
          onUpdate={handleUpdateSSO}
        />
      )}

      {/* Delete SSO Modal */}
      {ssoToDelete && (
        <DeleteSSOModal
          sso={ssoToDelete}
          onClose={() => {
            setIsDeleteSSOModalShowing(false);
            setSsoToDelete(null);
          }}
          onConfirm={handleConfirmDeleteSSO}
          isShowing={isDeleteSSOModalShowing}
        />
      )}
    </div>
  );
}

// Create SSO Modal
interface CreateSSOModalProps {
  onClose: () => void;
  onCreate: (ssoData: any) => void;
}

function CreateSSOModal({ onClose, onCreate }: CreateSSOModalProps) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<SSOProvider>('google');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [domain, setDomain] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [enabledForUsers, setEnabledForUsers] = useState<string[]>(['all']);
  const [description, setDescription] = useState('');

  const userGroups = ['all', 'admin', 'manager', 'user', 'guest'];

  const toggleUserGroup = (group: string) => {
    if (group === 'all') {
      setEnabledForUsers(['all']);
    } else {
      setEnabledForUsers((prev) => {
        const filtered = prev.filter((g) => g !== 'all');
        if (filtered.includes(group)) {
          return filtered.filter((g) => g !== group);
        } else {
          return [...filtered, group];
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if ((provider === 'google' || provider === 'microsoft' || provider === 'oauth2') && !clientId.trim()) {
      toast.error('Please enter a client ID');
      return;
    }
    if ((provider === 'saml' || provider === 'okta') && !metadataUrl.trim()) {
      toast.error('Please enter a metadata URL');
      return;
    }
    onCreate({
      name: name.trim(),
      provider,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      domain: domain.trim(),
      redirectUri: redirectUri.trim(),
      metadataUrl: metadataUrl.trim(),
      enabledForUsers,
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
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b z-50 border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New SSO Configuration</h2>
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
              Configuration Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Google Workspace"
              className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={provider}
                onChange={(value) => {
                  setProvider(value as SSOProvider);
                  setClientId('');
                  setClientSecret('');
                  setMetadataUrl('');
                }}
                options={[
                  { value: 'google', label: 'Google' },
                  { value: 'microsoft', label: 'Microsoft' },
                  { value: 'okta', label: 'Okta' },
                  { value: 'auth0', label: 'Auth0' },
                  { value: 'saml', label: 'SAML' },
                  { value: 'oauth2', label: 'OAuth2' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g., example.com"
                className="w-full px-3 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {(provider === 'google' || provider === 'microsoft' || provider === 'oauth2' || provider === 'auth0') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter client ID"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  required={provider === 'google' || provider === 'microsoft' || provider === 'oauth2'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter client secret"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(clientSecret);
                      toast.success('Client secret copied!');
                    }}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Redirect URI
                </label>
                <input
                  type="url"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  placeholder="e.g., https://app.example.com/auth/callback"
                  className="w-full text-[14px] ::placeholder-[12px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </>
          )}

          {(provider === 'saml' || provider === 'okta') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metadata URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={metadataUrl}
                onChange={(e) => setMetadataUrl(e.target.value)}
                placeholder="e.g., https://idp.example.com/metadata"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enabled For Users
            </label>
            <div className="max-h-48 grid grid-cols-5 gap-2 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {userGroups.map((group) => (
                <label
                  key={group}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={enabledForUsers.includes(group)}
                    onChange={() => toggleUserGroup(group)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {group === 'all' ? 'All Users' : group}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the SSO configuration..."
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
              Create SSO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// SSO Edit Modal
interface SSOEditModalProps {
  sso: SSOConfig;
  onClose: () => void;
  onUpdate: (ssoId: string | number, updates: any) => void;
}

function SSOEditModal({ sso, onClose, onUpdate }: SSOEditModalProps) {
  const [name, setName] = useState(sso.name);
  const [provider, setProvider] = useState<SSOProvider>(sso.provider);
  const [clientId, setClientId] = useState(sso.clientId || '');
  const [clientSecret, setClientSecret] = useState(sso.clientSecret || '');
  const [domain, setDomain] = useState(sso.domain || '');
  const [redirectUri, setRedirectUri] = useState(sso.redirectUri || '');
  const [metadataUrl, setMetadataUrl] = useState(sso.metadataUrl || '');
  const [status, setStatus] = useState<SSOStatus>(sso.status);
  const [enabledForUsers, setEnabledForUsers] = useState<string[]>(sso.enabledForUsers);
  const [description, setDescription] = useState(sso.description || '');
  const [showSecret, setShowSecret] = useState(false);

  const userGroups = ['all', 'admin', 'manager', 'user', 'guest'];

  const toggleUserGroup = (group: string) => {
    if (group === 'all') {
      setEnabledForUsers(['all']);
    } else {
      setEnabledForUsers((prev) => {
        const filtered = prev.filter((g) => g !== 'all');
        if (filtered.includes(group)) {
          return filtered.filter((g) => g !== group);
        } else {
          return [...filtered, group];
        }
      });
    }
  };

  const handleSave = () => {
    onUpdate(sso.id, {
      name: name.trim(),
      provider,
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      domain: domain.trim(),
      redirectUri: redirectUri.trim(),
      metadataUrl: metadataUrl.trim(),
      status,
      enabledForUsers,
      description: description.trim(),
    });
    onClose();
  };


  const getProviderIcon = (provider: SSOProvider) => {
    switch (provider) {
      case 'google':
        return Globe;
      case 'microsoft':
        return Globe;
      case 'okta':
        return Shield;
      case 'auth0':
        return Shield;
      case 'saml':
        return Lock;
      case 'oauth2':
        return Key;
      default:
        return Globe;
    }
  };

  const getSSOStatusColor = (status: SSOStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const ProviderIcon = getProviderIcon(sso.provider);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b z-50 border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">SSO Configuration Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sso.name}</p>
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
            <ProviderIcon className="w-8 h-8 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {sso.provider === 'google' ? 'Google' : sso.provider === 'microsoft' ? 'Microsoft' : sso.provider === 'okta' ? 'Okta' : sso.provider === 'auth0' ? 'Auth0' : sso.provider === 'saml' ? 'SAML' : 'OAuth2'}
              </div>
              <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getSSOStatusColor(status)}`}>
                {status}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Configuration Name
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
                Provider
              </label>
              <CustomDropdown
                value={provider}
                onChange={(value) => {
                  setProvider(value as SSOProvider);
                  setClientId('');
                  setClientSecret('');
                  setMetadataUrl('');
                }}
                options={[
                  { value: 'google', label: 'Google' },
                  { value: 'microsoft', label: 'Microsoft' },
                  { value: 'okta', label: 'Okta' },
                  { value: 'auth0', label: 'Auth0' },
                  { value: 'saml', label: 'SAML' },
                  { value: 'oauth2', label: 'OAuth2' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as SSOStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
          </div>

          {(provider === 'google' || provider === 'microsoft' || provider === 'oauth2' || provider === 'auth0') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="••••••••••••••••••••"
                    className="flex-1 px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(clientSecret);
                      toast.success('Client secret copied!');
                    }}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Redirect URI
                </label>
                <input
                  type="url"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  placeholder="e.g., https://example.com/auth/callback"
                  className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </>
          )}

          {(provider === 'saml' || provider === 'okta') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metadata URL
              </label>
              <input
                type="url"
                value={metadataUrl}
                onChange={(e) => setMetadataUrl(e.target.value)}
                placeholder="e.g., https://example.com/metadata.xml"
                className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enabled For Users
            </label>
            <div className="max-h-48 grid grid-cols-5 gap-2 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              {userGroups.map((group) => (
                <label
                  key={group}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={enabledForUsers.includes(group)}
                    onChange={() => toggleUserGroup(group)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {group === 'all' ? 'All Users' : group}
                  </span>
                </label>
              ))}
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
              placeholder="Describe the SSO configuration..."
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(sso.createdAt).toLocaleString()}
              </span>
            </div>
            {sso.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(sso.updatedAt).toLocaleString()}
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
