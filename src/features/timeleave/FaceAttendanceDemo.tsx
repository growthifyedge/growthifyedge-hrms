import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Play, ScanFace } from 'lucide-react'
import { formatISO } from 'date-fns'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { useManagerOptions } from '../../hooks/useLookups'
import { useAttendanceForDate } from '../../hooks/useAttendance'
import { getSupabase } from '../../lib/supabase'
import {
  FACE_DEMO_NOTE,
  FACE_DEMO_SEQUENCE,
  pickDemoEmployees,
} from '../../lib/faceDemo'
import { formatTime } from '../../lib/timeLeave'
import { cn } from '../../lib/utils'

/**
 * Portfolio-only Face Attendance DEMO panel (see lib/faceDemo.ts).
 * Simulates a face-recognition terminal pushing check-ins into the
 * EXISTING attendance system. No camera, no biometrics, no new tables.
 * Rendered only for HR admins on /time-leave?attendanceDemo=1.
 */

interface DemoEvent {
  name: string
  time: string
  statusLabel: 'Present' | 'Late'
}

type Phase = 'idle' | 'detecting' | 'verified' | 'recorded' | 'complete' | 'blocked'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function FaceAttendanceDemo({ date }: { date: string | null }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const employees = useManagerOptions()
  const effectiveDate = date ?? formatISO(new Date(), { representation: 'date' })
  const records = useAttendanceForDate(effectiveDate)

  const [phase, setPhase] = useState<Phase>('idle')
  const [currentName, setCurrentName] = useState<string | null>(null)
  const [events, setEvents] = useState<DemoEvent[]>([])
  const [running, setRunning] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const eligible = useMemo(() => {
    const taken = new Set((records.data ?? []).map((r) => r.employee_id))
    return pickDemoEmployees(employees.data ?? [], taken)
  }, [employees.data, records.data])

  async function startDemo() {
    if (running || !profile) return
    if (eligible.length === 0) {
      setPhase('blocked')
      return
    }
    setRunning(true)
    setEvents([])
    const picks = eligible.slice(0, FACE_DEMO_SEQUENCE.length)

    for (let i = 0; i < picks.length; i++) {
      if (cancelledRef.current) return
      const employee = picks[i]
      const step = FACE_DEMO_SEQUENCE[i]
      const name = `${employee.first_name} ${employee.last_name}`

      setCurrentName(name)
      setPhase('detecting')
      await sleep(700)
      if (cancelledRef.current) return
      setPhase('verified')
      await sleep(500)
      if (cancelledRef.current) return

      // Plain INSERT (never upsert): the unique employee/date constraint
      // guarantees existing attendance is never overwritten by the demo.
      const { error } = await getSupabase().from('attendance_records').insert({
        organization_id: profile.organization_id,
        employee_id: employee.id,
        attendance_date: effectiveDate,
        status: step.status,
        shift: 'standard',
        check_in: step.check_in,
        check_out: null, // arrival demo — worked hours stay derived as usual
        notes: FACE_DEMO_NOTE,
        marked_by: profile.id,
      })
      if (!error) {
        // Normal cache invalidation drives the live UI update — cards,
        // table and rate refresh without any page reload.
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['attendance'] }),
          qc.invalidateQueries({ queryKey: ['dashboard'] }),
        ])
        setEvents((prev) => [
          ...prev,
          { name, time: step.check_in, statusLabel: step.status === 'late' ? 'Late' : 'Present' },
        ])
      }
      setPhase('recorded')
      await sleep(800)
      if (cancelledRef.current) return
    }

    setCurrentName(null)
    setPhase('complete')
    setRunning(false)
  }

  const scanning = phase === 'detecting' || phase === 'verified'

  return (
    <Card className="mb-4 p-4" data-testid="face-attendance-demo">
      <div className="flex flex-wrap items-start gap-4">
        {/* Device identity */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white',
              scanning && 'after:absolute after:inset-0 after:animate-ping after:rounded-xl after:bg-accent-500/20',
            )}
          >
            <ScanFace className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Face Attendance
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              Main Entrance Face Terminal
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> Online
              </span>
              <span aria-hidden>·</span>
              <span>Auto Sync Enabled</span>
              <span aria-hidden>·</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                Demo Device
              </span>
            </p>
          </div>
        </div>

        {/* Live event area */}
        <div className="min-w-[220px] flex-1 text-sm">
          {phase === 'idle' && (
            <p className="text-xs text-slate-500">
              Simulated terminal — no camera or biometric data. Starts automatic check-ins for{' '}
              {Math.min(eligible.length, FACE_DEMO_SEQUENCE.length)} employees without attendance
              on the selected date.
            </p>
          )}
          {phase === 'blocked' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
              Most employees already have attendance for this date. Select another date to run
              the demo.
            </p>
          )}
          {scanning && currentName && (
            <p className="flex items-center gap-2 text-slate-700">
              <ScanFace className="h-4 w-4 animate-pulse text-accent-600" aria-hidden />
              {phase === 'detecting' ? 'Face detected…' : (
                <span>
                  <span className="font-semibold">{currentName}</span> · Face Verified
                </span>
              )}
            </p>
          )}
          {(phase === 'recorded' || phase === 'complete' || events.length > 0) && (
            <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto pr-1">
              {events
                .slice()
                .reverse()
                .map((event) => (
                  <li key={event.name} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
                    <span className="truncate">
                      <span className="font-medium text-slate-800">{event.name}</span> · Face
                      Verified · {formatTime(event.time)} · {event.statusLabel} · Attendance
                      recorded
                    </span>
                  </li>
                ))}
            </ul>
          )}
          {phase === 'complete' && (
            <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              Demo Complete — {events.length} employees verified, attendance synchronized
              successfully.
            </p>
          )}
        </div>

        {/* Action */}
        <div className="shrink-0">
          {phase === 'complete' ? (
            eligible.length > 0 ? (
              <Button variant="secondary" onClick={() => void startDemo()}>
                <Play className="h-4 w-4" aria-hidden /> Run Again
              </Button>
            ) : null
          ) : (
            <Button onClick={() => void startDemo()} loading={running} disabled={records.isPending}>
              <Play className="h-4 w-4" aria-hidden /> Start Live Demo
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
