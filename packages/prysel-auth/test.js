import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ACCOUNT_ORIGIN,
  AUTH_ORIGIN,
  callbackUrl,
  isSafeReturnPath,
  signInUrl,
  stripForbiddenSearchParams
} from './src/index.js'

test('sign-in URL only sets returnUrl on auth.prysel.com', () => {
  const url = new URL(signInUrl({ returnUrl: `${ACCOUNT_ORIGIN}/auth/callback` }))
  assert.equal(url.origin, AUTH_ORIGIN)
  assert.equal(url.pathname, '/login')
  assert.equal(url.searchParams.get('returnUrl'), `${ACCOUNT_ORIGIN}/auth/callback`)
  assert.equal(url.searchParams.has('email'), false)
  assert.equal(url.searchParams.has('login_hint'), false)
  assert.equal(url.searchParams.has('token'), false)
  assert.equal(url.searchParams.has('access_token'), false)
})

test('callback URL stays on the account site', () => {
  assert.equal(callbackUrl(ACCOUNT_ORIGIN), `${ACCOUNT_ORIGIN}/auth/callback`)
})

test('return paths cannot carry an email or token', () => {
  assert.equal(isSafeReturnPath('/dashboard'), true)
  assert.equal(isSafeReturnPath('/profile'), true)
  assert.equal(isSafeReturnPath('https://evil.example/'), false)
  assert.equal(isSafeReturnPath('//auth.prysel.com'), false)
  assert.equal(isSafeReturnPath('/profile?email=a@b.com'), false)
  assert.equal(isSafeReturnPath('/dashboard?token=abc'), false)
})

test('forbidden query keys are stripped from URLs', () => {
  const cleaned = stripForbiddenSearchParams('https://account.prysel.com/security?continue=https://auth.prysel.com/authorize&email=a@b.com&token=abc')
  const url = new URL(cleaned)
  assert.equal(url.searchParams.has('email'), false)
  assert.equal(url.searchParams.has('token'), false)
  assert.equal(url.searchParams.has('continue'), true)
})
