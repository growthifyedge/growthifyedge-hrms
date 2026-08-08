import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatISO } from 'date-fns'
import { getSupabase } from '../lib/supabase'
import { summarizeLeaveBalances, type LeaveBalanceSummary } from '../lib/timeLeave'
import type {
  LeaveBalance,
  LeaveRequest,
  LeaveRequestWithRelations,
  LeaveStatus,
  LeaveType,
} from '../types/db'

export const LEAVE_REQUEST_SELECT = `
  *,
  employee:employees!leave_requests_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url, manager_id,
    department:departments!employees_department_id_fkey(id, name)
  ),
  leave_type:leave_types!leave_requests_leave_type_id_fkey(id, name, code, is_paid),
  reviewer:profiles!leave_requests_reviewed_by_fkey(full_name)
`

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave', 'types'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('leave_types')
        .select('*')
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return (data ?? []) as LeaveType[]
    },
  })
}

/**
 * Visible leave requests, newest first (RLS scopes managers to
 * self + direct reports). Status/search filtering is client-side —
 * the demo dataset is small.
 */
export function useLeaveRequests() {
  return useQuery({
    queryKey: ['leave', 'requests'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('leave_requests')
        .select(LEAVE_REQUEST_SELECT)
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return (data ?? []) as unknown as LeaveRequestWithRelations[]
    },
  })
}

/** Recent leave requests for one employee (profile tab). */
export function useEmployeeLeaveRequests(employeeId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ['leave', 'employee-requests', employeeId, limit],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('leave_requests')
        .select(LEAVE_REQUEST_SELECT)
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as LeaveRequestWithRelations[]
    },
  })
}

/** Entitlement + derived used/remaining per leave type for one employee. */
export function useLeaveBalanceSummary(employeeId: string | undefined, year: number) {
  return useQuery({
    queryKey: ['leave', 'balance-summary', employeeId, year],
    enabled: !!employeeId,
    queryFn: async (): Promise<LeaveBalanceSummary[]> => {
      const supabase = getSupabase()
      const [typesRes, balancesRes, approvedRes] = await Promise.all([
        supabase.from('leave_types').select('*').eq('status', 'active').order('name'),
        supabase
          .from('leave_balances')
          .select('*')
          .eq('employee_id', employeeId!)
          .eq('year', year),
        supabase
          .from('leave_requests')
          .select('leave_type_id, days_requested, start_date')
          .eq('employee_id', employeeId!)
          .eq('status', 'approved')
          .gte('start_date', `${year}-01-01`)
          .lte('start_date', `${year}-12-31`),
      ])
      for (const res of [typesRes, balancesRes, approvedRes]) {
        if (res.error) throw res.error
      }
      return summarizeLeaveBalances(
        (typesRes.data ?? []) as LeaveType[],
        (balancesRes.data ?? []) as LeaveBalance[],
        (approvedRes.data ?? []) as Array<Pick<LeaveRequest, 'leave_type_id' | 'days_requested'>>,
      )
    },
  })
}

/** Approved requests whose range includes today (dashboard KPI). */
export function useOnLeaveToday() {
  return useQuery({
    queryKey: ['dashboard', 'on-leave-today'],
    queryFn: async (): Promise<number> => {
      const today = formatISO(new Date(), { representation: 'date' })
      const { count, error } = await getSupabase()
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
      if (error) throw error
      return count ?? 0
    },
  })
}

/** Pending leave approvals (dashboard KPI + pending actions list). */
export function usePendingLeave(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'pending-leave', limit],
    queryFn: async () => {
      const { data, count, error } = await getSupabase()
        .from('leave_requests')
        .select(LEAVE_REQUEST_SELECT, { count: 'exact' })
        .eq('status', 'pending')
        .order('start_date', { ascending: true })
        .limit(limit)
      if (error) throw error
      return {
        count: count ?? 0,
        rows: (data ?? []) as unknown as LeaveRequestWithRelations[],
      }
    },
  })
}

export interface LeaveRequestPayload {
  organization_id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  submitted_by: string
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LeaveRequestPayload) => {
      const { data, error } = await getSupabase()
        .from('leave_requests')
        .insert({ ...payload, status: 'pending' })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['leave'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/** Approve/reject through the secure RPC — never a direct table update. */
export function useReviewLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { requestId: string; decision: Exclude<LeaveStatus, 'pending'>; note?: string }) => {
      const { data, error } = await getSupabase().rpc('review_leave_request', {
        p_request_id: input.requestId,
        p_decision: input.decision,
        p_note: input.note ?? null,
      })
      if (error) throw error
      return data as LeaveRequest
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['leave'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
