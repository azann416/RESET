import { toCloud } from './syncModel.js'
const table = 'reset_progress'
const columns = 'goal_category,start_date,progress_mode,revision,updated_at'
export async function verifySync(client, userId) {
  if (!navigator.onLine) throw new Error('You’re offline. Local progress still works; reconnect to sync.')
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError || auth.user?.id !== userId) throw new Error('Please sign in again before syncing. Local progress is unchanged.')
  const { data, error } = await client.rpc('reset_sync_ready')
  if (error || data !== true) throw new Error('Cloud syncing is not configured and verified yet. Complete the SQL migration and isolation tests first.')
}
export async function readCloud(client, userId) {
  await verifySync(client, userId)
  const { data, error } = await client.from(table).select(columns).eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Could not read cloud progress. Check your connection and database setup.')
  return data
}
export async function writeCloud(client, userId, journey, revision) {
  await verifySync(client, userId)
  const values = toCloud(journey)
  const request = revision === null
    ? client.from(table).insert({ user_id: userId, ...values })
    : client.from(table).update(values).eq('user_id', userId).eq('revision', revision)
  const { data, error } = await request.select(columns).maybeSingle()
  if (error || !data) throw new Error('Upload was not confirmed. Cloud data may have changed on another device. Review the versions again before retrying.')
  return data
}
export async function deleteCloud(client, userId, revision) {
  await verifySync(client, userId)
  const { data, error } = await client.from(table).delete().eq('user_id', userId).eq('revision', revision).select('user_id')
  if (error || data?.length !== 1) throw new Error('Deletion was not confirmed. Review cloud data again before retrying.')
}
