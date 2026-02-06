import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import {
  Link2,
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
  Clock,
  Key,
  Webhook,
  Activity,
  ShoppingCart,
  Store,
  Globe,
  Truck,
  Package,
  RefreshCw,
  Trash2,
  Copy,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'connected-channels' | 'api-keys-webhooks' | 'sync-health';
type ChannelType = 'ecommerce' | 'pos' | 'marketplace' | '3pl' | 'shipping';
type ConnectionStatus = 'connected' | 'disconnected' | 'pending' | 'error';
type SyncStatus = 'healthy' | 'warning' | 'error' | 'syncing';

interface Channel {
  id: string | number;
  name: string;
  type: ChannelType;
  provider: string;
  status: ConnectionStatus;
  lastSync?: string;
  syncFrequency?: string;
  credentials?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

interface ApiKey {
  id: string | number;
  name: string;
  key: string;
  type: 'api-key' | 'webhook' | 'API_KEY' | 'WEBHOOK';
  description: string;
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface SyncHealth {
  id: string | number;
  channelId: string | number;
  channelName: string;
  status: SyncStatus;
  lastSync: string;
  nextSync?: string;
  recordsSynced: number;
  recordsFailed: number;
  syncDuration?: number;
  errorMessage?: string;
  createdAt: string;
}

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

function CustomDropdown({ value, onChange, options, placeholder, className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    // Calculate position based on available space and button position
    const calculatePosition = () => {
      if (!buttonRef.current || !menuRef.current) return;
      
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const menuHeight = Math.min(options.length * 40, 200); // Max 5 options visible
      const menuWidth = buttonRect.width;
      
      // Use fixed positioning to escape modal overflow
      const style: React.CSSProperties = {
        position: 'fixed',
        width: `${menuWidth}px`,
        left: `${buttonRect.left}px`,
        zIndex: 9999,
      };
      
      // Position downward by default, upward if not enough space
      if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
        style.top = `${buttonRect.bottom + 4}px`;
      } else {
        style.bottom = `${window.innerHeight - buttonRect.top + 4}px`;
      }
      
      setMenuStyle(style);
    };

    // Add event listener with a slight delay to avoid immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      calculatePosition();
    }, 10);

    // Recalculate on scroll or resize
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, options.length]);

  const selectedOption = options.find(opt => opt.value === value);

  // Calculate max height to show only 5 options at a time
  // Each option is approximately 40px (py-2.5 = 10px top + 10px bottom + ~20px text)
  const optionHeight = 40;
  const visibleOptions = 5;
  const maxHeight = `${visibleOptions * optionHeight}px`;

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`}>
      <button
        ref={buttonRef}
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

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden overflow-y-auto"
          style={{ ...menuStyle, maxHeight }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Integrations() {
  const [activeTab, setActiveTab] = useState<TabType>('connected-channels');

  const tabs = [
    { id: 'connected-channels' as TabType, label: 'Connected Channels', icon: Link2 },
    { id: 'api-keys-webhooks' as TabType, label: 'API Keys / Webhooks', icon: Key },
    { id: 'sync-health' as TabType, label: 'Sync Health', icon: Activity },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Integrations" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Integrations</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">
              Manage connected channels, API keys, webhooks, and sync health
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
        {activeTab === 'connected-channels' && <ConnectedChannelsSection />}
        {activeTab === 'api-keys-webhooks' && <ApiKeysWebhooksSection />}
        {activeTab === 'sync-health' && <SyncHealthSection />}
      </div>
    </div>
  );
}

// Connected Channels Section
function ConnectedChannelsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter] = useState<string>('all');
  const [statusFilter] = useState<string>('all');
  const [channelToView, setChannelToView] = useState<Channel | null>(null);
  const [channelToEdit, setChannelToEdit] = useState<Channel | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load channels from localStorage
  const [channels, setChannels] = useState<Channel[]>(() => {
    const saved = localStorage.getItem('integration-channels');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default channels
    return [
      {
        id: 1,
        name: 'Shopify Store',
        type: 'ecommerce',
        provider: 'Shopify',
        status: 'connected' as ConnectionStatus,
        lastSync: new Date(Date.now() - 3600000).toISOString(),
        syncFrequency: '1 hour',
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Amazon Marketplace',
        type: 'marketplace',
        provider: 'Amazon',
        status: 'connected' as ConnectionStatus,
        lastSync: new Date(Date.now() - 7200000).toISOString(),
        syncFrequency: '2 hours',
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Square POS',
        type: 'pos',
        provider: 'Square',
        status: 'pending' as ConnectionStatus,
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        name: 'FedEx Shipping',
        type: 'shipping',
        provider: 'FedEx',
        status: 'connected' as ConnectionStatus,
        lastSync: new Date(Date.now() - 1800000).toISOString(),
        syncFrequency: '30 minutes',
        createdAt: new Date().toISOString(),
      },
      {
        id: 5,
        name: '3PL Warehouse',
        type: '3pl',
        provider: 'Custom',
        status: 'error' as ConnectionStatus,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('integration-channels', JSON.stringify(channels));
  }, [channels]);

  // Filter channels
  const filteredChannels = useMemo(() => {
    let filtered = channels;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((channel) =>
        channel.name.toLowerCase().includes(query) ||
        channel.provider.toLowerCase().includes(query) ||
        channel.type.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((channel) => channel.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((channel) => channel.status === statusFilter);
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [channels, searchQuery, typeFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredChannels.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChannels = filteredChannels.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = channels.length;
    const connected = channels.filter((channel) => channel.status === 'connected');
    const pending = channels.filter((channel) => channel.status === 'pending');
    const error = channels.filter((channel) => channel.status === 'error');

    return {
      total,
      connected: connected.length,
      pending: pending.length,
      error: error.length,
    };
  }, [channels]);

  const handleCreateChannel = (channelData: any) => {
    const newChannel: Channel = {
      id: Date.now(),
      ...channelData,
      createdAt: new Date().toISOString(),
    };
    setChannels([...channels, newChannel]);
    setShowCreateModal(false);
    toast.success('Channel created successfully!');
  };

  const handleUpdateChannel = (channelId: string | number, updates: any) => {
    setChannels(channels.map((channel) =>
      channel.id === channelId
        ? { ...channel, ...updates, updatedAt: new Date().toISOString() }
        : channel
    ));
    toast.success('Channel updated successfully!');
  };

  const handleDeleteChannel = (channelId: string | number) => {
    setChannels(channels.filter((channel) => channel.id !== channelId));
    toast.success('Channel deleted successfully!');
  };

  const getTypeIcon = (type: ChannelType) => {
    switch (type) {
      case 'ecommerce':
        return ShoppingCart;
      case 'pos':
        return Store;
      case 'marketplace':
        return Globe;
      case '3pl':
        return Package;
      case 'shipping':
        return Truck;
      default:
        return Link2;
    }
  };

  const getTypeColor = (type: ChannelType) => {
    switch (type) {
      case 'ecommerce':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pos':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'marketplace':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case '3pl':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'shipping':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Channels</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Link2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connected</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.connected}
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.error}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by channel name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Channel
          </button>
        </div>
      </div>

      {/* Channels Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredChannels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Link2 className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No channels found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first channel to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedChannels.map((channel) => {
                  const TypeIcon = getTypeIcon(channel.type);
                  return (
                    <tr
                      key={channel.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {channel.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(channel.type)}`}>
                          {channel.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {channel.provider}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(channel.status)}`}>
                          {channel.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {channel.lastSync
                            ? new Date(channel.lastSync).toLocaleString()
                            : 'Never'}
                        </div>
                        {channel.syncFrequency && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Every {channel.syncFrequency}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setChannelToView(channel);
                            }}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View Channel"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setChannelToEdit(channel);
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            title="Edit Channel"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setChannelToDelete(channel);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            title="Delete Channel"
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
      {filteredChannels.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredChannels.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredChannels.length}</span> results
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
                  className="min-w-[80px]"
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

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateChannel}
        />
      )}

      {/* Channel View Modal */}
      {channelToView && (
        <ChannelViewModal
          channel={channelToView}
          onClose={() => setChannelToView(null)}
        />
      )}

      {/* Channel Edit Modal */}
      {channelToEdit && (
        <ChannelDetailsModal
          channel={channelToEdit}
          onClose={() => setChannelToEdit(null)}
          onUpdate={(id, updates) => {
            handleUpdateChannel(id, updates);
            setChannelToEdit(null);
          }}
          onDelete={(id: string | number) => {
            handleDeleteChannel(id);
            setChannelToEdit(null);
          }}
        />
      )}

      {/* Delete Channel Modal */}
      {showDeleteModal && channelToDelete && (
        <DeleteChannelModal
          channel={channelToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setChannelToDelete(null);
          }}
          onDelete={(id: string | number) => {
            handleDeleteChannel(id);
            setShowDeleteModal(false);
            setChannelToDelete(null);
          }}
        />
      )}
    </div>
  );
}

// Create Channel Modal
interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (channelData: any) => void;
}

function CreateChannelModal({ onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('ecommerce');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('pending');
  const [syncFrequency, setSyncFrequency] = useState('1 hour');

  const providers = {
    ecommerce: ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Custom'],
    pos: ['Square', 'Clover', 'Toast', 'Lightspeed', 'Custom'],
    marketplace: ['Amazon', 'eBay', 'Etsy', 'Walmart', 'Custom'],
    '3pl': ['ShipBob', 'Fulfillment by Amazon', 'Ware2Go', 'Custom'],
    shipping: ['FedEx', 'UPS', 'USPS', 'DHL', 'Custom'],
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !provider.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    onCreate({
      name: name.trim(),
      type,
      provider: provider.trim(),
      status,
      syncFrequency,
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Channel</h2>
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
              Channel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Shopify Store"
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel Type <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={type}
                onChange={(value) => {
                  setType(value as ChannelType);
                  setProvider('');
                }}
                options={[
                  { value: 'ecommerce', label: 'E-commerce' },
                  { value: 'pos', label: 'POS' },
                  { value: 'marketplace', label: 'Marketplace' },
                  { value: '3pl', label: '3PL' },
                  { value: 'shipping', label: 'Shipping' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider <span className="text-red-500">*</span>
              </label>
              <CustomDropdown
                value={provider}
                onChange={setProvider}
                options={[
                  ...(providers[type] || []).map((p) => ({ value: p, label: p })),
                ]}
                placeholder="Select provider"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as ConnectionStatus)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'connected', label: 'Connected' },
                  { value: 'disconnected', label: 'Disconnected' },
                  { value: 'error', label: 'Error' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync Frequency
              </label>
              <CustomDropdown
                value={syncFrequency}
                onChange={setSyncFrequency}
                options={[
                  { value: '15 minutes', label: 'Every 15 minutes' },
                  { value: '30 minutes', label: 'Every 30 minutes' },
                  { value: '1 hour', label: 'Every 1 hour' },
                  { value: '2 hours', label: 'Every 2 hours' },
                  { value: '6 hours', label: 'Every 6 hours' },
                  { value: '12 hours', label: 'Every 12 hours' },
                  { value: '24 hours', label: 'Every 24 hours' },
                ]}
              />
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
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Channel Details Modal
interface ChannelViewModalProps {
  channel: Channel;
  onClose: () => void;
}

function ChannelViewModal({ channel, onClose }: ChannelViewModalProps) {
  const getTypeColor = (type: ChannelType) => {
    switch (type) {
      case 'ecommerce':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pos':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'marketplace':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case '3pl':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'shipping':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">View Channel</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{channel.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel Name
            </label>
            <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
              {channel.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel Type
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(channel.type)}`}>
                  {channel.type}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {channel.provider}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(channel.status)}`}>
                  {channel.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync Frequency
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {channel.syncFrequency ? `Every ${channel.syncFrequency}` : 'Not set'}
              </div>
            </div>
          </div>

          {channel.lastSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Sync
              </label>
              <div className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                {new Date(channel.lastSync).toLocaleString()}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(channel.createdAt).toLocaleString()}
              </span>
            </div>
            {channel.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(channel.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 text-[14px]">
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

interface DeleteChannelModalProps {
  channel: Channel;
  onClose: () => void;
  onDelete: (channelId: string | number) => void;
}

function DeleteChannelModal({ channel, onClose, onDelete }: DeleteChannelModalProps) {
  const handleDelete = () => {
    onDelete(channel.id);
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
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Channel</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This action cannot be undone
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the channel <span className="font-semibold">{channel.name}</span>? This will permanently remove all associated data.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Channel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChannelDetailsModalProps {
  channel: Channel;
  onClose: () => void;
  onUpdate: (channelId: string | number, updates: any) => void;
  onDelete: (channelId: string | number) => void;
}

function ChannelDetailsModal({ channel, onClose, onUpdate }: ChannelDetailsModalProps) {
  const [name, setName] = useState(channel.name);
  const [type, setType] = useState<ChannelType>(channel.type);
  const [provider, setProvider] = useState(channel.provider);
  const [status, setStatus] = useState<ConnectionStatus>(channel.status);
  const [syncFrequency, setSyncFrequency] = useState(channel.syncFrequency || '1 hour');

  const providers = {
    ecommerce: ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Custom'],
    pos: ['Square', 'Clover', 'Toast', 'Lightspeed', 'Custom'],
    marketplace: ['Amazon', 'eBay', 'Etsy', 'Walmart', 'Custom'],
    '3pl': ['ShipBob', 'Fulfillment by Amazon', 'Ware2Go', 'Custom'],
    shipping: ['FedEx', 'UPS', 'USPS', 'DHL', 'Custom'],
  };

  const handleSave = () => {
    onUpdate(channel.id, {
      name: name.trim(),
      type,
      provider: provider.trim(),
      status,
      syncFrequency,
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Channel</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{channel.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Shopify Store"
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel Type
              </label>
              <CustomDropdown
                value={type}
                onChange={(value) => {
                  setType(value as ChannelType);
                  setProvider('');
                }}
                options={[
                  { value: 'ecommerce', label: 'E-commerce' },
                  { value: 'pos', label: 'POS' },
                  { value: 'marketplace', label: 'Marketplace' },
                  { value: '3pl', label: '3PL' },
                  { value: 'shipping', label: 'Shipping' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider
              </label>
              <CustomDropdown
                value={provider}
                onChange={setProvider}
                options={[
                  ...(providers[type] || []).map((p) => ({ value: p, label: p })),
                ]}
                placeholder="Select provider"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={status}
                onChange={(value) => setStatus(value as ConnectionStatus)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'connected', label: 'Connected' },
                  { value: 'disconnected', label: 'Disconnected' },
                  { value: 'error', label: 'Error' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync Frequency
              </label>
              <CustomDropdown
                value={syncFrequency}
                onChange={setSyncFrequency}
                options={[
                  { value: '15 minutes', label: 'Every 15 minutes' },
                  { value: '30 minutes', label: 'Every 30 minutes' },
                  { value: '1 hour', label: 'Every 1 hour' },
                  { value: '2 hours', label: 'Every 2 hours' },
                  { value: '6 hours', label: 'Every 6 hours' },
                  { value: '12 hours', label: 'Every 12 hours' },
                  { value: '24 hours', label: 'Every 24 hours' },
                ]}
              />
            </div>
          </div>

          {channel.lastSync && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Sync
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {new Date(channel.lastSync).toLocaleString()}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(channel.createdAt).toLocaleString()}
              </span>
            </div>
            {channel.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(channel.updatedAt).toLocaleString()}
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

// API Keys / Webhooks Section
function ApiKeysWebhooksSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyToEdit, setKeyToEdit] = useState<ApiKey | null>(null);
  const [keyToView, setKeyToView] = useState<ApiKey | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [isDeleteKeyModalShowing, setIsDeleteKeyModalShowing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const queryClient = useQueryClient();

  // Fetch API keys from API
  const { data: apiKeysData, isLoading: apiKeysLoading } = useQuery({
    queryKey: ['api-keys', typeFilter],
    queryFn: async () => {
      try {
        const typeParam = typeFilter !== 'all' ? `&type=${typeFilter}` : '';
        const response = await api.get(`/api-keys?skip=0&take=1000${typeParam}`);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching API keys:', error);
        return [];
      }
    },
  });

  const apiKeys: ApiKey[] = (apiKeysData || []).map((key: any) => ({
    ...key,
    type: key.type === 'API_KEY' ? 'api-key' : key.type === 'WEBHOOK' ? 'webhook' : key.type,
  }));

  // Filter API keys
  const filteredKeys = useMemo(() => {
    let filtered = apiKeys;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((key) =>
        key.name.toLowerCase().includes(query) ||
        key.description.toLowerCase().includes(query) ||
        key.key.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((key) => {
        const keyType = key.type?.toLowerCase();
        const filterType = typeFilter.toLowerCase();
        return keyType === filterType || 
               (keyType === 'api_key' && filterType === 'api-key') ||
               (keyType === 'webhook' && filterType === 'webhook');
      });
    }

    // Sort by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [apiKeys, searchQuery, typeFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredKeys.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedKeys = filteredKeys.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = apiKeys.length;
    const apiKeysCount = apiKeys.filter((key) => {
      const type = key.type?.toLowerCase();
      return type === 'api-key' || type === 'api_key';
    });
    const webhooksCount = apiKeys.filter((key) => {
      const type = key.type?.toLowerCase();
      return type === 'webhook';
    });
    const active = apiKeys.filter((key) => key.isActive);

    return {
      total,
      apiKeys: apiKeysCount.length,
      webhooks: webhooksCount.length,
      active: active.length,
    };
  }, [apiKeys]);

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (keyData: any) => {
      // Generate key if not provided
      const generatedKey = keyData.key || (keyData.type === 'api-key'
        ? `api_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
        : `wh_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`);

      const response = await api.post('/api-keys', {
        ...keyData,
        key: generatedKey,
        type: keyData.type === 'api-key' ? 'API_KEY' : 'WEBHOOK',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setShowCreateModal(false);
      toast.success('API key created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create API key');
    },
  });

  // Update API key mutation
  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string | number; updates: any }) => {
      const response = await api.patch(`/api-keys/${id}`, {
        ...updates,
        type: updates.type === 'api-key' ? 'API_KEY' : updates.type === 'webhook' ? 'WEBHOOK' : updates.type,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update API key');
    },
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.delete(`/api-keys/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete API key');
    },
  });

  const handleCreateKey = (keyData: any) => {
    createApiKeyMutation.mutate(keyData);
  };

  const handleUpdateKey = (keyId: string | number, updates: any) => {
    updateApiKeyMutation.mutate({ id: keyId, updates });
  };

  const handleDeleteKey = (keyId: string | number) => {
    deleteApiKeyMutation.mutate(keyId);
  };

  const handleConfirmDeleteKey = () => {
    if (keyToDelete) {
      handleDeleteKey(keyToDelete.id);
      setIsDeleteKeyModalShowing(false);
      setKeyToDelete(null);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Key copied to clipboard!');
  };

  // Show loading state (after all hooks)
  if (apiKeysLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Keys</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">API Keys</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.apiKeys}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Webhooks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.webhooks}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Webhook className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, description, or key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[14px] ::placeholder-[12px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                  { value: 'api-key', label: 'API Keys' },
                  { value: 'webhook', label: 'Webhooks' },
                ]}
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Key
            </button>
          </div>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Last Used
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
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Key className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No API keys or webhooks found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Create your first key or webhook to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedKeys.map((key) => (
                  <tr
                    key={key.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {key.type === 'api-key' ? (
                          <Key className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Webhook className="w-4 h-4 text-gray-400" />
                        )}
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {key.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${key.type === 'api-key'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                        {key.type === 'api-key' ? 'API Key' : 'Webhook'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          {key.key.substring(0, 20)}...
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyKey(key.key);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {key.permissions.length} permission{key.permissions.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {key.lastUsed
                          ? new Date(key.lastUsed).toLocaleString()
                          : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${key.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setKeyToView(key);
                          }}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setKeyToEdit(key);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setKeyToDelete(key);
                            setIsDeleteKeyModalShowing(true);
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
      {filteredKeys.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredKeys.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredKeys.length}</span> results
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
                  className="min-w-[80px]"
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

      {/* Create API Key Modal */}
      {showCreateModal && (
        <CreateApiKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
        />
      )}

      {/* API Key View Modal */}
      {keyToView && (
        <ApiKeyViewModal
          apiKey={keyToView}
          onClose={() => setKeyToView(null)}
          onCopy={handleCopyKey}
        />
      )}

      {/* API Key Edit Modal */}
      {keyToEdit && (
        <ApiKeyEditModal
          key={keyToEdit.id}
          apiKey={keyToEdit}
          onClose={() => setKeyToEdit(null)}
          onUpdate={handleUpdateKey}
          onCopy={handleCopyKey}
        />
      )}

      {/* Delete API Key Modal */}
      {keyToDelete && (
        <DeleteApiKeyModal
          apiKey={keyToDelete}
          onClose={() => {
            setIsDeleteKeyModalShowing(false);
            setKeyToDelete(null);
          }}
          onConfirm={handleConfirmDeleteKey}
          isShowing={isDeleteKeyModalShowing}
        />
      )}
    </div>
  );
}

// Create API Key Modal
interface CreateApiKeyModalProps {
  onClose: () => void;
  onCreate: (keyData: any) => void;
}

function CreateApiKeyModal({ onClose, onCreate }: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'api-key' | 'webhook'>('api-key');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const availablePermissions = [
    'read_products', 'write_products', 'read_orders', 'write_orders',
    'read_customers', 'write_customers', 'read_inventory', 'write_inventory',
    'receive_orders', 'receive_products', 'receive_inventory',
  ];

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    onCreate({
      name: name.trim(),
      type,
      description: description.trim(),
      permissions: selectedPermissions,
      isActive,
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
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Create New {type === 'api-key' ? 'API Key' : 'Webhook'}</h2>
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
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Shopify API Key"
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <CustomDropdown
                value={type}
                onChange={(value) => {
                  setType(value as 'api-key' | 'webhook');
                  setSelectedPermissions([]);
                }}
                options={[
                  { value: 'api-key', label: 'API Key' },
                  { value: 'webhook', label: 'Webhook' },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={isActive ? 'active' : 'inactive'}
                onChange={(value) => setIsActive(value === 'active')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this key or webhook..."
              rows={3}
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Permissions
            </label>
            <div className="max-h-55 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-[14px] grid grid-cols-2">
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {permission.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Selected: {selectedPermissions.length} permissions
            </p>
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
              className="px-4 py-2 text-[14px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create {type === 'api-key' ? 'API Key' : 'Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// API Key View Modal (Read-only)
interface ApiKeyViewModalProps {
  apiKey: ApiKey;
  onClose: () => void;
  onCopy: (key: string) => void;
}

function ApiKeyViewModal({ apiKey, onClose, onCopy }: ApiKeyViewModalProps) {
  const [showKey, setShowKey] = useState(false);

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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{apiKey.type === 'api-key' ? 'API Key' : 'Webhook'} Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{apiKey.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {apiKey.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {apiKey.type === 'api-key' ? 'API Key' : 'Webhook URL'}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                  {showKey ? apiKey.key : '••••••••••••••••••••'}
                </code>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onCopy(apiKey.key)}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white min-h-[80px]">
              {apiKey.description || 'No description'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
              {apiKey.type === 'api-key' ? 'API Key' : 'Webhook'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permissions
            </label>
            <div className="flex flex-wrap gap-2">
              {apiKey.permissions.length > 0 ? (
                apiKey.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm"
                  >
                    {permission.replace(/_/g, ' ')}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">No permissions</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px]">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  apiKey.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {apiKey.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {apiKey.lastUsed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Used
                </label>
                <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                  {new Date(apiKey.lastUsed).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {apiKey.expiresAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expires At
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-[14px] text-gray-900 dark:text-white">
                {new Date(apiKey.expiresAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[14px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// API Key Edit Modal
interface ApiKeyEditModalProps {
  apiKey: ApiKey;
  onClose: () => void;
  onUpdate: (keyId: string | number, updates: any) => void;
  onCopy: (key: string) => void;
}

function ApiKeyEditModal({ apiKey, onClose, onUpdate, onCopy }: ApiKeyEditModalProps) {
  const [name, setName] = useState(apiKey.name);
  const [description, setDescription] = useState(apiKey.description);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(apiKey.permissions);
  const [isActive, setIsActive] = useState(apiKey.isActive);
  const [showKey, setShowKey] = useState(false);

  const availablePermissions = [
    'read_products', 'write_products', 'read_orders', 'write_orders',
    'read_customers', 'write_customers', 'read_inventory', 'write_inventory',
    'receive_orders', 'receive_products', 'receive_inventory',
  ];

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = () => {
    onUpdate(apiKey.id, {
      name: name.trim(),
      description: description.trim(),
      permissions: selectedPermissions,
      isActive,
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
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{apiKey.type === 'api-key' ? 'API Key' : 'Webhook'} Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{apiKey.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[14px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Shopify Store"
                className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {apiKey.type === 'api-key' ? 'API Key' : 'Webhook URL'}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white">
                  {showKey ? apiKey.key : '••••••••••••••••••••'}
                </code>
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onCopy(apiKey.key)}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
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
              className="w-full px-3 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the purpose of this key or webhook..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {apiKey.type === 'api-key' ? 'API Key' : 'Webhook'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <CustomDropdown
                value={isActive ? 'active' : 'inactive'}
                onChange={(value) => setIsActive(value === 'active')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Permissions
            </label>
            <div className="max-h-48 overflow-y-auto border grid grid-cols-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 text-[14px]">
              {availablePermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {permission.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Selected: {selectedPermissions.length} permissions
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 gap-10 text-[14px] grid grid-cols-2">
            {apiKey.lastUsed && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Last Used</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(apiKey.lastUsed).toLocaleString()}
                </span>
              </div>
            )}
            {apiKey.expiresAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Expires At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(apiKey.expiresAt).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(apiKey.createdAt).toLocaleString()}
              </span>
            </div>
            {apiKey.updatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Updated At</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(apiKey.updatedAt).toLocaleString()}
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

// Delete API Key Modal Component
function DeleteApiKeyModal({
  apiKey,
  onClose,
  onConfirm,
  isShowing,
}: {
  apiKey: ApiKey;
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
        aria-labelledby="deleteApiKeyModalLabel"
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
              <h5 id="deleteApiKeyModalLabel" className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
                Delete {apiKey.type === 'api-key' ? 'API Key' : 'Webhook'}
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{apiKey.name}"?
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
                Delete {apiKey.type === 'api-key' ? 'API Key' : 'Webhook'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Sync Health Section
function SyncHealthSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedHealth, setSelectedHealth] = useState<SyncHealth | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  // Fetch sync health from API
  const { data: syncHealthData, isLoading: syncHealthLoading } = useQuery({
    queryKey: ['sync-health', statusFilter],
    queryFn: async () => {
      try {
        const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
        const response = await api.get(`/sync-health?skip=0&take=1000${statusParam}`);
        return response.data?.data || [];
      } catch (error) {
        console.error('Error fetching sync health:', error);
        return [];
      }
    },
  });

  const syncHealth: SyncHealth[] = (syncHealthData || []).map((health: any) => ({
    ...health,
    status: health.status?.toLowerCase() || 'healthy',
  }));

  // Filter sync health
  const filteredHealth = useMemo(() => {
    let filtered = syncHealth;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((health) =>
        health.channelName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((health) => health.status === statusFilter);
    }

    // Sort by last sync (newest first)
    return filtered.sort((a, b) =>
      new Date(b.lastSync).getTime() - new Date(a.lastSync).getTime()
    );
  }, [syncHealth, searchQuery, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredHealth.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHealth = filteredHealth.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const total = syncHealth.length;
    const healthy = syncHealth.filter((health) => health.status === 'healthy');
    const warning = syncHealth.filter((health) => health.status === 'warning');
    const error = syncHealth.filter((health) => health.status === 'error');
    const syncing = syncHealth.filter((health) => health.status === 'syncing');
    const totalSynced = syncHealth.reduce((sum, health) => sum + health.recordsSynced, 0);

    return {
      total,
      healthy: healthy.length,
      warning: warning.length,
      error: error.length,
      syncing: syncing.length,
      totalSynced,
    };
  }, [syncHealth]);

  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'syncing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return X;
      case 'syncing':
        return RefreshCw;
      default:
        return Activity;
    }
  };

  // Show loading state (after all hooks)
  if (syncHealthLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Channels</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Healthy</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {summaryMetrics.healthy}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Warning</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                {summaryMetrics.warning}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summaryMetrics.error}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Records Synced</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summaryMetrics.totalSynced.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
              placeholder="Search by channel name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border text-[14px] ::placeholder-[12px] border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
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
                  { value: 'healthy', label: 'Healthy' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'error', label: 'Error' },
                  { value: 'syncing', label: 'Syncing' },
                ]}
              />
            </div>
            <button
              onClick={() => {
                // Refresh sync health
                queryClient.invalidateQueries({ queryKey: ['sync-health'] });
                toast.success('Sync health refreshed');
              }}
              className="flex items-center gap-2 text-[14px] px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Sync Health Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Next Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">
                  Records
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
              {filteredHealth.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Activity className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No sync health data found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Connect channels to see sync health
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedHealth.map((health) => {
                  const StatusIcon = getStatusIcon(health.status);
                  return (
                    <tr
                      key={health.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedHealth(health)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {health.channelName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${health.status === 'healthy' ? 'text-green-600 dark:text-green-400' : health.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : health.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400 animate-spin'}`} />
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(health.status)}`}>
                            {health.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(health.lastSync).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {health.nextSync
                            ? new Date(health.nextSync).toLocaleString()
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {health.recordsSynced.toLocaleString()} synced
                        </div>
                        {health.recordsFailed > 0 && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {health.recordsFailed} failed
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {health.syncDuration !== undefined ? `${health.syncDuration}s` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHealth(health);
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

      {/* Pagination */}
      {filteredHealth.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> to{' '}
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.min(endIndex, filteredHealth.length)}
              </span>{' '}
              of <span className="font-medium text-gray-900 dark:text-white">{filteredHealth.length}</span> results
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
                  className="min-w-[80px]"
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

      {/* Sync Health Details Modal */}
      {selectedHealth && (
        <SyncHealthDetailsModal
          health={selectedHealth}
          onClose={() => setSelectedHealth(null)}
        />
      )}
    </div>
  );
}

// Sync Health Details Modal
interface SyncHealthDetailsModalProps {
  health: SyncHealth;
  onClose: () => void;
}

function SyncHealthDetailsModal({ health, onClose }: SyncHealthDetailsModalProps) {
  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
        return AlertCircle;
      case 'error':
        return X;
      case 'syncing':
        return RefreshCw;
      default:
        return Activity;
    }
  };

  const StatusIcon = getStatusIcon(health.status);

  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'syncing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sync Health Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{health.channelName}</p>
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
              <StatusIcon className={`w-5 h-5 ${health.status === 'healthy' ? 'text-green-600 dark:text-green-400' : health.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : health.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400 animate-spin'}`} />
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(health.status)}`}>
                {health.status}
              </span>
            </div>
          </div>

          {/* Channel Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel ID
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {health.channelId}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel Name
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {health.channelName}
              </div>
            </div>
          </div>

          {/* Sync Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Sync
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {new Date(health.lastSync).toLocaleString()}
              </div>
            </div>

            {health.nextSync && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Next Sync
                </label>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                  {new Date(health.nextSync).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Records Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Records Synced
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {health.recordsSynced.toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Records Failed
              </label>
              <div className={`px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm ${health.recordsFailed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {health.recordsFailed.toLocaleString()}
              </div>
            </div>
          </div>

          {health.syncDuration !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync Duration
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                {health.syncDuration} seconds
              </div>
            </div>
          )}

          {/* Error Message */}
          {health.errorMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Error Message
              </label>
              <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {health.errorMessage}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Created At</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(health.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

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
