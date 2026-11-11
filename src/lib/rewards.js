import { movementActivityIds, readMovementMilestones } from './movementCampaign.js'
import { readStigmaUnlocks } from './stigmaQuiz.js'

export const rewardsActivityKey = 'reset.rewards.activities.v1'
export const rewardsSeenKey = 'reset.rewards.seen.v1'

const rewardActivities = ['campaign-visit', 'share-explored']

export const rewardsCollection = [
  {
    id: 'start-somewhere',
    name: 'START SOMEWHERE',
    shortName: 'Start Somewhere',
    message: 'Every beginning can be a small one.',
    requirement: 'Visit The Movement campaign. No personal story or disclosure needed.',
    palette: { background: '#FF775E', accent: '#D9EF9B', panel: '#FFF0D9' },
    motif: 'spark',
  },
  {
    id: 'break-the-stigma',
    name: 'BREAK THE STIGMA',
    shortName: 'Break the Stigma',
    message: 'You helped make more room for care.',
    requirement: 'Complete all five questions in the Break the Stigma quiz.',
    palette: { background: '#C8B8F5', accent: '#FF775E', panel: '#FFF0D9' },
    motif: 'heart',
  },
  {
    id: 'keep-showing-up',
    name: 'KEEP SHOWING UP',
    shortName: 'Keep Showing Up',
    message: 'Awareness grows one choice at a time.',
    requirement: 'Explore any two: the quiz, the language guide, or downloading a campaign graphic.',
    palette: { background: '#D9EF9B', accent: '#C8B8F5', panel: '#FFF0D9' },
    motif: 'sunrise',
  },
  {
    id: 'spread-the-love',
    name: 'SPREAD THE LOVE',
    shortName: 'Spread the Love',
    message: 'Care can travel without sharing your story.',
    requirement: 'Explore the campaign-card sharing activity. Posting or sharing is never required.',
    palette: { background: '#FFF0D9', accent: '#FF775E', panel: '#C8B8F5' },
    motif: 'orbit',
  },
]

function getStorage(storage) {
  if (storage) return storage
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

function readArray(storage, key, allowedValues) {
  try {
    const stored = getStorage(storage)?.getItem(key)
    const parsed = JSON.parse(stored || '[]')
    if (!Array.isArray(parsed)) return []
    return allowedValues.filter(value => parsed.includes(value))
  } catch {
    return []
  }
}

function writeArray(storage, key, next) {
  const target = getStorage(storage)
  if (!target) throw new Error('Local storage is unavailable.')

  let priorValue
  let priorRead = false
  try {
    priorValue = target.getItem(key)
    priorRead = true
    target.setItem(key, JSON.stringify(next))
  } catch (error) {
    if (priorRead) {
      try {
        if (priorValue === null) target.removeItem(key)
        else target.setItem(key, priorValue)
      } catch {
        // Preserve the original storage error.
      }
    }
    throw new Error('Could not save your Rewards progress on this device.', { cause: error })
  }
  return next
}

export function readRewardsActivities(storage) {
  return readArray(storage, rewardsActivityKey, rewardActivities)
}

export function recordRewardsActivity(activity, storage) {
  if (!rewardActivities.includes(activity)) throw new RangeError(`Unknown Rewards activity: ${activity}`)
  const previous = readRewardsActivities(storage)
  if (previous.includes(activity)) return previous
  const next = [...previous, activity]
  writeArray(storage, rewardsActivityKey, next)
  return next
}

export function readSeenRewards(storage) {
  return readArray(storage, rewardsSeenKey, rewardsCollection.map(reward => reward.id))
}

export function markRewardsSeen(rewardIds, storage) {
  const validIds = new Set(rewardsCollection.map(reward => reward.id))
  if (!Array.isArray(rewardIds) || rewardIds.some(id => !validIds.has(id))) {
    throw new RangeError('Choose valid keychains from the Rewards collection.')
  }
  const previous = readSeenRewards(storage)
  const next = [...previous, ...rewardIds.filter(id => !previous.includes(id))]
  writeArray(storage, rewardsSeenKey, next)
  return next
}

export function getUnlockedRewards(storage) {
  const activities = readRewardsActivities(storage)
  const completedMovementActivities = readMovementMilestones(storage)
  const quizCompleted = readStigmaUnlocks(storage).completed
  const enoughParticipation = movementActivityIds
    .filter(activity => activity !== 'share-explored')
    .filter(activity => activity === 'learn' ? quizCompleted : completedMovementActivities.includes(activity))
    .length >= 2

  return rewardsCollection
    .filter(reward => {
      if (reward.id === 'start-somewhere') return activities.includes('campaign-visit')
      if (reward.id === 'break-the-stigma') return quizCompleted
      if (reward.id === 'keep-showing-up') return enoughParticipation
      return activities.includes('share-explored')
    })
    .map(reward => reward.id)
}

const motifMarkup = {
  spark: `<path d="m240 142 25 49 54 8-39 38 9 54-49-25-49 25 9-54-39-38 54-8 25-49Z" fill="#302F29"/>`,
  heart: `<path d="M240 281s-90-58-90-112c0-49 63-66 90-18 27-48 90-31 90 18 0 54-90 112-90 112Z" fill="#FF775E" stroke="#302F29" stroke-width="8" stroke-linejoin="round"/>`,
  sunrise: `<path d="M166 271a74 74 0 0 1 148 0M130 271h220M240 147v35m-75-3 22 24m128-24-22 24m-91-72 13 31m102-31-13 31" fill="none" stroke="#302F29" stroke-width="11" stroke-linecap="round"/>`,
  orbit: `<circle cx="240" cy="215" r="68" fill="none" stroke="#302F29" stroke-width="9"/><circle cx="240" cy="215" r="30" fill="#FF775E" stroke="#302F29" stroke-width="7"/><circle cx="177" cy="157" r="17" fill="#D9EF9B" stroke="#302F29" stroke-width="6"/><circle cx="302" cy="269" r="17" fill="#FFF0D9" stroke="#302F29" stroke-width="6"/>`,
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character])
}

