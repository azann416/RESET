import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getNextStigmaStep,
  getStigmaFeedback,
  isStigmaQuizComplete,
  readStigmaUnlocks,
  saveStigmaUnlocks,
  stigmaCompletionKey,
  stigmaKeychainKey,
  stigmaQuestions,
  stigmaShareMessage,
} from '../src/lib/stigmaQuiz.js'

const quizSource = readFileSync(new URL('../src/BreakTheStigma.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    values,
  }
}

test('quiz has five distinct questions and each answer gives sourced, nonjudgmental feedback', () => {
  assert.equal(stigmaQuestions.length, 5)
  assert.equal(new Set(stigmaQuestions.map(question => question.id)).size, 5)
  for (const question of stigmaQuestions) {
    assert.equal(question.options.length, 3)
    assert.equal(new Set(question.options.map(option => option.id)).size, 3)
    assert(question.options.some(option => option.id === question.answer))
    for (const option of question.options) {
      const feedback = getStigmaFeedback(question.id, option.id)
      assert.equal(feedback.correct, option.id === question.answer)
      assert(feedback.text.length > 40)
      assert.match(feedback.href, /^https:\/\/(www\.)?(canada\.ca|camh\.ca)\//)
      assert.match(feedback.source, /Health Canada|CAMH/)
    }
  }
  assert.throws(() => getStigmaFeedback('not-a-question', 'not-an-answer'), RangeError)
})

test('Next advances one question at a time and completes after question five', () => {
  let step = 0
  for (let question = 0; question < stigmaQuestions.length; question += 1) {
    assert.equal(isStigmaQuizComplete(step), false)
    step = getNextStigmaStep(step)
    assert.equal(step, question + 1)
  }
  assert.equal(isStigmaQuizComplete(step), true)
  assert.equal(getNextStigmaStep(step), step)
})

test('completion and digital keychain persist only in new local keys', () => {
  const storage = createStorage({ 'reset.wellbeing.v1': '{"journey":{"goal":"Take a break"}}' })
  saveStigmaUnlocks(storage)
  assert.equal(storage.getItem(stigmaCompletionKey), 'true')
  assert.equal(storage.getItem(stigmaKeychainKey), 'true')
  assert.deepEqual(readStigmaUnlocks(storage), { completed: true, keychainUnlocked: true })
  assert.equal(storage.getItem('reset.wellbeing.v1'), '{"journey":{"goal":"Take a break"}}')
  assert.equal(storage.values.size, 3)
})

test('failed local persistence restores prior values and does not damage tracker data', () => {
  const storage = createStorage({
    'reset.wellbeing.v1': 'existing journey and mood',
    [stigmaCompletionKey]: 'previous completion',
  })
  const setItem = storage.setItem
  storage.setItem = (key, value) => {
    if (key === stigmaKeychainKey) throw new Error('storage is full')
    setItem(key, value)
  }
  assert.throws(() => saveStigmaUnlocks(storage), /Could not save/)
  assert.equal(storage.getItem(stigmaCompletionKey), 'previous completion')
  assert.equal(storage.getItem(stigmaKeychainKey), null)
  assert.equal(storage.getItem('reset.wellbeing.v1'), 'existing journey and mood')
})

test('share message is fixed campaign copy and never includes quiz or personal data', () => {
  assert.equal(
    stigmaShareMessage,
    '#MyResetJourney: Facts over stigma. Lead with care, respect, and support. Recovery can look different for everyone. #BreakTheStigma',
  )
  assert.doesNotMatch(stigmaShareMessage, /mood|score|answer|journey day|sobriety/i)
  assert.doesNotMatch(quizSource, /navigator\.sendBeacon|supabase|fetch\(/)
})

test('answers are not persisted; the completion view offers replay and support without requiring sharing', () => {
  assert.match(quizSource, /Your answers stay on this screen and are not saved or sent anywhere/)
  assert.match(quizSource, /You helped<br\/><span>break the stigma\.<\/span>/)
  assert.match(quizSource, /Replay the quiz/)
  assert.match(quizSource, /Explore support/)
  assert.match(quizSource, /Copy campaign message/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(appSource, /activeView === 'learn'/)
})
