import {
  Users,
  UserCheck,
  CalendarOff,
  Activity,
  BriefcaseBusiness,
  UserPlus,
  Wallet,
  ListTodo,
  Megaphone,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { KpiCard } from '../../components/ui/KpiCard'
import { Card, ChartCard } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState, ErrorState } from '../../components/ui/states'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrency } from '../../contexts/CurrencyContext'
import { formatDate } from '../../lib/format'
import {
  useAnnouncements,
  useDemoMetrics,
  useHeadcountStats,
  usePayrollStats,
  useRecentHires,
  useWorkforceByDepartment,
} from '../../hooks/useDashboard'
import { useNavigate } from 'react-router-dom'
import {
  AttendanceTrendChart,
  PayrollByDepartmentChart,
  RecruitmentPipeline,
  WorkforceDonut,
} from './charts'

export function DashboardPage() {
  const { profile } = useAuth()
  const { format } = useCurrency()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'hr_admin'

  const headcount = useHeadcountStats()
  const payroll = usePayrollStats()
  const workforce = useWorkforceByDepartment()
  const recentHires = useRecentHires()
  const announcements = useAnnouncements()
  const demo = useDemoMetrics()

  const greeting = profile ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Welcome back'

  return (
    <div>
      <PageHeader
        title={profile ? (isAdmin ? 'Executive Overview' : 'Team Overview') : 'Overview'}
        subtitle={greeting}
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Employees"
          value={headcount.data?.total}
          icon={Users}
          hint={isAdmin ? 'Current workforce, excluding archived' : 'You and your direct reports'}
          loading={headcount.isPending}
          error={headcount.isError}
          onClick={() => navigate('/people')}
        />
        <KpiCard
          label="Active Employees"
          value={headcount.data?.active}
          icon={UserCheck}
          hint="Currently working"
          loading={headcount.isPending}
          error={headcount.isError}
        />
        <KpiCard
          label="On Leave Today"
          value={demo.data?.on_leave_today}
          icon={CalendarOff}
          hint="From leave calendar"
          loading={demo.isPending}
          error={demo.isError}
        />
        <KpiCard
          label="Attendance Rate"
          value={demo.data ? `${demo.data.attendance_rate}%` : undefined}
          icon={Activity}
          hint="Last 30 working days"
          loading={demo.isPending}
          error={demo.isError}
        />
        <KpiCard
          label="Open Vacancies"
          value={demo.data?.open_vacancies}
          icon={BriefcaseBusiness}
          hint="Recruitment in progress"
          loading={demo.isPending}
          error={demo.isError}
        />
        <KpiCard
          label="New Hires"
          value={headcount.data?.newHires30d}
          icon={UserPlus}
          hint="Joined in the last 30 days"
          loading={headcount.isPending}
          error={headcount.isError}
        />
        {isAdmin && (
          <KpiCard
            label="Monthly Payroll Estimate"
            value={payroll.data ? format(payroll.data.monthlyTotalUsd, { compact: true }) : undefined}
            icon={Wallet}
            hint="Estimated gross, current staff"
            loading={payroll.isPending}
            error={payroll.isError}
          />
        )}
        <KpiCard
          label="Pending HR Actions"
          value={demo.data?.pending_hr_actions}
          icon={ListTodo}
          hint="Awaiting review"
          loading={demo.isPending}
          error={demo.isError}
        />
      </div>

      {/* Charts row */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Workforce by Department" subtitle="Current headcount distribution">
          {workforce.isPending ? (
            <Skeleton className="h-64" />
          ) : workforce.isError ? (
            <ErrorState onRetry={() => void workforce.refetch()} />
          ) : (
            <WorkforceDonut data={workforce.data} />
          )}
        </ChartCard>
        <ChartCard title="Attendance Trend" subtitle="Recent working days (demo data)">
          {demo.isPending ? (
            <Skeleton className="h-64" />
          ) : demo.isError ? (
            <ErrorState onRetry={() => void demo.refetch()} />
          ) : (
            <AttendanceTrendChart data={demo.data?.attendance_trend ?? []} />
          )}
        </ChartCard>
        {isAdmin && (
          <ChartCard title="Payroll by Department" subtitle="Estimated monthly cost">
            {payroll.isPending ? (
              <Skeleton className="h-64" />
            ) : payroll.isError ? (
              <ErrorState onRetry={() => void payroll.refetch()} />
            ) : (
              <PayrollByDepartmentChart data={payroll.data.byDepartment} />
            )}
          </ChartCard>
        )}
        <ChartCard title="Recruitment Pipeline" subtitle="Current openings (demo data)">
          {demo.isPending ? (
            <Skeleton className="h-64" />
          ) : demo.isError ? (
            <ErrorState onRetry={() => void demo.refetch()} />
          ) : (
            <RecruitmentPipeline data={demo.data?.recruitment_pipeline ?? []} />
          )}
        </ChartCard>
      </div>

      {/* Lists row */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Recent Hires</h3>
          {recentHires.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : recentHires.isError ? (
            <ErrorState onRetry={() => void recentHires.refetch()} />
          ) : recentHires.data.length === 0 ? (
            <EmptyState title="No recent hires" />
          ) : (
            <ul className="space-y-3">
              {recentHires.data.map((hire) => (
                <li key={hire.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/people/${hire.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg p-1 text-left hover:bg-slate-50"
                  >
                    <Avatar name={`${hire.first_name} ${hire.last_name}`} src={hire.avatar_url} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {hire.first_name} {hire.last_name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {hire.designation?.title ?? '—'} · {hire.department?.name ?? '—'}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(hire.joining_date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isAdmin && (
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Pending Actions</h3>
            {demo.isPending ? (
              <Skeleton className="h-40" />
            ) : demo.isError ? (
              <ErrorState onRetry={() => void demo.refetch()} />
            ) : !demo.data?.pending_actions || demo.data.pending_actions.length === 0 ? (
              <EmptyState title="All caught up" message="No pending HR actions right now." />
            ) : (
              <ul className="space-y-3">
                {demo.data.pending_actions.map((action) => (
                  <li key={action.id} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-500" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{action.label}</p>
                      <p className="truncate text-xs text-slate-500">{action.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Megaphone className="h-4 w-4 text-accent-600" aria-hidden /> Announcements
          </h3>
          {announcements.isPending ? (
            <Skeleton className="h-40" />
          ) : announcements.isError ? (
            <ErrorState onRetry={() => void announcements.refetch()} />
          ) : announcements.data.length === 0 ? (
            <EmptyState title="No announcements" />
          ) : (
            <ul className="space-y-4">
              {announcements.data.map((a) => (
                <li key={a.id}>
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{a.content}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{formatDate(a.published_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
