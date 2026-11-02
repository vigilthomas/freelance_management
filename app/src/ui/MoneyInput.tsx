import { useEffect, useState } from 'react';
import { fromMinor, toMinor } from '../lib/money';
import { cn } from './cn';
import { controlClass, Field } from './Field';

interface MoneyInputProps {
  label?: string;
  value: number | null;
  decimals: number;
  symbol?: string;
  onChange(minor: number | null): void;
  /** Error from the parent form (e.g. "Required"); local parse errors take precedence. */
  error?: string;
  hint?: string;
  className?: string;
}

/** Amount field that edits integer minor units. Empty, invalid and negative input all report null. */
export function MoneyInput({ label, value, decimals, symbol, onChange, error, hint, className }: MoneyInputProps) {
  const [text, setText] = useState(value === null ? '' : fromMinor(value, decimals));
  const [localError, setLocalError] = useState('');

  // Follow external value changes (e.g. currency defaults) without clobbering what the user is typing.
  useEffect(() => {
    const current = text.trim() === '' ? null : toMinor(text, decimals);
    if (current !== value) setText(value === null ? '' : fromMinor(value, decimals));
  }, [value, decimals]); // eslint-disable-line react-hooks/exhaustive-deps

  function handle(next: string) {
    setText(next);
    if (next.trim() === '') {
      setLocalError('');
      onChange(null);
      return;
    }
    const minor = toMinor(next, decimals);
    if (minor === null) {
      setLocalError(decimals ? 'Enter an amount like 1500 or 1,250.50' : 'Enter a whole amount like 1500');
      onChange(null);
    } else if (minor < 0) {
      setLocalError('Must be 0 or more');
      onChange(null);
    } else {
      setLocalError('');
      onChange(minor);
    }
  }

  const shown = localError || error;
  return (
    <Field label={label} error={shown} hint={hint} className={className}>
      {(id, describedBy) => (
        <div className="relative">
          {symbol && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.875rem] text-muted">{symbol}</span>}
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={!!shown}
            aria-describedby={describedBy}
            value={text}
            onChange={(e) => handle(e.target.value)}
            onBlur={() => value !== null && !localError && setText(fromMinor(value, decimals))}
            className={cn(controlClass(shown), 'tabular h-11', symbol && 'pl-8')}
          />
        </div>
      )}
    </Field>
  );
}
