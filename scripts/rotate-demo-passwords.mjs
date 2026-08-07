/**
 * One-time admin task: rotate the two demo users' passwords in place
 * (same auth UUIDs) via supabase.auth.admin.updateUserById().
 *
 * Reads from environment ONLY — nothing is read from or written to any file,
 * and no secret is ever printed:
 *   ROTATE_SUPABASE_URL           project URL
 *   ROTATE_SERVICE_ROLE_KEY       service-role key (session env only)
 *   ROTATE_ADMIN_EMAIL / ROTATE_ADMIN_PASSWORD     HR admin + new password
 *   ROTATE_MANAGER_EMAIL / ROTATE_MANAGER_PASSWORD manager + new password
 *
 * Output is limited to pass/fail per user.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.ROTATE_SUPABASE_URL
const serviceKey = process.env.ROTATE_SERVICE_ROLE_KEY
const targets = [
  { email: process.env.ROTATE_ADMIN_EMAIL, password: process.env.ROTATE_ADMIN_PASSWORD, label: 'hr-admin' },
  { email: process.env.ROTATE_MANAGER_EMAIL, password: process.env.ROTATE_MANAGER_PASSWORD, label: 'manager' },
]

if (!url || !serviceKey || targets.some((t) => !t.email || !t.password)) {
  console.error('Missing required ROTATE_* environment variables.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let failed = false
const { data: userList, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (listError) {
  console.error('Could not list users:', listError.message)
  process.exit(1)
}

for (const target of targets) {
  const user = userList.users.find(
    (u) => u.email?.toLowerCase() === target.email.toLowerCase(),
  )
  if (!user) {
    console.error(`[${target.label}] user not found — no changes made for this user`)
    failed = true
    continue
  }
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: target.password })
  if (error) {
    console.error(`[${target.label}] password update FAILED: ${error.message}`)
    failed = true
  } else {
    console.log(`[${target.label}] password updated (uuid unchanged: ${user.id.slice(0, 8)}…)`)
  }
}

process.exit(failed ? 1 : 0)
