import { useState, type FormEvent } from 'react'
import { Activity, BarChart3, KeyRound, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'

const DEMO_ACCOUNTS = [
  { role: 'HR Administrator', detail: 'Full workspace access', email: 'hr.admin@growthifyedge.com' },
  { role: 'Manager', detail: 'Team-scoped access', email: 'manager@growthifyedge.com' },
]

const VALUE_POINTS = [
  {
    icon: Users,
    title: 'Employee Management',
    detail: 'Directory, profiles, documents and org structure in one place.',
  },
  {
    icon: BarChart3,
    title: 'Workforce Insights',
    detail: 'Executive KPIs, payroll estimates and headcount analytics.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    detail: 'Row-level security scopes every record to the right people.',
  },
]

function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-600 text-base font-bold text-white shadow-panel">
        GE
      </span>
      <div className="leading-tight">
        <p className={`text-lg font-semibold ${dark ? 'text-slate-900' : 'text-white'}`}>
          GrowthifyEdge <span className="text-accent-500">HRMS</span>
        </p>
        <p className={`text-xs font-medium tracking-wide ${dark ? 'text-slate-500' : 'text-navy-300'}`}>
          Employee Management Platform
        </p>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand / hero panel */}
      <div className="relative hidden w-[52%] flex-col justify-between overflow-hidden bg-navy-900 p-10 lg:flex xl:p-14">
        {/* Subtle decorative glow — pure CSS, no assets */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-24 h-96 w-96 rounded-full bg-accent-500/[0.07] blur-3xl"
        />

        <BrandMark />

        <div className="relative max-w-lg">
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-white">
            Manage your people.
            <br />
            <span className="text-accent-200">Understand your workforce.</span>
          </h1>

          <ul className="mt-8 space-y-4">
            {VALUE_POINTS.map((point) => {
              const Icon = point.icon
              return (
                <li key={point.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-800 ring-1 ring-white/10">
                    <Icon className="h-[18px] w-[18px] text-accent-200" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{point.title}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-navy-200">{point.detail}</p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Lightweight abstract KPI accents */}
          <div className="mt-9 flex gap-3">
            <div className="flex-1 rounded-xl bg-navy-800/70 p-3.5 ring-1 ring-white/10">
              <p className="text-[10px] font-medium uppercase tracking-wider text-navy-300">
                Total Employees
              </p>
              <p className="mt-0.5 text-xl font-semibold text-white">36</p>
              <div className="mt-2 flex gap-1" aria-hidden>
                <span className="h-1 w-8 rounded-full bg-accent-500" />
                <span className="h-1 w-5 rounded-full bg-accent-500/60" />
                <span className="h-1 w-3 rounded-full bg-accent-500/30" />
              </div>
            </div>
            <div className="flex-1 rounded-xl bg-navy-800/70 p-3.5 ring-1 ring-white/10">
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-navy-300">
                <Activity className="h-3 w-3 text-accent-200" aria-hidden /> Attendance
              </p>
              <p className="mt-0.5 text-xl font-semibold text-white">94.6%</p>
              <div className="mt-2 flex items-end gap-1" aria-hidden>
                {[5, 8, 6, 10, 7, 9, 8].map((h, i) => (
                  <span
                    key={i}
                    className="w-2 rounded-sm bg-accent-500/50"
                    style={{ height: `${h * 2.5}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-navy-300">
          © {new Date().getFullYear()} GrowthifyEdge · Premium HR software, built to showcase.
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex w-full items-center justify-center bg-slate-100 px-5 py-10 sm:px-10 lg:w-[48%]">
        <div className="w-full max-w-[26rem]">
          <div className="mb-7 lg:hidden">
            <BrandMark dark />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-panel sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your HRMS workspace.</p>
            <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4" noValidate>
              <TextField
                label="Work email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              <Button type="submit" loading={submitting} className="w-full py-2.5">
                Sign in
              </Button>
            </form>
          </div>

          {/* Demo access */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <KeyRound className="h-4 w-4 text-accent-600" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Demo access
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => setEmail(account.email)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-accent-50/50"
                  >
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{account.role}</span>
                      <span className="block text-xs text-slate-500">{account.detail}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-accent-700">{account.email}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] leading-relaxed text-slate-400">
              Tap a role to fill its email. The demo password is shared privately with reviewers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
