import { useEffect, useState } from 'react'
import { format as formatDateFns, parseISO } from 'date-fns'
import { UserRoundCheck } from 'lucide-react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/StatusBadge'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { SelectField, TextAreaField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useManagerOptions } from '../../hooks/useLookups'
import { useUpdateCandidate } from '../../hooks/useRecruitment'
import { STAGE_LABELS, formatExperience, nextStageOptions } from '../../lib/recruitment'
import { formatDate } from '../../lib/format'
import type { Candidate, CandidateStage, CandidateWithRelations } from '../../types/db'

export const STAGE_TONES: Record<CandidateStage, 'slate' | 'blue' | 'violet' | 'amber' | 'green' | 'red'> = {
  applied: 'slate',
  screening: 'blue',
  interview: 'violet',
  offer: 'amber',
  hired: 'green',
  rejected: 'red',
}

export function CandidateStageBadge({ stage }: { stage: CandidateStage }) {
  return <Badge tone={STAGE_TONES[stage] ?? 'slate'} label={STAGE_LABELS[stage] ?? stage} />
}

interface CandidateDrawerProps {
  candidate: CandidateWithRelations | null
  onClose: () => void
  /** Admin-only actions (stage moves, hire). */
  canManage: boolean
  onHire: (candidate: CandidateWithRelations) => void
}

/** Candidate detail + stage movement (with interview/offer capture). */
export function CandidateDrawer({ candidate, onClose, canManage, onHire }: CandidateDrawerProps) {
  const { toast } = useToast()
  const employees = useManagerOptions()
  const update = useUpdateCandidate()

  const [targetStage, setTargetStage] = useState('')
  const [interviewAt, setInterviewAt] = useState('')
  const [interviewerId, setInterviewerId] = useState('')
  const [interviewNote, setInterviewNote] = useState('')
  const [proposedSalary, setProposedSalary] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setTargetStage('')
    setInterviewAt('')
    setInterviewerId('')
    setInterviewNote('')
    setProposedSalary('')
    setFieldErrors({})
  }, [candidate?.id])

  if (!candidate) return null
  const options = nextStageOptions(candidate.stage)

  async function moveStage() {
    if (!candidate || !targetStage) return
    const errors: Record<string, string> = {}
    const patch: Partial<Candidate> = { stage: targetStage as CandidateStage }

    if (targetStage === 'interview') {
      if (!interviewAt) errors.interviewAt = 'Interview date/time is required'
      if (!interviewerId) errors.interviewerId = 'Select an interviewer'
      if (Object.keys(errors).length === 0) {
        patch.interview_at = new Date(interviewAt).toISOString()
        patch.interviewer_employee_id = interviewerId
        patch.interview_note = interviewNote.trim() || null
      }
    }
    if (targetStage === 'offer' && proposedSalary) {
      const amount = Number(proposedSalary)
      if (Number.isNaN(amount) || amount < 0) errors.proposedSalary = 'Enter a valid amount'
      else patch.proposed_salary = amount
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      await update.mutateAsync({ candidateId: candidate.id, patch })
      toast('success', `Moved to ${STAGE_LABELS[targetStage as CandidateStage]}.`)
      onClose()
    } catch {
      toast('error', 'Could not update the candidate. Please try again.')
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={candidate.full_name}
      subtitle={`${candidate.job?.title ?? 'Unknown role'} · Applied ${formatDate(candidate.application_date)}`}
      footer={
        canManage && candidate.stage === 'offer' ? (
          <div className="flex justify-end">
            <Button onClick={() => onHire(candidate)}>
              <UserRoundCheck className="h-4 w-4" aria-hidden /> Hire Candidate
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Candidate</h3>
          <dl className="divide-y divide-slate-100 text-sm">
            <Row label="Email" value={candidate.email} />
            <Row label="Phone" value={candidate.phone ?? '—'} />
            <Row label="Location" value={candidate.location_text ?? '—'} />
            <Row label="Experience" value={formatExperience(candidate.experience_years)} />
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Application</h3>
          <dl className="divide-y divide-slate-100 text-sm">
            <Row label="Job" value={candidate.job?.title ?? '—'} />
            <Row label="Current stage" value={<CandidateStageBadge stage={candidate.stage} />} />
            <Row label="Source" value={candidate.source} />
            <Row label="Applied" value={formatDate(candidate.application_date)} />
            <Row
              label="Expected salary"
              value={
                candidate.expected_salary !== null ? (
                  <span><MoneyDisplay amountUsd={candidate.expected_salary} /> / month</span>
                ) : '—'
              }
            />
            {candidate.proposed_salary !== null && (
              <Row
                label="Proposed salary"
                value={<span><MoneyDisplay amountUsd={candidate.proposed_salary} /> / month</span>}
              />
            )}
            {candidate.notes && <Row label="Notes" value={candidate.notes} />}
          </dl>
        </section>

        {(candidate.interview_at || candidate.interviewer) && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Interview</h3>
            <dl className="divide-y divide-slate-100 text-sm">
              <Row
                label="Scheduled"
                value={
                  candidate.interview_at
                    ? formatDateFns(parseISO(candidate.interview_at), 'MMM d, yyyy · h:mm a')
                    : '—'
                }
              />
              <Row
                label="Interviewer"
                value={
                  candidate.interviewer
                    ? `${candidate.interviewer.first_name} ${candidate.interviewer.last_name}`
                    : '—'
                }
              />
              {candidate.interview_note && <Row label="Note" value={candidate.interview_note} />}
            </dl>
          </section>
        )}

        {canManage && options.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Move stage</h3>
            <div className="space-y-3">
              <SelectField
                label="New stage"
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value)}
              >
                <option value="">Select stage…</option>
                {options.map((stage) => (
                  <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>
                ))}
              </SelectField>

              {targetStage === 'interview' && (
                <>
                  <TextField
                    label="Interview date & time"
                    type="datetime-local"
                    required
                    value={interviewAt}
                    onChange={(e) => setInterviewAt(e.target.value)}
                    error={fieldErrors.interviewAt}
                  />
                  <SelectField
                    label="Interviewer"
                    required
                    value={interviewerId}
                    onChange={(e) => setInterviewerId(e.target.value)}
                    error={fieldErrors.interviewerId}
                  >
                    <option value="">Select interviewer…</option>
                    {(employees.data ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.first_name} {m.last_name} ({m.employee_code})
                      </option>
                    ))}
                  </SelectField>
                  <TextAreaField
                    label="Interview note"
                    rows={2}
                    value={interviewNote}
                    onChange={(e) => setInterviewNote(e.target.value)}
                    placeholder="Optional focus areas…"
                  />
                </>
              )}

              {targetStage === 'offer' && (
                <TextField
                  label="Proposed salary (USD / month)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={proposedSalary}
                  onChange={(e) => setProposedSalary(e.target.value)}
                  error={fieldErrors.proposedSalary}
                  hint="Optional — shown on the offer record"
                />
              )}

              <div className="flex justify-end">
                <Button onClick={() => void moveStage()} disabled={!targetStage} loading={update.isPending}>
                  Move candidate
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </Drawer>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-slate-800">{value}</dd>
    </div>
  )
}
