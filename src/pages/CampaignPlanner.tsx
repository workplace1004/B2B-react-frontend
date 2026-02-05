import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Calendar, Plus, ChevronLeft, ChevronRight, X, Trash2, Package, Rocket, Tag, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import api from '../lib/api';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

type EventType = 'DROP' | 'LAUNCH' | 'PROMO';

// Custom Select Component
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  error = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      // Calculate position when opening
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 400; // maxHeight
        
        // Show above if not enough space below and more space above
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropdownPosition('above');
        } else {
          setDropdownPosition('below');
        }
      }
      
      const handleResize = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          const dropdownHeight = 400;
          
          if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            setDropdownPosition('above');
          } else {
            setDropdownPosition('below');
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
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
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white flex items-center justify-between transition-all ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        } ${isOpen ? 'ring-2 ring-primary-500 border-primary-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'}`}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && !disabled && (
        <div 
          className={`absolute w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-auto custom-dropdown-menu ${
            dropdownPosition === 'above' ? 'mb-1 bottom-full' : 'mt-1 top-full'
          }`}
          style={{
            zIndex: 10001,
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
            <div className="py-1">
              {options.map((option, index) => {
                const isSelected = option.value === value;
                
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary-600 text-white'
                        : isHighlighted
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CampaignEvent {
  id: string;
  name: string;
  date: string;
  type: EventType;
  description?: string;
  status?: string;
  collectionId?: number;
}

export default function CampaignPlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CampaignEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CampaignEvent | null>(null);

  // Fetch collections for drops
  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ['collections', 'campaign-planner'],
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

  // Transform collections into events (drops)
  const dropEvents = useMemo(() => {
    return collections
      .filter((c: any) => c.drop || c.createdAt)
      .map((collection: any) => {
        const dropDate = collection.dropDate 
          ? new Date(collection.dropDate)
          : collection.createdAt 
          ? new Date(collection.createdAt)
          : new Date();
        
        return {
          id: `drop-${collection.id}`,
          name: collection.drop || collection.name,
          date: dropDate.toISOString().split('T')[0],
          type: 'DROP' as EventType,
          description: collection.description,
          status: collection.lifecycle,
          collectionId: collection.id,
        };
      });
  }, [collections]);

  // TODO: Fetch launches and promos from backend when available
  // For now, using localStorage for launches and promos
  const [localEvents, setLocalEvents] = useState<CampaignEvent[]>(() => {
    const stored = localStorage.getItem('campaign-events');
    return stored ? JSON.parse(stored) : [];
  });

  // Combine all events
  const allEvents = useMemo(() => {
    return [...dropEvents, ...localEvents];
  }, [dropEvents, localEvents]);

  // Save local events to localStorage
  const saveLocalEvents = (events: CampaignEvent[]) => {
    setLocalEvents(events);
    localStorage.setItem('campaign-events', JSON.stringify(events));
  };

  // Delete mutation for local events
  const deleteEvent = (eventId: string) => {
    if (eventId.startsWith('drop-')) {
      toast.error('Drops cannot be deleted from here. Please delete the collection instead.');
      return;
    }
    const updated = localEvents.filter((e) => e.id !== eventId);
    saveLocalEvents(updated);
    toast.success('Event deleted successfully!');
    setIsDeleteModalOpen(false);
    setEventToDelete(null);
  };

  // Create/Update mutation for local events
  const saveEvent = (event: CampaignEvent) => {
    if (event.id && localEvents.some((e) => e.id === event.id)) {
      // Update existing
      const updated = localEvents.map((e) => (e.id === event.id ? event : e));
      saveLocalEvents(updated);
      toast.success('Event updated successfully!');
    } else {
      // Create new
      const newEvent = {
        ...event,
        id: `${event.type.toLowerCase()}-${Date.now()}`,
      };
      saveLocalEvents([...localEvents, newEvent]);
      toast.success('Event created successfully!');
    }
    setIsModalOpen(false);
    setSelectedEvent(null);
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

  const goToToday = () => {
    setSelectedDate(new Date());
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

  const getEventsForDate = (date: string) => {
    return allEvents.filter((event) => event.date === date);
  };

  const getEventTypeColor = (type: EventType) => {
    switch (type) {
      case 'DROP':
        return 'bg-blue-500 dark:bg-blue-600';
      case 'LAUNCH':
        return 'bg-green-500 dark:bg-green-600';
      case 'PROMO':
        return 'bg-purple-500 dark:bg-purple-600';
      default:
        return 'bg-gray-500 dark:bg-gray-600';
    }
  };

  const getEventTypeIcon = (type: EventType) => {
    switch (type) {
      case 'DROP':
        return Package;
      case 'LAUNCH':
        return Rocket;
      case 'PROMO':
        return Tag;
      default:
        return Calendar;
    }
  };

  const handleDateClick = (date: string) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      // Show first event or a list
      setSelectedEvent(events[0]);
      setIsModalOpen(true);
    } else {
      // If no events, allow adding a new event for this date
      handleAddEvent(date);
    }
  };

  const handleAddEvent = (date?: string) => {
    setSelectedEvent({
      id: '',
      name: '',
      date: date || formatDate(new Date()),
      type: 'DROP',
      description: '',
    });
    setIsModalOpen(true);
  };

  if (collectionsLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Campaign Planner" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Campaign Planner</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1  text-[14px]">Calendar view for drops, launches, and promotions</p>
          </div>
          <button
            onClick={() => handleAddEvent()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Event
          </button>
        </div>
      </div>

      {/* Upcoming Events Sidebar */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Upcoming Events</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {(() => {
            const upcoming = allEvents
              .filter((event) => {
                const eventDate = new Date(event.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return eventDate >= today;
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 10);

            if (upcoming.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No upcoming events</p>
                </div>
              );
            }

            return upcoming.map((event) => {
              const Icon = getEventTypeIcon(event.type);
              const eventDate = new Date(event.date);
              const isToday = event.date === today;
              const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setIsModalOpen(true);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isToday
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(event.type)}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isToday
                        ? 'Today'
                        : daysUntil === 1
                        ? 'Tomorrow'
                        : `${daysUntil} days`} • {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {event.type}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Calendar Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getMonthName(selectedDate)}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const events = getEventsForDate(day.fullDate);
              const isToday = day.fullDate === today;

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(day.fullDate)}
                  className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                    day.isCurrentMonth
                      ? 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400'
                      : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
                  } ${
                    isToday ? 'ring-2 ring-primary-500 dark:ring-primary-400' : ''
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      day.isCurrentMonth
                        ? isToday
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}
                  >
                    {day.date}
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 3).map((event) => {
                      const Icon = getEventTypeIcon(event.type);
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                            setIsModalOpen(true);
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs text-white ${getEventTypeColor(event.type)}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span className="truncate">{event.name}</span>
                        </div>
                      );
                    })}
                    {events.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                        +{events.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Legend */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Drops</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Launches</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Promos</span>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {isModalOpen && (
        <EventModal
          event={selectedEvent}
          collections={collections}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(null);
          }}
          onSave={saveEvent}
          onDelete={(event) => {
            setEventToDelete(event);
            setIsDeleteModalOpen(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Event</h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setEventToDelete(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete <span className="font-semibold">"{eventToDelete.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteEvent(eventToDelete.id);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Event Modal Component
function EventModal({
  event,
  collections,
  onClose,
  onSave,
  onDelete,
}: {
  event: CampaignEvent | null;
  collections: any[];
  onClose: () => void;
  onSave: (event: CampaignEvent) => void;
  onDelete: (event: CampaignEvent) => void;
}) {
  const [formData, setFormData] = useState<CampaignEvent>({
    id: event?.id || '',
    name: event?.name || '',
    date: event?.date || new Date().toISOString().split('T')[0],
    type: event?.type || 'DROP',
    description: event?.description || '',
    status: event?.status || '',
    collectionId: event?.collectionId,
  });

  // Calendar state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    if (event?.date) {
      return new Date(event.date);
    }
    return new Date();
  });
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setFullYear(prev.getFullYear() - 1);
      } else {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    const formattedDate = selected.toISOString().split('T')[0];
    setFormData({ ...formData, date: formattedDate });
    setIsCalendarOpen(false);
  };

  const handleClearDate = () => {
    setFormData({ ...formData, date: '' });
    setIsCalendarOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setFormData({ ...formData, date: formattedDate });
    setCalendarDate(today);
    setIsCalendarOpen(false);
  };

  const isSelected = (day: number) => {
    if (!formData.date) return false;
    const selected = new Date(formData.date);
    return (
      selected.getDate() === day &&
      selected.getMonth() === calendarDate.getMonth() &&
      selected.getFullYear() === calendarDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === calendarDate.getMonth() &&
      today.getFullYear() === calendarDate.getFullYear()
    );
  };

  // Calculate calendar position
  const calculateCalendarPosition = () => {
    if (calendarButtonRef.current) {
      const rect = calendarButtonRef.current.getBoundingClientRect();
      const calendarHeight = 400;
      const calendarWidth = 320;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const openUpward = spaceBelow < calendarHeight && spaceAbove > spaceBelow;
      
      let left = rect.left;
      if (left + calendarWidth > viewportWidth) {
        left = viewportWidth - calendarWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }
      
      setCalendarPosition({
        top: openUpward ? Math.max(16, rect.top - calendarHeight - 4) : Math.min(rect.bottom + 4, viewportHeight - calendarHeight - 16),
        left: left,
      });
    }
  };

  // Update calendar date when formData.date changes
  useEffect(() => {
    if (formData.date) {
      const date = new Date(formData.date);
      if (!isNaN(date.getTime())) {
        setCalendarDate(date);
      }
    }
  }, [formData.date]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node) &&
          calendarButtonRef.current && !calendarButtonRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };

    if (isCalendarOpen) {
      calculateCalendarPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', calculateCalendarPosition);
      window.addEventListener('scroll', calculateCalendarPosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', calculateCalendarPosition);
      window.removeEventListener('scroll', calculateCalendarPosition, true);
    };
  }, [isCalendarOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter an event name');
      return;
    }
    onSave(formData);
  };

  const isDrop = formData.id.startsWith('drop-');
  const isReadOnly = isDrop; // Drops are read-only (managed by collections)

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {event?.id ? 'Event Details' : 'New Event'}
          </h3>
          <div className="flex items-center gap-2">
            {event?.id && !isDrop && (
              <button
                onClick={() => onDelete(event)}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors dark:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Type *
            </label>
            <CustomSelect
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as EventType })}
              disabled={isReadOnly}
              options={[
                { value: 'DROP', label: 'Drop' },
                { value: 'LAUNCH', label: 'Launch' },
                { value: 'PROMO', label: 'Promo' },
              ]}
              placeholder="Select event type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isReadOnly}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date *
            </label>
            <div className="relative">
              <button
                type="button"
                ref={calendarButtonRef}
                onClick={() => !isReadOnly && setIsCalendarOpen(!isCalendarOpen)}
              disabled={isReadOnly}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 flex items-center justify-between text-left"
              >
                <span className={formData.date ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {formData.date 
                    ? new Date(formData.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                    : 'Select date'}
                </span>
                <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>

              {isCalendarOpen && !isReadOnly && (
                <>
                  <div className="fixed inset-0 z-[10001]" onClick={() => setIsCalendarOpen(false)} />
                  <div 
                    ref={calendarRef}
                    className="fixed w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700" 
                    style={{ 
                      zIndex: 10002,
                      top: `${calendarPosition.top}px`,
                      left: `${calendarPosition.left}px`,
                      maxHeight: '90vh',
                      overflowY: 'auto'
                    }}
                  >
                    {/* Calendar Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => navigateMonth('prev')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h3>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => navigateYear('next')}
                              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <ChevronUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigateYear('prev')}
                              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <ChevronDown className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateMonth('next')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Calendar Days */}
                    <div className="p-4">
                      {/* Day names */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div
                            key={day}
                            className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, index) => (
                          <div key={`empty-${index}`} className="aspect-square"></div>
                        ))}
                        {/* Days of the month */}
                        {Array.from({ length: getDaysInMonth(calendarDate) }, (_, i) => i + 1).map((day) => {
                          const isSelectedDay = isSelected(day);
                          const isTodayDay = isToday(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDateSelect(day)}
                              className={`aspect-square rounded text-sm font-medium transition-all ${
                                isSelectedDay
                                  ? 'bg-primary-600 text-white'
                                  : isTodayDay
                                    ? 'bg-primary-200 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                        {/* Days from next month to fill grid */}
                        {(() => {
                          const totalCells = getFirstDayOfMonth(calendarDate) + getDaysInMonth(calendarDate);
                          const remainingCells = 42 - totalCells;
                          return Array.from({ length: remainingCells }, (_, i) => i + 1).map((day) => (
                            <div
                              key={`next-${day}`}
                              className="aspect-square text-sm text-gray-400 dark:text-gray-600"
                            >
                              {day}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Calendar Footer */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleClearDate}
                        className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleToday}
                        className="px-4 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isReadOnly}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            />
          </div>

          {formData.type === 'DROP' && !isDrop && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link to Collection (Optional)
              </label>
              <CustomSelect
                value={formData.collectionId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, collectionId: value ? parseInt(value) : undefined })}
                options={collections.map((collection: any) => ({
                  value: collection.id.toString(),
                  label: collection.name || collection.drop || `Collection ${collection.id}`,
                }))}
                placeholder="Select collection (optional)"
              />
            </div>
          )}

          {isReadOnly && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                This is a drop event linked to a collection. To modify it, please edit the collection instead.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                {event?.id ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
