import { useEffect, useState } from 'react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { useCreatePayrollRun } from '../../hooks/usePayroll'
import { monthInputToPeriod } from '../../lib/payroll'
import { getErrorMessage } from '../../lib/utils'

/** Creates a draft payroll run for a month via the transactional RPC. */
export function CreateRunDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const create = useCreatePayrollRun()
  const [month, setMonth] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setMonth(new Date().toISOString().slice(0, 7))
      setError('')
    }
  }, [open])

  async function onCreate() {
    const period = monthInputToPeriod(month)
    if (!period) {
      setError('Select a payroll month.')
      return
    }
    try {
      await create.mutateAsync(period)
      toast('success', 'Payroll run created as draft.')
      onClose()
    } catch (err) {
      const message = getErrorMessage(err)
      if (/already exists/i.test(message)) {
        setError('A payroll run for this month already exists.')
      } else {
        toast('error', 'Could not create the payroll run. Please try again.')
      }
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New Payroll Run"
      subtitle="Snapshots current compensation for all eligible employees"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void onCreate()} loading={create.isPending}>
            Create run
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Payroll month"
          type="month"
          required
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          error={error || undefined}
        />
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
          One entry is created per eligible employee with monthly base pay derived from current
          compensation. The run starts as a draft — allowances and deductions stay editable until
          it is finalized. One run per month.
        </p>
      </div>
    </Drawer>
  )
}
