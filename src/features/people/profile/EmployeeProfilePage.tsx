import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, Pencil } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { EmployeeStatusBadge } from '../../../components/ui/StatusBadge'
import { Tabs } from '../../../components/ui/Tabs'
import { Skeleton } from '../../../components/ui/Skeleton'
import { ComingSoon, EmptyState, ErrorState } from '../../../components/ui/states'
import { MoneyDisplay } from '../../../components/ui/MoneyDisplay'
import { useAuth } from '../../../contexts/AuthContext'
import {
  useEmergencyContact,
  useEmployee,
  useEmployeeCompensation,
} from '../../../hooks/useEmployees'
import { useDemoMetrics } from '../../../hooks/useDashboard'
import {
  EMPLOYMENT_TYPE_LABELS,
  PAY_FREQUENCY_LABELS,
  formatDate,
  fullName,
} from '../../../lib/format'
import { estimatedNetUsd } from '../../../lib/currency'
import { EmployeeFormDrawer } from '../EmployeeFormDrawer'
import { DocumentsTab } from './DocumentsTab'
import type { EmployeeCompensation } from '../../../types/db'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'employment', label: 'Employment' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
  { key: 'performance', label: 'Performance' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'documents', label: 'Documents' },
]

export function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)

  const employee = useEmployee(employeeId)
  const compensation = useEmployeeCompensation(employeeId)
  const emergencyContact = useEmergencyContact(employeeId)

  if (employee.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (employee.isError) {
    return (
      <Card>
        <ErrorState
          title="Could not load this employee"
          message="You may not have access to this record, or the connection failed."
          onRetry={() => void employee.refetch()}
        />
      </Card>
    )
  }

  if (!employee.data) {
    return (
      <Card>
        <EmptyState
          title="Employee not found"
          message="This employee does not exist or you do not have permission to view them."
          action={
            <Link to="/people" className="text-sm font-medium text-accent-700 hover:underline">
              Back to People
            </Link>
          }
        />
      </Card>
    )
  }

  const emp = employee.data
  const comp = compensation.data ?? null

  return (
    <div>
      <Link
        to="/people"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to People
      </Link>

      {/* Header card */}
      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={fullName(emp)} src={emp.avatar_url} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-slate-900">{fullName(emp)}</h2>
              <EmployeeStatusBadge status={emp.status} />
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              {emp.designation?.title ?? '—'} · {emp.department?.name ?? '—'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
              <span className="font-mono text-xs">{emp.employee_code}</span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" aria-hidden /> {emp.work_email}
              </span>
              {emp.work_location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {emp.work_location.name}, {emp.work_location.city}
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit Employee
            </Button>
          )}
        </div>
      </Card>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-5">
        {tab === 'overview' && <OverviewTab emp={emp} emergencyContact={emergencyContact.data ?? null} comp={comp} />}
        {tab === 'employment' && <EmploymentTab emp={emp} comp={comp} />}
        {tab === 'attendance' && <AttendanceTab />}
        {tab === 'leave' && (
          <Card><ComingSoon module="Leave management" /></Card>
        )}
        {tab === 'performance' && (
          <Card><ComingSoon module="Performance reviews" /></Card>
        )}
        {tab === 'payroll' && <PayrollTab comp={comp} loading={compensation.isPending} />}
        {tab === 'documents' && <DocumentsTab employee={emp} />}
      </div>

      {isAdmin && (
        <EmployeeFormDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          employee={emp}
          compensation={comp}
          emergencyContact={emergencyContact.data ?? null}
        />
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value ?? '—'}</dd>
    </div>
  )
}

function profileCompleteness(emp: {
  phone: string | null
  country: string | null
  city: string | null
  avatar_url: string | null
  manager_id: string | null
  department_id: string | null
  designation_id: string | null
  work_location_id: string | null
}, hasEc: boolean, hasComp: boolean): number {
  const checks = [
    !!emp.phone,
    !!emp.country,
    !!emp.city,
    !!emp.department_id,
    !!emp.designation_id,
    !!emp.work_location_id,
    hasEc,
    hasComp,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function OverviewTab({
  emp,
  emergencyContact,
  comp,
}: {
  emp: NonNullable<ReturnType<typeof useEmployee>['data']>
  emergencyContact: { contact_name: string; relationship: string; phone: string } | null
  comp: EmployeeCompensation | null
}) {
  const completeness = profileCompleteness(emp, !!emergencyContact, !!comp)
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Contact & Location</h3>
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Work email" value={emp.work_email} />
          <DetailRow label="Phone" value={emp.phone} />
          <DetailRow label="Country" value={emp.country} />
          <DetailRow label="City" value={emp.city} />
          <DetailRow label="Work location" value={emp.work_location ? `${emp.work_location.name} — ${emp.work_location.city}, ${emp.work_location.country}` : null} />
        </dl>
      </Card>
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Employment Summary</h3>
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Manager" value={emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : 'No manager'} />
          <DetailRow label="Joining date" value={formatDate(emp.joining_date)} />
          <DetailRow label="Employment type" value={EMPLOYMENT_TYPE_LABELS[emp.employment_type]} />
        </dl>
        <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-800">Emergency Contact</h3>
        {emergencyContact ? (
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Name" value={emergencyContact.contact_name} />
            <DetailRow label="Relationship" value={emergencyContact.relationship} />
            <DetailRow label="Phone" value={emergencyContact.phone} />
          </dl>
        ) : (
          <p className="py-2 text-sm text-slate-500">No emergency contact on file.</p>
        )}
      </Card>
      <Card className="p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Profile completeness</h3>
          <span className="text-sm font-semibold text-slate-800">{completeness}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
          <div className="h-full rounded-full bg-accent-600" style={{ width: `${completeness}%` }} />
        </div>
      </Card>
    </div>
  )
}

function EmploymentTab({
  emp,
  comp,
}: {
  emp: NonNullable<ReturnType<typeof useEmployee>['data']>
  comp: EmployeeCompensation | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Position</h3>
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Department" value={emp.department?.name} />
          <DetailRow label="Designation" value={emp.designation?.title} />
          <DetailRow label="Manager" value={emp.manager ? `${emp.manager.first_name} ${emp.manager.last_name}` : 'No manager'} />
          <DetailRow label="Employment status" value={<EmployeeStatusBadge status={emp.status} />} />
        </dl>
      </Card>
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Compensation</h3>
        {comp ? (
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Base salary" value={<MoneyDisplay amountUsd={comp.base_salary_usd} />} />
            <DetailRow label="Allowances" value={<MoneyDisplay amountUsd={comp.allowance_usd} />} />
            <DetailRow label="Bonus" value={<MoneyDisplay amountUsd={comp.bonus_usd} />} />
            <DetailRow label="Deductions" value={<MoneyDisplay amountUsd={comp.deduction_usd} />} />
            <DetailRow label="Pay frequency" value={PAY_FREQUENCY_LABELS[comp.pay_frequency]} />
          </dl>
        ) : (
          <p className="py-2 text-sm text-slate-500">No compensation record available.</p>
        )}
      </Card>
      <Card className="p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Employment timeline</h3>
        <ol className="relative ml-2 space-y-4 border-l border-slate-200 pl-5">
          <li>
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent-600" aria-hidden />
            <p className="text-sm font-medium text-slate-800">Joined {emp.department?.name ?? 'the organization'}</p>
            <p className="text-xs text-slate-500">{formatDate(emp.joining_date)}</p>
          </li>
          {comp && (
            <li>
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden />
              <p className="text-sm font-medium text-slate-800">Current compensation effective</p>
              <p className="text-xs text-slate-500">{formatDate(comp.effective_from)}</p>
            </li>
          )}
        </ol>
      </Card>
    </div>
  )
}

function AttendanceTab() {
  const demo = useDemoMetrics()
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Org attendance rate</p>
        {demo.isPending ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {demo.data ? `${demo.data.attendance_rate}%` : '—'}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500">Organization-wide, last 30 working days</p>
      </Card>
      <Card className="lg:col-span-2">
        <ComingSoon module="Individual attendance tracking" />
      </Card>
    </div>
  )
}

function PayrollTab({ comp, loading }: { comp: EmployeeCompensation | null; loading: boolean }) {
  if (loading) return <Skeleton className="h-56" />
  if (!comp) {
    return (
      <Card>
        <EmptyState title="No compensation record" message="Compensation has not been set up for this employee." />
      </Card>
    )
  }
  const net = estimatedNetUsd(comp)
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Pay breakdown</h3>
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Base salary" value={<MoneyDisplay amountUsd={comp.base_salary_usd} />} />
          <DetailRow label="Allowance" value={<MoneyDisplay amountUsd={comp.allowance_usd} />} />
          <DetailRow label="Bonus" value={<MoneyDisplay amountUsd={comp.bonus_usd} />} />
          <DetailRow label="Deduction" value={<MoneyDisplay amountUsd={comp.deduction_usd} />} />
        </dl>
      </Card>
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Estimated net</h3>
        <p className="text-3xl font-semibold text-slate-900">
          <MoneyDisplay amountUsd={net} />
        </p>
        <p className="mt-1 text-sm text-slate-500">
          per {PAY_FREQUENCY_LABELS[comp.pay_frequency].toLowerCase()} period
        </p>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
          This is a compensation overview, not processed payroll. Values are stored in USD and
          converted to your selected display currency.
        </p>
      </Card>
    </div>
  )
}
