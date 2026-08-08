import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { usePayrollRuns } from '../../hooks/usePayroll'
import { formatPeriod, isCurrentOrPastPeriod } from '../../lib/payroll'
import { cn } from '../../lib/utils'
import { RunsTab } from './RunsTab'
import { EntriesTab } from './EntriesTab'
import { CreateRunDrawer } from './CreateRunDrawer'

const TABS = [
  { key: 'runs', label: 'Payroll Runs' },
  { key: 'entries', label: 'Employee Payroll' },
]

export function PayrollPage() {
  const [tab, setTab] = useState('runs')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const runs = usePayrollRuns()

  // The most recent non-future run drives the top cards ("Current Payroll").
  const currentRun = (runs.data ?? []).find((r) => isCurrentOrPastPeriod(r.period_month)) ?? null
  const effectiveRunId = selectedRunId ?? currentRun?.id ?? null

  const stats = useMemo(
    () => ({
      period: currentRun ? formatPeriod(currentRun.period_month) : '—',
      employees: currentRun?.employee_count ?? 0,
      gross: currentRun?.total_gross ?? 0,
      net: currentRun?.total_net ?? 0,
    }),
    [currentRun],
  )

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Payroll overview — amounts stored in USD, converted for display"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden /> New Payroll Run
          </Button>
        }
      />

      {/* Summary cards (latest run) */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Current Payroll" loading={runs.isPending} value={stats.period} tone="text-slate-900" />
        <StatCard label="Employees" loading={runs.isPending} value={stats.employees} tone="text-accent-600" />
        <StatCard
          label="Gross Payroll"
          loading={runs.isPending}
          value={<MoneyDisplay amountUsd={stats.gross} compact />}
          tone="text-slate-900"
        />
        <StatCard
          label="Net Payroll"
          loading={runs.isPending}
          value={<MoneyDisplay amountUsd={stats.net} compact />}
          tone="text-emerald-600"
        />
      </div>

      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'runs' && (
        <RunsTab
          onOpenEntries={(runId) => {
            setSelectedRunId(runId)
            setTab('entries')
          }}
        />
      )}
      {tab === 'entries' && (
        <EntriesTab runId={effectiveRunId} onSelectRun={(id) => setSelectedRunId(id)} />
      )}

      <CreateRunDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string
  value: React.ReactNode
  tone: string
  loading?: boolean
}) {
  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-7 w-16" />
      ) : (
        <p className={cn('mt-0.5 truncate text-2xl font-semibold', tone)}>{value}</p>
      )}
    </Card>
  )
}
