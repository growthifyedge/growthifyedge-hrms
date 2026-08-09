import type { AttendanceStatus } from '../types/db'

/**
 * Face Attendance DEMO simulator (portfolio only).
 *
 * There is NO real face recognition anywhere in this app: no camera, no
 * photos, no biometric processing, no biometric storage. "Face Verified"
 * is a simulated terminal event so a video can demonstrate how a physical
 * attendance device WOULD feed the existing attendance system. Simulator
 * records are ordinary attendance_records rows tagged via the existing
 * optional notes field — no schema changes.
 */

export const FACE_DEMO_MARKER = '[DEMO_FACE_TERMINAL]'
export const FACE_DEMO_NOTE = `${FACE_DEMO_MARKER} Main Entrance Face Terminal`

/** True when an attendance record was created by the demo simulator. */
export function isFaceTerminalRecord(notes: string | null | undefined): boolean {
  return !!notes && notes.startsWith(FACE_DEMO_MARKER)
}

/** Notes without the internal marker — never show the raw tag to users. */
export function stripDemoMarker(notes: string | null | undefined): string {
  if (!notes) return ''
  if (!notes.startsWith(FACE_DEMO_MARKER)) return notes
  return notes.slice(FACE_DEMO_MARKER.length).trim()
}

/** Realistic arrival sequence: check-in only, mostly on time, some late. */
export const FACE_DEMO_SEQUENCE: Array<{ check_in: string; status: AttendanceStatus }> = [
  { check_in: '08:56', status: 'present' },
  { check_in: '08:58', status: 'present' },
  { check_in: '09:01', status: 'late' },
  { check_in: '09:03', status: 'late' },
  { check_in: '08:59', status: 'present' },
]

/**
 * Picks employees that do NOT already have attendance on the selected
 * date — the simulator must never overwrite existing records.
 */
export function pickDemoEmployees<T extends { id: string }>(
  employees: T[],
  employeeIdsWithRecords: Set<string>,
  count = FACE_DEMO_SEQUENCE.length,
): T[] {
  return employees.filter((e) => !employeeIdsWithRecords.has(e.id)).slice(0, count)
}
