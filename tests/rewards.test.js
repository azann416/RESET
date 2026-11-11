import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { saveMovementMilestone } from '../src/lib/movementCampaign.js'
import { stigmaCompletionKey, stigmaKeychainKey } from '../src/lib/stigmaQuiz.js'
import {
  createRewardKeychainSvg,
  getUnlockedRewards,
  markRewardsSeen,
  readRewardsActivities,
  readSeenRewards,
  recordRewardsActivity,
  renderRewardKeychainPng,
  rewardsActivityKey,
  rewardsCollection,
} from '../src/lib/rewards.js'

const rewardsSource = readFileSync(new URL('../src/Rewards.jsx', import.meta.url), 'utf8')
const movementSource = readFileSync(new URL('../src/Movement.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const quizSource = readFileSync(new URL('../src/BreakTheStigma.jsx', import.meta.url), 'utf8')

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    values,
  }
}

test('four reward unlocks require the documented local completion events', () => {
  const storage = createStorage({
    'reset.wellbeing.v1': 'existing journey and mood records',
  })
  assert.deepEqual(getUnlockedRewards(storage), [])

  recordRewardsActivity('campaign-visit', storage)
  assert.deepEqual(getUnlockedRewards(storage), ['start-somewhere'])

  storage.setItem(stigmaCompletionKey, 'true')
  storage.setItem(stigmaKeychainKey, 'true')
  assert.deepEqual(getUnlockedRewards(storage), ['start-somewhere', 'break-the-stigma'])

  saveMovementMilestone('learn', storage)
  saveMovementMilestone('language-guide', storage)
  assert.deepEqual(getUnlockedRewards(storage), [
    'start-somewhere',
    'break-the-stigma',
    'keep-showing-up',
  ])
  assert.deepEqual(readRewardsActivities(storage), ['campaign-visit'])

  recordRewardsActivity('share-explored', storage)
  assert.deepEqual(getUnlockedRewards(storage), rewardsCollection.map(reward => reward.id))
  assert.equal(storage.getItem('reset.wellbeing.v1'), 'existing journey and mood records')
})

test('Keep Showing Up counts cumulative unique awareness activities rather than streaks', () => {
  const storage = createStorage({
    [stigmaCompletionKey]: 'true',
    [stigmaKeychainKey]: 'true',
  })
  saveMovementMilestone('learn', storage)
  assert.equal(getUnlockedRewards(storage).includes('keep-showing-up'), false)
  saveMovementMilestone('campaign-graphic', storage)
  assert.equal(getUnlockedRewards(storage).includes('keep-showing-up'), true)
  assert.doesNotMatch(rewardsSource, /consecutive.day|sobriety streak/i)
})

test('participation and reveal acknowledgement are isolated local records', () => {
  const storage = createStorage({
    'reset.wellbeing.v1': 'journey and check-in',
    [rewardsActivityKey]: '["campaign-visit"]',
  })
  assert.deepEqual(recordRewardsActivity('campaign-visit', storage), ['campaign-visit'])
  assert.deepEqual(recordRewardsActivity('share-explored', storage), ['campaign-visit', 'share-explored'])
  assert.deepEqual(readSeenRewards(storage), [])
  assert.deepEqual(markRewardsSeen(['start-somewhere'], storage), ['start-somewhere'])
  assert.deepEqual(markRewardsSeen(['spread-the-love'], storage), ['start-somewhere', 'spread-the-love'])
  assert.deepEqual(readSeenRewards(storage), ['start-somewhere', 'spread-the-love'])
  assert.equal(storage.getItem('reset.wellbeing.v1'), 'journey and check-in')
  assert.throws(() => recordRewardsActivity('posted-on-social', storage), RangeError)
  assert.throws(() => markRewardsSeen(['unknown-keychain'], storage), RangeError)
})

test('reward progress persistence errors are explicit and preserve previous values', () => {
  const storage = createStorage({
    [rewardsActivityKey]: '["campaign-visit"]',
    'reset.wellbeing.v1': 'existing personal records',
  })
  const originalSetItem = storage.setItem
  storage.setItem = (key, value) => {
    if (key === rewardsActivityKey) throw new Error('storage is full')
    originalSetItem(key, value)
  }
  assert.throws(() => recordRewardsActivity('share-explored', storage), /Could not save your Rewards/)
  assert.equal(storage.getItem(rewardsActivityKey), '["campaign-visit"]')
  assert.equal(storage.getItem('reset.wellbeing.v1'), 'existing personal records')
})

test('four illustrated keychain exports use campaign-only content and unique artwork', () => {
  const svgs = rewardsCollection.map(reward => createRewardKeychainSvg(reward.id))
  assert.equal(new Set(svgs).size, 4)
  for (const [index, reward] of rewardsCollection.entries()) {
    assert.match(svgs[index], /width="1080" height="1260"/)
    assert.match(svgs[index], /#MyResetJourney/)
    assert.match(svgs[index], new RegExp(reward.name))
    assert.match(svgs[index], new RegExp(reward.palette.background))
    assert.doesNotMatch(svgs[index], /reset\.wellbeing|check-in history|mood|substance-use history/i)
  }
  assert.throws(() => createRewardKeychainSvg('not-a-reward'), RangeError)
})

test('unlocked keychain PNGs download locally at high resolution', async () => {
  const createdTypes = []
  const revokedUrls = []
  let canvas
  const URLApi = {
    createObjectURL(blob) {
      createdTypes.push(blob.type)
      return 'blob:reward-svg'
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
        getContext: () => ({ drawImage() {} }),
        toBlob: callback => callback(new Blob(['image'], { type: 'image/png' })),
      }
      return canvas
    },
  }

  const result = await renderRewardKeychainPng('spread-the-love', {
    documentObject,
    ImageConstructor: MockImage,
    URLApi,
  })
  assert.equal(result.type, 'image/png')
  assert.deepEqual(createdTypes, ['image/svg+xml;charset=utf-8'])
  assert.deepEqual(revokedUrls, ['blob:reward-svg'])
  assert.equal(canvas.width, 1080)
  assert.equal(canvas.height, 1260)
})

test('Rewards exposes unlock criteria, private downloads, and new-unlock acknowledgement', () => {
  assert.match(rewardsSource, /getUnlockedRewards/)
  assert.match(rewardsSource, /LOCKED/)
  assert.match(rewardsSource, /UNLOCKED/)
  assert.match(rewardsSource, /Download keychain/)
  assert.match(rewardsSource, /aria-valuenow=\{unlocked\.length\}/)
  assert.match(rewardsSource, /Add to my collection/)
  assert.match(rewardsSource, /Every step toward awareness matters\./)
  assert.match(rewardsSource, /CONCEPT · COMING SOON/)
  assert.match(rewardsSource, /Physical RESET keychains are a concept/)
  assert.match(movementSource, /recordRewardsActivity\('share-explored'\)/)
  assert.match(appSource, /recordRewardsActivity\('campaign-visit'\)/)
  assert.match(appSource, /recordRewardsActivity\('campaign-visit'\)/)
  assert.match(rewardsSource, /StigmaKeychainIllustration/)
  assert.match(quizSource, /<StigmaKeychainIllustration\/>/)
})
