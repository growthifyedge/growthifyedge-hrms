import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import { grossPay, isCurrentOrPastPeriod, netPay } from '../lib/payroll'
import type { PayrollEntry, PayrollEntryWithRelations, PayrollRun } from '../types/db'

export const PAYROLL_ENTRY_SELECT = `
  *,
  employee:employees!payroll_entries_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url, manager_id,
    department:departments!employees_department_id_fkey(id, name)
  ),
  run:payroll_runs!payroll_entries_payroll_run_id_fkey(id, period_month, status)
`

/** All payroll runs, newest period first (HR admin only via RLS). */
export function usePayrollRuns() {
  return useQuery({
    queryKey: ['payroll', 'runs'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('payroll_runs')
        .select('*')
        .order('period_month', { ascending: false })
        .limit(36)
      if (error) throw error
      return (data ?? []) as PayrollRun[]
    },
  })
}

export function usePayrollEntries(runId: string | null) {
  return useQuery({
    queryKey: ['payroll', 'entries', runId],
    enabled: !!runId,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('payroll_entries')
        .select(PAYROLL_ENTRY_SELECT)
        .eq('payroll_run_id', runId!)
        .limit(500)
      if (error) throw error
      const rows = (data ?? []) as unknown as PayrollEntryWithRelations[]
      return rows.sort((a, b) =>
        `${a.employee?.first_name} ${a.employee?.last_name}`.localeCompare(
          `${b.employee?.first_name} ${b.employee?.last_name}`,
        ),
      )
    },
  })
}

/** Recent payroll entries for one employee (profile; RLS-scoped). */
export function useEmployeePayroll(employeeId: string | undefined, limit = 6) {
  return useQuery({
    queryKey: ['payroll', 'employee', employeeId, limit],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('payroll_entries')
        .select(PAYROLL_ENTRY_SELECT)
        .eq('employee_id', employeeId!)
        .limit(24)
      if (error) throw error
      const rows = (data ?? []) as unknown as PayrollEntryWithRelations[]
      return rows
        .sort((a, b) => (b.run?.period_month ?? '').localeCompare(a.run?.period_month ?? ''))
        .slice(0, limit)
    },
  })
}

/** Latest meaningful run for the dashboard KPI (finalized/paid preferred). */
export function useLatestPayroll() {
  return useQuery({
    queryKey: ['dashboard', 'payroll-latest'],
    queryFn: async (): Promise<PayrollRun | null> => {
      const { data, error } = await getSupabase()
        .from('payroll_runs')
        .select('*')
        .order('period_month', { ascending: false })
        .limit(12)
      if (error) throw error
      // Future-dated runs (pre-created drafts) never drive the KPI.
      const runs = ((data ?? []) as PayrollRun[]).filter((r) => isCurrentOrPastPeriod(r.period_month))
      return runs.find((r) => r.status !== 'draft') ?? runs[0] ?? null
    },
  })
}

async function invalidatePayroll(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['payroll'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (periodMonth: string) => {
      const { data, error } = await getSupabase().rpc('create_payroll_run', {
        p_period_month: periodMonth,
      })
      if (error) throw error
      return data as PayrollRun
    },
    onSettled: async () => invalidatePayroll(qc),
  })
}

/** Edits a DRAFT entry's allowances/deductions; gross/net recomputed here. */
export function useUpdatePayrollEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { entry: PayrollEntry; allowances: number; deductions: number }) => {
      const gross = grossPay(input.entry.base_pay, input.allowances)
      const net = netPay(gross, input.deductions)
      const { data, error } = await getSupabase()
        .from('payroll_entries')
        .update({
          allowances: input.allowances,
          deductions: input.deductions,
          gross_pay: gross,
          net_pay: net,
        })
        .eq('id', input.entry.id)
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSettled: async () => invalidatePayroll(qc),
  })
}

export function useFinalizePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await getSupabase().rpc('finalize_payroll_run', { p_run_id: runId })
      if (error) throw error
      return data as PayrollRun
    },
    onSettled: async () => invalidatePayroll(qc),
  })
}

export function useMarkPayrollPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await getSupabase().rpc('mark_payroll_run_paid', { p_run_id: runId })
      if (error) throw error
      return data as PayrollRun
    },
    onSettled: async () => invalidatePayroll(qc),
  })
}
