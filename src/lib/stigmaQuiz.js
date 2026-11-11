export const stigmaCompletionKey = 'reset.stigma.completed.v1'
export const stigmaKeychainKey = 'reset.stigma.keychain.v1'

export const stigmaQuestions = [
  {
    id: 'health-not-blame',
    theme: 'MYTH / FACT',
    prompt: 'A classmate says, “Addiction is just a lack of willpower.” What’s the most accurate response?',
    context: 'Choose the response that replaces blame with useful information.',
    options: [
      {
        id: 'health-condition',
        label: 'It’s a treatable health condition shaped by many factors—not a moral failure.',
        feedback: 'That’s it. Substance use disorder is complex and treatable. Blame and labels can make it harder for people to seek care.',
        source: 'Health Canada: stigma and substance use',
        href: 'https://www.canada.ca/en/health-canada/services/opioids/stigma.html',
      },
      {
        id: 'rock-bottom',
        label: 'Willpower matters most; professional support is mainly for a crisis.',
        feedback: 'It can sound motivating, but it puts the burden on one person and may delay support. Addiction is a health issue, and people deserve care before a crisis.',
        source: 'Health Canada: stigma and substance use',
        href: 'https://www.canada.ca/en/health-canada/services/opioids/stigma.html',
      },
      {
        id: 'one-cause',
        label: 'Addiction has one main cause, so finding it should solve the problem.',
        feedback: 'There isn’t one cause or one simple fix. Biology, experiences, environment, and other factors can all matter; support should respond to the person.',
        source: 'CAMH: Addiction',
        href: 'https://www.camh.ca/en/health-info/mental-illness-and-addiction-index/addiction',
      },
    ],
    answer: 'health-condition',
  },
  {
    id: 'many-paths',
    theme: 'MYTH / FACT',
    prompt: 'Someone wants support but is unsure about stopping completely. What’s true?',
    context: 'Recovery and support don’t have to look identical for everyone.',
    options: [
      {
        id: 'same-plan',
        label: 'There’s one proven path, and everyone should follow the same plan.',
        feedback: 'A single path can leave people out. CAMH notes there is no one-size-fits-all approach; support can be matched to someone’s needs and goals.',
        source: 'CAMH: Addiction',
        href: 'https://www.camh.ca/en/health-info/mental-illness-and-addiction-index/addiction',
      },
      {
        id: 'personal-path',
        label: 'Support can take different forms; a person can explore what fits their needs and goals.',
        feedback: 'Exactly. There are different supports and approaches. Listening to what matters to the person is a better start than assuming what they should choose.',
        source: 'CAMH: Addiction',
        href: 'https://www.camh.ca/en/health-info/mental-illness-and-addiction-index/addiction',
      },
      {
        id: 'no-abstinence-no-support',
        label: 'If they aren’t ready to stop, it’s better to wait before offering any support.',
        feedback: 'Support does not need to wait for someone to be ready to stop. Harm-reduction approaches can help people who aren’t ready, willing, or able to give up substances.',
        source: 'CAMH: Addiction',
        href: 'https://www.camh.ca/en/health-info/mental-illness-and-addiction-index/addiction',
      },
    ],
    answer: 'personal-path',
  },
  {
    id: 'friend-opens-up',
    theme: 'A REAL-LIFE MOMENT',
    prompt: 'A friend tells you their substance use has been worrying them. What’s a caring first response?',
    context: 'You don’t need to diagnose them or solve everything in one conversation.',
    options: [
      {
        id: 'listen-ask',
        label: 'Thank them for trusting you, listen without judgment, and ask what kind of support would feel helpful.',
        feedback: 'That keeps the conversation caring and centred on your friend. You can offer resources, while respecting that the decision about seeking help is theirs.',
        source: 'Health Canada: talking to a friend',
        href: 'https://www.canada.ca/en/health-canada/services/substance-use/talking-about-drugs/help-friend.html',
      },
      {
        id: 'give-an-ultimatum',
        label: 'Tell them exactly what they need to do so they understand how serious it is.',
        feedback: 'It’s understandable to feel worried, but pressure can shut down a conversation. Health Canada recommends listening, showing compassion, and respecting where the person is in their journey.',
        source: 'Health Canada: talking to a friend',
        href: 'https://www.canada.ca/en/health-canada/services/substance-use/talking-about-drugs/help-friend.html',
      },
      {
        id: 'investigate',
        label: 'Ask for every detail so you can decide whether their concern is serious enough.',
        feedback: 'Your friend doesn’t need to prove their concern. Listen without probing, and ask what support they want; you can offer to explore trusted resources together.',
        source: 'Health Canada: talking to a friend',
        href: 'https://www.canada.ca/en/health-canada/services/substance-use/talking-about-drugs/help-friend.html',
      },
    ],
    answer: 'listen-ask',
  },
  {
    id: 'setbacks-without-shame',
    theme: 'A REAL-LIFE MOMENT',
    prompt: 'A person returns to substance use after seeking support. What response is most helpful?',
    context: 'One difficult moment does not define a person or erase their worth.',
    options: [
      {
        id: 'shame-motivation',
        label: 'Use tough love and shame to make sure it never happens again.',
        feedback: 'Shame is not a care plan. Stigma can isolate people and become a barrier to getting help; a respectful response can make it easier to reconnect with support.',
        source: 'Health Canada: stigma and substance use',
        href: 'https://www.canada.ca/en/health-canada/services/opioids/stigma.html',
      },
      {
        id: 'not-ready',
        label: 'Assume they are not ready for help and stop checking in.',
        feedback: 'A person’s needs and readiness can change. Avoid assumptions; a kind check-in and an offer to find support can leave the door open without pressure.',
        source: 'Health Canada: talking to a friend',
        href: 'https://www.canada.ca/en/health-canada/services/substance-use/talking-about-drugs/help-friend.html',
      },
      {
        id: 'care-and-reconnect',
        label: 'Respond without blame, ask what they need now, and offer help finding support if they want it.',
        feedback: 'Yes. A return to use is a moment for care, not a verdict on someone’s character. Listen, check what support they want, and help connect them to care if they choose.',
        source: 'Health Canada: talking to a friend',
        href: 'https://www.canada.ca/en/health-canada/services/substance-use/talking-about-drugs/help-friend.html',
      },
    ],
    answer: 'care-and-reconnect',
  },
  {
    id: 'allies-challenge-stigma',
    theme: 'BE AN ALLY',
    prompt: 'You hear someone use a stigmatizing label about a person who uses substances. What can an ally do?',
    context: 'Small language choices can protect dignity and make room for support.',
    options: [
      {
        id: 'share-private-story',
        label: 'Share a friend’s personal story publicly so people understand the issue.',
        feedback: 'Awareness matters, but someone else’s private experience is theirs to share. Challenge the label without identifying or disclosing anyone, and offer trusted information if it’s welcome.',
        source: 'Health Canada: stigma and substance use',
        href: 'https://www.canada.ca/en/health-canada/services/opioids/stigma.html',
      },
      {
        id: 'person-first',
        label: 'Gently use respectful, person-first language, share facts, and offer support resources without pressure.',
        feedback: 'That helps challenge stereotypes while respecting privacy and choice. Health Canada recommends person-first language, compassion, and sharing facts to help reduce stigma.',
        source: 'Health Canada: stigma and substance use',
        href: 'https://www.canada.ca/en/health-canada/services/opioids/stigma.html',
      },
      {
        id: 'argue',
        label: 'Call the person out harshly so everyone knows they are wrong.',
        feedback: 'It’s okay to speak up, but a calm correction is more likely to keep the focus on respectful language and useful facts instead of escalating the moment.',
        source: 'Health Canada: stigma and substance use',
        href: 'https://www.canada.ca/en/health-canada/services/opioids/stigma.html',
      },
    ],
    answer: 'person-first',
  },
]

