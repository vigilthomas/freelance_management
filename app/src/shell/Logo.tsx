import { motion } from 'framer-motion';
import { APP_NAME } from '../config';
import { useRow } from '../data/hooks';
import { SETTINGS_ID, type Settings } from '../data/schema';
import { useBusinessLogo } from '../features/settings/logo';

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="var(--accent)" />
      <path d="M22 16h22v8H30v6h12v8H30v10h-8z" fill="#fff" />
    </svg>
  );
}

/** The business's own logo and name once set in Settings; the Forge mark until then. */
export function Logo({ collapsed }: { collapsed?: boolean }) {
  const settings = useRow<Settings>('settings', SETTINGS_ID);
  const logo = useBusinessLogo();
  const name = settings?.business_name?.trim() || APP_NAME;

  return (
    <span className="flex min-w-0 items-center gap-2.5" title={collapsed ? name : undefined}>
      {logo ? (
        <motion.img
          key={logo}
          src={logo}
          alt=""
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-9 w-9 shrink-0 rounded-[10px] border border-line bg-surface object-cover shadow-1"
        />
      ) : (
        <LogoMark />
      )}
      {!collapsed && (
        <span className="truncate font-display text-[1.25rem] font-extrabold leading-tight tracking-tight" aria-label={name}>
          {name}
        </span>
      )}
    </span>
  );
}
