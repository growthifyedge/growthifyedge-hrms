import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar } from '../ui/Avatar'
import { CurrencySelector } from '../ui/CurrencySelector'
import { GlobalSearch } from './GlobalSearch'

const ROLE_LABELS: Record<string, string> = {
  hr_admin: 'HR Administrator',
  manager: 'Manager',
  employee: 'Employee',
}

function UserMenu() {
  const { profile, employee, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!profile) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-lg p-1 pr-1.5 hover:bg-slate-100"
      >
        <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-800">{profile.full_name}</p>
            <p className="truncate text-xs text-slate-500">{profile.email}</p>
            <p className="mt-1 inline-block rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </p>
          </div>
          {employee && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigate(`/people/${employee.id}`)
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <User className="h-4 w-4 text-slate-400" aria-hidden /> My profile
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" aria-hidden /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function Header({ title, onOpenNav }: { title: string; onOpenNav: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">{title}</h1>
        <GlobalSearch />
        <CurrencySelector compact />
        <button
          type="button"
          aria-label="Notifications (coming soon)"
          title="Notifications — coming soon"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
