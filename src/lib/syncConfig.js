export function isSupabaseSyncConfigured({ url, key, enableSync }) {
  return Boolean(
    enableSync === 'true' &&
    url && /^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(url) &&
    !url.includes('YOUR_PROJECT_REF') &&
    key?.startsWith('sb_publishable_') &&
    !key.includes('REPLACE_ME'),
  )
}
