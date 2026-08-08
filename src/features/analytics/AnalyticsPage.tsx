import {
  Activity,
  BriefcaseBusiness,
  CalendarOff,
  Star,
  Users,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { KpiCard } from '../../components/ui/KpiCard'
import { ChartCard } from '../../components/ui/Card'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/states'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useHeadcountStats, useWorkforceByDepartment } from '../../hooks/useDashboard'
import { useLatestAttendanceRate } from '../../hooks/useAttendance'
import { useOnLeaveToday } from '../../hooks/useLeave'
import { useRecruitmentDashboard } from '../../hooks/useRecruitment'
import { useLatestPayroll } from '../../hooks/usePayroll'
import {
  useAttendanceBreakdown,
  useLeaveOverview,
  usePayrollAnalytics,
  usePerformanceAnalytics,
  useWorkforceAnalytics,
} from '../../hooks/useAnalytics'
import { formatRating } from '../../lib/performance'
import { formatPeriod } from '../../lib/payroll'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'
import { WorkforceDonut } from '../dashboard/charts'
import { AttendanceStackedChart, BarList, PayrollTrendChart } from './charts'

export function AnalyticsPage() {
  const { format } = useCurrency()

  const headcount = useHeadcountStats()
  const attendanceRate = useLatestAttendanceRate()
  const onLeave = useOnLeaveToday()
  const recruitment = useRecruitmentDashboard()
  const latestPayroll = useLatestPayroll()
  const workforceDept = useWorkforceByDepartment()
  const workforce = useWorkforceAnalytics()
  const attendance = useAttendanceBreakdown()
  const leave = useLeaveOverview()
  const performance = usePerformanceAnalytics()
  const payroll = usePayrollAnalytics()

  const hires = recruitment.data?.pipeline.find((p) => p.stage === 'Hired')?.count ?? 0
  const totalCandidates = (recruitment.data?.pipeline ?? []).reduce((s, p) => s + p.count, 0)

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Live HR analytics across people, time, recruitment, performance and payroll"
      />

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total Employees"
          value={headcount.data?.total}
          icon={Users}
          hint="Current workforce, excluding archived"
          loading={headcount.isPending}
          error={headcount.isError}
        />
        <KpiCard
          label="Attendance Rate"
          value={
            attendanceRate.data?.rate === null || attendanceRate.data?.rate === undefined
              ? undefined
              : `${attendanceRate.data.rate}%`
          }
          icon={Activity}
          hint={
            attendanceRate.data?.date
              ? `Latest working day (${formatDate(attendanceRate.data.date)})`
              : 'Latest working day'
          }
          loading={attendanceRate.isPending}
          error={attendanceRate.isError}
        />
        <KpiCard
          label="Employees On Leave"
          value={onLeave.data}
          icon={CalendarOff}
          hint="Approved leave covering today"
          loading={onLeave.isPending}
          error={onLeave.isError}
        />
        <KpiCard
          label="Open Vacancies"
          value={recruitment.data?.openPositions}
          icon={BriefcaseBusiness}
          hint={
            recruitment.data
              ? `Across ${recruitment.data.openJobs} open role${recruitment.data.openJobs === 1 ? '' : 's'}`
              : undefined
          }
          loading={recruitment.isPending}
          error={recruitment.isError}
        />
        <KpiCard
          label="Average Performance Rating"
          value={
            performance.data?.averageRating != null
              ? formatRating(performance.data.averageRating)
              : undefined
          }
          icon={Star}
          hint={
            performance.data ? `${performance.data.completedReviews} completed reviews` : undefined
          }
          loading={performance.isPending}
          error={performance.isError}
        />
        <KpiCard
          label="Latest Payroll"
          value={
            latestPayroll.data ? format(latestPayroll.data.total_net, { compact: true }) : undefined
          }
          icon={Wallet}
          hint={
            latestPayroll.data
              ? `Net · ${formatPeriod(latestPayroll.data.period_month)}`
              : 'No payroll runs yet'
          }
          loading={latestPayroll.isPending}
          error={latestPayroll.isError}
        />
      </div>

      {/* Workforce */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Workforce by Department" subtitle="Current headcount distribution">
          {workforceDept.isPending ? (
            <Skeleton className="h-64" />
          ) : workforceDept.isError ? (
            <ErrorState onRetry={() => void workforceDept.refetch()} />
          ) : (
            <WorkforceDonut data={workforceDept.data} />
          )}
        </ChartCard>
        <ChartCard title="Employment Status" subtitle="All employee records">
          {workforce.isPending ? (
            <Skeleton className="h-64" />
          ) : workforce.isError ? (
            <ErrorState onRetry={() => void workforce.refetch()} />
          ) : (
            <BarList items={workforce.data.employmentStatus.map((s) => ({ label: s.label, value: s.count }))} />
          )}
        </ChartCard>
        <ChartCard title="Location Distribution" subtitle="Current workforce by work location">
          {workforce.isPending ? (
            <Skeleton className="h-64" />
          ) : workforce.isError ? (
            <ErrorState onRetry={() => void workforce.refetch()} />
          ) : (
            <BarList items={workforce.data.byLocation.map((l) => ({ label: l.label, value: l.count }))} />
          )}
        </ChartCard>
      </div>

      {/* Attendance + Leave */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Attendance Mix" subtitle="Daily status breakdown, recent working days">
            {attendance.isPending ? (
              <Skeleton className="h-64" />
            ) : attendance.isError ? (
              <ErrorState onRetry={() => void attendance.refetch()} />
            ) : (
              <AttendanceStackedChart data={attendance.data} />
            )}
          </ChartCard>
        </div>
        <ChartCard title="Leave Overview" subtitle="All leave requests by status">
          {leave.isPending ? (
            <Skeleton className="h-40" />
          ) : leave.isError ? (
            <ErrorState onRetry={() => void leave.refetch()} />
          ) : (
            <div className="grid grid-cols-1 gap-3 py-2">
              <LeaveStat label="Pending" value={leave.data.pending} tone="text-amber-600" />
              <LeaveStat label="Approved" value={leave.data.approved} tone="text-emerald-600" />
              <LeaveStat label="Rejected" value={leave.data.rejected} tone="text-red-600" />
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recruitment */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Candidate Pipeline" subtitle="Live candidate stages">
            {recruitment.isPending ? (
              <Skeleton className="h-64" />
            ) : recruitment.isError ? (
              <ErrorState onRetry={() => void recruitment.refetch()} />
            ) : (
              <BarList items={recruitment.data.pipeline.map((p) => ({ label: p.stage, value: p.count }))} />
            )}
          </ChartCard>
        </div>
        <ChartCard title="Hiring Snapshot" subtitle="Recruitment at a glance">
          {recruitment.isPending ? (
            <Skeleton className="h-40" />
          ) : recruitment.isError ? (
            <ErrorState onRetry={() => void recruitment.refetch()} />
          ) : (
            <div className="grid grid-cols-2 gap-3 py-2">
              <LeaveStat label="Open Roles" value={recruitment.data.openJobs} tone="text-slate-900" />
              <LeaveStat label="Candidates" value={totalCandidates} tone="text-accent-600" />
              <LeaveStat
                label="Offers"
                value={recruitment.data.pipeline.find((p) => p.stage === 'Offer')?.count ?? 0}
                tone="text-amber-600"
              />
              <LeaveStat label="Hires" value={hires} tone="text-emerald-600" />
            </div>
          )}
        </ChartCard>
      </div>

      {/* Performance */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Rating Distribution" subtitle="Completed reviews by interpretation band">
          {performance.isPending ? (
            <Skeleton className="h-64" />
          ) : performance.isError ? (
            <ErrorState onRetry={() => void performance.refetch()} />
          ) : (
            <BarList
              items={performance.data.distribution
                .filter((b) => b.label !== 'Unsatisfactory' || b.count > 0)
                .map((b) => ({ label: b.label, value: b.count }))}
            />
          )}
        </ChartCard>
        <ChartCard title="Goal Progress" subtitle="All goals by status">
          {performance.isPending ? (
            <Skeleton className="h-64" />
          ) : performance.isError ? (
            <ErrorState onRetry={() => void performance.refetch()} />
          ) : (
            <BarList items={performance.data.goals.map((g) => ({ label: g.label, value: g.count }))} />
          )}
        </ChartCard>
      </div>

      {/* Payroll (HR admin only — the whole page is admin-gated) */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Payroll Trend" subtitle="Gross vs net across recent runs">
          {payroll.isPending ? (
            <Skeleton className="h-64" />
          ) : payroll.isError ? (
            <ErrorState onRetry={() => void payroll.refetch()} />
          ) : (
            <PayrollTrendChart data={payroll.data.trend} />
          )}
        </ChartCard>
        <ChartCard title="Payroll by Department" subtitle="Latest run — net pay">
          {payroll.isPending ? (
            <Skeleton className="h-64" />
          ) : payroll.isError ? (
            <ErrorState onRetry={() => void payroll.refetch()} />
          ) : (
            <PayrollByDepartment items={payroll.data.byDepartment} />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

function LeaveStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-4">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-2xl font-semibold', tone)}>{value}</p>
    </Card>
  )
}

function PayrollByDepartment({ items }: { items: Array<{ group: string; total: number }> }) {
  const { format } = useCurrency()
  return (
    <BarList
      items={items.map((d) => ({ label: d.group, value: d.total }))}
      formatValue={(value) => format(value, { compact: true })}
    />
  )
}
