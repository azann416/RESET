import { useEffect, useRef, useState } from 'react'
import { Cloud, LogOut, Mail } from 'lucide-react'
import { getSupabase, supabaseConfigured, authRedirect } from './lib/supabase'
import { fromCloud, sameJourney, toCloud } from './lib/syncModel'
import { readCloud, writeCloud, deleteCloud } from './lib/syncService'
import { callbackInfo, cleanAuthCallback, restoreAuth, requestEmailLink, signOutBrowser } from './lib/authFlow'

export default function AccountSync({ journey, onImport }) {
  const [open, setOpen] = useState(true)
  return <section id="account" className="section-wrap account-section" aria-label="Optional account and sync">
    <button className="text-link account-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="account-panel"><Cloud size={20}/> Account / Sync <span>Optional</span></button>
    {open && <div id="account-panel" className="account-panel"><h2>Your space. Your choice.</h2><div className="sync-privacy"><p><strong>Optional sync:</strong> only your goal category, start date, and elapsed-days display preference go to Supabase, linked to your account. Your email is used for sign-in; even a broad goal can reveal personal information.</p><p><strong>Never uploaded:</strong> moods, check-ins, notes, or detailed substance-use information. Browser storage, including your sign-in session, isn’t encrypted medical-record storage; others using this browser may access it.</p></div>
      {!supabaseConfigured ? <p className="account-notice" role="status">Syncing is not configured. Keep using RESET locally — no account or connection is needed.</p> : <ConnectedAccount journey={journey} onImport={onImport}/>}
    </div>}
  </section>
}
function ConnectedAccount({ journey, onImport }) {
  const [callback] = useState(() => callbackInfo(window.location))
  const [client] = useState(getSupabase)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [online, setOnline] = useState(() => navigator.onLine)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Checking sign-in status. No progress is uploaded automatically.')
  const [review, setReview] = useState(null)
  const [consent, setConsent] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const identity = useRef(null)
  const generation = useRef(0)
  const local = useRef(journey)
  useEffect(() => { local.current = journey }, [journey])
  useEffect(() => {
    let mounted = true
    const authChanged = (_event, session) => {
      if (!mounted || _event === 'INITIAL_SESSION') return
      const id = session?.user?.id ?? null
      if (identity.current !== id) {
        identity.current = id; generation.current += 1
        setReview(null); setConsent(false); setDeleteConfirm(false)
      }
      setUser(session?.user ?? null)
      setStatus(session ? 'Signed in. Nothing syncs automatically; review your versions when ready.' : 'Guest mode. Sign in only if you want optional syncing.')
    }
    const { data: { subscription } } = client.auth.onAuthStateChange(authChanged)
    restoreAuth(client.auth, callback).then(({ session, message }) => {
      if (!mounted) return
      authChanged('RESTORED', session)
      setStatus(message)
      setAuthLoading(false)
      cleanAuthCallback(window.location, window.history)
    })
    const connection = () => {
      setOnline(navigator.onLine)
      // Reconnection never uploads queued changes. Require another review.
      generation.current += 1; setReview(null); setConsent(false); setDeleteConfirm(false)
    }
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    return () => { mounted = false; generation.current += 1; subscription.unsubscribe(); window.removeEventListener('online', connection); window.removeEventListener('offline', connection) }
  }, [client, callback])
  async function action(fn) {
    if (busy) return
    setBusy(true)
    const stamp = generation.current
    try { await fn(() => stamp === generation.current) }
    catch (error) {
      if (stamp === generation.current) { setStatus(error.message || 'The request could not finish. Your local data is unchanged.'); setReview(null); setConsent(false); setDeleteConfirm(false) }
    } finally { setBusy(false) }
  }
  function signIn(event) {
    event.preventDefault()
    action(async current => {
      await requestEmailLink(client.auth, email, authMode, authRedirect())
      if (current()) setStatus(authMode === 'signup' ? 'Check your email for a confirmation link. Open the newest link in this same browser to confirm your email and finish signing in. No progress is uploaded.' : 'If this address can sign in, an email link will arrive shortly. Open the newest link in this same browser. For a new account, choose Create account.')
    })
  }
  const freshReview = review && sameJourney(review.local, journey) && review.userId === user?.id
  const cloudJourney = review?.cloud ? fromCloud(review.cloud) : null
  const differs = freshReview && journey && cloudJourney && !sameJourney(journey, cloudJourney)
  return <>
    {!online && <p className="account-notice" role="status">Offline: keep saving locally. Sign-in and cloud actions need internet. Nothing is queued for upload.</p>}
    {!user ? <form className="account-form" onSubmit={signIn}><label htmlFor="auth-mode">Account action</label><select id="auth-mode" value={authMode} disabled={busy || authLoading} onChange={e => setAuthMode(e.target.value)}><option value="signin">Sign in to an existing account</option><option value="signup">Create account / confirm email</option></select><label htmlFor="account-email">Email address for optional sign-in</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><button className="button small" disabled={!online || busy || authLoading}><Mail size={16}/>{authMode === 'signup' ? 'Send confirmation link' : 'Send sign-in link'}</button><p className="field-note">No password. New accounts need email confirmation; sign-in uses an email link. Open it in this browser. Guest mode remains available.</p></form> : <>
      <div className="account-actions"><p>Signed in as <strong>{user.email}</strong></p><button className="text-link" disabled={busy || !online || authLoading} onClick={() => action(async () => {
        await signOutBrowser(client.auth)
        setStatus('Signed out on this browser. Local journey and check-ins are unchanged.')
      })}><LogOut size={16}/> Sign out</button></div>
      <p className="field-note">Signing out keeps local progress and the cloud copy. Reconnect to sign out if offline.</p>
      <button className="button small" disabled={!online || busy} onClick={() => action(async current => {
        setReview(null); setConsent(false); setDeleteConfirm(false)
        const snapshot = local.current ? { ...local.current } : null
        const row = await readCloud(client, user.id)
        if (row) fromCloud(row)
        if (current()) { setReview({ local: snapshot, cloud: row, userId: user.id }); setStatus('Versions loaded for review. No progress was changed.') }
      })}>Review local & cloud versions</button>
      {review && !freshReview && <p className="account-notice">Local progress changed. Review versions again before syncing.</p>}
      {freshReview && <div className="sync-review"><div className="sync-versions"><div><h3>On this browser</h3><p>{journey ? `${journey.goal} · ${journey.start}` : 'No saved journey.'}</p></div><div><h3>In your account</h3><p>{cloudJourney ? `${cloudJourney.goal} · ${cloudJourney.start}` : 'No cloud journey.'}</p></div></div>
        {differs && <p className="account-notice">These versions differ. Choose which version to keep. Nothing is merged or overwritten automatically.</p>}
        {journey && <><p className="field-note">Upload preview: category “{toCloud(journey).goal_category}”, start date {journey.start}, display “elapsed days”. No mood data.</p><label className="sync-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/> I agree to upload these fields to Supabase for this account{cloudJourney ? ' and replace the cloud version shown above' : ''}.</label><button className="button small" disabled={!online || busy || !consent} onClick={() => action(async current => {
          const row = await writeCloud(client, user.id, review.local, review.cloud?.revision ?? null)
          if (current()) { setReview(null); setConsent(false); setStatus(`The reviewed journey was uploaded. Later local changes are not synced automatically.${sameJourney(local.current, review.local) ? '' : ' Your local journey changed during upload; review again to sync that version.'}`) }
          return row
        })}>{cloudJourney ? 'Keep local version — replace cloud' : 'Upload reviewed local journey'}</button></>}
        {cloudJourney && <><button className="button small secondary" disabled={!online || busy} onClick={() => action(async current => {
          const row = await readCloud(client, user.id)
          if (!row || row.revision !== review.cloud.revision) throw new Error('Cloud data changed. Review both versions again before importing.')
          if (!current()) return
          if (!sameJourney(local.current, review.local)) throw new Error('Local progress changed. Review both versions again before importing.')
          onImport(fromCloud(row))
          setReview(null); setConsent(false); setStatus('The reviewed cloud journey was saved locally. Your mood check-in was kept.')
        })}>Use cloud version{journey ? ' — replace local journey' : ' on this browser'}</button><p className="field-note">This changes the saved journey and its form fields. Save any unsaved edits before choosing a version. Mood check-ins remain untouched.</p>
        <button className="delete-button" disabled={!online || busy} onClick={() => setDeleteConfirm(true)}>Delete cloud journey only</button>
        {deleteConfirm && <div className="delete-confirm"><p>Delete the reviewed cloud goal and start date? Local progress, check-ins, and your sign-in account will remain. This does not delete the Supabase Auth account.</p><div className="account-actions"><button className="button small" disabled={!online || busy} onClick={() => action(async current => {
          await deleteCloud(client, user.id, review.cloud.revision)
          if (current()) { setReview(null); setConsent(false); setDeleteConfirm(false); setStatus('Cloud journey deleted. Local data and your account remain. Nothing will re-upload automatically.') }
        })}>Confirm cloud deletion</button><button className="text-link" disabled={busy} onClick={() => setDeleteConfirm(false)}>Cancel</button></div></div>}</>}
      </div>}
    </>}
    <p className="account-notice" role="status" aria-live="polite">{busy ? 'Working… Local RESET features remain available.' : status}</p>
    <a href="#local-data" className="text-link">Manage or delete local data separately</a>
  </>
}
