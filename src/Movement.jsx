import { useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Copy, Download, Heart, Megaphone, Sparkles } from 'lucide-react'
import { readStigmaUnlocks } from './lib/stigmaQuiz'
import {
  createCampaignGraphicSvg,
  movementActivityIds,
  movementCaption,
  movementMediaPosters,
  movementMessages,
  movementSocialCaptions,
  readMovementMilestones,
  renderCampaignPng,
  saveMovementMilestone,
} from './lib/movementCampaign'
import { recordRewardsActivity } from './lib/rewards'

const languageExamples = [
  ['Try', 'person with a substance use disorder'], ['Instead of', 'addict or junkie'],
  ['Try', 'return to use or setback'], ['Instead of', 'failed or fell off the wagon'],
  ['Try', 'ask what support would help'], ['Instead of', 'assuming what someone needs'],
]

function CampaignArt({ messageId, format }) {
  const message = movementMessages.find(item => item.id === messageId)
  const svg = createCampaignGraphicSvg(messageId, format)
  return <img
    className={`movement-preview-image is-${format}`}
    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
    alt={`Campaign graphic preview: “${message.text}” signed ${message.signature}`}
  />
}

function MovementKeychain() {
  return <svg className="movement-keychain-art" viewBox="0 0 220 250" role="img" aria-labelledby="movement-keychain-title">
    <title id="movement-keychain-title">RESET digital keychain concept, shaped like a lavender tag with a coral heart</title>
    <circle cx="110" cy="27" r="20" fill="#FFF0D9" stroke="#302F29" strokeWidth="5"/>
    <circle cx="110" cy="27" r="8" fill="none" stroke="#FF775E" strokeWidth="4"/>
    <path d="M110 47v23" stroke="#302F29" strokeWidth="6" strokeLinecap="round"/>
    <path d="m110 67 86 47v88l-86 43-86-43v-88l86-47Z" fill="#C8B8F5" stroke="#302F29" strokeWidth="5"/>
    <path d="M110 91c-18-24-45-5-31 16 7 10 31 26 31 26s24-16 31-26c14-21-13-40-31-16Z" fill="#FF775E" stroke="#302F29" strokeWidth="4"/>
    <text x="110" y="160" textAnchor="middle" fill="#302F29" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900" letterSpacing="2">BREAK THE</text>
    <text x="110" y="179" textAnchor="middle" fill="#302F29" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="900" letterSpacing="1">STIGMA</text>
    <path d="m39 97 8-12m134 12-8-12M33 208l-8 9m160-9 8 9" stroke="#D9EF9B" strokeWidth="6" strokeLinecap="round"/>
  </svg>
}

