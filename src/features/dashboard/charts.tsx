import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCurrency } from '../../contexts/CurrencyContext'
import { EmptyState } from '../../components/ui/states'
import type { PayrollByDepartment, WorkforceSlice } from '../../hooks/useDashboard'

const CHART_COLORS = ['#3b74d9', '#38a3a5', '#f0a04b', '#8b6fc0', '#e26d7a', '#5ba85f', '#8ba3c2']

export function WorkforceDonut({ data }: { data: WorkforceSlice[] }) {
  if (data.length === 0) return <EmptyState title="No workforce data" />
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="department"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} employees`, '']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:w-1/2 sm:grid-cols-1">
        {data.map((slice, i) => (
          <li key={slice.department} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-slate-600">{slice.department}</span>
            <span className="font-medium text-slate-800">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AttendanceTrendChart({ data }: { data: { day: string; rate: number }[] }) {
  if (data.length === 0) return <EmptyState title="No attendance data" />
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b74d9" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#3b74d9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[80, 100]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
          <Area type="monotone" dataKey="rate" stroke="#3b74d9" strokeWidth={2} fill="url(#attendanceFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PayrollByDepartmentChart({ data }: { data: PayrollByDepartment[] }) {
  const { format, convert } = useCurrency()
  if (data.length === 0) return <EmptyState title="No payroll data" />
  const chartData = data.map((d) => ({ ...d, display: convert(d.totalMonthlyUsd) }))
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="department"
            width={100}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(_value, _name, item) => [
              format((item?.payload as PayrollByDepartment).totalMonthlyUsd, { compact: true }),
              'Monthly',
            ]}
          />
          <Bar dataKey="display" fill="#3b74d9" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RecruitmentPipeline({ data }: { data: { stage: string; count: number }[] }) {
  if (data.length === 0) return <EmptyState title="No pipeline data" />
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <ul className="space-y-3 py-2">
      {data.map((stage, i) => (
        <li key={stage.stage}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-600">{stage.stage}</span>
            <span className="font-medium text-slate-800">{stage.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(stage.count / max) * 100}%`,
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
