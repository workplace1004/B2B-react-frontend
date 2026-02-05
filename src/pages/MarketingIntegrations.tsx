import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  Link2, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  Search,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';

interface AnalyticsConnection {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isConnected: boolean;
  lastSync?: string;
  status?: 'active' | 'error' | 'pending';
}

export default function MarketingIntegrations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<AnalyticsConnection | null>(null);
  const queryClient = useQueryClient();

  // Available analytics connections
  const availableConnections: AnalyticsConnection[] = [
    {
      id: 'google-analytics',
      name: 'Google Analytics',
      description: 'Track website traffic, user behavior, and conversion metrics',
      icon: '📊',
      category: 'Web Analytics',
      isConnected: false,
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      description: 'Import campaign performance data and conversion tracking',
      icon: '📈',
      category: 'Advertising',
      isConnected: false,
    },
    {
      id: 'facebook-pixel',
      name: 'Facebook Pixel',
      description: 'Track conversions and optimize ad campaigns',
      icon: '📱',
      category: 'Social Media',
      isConnected: false,
    },
    {
      id: 'shopify-analytics',
      name: 'Shopify Analytics',
      description: 'Sync sales data, product performance, and customer insights',
      icon: '🛒',
      category: 'E-commerce',
      isConnected: false,
    },
    {
      id: 'klaviyo',
      name: 'Klaviyo',
      description: 'Email marketing analytics and customer segmentation data',
      icon: '📧',
      category: 'Email Marketing',
      isConnected: false,
    },
    {
      id: 'mixpanel',
      name: 'Mixpanel',
      description: 'Product analytics and user behavior tracking',
      icon: '🔍',
      category: 'Product Analytics',
      isConnected: false,
    },
    {
      id: 'amplitude',
      name: 'Amplitude',
      description: 'Behavioral analytics and user journey insights',
      icon: '📉',
      category: 'Product Analytics',
      isConnected: false,
    },
    {
      id: 'segment',
      name: 'Segment',
      description: 'Customer data platform for unified analytics',
      icon: '🔗',
      category: 'Data Platform',
      isConnected: false,
    },
  ];

  // Get connected integrations from localStorage (until backend is ready)
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>(() => {
    const stored = localStorage.getItem('analytics-connections');
    return stored ? JSON.parse(stored) : [];
  });

  // Merge available connections with connection status
  const connections = availableConnections.map((conn) => ({
    ...conn,
    isConnected: connectedIntegrations.includes(conn.id),
    status: connectedIntegrations.includes(conn.id) ? 'active' as const : undefined,
    lastSync: connectedIntegrations.includes(conn.id) 
      ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
  }));

  // Filter connections
  const filteredConnections = connections.filter((conn) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conn.name.toLowerCase().includes(query) ||
      conn.description.toLowerCase().includes(query) ||
      conn.category.toLowerCase().includes(query)
    );
  });

  // Group by category
  const groupedConnections = filteredConnections.reduce((acc, conn) => {
    if (!acc[conn.category]) {
      acc[conn.category] = [];
    }
    acc[conn.category].push(conn);
    return acc;
  }, {} as Record<string, AnalyticsConnection[]>);

  const handleConnect = (connection: AnalyticsConnection) => {
    setSelectedConnection(connection);
    setIsModalOpen(true);
  };

  const handleDisconnect = (connectionId: string) => {
    const updated = connectedIntegrations.filter((id) => id !== connectionId);
    setConnectedIntegrations(updated);
    localStorage.setItem('analytics-connections', JSON.stringify(updated));
    toast.success('Connection disconnected successfully');
    queryClient.invalidateQueries({ queryKey: ['integrations', 'marketing'] });
  };

  const handleSync = (_connectionId: string) => {
    toast.success('Syncing data...');
    // Simulate sync
    setTimeout(() => {
      toast.success('Data synced successfully');
    }, 2000);
  };

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
                {connectedIntegrations.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                of {availableConnections.length} available
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
                {connections.filter((c) => c.isConnected && c.status === 'active').length}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {availableConnections.length - connectedIntegrations.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ready to connect
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Connections by Category */}
      {Object.keys(groupedConnections).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No connections found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No analytics connections available.'}
            </p>
          </div>
        </div>
      ) : (
        Object.entries(groupedConnections).map(([category, categoryConnections]) => (
          <div key={category} className="mb-6">
            <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryConnections.map((connection) => (
                <div
                  key={connection.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all ${
                    connection.isConnected
                      ? 'border-primary-500 dark:border-primary-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                          {connection.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {connection.name}
                          </h3>
                          {connection.isConnected && (
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

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {connection.description}
                    </p>

                    {connection.isConnected && connection.lastSync && (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Last synced</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(connection.lastSync).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {connection.isConnected ? (
                        <>
                          <button
                            onClick={() => handleSync(connection.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync
                          </button>
                          <button
                            onClick={() => {
                              setSelectedConnection(connection);
                              setIsModalOpen(true);
                            }}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDisconnect(connection.id)}
                            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            title="Disconnect"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(connection)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Connection Modal */}
      {isModalOpen && selectedConnection && (
        <ConnectionModal
          connection={selectedConnection}
          isConnected={selectedConnection.isConnected}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedConnection(null);
          }}
          onConnect={(connectionId) => {
            const updated = [...connectedIntegrations, connectionId];
            setConnectedIntegrations(updated);
            localStorage.setItem('analytics-connections', JSON.stringify(updated));
            toast.success('Connection established successfully!');
            setIsModalOpen(false);
            setSelectedConnection(null);
            queryClient.invalidateQueries({ queryKey: ['integrations', 'marketing'] });
          }}
          onDisconnect={(connectionId) => {
            handleDisconnect(connectionId);
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
  connection,
  isConnected,
  onClose,
  onConnect,
  onDisconnect,
}: {
  connection: AnalyticsConnection;
  isConnected: boolean;
  onClose: () => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnected) {
      // Update connection
      toast.success('Connection settings updated!');
      onClose();
      return;
    }

    // Connect new integration
    setIsConnecting(true);
    // Simulate API call
    setTimeout(() => {
      setIsConnecting(false);
      onConnect(connection.id);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
              {connection.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isConnected ? 'Connection Settings' : `Connect ${connection.name}`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{connection.category}</p>
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {connection.description}
            </p>
          </div>

          {!isConnected ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key / Access Token *
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  placeholder="Enter your API key"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can find this in your {connection.name} account settings
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Secret (Optional)
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your API secret"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                      Connection is Optional
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Analytics connections are optional and can be configured later. You can continue using the platform without connecting any analytics services.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-900 dark:text-green-200">
                  Successfully Connected
                </p>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Your {connection.name} integration is active and syncing data.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {isConnected && (
              <button
                type="button"
                onClick={() => onDisconnect(connection.id)}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Disconnect
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isConnected ? 'Close' : 'Cancel'}
            </button>
            {!isConnected && (
              <button
                type="submit"
                disabled={isConnecting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
