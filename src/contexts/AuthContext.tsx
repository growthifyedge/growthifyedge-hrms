import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import type { Profile, Employee } from '../types/db'

interface AuthState {
  /** True while the initial session + profile restore is in flight. */
  loading: boolean
  session: Session | null
  profile: Profile | null
  /** Employee record linked to the signed-in auth user, when one exists. */
  employee: Employee | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    let cancelled = false

    async function loadIdentity(s: Session | null) {
      if (!s) {
        setProfile(null)
        setEmployee(null)
        return
      }
      const [{ data: prof }, { data: emp }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
        supabase.from('employees').select('*').eq('auth_user_id', s.user.id).maybeSingle(),
      ])
      if (!cancelled) {
        setProfile((prof as Profile | null) ?? null)
        setEmployee((emp as Employee | null) ?? null)
      }
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return
        setSession(data.session)
        await loadIdentity(data.session)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // Defer profile load; Supabase deadlocks if awaited inside the callback.
      setTimeout(() => void loadIdentity(s), 0)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      employee,
      signIn: async (email, password) => {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password })
        if (!error) return { error: null }
        const friendly =
          error.message === 'Invalid login credentials'
            ? 'Incorrect email or password. Please check the demo credentials and try again.'
            : 'Unable to sign in right now. Please try again in a moment.'
        return { error: friendly }
      },
      signOut: async () => {
        await getSupabase().auth.signOut()
      },
    }),
    [loading, session, profile, employee],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
