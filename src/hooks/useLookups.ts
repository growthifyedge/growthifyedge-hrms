import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import type { Department, Designation, WorkLocation, Organization } from '../types/db'

export function useDepartments(includeInactive = false) {
  return useQuery({
    queryKey: ['departments', includeInactive],
    queryFn: async () => {
      let q = getSupabase().from('departments').select('*').order('name')
      if (!includeInactive) q = q.eq('status', 'active')
      const { data, error } = await q
      if (error) throw error
      return data as Department[]
    },
  })
}

export function useDesignations(includeInactive = false) {
  return useQuery({
    queryKey: ['designations', includeInactive],
    queryFn: async () => {
      let q = getSupabase().from('designations').select('*').order('title')
      if (!includeInactive) q = q.eq('status', 'active')
      const { data, error } = await q
      if (error) throw error
      return data as Designation[]
    },
  })
}

export function useWorkLocations(includeInactive = false) {
  return useQuery({
    queryKey: ['work-locations', includeInactive],
    queryFn: async () => {
      let q = getSupabase().from('work_locations').select('*').order('name')
      if (!includeInactive) q = q.eq('status', 'active')
      const { data, error } = await q
      if (error) throw error
      return data as WorkLocation[]
    },
  })
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data, error } = await getSupabase().from('organizations').select('*').limit(1).maybeSingle()
      if (error) throw error
      return data as Organization | null
    },
  })
}

/** Lightweight list of potential managers (active employees). */
export function useManagerOptions() {
  return useQuery({
    queryKey: ['manager-options'],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('employees')
        .select('id, first_name, last_name, employee_code')
        .in('status', ['active', 'probation', 'notice_period', 'on_leave'])
        .order('first_name')
        .limit(200)
      if (error) throw error
      return data as { id: string; first_name: string; last_name: string; employee_code: string }[]
    },
  })
}
