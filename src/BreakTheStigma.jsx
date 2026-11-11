import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Copy, Heart, RotateCcw, Sparkles } from 'lucide-react'
import StigmaKeychainIllustration from './StigmaKeychainIllustration'
import {
  getNextStigmaStep,
  getStigmaFeedback,
  isStigmaQuizComplete,
  readStigmaUnlocks,
  saveStigmaUnlocks,
  stigmaQuestions,
  stigmaShareMessage,
} from './lib/stigmaQuiz'

export default function BreakTheStigma({ onNavigate, onComplete }) {
  const [unlocks, setUnlocks] = useState(readStigmaUnlocks)
  const [step, setStep] = useState(() => unlocks.completed && unlocks.keychainUnlocked ? stigmaQuestions.length : 0)
  const [selected, setSelected] = useState(null)
  const [saved, setSaved] = useState(unlocks.completed && unlocks.keychainUnlocked)
  const [saveError, setSaveError] = useState('')
  const [shareStatus, setShareStatus] = useState('')
  const questionHeading = useRef(null)
  const completionHeading = useRef(null)
  const question = stigmaQuestions[step]
  const feedback = question && selected ? getStigmaFeedback(question.id, selected) : null
  const complete = isStigmaQuizComplete(step)

  useEffect(() => {
    if (complete) completionHeading.current?.focus({ preventScroll: true })
    else questionHeading.current?.focus({ preventScroll: true })
  }, [step, complete])

  function advance() {
    const nextStep = getNextStigmaStep(step)
    setSelected(null)
    setStep(nextStep)
    if (isStigmaQuizComplete(nextStep)) {
      try {
        saveStigmaUnlocks()
        setUnlocks({ completed: true, keychainUnlocked: true })
        setSaved(true)
        setSaveError('')
      } catch {
        setUnlocks({ completed: true, keychainUnlocked: true })
        setSaved(false)
        setSaveError('Your keychain is unlocked for this visit, but this browser could not save it for next time.')
      }
      onComplete?.()
    }
  }

  function replay() {
    setStep(0)
    setSelected(null)
    setShareStatus('')
    setSaveError('')
  }

  async function copyCampaignMessage() {
    try {
      await navigator.clipboard.writeText(stigmaShareMessage)
      setShareStatus('Campaign message copied. Share only if and when you want to.')
    } catch {
      setShareStatus('Copy isn’t available here. You can select and copy the campaign message above.')
    }
  }

  return <section className="section-wrap stigma-page" aria-labelledby="stigma-title">
    <header className="stigma-intro">
      <div className="stigma-orbit stigma-orbit-one" aria-hidden="true">✳</div>
      <div className="stigma-orbit stigma-orbit-two" aria-hidden="true">♥</div>
      <p className="eyebrow"><Sparkles size={15} aria-hidden="true"/> LEARN · LISTEN · UNLEARN</p>
      <h2 id="stigma-title">Break the <span>stigma.</span></h2>
      <p>Five quick moments. Better facts. More room for care.</p>
      <div className="stigma-welcome-note"><Heart size={17} aria-hidden="true"/><span>For everyone: people with lived experience, friends, family, and allies.</span></div>
    </header>

    {!complete ? <section className="stigma-quiz" aria-label="Break the Stigma quiz">
      <div className="stigma-quiz-topline">
        <span>THE RESET REALITY CHECK</span>
        <span>QUESTION {step + 1} <span aria-hidden="true">/</span> {stigmaQuestions.length}</span>
      </div>
      <div className="stigma-progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax={stigmaQuestions.length} aria-valuenow={step}>
        <span style={{ width: `${(step / stigmaQuestions.length) * 100}%` }}/>
      </div>
      <div className="stigma-question" key={question.id}>
        <p className="stigma-question-theme">{question.theme}</p>
        <h3 id={`stigma-question-${question.id}`} ref={questionHeading} tabIndex="-1">{question.prompt}</h3>
        <p className="stigma-question-context">{question.context}</p>
        <div className="stigma-answer-list" role="group" aria-labelledby={`stigma-question-${question.id}`}>
          {question.options.map((option, index) => {
            const chosen = selected === option.id
            const result = chosen ? feedback : null
            return <button
              className={`stigma-answer${chosen ? result.correct ? ' is-correct' : ' is-rethink' : ''}`}
              type="button"
              key={option.id}
              aria-pressed={chosen}
              onClick={() => setSelected(option.id)}
            >
              <span className="stigma-answer-letter" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              <span className="stigma-answer-copy">{option.label}</span>
              {chosen && <span className="stigma-answer-mark" aria-hidden="true">{result.correct ? <Check size={18}/> : <Heart size={17}/>}</span>}
            </button>
          })}
        </div>
        {feedback && <div className={`stigma-feedback${feedback.correct ? ' is-correct' : ' is-rethink'}`} role="status" aria-live="polite">
          <strong>{feedback.correct ? 'You got it.' : 'A chance to learn, not a judgment.'}</strong>
          <p>{feedback.text}</p>
          <a href={feedback.href} target="_blank" rel="noopener noreferrer">{feedback.source} <span aria-hidden="true">↗</span></a>
        </div>}
      </div>
      <div className="stigma-quiz-actions">
        <a href="#home" className="stigma-back-link" onClick={event => onNavigate(event, 'home')}><ArrowLeft size={16}/> Back to RESET</a>
        <button className="button stigma-next" type="button" disabled={!selected} onClick={advance}>
          {step === stigmaQuestions.length - 1 ? 'Reveal my keychain' : 'Next'}
          <ArrowRight size={18} aria-hidden="true"/>
        </button>
      </div>
      <p className="stigma-privacy-note">Your answers stay on this screen and are not saved or sent anywhere.</p>
    </section> : <section className="stigma-completion" aria-labelledby="stigma-complete-title">
      <div className="stigma-keychain-wrap"><StigmaKeychainIllustration/><span className="stigma-keychain-tag">DIGITAL COLLECTIBLE</span></div>
      <div className="stigma-completion-copy">
        <p className="stigma-completion-eyebrow"><Sparkles size={16}/> A LITTLE LIGHT, PASSED ON</p>
        <h3 id="stigma-complete-title" ref={completionHeading} tabIndex="-1">You helped<br/><span>break the stigma.</span></h3>
        <p>You showed up for awareness. That matters. This digital keychain is yours on this device—no personal story or recovery claim required.</p>
        {saveError && <p className="stigma-save-error" role="status">{saveError}</p>}
        {saved && <p className="stigma-saved-note" role="status"><Check size={16}/> Saved on this device. Your quiz answers weren’t saved.</p>}
        <div className="stigma-share-card" aria-label="Optional campaign message to share">
          <span>#MYRESETJOURNEY · PASS IT ON IF YOU WANT</span>
          <blockquote>{stigmaShareMessage}</blockquote>
          <button type="button" className="stigma-copy-button" onClick={copyCampaignMessage}><Copy size={16}/> Copy campaign message</button>
          <p className="stigma-share-status" role="status" aria-live="polite">{shareStatus}</p>
        </div>
        <div className="stigma-completion-actions">
          <button type="button" className="button" onClick={replay}><RotateCcw size={17}/> Replay the quiz</button>
          <a className="stigma-support-action" href="#support" onClick={event => onNavigate(event, 'support')}>Explore support <ArrowRight size={17}/></a>
          <a className="stigma-home-action" href="#home" onClick={event => onNavigate(event, 'home')}>Back to campaign home</a>
        </div>
      </div>
    </section>}

    <footer className="stigma-sources">
      <p>Awareness, not a test of anyone’s recovery. Need help finding support?</p>
      <a href="https://www.canada.ca/en/health-canada/services/substance-use/get-help-with-substance-use.html" target="_blank" rel="noopener noreferrer">Explore Health Canada support resources <span aria-hidden="true">↗</span></a>
    </footer>
  </section>
}