export const stigmaShareMessage =
  '#MyResetJourney: Facts over stigma. Lead with care, respect, and support. Recovery can look different for everyone. #BreakTheStigma'

export function getStigmaFeedback(questionId, optionId) {
  const question = stigmaQuestions.find(item => item.id === questionId)
  const option = question?.options.find(item => item.id === optionId)
  if (!question || !option) throw new RangeError('Choose an answer from the current question.')
  return {
    correct: option.id === question.answer,
    text: option.feedback,
    source: option.source,
    href: option.href,
  }
}

export function getNextStigmaStep(step) {
  return Math.min(step + 1, stigmaQuestions.length)
}

export function isStigmaQuizComplete(step) {
  return step >= stigmaQuestions.length
}

export function readStigmaUnlocks(storage) {
  try {
    const target = storage ?? globalThis.localStorage
    if (!target) return { completed: false, keychainUnlocked: false }
    return {
      completed: target.getItem(stigmaCompletionKey) === 'true',
      keychainUnlocked: target.getItem(stigmaKeychainKey) === 'true',
    }
  } catch {
    return { completed: false, keychainUnlocked: false }
  }
}

export function saveStigmaUnlocks(storage) {
  let target
  try {
    target = storage ?? globalThis.localStorage
  } catch {
    throw new Error('Local storage is unavailable.')
  }
  if (!target) throw new Error('Local storage is unavailable.')

  let previous
  try {
    previous = [stigmaCompletionKey, stigmaKeychainKey].map(key => [
      key,
      target.getItem(key),
    ])
  } catch {
    throw new Error('Could not safely read local quiz storage.')
  }
  try {
    target.setItem(stigmaCompletionKey, 'true')
    target.setItem(stigmaKeychainKey, 'true')
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) target.removeItem(key)
        else target.setItem(key, value)
      } catch {
        throw new Error('Could not safely save the local quiz completion and keychain.')
      }
    }
    throw new Error('Could not save the quiz completion and keychain on this device.')
  }
}
