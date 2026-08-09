# Face Attendance Demo Simulator (portfolio only)

A hidden, video-friendly simulation of a face-recognition attendance
terminal feeding the existing attendance system.

**What it is NOT:** there is no camera access, no photo processing, no
facial recognition, and no biometric data of any kind is captured or
stored. "Face Verified" is a scripted terminal event. The panel
permanently displays **Demo Device** so the portfolio never
misrepresents physical hardware integration.

## Usage

1. Sign in as HR Admin.
2. Open `https://hrms.growthifyedge.com/time-leave?attendanceDemo=1`
   (normal `/time-leave` is completely unchanged; managers/employees
   never see the panel even with the parameter).
3. Pick an attendance date with free employees (e.g. today) and click
   **Start Live Demo**. Five employees are verified sequentially over
   ~10 seconds; each event inserts a normal `attendance_records` row
   (check-in only, Standard shift) and the summary cards, table and
   attendance rate update live via ordinary React Query invalidation.

## Implementation notes

- Reuses the existing attendance table, RLS and authenticated Supabase
  client — no new tables, no new dependencies, no service-role key.
- Never overwrites existing attendance: only employees WITHOUT a record
  on the selected date are eligible (plain INSERT; the unique
  employee/date constraint is the hard guarantee). If nobody is free, a
  message asks for another date.
- Simulator rows are tagged in the existing optional `notes` field with
  the internal marker `[DEMO_FACE_TERMINAL]` (never rendered raw); the
  UI derives a small **Face Terminal** badge from it and the edit drawer
  strips it. `supabase/cleanup_e2e.sql` deletes all simulator rows.
- Core logic in `src/lib/faceDemo.ts` (unit-tested) and
  `src/features/timeleave/FaceAttendanceDemo.tsx`.
- A future physical device integration would replace this simulator with
  a real integration layer writing through the same attendance path.
