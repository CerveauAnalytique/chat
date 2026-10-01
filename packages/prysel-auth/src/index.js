/**
 * @prysel/auth
 *
 * Browser client for https://auth.prysel.com.
 * Identity stays on Auth Prysel. This package never stores passwords,
 * passkeys, or a client secret, and it never puts email, login_hint, or
 * a token in a URL.
 */

export const AUTH_ORIGIN = 'https://auth.prysel.com'
export const ACCOUNT_ORIGIN = 'https://account.prysel.com'
export const AFTER_LOGIN_KEY = 'prysel_after_login'

const FORBIDDEN_QUERY = /^(email|login_hint|hint|token|access_token|id_token|refresh_token|code)$/i

export function isSafeReturnPath(value) {
  if (typeof value !== 'string') return false
  if (!value.startsWith('/') || value.startsWith('//')) return false
  if (value.includes('@')) return false
  if (/token|login_hint/i.test(value)) return false
  return true
}

export function callbackUrl(origin = (typeof window !== 'undefined' ? window.location.origin : ACCOUNT_ORIGIN)) {
  return `${String(origin).replace(/\/$/, '')}/auth/callback`
}

export function signInUrl({ returnUrl, authOrigin = AUTH_ORIGIN } = {}) {
  const url = new URL('/login', authOrigin)
  const safeReturn = returnUrl || callbackUrl()
  url.searchParams.set('returnUrl', safeReturn)
  for (const key of [...url.searchParams.keys()]) {
    if (FORBIDDEN_QUERY.test(key)) url.searchParams.delete(key)
  }
  return url.toString()
}

export function rememberAfterLogin(path) {
  if (typeof window === 'undefined') return
  const next = isSafeReturnPath(path) ? path : '/dashboard'
  sessionStorage.setItem(AFTER_LOGIN_KEY, next)
}

export function consumeAfterLogin(fallback = '/dashboard') {
  if (typeof window === 'undefined') return fallback
  const stored = sessionStorage.getItem(AFTER_LOGIN_KEY)
  sessionStorage.removeItem(AFTER_LOGIN_KEY)
  return isSafeReturnPath(stored) ? stored : fallback
}

export function stripForbiddenSearchParams(urlString) {
  const url = new URL(urlString)
  for (const key of [...url.searchParams.keys()]) {
    if (FORBIDDEN_QUERY.test(key)) url.searchParams.delete(key)
  }
  url.hash = ''
  return url.toString()
}

export function stripAuthParamsFromUrl() {
  if (typeof window === 'undefined') return
  const next = stripForbiddenSearchParams(window.location.href)
  const url = new URL(next)
  const clean = `${url.pathname}${url.search}`
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== clean) {
    window.history.replaceState({}, '', clean)
  }
}

export async function fetchAuth(path, init = {}, { authOrigin = AUTH_ORIGIN } = {}) {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(`${authOrigin}${path}`, {
    ...init,
    credentials: 'include',
    headers
  })
}

export function createPryselAuth(options = {}) {
  const authOrigin = options.authOrigin || AUTH_ORIGIN
  const afterLoginFallback = options.afterLoginFallback || '/dashboard'

  const redirectToSignIn = (afterPath) => {
    if (typeof window === 'undefined') return
    if (afterPath) rememberAfterLogin(afterPath)
    window.location.assign(signInUrl({
      returnUrl: callbackUrl(window.location.origin),
      authOrigin
    }))
  }

  const completeCallback = () => {
    stripAuthParamsFromUrl()
    return consumeAfterLogin(afterLoginFallback)
  }

  return {
    authOrigin,
    callbackUrl: () => callbackUrl(typeof window !== 'undefined' ? window.location.origin : ACCOUNT_ORIGIN),
    signInUrl: () => signInUrl({
      returnUrl: callbackUrl(typeof window !== 'undefined' ? window.location.origin : ACCOUNT_ORIGIN),
      authOrigin
    }),
    redirectToSignIn,
    completeCallback,
    rememberAfterLogin,
    fetchAuth: (path, init) => fetchAuth(path, init, { authOrigin })
  }
}
