import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'

const DEMO_ACCOUNTS = [
  { role: 'HR Administrator', email: 'hr.admin@demo.growthifyedge.com' },
  { role: 'Manager', email: 'manager@demo.growthifyedge.com' },
]

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
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-navy-900 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-600 text-base font-bold text-white">
            GE
          </span>
          <div className="leading-tight">
            <p className="font-semibold text-white">GrowthifyEdge</p>
            <p className="text-xs text-navy-300">HRMS Platform</p>
          </div>
        </div>
        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-snug text-white">
            The complete workspace for your workforce.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-navy-200">
            People, departments, compensation and documents — managed in one calm, executive view.
          </p>
        </div>
        <p className="text-xs text-navy-300">© {new Date().getFullYear()} GrowthifyEdge</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-slate-100 p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-sm font-bold text-white">
              GE
            </span>
            <h1 className="text-lg font-semibold text-slate-900">GrowthifyEdge HRMS</h1>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
            <p className="mt-0.5 text-sm text-slate-500">Welcome back — enter your credentials.</p>
            <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-4" noValidate>
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
              <Button type="submit" loading={submitting} className="w-full">
                Sign in
              </Button>
            </form>
          </div>

          <div className="mt-4 rounded-xl border border-accent-100 bg-accent-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-700">
              <KeyRound className="h-3.5 w-3.5" aria-hidden /> Demo access
            </p>
            <ul className="mt-2 space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.email} className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">{acc.role}:</span>{' '}
                  <button
                    type="button"
                    className="font-mono text-accent-700 underline-offset-2 hover:underline"
                    onClick={() => setEmail(acc.email)}
                  >
                    {acc.email}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              The demo password is shared during onboarding of this showcase environment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
