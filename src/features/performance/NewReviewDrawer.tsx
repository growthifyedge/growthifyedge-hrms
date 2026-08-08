import { useEffect, useMemo, useState } from 'react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { useManagerOptions } from '../../hooks/useLookups'
import { useCreateReview, useCycles, useReviews } from '../../hooks/usePerformance'
import { isUniqueViolation } from '../../lib/utils'

/** Starts a pending review for an employee in an active cycle. */
export function NewReviewDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const { profile, employee } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const employees = useManagerOptions()
  const cycles = useCycles()
  const reviews = useReviews()
  const create = useCreateReview()

  const [employeeId, setEmployeeId] = useState('')
  const [cycleId, setCycleId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setEmployeeId('')
      setCycleId('')
      setError('')
    }
  }, [open])

  // Managers may only start reviews for direct reports (self excluded).
  const employeeOptions = useMemo(
    () => (employees.data ?? []).filter((e) => (isAdmin ? true : e.id !== employee?.id)),
    [employees.data, isAdmin, employee?.id],
  )
  const activeCycles = (cycles.data ?? []).filter((c) => c.status === 'active')

  async function onCreate() {
    if (!profile) return
    if (!employeeId || !cycleId) {
      setError('Select an employee and a review cycle.')
      return
    }
    const exists = (reviews.data ?? []).some(
      (r) => r.employee_id === employeeId && r.cycle_id === cycleId,
    )
    if (exists) {
      setError('A review already exists for this employee in that cycle.')
      return
    }
    try {
      await create.mutateAsync({
        organizationId: profile.organization_id,
        employeeId,
        cycleId,
      })
      toast('success', 'Review created — it is now pending.')
      onClose()
    } catch (err) {
      if (isUniqueViolation(err)) {
        setError('A review already exists for this employee in that cycle.')
      } else {
        toast('error', 'Could not create the review. Please try again.')
      }
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New Review"
      subtitle="Creates a pending review in an active cycle"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void onCreate()} loading={create.isPending}>
            Create review
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Employee"
          required
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          <option value="">Select employee…</option>
          {employeeOptions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name} ({e.employee_code})
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Review cycle"
          required
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          hint={activeCycles.length === 0 ? 'No active cycle — create one first.' : undefined}
        >
          <option value="">Select cycle…</option>
          {activeCycles.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </SelectField>
        {error && (
          <p className="text-sm text-red-600" role="alert">{error}</p>
        )}
      </div>
    </Drawer>
  )
}
