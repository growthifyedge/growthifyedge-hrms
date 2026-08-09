/**
 * In-memory password-recovery gate for /reset-password.
 *
 * The form must appear ONLY after supabase-js emits PASSWORD_RECOVERY —
 * i.e. a session established from a genuine recovery link. A normal
 * signed-in session is deliberately NOT sufficient, and the flag is never
 * persisted, so refreshing or visiting /reset-password directly always
 * shows the invalid/expired state instead of the form.
 *
 * The listener is attached in getSupabase() immediately after client
 * creation — before detectSessionInUrl finishes processing the URL — so
 * the event cannot be missed by late-mounting components.
 */

let recoveryActive = false
const listeners = new Set<(active: boolean) => void>()

function notify() {
  for (const listener of listeners) listener(recoveryActive)
}

export function markPasswordRecovery(): void {
  recoveryActive = true
  notify()
}

export function clearPasswordRecovery(): void {
  recoveryActive = false
  notify()
}

export function isPasswordRecoveryActive(): boolean {
  return recoveryActive
}

/** Subscribe to changes; returns an unsubscribe function. */
export function subscribePasswordRecovery(listener: (active: boolean) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
