import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Plus, Search, Table2, X } from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { EmployeeStatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useAuth } from '../../contexts/AuthContext'
import { useDepartments, useDesignations, useWorkLocations } from '../../hooks/useLookups'
import { EMPTY_FILTERS, useEmployeeDirectory, type EmployeeFilters } from '../../hooks/useEmployees'
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  formatDate,
  fullName,
} from '../../lib/format'
import { cn } from '../../lib/utils'
import { EmployeeFormDrawer } from './EmployeeFormDrawer'
import type { EmployeeWithRelations } from '../../types/db'

const PAGE_SIZE = 10

export function PeoplePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'hr_admin'

  const [filters, setFilters] = useState<EmployeeFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [addOpen, setAddOpen] = useState(false)

  const departments = useDepartments()
  const designations = useDesignations()
  const locations = useWorkLocations()
  const directory = useEmployeeDirectory(filters, page, PAGE_SIZE)

  const hasFilters = useMemo(
    () => Object.values(filters).some((v) => v !== ''),
    [filters],
  )

  function updateFilter<K extends keyof EmployeeFilters>(key: K, value: EmployeeFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const selectClass =
    'rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100'

  return (
    <div>
      <PageHeader
        title="People"
        subtitle="Employee directory and records"
        actions={
          <>
            <div className="hidden items-center rounded-lg border border-slate-300 p-0.5 sm:flex" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                aria-label="Table view"
                className={cn('rounded-md p-1.5', view === 'table' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600')}
              >
                <Table2 className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setView('cards')}
                aria-pressed={view === 'cards'}
                aria-label="Card view"
                className={cn('rounded-md p-1.5', view === 'cards' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600')}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {isAdmin && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Add Employee
              </Button>
            )}
          </>
        }
      />

      {/* Filter bar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search name, code or email…"
              aria-label="Search employees"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100"
            />
          </div>
          <select
            value={filters.departmentId}
            onChange={(e) => updateFilter('departmentId', e.target.value)}
            aria-label="Filter by department"
            className={selectClass}
          >
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={filters.designationId}
            onChange={(e) => updateFilter('designationId', e.target.value)}
            aria-label="Filter by designation"
            className={selectClass}
          >
            <option value="">All designations</option>
            {(designations.data ?? [])
              .filter((d) => !filters.departmentId || d.department_id === filters.departmentId)
              .map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
          </select>
          <select
            value={filters.locationId}
            onChange={(e) => updateFilter('locationId', e.target.value)}
            aria-label="Filter by location"
            className={selectClass}
          >
            <option value="">All locations</option>
            {(locations.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            aria-label="Filter by status"
            className={selectClass}
          >
            <option value="">All statuses</option>
            {Object.entries(EMPLOYEE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={filters.employmentType}
            onChange={(e) => updateFilter('employmentType', e.target.value)}
            aria-label="Filter by employment type"
            className={selectClass}
          >
            <option value="">All types</option>
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}>
              <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {directory.isPending ? (
          <TableSkeleton rows={8} />
        ) : directory.isError ? (
          <ErrorState onRetry={() => void directory.refetch()} />
        ) : directory.data.rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No employees match your filters' : 'No employees yet'}
            message={hasFilters ? 'Try adjusting or clearing the filters above.' : isAdmin ? 'Add your first employee to get started.' : undefined}
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className={cn('overflow-x-auto', view === 'cards' ? 'hidden' : 'hidden md:block')}>
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-medium">Employee</th>
                    <th scope="col" className="px-4 py-3 font-medium">Employee ID</th>
                    <th scope="col" className="px-4 py-3 font-medium">Department</th>
                    <th scope="col" className="px-4 py-3 font-medium">Designation</th>
                    <th scope="col" className="px-4 py-3 font-medium">Manager</th>
                    <th scope="col" className="px-4 py-3 font-medium">Type</th>
                    <th scope="col" className="px-4 py-3 font-medium">Location</th>
                    <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {directory.data.rows.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/people/${emp.id}`)}
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName(emp)} src={emp.avatar_url} size="sm" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/people/${emp.id}`)
                              }}
                              className="block max-w-[180px] truncate font-medium text-slate-800 hover:text-accent-700"
                            >
                              {fullName(emp)}
                            </button>
                            <p className="max-w-[180px] truncate text-xs text-slate-500">{emp.work_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{emp.employee_code}</td>
                      <td className="px-4 py-2.5 text-slate-600">{emp.department?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{emp.designation?.title ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{EMPLOYMENT_TYPE_LABELS[emp.employment_type]}</td>
                      <td className="px-4 py-2.5 text-slate-600">{emp.work_location?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatDate(emp.joining_date)}</td>
                      <td className="px-4 py-2.5"><EmployeeStatusBadge status={emp.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / card view */}
            <div className={cn('grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3', view === 'table' && 'md:hidden')}>
              {directory.data.rows.map((emp) => (
                <EmployeeCard key={emp.id} employee={emp} onOpen={() => navigate(`/people/${emp.id}`)} />
              ))}
            </div>

            <Pagination page={page} pageSize={PAGE_SIZE} total={directory.data.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <EmployeeFormDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function EmployeeCard({ employee, onOpen }: { employee: EmployeeWithRelations; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-panel"
    >
      <div className="flex items-start gap-3">
        <Avatar name={fullName(employee)} src={employee.avatar_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{fullName(employee)}</p>
          <p className="truncate font-mono text-xs text-slate-400">{employee.employee_code}</p>
        </div>
        <EmployeeStatusBadge status={employee.status} />
      </div>
      <dl className="mt-3 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between gap-2">
          <dt>Designation</dt>
          <dd className="truncate text-right font-medium text-slate-700">{employee.designation?.title ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Department</dt>
          <dd className="truncate text-right font-medium text-slate-700">{employee.department?.name ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Location</dt>
          <dd className="truncate text-right font-medium text-slate-700">{employee.work_location?.name ?? '—'}</dd>
        </div>
      </dl>
    </button>
  )
}
