import type { ReactNode } from 'react'

/** Minimal centered card used by the standalone auth pages. */
export function AuthCardShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <div className="w-full max-w-[26rem]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-600 text-base font-bold text-white shadow-panel">
            GE
          </span>
          <div className="leading-tight">
            <p className="text-lg font-semibold text-slate-900">
              GrowthifyEdge <span className="text-accent-600">HRMS</span>
            </p>
            <p className="text-xs font-medium tracking-wide text-slate-500">
              Employee Management Platform
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-panel sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
