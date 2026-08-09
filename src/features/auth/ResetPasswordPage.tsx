import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { getSupabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'
import { AuthCardShell } from './AuthCardShell'
import { validateNewPassword } from './passwordRules'

/**
 * Landing page for Supabase recovery links. The supabase-js client picks the
 * recovery session out of the URL automatically (PASSWORD_RECOVERY); this
 * page just needs a session to call updateUser with the new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    // Expired/used links arrive as #error=...&error_description=...
    const hash = window.location.hash
    if (/error=/.test(hash)) {
      setLinkError('This reset link is invalid or has expired. Please request a new one.')
    }
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
      // Recovery sessions should not linger — return the user to a clean login.
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

  return (
    <AuthCardShell title="Choose a new password" subtitle="Set the new password for your account.">
      {done ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Your password has been updated. Sign in with your new password.
          </p>
          <Button className="w-full py-2.5" onClick={() => navigate('/login')}>
            Back to Sign In
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          {linkError && (
            <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              {linkError}{' '}
              <Link to="/forgot-password" className="font-medium underline underline-offset-2">
                Request a new link
              </Link>
            </p>
          )}
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
      )}
    </AuthCardShell>
  )
}
