import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { FormSection, SelectField, TextAreaField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useAddCandidate, useJobOpenings } from '../../hooks/useRecruitment'
import { CANDIDATE_SOURCES } from '../../lib/recruitment'
import { isUniqueViolation } from '../../lib/utils'
import { candidateFormSchema, type CandidateFormInput, type CandidateFormValues } from './schemas'

const DEFAULTS: CandidateFormInput = {
  full_name: '',
  email: '',
  job_opening_id: '',
  source: 'LinkedIn',
  phone: '',
  location_text: '',
  experience_years: undefined,
  expected_salary: undefined,
  notes: '',
}

/** HR admin adds a new applicant; the candidate starts in Applied. */
export function AddCandidateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const { profile } = useAuth()
  const { currency, format } = useCurrency()
  const jobs = useJobOpenings()
  const add = useAddCandidate()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<CandidateFormInput, unknown, CandidateFormValues>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (open) reset(DEFAULTS)
  }, [open, reset])

  const expected = Number(watch('expected_salary') ?? 0)
  const openJobs = (jobs.data ?? []).filter((j) => j.status === 'open')

  async function onSubmit(values: CandidateFormValues) {
    if (!profile) return
    try {
      await add.mutateAsync({
        organization_id: profile.organization_id,
        job_opening_id: values.job_opening_id,
        full_name: values.full_name,
        email: values.email.toLowerCase(),
        source: values.source,
        phone: values.phone || null,
        location_text: values.location_text || null,
        experience_years: values.experience_years ?? null,
        expected_salary: values.expected_salary ?? null,
        notes: values.notes || null,
        created_by: profile.id,
      })
      toast('success', 'Candidate added to the pipeline.')
      onClose()
    } catch (err) {
      if (isUniqueViolation(err)) {
        setError('email', { message: 'This candidate has already applied to this job.' })
      } else {
        toast('error', 'Could not add the candidate. Please try again.')
      }
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add Candidate"
      subtitle="New application — starts in the Applied stage"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="candidate-form" loading={add.isPending}>
            Add candidate
          </Button>
        </div>
      }
    >
      <form id="candidate-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormSection title="Candidate">
          <TextField label="Full name" required error={errors.full_name?.message} {...register('full_name')} />
          <TextField label="Email" type="email" required error={errors.email?.message} {...register('email')} />
          <TextField label="Phone" error={errors.phone?.message} {...register('phone')} />
          <TextField label="Location" placeholder="City, Country" error={errors.location_text?.message} {...register('location_text')} />
        </FormSection>

        <FormSection title="Application">
          <SelectField label="Job opening" required error={errors.job_opening_id?.message} {...register('job_opening_id')}>
            <option value="">Select job…</option>
            {openJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {j.department?.name ?? 'No department'}
              </option>
            ))}
          </SelectField>
          <SelectField label="Source" required error={errors.source?.message} {...register('source')}>
            {CANDIDATE_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </SelectField>
          <TextField
            label="Experience (years)"
            type="number"
            min={0}
            step="0.5"
            error={errors.experience_years?.message}
            {...register('experience_years')}
          />
          <TextField
            label="Expected salary (USD / month)"
            type="number"
            min={0}
            step="0.01"
            hint={currency !== 'USD' && expected > 0 ? `≈ ${format(expected)}` : undefined}
            error={errors.expected_salary?.message}
            {...register('expected_salary')}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Notes"
              rows={2}
              placeholder="Optional short recruiter note…"
              error={errors.notes?.message}
              {...register('notes')}
            />
          </div>
        </FormSection>
      </form>
    </Drawer>
  )
}
