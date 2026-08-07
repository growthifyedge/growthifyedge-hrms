import { useQuery } from '@tanstack/react-query'
import { formatISO, startOfMonth, subDays } from 'date-fns'
import { getSupabase } from '../lib/supabase'
import { toMonthlyUsd } from '../lib/currency'
import type {
  Announcement,
  DashboardDemoMetrics,
  Employee,
  EmployeeCompensation,
} from '../types/db'

export interface HeadcountStats {
  total: number
  active: number
  newHires30d: number
}

export function useHeadcountStats() {
  return useQuery({
    queryKey: ['dashboard', 'headcount'],
    queryFn: async (): Promise<HeadcountStats> => {
      const supabase = getSupabase()
      const cutoff = formatISO(subDays(new Date(), 30), { representation: 'date' })
      const [totalRes, activeRes, hiresRes] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).neq('status', 'inactive'),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .gte('joining_date', cutoff)
          .neq('status', 'future_hire'),
      ])
      for (const res of [totalRes, activeRes, hiresRes]) {
        if (res.error) throw res.error
      }
      return {
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        newHires30d: hiresRes.count ?? 0,
      }
    },
  })
}

export interface PayrollByDepartment {
  department: string
  totalMonthlyUsd: number
  headcount: number
}

export interface PayrollStats {
  monthlyTotalUsd: number
  byDepartment: PayrollByDepartment[]
}

/** Payroll estimate from live compensation rows (small org — fits free tier easily). */
export function usePayrollStats() {
  return useQuery({
    queryKey: ['dashboard', 'payroll'],
    queryFn: async (): Promise<PayrollStats> => {
      const supabase = getSupabase()
      const [{ data: comps, error: compErr }, { data: emps, error: empErr }] = await Promise.all([
        supabase
          .from('employee_compensation')
          .select('employee_id, base_salary_usd, allowance_usd, bonus_usd, deduction_usd, pay_frequency'),
        supabase
          .from('employees')
          .select('id, status, department_id, department:departments(id, name)')
          .in('status', ['active', 'on_leave', 'probation', 'notice_period']),
      ])
      if (compErr) throw compErr
      if (empErr) throw empErr

      const employees = (emps ?? []) as unknown as Array<
        Pick<Employee, 'id' | 'status' | 'department_id'> & { department: { id: string; name: string } | null }
      >
      const byId = new Map(employees.map((e) => [e.id, e]))
      const byDept = new Map<string, PayrollByDepartment>()
      let monthlyTotalUsd = 0

      for (const comp of (comps ?? []) as Array<
        Pick<EmployeeCompensation, 'employee_id' | 'base_salary_usd' | 'allowance_usd' | 'bonus_usd' | 'deduction_usd' | 'pay_frequency'>
      >) {
        const emp = byId.get(comp.employee_id)
        if (!emp) continue
        const perPeriod =
          comp.base_salary_usd + comp.allowance_usd + comp.bonus_usd - comp.deduction_usd
        const monthly = toMonthlyUsd(perPeriod, comp.pay_frequency)
        monthlyTotalUsd += monthly
        const deptName = emp.department?.name ?? 'Unassigned'
        const entry = byDept.get(deptName) ?? { department: deptName, totalMonthlyUsd: 0, headcount: 0 }
        entry.totalMonthlyUsd += monthly
        entry.headcount += 1
        byDept.set(deptName, entry)
      }

      return {
        monthlyTotalUsd,
        byDepartment: [...byDept.values()].sort((a, b) => b.totalMonthlyUsd - a.totalMonthlyUsd),
      }
    },
  })
}

export interface WorkforceSlice {
  department: string
  count: number
}

export function useWorkforceByDepartment() {
  return useQuery({
    queryKey: ['dashboard', 'workforce'],
    queryFn: async (): Promise<WorkforceSlice[]> => {
      const { data, error } = await getSupabase()
        .from('employees')
        .select('id, department:departments(name)')
        .neq('status', 'inactive')
      if (error) throw error
      const counts = new Map<string, number>()
      for (const row of (data ?? []) as unknown as Array<{ department: { name: string } | null }>) {
        const name = row.department?.name ?? 'Unassigned'
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      return [...counts.entries()]
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count)
    },
  })
}

export function useRecentHires(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'recent-hires', limit],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('employees')
        .select(
          'id, first_name, last_name, avatar_url, joining_date, designation:designations(title), department:departments(name)',
        )
        .neq('status', 'future_hire')
        .neq('status', 'inactive')
        .order('joining_date', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as Array<{
        id: string
        first_name: string
        last_name: string
        avatar_url: string | null
        joining_date: string
        designation: { title: string } | null
        department: { name: string } | null
      }>
    },
  })
}

export function useAnnouncements(limit = 4) {
  return useQuery({
    queryKey: ['announcements', limit],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as Announcement[]
    },
  })
}

/**
 * Temporary Wave 1 metrics for modules whose operational data arrives in later
 * waves (attendance, leave, recruitment). Replaced by real module queries later.
 */
export function useDemoMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'demo-metrics'],
    queryFn: async (): Promise<DashboardDemoMetrics | null> => {
      const { data, error } = await getSupabase()
        .from('dashboard_demo_metrics')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as DashboardDemoMetrics | null
    },
  })
}

export function useMonthStart(): string {
  return formatISO(startOfMonth(new Date()), { representation: 'date' })
}
