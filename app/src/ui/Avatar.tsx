import { cn } from './cn';
import { SWATCHES } from './misc';

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name, color, size = 44, className }: { name: string; color?: string; size?: number; className?: string }) {
  const c = color || SWATCHES[hash(name) % (SWATCHES.length - 1)];
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-md font-display font-extrabold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 70%, #000))` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
