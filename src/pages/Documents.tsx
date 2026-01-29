import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { FileText, Download, Eye, Plus, Search } from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';

interface Document {
  id: number;
  name: string;
  type: string;
  date: string;
  status: 'new' | 'read';
  size?: string;
  description?: string;
  url?: string;
  mimeType?: string;
}

export default function Documents() {
  const [filter, setFilter] = useState<'all' | 'new' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readDocuments, setReadDocuments] = useState<Set<number>>(new Set());

  // Fetch documents from DAM API (filter by DOCUMENT type)
  const { data: damAssets, isLoading } = useQuery({
    queryKey: ['dam', 'documents'],
    queryFn: async () => {
      const response = await api.get('/dam');
      // Filter only DOCUMENT type assets
      return (response.data || []).filter((asset: any) => asset.type === 'DOCUMENT');
    },
  });

  // Transform DAM assets to documents format
  const documents: Document[] = (damAssets || []).map((asset: any) => {
    const fileExtension = asset.mimeType?.split('/')[1]?.toUpperCase() || 'DOCUMENT';
    const fileSize = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : undefined;
    const isRead = readDocuments.has(asset.id);
    
    return {
      id: asset.id,
      name: asset.name,
      type: fileExtension,
      date: new Date(asset.createdAt).toISOString().split('T')[0],
      status: isRead ? 'read' : 'new',
      size: fileSize,
      description: asset.description,
      url: asset.url,
      mimeType: asset.mimeType,
    };
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'new' && doc.status === 'new') ||
      (filter === 'read' && doc.status === 'read');
    
    const matchesSearch =
      searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const newCount = documents.filter((doc) => doc.status === 'new').length;

  const getFileIconColor = (type: string) => {
    if (type === 'PDF') return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    if (type === 'Excel') return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
  };

  const handleDownload = (id: number) => {
    const doc = documents.find((d) => d.id === id);
    if (doc?.url) {
      window.open(doc.url, '_blank');
    }
  };

  const handleView = (id: number) => {
    const doc = documents.find((d) => d.id === id);
    if (doc?.url) {
      // Mark as read
      setReadDocuments((prev) => new Set([...prev, id]));
      window.open(doc.url, '_blank');
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-black">Documents & Tasks</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and view all your documents</p>
          </div>
          <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'all'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            All ({documents.length})
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'new'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            New ({newCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === 'read'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Read ({documents.length - newCount})
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No {filter === 'all' ? '' : filter} documents found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'Try adjusting your search terms'
                : filter === 'new'
                ? 'You have no new documents'
                : filter === 'read'
                ? 'You have no read documents'
                : 'You have no documents'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  doc.status === 'new' ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getFileIconColor(doc.type)}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{doc.name}</h4>
                          {doc.status === 'new' && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                          {doc.size && (
                            <>
                              <span>•</span>
                              <span>{doc.size}</span>
                            </>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{doc.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(doc.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc.id)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

