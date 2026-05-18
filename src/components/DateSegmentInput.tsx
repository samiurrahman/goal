'use client';

import React, { useMemo } from 'react';
import DatePicker from 'react-datepicker';

export interface DateSegmentInputProps {
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  ariaLabel?: string;
  yearRange?: number;
  invalid?: boolean;
}

const isoRegex = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoToDate(value?: string): Date | null {
  if (!value || typeof value !== 'string') return null;
  const m = isoRegex.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dateToIso(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DateSegmentInput: React.FC<DateSegmentInputProps> = ({
  name = '',
  value,
  onChange,
  className = '',
  disabled,
  id,
  min,
  max,
  placeholder = 'DD/MM/YYYY',
  ariaLabel,
  yearRange = 100,
  invalid = false,
}) => {
  const selected = useMemo(() => parseIsoToDate(value), [value]);
  const minDate = useMemo(() => parseIsoToDate(min), [min]);
  const maxDate = useMemo(() => parseIsoToDate(max), [max]);

  const emit = (d: Date | null) => {
    if (!onChange) return;
    const iso = dateToIso(d);
    const synthetic = {
      target: { name, value: iso },
      currentTarget: { name, value: iso },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(synthetic);
  };

  return (
    <div className={`rich-date-field relative ${className}`}>
      <DatePicker
        id={id}
        name={name}
        selected={selected}
        onChange={emit}
        dateFormat={['dd/MM/yyyy', 'd/M/yyyy', 'ddMMyyyy', 'dd-MM-yyyy']}
        placeholderText={placeholder}
        autoComplete="off"
        disabled={disabled}
        minDate={minDate || undefined}
        maxDate={maxDate || undefined}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        yearDropdownItemNumber={yearRange}
        scrollableYearDropdown
        showPopperArrow={false}
        popperPlacement="bottom-start"
        popperClassName="rich-date-popper"
        portalId="rich-date-portal"
        className={`block w-full border focus:outline-none bg-white dark:bg-neutral-900 rounded-2xl text-sm font-normal h-11 pl-4 pr-10 py-3 ${
          invalid
            ? 'border-red-500 focus:border-red-500'
            : 'border-neutral-400 dark:border-neutral-600 focus:border-primary-500'
        }`}
        aria-label={ariaLabel}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    </div>
  );
};

export default DateSegmentInput;
