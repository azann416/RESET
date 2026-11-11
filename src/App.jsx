import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import PwaControls from './PwaControls'
import OptionalAccountBoundary from './OptionalAccountBoundary'
const AccountSync = lazy(() => import('./AccountSync'))
const BreakTheStigma = lazy(() => import('./BreakTheStigma'))
const Movement = lazy(() => import('./Movement'))
const Rewards = lazy(() => import('./Rewards'))
import { MotionConfig, motion } from 'motion/react'
import { ArrowUpRight, ArrowRight, Heart, Sparkles, ShieldCheck, MapPin, Smile, SmilePlus, Meh, Frown, CloudRain, Check, Trash2, Menu, X, MoveUpRight, Sprout, PhoneCall } from 'lucide-react'
import { resolveView } from './lib/viewRouter'
import { saveMovementMilestone } from './lib/movementCampaign'
import { recordRewardsActivity } from './lib/rewards'

const KEY = 'reset.wellbeing.v1'
const goals = ['Explore my relationship with substances', 'Reduce my substance use', 'Take a break', 'Choose sobriety', 'Focus on my wellbeing']
const moods = [{ name: 'Having a hard day', short: 'Low', cue: 'A hard day', emoji: '🌧️', Icon: CloudRain }, { name: 'Feeling a little off', short: 'A little off', cue: 'A bit off', emoji: '🌦️', Icon: Frown }, { name: 'Feeling okay', short: 'Okay', cue: 'Taking it as it comes', emoji: '🌤️', Icon: Meh }, { name: 'Feeling good', short: 'Good', cue: 'A good day', emoji: '☀️', Icon: Smile }, { name: 'Feeling great', short: 'Great', cue: 'Feeling bright', emoji: '✨', Icon: SmilePlus }]
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const dayNumber = date => { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000 }
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(dayNumber(date)) && new Date(dayNumber(date) * 86400000).toISOString().slice(0, 10) === date
function readData() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY))
    return { journey: goals.includes(value?.journey?.goal) && validDate(value?.journey?.start) && value.journey.start <= localDate() ? value.journey : null, checkin: validDate(value?.checkin?.date) && moods.some(m => m.name === value?.checkin?.mood) ? value.checkin : null }
  } catch { return { journey: null, checkin: null } }
}
const nav = [['home', 'Home'], ['journey', 'Journey'], ['check-in', 'Check-in'], ['support', 'Support'], ['campaign', 'About'], ['learn', 'Learn'], ['movement', 'Movement'], ['rewards', 'Rewards'], ['account', 'Sync']]
function App() {
  const [data, setData] = useState(readData)
  const [goal, setGoal] = useState(data.journey?.goal || goals[0])
  const [start, setStart] = useState(data.journey?.start || localDate())
  const [today, setToday] = useState(localDate)
  const [moodDraft, setMoodDraft] = useState(null)
  const mood = moodDraft?.date === today ? moodDraft.mood : data.checkin?.date === today ? data.checkin.mood : ''
  const selectedMood = moods.find(item => item.name === mood)
  const moodSaved = Boolean(mood && data.checkin?.date === today && data.checkin?.mood === mood)
  const journeyDays = data.journey ? Math.max(1, dayNumber(today) - dayNumber(data.journey.start) + 1) : 0
  const setMood = value => setMoodDraft({ date: localDate(), mood: value })
  const [message, setMessage] = useState('')
  const [menu, setMenu] = useState(false)
  const [activeView, setActiveView] = useState(() => resolveView(window.location) || 'home')
  const [transitionIndex, setTransitionIndex] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const viewHeadingRef = useRef(null)
  const previousView = useRef(activeView)
  const currentView = useRef(activeView)
  function switchView(nextView) {
    if (currentView.current !== nextView) {
      currentView.current = nextView
      setActiveView(nextView)
      setTransitionIndex(index => index === null ? 0 : (index + 1) % 4)
    }
  }
  function scrollToTop() {
    const root = document.documentElement
    const previousBehavior = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    root.style.scrollBehavior = previousBehavior
  }
  useEffect(() => {
    const refresh = () => setToday(localDate())
    const timer = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  useEffect(() => {
    const reportStorageError = event => setMessage(event.detail)
    window.addEventListener('reset:storage-error', reportStorageError)
    return () => window.removeEventListener('reset:storage-error', reportStorageError)
  }, [])
  useEffect(() => {
    const syncView = () => {
      const nextView = resolveView(window.location)
      if (nextView) {
        switchView(nextView)
        setMenu(false)
      }
    }
    window.addEventListener('hashchange', syncView)
    window.addEventListener('popstate', syncView)
    return () => {
      window.removeEventListener('hashchange', syncView)
      window.removeEventListener('popstate', syncView)
    }
  }, [])
  useEffect(() => {
    scrollToTop()
    if (previousView.current !== activeView) viewHeadingRef.current?.focus({ preventScroll: true })
    previousView.current = activeView
    if (activeView === 'movement') {
      try { recordRewardsActivity('campaign-visit') }
      catch (error) {
        window.dispatchEvent(new CustomEvent('reset:storage-error', { detail: error.message }))
      }
    }
  }, [activeView])
  function navigate(event, destination) {
    event?.preventDefault()
    setMenu(false)
    if (window.location.hash === `#${destination}`) {
      switchView(destination)
      scrollToTop()
      return
    }
    switchView(destination)
    window.history.pushState(window.history.state, '', `${window.location.pathname}${window.location.search}#${destination}`)
  }
  function save(next, confirmation) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); setData(next); setMessage(confirmation) }
    catch { setMessage('Your browser could not save this. Allow local storage and try again. Your changes have not been saved.') }
  }
  function saveJourney(event) {
    event.preventDefault()
    if (!validDate(start) || start > localDate()) { setMessage('Choose a valid starting date of today or earlier.'); return }
    save({ ...data, journey: { goal, start } }, 'Your journey is saved on this browser. One step at a time.')
  }
  function removeData() {
    try { localStorage.removeItem(KEY); setData({ journey: null, checkin: null }); setGoal(goals[0]); setStart(localDate()); setMood(''); setDeleting(false); setMessage('Your RESET journey and check-in have been deleted from this browser.') }
    catch { setMessage('Your browser could not delete your data. Please try again or clear this site’s data in your browser settings.') }
  }
  function recordLearnCompletion() {
    try { saveMovementMilestone('learn') }
    catch (error) { setMessage(error.message) }
  }
  return <MotionConfig reducedMotion="user">
    <a href="#main" className="skip-link" onClick={event => { event.preventDefault(); viewHeadingRef.current?.focus({ preventScroll: true }) }}>Skip to content</a>
    <header className="site-header">
      <div className="nav-composition">
        <a href="#home" className="nav-brand" aria-label="RESET home" aria-current={activeView === 'home' ? 'page' : undefined} onClick={event => navigate(event, 'home')}>RESET<span aria-hidden="true">✳</span></a>
        <nav id="main-navigation" aria-label="Main navigation" className={menu ? 'navigation open' : 'navigation'}>
          {nav.filter(([id]) => id !== 'home').map(([id, label]) => <a key={id} href={`#${id}`} aria-current={activeView === id ? 'page' : undefined} onClick={event => navigate(event, id)}>{label}</a>)}
        </nav>
        <button className="menu-button" aria-label={menu ? 'Close navigation menu' : 'Open navigation menu'} aria-controls="main-navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}><span>{menu ? 'Close' : 'Explore'}</span>{menu ? <X size={17}/> : <Menu size={17}/>}</button>
      </div>
    </header>
    <main id="main" data-active-view={activeView} className={transitionIndex === null ? undefined : `view-transition-${transitionIndex}`}>
      {activeView !== 'home' && <h1 className="sr-only app-view-title" tabIndex="-1" ref={viewHeadingRef}>{nav.find(([id]) => id === activeView)?.[1] || 'RESET'}</h1>}
      <aside className="emergency-shortcut" aria-label="Emergency help">
        <span>Immediate danger?</span><a href="tel:911">Call 9-1-1</a><a href="#support" onClick={event => navigate(event, 'support')}>Support options</a>
      </aside>
      {activeView === 'home' && <>
      <section id="home" className="hero section-wrap">
        <div className="hero-copy"><p className="eyebrow"><span className="status-dot"/> A LITTLE CHANGE. A LITTLE MORE YOU.</p><h1 ref={viewHeadingRef} tabIndex="-1">Your journey.<br/><span>Your pace.</span></h1><p className="hero-description">Explore your relationship with substances, find support, and choose a next step that feels right for you.</p><div className="hero-actions"><a href="#journey" className="button" onClick={event => navigate(event, 'journey')}>Start my journey <ArrowUpRight size={20}/></a><a href="#campaign" className="text-link" onClick={event => navigate(event, 'campaign')}>Meet RESET <ArrowRight size={17}/></a></div><p className="hero-footnote"><Heart size={15}/> No pressure. Just possibility.</p></div>
        <motion.div className="hero-art" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6 }} role="img" aria-label="A colourful illustration of a winding path toward a rising sun, with the message: progress looks different on everyone.">
          <div className="art-topline"><span>A FRESH PERSPECTIVE</span><MoveUpRight size={25}/></div><div className="sun"><span/><span/></div>
          <svg className="path-art" viewBox="0 0 500 470" fill="none" aria-hidden="true"><path d="M265 490 C80 390 455 360 310 320 C245 302 195 320 248 348" stroke="#FFF0D9" strokeWidth="100"/><path d="M265 490 C80 390 455 360 310 320 C245 302 195 320 248 348" stroke="#363328" strokeWidth="2" strokeDasharray="9 13"/></svg>
          <div className="art-flower">✳</div><span className="art-spark">✦</span><span className="hero-orbit">A LITTLE<br/>AT A TIME</span><div className="art-label">A little step<br/>is still a step.</div><div className="art-sticker">progress looks<br/>different on<br/><strong>everyone.</strong><Heart size={22}/></div><div className="art-bottom">YOUR NEXT CHAPTER STARTS WITH YOU.</div>
        </motion.div>
      </section>
      <section className="quick-start section-wrap" aria-labelledby="quick-start-title">
        <div className="quick-start-heading">
          <div><p className="eyebrow">START WHERE YOU ARE</p><h2 id="quick-start-title">What feels helpful right now?</h2></div>
          <div className="quick-start-more"><p>No account needed. Explore at your own pace.</p><a href="#learn" onClick={event => navigate(event, 'learn')}>Break the stigma <ArrowRight size={15} aria-hidden="true"/></a><a href="#movement" onClick={event => navigate(event, 'movement')}>Join the Movement <ArrowRight size={15} aria-hidden="true"/></a><a href="#rewards" onClick={event => navigate(event, 'rewards')}>Campaign keychains <ArrowRight size={15} aria-hidden="true"/></a></div>
        </div>
        {data.journey && <div className="welcome-back">
          <span className="welcome-back-mark"><Heart size={19} aria-hidden="true"/></span>
          <div className="welcome-back-copy"><strong>Welcome back.</strong><span>Your journey is here when you need it.</span></div>
          <div className="welcome-back-actions"><a href="#journey" onClick={event => navigate(event, 'journey')}>Your journey <ArrowRight size={15} aria-hidden="true"/></a><a href="#check-in" onClick={event => navigate(event, 'check-in')}>Check in <ArrowRight size={15} aria-hidden="true"/></a></div>
        </div>}
        <div className="quick-start-grid">
          <a className="start-card start-options" href="#journey" onClick={event => navigate(event, 'journey')}>
            <span className="start-card-icon"><Sprout size={24} aria-hidden="true"/></span>
            <span className="start-card-copy"><span>YOUR NEXT STEP</span><strong>Explore my options</strong></span>
            <ArrowUpRight className="start-card-arrow" size={20} aria-hidden="true"/>
          </a>
          <a className="start-card start-checkin" href="#check-in" onClick={event => navigate(event, 'check-in')}>
            <span className="start-card-icon"><Smile size={24} aria-hidden="true"/></span>
            <span className="start-card-copy"><span>A MOMENT FOR YOU</span><strong>Check in with myself</strong></span>
            <ArrowUpRight className="start-card-arrow" size={20} aria-hidden="true"/>
          </a>
          <a className="start-card start-support" href="#support" onClick={event => navigate(event, 'support')}>
            <span className="start-card-icon"><PhoneCall size={23} aria-hidden="true"/></span>
            <span className="start-card-copy"><span>YOU’RE NOT ALONE</span><strong>Find support</strong></span>
            <ArrowUpRight className="start-card-arrow" size={20} aria-hidden="true"/>
          </a>
        </div>
      </section>
      <div className="belief-strip"><span>Awareness, without judgement.</span><span aria-hidden="true">✳</span><span>Harm reduction, your way.</span><span aria-hidden="true">✳</span><span>Rooted in Toronto.</span></div>
      </>}
      {activeView === 'campaign' && <>
      <section className="intro section-wrap"><div className="intro-aside"><p className="eyebrow">HEY, WE’RE RESET.</p><svg className="intro-illustration" viewBox="0 0 220 170" fill="none" aria-hidden="true"><path d="M24 137c31-30 52 16 81-13s43-36 88-65" stroke="#fff0d9" strokeWidth="22" strokeLinecap="round"/><path d="M24 137c31-30 52 16 81-13s43-36 88-65" stroke="#302f29" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round"/><circle cx="158" cy="48" r="26" fill="#ff775e"/><path d="M148 48h.1M168 48h.1M151 58c4 5 10 5 14 0" stroke="#302f29" strokeWidth="3" strokeLinecap="round"/><path d="M42 110c-9-13-24-9-23 4 1 11 22 22 22 22s20-12 20-23c0-13-16-16-23-3Z" fill="#d9ef9b"/><circle cx="94" cy="115" r="9" fill="#ff775e"/><circle cx="112" cy="104" r="6" fill="#d9ef9b"/></svg><span className="intro-caption">Small steps. Real life.</span></div><div className="intro-copy"><h2>A fresh start,<br/>more room for you.</h2><p>RESET is a Toronto campaign for informed choices, harm reduction, and support — whether you want to stop, cut back, or explore.</p><div className="intro-values"><span><ShieldCheck size={18}/> Informed choices</span><span><Heart size={18}/> Harm reduction</span><span><MapPin size={18}/> Toronto roots</span></div></div></section>
      </>}
      {activeView === 'learn' && <Suspense fallback={<p className="section-wrap field-note">Loading the awareness activity…</p>}><BreakTheStigma onNavigate={navigate} onComplete={recordLearnCompletion}/></Suspense>}
      {activeView === 'movement' && <Suspense fallback={<p className="section-wrap field-note">Loading The Movement…</p>}><Movement onNavigate={navigate}/></Suspense>}
      {activeView === 'rewards' && <Suspense fallback={<p className="section-wrap field-note">Loading your Rewards collection…</p>}><Rewards onNavigate={navigate}/></Suspense>}
      <section id="journey" className="section-wrap journey-section"><div className="section-heading"><div><p className="eyebrow">01 / MY JOURNEY</p><h2>Your next step.<br/>On your terms.</h2></div><p>Choose a goal and date. Change them anytime.</p></div><div className="journey-grid"><form className="journey-form" onSubmit={saveJourney}><div className="journey-form-heading"><span><Sprout size={16}/> MAKE IT YOURS</span><h3>What feels right for you?</h3><p>Choose a goal that feels right today.</p></div><label htmlFor="goal">My goal</label><select id="goal" value={goal} onChange={e => setGoal(e.target.value)}>{goals.map(g => <option key={g}>{g}</option>)}</select><label htmlFor="start">My starting date</label><input id="start" type="date" required max={today} value={start} onChange={e => setStart(e.target.value)}/><p className="field-note">Today or a date that matters to you.</p><button className="button" type="submit">{data.journey ? 'Save my changes' : 'Begin my journey'} <ArrowUpRight size={18}/></button><p className="privacy-note"><ShieldCheck size={15}/> Saved locally. Sync is optional.</p></form><div className={`progress-card ${data.journey ? 'has-journey' : 'is-empty'}`}><div className="progress-card-kicker"><Sprout size={19} strokeWidth={1.7}/><span>YOUR JOURNEY, YOUR PACE</span></div><svg className="progress-path-art" viewBox="0 0 138 88" fill="none" aria-hidden="true"><path d="M7 72C34 72 30 31 59 38s31 39 52 5 17-28 22-33" stroke="#FFF0D9" strokeWidth="10" strokeLinecap="round"/><path d="M7 72C34 72 30 31 59 38s31 39 52 5 17-28 22-33" stroke="#302F29" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round"/><circle cx="7" cy="72" r="6" fill="#D9EF9B" stroke="#302F29" strokeWidth="1.5"/><circle cx="59" cy="38" r="6" fill="#C8B8F5" stroke="#302F29" strokeWidth="1.5"/><circle cx="133" cy="10" r="6" fill="#D9EF9B" stroke="#302F29" strokeWidth="1.5"/></svg>{data.journey ? <div className="progress-card-main"><div className="progress-day-row"><div className="day-count"><span className="day-count-number">{journeyDays}</span></div><div className="progress-day-copy"><span className="progress-day-label">{journeyDays === 1 ? 'day in your journey' : 'days in your journey'}</span><span className="progress-day-caption">One day at a time, your way.</span></div></div><div className="progress-details"><div className="progress-goal"><span className="progress-detail-label">YOUR GOAL</span><strong>{data.journey.goal}</strong></div><div className="progress-start"><span className="progress-detail-label">STARTED</span><strong>{new Date(`${data.journey.start}T12:00:00`).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></div></div><p className="progress-affirmation">Showing up for yourself is worth celebrating.</p></div> : <div className="progress-empty-state"><div className="progress-word">Every<br/><span className="serif">beginning</span><br/>counts.</div><p>Whenever you feel ready, choose a goal and a date that matters to you.</p></div>}<div className="progress-note">{data.journey ? 'Calendar days, not a streak. Missed days don’t erase progress.' : 'No pressure to start before you’re ready.'}</div></div></div></section>
      <section id="check-in" className="section-wrap checkin-section"><div className="checkin-card"><div className="section-heading"><div><p className="eyebrow">02 / DAILY CHECK-IN</p><h2>How’s your today?</h2></div><p>Pick a feeling. No explanation needed.</p></div><fieldset><legend className="sr-only">Choose how you feel today</legend><div className="moods">{moods.map(({ name, short, cue, emoji, Icon }) => <label className={`mood-option ${mood === name ? 'selected' : ''}`} key={name}><input type="radio" name="mood" value={name} aria-label={name} checked={mood === name} onChange={() => setMood(name)}/><span className="mood-visual"><Icon aria-hidden="true" size={38} strokeWidth={1.6}/><span className="mood-emoji" aria-hidden="true">{emoji}</span></span><span className="mood-name">{short}</span><span className="mood-description">{cue}</span>{mood === name && <span className="mood-check" aria-hidden="true"><Check size={15}/></span>}</label>)}</div></fieldset><div className="checkin-bottom"><div className={`checkin-feedback ${moodSaved ? 'is-saved' : ''}`} role="status" aria-live="polite" aria-atomic="true">{moodSaved ? <><span className="checkin-feedback-icon"><Check size={17}/></span><span><strong>Saved as {selectedMood.short}.</strong><small>Thanks for checking in. You can change this anytime.</small></span></> : mood && selectedMood ? <><span className="checkin-feedback-icon"><Heart size={17}/></span><span><strong>{selectedMood.name}.</strong><small>Save when you’re ready. You can change it anytime.</small></span></> : <><span className="checkin-feedback-icon"><Sparkles size={17}/></span><span><strong>Just for you, no explanations needed.</strong><small>Choose the words that feel closest to today.</small></span></>}</div><button className={`button ${moodSaved ? 'checkin-saved-button' : ''}`} type="button" disabled={!mood || moodSaved} onClick={() => save({ ...data, checkin: { date: localDate(), mood } }, 'Today’s check-in is saved. Thank you for making a little space for yourself.')}>{moodSaved ? 'Saved for today' : data.checkin?.date === today ? 'Update check-in' : 'Save today’s check-in'} {moodSaved ? <Check size={18}/> : <ArrowUpRight size={18}/>}</button></div><p className="field-note">Your latest check-in stays in this browser. No streaks.</p></div></section>
      <section id="support" className="section-wrap support-section"><div className="section-heading"><div><p className="eyebrow">03 / FIND SUPPORT</p><h2>You don’t have to<br/>figure it out alone.</h2></div><p>Support is here if you want to stop, reduce, or explore.</p></div><div className="support-emergency" aria-labelledby="support-emergency-title"><div className="support-emergency-mark"><PhoneCall size={22} aria-hidden="true"/></div><div className="support-emergency-copy"><span>FOR RIGHT NOW</span><h3 id="support-emergency-title">Immediate danger?</h3><p>Call 9-1-1 or go to an emergency department.</p></div><a className="support-emergency-link" href="tel:911" aria-label="Call 9-1-1"><span>Call 9-1-1</span><PhoneCall size={18} aria-hidden="true"/></a></div><div className="support-grid"><article className="support-card support-0"><div className="support-card-top"><span className="support-icon"><MapPin size={22} aria-hidden="true"/></span><span className="resource-number">01</span></div><p className="eyebrow">LOCAL · FIND SERVICES</p><h3>211 Ontario</h3><p>Find Ontario services, including substance-use support.</p><a className="resource-cta" href="https://211ontario.ca/" target="_blank" rel="noopener noreferrer"><span>Find local support</span><span className="support-new-tab">Opens in a new tab</span><ArrowUpRight size={18} aria-hidden="true"/></a></article><article className="support-card support-1"><div className="support-card-top"><span className="support-icon"><ShieldCheck size={22} aria-hidden="true"/></span><span className="resource-number">02</span></div><p className="eyebrow">CANADA-WIDE · INFORMATION</p><h3>Health Canada</h3><p>Browse Canadian substance-use services and information.</p><a className="resource-cta" href="https://www.canada.ca/en/health-canada/services/substance-use/get-help-with-substance-use.html" target="_blank" rel="noopener noreferrer"><span>Explore Canadian resources</span><span className="support-new-tab">Opens in a new tab</span><ArrowUpRight size={18} aria-hidden="true"/></a></article><article className="support-card support-2"><div className="support-card-top"><span className="support-icon"><Heart size={22} aria-hidden="true"/></span><span className="resource-number">03</span></div><p className="eyebrow">TORONTO · HARM REDUCTION</p><h3>Toronto Public Health</h3><p>Explore local information on alcohol, drugs, and harm reduction.</p><a className="resource-cta" href="https://www.toronto.ca/community-people/health-wellness-care/health-programs-advice/alcohol-and-other-drugs/" target="_blank" rel="noopener noreferrer"><span>Find Toronto resources</span><span className="support-new-tab">Opens in a new tab</span><ArrowUpRight size={18} aria-hidden="true"/></a></article></div><aside className="medical-note"><Heart size={22} aria-hidden="true"/><p><strong>Before making a change:</strong> Suddenly stopping alcohol or some drugs can cause dangerous withdrawal; medical support may be needed. <a href="https://myhealth.alberta.ca/Alberta/Pages/safe-withdrawal-from-alcohol-and-other-drugs.aspx" target="_blank" rel="noopener noreferrer">Safer withdrawal guidance<span className="sr-only"> (opens in a new tab)</span></a>.</p></aside></section>
      <section id="campaign" className="section-wrap campaign-section"><div className="campaign-art" aria-label="Campaign message: less pressure, more possibility."><span className="wordmark">RESET<span aria-hidden="true">✳</span></span><div>Less<br/><span className="serif">pressure.</span><br/>More<br/><span className="serif">possibility.</span></div><span className="campaign-star" aria-hidden="true">✳</span><p>YOUR JOURNEY. YOUR PACE.</p></div><div className="campaign-copy"><p className="eyebrow">04 / THE CAMPAIGN</p><h2>Change the conversation.</h2><p>A small, kind reminder can make space for someone else.</p><div className="hashtag">#MyResetJourney <Sparkles size={23}/></div><p className="field-note">Share only if it feels right. Ask permission before sharing someone else’s story.</p><a href="#journey" className="button" onClick={event => navigate(event, 'journey')}>Explore your next step <ArrowUpRight size={18}/></a></div></section>
      <div className="closing"><span aria-hidden="true">✳</span><p>Your next step, <span className="serif">when you’re ready.</span></p><a className="closing-action" href="#journey" onClick={event => navigate(event, 'journey')}>Start my journey <ArrowUpRight size={18}/></a></div>
      {activeView === 'account' && <>
    <OptionalAccountBoundary><Suspense fallback={<p className="section-wrap field-note">Loading optional account controls…</p>}><AccountSync journey={data.journey} onImport={journey => {
      // Import changes only the journey; never replace the locally saved mood.
      const latest = readData()
      if (latest.journey?.goal !== data.journey?.goal || latest.journey?.start !== data.journey?.start) {
        throw new Error('Local progress changed in another tab. Reload and review the versions again before importing.')
      }
      const next = { ...latest, journey }
      localStorage.setItem(KEY, JSON.stringify(next))
      setData(next); setGoal(journey.goal); setStart(journey.start)
    }}/></Suspense></OptionalAccountBoundary>
    <PwaControls/>
    <footer className="section-wrap"><div className="footer-top"><div><a className="wordmark" href="#home" onClick={event => navigate(event, 'home')}>RESET<span>✳</span></a><p>Your journey. Your pace.</p></div><div className="footer-privacy" id="local-data"><h3>Your space stays yours.</h3><p>Your goal, start date, and latest mood stay in this browser unless you choose to sync your journey. Moods never sync. Browser storage isn’t encrypted; others using this browser may see it.</p><button className="delete-button" onClick={() => setDeleting(true)}><Trash2 size={15}/> Delete local data</button>{deleting && <div className="delete-confirm"><p>Delete your saved RESET journey and check-in from this browser? Your cloud journey and sign-in session, if any, will remain.</p><div className="flex gap-4 mt-3"><button className="button small" onClick={removeData}>Confirm local deletion</button><button className="text-link" onClick={() => setDeleting(false)}>Cancel</button></div></div>}</div></div><div className="footer-bottom"><span>RESET · A Toronto wellbeing campaign concept</span></div></footer>
      </>}
    </main>
    {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={18}/></button></div>}
  </MotionConfig>
}
export default App
