import { Settings2 } from 'lucide-react'

/** Shown when required environment variables are missing — no silent fallback. */
export function EnvSetupScreen({ missing }: { missing: string[] }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-card">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
          <Settings2 className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-slate-900">Environment setup required</h1>
        <p className="mt-2 text-sm text-slate-600">
          GrowthifyEdge HRMS needs Supabase configuration before it can start. The following
          environment variables are missing:
        </p>
        <ul className="mt-3 space-y-1.5">
          {missing.map((name) => (
            <li key={name} className="rounded-md bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
              {name}
            </li>
          ))}
        </ul>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Copy <code className="rounded bg-slate-100 px-1 font-mono text-xs">.env.example</code> to{' '}
            <code className="rounded bg-slate-100 px-1 font-mono text-xs">.env</code></li>
          <li>Fill in the values from your Supabase project (Settings → API)</li>
          <li>Restart the development server</li>
        </ol>
        <p className="mt-4 text-xs text-slate-400">
          See docs/SUPABASE_SETUP.md for the complete setup guide.
        </p>
      </div>
    </div>
  )
}
