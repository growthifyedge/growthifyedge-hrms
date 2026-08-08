import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import { onboardingProgress } from '../lib/recruitment'
import type { OnboardingTask, OnboardingTaskWithEmployee } from '../types/db'

const ONBOARDING_SELECT = `
  *,
  employee:employees!onboarding_tasks_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url, joining_date, manager_id,
    department:departments!employees_department_id_fkey(id, name),
    manager:manager_id(id, first_name, last_name)
  )
`

export interface OnboardingEntry {
  employee: NonNullable<OnboardingTaskWithEmployee['employee']>
  tasks: OnboardingTask[]
  completed: number
  progress: number
}

/** Onboarding checklists grouped per employee, most recent joiner first. */
export function useOnboardingList() {
  return useQuery({
    queryKey: ['onboarding', 'list'],
    queryFn: async (): Promise<OnboardingEntry[]> => {
      const { data, error } = await getSupabase()
        .from('onboarding_tasks')
        .select(ONBOARDING_SELECT)
        .order('created_at', { ascending: true })
        .limit(600)
      if (error) throw error
      const rows = (data ?? []) as unknown as OnboardingTaskWithEmployee[]
      const byEmployee = new Map<string, OnboardingEntry>()
      for (const row of rows) {
        if (!row.employee) continue
        const entry =
          byEmployee.get(row.employee.id) ??
          ({ employee: row.employee, tasks: [], completed: 0, progress: 0 } as OnboardingEntry)
        entry.tasks.push(row)
        byEmployee.set(row.employee.id, entry)
      }
      const entries = [...byEmployee.values()]
      for (const entry of entries) {
        entry.completed = entry.tasks.filter((t) => t.status === 'completed').length
        entry.progress = onboardingProgress(entry.tasks)
      }
      return entries.sort((a, b) => b.employee.joining_date.localeCompare(a.employee.joining_date))
    },
  })
}

/** Marks a task pending/completed (HR admin only — RLS enforced). */
export function useToggleOnboardingTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      completed,
      profileId,
    }: {
      taskId: string
      completed: boolean
      profileId: string
    }) => {
      const { error } = await getSupabase()
        .from('onboarding_tasks')
        .update(
          completed
            ? { status: 'completed', completed_at: new Date().toISOString(), completed_by: profileId }
            : { status: 'pending', completed_at: null, completed_by: null },
        )
        .eq('id', taskId)
      if (error) throw error
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['onboarding'] })
    },
  })
}
