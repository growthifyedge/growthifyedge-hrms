export interface AppEnv {
  supabaseUrl: string
  supabasePublishableKey: string
  appEnv: string
  appUrl: string
}

export interface EnvCheck {
  ok: boolean
  missing: string[]
  env: AppEnv
}

/**
 * Validates required frontend environment variables.
 * The app refuses to boot into a broken state when these are absent —
 * it renders a setup screen instead (no silent insecure fallback).
 */
export function checkEnv(): EnvCheck {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
  const missing: string[] = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabasePublishableKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY')
  return {
    ok: missing.length === 0,
    missing,
    env: {
      supabaseUrl,
      supabasePublishableKey,
      appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
      appUrl: import.meta.env.VITE_APP_URL ?? window.location.origin,
    },
  }
}
