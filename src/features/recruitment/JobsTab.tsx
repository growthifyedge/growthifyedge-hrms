import { useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/StatusBadge'
import { Skeleton, TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useAuth } from '../../contexts/AuthContext'
import { useCandidates, useJobOpenings } from '../../hooks/useRecruitment'
import { JOB_EMPLOYMENT_TYPE_LABELS, JOB_STATUS_LABELS } from '../../lib/recruitment'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { JobOpeningWithRelations, JobStatus } from '../../types/db'

const JOB_STATUS_TONES: Record<JobStatus, 'slate' | 'green' | 'red'> = {
  draft: 'slate',
  open: 'green',
  closed: 'red',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={JOB_STATUS_TONES[status] ?? 'slate'} label={JOB_STATUS_LABELS[status] ?? status} />
}

interface JobsTabProps {
  onEdit: (job: JobOpeningWithRelations) => void
}

export function JobsTab({ onEdit }: JobsTabProps) {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const jobs = useJobOpenings()
  const candidates = useCandidates()

  const candidateCountByJob = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of candidates.data ?? []) {
      map.set(c.job_opening_id, (map.get(c.job_opening_id) ?? 0) + 1)
    }
    return map
  }, [candidates.data])

  const stats = useMemo(() => {
    const openJobs = (jobs.data ?? []).filter((j) => j.status === 'open')
    const rows = candidates.data ?? []
    return {
      openPositions: openJobs.reduce((sum, j) => sum + j.openings_count, 0),
      totalCandidates: rows.length,
      interviews: rows.filter((c) => c.stage === 'interview').length,
      offers: rows.filter((c) => c.stage === 'offer').length,
    }
  }, [jobs.data, candidates.data])

  const loading = jobs.isPending || candidates.isPending

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Open Positions" value={stats.openPositions} tone="text-slate-900" loading={loading} />
        <StatCard label="Total Candidates" value={stats.totalCandidates} tone="text-accent-600" loading={loading} />
        <StatCard label="Interviews" value={stats.interviews} tone="text-violet-600" loading={loading} />
        <StatCard label="Offers" value={stats.offers} tone="text-amber-600" loading={loading} />
      </div>

      <Card className="mt-4">
        {jobs.isPending ? (
          <TableSkeleton rows={6} />
        ) : jobs.isError ? (
          <ErrorState onRetry={() => void jobs.refetch()} />
        ) : (jobs.data?.length ?? 0) === 0 ? (
          <EmptyState title="No job openings yet" message={isAdmin ? 'Create your first job opening to start recruiting.' : undefined} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Job Title</th>
                    <th scope="col" className="px-4 py-3 font-medium">Department</th>
                    <th scope="col" className="px-4 py-3 font-medium">Location</th>
                    <th scope="col" className="px-4 py-3 font-medium">Type</th>
                    <th scope="col" className="px-4 py-3 font-medium">Openings</th>
                    <th scope="col" className="px-4 py-3 font-medium">Candidates</th>
                    <th scope="col" className="px-4 py-3 font-medium">Hiring Manager</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Posted</th>
                    {isAdmin && <th scope="col" className="px-4 py-3 font-medium">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {(jobs.data ?? []).map((job) => (
                    <tr key={job.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{job.title}</td>
                      <td className="px-4 py-2.5 text-slate-600">{job.department?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{job.location?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{JOB_EMPLOYMENT_TYPE_LABELS[job.employment_type]}</td>
                      <td className="px-4 py-2.5 text-slate-600">{job.openings_count}</td>
                      <td className="px-4 py-2.5 text-slate-600">{candidateCountByJob.get(job.id) ?? 0}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {job.hiring_manager ? `${job.hiring_manager.first_name} ${job.hiring_manager.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5"><JobStatusBadge status={job.status} /></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(job.posted_at)}</td>
                      {isAdmin && (
                        <td className="px-4 py-2.5">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(job)} aria-label={`Edit job ${job.title}`}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 md:hidden">
              {(jobs.data ?? []).map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{job.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {job.department?.name ?? '—'} · {job.location?.name ?? '—'}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-slate-500">
                    <MobileRow label="Type" value={JOB_EMPLOYMENT_TYPE_LABELS[job.employment_type]} />
                    <MobileRow label="Openings" value={String(job.openings_count)} />
                    <MobileRow label="Candidates" value={String(candidateCountByJob.get(job.id) ?? 0)} />
                    <MobileRow
                      label="Hiring manager"
                      value={job.hiring_manager ? `${job.hiring_manager.first_name} ${job.hiring_manager.last_name}` : '—'}
                    />
                    <MobileRow label="Posted" value={formatDate(job.posted_at)} />
                  </dl>
                  {isAdmin && (
                    <div className="mt-3 flex justify-end">
                      <Button variant="secondary" size="sm" onClick={() => onEdit(job)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

export function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string
  value: string | number
  tone: string
  loading?: boolean
}) {
  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-7 w-12" />
      ) : (
        <p className={cn('mt-0.5 text-2xl font-semibold', tone)}>{value}</p>
      )}
    </Card>
  )
}

export function MobileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="shrink-0">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{value}</dd>
    </div>
  )
}
