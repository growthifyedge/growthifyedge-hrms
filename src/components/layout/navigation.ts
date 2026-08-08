import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Briefcase,
  Target,
  Wallet,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../../types/db'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** Wave 1 destinations are enabled; future modules render a Coming Soon badge. */
  enabled: boolean
  /** Roles allowed to see this item. */
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, enabled: true, roles: ['hr_admin', 'manager', 'employee'] },
  { label: 'People', path: '/people', icon: Users, enabled: true, roles: ['hr_admin', 'manager'] },
  { label: 'Time & Leave', path: '/time-leave', icon: CalendarClock, enabled: true, roles: ['hr_admin', 'manager', 'employee'] },
  { label: 'Recruitment', path: '/recruitment', icon: Briefcase, enabled: true, roles: ['hr_admin', 'manager'] },
  { label: 'Performance', path: '/performance', icon: Target, enabled: true, roles: ['hr_admin', 'manager'] },
  { label: 'Payroll', path: '/payroll', icon: Wallet, enabled: true, roles: ['hr_admin'] },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, enabled: false, roles: ['hr_admin'] },
  { label: 'Settings', path: '/settings', icon: Settings, enabled: true, roles: ['hr_admin'] },
]

export function navItemsForRole(role: Role | null | undefined): NavItem[] {
  if (!role) return []
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
