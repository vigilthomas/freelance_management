import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';
import { controlClass, Field } from './Field';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className, ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      {(id, describedBy) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(controlClass(error), 'h-11')}
          {...rest}
        />
      )}
    </Field>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, rows = 3, ...rest }: TextareaProps) {
  return (
    <Field label={label} error={error} className={className}>
      {(id, describedBy) => (
        <textarea
          id={id}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(controlClass(error), 'resize-y py-2.5')}
          {...rest}
        />
      )}
    </Field>
  );
}
