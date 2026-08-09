import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { getSupabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/form'
import { AuthCardShell } from './AuthCardShell'

const RESET_REDIRECT = 'https://hrms.growthifyedge.com/reset-password'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    // Errors are deliberately not surfaced: the response must not reveal
    // whether an account exists.
    await getSupabase()
      .auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_REDIRECT })
      .catch(() => undefined)
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <AuthCardShell
      title="Reset your password"
      subtitle="Enter your work email and we'll send you a reset link."
    >
      {submitted ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2.5 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            If an account exists for that email, a password reset link is on its way. Check your
            inbox and spam folder.
          </p>
          <BackToSignIn />
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <TextField
            label="Work email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Button type="submit" loading={submitting} className="w-full py-2.5">
            Send reset link
          </Button>
          <BackToSignIn />
        </form>
      )}
    </AuthCardShell>
  )
}

function BackToSignIn() {
  return (
    <p className="text-center">
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-accent-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Sign In
      </Link>
    </p>
  )
}
