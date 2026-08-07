import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { navItemsForRole } from './navigation'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'

const ROLE_LABELS: Record<string, string> = {
  hr_admin: 'HR Administrator',
  manager: 'Manager',
  employee: 'Employee',
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-sm font-bold text-white">
        GE
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">GrowthifyEdge</p>
        <p className="text-[11px] font-medium tracking-wide text-navy-300">HRMS Platform</p>
      </div>
    </div>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth()
  const items = navItemsForRole(profile?.role)

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon
        if (!item.enabled) {
          return (
            <span
              key={item.path}
              aria-disabled="true"
              title={`${item.label} — coming soon`}
              className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-300/70"
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              <span className="rounded-full bg-navy-700 px-1.5 py-0.5 text-[10px] font-medium text-navy-200">
                Soon
              </span>
            </span>
          )
        }
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-600 text-white'
                  : 'text-navy-200 hover:bg-navy-800 hover:text-white',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

function AccountFooter() {
  const { profile } = useAuth()
  if (!profile) return null
  return (
    <div className="border-t border-navy-800 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
          <p className="truncate text-[11px] text-navy-300">{ROLE_LABELS[profile.role] ?? profile.role}</p>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 lg:flex" aria-label="Sidebar">
      <Wordmark />
      <NavList />
      <AccountFooter />
    </aside>
  )
}

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className="absolute inset-0 bg-navy-950/50" onClick={onClose} aria-hidden />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-navy-900 shadow-panel">
        <div className="flex items-center justify-between pr-3">
          <Wordmark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-navy-200 hover:bg-navy-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <AccountFooter />
      </div>
    </div>
  )
}
