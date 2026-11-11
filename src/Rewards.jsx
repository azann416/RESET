import { useState } from 'react'
import { ArrowRight, Check, Download, Heart, LockKeyhole, Sparkles } from 'lucide-react'
import StigmaKeychainIllustration from './StigmaKeychainIllustration'
import {
  createRewardKeychainSvg,
  getUnlockedRewards,
  markRewardsSeen,
  readSeenRewards,
  renderRewardKeychainPng,
  rewardsCollection,
} from './lib/rewards'

function KeychainArt({ reward, locked = false, compact = false }) {
  if (reward.id === 'break-the-stigma') {
    return <StigmaKeychainIllustration
      className={`stigma-keychain-art rewards-keychain-art${compact ? ' is-compact' : ''}${locked ? ' is-locked' : ''}`}
      titleId={`rewards-keychain-${compact ? 'reveal-' : ''}${reward.id}`}
      description={locked ? `Locked ${reward.shortName} keychain preview` : `${reward.shortName} digital keychain collectible`}
    />
  }
  const svg = createRewardKeychainSvg(reward.id)
  return <img
    className={`rewards-keychain-art${compact ? ' is-compact' : ''}${locked ? ' is-locked' : ''}`}
    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
    alt={locked ? `Locked ${reward.shortName} keychain preview` : `${reward.shortName} digital keychain collectible`}
  />
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function Rewards({ onNavigate }) {
  const unlocked = getUnlockedRewards()
  const [seen, setSeen] = useState(readSeenRewards)
  const [status, setStatus] = useState('')
  const [downloading, setDownloading] = useState('')
  const newlyUnlocked = unlocked.filter(id => !seen.includes(id))
  const revealReward = rewardsCollection.find(reward => reward.id === newlyUnlocked.at(-1))

  function acknowledgeUnlocks() {
    try {
      setSeen(markRewardsSeen(newlyUnlocked))
      setStatus('Your new keychains are saved in your collection on this device.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function downloadKeychain(reward) {
    setDownloading(reward.id)
    setStatus('')
    try {
      const blob = await renderRewardKeychainPng(reward.id)
      downloadBlob(blob, `reset-keychain-${reward.id}.png`)
      setStatus(`${reward.shortName} keychain PNG downloaded. It contains campaign artwork only.`)
    } catch (error) {
      setStatus(error.message || 'The keychain could not be downloaded. Please try again.')
    } finally {
      setDownloading('')
    }
  }

  return <section id="rewards" className="section-wrap rewards-page" aria-labelledby="rewards-title">
    <header className="rewards-hero">
      <div className="rewards-hero-copy">
        <p className="eyebrow"><Sparkles size={16} aria-hidden="true"/> YOUR AWARENESS, YOUR PACE</p>
        <h2 id="rewards-title">Little symbols.<br/><span>Real meaning.</span></h2>
        <p>Every step toward awareness matters.</p>
        <div className="rewards-hero-note"><Heart size={16} aria-hidden="true"/> For people in recovery, friends, family, and allies.</div>
      </div>
      <div className="rewards-hero-art" aria-hidden="true">
        <div className="rewards-hero-orbit"><span>✳</span></div>
        <KeychainArt reward={rewardsCollection[0]} compact/>
        <span className="rewards-hero-spark rewards-spark-one">✦</span>
        <span className="rewards-hero-spark rewards-spark-two">♥</span>
      </div>
    </header>

    {revealReward && <section className="rewards-reveal" aria-labelledby="rewards-reveal-title">
      <div className="rewards-reveal-art"><KeychainArt reward={revealReward} compact/></div>
      <div className="rewards-reveal-copy">
        <p className="eyebrow"><Sparkles size={15} aria-hidden="true"/> A NEW KEYCHAIN IS YOURS</p>
        <h3 id="rewards-reveal-title">{revealReward.shortName}.</h3>
        <p>{revealReward.message}</p>
        <button type="button" className="rewards-acknowledge" onClick={acknowledgeUnlocks}>
          Add to my collection <Check size={17} aria-hidden="true"/>
        </button>
      </div>
    </section>}

    <section className="rewards-collection" aria-labelledby="rewards-collection-title">
      <div className="rewards-section-heading">
        <div><p className="eyebrow">YOUR DIGITAL COLLECTION</p><h3 id="rewards-collection-title">Every badge tells a story of awareness.</h3></div>
        <div className="rewards-progress" role="progressbar" aria-label="Keychains unlocked" aria-valuemin="0" aria-valuemax={rewardsCollection.length} aria-valuenow={unlocked.length}>
          <span>{unlocked.length} <small>/ {rewardsCollection.length}</small></span>
          <span className="rewards-progress-track"><span style={{ width: `${(unlocked.length / rewardsCollection.length) * 100}%` }}/></span>
          <small>unlocked</small>
        </div>
      </div>
      <div className="rewards-grid">
        {rewardsCollection.map((reward, index) => {
          const isUnlocked = unlocked.includes(reward.id)
          return <article className={`rewards-card rewards-card-${index}${isUnlocked ? ' is-unlocked' : ' is-locked'}`} key={reward.id}>
            <div className="rewards-card-art">
              <span className="rewards-card-index">0{index + 1}</span>
              <KeychainArt reward={reward} locked={!isUnlocked}/>
              {isUnlocked
                ? <span className="rewards-state"><Check size={14} aria-hidden="true"/> UNLOCKED</span>
                : <span className="rewards-state"><LockKeyhole size={13} aria-hidden="true"/> LOCKED</span>}
            </div>
            <div className="rewards-card-copy">
              <h4>{reward.name}</h4>
              <p>{reward.message}</p>
              <div className="rewards-how"><span>{isUnlocked ? 'YOU EARNED THIS BY' : 'UNLOCK IT BY'}</span><p>{reward.requirement}</p></div>
              {isUnlocked
                ? <button className="rewards-download" type="button" disabled={downloading === reward.id} onClick={() => downloadKeychain(reward)}>
                  <Download size={16} aria-hidden="true"/>{downloading === reward.id ? 'Preparing image…' : 'Download keychain'}
                </button>
                : reward.id === 'start-somewhere'
                  ? <a className="rewards-locked-link" href="#movement" onClick={event => onNavigate(event, 'movement')}>Visit The Movement <ArrowRight size={16} aria-hidden="true"/></a>
                  : reward.id === 'break-the-stigma'
                    ? <a className="rewards-locked-link" href="#learn" onClick={event => onNavigate(event, 'learn')}>Explore the quiz <ArrowRight size={16} aria-hidden="true"/></a>
                    : reward.id === 'spread-the-love'
                      ? <a className="rewards-locked-link" href="#movement" onClick={event => onNavigate(event, 'movement')}>Explore campaign cards <ArrowRight size={16} aria-hidden="true"/></a>
                      : <a className="rewards-locked-link" href="#movement" onClick={event => onNavigate(event, 'movement')}>Explore activities <ArrowRight size={16} aria-hidden="true"/></a>}
            </div>
          </article>
        })}
      </div>
      <p className="rewards-privacy"><LockKeyhole size={14} aria-hidden="true"/> Unlocks stay on this device. No account, personal disclosure, or social post is needed.</p>
      {status && <p className="rewards-status" role="status" aria-live="polite">{status}</p>}
    </section>

    <section className="rewards-physical" aria-labelledby="rewards-physical-title">
      <div className="rewards-physical-sticker" aria-hidden="true"><span>CONCEPT · COMING SOON</span><strong>✳</strong></div>
      <div>
        <p className="eyebrow">A FUTURE CAMPAIGN IDEA</p>
        <h3 id="rewards-physical-title">Digital for now.<br/><span>Possibilities for later.</span></h3>
        <p>Physical RESET keychains are a concept for a future campaign. They are not currently available; no prizes, shipping, or giveaways are offered.</p>
      </div>
    </section>

    <footer className="rewards-footer">
      <span>Recognition for showing up to awareness—not for sobriety claims or streaks.</span>
      <a href="#movement" onClick={event => onNavigate(event, 'movement')}>Back to The Movement <ArrowRight size={16} aria-hidden="true"/></a>
    </footer>
  </section>
}
