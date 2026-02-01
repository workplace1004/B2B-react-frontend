import { useState, useEffect } from 'react';
import PhoneInputWithCountry from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  error?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  error = false,
  className = '',
  placeholder = 'Enter phone number',
  disabled = false,
}: PhoneInputProps) {
  const [isValid, setIsValid] = useState<boolean>(true);

  useEffect(() => {
    if (value && value.trim()) {
      setIsValid(isValidPhoneNumber(value));
    } else {
      setIsValid(true);
    }
  }, [value]);

  const handleChange = (newValue: string | undefined) => {
    if (!newValue) {
      onChange(undefined);
      return;
    }

    // Remove all non-digit characters except + to count actual digits
    const digitsOnly = newValue.replace(/[^\d+]/g, '');
    
    // Maximum length for international phone numbers (E.164 standard: max 15 digits)
    // Format: +[country code][number] - max 15 digits total after +
    // Maximum is + sign + 15 digits = 16 characters
    if (digitsOnly.length > 16) {
      // Don't update if it exceeds max length - prevents typing beyond limit
      return;
    }

    onChange(newValue);
  };

  return (
    <div className={`phone-input-wrapper ${className}`}>
      <PhoneInputWithCountry
        international
        defaultCountry="US"
        value={value || undefined}
        onChange={handleChange}
        onCountryChange={(_country?: Country) => {
          // Handle country change if needed in the future
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={`phone-input ${error || (value && !isValid) ? 'phone-input-error' : ''}`}
        numberInputProps={{
          className: 'phone-input-number',
        }}
      />
    </div>
  );
}

