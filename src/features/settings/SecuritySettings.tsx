import { useState, type FormEvent } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'
import { useToast } from '../../contexts/ToastContext'
import { getSupabase } from '../../lib/supabase'
import { validateNewPassword } from '../auth/passwordRules'

/**
 * Change password for the signed-in user. Uses the standard authenticated
 * updateUser flow (the installed supabase-js has no current-password
 * verification parameter; no dependency upgrade just for this).
 */
export function SecuritySettings() {
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const validation = validateNewPassword(password, confirm)
    if (validation) {
      setError(validation)
      return
    }
    setSubmitting(true)
    const { error: updateError } = await getSupabase().auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      setError(
        /same password|different from the old/i.test(updateError.message)
          ? 'The new password must be different from your current password.'
          : 'Could not update the password. Please try again.',
      )
      return
    }
    setPassword('')
    setConfirm('')
    toast('success', 'Password updated.')
  }

  return (
    <Card className="max-w-lg p-5">
      <h3 className="text-sm font-semibold text-slate-800">Change password</h3>
      <p className="mt-1 text-sm text-slate-500">
        Updates the password for your signed-in account.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-4" noValidate>
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
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" loading={submitting}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  )
}
