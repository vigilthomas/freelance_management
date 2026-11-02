import { useRows } from '../../data/hooks';
import type { MasterKind, MasterRecord } from '../../data/schema';
import { Select } from '../../ui/Select';

interface MasterSelectProps {
  kind: MasterKind;
  value: string;
  onChange(id: string): void;
  label?: string;
  error?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/** Active values in sort order; the current value stays visible (marked inactive) after being deactivated. */
export function MasterSelect({ kind, value, onChange, label, error, placeholder, className, required }: MasterSelectProps) {
  const rows = useRows<MasterRecord>(kind, { includeDeleted: true, sortBy: 'sort_order' }) ?? [];
  const options = rows
    .filter((r) => (r.active && !r.deleted) || r.id === value)
    .map((r) => ({ value: r.id, label: r.active && !r.deleted ? r.name : `${r.name} (inactive)` }));
  return (
    <Select
      label={label}
      error={error}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
      required={required}
    />
  );
}

/** Looks up a master value's display name, including inactive values. */
export function useMasterMap(kind: MasterKind): Map<string, MasterRecord> {
  const rows = useRows<MasterRecord>(kind, { includeDeleted: true }) ?? [];
  return new Map(rows.map((r) => [r.id, r]));
}
