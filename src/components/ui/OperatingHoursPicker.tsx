import React from 'react';
import TimeRangePicker from './TimeRangePicker';

export interface OperatingHours {
  [key: string]: string; // e.g., { monday: '9:00 AM - 6:00 PM', tuesday: 'Closed', ... }
}

interface OperatingHoursPickerProps {
  value: OperatingHours;
  onChange: (hours: OperatingHours) => void;
}

// Helper functions to parse and format time
const parseOperatingHours = (hours: string | undefined) => {
  if (!hours || hours === 'Closed') {
    return { start: '', end: '', isClosed: true };
  }
  const match = hours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    const startHour = parseInt(match[1]);
    const startMin = match[2];
    const startPeriod = match[3].toUpperCase();
    const endHour = parseInt(match[4]);
    const endMin = match[5];
    const endPeriod = match[6].toUpperCase();
    
    // Convert to 24-hour format for time input
    let start24 = startHour;
    if (startPeriod === 'PM' && startHour !== 12) start24 += 12;
    if (startPeriod === 'AM' && startHour === 12) start24 = 0;
    
    let end24 = endHour;
    if (endPeriod === 'PM' && endHour !== 12) end24 += 12;
    if (endPeriod === 'AM' && endHour === 12) end24 = 0;
    
    return {
      start: `${String(start24).padStart(2, '0')}:${startMin}`,
      end: `${String(end24).padStart(2, '0')}:${endMin}`,
      isClosed: false,
    };
  }
  return { start: '', end: '', isClosed: false };
};

const formatTimeTo12Hour = (time24: string) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
};

export default function OperatingHoursPicker({ value, onChange }: OperatingHoursPickerProps) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Store last known times for each day when they get closed
  const [lastKnownTimes, setLastKnownTimes] = React.useState<{ [key: string]: { start: string; end: string } }>({});

  const updateTimeRange = (day: string, start: string, end: string, isClosed: boolean) => {
    const dayKey = day.toLowerCase();
    const updatedHours = { ...value };
    
    if (isClosed) {
      // Store the current times before closing (if they exist)
      if (start && end) {
        setLastKnownTimes(prev => ({
          ...prev,
          [dayKey]: { start, end }
        }));
      }
      updatedHours[dayKey] = 'Closed';
    } else {
      // When unchecking closed, restore stored times or use defaults
      const storedTimes = lastKnownTimes[dayKey];
      let startTime = start;
      let endTime = end;
      
      // If times are empty (because it was closed), use stored times or defaults
      if (!startTime || !endTime) {
        startTime = storedTimes?.start || '09:00';
        endTime = storedTimes?.end || '18:00';
      }
      
      // Store these times for future use
      if (startTime && endTime) {
        setLastKnownTimes(prev => ({
          ...prev,
          [dayKey]: { start: startTime, end: endTime }
        }));
      }
      
      const start12 = formatTimeTo12Hour(startTime);
      const end12 = formatTimeTo12Hour(endTime);
      updatedHours[dayKey] = `${start12} - ${end12}`;
    }
    
    onChange(updatedHours);
  };
  
  // Also update stored times when times change (not just when closing)
  const handleTimeChange = (day: string, start: string, end: string, isStart: boolean) => {
    const dayKey = day.toLowerCase();
    const hours = value?.[dayKey] || '';
    const current = parseOperatingHours(hours);
    
    if (isStart) {
      updateTimeRange(day, start, current.end || '18:00', false);
    } else {
      updateTimeRange(day, current.start || '09:00', end, false);
    }
  };

  const handleSetWeekdays = () => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const updatedHours = { ...value };
    weekdays.forEach((day) => {
      updatedHours[day] = '9:00 AM - 6:00 PM';
    });
    onChange(updatedHours);
  };

  const handleSetWeekendsClosed = () => {
    const weekends = ['saturday', 'sunday'];
    const updatedHours = { ...value };
    weekends.forEach((day) => {
      updatedHours[day] = 'Closed';
    });
    onChange(updatedHours);
  };

  const handleSetAllDays = () => {
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const updatedHours = { ...value };
    allDays.forEach((day) => {
      updatedHours[day] = '9:00 AM - 6:00 PM';
    });
    onChange(updatedHours);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Operating Hours
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSetWeekdays}
            className="px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Set Weekdays
          </button>
          <button
            type="button"
            onClick={handleSetWeekendsClosed}
            className="px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Set Weekends Closed
          </button>
          <button
            type="button"
            onClick={handleSetAllDays}
            className="px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            Set All Days
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {days.map((day) => {
          const dayKey = day.toLowerCase();
          const hours = value?.[dayKey] || '';
          const { start, end, isClosed } = parseOperatingHours(hours);
          
          return (
            <TimeRangePicker
              key={day}
              day={day}
              startTime={start}
              endTime={end}
              isClosed={isClosed}
              onStartTimeChange={(time) => handleTimeChange(day, time, end, true)}
              onEndTimeChange={(time) => handleTimeChange(day, start, time, false)}
              onClosedChange={(closed) => updateTimeRange(day, start, end, closed)}
            />
          );
        })}
      </div>
    </div>
  );
}

