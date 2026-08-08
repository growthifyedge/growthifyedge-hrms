import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useCandidates, useJobOpenings } from '../../hooks/useRecruitment'
import { STAGE_LABELS, STAGE_ORDER, formatExperience } from '../../lib/recruitment'
import { formatDate } from '../../lib/format'
import { CandidateStageBadge } from './CandidateDrawer'
import type { CandidateStage, CandidateWithRelations } from '../../types/db'

const selectClass =
  'rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100'

const COLUMN_ACCENTS: Record<CandidateStage, string> = {
  applied: 'border-t-slate-400',
  screening: 'border-t-accent-500',
  interview: 'border-t-violet-500',
  offer: 'border-t-amber-500',
  hired: 'border-t-emerald-500',
  rejected: 'border-t-red-400',
}

interface CandidatesTabProps {
  onOpenCandidate: (candidate: CandidateWithRelations) => void
}

/**
 * Pipeline board: six stage columns on desktop (horizontal scroll),
 * stage selector + cards on mobile. No drag-and-drop by design — stage
 * moves happen in the candidate drawer.
 */
export function CandidatesTab({ onOpenCandidate }: CandidatesTabProps) {
  const jobs = useJobOpenings()
  const candidates = useCandidates()

  const [jobFilter, setJobFilter] = useState('')
  const [search, setSearch] = useState('')
  const [mobileStage, setMobileStage] = useState<CandidateStage>('applied')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (candidates.data ?? []).filter((c) => {
      if (jobFilter && c.job_opening_id !== jobFilter) return false
      if (term) {
        const haystack = `${c.full_name} ${c.email} ${c.job?.title ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [candidates.data, jobFilter, search])

  const byStage = useMemo(() => {
    const map = new Map<CandidateStage, CandidateWithRelations[]>()
    for (const stage of STAGE_ORDER) map.set(stage, [])
    for (const c of filtered) map.get(c.stage)?.push(c)
    return map
  }, [filtered])

  const hasFilters = !!(jobFilter || search)

  if (candidates.isError) {
    return (
      <Card>
        <ErrorState onRetry={() => void candidates.refetch()} />
      </Card>
    )
  }

  return (
    <div>
      {/* Filter bar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            aria-label="Filter by job"
            className={selectClass}
          >
            <option value="">All jobs</option>
            {(jobs.data ?? []).map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          {/* Mobile-only stage selector (columns replace it on desktop) */}
          <select
            value={mobileStage}
            onChange={(e) => setMobileStage(e.target.value as CandidateStage)}
            aria-label="Select pipeline stage"
            className={`${selectClass} md:hidden`}
          >
            {STAGE_ORDER.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]} ({byStage.get(stage)?.length ?? 0})
              </option>
            ))}
          </select>
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidates…"
              aria-label="Search candidates"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setJobFilter(''); setSearch('') }}>
              <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      {candidates.isPending ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop pipeline board */}
          <div className="hidden overflow-x-auto pb-2 md:block">
            <div className="flex min-w-[1380px] gap-3">
              {STAGE_ORDER.map((stage) => {
                const rows = byStage.get(stage) ?? []
                return (
                  <div
                    key={stage}
                    className={`w-[225px] shrink-0 rounded-xl border border-t-4 border-slate-200 bg-slate-50 ${COLUMN_ACCENTS[stage]}`}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {STAGE_LABELS[stage]}
                      </h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                        {rows.length}
                      </span>
                    </div>
                    <div className="space-y-2 px-2 pb-2">
                      {rows.length === 0 ? (
                        <p className="px-2 py-6 text-center text-xs text-slate-400">No candidates</p>
                      ) : (
                        rows.map((c) => (
                          <CandidateCard key={c.id} candidate={c} onOpen={() => onOpenCandidate(c)} />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile: selected stage cards */}
          <div className="md:hidden">
            {(byStage.get(mobileStage) ?? []).length === 0 ? (
              <Card>
                <EmptyState title={`No candidates in ${STAGE_LABELS[mobileStage]}`} />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(byStage.get(mobileStage) ?? []).map((c) => (
                  <CandidateCard key={c.id} candidate={c} onOpen={() => onOpenCandidate(c)} showStage />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function CandidateCard({
  candidate,
  onOpen,
  showStage,
}: {
  candidate: CandidateWithRelations
  onOpen: () => void
  showStage?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-card transition-shadow hover:shadow-panel"
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={candidate.full_name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{candidate.full_name}</p>
          <p className="truncate text-xs text-slate-500">{candidate.job?.title ?? '—'}</p>
        </div>
        {showStage && <CandidateStageBadge stage={candidate.stage} />}
      </div>
      <dl className="mt-2.5 space-y-0.5 text-xs text-slate-500">
        <div className="flex justify-between gap-2">
          <dt className="truncate">{candidate.email}</dt>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{candidate.location_text ?? '—'}</dt>
          <dd className="shrink-0 font-medium text-slate-600">{formatExperience(candidate.experience_years)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>{candidate.source}</dt>
          <dd className="shrink-0">{formatDate(candidate.application_date)}</dd>
        </div>
      </dl>
    </button>
  )
}
