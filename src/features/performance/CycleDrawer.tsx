import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { FormSection, SelectField, TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useSaveCycle } from '../../hooks/usePerformance'
import { CYCLE_STATUS_LABELS } from '../../lib/performance'
import { isUniqueViolation } from '../../lib/utils'
import { cycleFormSchema, type CycleFormValues } from './schemas'

const DEFAULTS: CycleFormValues = {
  name: '',
  start_date: '',
  end_date: '',
  status: 'active',
}

/** Small HR-admin drawer for creating a review cycle. */
export function CycleDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const { profile } = useAuth()
  const save = useSaveCycle()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CycleFormValues>({
    resolver: zodResolver(cycleFormSchema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (open) reset(DEFAULTS)
  }, [open, reset])

  async function onSubmit(values: CycleFormValues) {
    if (!profile) return
    try {
      await save.mutateAsync({
        organization_id: profile.organization_id,
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        status: values.status,
        created_by: profile.id,
      })
      toast('success', 'Review cycle created.')
      onClose()
    } catch (err) {
      if (isUniqueViolation(err)) {
        setError('name', { message: 'A cycle with this name already exists.' })
      } else {
        toast('error', 'Could not save the cycle. Please try again.')
      }
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New Review Cycle"
      subtitle="A lightweight review period (e.g. Mid-Year 2026 Review)"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="cycle-form" loading={save.isPending}>
            Create cycle
          </Button>
        </div>
      }
    >
      <form id="cycle-form" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <FormSection title="Cycle">
          <div className="sm:col-span-2">
            <TextField label="Cycle name" required error={errors.name?.message} {...register('name')} />
          </div>
          <TextField label="Start date" type="date" required error={errors.start_date?.message} {...register('start_date')} />
          <TextField label="End date" type="date" required error={errors.end_date?.message} {...register('end_date')} />
          <SelectField label="Cycle status" required error={errors.status?.message} {...register('status')}>
            {Object.entries(CYCLE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </SelectField>
        </FormSection>
      </form>
    </Drawer>
  )
}
