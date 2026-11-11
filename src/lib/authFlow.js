// Never display raw provider error messages, callback contents, or tokens.
export function friendlyAuthError(error, fallback = 'Sign-in could not finish. Request a new email link and open it in the same browser. Guest mode still works.') {
  if (error?.status === 429 || ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(error?.code)) return 'Too many email requests. Wait a few minutes before requesting another link.'
  if (['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'bad_code_verifier', 'pkce_verifier_not_found'].includes(error?.code)) return 'This sign-in link expired, was already used, or belongs to another browser. Request a new link here and open it in this same browser.'
  if (error?.code === 'email_address_invalid') return 'Check your email address and try again.'
  if (['signup_disabled', 'email_provider_disabled'].includes(error?.code)) return 'Email account creation or sign-in is unavailable for this project. You can still use RESET as a guest.'
  return fallback
}
export function callbackInfo(location) {
  const query = new URLSearchParams(location.search)
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  const keys = ['code', 'error', 'error_code', 'error_description', 'access_token', 'refresh_token']
  return {
    present: keys.some(key => query.has(key) || hash.has(key)),
    failed: ['error', 'error_code', 'error_description'].some(key => query.has(key) || hash.has(key)),
    errorCode: query.get('error_code') || hash.get('error_code'),
  }
}
export function cleanAuthCallback(location, history) {
  const url = new URL(location.href)
  const hash = new URLSearchParams(url.hash.slice(1))
  const keys = ['code', 'error', 'error_code', 'error_description', 'access_token', 'refresh_token', 'token_type', 'expires_in', 'expires_at', 'flow_id']
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) { url.searchParams.delete(key); changed = true }
  }
  if (keys.some(key => hash.has(key))) { url.hash = 'account'; changed = true }
  if (changed) history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
export async function restoreAuth(auth, callback) {
  try {
    const initialized = await auth.initialize()
    const restored = await auth.getSession()
    const session = restored.data?.session ?? null
    const error = initialized.error || restored.error
    return { session, message: error || callback.failed
      ? friendlyAuthError(error || { code: callback.errorCode })
      : callback.present && !session
        ? friendlyAuthError(null)
        : session ? 'Signed in. Nothing syncs automatically; review your versions when ready.' : 'Guest mode. Sign in only if you want optional syncing.' }
  } catch {
    return { session: null, message: 'Could not restore sign-in. Check your connection and request a new link if needed. Guest mode still works.' }
  }
}
export async function requestEmailLink(auth, email, mode, redirect) {
  let result
  try {
    result = await auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect, shouldCreateUser: mode === 'signup' } })
  } catch {
    throw new Error('Could not send a sign-in email. Check your connection and try again.')
  }
  if (result.error) throw new Error(friendlyAuthError(result.error, 'Could not send a sign-in email. Check your email, connection, and project email settings, then try again.'))
}
export async function signOutBrowser(auth) {
  try {
    const { error } = await auth.signOut({ scope: 'local' })
    if (error) throw error
  } catch {
    throw new Error('Could not sign out. Reconnect and try again. Local progress has not been deleted.')
  }
}
