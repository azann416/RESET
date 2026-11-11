export const viewIds = ['home', 'journey', 'check-in', 'support', 'campaign', 'learn', 'movement', 'rewards', 'account']

const authCallbackKeys = ['code', 'error', 'error_code', 'error_description', 'access_token', 'refresh_token']

export function resolveView(location) {
  const query = new URLSearchParams(location.search || '')
  if (authCallbackKeys.some(key => query.has(key))) return 'account'

  const hash = (location.hash || '').replace(/^#/, '')
  const hashParams = new URLSearchParams(hash)
  if (authCallbackKeys.some(key => hashParams.has(key))) return 'account'
  if (viewIds.includes(hash)) return hash
  if (query.has('account')) return 'account'

  return null
}
