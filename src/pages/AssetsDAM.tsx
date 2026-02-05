import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Image, FileText, BookOpen, Search, Grid, List, Upload, X, Pencil, Trash2, Download, Eye } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type TabType = 'images' | 'lookbooks' | 'brand-content';

export default function AssetsDAM() {
  const [activeTab, setActiveTab] = useState<TabType>('images');

  const tabs = [
    { id: 'images' as TabType, label: 'Images', icon: Image },
    { id: 'lookbooks' as TabType, label: 'Lookbooks / Line Sheets', icon: FileText },
    { id: 'brand-content' as TabType, label: 'Brand Content Library', icon: BookOpen },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Assets (DAM)" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Assets (DAM)</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Digital Asset Management: Images, Lookbooks, and Brand Content</p>
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
        {activeTab === 'images' && <ImagesSection />}
        {activeTab === 'lookbooks' && <LookbooksSection />}
        {activeTab === 'brand-content' && <BrandContentSection />}
      </div>
    </div>
  );
}

// Images Section Component
function ImagesSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [_isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch images from DAM API (filter by IMAGE type)
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['dam', 'images', searchQuery],
    queryFn: async () => {
      const response = await api.get('/dam');
      // Filter only IMAGE type assets
      const images = (response.data || []).filter((asset: any) => asset.type === 'IMAGE');
      // Filter by search query if provided
      if (searchQuery) {
        return images.filter((asset: any) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      return images;
    },
  });

  const images = assetsData || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/dam/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dam'] });
      toast.success('Image deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedAsset(null);
    },
    onError: () => {
      toast.error('Failed to delete image');
    },
  });

  const handleDelete = () => {
    if (selectedAsset) {
      deleteMutation.mutate(selectedAsset.id);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ::placeholder-[12px] text-[14px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex text-[14px] items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
          </div>
        </div>
      </div>

      {/* Images Display */}
      {images.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Image className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No images found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by uploading your first image.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {images.map((image: any) => (
            <div
              key={image.id}
              className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                {image.thumbnailUrl || image.url ? (
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className="hidden absolute inset-0 flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedAsset(image);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-gray-900" />
                    </button>
                    <button
                      onClick={() => {
                        if (image.url) window.open(image.url, '_blank');
                      }}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-gray-900" />
                    </button>
                    <button
                      onClick={() => {
                        if (image.url) {
                          const link = document.createElement('a');
                          link.href = image.url;
                          link.download = image.name;
                          link.click();
                        }
                      }}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-900" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAsset(image);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={image.name}>
                  {image.name}
                </p>
                {image.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" title={image.description}>
                    {image.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(image.fileSize)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {images.map((image: any) => (
              <div
                key={image.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {image.thumbnailUrl || image.url ? (
                      <img
                        src={image.thumbnailUrl || image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{image.name}</h4>
                    {image.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{image.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(image.fileSize)}</span>
                      <span>•</span>
                      <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                      {image.tags && image.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex flex-wrap gap-1">
                            {image.tags.slice(0, 3).map((tag: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {image.tags.length > 3 && (
                              <span className="text-xs">+{image.tags.length - 3}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedAsset(image);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (image.url) window.open(image.url, '_blank');
                      }}
                      className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (image.url) {
                          const link = document.createElement('a');
                          link.href = image.url;
                          link.download = image.name;
                          link.click();
                        }
                      }}
                      className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAsset(image);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal - Placeholder for now */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Image</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload functionality will be implemented here.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Image</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedAsset(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-semibold">"{selectedAsset.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedAsset(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Lookbooks / Line Sheets Section Component
function LookbooksSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [_isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch lookbooks/line sheets from DAM API (filter by DOCUMENT type and lookbook tags/description)
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['dam', 'lookbooks', searchQuery],
    queryFn: async () => {
      const response = await api.get('/dam');
      // Filter DOCUMENT type assets that are lookbooks or line sheets
      const documents = (response.data || []).filter((asset: any) => {
        if (asset.type !== 'DOCUMENT') return false;
        const nameLower = asset.name.toLowerCase();
        const descLower = asset.description?.toLowerCase() || '';
        const tagsLower = asset.tags?.join(' ').toLowerCase() || '';
        const searchText = nameLower + ' ' + descLower + ' ' + tagsLower;
        return searchText.includes('lookbook') || searchText.includes('line sheet') || searchText.includes('linesheet');
      });
      // Filter by search query if provided
      if (searchQuery) {
        return documents.filter((asset: any) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      return documents;
    },
  });

  const lookbooks = assetsData || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/dam/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dam'] });
      toast.success('Lookbook deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedAsset(null);
    },
    onError: () => {
      toast.error('Failed to delete lookbook');
    },
  });

  const handleDelete = () => {
    if (selectedAsset) {
      deleteMutation.mutate(selectedAsset.id);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search lookbooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ::placeholder-[12px] text-[14px] pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex text-[14px] items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Lookbook
          </button>
        </div>
      </div>

      {/* Lookbooks List */}
      {lookbooks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No lookbooks found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by uploading your first lookbook or line sheet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {lookbooks.map((lookbook: any) => (
                  <tr key={lookbook.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{lookbook.name}</div>
                      {lookbook.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{lookbook.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                        {lookbook.mimeType?.split('/')[1]?.toUpperCase() || 'PDF'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(lookbook.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(lookbook.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (lookbook.url) window.open(lookbook.url, '_blank');
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (lookbook.url) {
                              const link = document.createElement('a');
                              link.href = lookbook.url;
                              link.download = lookbook.name;
                              link.click();
                            }
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(lookbook);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(lookbook);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal - Placeholder */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Lookbook</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload functionality will be implemented here.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Lookbook</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedAsset(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-semibold">"{selectedAsset.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedAsset(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Brand Content Library Section Component
function BrandContentSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [_isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch brand content from DAM API (filter by brand-related tags/descriptions)
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['dam', 'brand-content', searchQuery, filterType],
    queryFn: async () => {
      const response = await api.get('/dam');
      // Filter assets that are brand-related (have brand tags or are not product-specific)
      let brandAssets = (response.data || []).filter((asset: any) => {
        // Include assets without productId (general brand assets) or with brand-related tags
        const tagsLower = asset.tags?.join(' ').toLowerCase() || '';
        const descLower = asset.description?.toLowerCase() || '';
        const nameLower = asset.name.toLowerCase();
        const searchText = tagsLower + ' ' + descLower + ' ' + nameLower;
        return !asset.productId ||
          searchText.includes('brand') ||
          searchText.includes('logo') ||
          searchText.includes('marketing') ||
          searchText.includes('campaign');
      });

      // Filter by type if specified
      if (filterType !== 'all') {
        brandAssets = brandAssets.filter((asset: any) => asset.type === filterType);
      }

      // Filter by search query if provided
      if (searchQuery) {
        brandAssets = brandAssets.filter((asset: any) =>
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      return brandAssets;
    },
  });

  const brandAssets = assetsData || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/dam/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dam'] });
      toast.success('Asset deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedAsset(null);
    },
    onError: () => {
      toast.error('Failed to delete asset');
    },
  });

  const handleDelete = () => {
    if (selectedAsset) {
      deleteMutation.mutate(selectedAsset.id);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return Image;
      case 'VIDEO':
        return FileText; // Could use a Video icon if available
      case 'DOCUMENT':
        return FileText;
      default:
        return FileText;
    }
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search, Filter, and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search brand content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 ::placeholder-[12px] text-[14px] py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="IMAGE">Images</option>
                  <option value="VIDEO">Videos</option>
                  <option value="DOCUMENT">Documents</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex text-[14px] items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Asset
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Brand Assets Display */}
      {brandAssets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No brand content found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
              {searchQuery || filterType !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Get started by uploading your first brand asset.'}
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {brandAssets.map((asset: any) => {
            const AssetIcon = getAssetIcon(asset.type);
            return (
              <div
                key={asset.id}
                className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                  {asset.type === 'IMAGE' && (asset.thumbnailUrl || asset.url) ? (
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${asset.type === 'IMAGE' && (asset.thumbnailUrl || asset.url) ? 'hidden' : ''} absolute inset-0 flex items-center justify-center`}>
                    <AssetIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 text-gray-900" />
                      </button>
                      <button
                        onClick={() => {
                          if (asset.url) window.open(asset.url, '_blank');
                        }}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-gray-900" />
                      </button>
                      <button
                        onClick={() => {
                          if (asset.url) {
                            const link = document.createElement('a');
                            link.href = asset.url;
                            link.download = asset.name;
                            link.click();
                          }
                        }}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-900" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAsset(asset);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {asset.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(asset.fileSize)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Tags</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {brandAssets.map((asset: any) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{asset.name}</div>
                      {asset.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{asset.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 rounded">
                        {asset.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(asset.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {asset.tags && asset.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {asset.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                          {asset.tags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">+{asset.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (asset.url) window.open(asset.url, '_blank');
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (asset.url) {
                              const link = document.createElement('a');
                              link.href = asset.url;
                              link.download = asset.name;
                              link.click();
                            }
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal - Placeholder */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Brand Asset</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload functionality will be implemented here.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Asset</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedAsset(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-semibold">"{selectedAsset.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedAsset(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

