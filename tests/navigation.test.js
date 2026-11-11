import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveView, viewIds } from '../src/lib/viewRouter.js'

const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

test('all primary destinations resolve to separate app views', () => {
  assert.deepEqual(viewIds, ['home', 'journey', 'check-in', 'support', 'campaign', 'learn', 'movement', 'rewards', 'account'])
  for (const id of viewIds) {
    assert.equal(resolveView({ search: '', hash: `#${id}` }), id)
  }
})

test('direct links accept the existing check-in, about, and sync destinations', () => {
  assert.equal(resolveView({ search: '', hash: '#check-in' }), 'check-in')
  assert.equal(resolveView({ search: '', hash: '#campaign' }), 'campaign')
  assert.equal(resolveView({ search: '', hash: '#account' }), 'account')
  assert.equal(resolveView({ search: '', hash: '#learn' }), 'learn')
  assert.equal(resolveView({ search: '', hash: '#movement' }), 'movement')
  assert.equal(resolveView({ search: '', hash: '#rewards' }), 'rewards')
})

test('Break the Stigma is linked from Home and only rendered in its own view', () => {
  assert.match(appSource, /\['learn', 'Learn'\]/)
  assert.match(appSource, /href="#learn" onClick=\{event => navigate\(event, 'learn'\)\}/)
  assert.match(appSource, /activeView === 'learn' && <Suspense/)
  assert.match(appSource, /<BreakTheStigma onNavigate=\{navigate\} onComplete=\{recordLearnCompletion\}\/>/)
})

test('The Movement is linked from Home and rendered only in its routed view', () => {
  assert.match(appSource, /\['movement', 'Movement'\]/)
  assert.match(appSource, /href="#movement" onClick=\{event => navigate\(event, 'movement'\)\}/)
  assert.match(appSource, /activeView === 'movement' && <Suspense/)
  assert.match(appSource, /<Movement onNavigate=\{navigate\}\/>/)
  assert.match(styles, /#main:not\(\[data-active-view="movement"\]\) > #movement/)
  assert.match(styles, /#main\[data-active-view="movement"\] > #movement/)
})

test('Rewards is linked from Home and Movement and rendered only in its routed view', () => {
  const movementSource = readFileSync(new URL('../src/Movement.jsx', import.meta.url), 'utf8')
  assert.match(appSource, /\['rewards', 'Rewards'\]/)
  assert.match(appSource, /href="#rewards" onClick=\{event => navigate\(event, 'rewards'\)\}/)
  assert.match(appSource, /activeView === 'rewards' && <Suspense/)
  assert.match(appSource, /<Rewards onNavigate=\{navigate\}\/>/)
  assert.match(appSource, /recordRewardsActivity\('campaign-visit'\)/)
  assert.match(movementSource, /href="#rewards" onClick=\{event => onNavigate\(event, 'rewards'\)\}/)
  assert.match(styles, /#main:not\(\[data-active-view="rewards"\]\) > #rewards/)
  assert.match(styles, /#main\[data-active-view="rewards"\] > #rewards/)
})

test('email sign-in redirects open Sync without changing callback semantics', () => {
  assert.equal(resolveView({ search: '?account=1', hash: '' }), 'account')
  assert.equal(resolveView({ search: '', hash: '#access_token=callback-token' }), 'account')
  assert.equal(resolveView({ search: '', hash: '#error=access_denied' }), 'account')
  assert.equal(resolveView({ search: '?account=1', hash: '#journey' }), 'journey')
})

test('non-view anchors do not replace the active view', () => {
  assert.equal(resolveView({ search: '', hash: '#main' }), null)
  assert.equal(resolveView({ search: '', hash: '#local-data' }), null)
})

test('inactive major views are removed from the visible page flow', () => {
  for (const id of ['journey', 'check-in', 'support', 'campaign', 'movement', 'rewards']) {
    assert.ok(styles.includes(`#main:not([data-active-view="${id}"]) > #${id}`))
    assert.ok(styles.includes(`#main[data-active-view="${id}"] > #${id}`))
  }
  assert.match(appSource, /data-active-view=\{activeView\}/)
  assert.match(appSource, /window\.scrollTo\(0,\s*0\)/)
  assert.match(appSource, /history\.pushState/)
  assert.match(appSource, /addEventListener\('hashchange'/)
  assert.match(appSource, /addEventListener\('popstate'/)
})

test('view changes cycle through four transitions and respect reduced motion', () => {
  assert.match(appSource, /setTransitionIndex\(index => index === null \? 0 : \(index \+ 1\) % 4\)/)
  for (const index of [0, 1, 2, 3]) {
    assert.ok(styles.includes(`#main.view-transition-${index}`))
  }
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*#main\[class\*="view-transition-"\]\s*\{\s*animation:\s*none;/)
})
