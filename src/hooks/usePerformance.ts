import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import type {
  PerformanceCycle,
  PerformanceGoal,
  PerformanceGoalWithRelations,
  PerformanceReview,
  PerformanceReviewWithRelations,
} from '../types/db'

export const GOAL_SELECT = `
  *,
  employee:employees!performance_goals_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url, manager_id,
    department:departments!employees_department_id_fkey(id, name)
  ),
  manager:employees!performance_goals_manager_employee_id_fkey(id, first_name, last_name)
`

export const REVIEW_SELECT = `
  *,
  employee:employees!performance_reviews_employee_id_fkey(
    id, first_name, last_name, employee_code, avatar_url, manager_id,
    department:departments!employees_department_id_fkey(id, name)
  ),
  cycle:performance_cycles!performance_reviews_cycle_id_fkey(id, name, status),
  reviewer:employees!performance_reviews_reviewer_employee_id_fkey(id, first_name, last_name)
`

/** All visible goals (RLS scopes managers/employees automatically). */
export function useGoals() {
  return useQuery({
    queryKey: ['performance', 'goals'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('performance_goals')
        .select(GOAL_SELECT)
        .order('target_date', { ascending: true })
        .limit(500)
      if (error) throw error
      return (data ?? []) as unknown as PerformanceGoalWithRelations[]
    },
  })
}

export function useEmployeeGoals(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['performance', 'employee-goals', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('performance_goals')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('target_date', { ascending: true })
        .limit(50)
      if (error) throw error
      return (data ?? []) as PerformanceGoal[]
    },
  })
}

export function useCycles() {
  return useQuery({
    queryKey: ['performance', 'cycles'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('performance_cycles')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as PerformanceCycle[]
    },
  })
}

/** All visible reviews (RLS: admin org-wide; manager self+reports; own completed). */
export function useReviews() {
  return useQuery({
    queryKey: ['performance', 'reviews'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('performance_reviews')
        .select(REVIEW_SELECT)
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return (data ?? []) as unknown as PerformanceReviewWithRelations[]
    },
  })
}

export function useEmployeeReviews(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['performance', 'employee-reviews', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('performance_reviews')
        .select(REVIEW_SELECT)
        .eq('employee_id', employeeId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as unknown as PerformanceReviewWithRelations[]
    },
  })
}

async function invalidatePerformance(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['performance'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

export type GoalPayload = Partial<PerformanceGoal> & { organization_id: string }

export function useSaveGoal(goalId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: GoalPayload) => {
      const supabase = getSupabase()
      const result = goalId
        ? await supabase.from('performance_goals').update(payload).eq('id', goalId).select('id').single()
        : await supabase.from('performance_goals').insert(payload).select('id').single()
      if (result.error) throw result.error
      return result.data.id as string
    },
    onSettled: async () => invalidatePerformance(qc),
  })
}

export type CyclePayload = Partial<PerformanceCycle> & { organization_id: string }

export function useSaveCycle(cycleId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CyclePayload) => {
      const supabase = getSupabase()
      const result = cycleId
        ? await supabase.from('performance_cycles').update(payload).eq('id', cycleId).select('id').single()
        : await supabase.from('performance_cycles').insert(payload).select('id').single()
      if (result.error) throw result.error
      return result.data.id as string
    },
    onSettled: async () => invalidatePerformance(qc),
  })
}

/** Creates a pending review shell for an employee in a cycle. */
export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { organizationId: string; employeeId: string; cycleId: string }) => {
      const { data, error } = await getSupabase()
        .from('performance_reviews')
        .insert({
          organization_id: input.organizationId,
          employee_id: input.employeeId,
          cycle_id: input.cycleId,
          status: 'pending',
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSettled: async () => invalidatePerformance(qc),
  })
}

export interface CompleteReviewInput {
  reviewId: string
  goalAchievement: number
  quality: number
  collaboration: number
  initiative: number
  strengths?: string
  developmentAreas?: string
  overallComments?: string
}

/** Completes a review through the secure RPC — never a direct update. */
export function useCompleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CompleteReviewInput) => {
      const { data, error } = await getSupabase().rpc('complete_performance_review', {
        p_review_id: input.reviewId,
        p_goal_achievement: input.goalAchievement,
        p_quality: input.quality,
        p_collaboration: input.collaboration,
        p_initiative: input.initiative,
        p_strengths: input.strengths ?? null,
        p_development_areas: input.developmentAreas ?? null,
        p_overall_comments: input.overallComments ?? null,
      })
      if (error) throw error
      return data as PerformanceReview
    },
    onSettled: async () => invalidatePerformance(qc),
  })
}

/** Pending reviews in active cycles (dashboard "Reviews Due"). */
export function useReviewsDue(limit = 4) {
  return useQuery({
    queryKey: ['dashboard', 'reviews-due', limit],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('performance_reviews')
        .select(
          `id, status,
           employee:employees!performance_reviews_employee_id_fkey(id, first_name, last_name),
           cycle:performance_cycles!performance_reviews_cycle_id_fkey(id, name, status)`,
        )
        .eq('status', 'pending')
        .limit(50)
      if (error) throw error
      const rows = (data ?? []) as unknown as Array<{
        id: string
        employee: { first_name: string; last_name: string } | null
        cycle: { name: string; status: string } | null
      }>
      const active = rows.filter((r) => r.cycle?.status === 'active')
      return { count: active.length, rows: active.slice(0, limit) }
    },
  })
}
