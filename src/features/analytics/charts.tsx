import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCurrency } from '../../contexts/CurrencyContext'
import { EmptyState } from '../../components/ui/states'
import { formatPeriod } from '../../lib/payroll'
import type { AttendanceDayBreakdown } from '../../lib/analytics'

const COLORS = {
  present: '#5ba85f',
  late: '#f0a04b',
  remote: '#3b74d9',
  absent: '#e26d7a',
  gross: '#8ba3c2',
  net: '#3b74d9',
}

const PALETTE = ['#3b74d9', '#38a3a5', '#f0a04b', '#8b6fc0', '#e26d7a', '#5ba85f', '#8ba3c2']

/** Stacked daily attendance mix (present/late/remote/absent). */
export function AttendanceStackedChart({ data }: { data: AttendanceDayBreakdown[] }) {
  if (data.length === 0) return <EmptyState title="No attendance data" />
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="present" name="Present" stackId="a" fill={COLORS.present} />
          <Bar dataKey="late" name="Late" stackId="a" fill={COLORS.late} />
          <Bar dataKey="remote" name="Remote" stackId="a" fill={COLORS.remote} />
          <Bar dataKey="absent" name="Absent" stackId="a" fill={COLORS.absent} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {(['present', 'late', 'remote', 'absent'] as const).map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COLORS[key] }} aria-hidden />
            {key[0].toUpperCase() + key.slice(1)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Gross vs net across recent payroll runs (converted for display). */
export function PayrollTrendChart({ data }: { data: Array<{ period: string; gross: number; net: number }> }) {
  const { format, convert } = useCurrency()
  if (data.length === 0) return <EmptyState title="No payroll runs yet" />
  const chartData = data.map((d) => ({
    label: formatPeriod(d.period).split(' ')[0].slice(0, 3),
    grossDisplay: convert(d.gross),
    netDisplay: convert(d.net),
    gross: d.gross,
    net: d.net,
  }))
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => Intl.NumberFormat('en-US', { notation: 'compact' }).format(v)}
          />
          <Tooltip
            formatter={(_value, name, item) => {
              const payload = item?.payload as { gross: number; net: number }
              return name === 'Gross'
                ? [format(payload.gross, { compact: true }), 'Gross']
                : [format(payload.net, { compact: true }), 'Net']
            }}
          />
          <Bar dataKey="grossDisplay" name="Gross" fill={COLORS.gross} radius={[3, 3, 0, 0]} barSize={18} />
          <Bar dataKey="netDisplay" name="Net" fill={COLORS.net} radius={[3, 3, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Compact horizontal bar list (shared pattern with the dashboard pipeline). */
export function BarList({
  items,
  formatValue,
}: {
  items: Array<{ label: string; value: number }>
  formatValue?: (value: number) => string
}) {
  if (items.length === 0) return <EmptyState title="No data" />
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-3 py-2">
      {items.map((item, i) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-medium text-slate-800">
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
