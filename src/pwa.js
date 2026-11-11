import { registerSW } from 'virtual:pwa-register'

// One registration per page, including React StrictMode's development remounts.
let state = { ready: false, update: false, error: '', checking: false }
const listeners = new Set()
let registration
let applyUpdate
function publish(next) {
  state = { ...state, ...next }
  listeners.forEach(listener => listener())
}
export const subscribePwa = listener => { listeners.add(listener); return () => listeners.delete(listener) }
export const getPwaState = () => state
export async function checkForUpdate() {
  if (!registration || !navigator.onLine || state.checking) return
  publish({ checking: true, error: '' })
  try { await registration.update() }
  catch { publish({ error: 'Could not check for updates. Your current version is still available.' }) }
  finally { publish({ checking: false }) }
}
export async function installUpdate() {
  if (!applyUpdate) return
  try { await applyUpdate(true) }
  catch { publish({ error: 'The update could not be applied. Please try again when connected.' }) }
}
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  applyUpdate = registerSW({
    immediate: true,
    onOfflineReady() { publish({ ready: true, error: '' }) },
    onNeedRefresh() { publish({ update: true }) },
    onRegisteredSW(_url, result) {
      registration = result
      // On a later visit, an active worker confirms a previous successful install.
      if (result?.active) publish({ ready: true })
      if (result?.waiting) publish({ update: true })
      checkForUpdate()
    },
    onRegisterError() { publish({ error: 'Offline setup could not finish. Reconnect and reload to try again.' }) },
  })
  window.addEventListener('online', checkForUpdate)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  window.setInterval(() => {
    if (document.visibilityState === 'visible') checkForUpdate()
  }, 60 * 60 * 1000)
}
