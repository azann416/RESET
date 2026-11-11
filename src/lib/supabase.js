import { createClient } from '@supabase/supabase-js'
import { isSupabaseSyncConfigured } from './syncConfig'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
// Sync requires an explicit deployment opt-in as well as a public publishable key.
export const supabaseConfigured = isSupabaseSyncConfigured({
  url,
  key,
  enableSync: import.meta.env.VITE_ENABLE_SUPABASE_SYNC,
})
let client
export function getSupabase() {
  if (!supabaseConfigured) return null
  // Called only when the visitor opens Account / Sync, not by the guest tracker.
  client ??= createClient(url, key, {
    auth: {
      flowType: 'pkce', persistSession: true, autoRefreshToken: true,
      detectSessionInUrl: true, storageKey: 'reset.auth.v1',
    },
  })
  return client
}
export function authRedirect() {
  // Exact current origin: allowlist each development/production URL in Supabase.
  return `${window.location.origin}/?account=1`
}
