import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  createCampaignGraphicSvg,
  movementActivityIds,
  movementCaption,
  movementMediaPosters,
  movementMessages,
  movementSocialCaptions,
  movementMilestonesKey,
  readMovementMilestones,
  renderCampaignPng,
  saveMovementMilestone,
} from '../src/lib/movementCampaign.js'

const movementSource = readFileSync(new URL('../src/Movement.jsx', import.meta.url), 'utf8')
const stigmaSource = readFileSync(new URL('../src/BreakTheStigma.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    values,
  }
}

test('campaign cards contain only the four fixed messages and RESET colors', () => {
  assert.deepEqual(movementMessages.map(message => message.text), [
    "Recovery isn't one straight line.",
    'Support over stigma.',
    'Small steps deserve recognition.',
    'Your journey. Your pace.',
  ])
  for (const message of movementMessages) {
    const svg = createCampaignGraphicSvg(message.id)
    assert.match(svg, /width="1080" height="1350"/)
    assert.match(svg, /#302F29/)
    assert(svg.includes(message.signature))
    assert.match(svg, new RegExp(message.background))
    for (const line of message.lines) assert(svg.includes(line))
  }
  assert.match(createCampaignGraphicSvg('your-pace', 'story'), /width="1080" height="1920"/)
  assert.throws(() => createCampaignGraphicSvg('not-a-message'), RangeError)
  assert.throws(() => createCampaignGraphicSvg('your-pace', 'square'), RangeError)
})

test('media kit reuses three specified campaign designs with distinct signatures and captions', () => {
  assert.deepEqual(movementMediaPosters.map(poster => [poster.heading, poster.signature]), [
    ["Recovery isn't one straight line.", '#MyResetJourney'],
    ['Support over stigma.', 'RESET'],
    ['Your journey. Your pace.', 'RESET'],
  ])
  assert.deepEqual(movementMediaPosters.map(poster => poster.messageId), [
    'recovery-path',
    'support-first',
    'your-pace',
  ])
  assert.equal(movementSocialCaptions.length, 3)
  for (const caption of movementSocialCaptions) {
    assert(caption.text.length > 80)
    assert.match(caption.text, /#MyResetJourney/)
    assert.doesNotMatch(caption.text, /personal progress|mood|score|sobriety streak/i)
  }
})

test('campaign PNG renderer produces the requested high-resolution format and releases its SVG URL', async () => {
  const createdTypes = []
  const revokedUrls = []
  const drawn = []
  let canvas
  const URLApi = {
    createObjectURL(blob) {
      createdTypes.push(blob.type)
      return 'blob:movement-svg'
    },
    revokeObjectURL(url) {
      revokedUrls.push(url)
    },
  }
  class MockImage {
    set src(value) {
      this.value = value
      queueMicrotask(() => this.onload())
    }
  }
  const documentObject = {
    createElement(tag) {
      assert.equal(tag, 'canvas')
      canvas = {
        getContext: type => {
          assert.equal(type, '2d')
          return { drawImage: (...args) => drawn.push(args) }
        },
        toBlob: callback => callback(new Blob(['png content'], { type: 'image/png' })),
      }
      return canvas
    },
  }

  const blob = await renderCampaignPng('support-first', 'story', { documentObject, ImageConstructor: MockImage, URLApi })
  assert.equal(blob.type, 'image/png')
  assert.deepEqual(createdTypes, ['image/svg+xml;charset=utf-8'])
  assert.deepEqual(revokedUrls, ['blob:movement-svg'])
  assert.equal(canvas.width, 1080)
  assert.equal(canvas.height, 1920)
  assert.equal(drawn.length, 1)
})

test('awareness milestones persist only under their own local key', () => {
  const storage = createStorage({ 'reset.wellbeing.v1': 'journey and check-in', 'reset.stigma.completed.v1': 'true' })
  assert.deepEqual(readMovementMilestones(storage), [])
  assert.deepEqual(saveMovementMilestone('learn', storage), ['learn'])
  assert.deepEqual(saveMovementMilestone('campaign-graphic', storage), ['learn', 'campaign-graphic'])
  assert.deepEqual(readMovementMilestones(storage), ['learn', 'campaign-graphic'])
  assert.equal(storage.getItem('reset.wellbeing.v1'), 'journey and check-in')
  assert.equal(storage.getItem('reset.stigma.completed.v1'), 'true')
  assert.equal(storage.values.size, 3)
  assert.deepEqual(movementActivityIds, ['learn', 'language-guide', 'campaign-graphic'])
  assert.throws(() => saveMovementMilestone('sobriety', storage), RangeError)
})

test('milestone persistence failures do not replace previous local values', () => {
  const storage = createStorage({
    [movementMilestonesKey]: '["language-guide"]',
    'reset.wellbeing.v1': 'existing tracker data',
  })
  const originalSetItem = storage.setItem
  storage.setItem = (key, value) => {
    if (key === movementMilestonesKey) throw new Error('storage is full')
    originalSetItem(key, value)
  }
  assert.throws(() => saveMovementMilestone('campaign-graphic', storage), /Could not save/)
  assert.equal(storage.getItem(movementMilestonesKey), '["language-guide"]')
  assert.equal(storage.getItem('reset.wellbeing.v1'), 'existing tracker data')
})

test('caption and exported graphics contain no personal or tracker information', () => {
  assert.equal(movementCaption, '#MyResetJourney — Change the conversation. Lead with care, not judgment.')
  assert.doesNotMatch(movementCaption, /mood|score|answer|sobriety|journey day/i)
  const allGraphics = movementMessages.map(message => createCampaignGraphicSvg(message.id)).join('\n')
  assert.doesNotMatch(allGraphics, /reset\.wellbeing|reset\.stigma|goal|check-in|quiz answer/i)
  assert.match(movementSource, /never your tracker, check-ins, or quiz answers/)
  assert.match(movementSource, /aria-pressed=\{selectedMessage === message\.id\}/)
  assert.match(movementSource, /movement\.milestones\.v1|saveMovementMilestone/)
  assert.match(movementSource, /Physical keychains are only a future campaign concept/)
  assert.match(movementSource, /Spread the Word\./)
  assert.match(movementSource, /ABOUT THIS CAMPAIGN/i)
  assert.match(movementSource, /Explore support/)
  assert.match(movementSource, /Open my optional tracker/)
  assert.match(movementSource, /copyCampaignCaption\(caption\.text\)/)
  assert.match(movementSource, /downloadGraphic\(poster\.messageId, 'feed'\)/)
  assert.doesNotMatch(movementSource, /supabase|sendBeacon|fetch\(/i)
  assert.match(appSource, /activeView === 'movement'/)
  assert.match(stigmaSource, /onComplete\?\.\(\)/)
  assert.match(appSource, /saveMovementMilestone\('learn'\)/)
})
