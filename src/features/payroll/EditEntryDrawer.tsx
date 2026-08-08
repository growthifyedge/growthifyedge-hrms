import { useEffect, useState } from 'react'
import { Drawer } from '../../components/ui/Drawer'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { useToast } from '../../contexts/ToastContext'
import { useUpdatePayrollEntry } from '../../hooks/usePayroll'
import { formatPeriod, grossPay, netPay, validateEntryAmounts } from '../../lib/payroll'
import { fullName } from '../../lib/format'
import type { PayrollEntryWithRelations } from '../../types/db'

interface EditEntryDrawerProps {
  entry: PayrollEntryWithRelations | null
  onClose: () => void
}

/** Edits allowances/deductions on a DRAFT entry; base pay stays snapshotted. */
export function EditEntryDrawer({ entry, onClose }: EditEntryDrawerProps) {
  const { toast } = useToast()
  const update = useUpdatePayrollEntry()
  const [allowances, setAllowances] = useState('0')
  const [deductions, setDeductions] = useState('0')
  const [error, setError] = useState('')

  useEffect(() => {
    if (entry) {
      setAllowances(String(entry.allowances))
      setDeductions(String(entry.deductions))
      setError('')
    }
  }, [entry])

  if (!entry) return null

  const allowancesNum = Number(allowances) || 0
  const deductionsNum = Number(deductions) || 0
  const gross = grossPay(entry.base_pay, allowancesNum)
  const net = netPay(gross, deductionsNum)

  async function onSave() {
    if (!entry) return
    const validation = validateEntryAmounts(entry.base_pay, allowancesNum, deductionsNum)
    if (validation) {
      setError(validation)
      return
    }
    try {
      await update.mutateAsync({ entry, allowances: allowancesNum, deductions: deductionsNum })
      toast('success', 'Payroll entry updated.')
      onClose()
    } catch {
      toast('error', 'Could not update the entry. It may no longer be editable.')
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Edit Payroll Entry"
      subtitle={`${entry.employee ? fullName(entry.employee) : '—'} · ${formatPeriod(entry.run?.period_month)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} loading={update.isPending}>
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Base pay (snapshot)</span>
            <span className="font-semibold text-slate-800"><MoneyDisplay amountUsd={entry.base_pay} /></span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Base pay is snapshotted from compensation at run creation and cannot be edited here.
          </p>
        </div>

        <TextField
          label="Allowances (USD)"
          type="number"
          min={0}
          step="0.01"
          value={allowances}
          onChange={(e) => setAllowances(e.target.value)}
          error={error && /negative/i.test(error) ? error : undefined}
        />
        <TextField
          label="Deductions (USD)"
          type="number"
          min={0}
          step="0.01"
          value={deductions}
          onChange={(e) => setDeductions(e.target.value)}
          error={error && /exceed/i.test(error) ? error : undefined}
        />

        <div className="space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Gross pay</span>
            <span className="font-semibold text-slate-800"><MoneyDisplay amountUsd={gross} /></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Net pay</span>
            <span className="font-semibold text-emerald-700"><MoneyDisplay amountUsd={Math.max(net, 0)} /></span>
          </div>
          <p className="text-xs text-slate-400">Gross = Base + Allowances · Net = Gross − Deductions</p>
        </div>
      </div>
    </Drawer>
  )
}
