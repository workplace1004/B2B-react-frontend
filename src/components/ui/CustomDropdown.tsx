import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export default function CustomDropdown({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  label,
  className = '',
  error = false,
  disabled = false
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex items-center justify-between gap-2 px-4 py-2 border border-primary-500 dark:border-primary-400 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[140px] w-full ${
            error ? 'border-red-500' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="text-sm">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div 
            className="custom-dropdown-menu absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden hide-scrollbar" 
            style={{ zIndex: 10001, maxHeight: '180px', overflowY: 'auto' }}
          >
            {options.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options available
              </div>
            ) : (
              options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors duration-150 ${
                    index === 0 ? 'rounded-t-lg' : ''
                  } ${
                    index === options.length - 1 ? 'rounded-b-lg' : ''
                  } ${
                    option.value === value
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

