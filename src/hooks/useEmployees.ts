import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../lib/supabase'
import type {
  EmergencyContact,
  Employee,
  EmployeeCompensation,
  EmployeeWithRelations,
} from '../types/db'

export interface EmployeeFilters {
  search: string
  departmentId: string
  designationId: string
  locationId: string
  status: string
  employmentType: string
}

export const EMPTY_FILTERS: EmployeeFilters = {
  search: '',
  departmentId: '',
  designationId: '',
  locationId: '',
  status: '',
  employmentType: '',
}

export const EMPLOYEE_SELECT = `
  *,
  department:departments(id, name),
  designation:designations(id, title),
  work_location:work_locations(id, name, city, country),
  manager:employees!employees_manager_id_fkey(id, first_name, last_name)
`

export function useEmployeeDirectory(filters: EmployeeFilters, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['employees', filters, page, pageSize],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let q = getSupabase()
        .from('employees')
        .select(EMPLOYEE_SELECT, { count: 'exact' })

      const term = filters.search.trim()
      if (term) {
        q = q.or(
          `first_name.ilike.%${term}%,last_name.ilike.%${term}%,employee_code.ilike.%${term}%,work_email.ilike.%${term}%`,
        )
      }
      if (filters.departmentId) q = q.eq('department_id', filters.departmentId)
      if (filters.designationId) q = q.eq('designation_id', filters.designationId)
      if (filters.locationId) q = q.eq('work_location_id', filters.locationId)
      if (filters.status) q = q.eq('status', filters.status)
      if (filters.employmentType) q = q.eq('employment_type', filters.employmentType)

      const from = (page - 1) * pageSize
      const { data, error, count } = await q
        .order('first_name')
        .range(from, from + pageSize - 1)
      if (error) throw error
      return {
        rows: (data ?? []) as unknown as EmployeeWithRelations[],
        total: count ?? 0,
      }
    },
  })
}

export function useEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('employees')
        .select(EMPLOYEE_SELECT)
        .eq('id', employeeId!)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as EmployeeWithRelations | null) ?? null
    },
  })
}

export function useEmployeeCompensation(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-compensation', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('employee_compensation')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as EmployeeCompensation | null) ?? null
    },
  })
}

export function useEmergencyContact(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['emergency-contact', employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from('employee_emergency_contacts')
        .select('*')
        .eq('employee_id', employeeId!)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as EmergencyContact | null) ?? null
    },
  })
}

export interface EmployeePayload {
  employee: Partial<Employee>
  compensation: {
    base_salary_usd: number
    allowance_usd: number
    bonus_usd: number
    deduction_usd: number
    pay_frequency: string
  }
  emergencyContact: {
    contact_name: string
    relationship: string
    phone: string
  } | null
}

export class PartialSaveError extends Error {
  employeeId: string
  constructor(message: string, employeeId: string) {
    super(message)
    this.name = 'PartialSaveError'
    this.employeeId = employeeId
  }
}

async function invalidateEmployeeQueries(qc: ReturnType<typeof useQueryClient>, employeeId?: string) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['employees'] }),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
    qc.invalidateQueries({ queryKey: ['manager-options'] }),
    employeeId ? qc.invalidateQueries({ queryKey: ['employee', employeeId] }) : Promise.resolve(),
    employeeId
      ? qc.invalidateQueries({ queryKey: ['employee-compensation', employeeId] })
      : Promise.resolve(),
    employeeId
      ? qc.invalidateQueries({ queryKey: ['emergency-contact', employeeId] })
      : Promise.resolve(),
  ])
}

/** Creates the employee, then compensation and emergency contact rows. */
export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EmployeePayload) => {
      const supabase = getSupabase()
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .insert(payload.employee)
        .select('id, organization_id')
        .single()
      if (empErr) throw empErr

      const { error: compErr } = await supabase.from('employee_compensation').insert({
        organization_id: emp.organization_id,
        employee_id: emp.id,
        ...payload.compensation,
      })
      if (compErr) {
        throw new PartialSaveError(
          'Employee was created but compensation could not be saved. Edit the employee to retry.',
          emp.id,
        )
      }

      if (payload.emergencyContact) {
        const { error: ecErr } = await supabase.from('employee_emergency_contacts').insert({
          organization_id: emp.organization_id,
          employee_id: emp.id,
          ...payload.emergencyContact,
        })
        if (ecErr) {
          throw new PartialSaveError(
            'Employee was created but the emergency contact could not be saved. Edit the employee to retry.',
            emp.id,
          )
        }
      }
      return emp.id as string
    },
    onSettled: async () => {
      await invalidateEmployeeQueries(qc)
    },
  })
}

export function useUpdateEmployee(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EmployeePayload) => {
      const supabase = getSupabase()
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .update(payload.employee)
        .eq('id', employeeId)
        .select('id, organization_id')
        .single()
      if (empErr) throw empErr

      // Upsert-style handling: update latest row or insert the first one.
      const { data: existingComp } = await supabase
        .from('employee_compensation')
        .select('id')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle()
      const compResult = existingComp
        ? await supabase
            .from('employee_compensation')
            .update(payload.compensation)
            .eq('id', existingComp.id)
        : await supabase.from('employee_compensation').insert({
            organization_id: emp.organization_id,
            employee_id: employeeId,
            ...payload.compensation,
          })
      if (compResult.error) {
        throw new PartialSaveError(
          'Employee was updated but compensation could not be saved.',
          employeeId,
        )
      }

      if (payload.emergencyContact) {
        const { data: existingEc } = await supabase
          .from('employee_emergency_contacts')
          .select('id')
          .eq('employee_id', employeeId)
          .limit(1)
          .maybeSingle()
        const ecResult = existingEc
          ? await supabase
              .from('employee_emergency_contacts')
              .update(payload.emergencyContact)
              .eq('id', existingEc.id)
          : await supabase.from('employee_emergency_contacts').insert({
              organization_id: emp.organization_id,
              employee_id: employeeId,
              ...payload.emergencyContact,
            })
        if (ecResult.error) {
          throw new PartialSaveError(
            'Employee was updated but the emergency contact could not be saved.',
            employeeId,
          )
        }
      }
      return employeeId
    },
    onSettled: async () => {
      await invalidateEmployeeQueries(qc, employeeId)
    },
  })
}

/** Detects Postgres unique-constraint violations for friendly duplicate messages. */
export function duplicateFieldFromError(err: unknown): 'employee_code' | 'work_email' | null {
  const message = err instanceof Error ? err.message : String(err)
  if (!/duplicate key|unique constraint/i.test(message)) return null
  if (message.includes('employee_code')) return 'employee_code'
  if (message.includes('work_email')) return 'work_email'
  return null
}
