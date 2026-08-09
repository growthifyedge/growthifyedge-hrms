import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ShieldAlert } from 'lucide-react'
import { getSupabase } from '../../lib/supabase'
import {
  clearPasswordRecovery,
  isPasswordRecoveryActive,
  subscribePasswordRecovery,
} from '../../lib/passwordRecovery'
import { getErrorMessage } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'
import { AuthCardShell } from './AuthCardShell'
import { validateNewPassword } from './passwordRules'

/**
 * Landing page for Supabase recovery links. The password form renders ONLY
 * once supabase-js has emitted PASSWORD_RECOVERY for this page load (see
 * lib/passwordRecovery.ts). Direct visits, normal signed-in sessions and
 * invalid/expired links all get the invalid-link state instead — normal
 * authenticated password changes live in Settings → Security.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  // Ensure the client exists (and its recovery listener is attached) even
  // when this page is the first thing loaded from a recovery link.
  getSupabase()

  const [recoveryReady, setRecoveryReady] = useState(isPasswordRecoveryActive)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Covers the race where PASSWORD_RECOVERY fires after mount (Supabase
    // may still be processing the URL when the component first renders).
    return subscribePasswordRecovery(setRecoveryReady)
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const validation = validateNewPassword(password, confirm)
    if (validation) {
      setError(validation)
      return
    }
    setSubmitting(true)
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password })
      if (updateError) throw updateError
      // Recovery is single-use: clear the gate and drop the session so the
      // user returns to a clean login.
      clearPasswordRecovery()
      await getSupabase().auth.signOut()
      setDone(true)
    } catch (err) {
      const message = getErrorMessage(err)
      setError(
        /session|jwt|token|missing/i.test(message)
          ? 'This reset link is invalid or has expired. Please request a new one.'
          : /same password|different from the old/i.test(message)
            ? 'The new password must be different from your current password.'
            : 'Could not update the password. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthCardShell title="Password updated" subtitle="Your password has been changed.">
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Your password has been updated. Sign in with your new password.
          </p>
          <Button className="w-full py-2.5" onClick={() => navigate('/login')}>
            Back to Sign In
          </Button>
        </div>
      </AuthCardShell>
    )
  }

  if (!recoveryReady) {
    return (
      <AuthCardShell
        title="Reset link invalid or expired"
        subtitle="This page only works from a password reset email."
      >
        <div className="space-y-4">
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Your reset link is invalid, has expired, or you opened this page directly. Request a
            new link below. Signed-in users can change their password in Settings → Security.
          </p>
          <Link to="/forgot-password" className="block">
            <Button className="w-full py-2.5">Request a new reset link</Button>
          </Link>
          <p className="text-center">
            <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-accent-700">
              Back to Sign In
            </Link>
          </p>
        </div>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell title="Choose a new password" subtitle="Set the new password for your account.">
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters with one letter and one number"
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}{' '}
            {/invalid or has expired/.test(error) && (
              <Link to="/forgot-password" className="font-medium underline underline-offset-2">
                Request a new link
              </Link>
            )}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full py-2.5">
          Update password
        </Button>
      </form>
    </AuthCardShell>
  )
}
