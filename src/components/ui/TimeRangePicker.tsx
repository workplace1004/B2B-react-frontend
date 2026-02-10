import TimePicker from './TimePicker';

interface TimeRangePickerProps {
  day: string;
  startTime: string;
  endTime: string;
  isClosed: boolean;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onClosedChange: (closed: boolean) => void;
}

export default function TimeRangePicker({
  day,
  startTime,
  endTime,
  isClosed,
  onStartTimeChange,
  onEndTimeChange,
  onClosedChange,
}: TimeRangePickerProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="w-24 flex-shrink-0">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {day}
        </label>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
            Start Time
          </label>
          <TimePicker
            value={startTime}
            onChange={onStartTimeChange}
            disabled={isClosed}
            placeholder="Select start time"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
            End Time
          </label>
          <TimePicker
            value={endTime}
            onChange={onEndTimeChange}
            disabled={isClosed}
            placeholder="Select end time"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-[100px]">
        <input
          type="checkbox"
          id={`closed-${day}`}
          checked={isClosed}
          onChange={(e) => onClosedChange(e.target.checked)}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
        />
        <label
          htmlFor={`closed-${day}`}
          className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none"
        >
          Closed
        </label>
      </div>
    </div>
  );
}

