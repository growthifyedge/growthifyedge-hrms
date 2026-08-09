import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkEnv } from './env'
import { markPasswordRecovery } from './passwordRecovery'

let client: SupabaseClient | null = null

/** Returns the shared Supabase client. Only call after env validation passed. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const { ok, env } = checkEnv()
    if (!ok) {
      throw new Error('Supabase environment variables are not configured.')
    }
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    // Attached synchronously right after creation so the PASSWORD_RECOVERY
    // event from detectSessionInUrl is never missed (it may fire before any
    // React component subscribes). This is the ONLY thing that unlocks the
    // /reset-password form.
    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') markPasswordRecovery()
    })
  }
  return client
}
