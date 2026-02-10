import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Link2, 
  Plus, 
  X, 
  CheckCircle2, 
  BarChart3, 
  Search,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

interface Integration {
  id: number;
  name: string;
  type: string;
  status: string;
  apiKey?: string;
  apiSecret?: string;
  config?: any;
  lastSync?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Get category from integration type
const getCategory = (type: string): string => {
  const categoryMap: Record<string, string> = {
    ANALYTICS: 'Web Analytics',
    MARKETING: 'Marketing',
    E_COMMERCE: 'E-commerce',
    ACCOUNTING: 'Accounting',
    SHIPPING: 'Shipping',
    OTHER: 'Other',
  };
  return categoryMap[type] || 'Other';
};

// Get icon from integration name
const getIcon = (name: string): string => {
  const iconMap: Record<string, string> = {
    'Google Analytics': '📊',
    'Google Ads': '📈',
    'Facebook Pixel': '📱',
    'Shopify': '🛒',
    'Shopify Analytics': '🛒',
    'Klaviyo': '📧',
    'Mixpanel': '🔍',
    'Amplitude': '📉',
    'Segment': '🔗',
  };
  return iconMap[name] || '🔌';
};

export default function MarketingIntegrations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Integration | null>(null);
  const queryClient = useQueryClient();

  // Fetch integrations from API
  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ['integrations', 'marketing'],
    queryFn: async () => {
      try {
        const response = await api.get('/integrations?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  const integrations = integrationsData || [];

  // Filter integrations
  const filteredIntegrations = integrations.filter((integration: Integration) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      integration.name.toLowerCase().includes(query) ||
      integration.type.toLowerCase().includes(query) ||
      getCategory(integration.type).toLowerCase().includes(query) ||
      integration.notes?.toLowerCase().includes(query)
    );
  });

  // Group by category
  const groupedIntegrations = filteredIntegrations.reduce((acc: Record<string, Integration[]>, integration: Integration) => {
    const category = getCategory(integration.type);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  // Create integration mutation
  const createIntegrationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/integrations', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Integration created successfully!');
      queryClient.invalidateQueries({ queryKey: ['integrations', 'marketing'] });
      setIsModalOpen(false);
      setSelectedConnection(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create integration');
    },
  });

  // Update integration mutation
  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.patch(`/integrations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Integration updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['integrations', 'marketing'] });
      setIsModalOpen(false);
      setSelectedConnection(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update integration');
    },
  });

  // Delete integration mutation
  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/integrations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Integration deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['integrations', 'marketing'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete integration');
    },
  });

  const handleConnect = (integration: Integration | null) => {
    setSelectedConnection(integration);
    setIsModalOpen(true);
  };

  const handleDisconnect = (integrationId: number) => {
    deleteIntegrationMutation.mutate(integrationId);
  };

  const handleSync = async (integrationId: number) => {
    try {
      const integration = integrations.find((i: Integration) => i.id === integrationId);
      if (!integration) return;

      // Update lastSync timestamp
      await updateIntegrationMutation.mutateAsync({
        id: integrationId,
        data: { lastSync: new Date().toISOString() },
      });
      toast.success('Data synced successfully');
    } catch (error) {
      toast.error('Failed to sync data');
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Integrations" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Marketing Integrations</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Connect analytics platforms to track performance and insights</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search analytics connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Connections</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {integrations.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Integrations configured
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Connections</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {integrations.filter((i: Integration) => i.status === 'CONNECTED').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Syncing data
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Disconnected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {integrations.filter((i: Integration) => i.status === 'DISCONNECTED').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Not connected
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Add New Integration Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => handleConnect(null)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Integration
        </button>
      </div>

      {/* Integrations by Category */}
      {Object.keys(groupedIntegrations).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No integrations found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No integrations configured. Click "Add Integration" to get started.'}
            </p>
          </div>
        </div>
      ) : (
        Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
          <div key={category} className="mb-6">
            <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(categoryIntegrations as Integration[]).map((integration: Integration) => {
                const isConnected = integration.status === 'CONNECTED';
                return (
                  <div
                    key={integration.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all ${
                      isConnected
                        ? 'border-primary-500 dark:border-primary-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                            {getIcon(integration.name)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {integration.name}
                            </h3>
                            {isConnected && (
                              <div className="flex items-center gap-1 mt-1">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  Connected
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {integration.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {integration.notes}
                        </p>
                      )}

                      {isConnected && integration.lastSync && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Last synced</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(integration.lastSync).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <>
                            <button
                              onClick={() => handleSync(integration.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Sync
                            </button>
                            <button
                              onClick={() => handleConnect(integration)}
                              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              title="Settings"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDisconnect(integration.id)}
                              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                              title="Disconnect"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnect(integration)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Connection Modal */}
      {isModalOpen && (
        <ConnectionModal
          integration={selectedConnection}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedConnection(null);
          }}
          onSave={(data) => {
            if (selectedConnection?.id) {
              updateIntegrationMutation.mutate({ id: selectedConnection.id, data });
            } else {
              createIntegrationMutation.mutate(data);
            }
          }}
          onDelete={(id) => {
            handleDisconnect(id);
            setIsModalOpen(false);
            setSelectedConnection(null);
          }}
        />
      )}
    </div>
  );
}

// Connection Modal Component
function ConnectionModal({
  integration,
  onClose,
  onSave,
  onDelete,
}: {
  integration: Integration | null;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: (id: number) => void;
}) {
  const [formData, setFormData] = useState({
    name: integration?.name || '',
    type: integration?.type || 'MARKETING',
    status: integration?.status || 'DISCONNECTED',
    apiKey: integration?.apiKey || '',
    apiSecret: integration?.apiSecret || '',
    notes: integration?.notes || '',
  });

  const isEditing = !!integration?.id;
  const isConnected = integration?.status === 'CONNECTED';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter an integration name');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {integration && (
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                {getIcon(integration.name)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Integration' : 'Add Integration'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {integration ? getCategory(integration.type) : 'Configure integration settings'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Integration Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Google Analytics, Shopify"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Integration Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="MARKETING">Marketing</option>
              <option value="ANALYTICS">Analytics</option>
              <option value="E_COMMERCE">E-commerce</option>
              <option value="ACCOUNTING">Accounting</option>
              <option value="SHIPPING">Shipping</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="DISCONNECTED">Disconnected</option>
              <option value="CONNECTED">Connected</option>
              <option value="PENDING">Pending</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key / Access Token
            </label>
            <input
              type="text"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="Enter your API key"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              API keys are encrypted and stored securely
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Secret (Optional)
            </label>
            <input
              type="password"
              value={formData.apiSecret}
              onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
              placeholder="Enter your API secret"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or description"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {isConnected && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-900 dark:text-green-200">
                  Integration is Connected
                </p>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                This integration is active and syncing data.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {isEditing && (
              <button
                type="button"
                onClick={() => onDelete(integration!.id)}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
