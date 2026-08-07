import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface TabDef {
  key: string
  label: string
  badge?: ReactNode
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          type="button"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            active === tab.key
              ? 'border-accent-600 text-accent-700'
              : 'border-transparent text-slate-500 hover:text-slate-700',
          )}
        >
          {tab.label}
          {tab.badge}
        </button>
      ))}
    </div>
  )
}
