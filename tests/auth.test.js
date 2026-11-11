import test from 'node:test'
import assert from 'node:assert/strict'
import { callbackInfo, cleanAuthCallback, restoreAuth, requestEmailLink, friendlyAuthError, signOutBrowser } from '../src/lib/authFlow.js'

test('sign-up explicitly permits account creation and uses the requested localhost redirect', async () => {
  let request
  await requestEmailLink({ signInWithOtp: async input => { request = input; return {} } }, ' test@example.com ', 'signup', 'http://localhost:5173/?account=1')
  assert.deepEqual(request, { email: 'test@example.com', options: { shouldCreateUser: true, emailRedirectTo: 'http://localhost:5173/?account=1' } })
})
test('sign-in does not create an account', async () => {
  await requestEmailLink({ signInWithOtp: async input => { assert.equal(input.options.shouldCreateUser, false); return {} } }, 'test@example.com', 'signin', 'http://localhost:5173/?account=1')
})
test('query and hash callback errors are recognized without reflecting provider text', () => {
  for (const url of ['http://localhost:5173/?error=denied&error_code=otp_expired', 'http://localhost:5173/#error=denied&error_description=PRIVATE']) {
    const callback = callbackInfo(new URL(url))
    assert.equal(callback.failed, true)
    assert.equal(callback.present, true)
    assert(!friendlyAuthError({ code: callback.errorCode, message: 'PRIVATE' }).includes('PRIVATE'))
  }
})
test('auth callback cleanup preserves app URL and removes credentials/errors', () => {
  let replaced
  cleanAuthCallback(new URL('http://localhost:5173/?account=1&code=PRIVATE#access_token=PRIVATE'), { state: null, replaceState: (_state, _title, url) => { replaced = url } })
  assert.equal(replaced, '/?account=1#account')
  replaced = null
  cleanAuthCallback(new URL('http://localhost:5173/#journey'), { replaceState: () => { replaced = true } })
  assert.equal(replaced, null)
})
test('session restoration waits for confirmation processing', async () => {
  const order = []
  const session = { user: { id: 'test-user' } }
  const result = await restoreAuth({ initialize: async () => { order.push('initialize'); return {} }, getSession: async () => { order.push('session'); return { data: { session } } } }, { present: true })
  assert.deepEqual(order, ['initialize', 'session'])
  assert.equal(result.session, session)
  assert.match(result.message, /Signed in/)
})
test('failed PKCE exchange is not silently reported as guest success', async () => {
  const result = await restoreAuth({ initialize: async () => ({ error: { code: 'bad_code_verifier', message: 'PRIVATE' } }), getSession: async () => ({ data: { session: null } }) }, { present: true })
  assert.match(result.message, /same browser/)
  assert(!result.message.includes('PRIVATE'))
})
test('network and rate-limit errors are friendly and never echo raw details', async () => {
  await assert.rejects(requestEmailLink({ signInWithOtp: async () => { throw new Error('PRIVATE') } }, 'x@example.com', 'signin', '/'), /Check your connection/)
  assert.match(friendlyAuthError({ status: 429, message: 'PRIVATE' }), /Wait a few minutes/)
  const result = await restoreAuth({ initialize: async () => { throw new Error('PRIVATE') } }, {})
  assert.equal(result.session, null)
  assert.match(result.message, /Guest mode still works/)
})

test('sign-out targets this browser session only and sanitizes errors', async () => {
  let scope
  await signOutBrowser({ signOut: async options => { scope = options.scope; return {} } })
  assert.equal(scope, 'local')
  await assert.rejects(signOutBrowser({ signOut: async () => { throw new Error('PRIVATE') } }), /Local progress has not been deleted/)
})
