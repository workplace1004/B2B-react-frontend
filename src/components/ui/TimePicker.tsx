import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string; // Format: "HH:MM" (24-hour)
  onChange: (time: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function TimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select time',
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate time options (every 15 minutes)
  const generateTimeOptions = () => {
    const options: Array<{ time24: string; time12: string; hour: number; period: string }> = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const time12 = `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
        options.push({ time24, time12, hour, period });
      }
    }
    return options;
  };

  const allTimeOptions = generateTimeOptions();

  // Filter options based on search query
  const filteredOptions = searchQuery
    ? allTimeOptions.filter((option) =>
        option.time12.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTimeOptions;

  // Group by AM/PM for better organization
  const amOptions = filteredOptions.filter((opt) => opt.period === 'AM');
  const pmOptions = filteredOptions.filter((opt) => opt.period === 'PM');

  const formatTimeForDisplay = (time24: string) => {
    if (!time24) return placeholder;
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  const handleTimeSelect = (time24: string) => {
    onChange(time24);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed flex items-center justify-between transition-colors ${
          disabled
            ? 'text-gray-400 dark:text-gray-500'
            : 'text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="truncate">{formatTimeForDisplay(value)}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search time..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>

          {/* Time options */}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No times found
              </div>
            ) : (
              <div className="p-2">
                {!searchQuery && (
                  <>
                    {/* AM Section */}
                    {amOptions.length > 0 && (
                      <div className="mb-2">
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          AM
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {amOptions.map((option) => {
                            const isSelected = value === option.time24;
                            return (
                              <button
                                key={option.time24}
                                type="button"
                                onClick={() => handleTimeSelect(option.time24)}
                                className={`px-3 py-2 text-sm text-center rounded-md transition-colors ${
                                  isSelected
                                    ? 'bg-primary-600 text-white font-medium shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {option.time12.replace(' AM', '')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PM Section */}
                    {pmOptions.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          PM
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {pmOptions.map((option) => {
                            const isSelected = value === option.time24;
                            return (
                              <button
                                key={option.time24}
                                type="button"
                                onClick={() => handleTimeSelect(option.time24)}
                                className={`px-3 py-2 text-sm text-center rounded-md transition-colors ${
                                  isSelected
                                    ? 'bg-primary-600 text-white font-medium shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {option.time12.replace(' PM', '')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Search results */}
                {searchQuery && (
                  <div className="grid grid-cols-3 gap-1">
                    {filteredOptions.map((option) => {
                      const isSelected = value === option.time24;
                      return (
                        <button
                          key={option.time24}
                          type="button"
                          onClick={() => handleTimeSelect(option.time24)}
                          className={`px-3 py-2 text-sm text-center rounded-md transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white font-medium shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {option.time12}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