export default function Movement({ onNavigate }) {
  const [milestones, setMilestones] = useState(readMovementMilestones)
  const [selectedMessage, setSelectedMessage] = useState(movementMessages[0].id)
  const [format, setFormat] = useState('feed')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const actionsHeading = useRef(null)
  const guideHeading = useRef(null)
  const generatorHeading = useRef(null)
  const allActivityCount = movementActivityIds.length
  const displayedMilestones = readStigmaUnlocks().completed && !milestones.includes('learn')
    ? [...milestones, 'learn']
    : milestones

  function markActivity(id, confirmation) {
    try {
      setMilestones(saveMovementMilestone(id))
      setStatus(confirmation)
    } catch (error) {
      setStatus(error.message)
    }
  }

  function recordShareExploration() {
    try {
      recordRewardsActivity('share-explored')
      return true
    } catch (error) {
      setStatus(error.message)
      return false
    }
  }

  function moveTo(ref) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const root = document.documentElement
      const previousBehavior = root.style.scrollBehavior
      root.style.scrollBehavior = 'auto'
      ref.current?.scrollIntoView({ block: 'start' })
      root.style.scrollBehavior = previousBehavior
    } else {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    ref.current?.focus({ preventScroll: true })
  }

  async function copyCaption() {
    await copyCampaignCaption(movementCaption)
  }

  async function copyCampaignCaption(caption) {
    const savedForRewards = recordShareExploration()
    try {
      await navigator.clipboard.writeText(caption)
      setStatus(savedForRewards
        ? 'Caption copied. Sharing is always optional.'
        : 'Caption copied. Rewards progress could not be saved on this device.')
    } catch {
      setStatus('Copy is unavailable here. Select the caption to copy it.')
    }
  }

  async function downloadGraphic(messageId = selectedMessage, posterFormat = format) {
    const savedForRewards = recordShareExploration()
    setBusy(true)
    setStatus('')
    try {
      const blob = await renderCampaignPng(messageId, posterFormat)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reset-myresetjourney-${messageId}-${posterFormat}.png`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      markActivity('campaign-graphic', 'Your campaign graphic is ready. This activity is saved only on this device.')
      if (!savedForRewards) setStatus('PNG downloaded. Rewards progress could not be saved on this device.')
    } catch (error) {
      setStatus(error.message || 'The graphic could not be downloaded. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <section id="movement" className="section-wrap movement-page" aria-labelledby="movement-title">
    <header className="movement-hero">
      <div className="movement-hero-copy">
        <p className="eyebrow"><Megaphone size={16} aria-hidden="true"/> A RESET CAMPAIGN FOR EVERYONE</p>
        <h2 id="movement-title">Change the conversation.<br/><span>Change the stigma.</span></h2>
        <p>Small acts of understanding can make it easier to find care. Join in as a person with lived experience, a friend, family, or an ally.</p>
        <a className="movement-hashtag" href="#movement-actions-title" onClick={event => { event.preventDefault(); moveTo(actionsHeading) }}>#MyResetJourney <ArrowDown size={16} aria-hidden="true"/></a>
      </div>
      <div className="movement-hero-art" aria-hidden="true">
        <span className="movement-sun">✳</span>
        <svg viewBox="0 0 340 300" fill="none">
          <path d="M57 222c35-34 74-31 103-59s64-53 122-71" stroke="#FFF0D9" strokeWidth="37" strokeLinecap="round"/>
          <path d="M57 222c35-34 74-31 103-59s64-53 122-71" stroke="#302F29" strokeWidth="3" strokeDasharray="4 12" strokeLinecap="round"/>
          <path d="m158 70 124 35v82l-124 34V70Z" fill="#D9EF9B" stroke="#302F29" strokeWidth="5" strokeLinejoin="round"/>
          <path d="m158 70-76 55v76l76 20V70Z" fill="#FF775E" stroke="#302F29" strokeWidth="5" strokeLinejoin="round"/>
          <path d="m78 125 80-20v92l-80 4v-76Z" fill="#FFF0D9" stroke="#302F29" strokeWidth="5" strokeLinejoin="round"/>
          <path d="m95 157 47-12m-47 33 37-9" stroke="#302F29" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="283" cy="67" r="16" fill="#C8B8F5" stroke="#302F29" strokeWidth="4"/>
          <path d="m49 75 7 14 15 2-11 11 3 15-14-7-13 7 2-15-11-11 15-2 7-14Z" fill="#FF775E" stroke="#302F29" strokeWidth="3"/>
        </svg>
        <span className="movement-art-stamp">CARE<br/>IS LOUDER.</span>
      </div>
      <div className="movement-hero-note"><Heart size={16} aria-hidden="true"/> Participation is optional. No personal story required.</div>
    </header>

    <section id="movement-actions" className="movement-actions" aria-labelledby="movement-actions-title">
      <div className="movement-section-heading">
        <div><p className="eyebrow">PICK YOUR WAY IN</p><h3 id="movement-actions-title" ref={actionsHeading} tabIndex="-1">Three ways to move the message.</h3></div>
        <p>Do one, do none, come back later. It’s yours.</p>
      </div>
      <div className="movement-action-grid">
        <article className="movement-action-card movement-action-learn">
          <span className="movement-action-number">01</span><span className="movement-action-symbol"><Sparkles size={26} aria-hidden="true"/></span>
          <p>LEARN</p><h4>Break the stigma.</h4><span className="movement-action-description">Five quick questions. More room for care.</span>
          <a href="#learn" onClick={event => onNavigate(event, 'learn')}>Take the quiz <ArrowUpRight size={17} aria-hidden="true"/></a>
          {displayedMilestones.includes('learn') && <span className="movement-activity-done"><Check size={14}/> Explored</span>}
        </article>
        <article className="movement-action-card movement-action-speak">
          <span className="movement-action-number">02</span><span className="movement-action-symbol"><Heart size={26} aria-hidden="true"/></span>
          <p>SPEAK UP</p><h4>Lead with respect.</h4><span className="movement-action-description">A tiny language guide for a kinder conversation.</span>
          <button type="button" onClick={() => moveTo(guideHeading)}>Explore the guide <ArrowDown size={17} aria-hidden="true"/></button>
          {displayedMilestones.includes('language-guide') && <span className="movement-activity-done"><Check size={14}/> Explored</span>}
        </article>
        <article className="movement-action-card movement-action-share">
          <span className="movement-action-number">03</span><span className="movement-action-symbol"><Megaphone size={26} aria-hidden="true"/></span>
          <p>SPREAD AWARENESS</p><h4>Make it shareable.</h4><span className="movement-action-description">Choose a ready-made message. Keep your story private.</span>
          <button type="button" onClick={() => { recordShareExploration(); moveTo(generatorHeading) }}>Make a campaign card <ArrowDown size={17} aria-hidden="true"/></button>
          {displayedMilestones.includes('campaign-graphic') && <span className="movement-activity-done"><Check size={14}/> Explored</span>}
        </article>
      </div>
      <p className="movement-milestone" role="status" aria-live="polite">
        <span><Sparkles size={17} aria-hidden="true"/> Your awareness, your pace</span>
        <strong>{displayedMilestones.length} of {allActivityCount} activities explored on this device</strong>
        <small>Optional and private. No streaks, rankings, or sharing requirement.</small>
      </p>
      {status && <p className="movement-status" role="status" aria-live="polite">{status}</p>}
    </section>

    <section className="movement-language" aria-labelledby="movement-language-title">
      <div className="movement-language-copy">
        <p className="eyebrow">WORDS CAN MAKE ROOM</p>
        <h3 id="movement-language-title" ref={guideHeading} tabIndex="-1">A little more care<br/><span>in the conversation.</span></h3>
        <p>Person-first, nonjudgmental words help keep dignity at the centre. When you’re unsure, listen and ask what language feels right to the person.</p>
        <button className="button movement-done-button" type="button" onClick={() => markActivity('language-guide', 'Guide explored. Thanks for making room for a more respectful conversation.')}>
          <Check size={17} aria-hidden="true"/> I explored this guide
          {displayedMilestones.includes('language-guide') && <span className="sr-only">Already marked explored</span>}
        </button>
      </div>
      <div className="movement-language-board" aria-label="Examples of respectful language">
        {languageExamples.map(([label, phrase], index) => <div className={`movement-language-example language-example-${index}`} key={phrase}>
          <span>{label}</span><strong>{phrase}</strong>
        </div>)}
      </div>
      <p className="movement-language-note">These are suggestions, not rules for someone else’s identity. People choose the words that fit them.</p>
    </section>

    <section className="movement-generator" aria-labelledby="movement-generator-title">
      <div className="movement-section-heading">
        <div><p className="eyebrow">READY-MADE. PERSONALITY-FILLED.</p><h3 id="movement-generator-title" ref={generatorHeading} tabIndex="-1">Make a message worth passing on.</h3></div>
        <p>Your graphic is made from campaign copy only—never your tracker, check-ins, or quiz answers.</p>
      </div>
      <div className="movement-generator-layout">
        <div className={`movement-preview-frame ${format}`} aria-label={`${format === 'feed' ? 'Portrait post' : 'Story'} preview`}>
          <CampaignArt messageId={selectedMessage} format={format}/>
        </div>
        <div className="movement-generator-controls">
          <fieldset className="movement-message-picker">
            <legend>Choose a campaign message</legend>
            {movementMessages.map((message, index) => <button
              type="button"
              key={message.id}
              className={selectedMessage === message.id ? 'is-selected' : ''}
              aria-pressed={selectedMessage === message.id}
              onClick={() => { recordShareExploration(); setSelectedMessage(message.id) }}
            ><span>0{index + 1}</span>{message.text}</button>)}
          </fieldset>
          <fieldset className="movement-format-picker">
            <legend>Graphic shape</legend>
            <div role="group" aria-label="Graphic format">
              <button type="button" className={format === 'feed' ? 'is-selected' : ''} aria-pressed={format === 'feed'} onClick={() => { recordShareExploration(); setFormat('feed') }}>Portrait post <span>4:5</span></button>
              <button type="button" className={format === 'story' ? 'is-selected' : ''} aria-pressed={format === 'story'} onClick={() => { recordShareExploration(); setFormat('story') }}>Story <span>9:16</span></button>
            </div>
          </fieldset>
          <label className="movement-caption-label" htmlFor="movement-caption">Optional caption</label>
          <textarea id="movement-caption" readOnly value={movementCaption} rows="2"/>
          <div className="movement-export-actions">
            <button type="button" className="button movement-download" disabled={busy} onClick={downloadGraphic}>
              <Download size={18} aria-hidden="true"/>{busy ? 'Preparing PNG…' : 'Download PNG'}
            </button>
            <button type="button" className="movement-copy-caption" onClick={copyCaption}><Copy size={17} aria-hidden="true"/> Copy caption</button>
          </div>
          <p className="movement-export-note">1080px high-resolution PNG · Share only if you want to.</p>
        </div>
      </div>
    </section>

    <section className="movement-media-kit" aria-labelledby="movement-media-title">
      <div className="movement-section-heading">
        <div><p className="eyebrow">THE RESET CAMPAIGN MEDIA KIT</p><h3 id="movement-media-title">Spread the Word.</h3></div>
        <p>Ready-made posters and captions. Share the message, never someone else’s story.</p>
      </div>
      <div className="movement-media-posters">
        {movementMediaPosters.map((poster, index) => {
          return <article className={`movement-media-poster movement-media-poster-${index}`} key={poster.messageId}>
            <div className="movement-media-art">
              <CampaignArt messageId={poster.messageId} format="feed"/>
              <span className="sr-only">Graphic signature: {poster.signature}</span>
            </div>
            <div className="movement-media-copy">
              <span className="movement-media-index">POSTER 0{index + 1}</span>
              <h4>{poster.heading}</h4>
              <p>Portrait campaign graphic · 1080 × 1350</p>
              <button type="button" className="movement-media-download" disabled={busy} onClick={() => downloadGraphic(poster.messageId, 'feed')}>
                <Download size={16} aria-hidden="true"/> Download poster
              </button>
            </div>
          </article>
        })}
      </div>
      <div className="movement-caption-kit">
        <div className="movement-caption-heading">
          <div><p className="eyebrow">READY TO COPY</p><h4>Captions for a kinder feed.</h4></div>
          <p>Use as-is or make them your own. No personal disclosure required.</p>
        </div>
        <div className="movement-caption-grid">
          {movementSocialCaptions.map(caption => <article className="movement-caption-card" key={caption.id}>
            <span>{caption.label}</span>
            <p>{caption.text}</p>
            <button type="button" onClick={() => copyCampaignCaption(caption.text)}><Copy size={15} aria-hidden="true"/> Copy caption</button>
          </article>)}
        </div>
      </div>
      <p className="movement-media-privacy"><Heart size={15} aria-hidden="true"/> These graphics and captions contain campaign messages only—never personal tracker data, quiz answers, or check-ins.</p>
    </section>

    <section className="movement-about" aria-labelledby="movement-about-title">
      <div className="movement-about-art" aria-hidden="true"><span>RESET</span><strong>Care<br/>over<br/><em>stigma.</em></strong><i>✳</i></div>
      <div className="movement-about-copy">
        <p className="eyebrow">ABOUT THIS CAMPAIGN</p>
        <h3 id="movement-about-title">Awareness that leaves room for everyone.</h3>
        <p>RESET helps young adults and their allies challenge stigma, explore support, and make informed choices. Learn with the quiz, join the Movement, collect optional digital keychains, or use the personal tracker at your own pace.</p>
        <p>Join as a person in recovery, a friend, family member, or ally—no account, personal details, or public sharing required. The tracker is optional and stays separate from campaign participation.</p>
        <div className="movement-about-actions">
          <a href="#learn" onClick={event => onNavigate(event, 'learn')}>Take the quiz <ArrowRight size={16} aria-hidden="true"/></a>
          <a href="#support" onClick={event => onNavigate(event, 'support')}>Explore support <ArrowRight size={16} aria-hidden="true"/></a>
          <a href="#journey" onClick={event => onNavigate(event, 'journey')}>Open my optional tracker <ArrowRight size={16} aria-hidden="true"/></a>
          <button type="button" onClick={() => moveTo(generatorHeading)}>Download or share a graphic <ArrowDown size={16} aria-hidden="true"/></button>
        </div>
      </div>
    </section>

    <section className="movement-keychains" aria-labelledby="movement-keychains-title">
      <div className="movement-keychain-visual"><MovementKeychain/><span>DIGITAL COLLECTIBLE</span></div>
      <div className="movement-keychain-copy">
        <p className="eyebrow">A LITTLE SYMBOL. NO PRESSURE.</p>
        <h3 id="movement-keychains-title">Awareness deserves<br/><span>a keepsake.</span></h3>
        <p>The Break the Stigma quiz already unlocks its own digital keychain on this device. More digital designs are campaign concepts—participation is always the point, never a sobriety claim.</p>
        <a href="#learn" onClick={event => onNavigate(event, 'learn')}>Explore the existing keychain <ArrowRight size={17} aria-hidden="true"/></a>
        <a href="#rewards" onClick={event => onNavigate(event, 'rewards')}>See the full Rewards collection <ArrowRight size={17} aria-hidden="true"/></a>
        <small>Physical keychains are only a future campaign concept. None are currently available.</small>
      </div>
    </section>

    <footer className="movement-footer">
      <span>Change the conversation, one moment at a time.</span>
      <a href="#home" onClick={event => onNavigate(event, 'home')}>Back to RESET <ArrowRight size={16} aria-hidden="true"/></a>
    </footer>
  </section>
}
