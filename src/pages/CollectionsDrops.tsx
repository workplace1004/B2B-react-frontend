import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, TrendingUp, Layers, Calendar as CalendarIcon, BarChart3, X, Pencil, Trash2, AlertTriangle, Inbox, ChevronDown, ChevronLeft, ChevronRight, Package, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';
import { validators } from '../utils/validation';
import Chart from 'react-apexcharts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TabType = 'planner' | 'calendar' | 'performance';

// Custom Select Component with beautiful dropdown
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  error = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  error?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(options[highlightedIndex].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={selectRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 10001 : 'auto', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isOpen ? 'ring-2 ring-primary-500' : ''}`}
        style={{
          padding: '0.532rem 0.6rem 0.532rem 1.2rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.6,
        }}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-auto custom-dropdown-menu"
          style={{
            zIndex: 10001,
            top: '100%',
            left: 0,
            right: 0,
            minWidth: '100%',
            position: 'absolute',
            maxHeight: '400px',
          }}
        >
          {options.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
            </div>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    isSelected || isHighlighted
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    display: 'block',
                    width: '100%',
                  }}
                >
                  {option.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default function CollectionsDrops() {
  const [activeTab, setActiveTab] = useState<TabType>('planner');

  const tabs = [
    { id: 'planner' as TabType, label: 'Collection Planner', icon: Layers },
    { id: 'calendar' as TabType, label: 'Drop Calendar', icon: CalendarIcon },
    { id: 'performance' as TabType, label: 'Style Performance', icon: BarChart3 },
  ];

  return (
    <div>
      <Breadcrumb currentPage="Collections & Drops" />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Collections & Drops</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Plan collections, track drops, and analyze style performance</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {activeTab === 'planner' && <CollectionPlanner />}
        {activeTab === 'calendar' && <DropCalendar />}
        {activeTab === 'performance' && <StylePerformanceTracking />}
      </div>
    </div>
  );
}

// Collection Planner Component
function CollectionPlanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalShowing, setIsModalShowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalShowing, setIsEditModalShowing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalShowing, setIsDeleteModalShowing] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const queryClient = useQueryClient();

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen || isEditModalOpen || isDeleteModalOpen) {
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isModalOpen) setIsModalShowing(true);
          if (isEditModalOpen) setIsEditModalShowing(true);
          if (isDeleteModalOpen) setIsDeleteModalShowing(true);
        });
      });
    } else {
      document.body.classList.remove('modal-open');
      setIsModalShowing(false);
      setIsEditModalShowing(false);
      setIsDeleteModalShowing(false);
    }
  }, [isModalOpen, isEditModalOpen, isDeleteModalOpen]);

  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ['collections', 'planner'],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  const collections = collectionsData || [];

  const createCollectionMutation = useMutation({
    mutationFn: async (collectionData: any) => {
      const response = await api.post('/collections', collectionData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection created successfully!');
      closeModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create collection';
      toast.error(errorMessage);
    },
  });

  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, collectionData }: { id: number; collectionData: any }) => {
      const response = await api.patch(`/collections/${id}`, collectionData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection updated successfully!');
      closeEditModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update collection';
      toast.error(errorMessage);
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/collections/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Collection deleted successfully!');
      closeDeleteModal();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete collection';
      toast.error(errorMessage);
    },
  });

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalShowing(false);
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

  const closeEditModal = () => {
    setIsEditModalShowing(false);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setSelectedCollection(null);
    }, 300);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalShowing(false);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setSelectedCollection(null);
    }, 300);
  };

  // Drag and drop state
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draggedCollection, setDraggedCollection] = useState<any>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group collections by lifecycle
  const collectionsByLifecycle = {
    PLANNING: collections.filter((c: any) => c.lifecycle === 'PLANNING'),
    ACTIVE: collections.filter((c: any) => c.lifecycle === 'ACTIVE'),
    ARCHIVED: collections.filter((c: any) => c.lifecycle === 'ARCHIVED'),
    DISCONTINUED: collections.filter((c: any) => c.lifecycle === 'DISCONTINUED'),
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const collection = collections.find((c: any) => c.id === active.id);
    setActiveId(active.id as number);
    setDraggedCollection(collection);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedCollection(null);

    if (!over) return;

    const collectionId = active.id as number;
    const newLifecycle = over.id as string;

    // Find the collection
    const collection = collections.find((c: any) => c.id === collectionId);
    if (!collection) return;

    // Don't update if dropped in the same column
    if (collection.lifecycle === newLifecycle) return;

    // Update collection lifecycle - only send allowed fields
    updateCollectionMutation.mutate({
      id: collectionId,
      collectionData: {
        lifecycle: newLifecycle,
      },
    });
  };

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Collection Planner</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Plan and organize your collections by lifecycle stage</p>
        </div>
        <button 
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Collection
        </button>
      </div>

      {/* Kanban Board with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(collectionsByLifecycle).map(([lifecycle, items]) => (
            <DroppableColumn
              key={lifecycle}
              lifecycle={lifecycle}
              items={items}
              onEdit={(collection) => {
                setSelectedCollection(collection);
                setIsEditModalOpen(true);
              }}
              onDelete={(collection) => {
                setSelectedCollection(collection);
                setIsDeleteModalOpen(true);
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {draggedCollection ? (
            <CollectionCard
              collection={draggedCollection}
              isDragging={true}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {isModalOpen && (
        <AddCollectionModal
          onClose={closeModal}
          onSubmit={(collectionData) => createCollectionMutation.mutate(collectionData)}
          isLoading={createCollectionMutation.isPending}
          isShowing={isModalShowing}
        />
      )}

      {isEditModalOpen && selectedCollection && (
        <EditCollectionModal
          collection={selectedCollection}
          onClose={closeEditModal}
          onSubmit={(collectionData) => updateCollectionMutation.mutate({ id: selectedCollection.id, collectionData })}
          isLoading={updateCollectionMutation.isPending}
          isShowing={isEditModalShowing}
        />
      )}

      {isDeleteModalOpen && selectedCollection && (
        <DeleteCollectionModal
          collection={selectedCollection}
          onClose={closeDeleteModal}
          onConfirm={() => deleteCollectionMutation.mutate(selectedCollection.id)}
          isLoading={deleteCollectionMutation.isPending}
          isShowing={isDeleteModalShowing}
        />
      )}
    </div>
  );
}

// Drop Calendar Component
function DropCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const { data: collectionsData, isLoading } = useQuery({
    queryKey: ['collections', 'calendar'],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  const collections = collectionsData || [];

  // Transform collections into calendar events (drops)
  const drops = collections
    .filter((c: any) => c.drop) // Only collections with drops
    .map((collection: any) => {
      const dropDate = collection.createdAt 
        ? new Date(collection.createdAt)
        : new Date();
      
      return {
        id: collection.id,
        name: collection.drop || collection.name,
        date: dropDate.toISOString().split('T')[0],
        collection: collection,
        lifecycle: collection.lifecycle,
        products: collection._count?.products || 0,
      };
    });

  const getDropsForDate = (date: string) => {
    return drops.filter((drop) => drop.date === date);
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const today = formatDate(new Date());

  // Generate calendar days for current month
  const getCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        fullDate: formatDate(new Date(year, month - 1, prevMonthLastDay - i)),
        isCurrentMonth: false,
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: day,
        fullDate: formatDate(new Date(year, month, day)),
        isCurrentMonth: true,
      });
    }

    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: day,
        fullDate: formatDate(new Date(year, month + 1, day)),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const calendarDays = getCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get upcoming drops (next 7 days)
  const upcomingDrops = drops
    .filter((drop) => {
      const dropDate = new Date(drop.date);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return dropDate >= today && dropDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Drop Calendar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Visual calendar view of all drops and collections</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
          </div>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getMonthName(selectedDate)}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayDrops = getDropsForDate(day.fullDate);
              const isToday = day.fullDate === today;

              return (
                <div
                  key={index}
                  className={`min-h-24 p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
                    !day.isCurrentMonth ? 'opacity-30 bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'
                  } ${isToday ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {day.date}
                  </div>
                  <div className="space-y-1">
                    {dayDrops.slice(0, 2).map((drop) => (
                      <div
                        key={drop.id}
                        className={`text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                          drop.lifecycle === 'ACTIVE'
                            ? 'bg-green-500 text-white'
                            : drop.lifecycle === 'PLANNING'
                            ? 'bg-yellow-500 text-white'
                            : drop.lifecycle === 'ARCHIVED'
                            ? 'bg-gray-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                        title={`${drop.name} - ${drop.products} products`}
                      >
                        {drop.name}
                      </div>
                    ))}
                    {dayDrops.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        +{dayDrops.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Drops Sidebar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Drops</h3>
          {upcomingDrops.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming drops</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDrops.map((drop) => {
                const dropDate = new Date(drop.date);
                const isToday = drop.date === today;
                const isTomorrow = drop.date === formatDate(new Date(Date.now() + 86400000));

                return (
                  <div
                    key={drop.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                          {drop.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dropDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        drop.lifecycle === 'ACTIVE'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : drop.lifecycle === 'PLANNING'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {drop.lifecycle}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {drop.products} {drop.products === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Style Performance Tracking Component
function StylePerformanceTracking() {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '6m' | '1y'>('30d');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'performance', timeRange],
    queryFn: async () => {
      try {
        const [productsResponse, ordersResponse, collectionsResponse] = await Promise.all([
          api.get('/products?skip=0&take=10000'),
          api.get('/orders?skip=0&take=10000'),
          api.get('/collections?skip=0&take=1000'),
        ]);
        return {
          products: Array.isArray(productsResponse.data) ? productsResponse.data : (productsResponse.data?.data || []),
          orders: ordersResponse.data?.data || [],
          collections: Array.isArray(collectionsResponse.data) ? collectionsResponse.data : (collectionsResponse.data?.data || []),
        };
      } catch (error) {
        return { products: [], orders: [], collections: [] };
      }
    },
  });

  const products = data?.products || [];
  const orders = data?.orders || [];
  const collections = data?.collections || [];

  // Calculate style performance metrics
  const stylePerformance = useMemo(() => {
    // Group products by style
    const stylesMap = new Map<string, {
      name: string;
      products: any[];
      totalProducts: number;
      totalOrders: number;
      totalRevenue: number;
      avgPrice: number;
      collections: Set<string>;
    }>();

    products.forEach((product: any) => {
      const style = product.style || 'No Style';
      if (!stylesMap.has(style)) {
        stylesMap.set(style, {
          name: style,
          products: [],
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          avgPrice: 0,
          collections: new Set(),
        });
      }
      const styleData = stylesMap.get(style)!;
      styleData.products.push(product);
      styleData.totalProducts += 1;
      if (product.collectionId) {
        styleData.collections.add(product.collectionId.toString());
      }
    });

    // Calculate order metrics for each style
    orders.forEach((order: any) => {
      order.orderLines?.forEach((line: any) => {
        const product = products.find((p: any) => p.id === line.productId);
        if (product) {
          const style = product.style || 'No Style';
          const styleData = stylesMap.get(style);
          if (styleData) {
            styleData.totalOrders += line.quantity || 0;
            styleData.totalRevenue += (line.quantity || 0) * (line.unitPrice || 0);
          }
        }
      });
    });

    // Calculate average price
    stylesMap.forEach((styleData) => {
      const totalPrice = styleData.products.reduce((sum, p) => sum + (p.basePrice || 0), 0);
      styleData.avgPrice = styleData.totalProducts > 0 ? totalPrice / styleData.totalProducts : 0;
    });

    return Array.from(stylesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10); // Top 10 styles
  }, [products, orders]);

  // Calculate performance trends (simplified - comparing current vs previous period)
  const performanceTrends = useMemo(() => {
    return stylePerformance.map((style) => {
      // Simplified trend calculation (in real app, compare with previous period)
      const trend = Math.random() > 0.5 ? 'up' : 'down';
      const change = Math.random() * 20;
      return {
        ...style,
        trend,
        change: trend === 'up' ? change : -change,
      };
    });
  }, [stylePerformance]);

  // Chart data for top performing styles
  const chartData = useMemo(() => {
    const top5 = stylePerformance.slice(0, 5);
    return {
      categories: top5.map((s) => s.name),
      revenue: top5.map((s) => s.totalRevenue),
      orders: top5.map((s) => s.totalOrders),
    };
  }, [stylePerformance]);

  // ApexCharts configuration
  const chartOptions = {
    chart: {
      type: 'bar' as const,
      height: 350,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: isDarkMode ? '#ffffff' : '#1C274C',
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#ffffff' : '#1C274C',
          fontSize: '12px',
        },
        formatter: (value: number) => `$${(value / 1000).toFixed(1)}K`,
      },
    },
    fill: {
      opacity: 1,
      colors: ['#5955D1', '#10B981'],
    },
    colors: ['#5955D1', '#10B981'],
    legend: {
      position: 'top' as const,
      labels: {
        colors: isDarkMode ? '#ffffff' : '#1C274C',
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => `$${value.toLocaleString()}`,
      },
    },
    grid: {
      borderColor: isDarkMode ? '#374151' : '#E5E7EB',
    },
  };

  const chartSeries = [
    {
      name: 'Revenue',
      data: chartData.revenue,
    },
    {
      name: 'Orders',
      data: chartData.orders,
    },
  ];

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Style Performance Tracking</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Track and analyze style performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect
            value={timeRange}
            onChange={(value) => setTimeRange(value as '30d' | '90d' | '6m' | '1y')}
            options={[
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '6m', label: 'Last 6 months' },
              { value: '1y', label: 'Last year' },
            ]}
            placeholder="Select time range"
            className="min-w-[180px]"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Styles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {new Set(products.map((p: any) => p.style || 'No Style')).size}
              </p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {products.length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Layers className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${stylePerformance.reduce((sum, s) => sum + s.totalRevenue, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stylePerformance.reduce((sum, s) => sum + s.totalOrders, 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Styles</h3>
        {chartData.categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px]">
            <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No style performance data available</p>
          </div>
        ) : (
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={350}
          />
        )}
      </div>

      {/* Style Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Style Performance Details</h3>
        </div>
        {stylePerformance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Inbox className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No style performance data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Style</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Avg Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Collections</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-white uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {performanceTrends.map((style, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{style.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {style.totalProducts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {style.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${style.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ${style.avgPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {style.collections.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {style.trend === 'up' ? (
                          <>
                            <ArrowUp className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600 dark:text-green-400">
                              +{style.change.toFixed(1)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-600 dark:text-red-400">
                              {style.change.toFixed(1)}%
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Draggable Collection Card Component
function DraggableCollectionCard({
  collection,
  onEdit,
  onDelete,
}: {
  collection: any;
  onEdit: (collection: any) => void;
  onDelete: (collection: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: collection.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <h4
            className="font-medium text-gray-900 dark:text-white text-sm flex-1 cursor-pointer"
            onClick={() => onEdit(collection)}
          >
            {collection.name}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(collection);
            }}
            className="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(collection);
            }}
            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      {collection.season && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-6">Season: {collection.season}</p>
      )}
      {collection.drop && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-6">Drop: {collection.drop}</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
        {collection._count?.products || 0} products
      </p>
    </div>
  );
}

// Collection Card Component (for DragOverlay)
function CollectionCard({
  collection,
  isDragging,
  onEdit,
  onDelete,
}: {
  collection: any;
  isDragging: boolean;
  onEdit: (collection: any) => void;
  onDelete: (collection: any) => void;
}) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border-2 border-primary-500 w-64 rotate-3"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 flex-1">
          <div className="mt-0.5 text-gray-400">
            <GripVertical className="w-4 h-4" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white text-sm flex-1">
            {collection.name}
          </h4>
        </div>
      </div>
      {collection.season && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-6">Season: {collection.season}</p>
      )}
      {collection.drop && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-6">Drop: {collection.drop}</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
        {collection._count?.products || 0} products
      </p>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({
  lifecycle,
  items,
  onEdit,
  onDelete,
}: {
  lifecycle: string;
  items: any[];
  onEdit: (collection: any) => void;
  onDelete: (collection: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: lifecycle,
    data: {
      type: 'column',
      lifecycle,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 min-h-[400px] transition-colors ${
        isOver ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 border-dashed' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{lifecycle}</h3>
        <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
          {items.length}
        </span>
      </div>
      <SortableContext
        items={items.map((item: any) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No collections</p>
            </div>
          ) : (
            items.map((collection: any) => (
              <DraggableCollectionCard
                key={collection.id}
                collection={collection}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Add Collection Modal Component
function AddCollectionModal({
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    season: '',
    drop: '',
    lifecycle: 'PLANNING',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  // Fetch existing collections to get unique drops
  const { data: existingCollections } = useQuery({
    queryKey: ['collections', 'drops-list'],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  // Get unique drops from existing collections (for display as hint)
  const existingDrops = existingCollections
    ? Array.from(new Set(
        (existingCollections as any[])
          .filter((c: any) => c.drop)
          .map((c: any) => c.drop)
      )).sort()
    : [];

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;

    const button = submitButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validation
    const nameError = validators.required(formData.name, 'Collection Name');
    if (nameError) newErrors.name = nameError;
    else {
      const nameLengthError = validators.minLength(formData.name, 2, 'Collection Name');
      if (nameLengthError) newErrors.name = nameLengthError;
      else {
        const nameMaxLengthError = validators.maxLength(formData.name, 200, 'Collection Name');
        if (nameMaxLengthError) newErrors.name = nameMaxLengthError;
      }
    }

    if (formData.season) {
      const seasonLengthError = validators.maxLength(formData.season, 100, 'Season');
      if (seasonLengthError) newErrors.season = seasonLengthError;
    }

    if (formData.drop) {
      const dropLengthError = validators.maxLength(formData.drop, 100, 'Drop');
      if (dropLengthError) newErrors.drop = dropLengthError;
    }

    if (formData.description) {
      const descriptionLengthError = validators.maxLength(formData.description, 1000, 'Description');
      if (descriptionLengthError) newErrors.description = descriptionLengthError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare collection data
    const collectionData = {
      name: formData.name.trim(),
      season: formData.season.trim() || undefined,
      drop: formData.drop.trim() || undefined,
      lifecycle: formData.lifecycle,
      description: formData.description.trim() || undefined,
    };

    onSubmit(collectionData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

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
        aria-labelledby="addCollectionModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full max-h-[90vh] flex flex-col" style={{ overflow: 'visible' }}>
            <div className="modal-header">
              <h5 id="addCollectionModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                Add New Collection
              </h5>
              <button
                type="button"
                onClick={onClose}
                className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form id="addCollectionForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', overflowY: 'auto', position: 'relative', overflow: 'visible' }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Collection Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter collection name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Season</label>
                      <input
                        type="text"
                        value={formData.season}
                        onChange={(e) => handleChange('season', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.season ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Spring 2024"
                      />
                      {errors.season && <p className="mt-1 text-sm text-red-500">{errors.season}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drop</label>
                      <input
                        type="text"
                        value={formData.drop}
                        onChange={(e) => handleChange('drop', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.drop ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Drop 1, Spring Launch"
                      />
                      {errors.drop && <p className="mt-1 text-sm text-red-500">{errors.drop}</p>}
                      {existingDrops.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Existing drops: {existingDrops.slice(0, 3).join(', ')}
                          {existingDrops.length > 3 && ` +${existingDrops.length - 3} more`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lifecycle</label>
                    <CustomSelect
                      value={formData.lifecycle}
                      onChange={(value) => handleChange('lifecycle', value)}
                      options={[
                        { value: 'PLANNING', label: 'Planning' },
                        { value: 'ACTIVE', label: 'Active' },
                        { value: 'ARCHIVED', label: 'Archived' },
                        { value: 'DISCONTINUED', label: 'Discontinued' },
                      ]}
                      placeholder="Select lifecycle"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter collection description"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  onClick={handleButtonClick}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Adding...' : 'Add Collection'}
                  {ripples.map((ripple) => (
                    <span
                      key={ripple.id}
                      className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
                      style={{
                        left: `${ripple.x}px`,
                        top: `${ripple.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  ))}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Edit Collection Modal Component
function EditCollectionModal({
  collection,
  onClose,
  onSubmit,
  isLoading,
  isShowing,
}: {
  collection: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  isShowing: boolean;
}) {
  const [formData, setFormData] = useState({
    name: collection.name || '',
    season: collection.season || '',
    drop: collection.drop || '',
    lifecycle: collection.lifecycle || 'PLANNING',
    description: collection.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  // Fetch existing collections to get unique drops
  const { data: existingCollections } = useQuery({
    queryKey: ['collections', 'drops-list'],
    queryFn: async () => {
      try {
        const response = await api.get('/collections?skip=0&take=1000');
        return Array.isArray(response.data) ? response.data : (response.data?.data || []);
      } catch (error) {
        return [];
      }
    },
  });

  // Get unique drops from existing collections (for display as hint)
  const existingDrops = existingCollections
    ? Array.from(new Set(
        (existingCollections as any[])
          .filter((c: any) => c.drop)
          .map((c: any) => c.drop)
      )).sort()
    : [];

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;

    const button = submitButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const collectionData = {
      name: formData.name.trim(),
      season: formData.season.trim() || undefined,
      drop: formData.drop.trim() || undefined,
      lifecycle: formData.lifecycle,
      description: formData.description.trim() || undefined,
    };

    onSubmit(collectionData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

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
        aria-labelledby="editCollectionModalLabel"
        tabIndex={-1}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '42rem' }}
        >
          <div className="modal-content w-full max-h-[90vh] flex flex-col" style={{ overflow: 'visible' }}>
            <div className="modal-header">
              <h5 id="editCollectionModalLabel" className="modal-title text-xl font-semibold text-gray-900 dark:text-white">
                Edit Collection
              </h5>
              <button
                type="button"
                onClick={onClose}
                className="btn-close p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form id="editCollectionForm" onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="modal-body flex-1 overflow-y-auto" style={{ overflowX: 'visible', overflowY: 'auto', position: 'relative', overflow: 'visible' }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Collection Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter collection name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Season</label>
                      <input
                        type="text"
                        value={formData.season}
                        onChange={(e) => handleChange('season', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.season ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Spring 2024"
                      />
                      {errors.season && <p className="mt-1 text-sm text-red-500">{errors.season}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Drop</label>
                      <input
                        type="text"
                        value={formData.drop}
                        onChange={(e) => handleChange('drop', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          errors.drop ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Drop 1, Spring Launch"
                      />
                      {errors.drop && <p className="mt-1 text-sm text-red-500">{errors.drop}</p>}
                      {existingDrops.length > 0 && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Existing drops: {existingDrops.slice(0, 3).join(', ')}
                          {existingDrops.length > 3 && ` +${existingDrops.length - 3} more`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lifecycle</label>
                    <CustomSelect
                      value={formData.lifecycle}
                      onChange={(value) => handleChange('lifecycle', value)}
                      options={[
                        { value: 'PLANNING', label: 'Planning' },
                        { value: 'ACTIVE', label: 'Active' },
                        { value: 'ARCHIVED', label: 'Archived' },
                        { value: 'DISCONTINUED', label: 'Discontinued' },
                      ]}
                      placeholder="Select lifecycle"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter collection description"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  ref={submitButtonRef}
                  type="submit"
                  onClick={handleButtonClick}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? 'Updating...' : 'Update Collection'}
                  {ripples.map((ripple) => (
                    <span
                      key={ripple.id}
                      className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
                      style={{
                        left: `${ripple.x}px`,
                        top: `${ripple.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  ))}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Delete Collection Modal Component
function DeleteCollectionModal({
  collection,
  onClose,
  onConfirm,
  isLoading,
  isShowing,
}: {
  collection: any;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
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
        aria-labelledby="deleteCollectionModalLabel"
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
              <h5 id="deleteCollectionModalLabel" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Delete Collection
              </h5>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mb-4">
                "{collection.name}"?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="px-5 py-2.5 ml-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-65 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isLoading ? 'Deleting...' : 'Delete Collection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

