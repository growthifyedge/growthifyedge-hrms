import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { Tabs } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { AttendanceTab } from './AttendanceTab'
import { LeaveTab } from './LeaveTab'
import { AttendanceFormDrawer } from './AttendanceFormDrawer'
import { LeaveRequestDrawer } from './LeaveRequestDrawer'
import { FaceAttendanceDemo } from './FaceAttendanceDemo'
import { useLatestAttendanceDate } from '../../hooks/useAttendance'
import type { AttendanceRecordWithEmployee } from '../../types/db'

const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'leave', label: 'Leave' },
]

export function TimeLeavePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'hr_admin'
  const [tab, setTab] = useState('attendance')

  const [markOpen, setMarkOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<AttendanceRecordWithEmployee | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const latestDate = useLatestAttendanceDate()

  // Shared attendance date (filter + demo panel use the same selection).
  const [dateOverride, setDateOverride] = useState('')
  const attendanceDate = dateOverride || latestDate.data || null

  // Portfolio-only Face Attendance DEMO: hidden behind ?attendanceDemo=1
  // and strictly HR-admin (managers/employees never see it, even with the
  // query parameter). Normal /time-leave is completely unchanged.
  const [searchParams] = useSearchParams()
  const showFaceDemo = isAdmin && searchParams.get('attendanceDemo') === '1'

  return (
    <div>
      <PageHeader
        title="Time & Leave"
        subtitle={
          isAdmin
            ? 'Attendance and leave management across the organization'
            : 'Attendance and leave for you and your team'
        }
        actions={
          isAdmin ? (
            tab === 'attendance' ? (
              <Button onClick={() => setMarkOpen(true)}>
                <ClipboardCheck className="h-4 w-4" aria-hidden /> Mark Attendance
              </Button>
            ) : (
              <Button onClick={() => setRequestOpen(true)}>
                <CalendarPlus className="h-4 w-4" aria-hidden /> New Request
              </Button>
            )
          ) : undefined
        }
      />

      <div className="mb-5">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'attendance' && (
        <>
          {showFaceDemo && <FaceAttendanceDemo date={attendanceDate} />}
          <AttendanceTab
            onEdit={(record) => setEditRecord(record)}
            date={attendanceDate}
            onDateChange={setDateOverride}
          />
        </>
      )}
      {tab === 'leave' && <LeaveTab />}

      {isAdmin && (
        <>
          <AttendanceFormDrawer
            open={markOpen}
            onClose={() => setMarkOpen(false)}
            defaultDate={latestDate.data ?? undefined}
          />
          <AttendanceFormDrawer
            open={!!editRecord}
            onClose={() => setEditRecord(null)}
            record={editRecord}
          />
          <LeaveRequestDrawer open={requestOpen} onClose={() => setRequestOpen(false)} />
        </>
      )}
    </div>
  )
}
