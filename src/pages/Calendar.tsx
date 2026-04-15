import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, ChevronLeft, ChevronRight, X, User, Package, DollarSign } from 'lucide-react';
import { SkeletonPage } from '../components/Skeleton';
import Breadcrumb from '../components/Breadcrumb';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'event';
  location?: string;
  description?: string;
}

export default function Calendar() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDateString, setSelectedDateString] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  // Fetch orders to use as calendar events
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'calendar'],
    queryFn: async () => {
      const response = await api.get('/orders?skip=0&take=10000');
      return response.data?.data || [];
    },
  });

  // Store full order data for modal
  const ordersMap = useMemo(() => {
    if (!ordersData) return new Map();
    return new Map(ordersData.map((order: any) => [order.id, order]));
  }, [ordersData]);

  // Transform orders into calendar events
  const events: CalendarEvent[] = (ordersData || []).map((order: any) => {
    const orderDate = new Date(order.orderDate || order.createdAt);
    const requiredDate = order.requiredDate ? new Date(order.requiredDate) : null;
    
    // Use required date if available, otherwise use order date
    const eventDate = requiredDate || orderDate;
    const dateStr = eventDate.toISOString().split('T')[0];
    const timeStr = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    return {
      id: order.id,
      title: `Order ${order.orderNumber || `#${order.id}`}`,
      date: dateStr,
      time: timeStr,
      type: 'event',
      location: order.shippingAddress || undefined,
      description: `Order for ${order.customer?.name || 'Customer'} - Status: ${order.status}`,
    };
  });

  const handleDateClick = (dateString: string) => {
    const dayEvents = getEventsForDate(dateString);
    if (dayEvents.length > 0) {
      setSelectedDateString(dateString);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDateString(null);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDetailModalOpen(true);
    setShowAllItems(false); // Reset when opening a new event
  };

  const closeEventDetailModal = () => {
    setIsEventDetailModalOpen(false);
    setSelectedEvent(null);
    setShowAllItems(false);
  };

  const getEventsForDate = (date: string) => {
    return events.filter((event) => event.date === date);
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

    const days: Array<{ date: number; fullDate: string; isCurrentMonth: boolean }> = [];

    // Add previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonthLastDay - i;
      const fullDate = formatDate(new Date(year, month - 1, date));
      days.push({ date, fullDate, isCurrentMonth: false });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = formatDate(new Date(year, month, i));
      days.push({ date: i, fullDate, isCurrentMonth: true });
    }

    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const fullDate = formatDate(new Date(year, month + 1, i));
      days.push({ date: i, fullDate, isCurrentMonth: false });
    }

    return days;
  };

  const calendarDays = getCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Limit events to 10 for display in sidebar
  const displayedEvents = events.slice(0, 10);

  if (isLoading) {
    return <SkeletonPage />;
  }

  return (
    <div>
      <Breadcrumb currentPage="Calendar" />
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your events and meetings</p>
          </div>
          <button className="px-4 text-[14px] py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{getMonthName(selectedDate)}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayEvents = getEventsForDate(day.fullDate);
              const isToday = day.fullDate === today;
              const isSelected = false; // Can add selection logic here

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(day.fullDate)}
                  className={`min-h-24 p-1 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !day.isCurrentMonth ? 'opacity-30' : ''
                  } ${isToday ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700' : ''} ${
                    isSelected ? 'bg-primary-100 dark:bg-primary-900/30' : ''
                  } ${dayEvents.length > 0 ? 'hover:border-primary-400 dark:hover:border-primary-500' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day.date}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate ${
                          event.type === 'meeting'
                            ? 'bg-blue-500 text-white'
                            : 'bg-purple-500 text-white'
                        }`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">Upcoming Events</h3>
            {events.length > 10 && (
              <button
                onClick={() => navigate('/upcoming-events')}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                View All
              </button>
            )}
          </div>
          <div className="space-y-4 overflow-y-auto flex-1" style={{ maxHeight: '700px' }}>
            {displayedEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming events</p>
              </div>
            ) : (
              displayedEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border-2 border-purple-200 dark:border-purple-800">
                        <CalendarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{event.date} • {event.time}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{event.location}</span>
                        </div>
                      )}
                      <span className={`inline-block mt-2 px-2.5 py-1 text-xs font-medium rounded-full ${
                        event.type === 'meeting'
                          ? 'bg-blue-500 text-white'
                          : 'bg-purple-500 text-white'
                      }`}>
                        {event.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Date Events Modal */}
      {isModalOpen && selectedDateString && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Events for {new Date(selectedDateString).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {getEventsForDate(selectedDateString).length} {getEventsForDate(selectedDateString).length === 1 ? 'event' : 'events'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {getEventsForDate(selectedDateString).length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No events for this date</p>
                  </div>
                ) : (
                  getEventsForDate(selectedDateString).map((event) => {
                    const order = ordersMap.get(event.id);
                    return (
                      <div
                        key={event.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        {/* Collapsed Header - Always Visible */}
                        <button
                          onClick={() => handleEventClick(event)}
                          className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-start gap-4 text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border-2 border-purple-200 dark:border-purple-800 flex-shrink-0">
                            <CalendarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {event.title}
                              </h3>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                                event.type === 'meeting'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-purple-500 text-white'
                              }`}>
                                {event.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {event.time}
                                </span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{event.location}</span>
                                </div>
                              )}
                              {order?.customer?.name && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {order.customer.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Event Detail Modal */}
      {isEventDetailModalOpen && selectedEvent && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={closeEventDetailModal}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Event Details</h2>
                <button
                  onClick={closeEventDetailModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {(() => {
                  const order = ordersMap.get(selectedEvent.id);
                  if (!order) return null;

                  return (
                    <>
                      {/* Event Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border-2 border-purple-200 dark:border-purple-800">
                          <CalendarIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {selectedEvent.title}
                          </h3>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })} • {selectedEvent.time}
                              </span>
                            </div>
                            {selectedEvent.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          selectedEvent.type === 'meeting'
                            ? 'bg-blue-500 text-white'
                            : 'bg-purple-500 text-white'
                        }`}>
                          {selectedEvent.type}
                        </span>
                      </div>

                      {/* Order Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {order.customer?.name || 'N/A'}
                          </p>
                          {order.customer?.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{order.customer.email}</p>
                          )}
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {order.status || 'N/A'}
                          </p>
                        </div>

                        {order.totalAmount && (
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Amount</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {order.currency || '$'}{order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}

                        {order.orderDate && (
                          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order Date</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {new Date(order.orderDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {selectedEvent.description && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
                        </div>
                      )}

                      {/* Order Items */}
                      {order.orderLines && order.orderLines.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Order Items</h4>
                          <div className="space-y-2">
                            {(showAllItems ? order.orderLines : order.orderLines.slice(0, 5)).map((line: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {line.product?.name || `Item ${index + 1}`}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Quantity: {line.quantity || 'N/A'}
                                  </p>
                                </div>
                                {line.unitPrice && (
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {order.currency || '$'}{(line.unitPrice * (line.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                            ))}
                            {!showAllItems && order.orderLines.length > 5 && (
                              <button
                                onClick={() => setShowAllItems(true)}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-center pt-2 w-full font-medium transition-colors"
                              >
                                +{order.orderLines.length - 5} more items
                              </button>
                            )}
                            {showAllItems && order.orderLines.length > 5 && (
                              <button
                                onClick={() => setShowAllItems(false)}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-center pt-2 w-full font-medium transition-colors"
                              >
                                Show less
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

