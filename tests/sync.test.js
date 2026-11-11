import test from 'node:test'
import assert from 'node:assert/strict'
import { toCloud, fromCloud, sameJourney } from '../src/lib/syncModel.js'
import { verifySync, writeCloud, deleteCloud, readCloud } from '../src/lib/syncService.js'
import { isSupabaseSyncConfigured } from '../src/lib/syncConfig.js'

const journey = { goal: 'Focus on my wellbeing', start: '2025-01-01' }
const row = { user_id: 'a', ...toCloud(journey), revision: 'rev-a' }
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
test('Supabase remains disabled without explicit opt-in and modern public config', () => {
  const config = { url: 'https://project.supabase.co', key: 'sb_publishable_example' }
  assert.equal(isSupabaseSyncConfigured(config), false)
  assert.equal(isSupabaseSyncConfigured({ ...config, enableSync: 'false' }), false)
  assert.equal(isSupabaseSyncConfigured({ ...config, enableSync: 'true' }), true)
  assert.equal(isSupabaseSyncConfigured({ ...config, enableSync: 'true', key: 'service_role_secret' }), false)
  assert.equal(isSupabaseSyncConfigured({ ...config, enableSync: 'TRUE' }), false)
})
function mock({ ready = true, owner = 'a', error = null, result = row } = {}) {
  const calls = []
  const request = {}
  for (const method of ['select', 'eq', 'update', 'insert', 'delete']) request[method] = (...args) => {
    calls.push([method, ...args]); return request
  }
  request.maybeSingle = async () => ({ data: result, error })
  request.then = (resolve, reject) => Promise.resolve({ data: result, error }).then(resolve, reject)
  return { calls, auth: { getUser: async () => ({ data: { user: { id: owner } }, error: null }) }, rpc: async () => ({ data: ready, error: null }), from: name => { calls.push(['from', name]); return request } }
}
test('upload payload is an exact allowlist, never moods or notes', () => {
  assert.deepEqual(toCloud({ ...journey, mood: 'low', notes: 'private', checkin: { mood: 'low' } }), {
    goal_category: 'wellbeing', start_date: '2025-01-01', progress_mode: 'elapsed_days',
  })
})
test('cloud mapping validates dates, categories, and preferences', () => {
  assert.deepEqual(fromCloud(row), journey)
  for (const value of [{ ...row, goal_category: 'custom-sensitive' }, { ...row, start_date: '2025-02-30' }, { ...row, start_date: '2099-01-01' }, { ...row, progress_mode: 'sober_days' }]) assert.throws(() => fromCloud(value))
  assert.throws(() => toCloud({ goal: 'unknown', start: '2025-01-01' }))
  assert.equal(sameJourney(journey, { ...journey }), true)
  assert.equal(sameJourney(journey, null), false)
})
test('unverified database blocks any upload before reaching the table', async () => {
  const client = mock({ ready: false })
  await assert.rejects(writeCloud(client, 'a', journey, null), /not configured and verified/)
  assert.deepEqual(client.calls, [])
})
test('stale sign-in identity blocks reads and writes', async () => {
  const client = mock({ owner: 'b' })
  await assert.rejects(readCloud(client, 'a'), /sign in again/)
  assert.deepEqual(client.calls, [])
})
test('offline operations do not reach Supabase', async () => {
  navigator.onLine = false
  try { await assert.rejects(verifySync(mock(), 'a'), /offline/) }
  finally { navigator.onLine = true }
})
test('uploads use expected revision and owner, without blind upsert', async () => {
  const client = mock()
  await writeCloud(client, 'a', journey, 'rev-a')
  assert(client.calls.some(call => call[0] === 'eq' && call[1] === 'revision' && call[2] === 'rev-a'))
  assert(client.calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'a'))
  assert.deepEqual(client.calls.find(call => call[0] === 'update')[1], toCloud(journey))
})
test('first upload uses insert, not an overwrite', async () => {
  const client = mock()
  await writeCloud(client, 'a', journey, null)
  assert.deepEqual(client.calls.find(call => call[0] === 'insert')[1], { user_id: 'a', ...toCloud(journey) })
})
test('concurrent changes or rejected writes require a new review', async () => {
  await assert.rejects(writeCloud(mock({ result: null }), 'a', journey, 'old'), /Review the versions again/)
  await assert.rejects(writeCloud(mock({ error: { code: '23505' } }), 'a', journey, null), /not confirmed/)
})
test('cloud deletion is owner/revision scoped and requires server confirmation', async () => {
  const client = mock({ result: [{ user_id: 'a' }] })
  await deleteCloud(client, 'a', 'rev-a')
  assert(client.calls.some(call => call[0] === 'eq' && call[1] === 'revision'))
  await assert.rejects(deleteCloud(mock({ result: [] }), 'a', 'old'), /not confirmed/)
})
