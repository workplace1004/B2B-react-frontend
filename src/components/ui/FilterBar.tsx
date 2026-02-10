import { Filter } from 'lucide-react';
import CustomDropdown from './CustomDropdown';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  filters: Array<{
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
    className?: string;
  }>;
  className?: string;
}

export default function FilterBar({ filters, className = '' }: FilterBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Filter className="w-5 h-5 text-gray-400" />
      {filters.map((filter, index) => (
        <div key={index} className={filter.className || 'min-w-[240px]'}>
          <CustomDropdown
            value={filter.value}
            onChange={filter.onChange}
            options={filter.options}
            placeholder={filter.placeholder}
          />
        </div>
      ))}
    </div>
  );
}





