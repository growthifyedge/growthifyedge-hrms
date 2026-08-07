import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { getSupabase } from '../../lib/supabase'
import { fullName } from '../../lib/format'
import { Avatar } from '../ui/Avatar'
import type { Employee } from '../../types/db'

/** Header quick-search over employees; navigates to a profile on selection. */
export function GlobalSearch() {
  const [term, setTerm] = useState('')
  const [openList, setOpenList] = useState(false)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounced = useDebounced(term, 250)

  const { data: results } = useQuery({
    queryKey: ['employee-search', debounced],
    enabled: debounced.trim().length >= 2,
    queryFn: async () => {
      const q = debounced.trim()
      const { data, error } = await getSupabase()
        .from('employees')
        .select('id, first_name, last_name, employee_code, work_email, avatar_url')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,employee_code.ilike.%${q}%,work_email.ilike.%${q}%`)
        .limit(6)
      if (error) throw error
      return data as Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_code' | 'work_email' | 'avatar_url'>[]
    },
  })

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenList(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={wrapRef} className="relative hidden w-full max-w-xs md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpenList(true)
        }}
        onFocus={() => setOpenList(true)}
        placeholder="Search employees…"
        aria-label="Search employees"
        className="w-full rounded-lg border border-slate-300 bg-slate-50 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-100"
      />
      {openList && debounced.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
          {(results ?? []).length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-slate-500">No matching employees</p>
          ) : (
            (results ?? []).map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => {
                  setOpenList(false)
                  setTerm('')
                  navigate(`/people/${emp.id}`)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
              >
                <Avatar name={fullName(emp)} src={emp.avatar_url} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">{fullName(emp)}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {emp.employee_code} · {emp.work_email}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function useDebounced(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}
