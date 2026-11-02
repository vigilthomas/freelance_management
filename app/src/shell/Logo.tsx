import { APP_NAME } from '../config';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="var(--accent)" />
      <path d="M22 16h22v8H30v6h12v8H30v10h-8z" fill="#fff" />
    </svg>
  );
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && <span className="font-display text-[1.375rem] font-extrabold tracking-tight">{APP_NAME}</span>}
    </span>
  );
}
