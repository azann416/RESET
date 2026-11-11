import { useEffect, useState, useSyncExternalStore } from 'react'
import { Download, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { subscribePwa, getPwaState, installUpdate, checkForUpdate } from './pwa'

export default function PwaControls() {
  const pwa = useSyncExternalStore(subscribePwa, getPwaState)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)
  const [installMessage, setInstallMessage] = useState('')
  const [updating, setUpdating] = useState(false)
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine)
    const offerInstall = event => { event.preventDefault(); setPrompt(event) }
    const didInstall = () => { setInstalled(true); setPrompt(null); setInstallMessage('RESET has been installed.') }
    const display = window.matchMedia('(display-mode: standalone)')
    const modeChanged = () => setInstalled(display.matches || navigator.standalone === true)
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    window.addEventListener('beforeinstallprompt', offerInstall)
    window.addEventListener('appinstalled', didInstall)
    display.addEventListener('change', modeChanged)
    return () => {
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
      window.removeEventListener('beforeinstallprompt', offerInstall)
      window.removeEventListener('appinstalled', didInstall)
      display.removeEventListener('change', modeChanged)
    }
  }, [])
  async function install() {
    if (!prompt) return
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      setInstallMessage(outcome === 'accepted' ? 'Installation requested. Follow your browser’s instructions.' : 'No problem. You can install later from your browser menu.')
    } catch { setInstallMessage('Use your browser’s install or Add to Home Screen option instead.') }
    finally { setPrompt(null) }
  }
  async function update() {
    setUpdating(true)
    await installUpdate()
    setUpdating(false)
  }
  const supported = 'serviceWorker' in navigator && window.isSecureContext
  return <section className="pwa-panel section-wrap" aria-label="App availability and installation">
    <div className="pwa-status" role="status">
      {online ? <Wifi size={17} aria-hidden="true"/> : <WifiOff size={17} aria-hidden="true"/>}
      <p>      {online ? 'Online.' : 'Offline — this open page still works.'} {pwa.ready ? 'RESET is ready for offline use.' : import.meta.env.DEV ? 'Offline setup is available in the production version.' : !supported ? 'Offline use isn’t available in this browser or connection.' : 'Offline setup isn’t confirmed yet; keep RESET open while connected.'}</p>
    </div>
    <div className="pwa-actions">
      {!installed && prompt && <button className="button small" onClick={install}><Download size={16}/> Install RESET</button>}
      {installed && <span className="field-note">Running as an installed app</span>}
      {!installed && <details><summary>{prompt ? 'Other ways to install' : 'How to install RESET'}</summary><p>On iPhone or iPad, open RESET in Safari, tap Share, then Add to Home Screen. On Android, look for Install app or Add to Home Screen in the browser menu. On a computer, look for an install icon in the address bar or an install option in the menu. Options depend on your browser; if none appears, you can still use RESET here.</p></details>}
      {pwa.ready && online && !pwa.update && <button className="text-link" onClick={checkForUpdate} disabled={pwa.checking}><RefreshCw size={15}/>{pwa.checking ? 'Checking…' : 'Check for updates'}</button>}
    </div>
    <p className="field-note">Support links need internet. Progress stays in this browser unless you choose to sync. Clearing browser data may remove progress and the offline copy.</p>
    {installMessage && <p className="field-note" role="status">{installMessage}</p>}
    {pwa.error && <p className="field-note" role="status">{pwa.error}</p>}
    {pwa.update && <div className="pwa-update" role="status"><div><strong>A fresh version of RESET is ready.</strong><p>Save your changes before updating. Open tabs reload; saved progress stays here.</p></div><button className="button small" disabled={updating} onClick={update}><RefreshCw size={16}/>{updating ? 'Updating…' : 'Update & reload'}</button></div>}
  </section>
}
