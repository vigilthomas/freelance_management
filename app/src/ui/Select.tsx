import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';
import { controlClass, Field } from './Field';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange(value: string): void;
}

/** Native select (best on mobile) styled to the system. */
export function Select({ label, error, options, placeholder, className, value, onChange, ...rest }: SelectProps) {
  return (
    <Field label={label} error={error} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          <select
            id={id}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(controlClass(error), 'h-11 appearance-none pr-10')}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            {...rest}
          >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      )}
    </Field>
  );
}
