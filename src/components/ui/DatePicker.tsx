import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value?: string | Date | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function DatePicker({ 
  value, 
  onChange, 
  placeholder = 'Select date', 
  disabled = false,
  className = '' 
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Initialize current month based on value
  useEffect(() => {
    if (value) {
      const date = typeof value === 'string' ? new Date(value) : value;
      if (!isNaN(date.getTime())) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
  }, [value]);

  // Convert value to Date object
  const getDateValue = (): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  // Format date to YYYY-MM-DD for onChange
  const formatDateForOnChange = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get days in month
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Handle date selection
  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(formatDateForOnChange(selectedDate));
    setIsOpen(false);
  };

  // Check if date is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    const checkDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return (
      checkDate.getDate() === today.getDate() &&
      checkDate.getMonth() === today.getMonth() &&
      checkDate.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (day: number): boolean => {
    const selectedDate = getDateValue();
    if (!selectedDate) return false;
    const checkDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return (
      checkDate.getDate() === selectedDate.getDate() &&
      checkDate.getMonth() === selectedDate.getMonth() &&
      checkDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Check if date is in current month
  const isCurrentMonth = (day: number): boolean => {
    return day <= getDaysInMonth(currentMonth);
  };

  // Get month name
  const getMonthName = (): string => {
    return currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Clear date
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const selectedDate = getDateValue();
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: (number | null)[] = [];
  const inputRef = useRef<HTMLInputElement>(null);

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  // Calculate position based on available space and use fixed positioning in modals
  useEffect(() => {
    if (isOpen && inputRef.current && calendarRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;
      const calendarHeight = 320; // Approximate calendar height

      // Update calendar position
      if (spaceBelow < calendarHeight && spaceAbove > spaceBelow) {
        // Position above input
        calendarRef.current.style.top = 'auto';
        calendarRef.current.style.bottom = `${window.innerHeight - inputRect.top + 4}px`;
      } else {
        // Position below input
        calendarRef.current.style.bottom = 'auto';
        calendarRef.current.style.top = `${inputRect.bottom + 4}px`;
      }
      calendarRef.current.style.left = `${inputRect.left}px`;
      calendarRef.current.style.width = `${Math.max(inputRect.width, 320)}px`;
      calendarRef.current.style.maxWidth = '320px';
    }
  }, [isOpen, currentMonth]);

  return (
    <div ref={datePickerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={selectedDate ? formatDate(selectedDate) : ''}
          placeholder={placeholder}
          disabled={disabled}
          readOnly
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            disabled ? '' : 'hover:border-primary-400 dark:hover:border-primary-500'
          }`}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {selectedDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <span className="text-gray-400 dark:text-gray-500 text-sm">×</span>
            </button>
          )}
          <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
        </div>
      </div>

      {isOpen && !disabled && (
        <div 
          ref={calendarRef}
          className="fixed bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-[10000] p-4"
          style={{ 
            position: 'fixed',
            minWidth: '320px',
            maxWidth: '320px'
          }}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {getMonthName()}
            </h3>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Calendar Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`calendar-cell-${index}`} className="aspect-square" />;
              }

              const isSelectedDay = isSelected(day);
              const isTodayDay = isToday(day);
              const isCurrentMonthDay = isCurrentMonth(day);

              return (
                <button
                  key={`calendar-cell-${index}`}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={!isCurrentMonthDay}
                  className={`aspect-square flex items-center justify-center text-sm rounded transition-colors ${
                    isSelectedDay
                      ? 'bg-primary-600 text-white font-semibold'
                      : isTodayDay
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-semibold'
                      : isCurrentMonthDay
                      ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
