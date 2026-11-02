import { FolderKanban, LayoutDashboard, Settings, SlidersHorizontal, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Later phases add Tasks, Timer, Calendar, Invoices, Expenses, Reports.
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/masters', label: 'Masters', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function isActive(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}
