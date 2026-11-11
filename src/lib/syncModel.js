export const goalCategories = {
  explore: 'Explore my relationship with substances',
  reduce: 'Reduce my substance use',
  break: 'Take a break',
  sobriety: 'Choose sobriety',
  wellbeing: 'Focus on my wellbeing',
}
export function validStart(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today
}
export function toCloud(journey) {
  const category = Object.keys(goalCategories).find(key => goalCategories[key] === journey?.goal)
  if (!category || !validStart(journey?.start)) throw new Error('Save a valid journey before syncing.')
  // Deliberate allowlist: never spread local data into a request.
  return { goal_category: category, start_date: journey.start, progress_mode: 'elapsed_days' }
}
export function fromCloud(row) {
  if (!row || !Object.hasOwn(goalCategories, row.goal_category) || !validStart(row.start_date) || row.progress_mode !== 'elapsed_days') {
    throw new Error('The cloud journey is not compatible with this version of RESET. Local data was not changed.')
  }
  return { goal: goalCategories[row.goal_category], start: row.start_date }
}
export const sameJourney = (a, b) => a?.goal === b?.goal && a?.start === b?.start