export function createRewardKeychainSvg(rewardId) {
  const reward = rewardsCollection.find(item => item.id === rewardId)
  if (!reward) throw new RangeError(`Unknown keychain: ${rewardId}`)
  const { background, accent, panel } = reward.palette
  const safeName = escapeXml(reward.name)
  const safeMessage = escapeXml(reward.message)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1260" viewBox="0 0 480 560">
  <rect width="480" height="560" fill="${background}"/>
  <circle cx="55" cy="90" r="112" fill="${accent}" opacity=".95"/>
  <circle cx="448" cy="478" r="132" fill="${panel}" opacity=".75"/>
  <circle cx="240" cy="54" r="31" fill="${panel}" stroke="#302F29" stroke-width="8"/>
  <circle cx="240" cy="54" r="13" fill="none" stroke="${accent}" stroke-width="8"/>
  <path d="M240 85v34" stroke="#302F29" stroke-width="12" stroke-linecap="round"/>
  <circle cx="240" cy="120" r="12" fill="${accent}" stroke="#302F29" stroke-width="6"/>
  <path d="m240 122 174 95v167l-174 88-174-88V217l174-95Z" fill="${accent}" stroke="#302F29" stroke-width="10" stroke-linejoin="round"/>
  <path d="m240 155 139 77v146l-139 70-139-70V232l139-77Z" fill="${panel}" stroke="#302F29" stroke-width="6" stroke-linejoin="round"/>
  ${motifMarkup[reward.motif]}
  <text x="240" y="350" text-anchor="middle" fill="#302F29" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="900" letter-spacing="2">${safeName}</text>
  <text x="240" y="382" text-anchor="middle" fill="#403B33" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="600">${safeMessage}</text>
  <text x="240" y="502" text-anchor="middle" fill="#302F29" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="4">#MyResetJourney</text>
</svg>`
}

export function renderRewardKeychainPng(rewardId, environment = {}) {
  const svg = createRewardKeychainSvg(rewardId)
  const documentObject = environment.documentObject ?? globalThis.document
  const ImageConstructor = environment.ImageConstructor ?? globalThis.Image
  const URLApi = environment.URLApi ?? globalThis.URL
  const BlobConstructor = environment.BlobConstructor ?? globalThis.Blob
  if (!documentObject || !ImageConstructor || !URLApi?.createObjectURL || !BlobConstructor) {
    return Promise.reject(new Error('Keychain downloads are not available in this browser.'))
  }

  let svgUrl
  try {
    svgUrl = URLApi.createObjectURL(new BlobConstructor([svg], { type: 'image/svg+xml;charset=utf-8' }))
  } catch {
    return Promise.reject(new Error('The keychain image could not be prepared for download.'))
  }

  return new Promise((resolve, reject) => {
    const image = new ImageConstructor()
    const cleanup = () => URLApi.revokeObjectURL(svgUrl)
    image.onload = () => {
      try {
        const canvas = documentObject.createElement('canvas')
        canvas.width = 1080
        canvas.height = 1260
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas drawing is unavailable.')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          cleanup()
          if (blob) resolve(blob)
          else reject(new Error('The PNG image could not be created.'))
        }, 'image/png')
      } catch (error) {
        cleanup()
        reject(error)
      }
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('The keychain image could not be rendered.'))
    }
    image.src = svgUrl
  })
}
