import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { checkEnv } from './env'

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
  }
  return client
}
