import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import type {
  Candidate,
  CandidateWithRelations,
  JobOpening,
  JobOpeningWithRelations,
} from '../types/db'

// Embeds carry explicit FK hints (project convention).
export const JOB_SELECT = `
  *,
  department:departments!job_openings_department_id_fkey(id, name),
  designation:designations!job_openings_designation_id_fkey(id, title),
  location:work_locations!job_openings_location_id_fkey(id, name, city),
  hiring_manager:employees!job_openings_hiring_manager_id_fkey(id, first_name, last_name)
`

export const CANDIDATE_SELECT = `
  *,
  job:job_openings!candidates_job_opening_id_fkey(
    id, title, hiring_manager_id, department_id, designation_id, location_id, employment_type
  ),
  interviewer:employees!candidates_interviewer_employee_id_fkey(id, first_name, last_name)
`

/** All visible job openings (RLS scopes drafts to HR admin). */
export function useJobOpenings() {
  return useQuery({
    queryKey: ['recruitment', 'jobs'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('job_openings')
        .select(JOB_SELECT)
        .order('posted_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as unknown as JobOpeningWithRelations[]
    },
  })
}

/** All visible candidates (RLS scopes managers to their own jobs). */
export function useCandidates() {
  return useQuery({
    queryKey: ['recruitment', 'candidates'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('candidates')
        .select(CANDIDATE_SELECT)
        .order('application_date', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as unknown as CandidateWithRelations[]
    },
  })
}

export interface RecruitmentDashboard {
  /** Sum of openings_count across open jobs. */
  openPositions: number
  openJobs: number
  pipeline: { stage: string; count: number }[]
  upcomingInterviews: { id: string; full_name: string; interview_at: string | null; jobTitle: string }[]
  offers: { id: string; full_name: string; jobTitle: string }[]
}

/** Live recruitment metrics for the executive dashboard (one light query each). */
export function useRecruitmentDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'recruitment'],
    queryFn: async (): Promise<RecruitmentDashboard> => {
      const supabase = getSupabase()
      const [jobsRes, candRes] = await Promise.all([
        supabase.from('job_openings').select('id, status, openings_count').limit(200),
        supabase
          .from('candidates')
          .select('id, full_name, stage, interview_at, job:job_openings!candidates_job_opening_id_fkey(title)')
          .limit(500),
      ])
      if (jobsRes.error) throw jobsRes.error
      if (candRes.error) throw candRes.error

      const jobs = (jobsRes.data ?? []) as Array<Pick<JobOpening, 'id' | 'status' | 'openings_count'>>
      const cands = (candRes.data ?? []) as unknown as Array<{
        id: string
        full_name: string
        stage: string
        interview_at: string | null
        job: { title: string } | null
      }>

      const openJobs = jobs.filter((j) => j.status === 'open')
      const stageOrder = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']
      const stageLabels: Record<string, string> = {
        applied: 'Applied', screening: 'Screening', interview: 'Interview',
        offer: 'Offer', hired: 'Hired', rejected: 'Rejected',
      }
      const counts = new Map<string, number>()
      for (const c of cands) counts.set(c.stage, (counts.get(c.stage) ?? 0) + 1)
      const now = Date.now()

      return {
        openPositions: openJobs.reduce((sum, j) => sum + j.openings_count, 0),
        openJobs: openJobs.length,
        pipeline: stageOrder.map((stage) => ({
          stage: stageLabels[stage],
          count: counts.get(stage) ?? 0,
        })),
        upcomingInterviews: cands
          .filter((c) => c.stage === 'interview' && c.interview_at && Date.parse(c.interview_at) >= now)
          .sort((a, b) => (a.interview_at ?? '').localeCompare(b.interview_at ?? ''))
          .map((c) => ({
            id: c.id, full_name: c.full_name, interview_at: c.interview_at,
            jobTitle: c.job?.title ?? 'Unknown role',
          })),
        offers: cands
          .filter((c) => c.stage === 'offer')
          .map((c) => ({ id: c.id, full_name: c.full_name, jobTitle: c.job?.title ?? 'Unknown role' })),
      }
    },
  })
}

async function invalidateRecruitment(qc: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['recruitment'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

export type JobPayload = Partial<JobOpening> & { organization_id: string }

export function useSaveJob(jobId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: JobPayload) => {
      const supabase = getSupabase()
      const result = jobId
        ? await supabase.from('job_openings').update(payload).eq('id', jobId).select('id').single()
        : await supabase.from('job_openings').insert(payload).select('id').single()
      if (result.error) throw result.error
      return result.data.id as string
    },
    onSettled: async () => invalidateRecruitment(qc),
  })
}

export type CandidatePayload = Partial<Candidate> & { organization_id: string }

export function useAddCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CandidatePayload) => {
      const { data, error } = await getSupabase()
        .from('candidates')
        .insert({ ...payload, stage: 'applied' })
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSettled: async () => invalidateRecruitment(qc),
  })
}

/** Stage moves and detail edits (interview/offer fields, notes). */
export function useUpdateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ candidateId, patch }: { candidateId: string; patch: Partial<Candidate> }) => {
      const { data, error } = await getSupabase()
        .from('candidates')
        .update(patch)
        .eq('id', candidateId)
        .select('id')
        .single()
      if (error) throw error
      return data.id as string
    },
    onSettled: async () => invalidateRecruitment(qc),
  })
}

export interface HireInput {
  candidateId: string
  employeeCode: string
  joiningDate: string
  employmentType: string
  managerId: string | null
}

/** Transactional candidate → employee conversion via the secure RPC. */
export function useHireCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: HireInput) => {
      const { data, error } = await getSupabase().rpc('hire_candidate', {
        p_candidate_id: input.candidateId,
        p_employee_code: input.employeeCode,
        p_joining_date: input.joiningDate,
        p_employment_type: input.employmentType,
        p_manager_id: input.managerId,
      })
      if (error) throw error
      return data as { employee_id: string; candidate_id: string }
    },
    onSettled: async () => {
      await invalidateRecruitment(qc)
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['employees'] }),
        qc.invalidateQueries({ queryKey: ['onboarding'] }),
        qc.invalidateQueries({ queryKey: ['manager-options'] }),
      ])
    },
  })
}
