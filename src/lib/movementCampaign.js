export const movementMilestonesKey = 'reset.movement.milestones.v1'

export const movementActivityIds = ['learn', 'language-guide', 'campaign-graphic']

export const movementMessages = [
  {
    id: 'recovery-path',
    text: "Recovery isn't one straight line.",
    lines: ["Recovery isn't", 'one straight line.'],
    signature: '#MyResetJourney',
    background: '#C8B8F5',
    accent: '#D9EF9B',
    panel: '#FFF0D9',
  },
  {
    id: 'support-first',
    text: 'Support over stigma.',
    lines: ['Support over', 'stigma.'],
    signature: 'RESET',
    background: '#FF775E',
    accent: '#D9EF9B',
    panel: '#FFF0D9',
  },
  {
    id: 'small-steps',
    text: 'Small steps deserve recognition.',
    lines: ['Small steps', 'deserve', 'recognition.'],
    signature: '#MyResetJourney',
    background: '#D9EF9B',
    accent: '#FF775E',
    panel: '#FFF0D9',
  },
  {
    id: 'your-pace',
    text: 'Your journey. Your pace.',
    lines: ['Your journey.', 'Your pace.'],
    signature: 'RESET',
    background: '#FFF0D9',
    accent: '#C8B8F5',
    panel: '#C8B8F5',
  },
]

export const movementCaption = '#MyResetJourney — Change the conversation. Lead with care, not judgment.'

export const movementMediaPosters = [
  { messageId: 'recovery-path', heading: "Recovery isn't one straight line.", signature: '#MyResetJourney' },
  { messageId: 'support-first', heading: 'Support over stigma.', signature: 'RESET' },
  { messageId: 'your-pace', heading: 'Your journey. Your pace.', signature: 'RESET' },
]

export const movementSocialCaptions = [
  {
    id: 'awareness',
    label: 'Awareness',
    text: 'Recovery can take many forms. Lead with empathy, listen without judgment, and help make support easier to find. #MyResetJourney #BreakTheStigma',
  },
  {
    id: 'support',
    label: 'Support',
    text: 'You don’t need the perfect words. Start by listening, respecting someone’s privacy, and asking what support would feel helpful. #MyResetJourney',
  },
  {
    id: 'allies',
    label: 'For allies',
    text: 'Friends, family, and allies belong in the conversation too. Challenge stigma with care—and remember, nobody owes the internet their story. #MyResetJourney',
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

function normalizeMilestones(value) {
  if (!Array.isArray(value)) return []
  return movementActivityIds.filter(id => value.includes(id))
}

export function readMovementMilestones(storage) {
  try {
    const stored = getStorage(storage)?.getItem(movementMilestonesKey)
    return normalizeMilestones(JSON.parse(stored || '[]'))
  } catch {
    return []
  }
}

export function saveMovementMilestone(id, storage) {
  if (!movementActivityIds.includes(id)) throw new RangeError(`Unknown movement activity: ${id}`)
  const target = getStorage(storage)
  if (!target) throw new Error('Local storage is unavailable.')

  let previous
  let previousRead = false
  try {
    previous = target.getItem(movementMilestonesKey)
    previousRead = true
    const next = normalizeMilestones([...readMovementMilestones(target), id])
    target.setItem(movementMilestonesKey, JSON.stringify(next))
    return next
  } catch (error) {
    if (previousRead) {
      try {
        if (previous === null) target.removeItem(movementMilestonesKey)
        else target.setItem(movementMilestonesKey, previous)
      } catch {
        // Preserve the original storage error.
      }
    }
    throw new Error('Could not save this awareness activity on this device.', { cause: error })
  }
}

export function createCampaignGraphicSvg(messageId, format = 'feed') {
  const message = movementMessages.find(item => item.id === messageId)
  if (!message) throw new RangeError(`Unknown campaign message: ${messageId}`)
  if (format !== 'feed' && format !== 'story') throw new RangeError(`Unknown campaign format: ${format}`)

  const width = 1080
  const height = format === 'story' ? 1920 : 1350
  const panelHeight = format === 'story' ? 920 : 690
  const panelY = (height - panelHeight) / 2
  const messageStartY = panelY + panelHeight / 2 - (message.lines.length - 1) * 55
  const messageLines = message.lines.map((line, index) =>
    `<tspan x="540" dy="${index === 0 ? 0 : 110}">${line}</tspan>`,
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${message.background}"/>
  <circle cx="112" cy="142" r="132" fill="${message.accent}"/>
  <circle cx="1010" cy="${height - 110}" r="208" fill="${message.panel}" opacity=".72"/>
  <path d="M92 ${height - 190}c112-106 179 41 290-50" fill="none" stroke="#302F29" stroke-width="5" stroke-dasharray="3 24" stroke-linecap="round" opacity=".35"/>
  <rect x="104" y="${panelY}" width="872" height="${panelHeight}" rx="62" fill="${message.panel}" stroke="#302F29" stroke-width="5"/>
  <circle cx="540" cy="${panelY + 92}" r="31" fill="${message.accent}" stroke="#302F29" stroke-width="4"/>
  <path d="m540 ${panelY + 70} 8 15 17 2-12 12 3 17-16-8-16 8 3-17-12-12 17-2 8-15Z" fill="#302F29"/>
  <text x="540" y="${messageStartY}" text-anchor="middle" fill="#302F29" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="800" letter-spacing="-2">${messageLines}</text>
  <rect x="326" y="${panelY + panelHeight - 166}" width="428" height="3" rx="2" fill="#302F29" opacity=".28"/>
  <text x="540" y="${panelY + panelHeight - 106}" text-anchor="middle" fill="#302F29" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" letter-spacing="5">${message.signature}</text>
  <text x="540" y="${height - 74}" text-anchor="middle" fill="#302F29" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900" letter-spacing="8">RESET ✳ YOUR JOURNEY. YOUR PACE.</text>
</svg>`
}

export function renderCampaignPng(messageId, format = 'feed', environment = {}) {
  const svg = createCampaignGraphicSvg(messageId, format)
  const documentObject = environment.documentObject ?? globalThis.document
  const ImageConstructor = environment.ImageConstructor ?? globalThis.Image
  const URLApi = environment.URLApi ?? globalThis.URL
  const BlobConstructor = environment.BlobConstructor ?? globalThis.Blob
  if (!documentObject || !ImageConstructor || !URLApi?.createObjectURL || !BlobConstructor) {
    return Promise.reject(new Error('PNG downloads are not available in this browser.'))
  }

  let svgUrl
  try {
    svgUrl = URLApi.createObjectURL(new BlobConstructor([svg], { type: 'image/svg+xml;charset=utf-8' }))
  } catch {
    return Promise.reject(new Error('The campaign graphic could not be prepared for download.'))
  }

  return new Promise((resolve, reject) => {
    const image = new ImageConstructor()
    const cleanup = () => URLApi.revokeObjectURL(svgUrl)
    image.onload = () => {
      try {
        const canvas = documentObject.createElement('canvas')
        canvas.width = 1080
        canvas.height = format === 'story' ? 1920 : 1350
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
      reject(new Error('The campaign graphic could not be rendered.'))
    }
    image.src = svgUrl
  })
}
