import { ACCOUNT_ORIGIN, AUTH_ORIGIN, createPryselAuth, stripForbiddenSearchParams } from '@prysel/auth'

export interface AccountUser {
  id: string
  email: string
  emailVerified?: boolean
  name?: string | null
  username?: string | null
  picture?: string | null
  mobile?: string | null
  role?: string | null
  createdAt?: string | null
  lastLoginAt?: string | null
}

export interface LoginEvent {
  id?: string
  success?: boolean
  loginMethod?: string
  createdAt?: string
  ipAddress?: string | null
}

export interface AccountSession {
  user: AccountUser
  profile?: Record<string, unknown> | null
  loginHistory: LoginEvent[]
}

export interface PortalApp {
  id: string
  name: string
  description?: string | null
  url: string
  icon?: string | null
  lastAccessedAt?: string | null
}

export interface PortalSession {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
  current?: boolean
  isCurrent?: boolean
  revoked?: boolean
  revokedAt?: string | null
}

export interface PortalGrant {
  clientId: string
  appName?: string | null
  clientName?: string | null
  name?: string | null
  scopes?: string[] | string | null
}

export interface PasskeyStatus {
  installed: boolean
}

export interface TotpSetup {
  secret: string
  otpauth?: string
}

export class AccountRequestError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AccountRequestError'
    this.status = status
  }
}

const CORS_MESSAGE = 'https://account.prysel.com must be allowed as an origin on auth.prysel.com.'
const pryselAuth = createPryselAuth({ authOrigin: AUTH_ORIGIN, afterLoginFallback: '/dashboard' })

export const isAuthContinueUrl = (value: string) => {
  try {
    const url = new URL(stripForbiddenSearchParams(value))
    if (url.protocol !== 'https:' || url.hostname !== 'auth.prysel.com') return false
    const path = url.pathname
    return path === '/authorize'
      || path.startsWith('/authorize/')
      || path === '/oauth/authorize'
      || path.startsWith('/oauth/authorize/')
      || path === '/logout'
      || path.startsWith('/logout/')
      || path === '/oauth/logout'
      || path.startsWith('/oauth/logout/')
  } catch {
    return false
  }
}

export const safeAuthContinueUrl = (value?: string | null) => {
  if (!value || !isAuthContinueUrl(value)) return ''
  return stripForbiddenSearchParams(value)
}

export const formatLongDate = (value?: string | null) => {
  if (!value) return 'None'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(value))
  } catch {
    return value
  }
}

export const formatMediumDate = (value?: string | null) => {
  if (!value) return 'None'
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export const textOrNone = (value?: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : 'None'
}

export function useAccountPortal() {
  const corsBlocked = useState('acct-cors-blocked', () => false)
  const authRedirecting = useState('acct-auth-redirecting', () => false)
  const session = useState<AccountSession | null>('acct-session', () => null)

  const redirectToSignIn = (afterPath = '/dashboard') => {
    if (!import.meta.client || authRedirecting.value) return
    authRedirecting.value = true
    pryselAuth.redirectToSignIn(afterPath)
  }

  const request = async <T>(path: string, init: RequestInit = {}, redirectOn401 = true): Promise<T> => {
    let response: Response
    try {
      response = await pryselAuth.fetchAuth(path, init)
    } catch (error) {
      if (error instanceof TypeError) corsBlocked.value = true
      throw error
    }

    if (response.status === 401) {
      session.value = null
      if (redirectOn401) redirectToSignIn()
      let message = 'Unauthorized'
      try {
        const body = await response.json()
        if (typeof body?.message === 'string' && body.message.trim()) message = body.message
      } catch {
        // The body is not JSON.
      }
      throw new AccountRequestError(message, 401)
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`
      try {
        const body = await response.json()
        if (typeof body?.message === 'string' && body.message.trim()) message = body.message
        else if (typeof body?.error === 'string' && body.error.trim()) message = body.error
      } catch {
        // The body is not JSON.
      }
      throw new AccountRequestError(message, response.status)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return {} as T
    return await response.json() as T
  }

  const readSession = (payload: { user?: AccountUser, profile?: Record<string, unknown> | null, loginHistory?: LoginEvent[] }): AccountSession => {
    const history = payload.loginHistory || []
    const next: AccountSession = {
      user: payload.user as AccountUser,
      profile: payload.profile || null,
      loginHistory: Array.isArray(history) ? history : []
    }
    session.value = next
    return next
  }

  const peekSession = async () => {
    if (!import.meta.client) return session.value
    const payload = await request<{ user?: AccountUser, profile?: Record<string, unknown> | null, loginHistory?: LoginEvent[] }>('/api/me', {}, false)
    if (!payload?.user) throw new AccountRequestError('Unable to load profile.')
    return readSession(payload)
  }

  const ensureSession = async () => {
    if (!import.meta.client) return session.value
    if (authRedirecting.value) return session.value
    try {
      return await peekSession()
    } catch (error) {
      if (corsBlocked.value) throw error
      if (error instanceof AccountRequestError && error.status === 401) redirectToSignIn('/dashboard')
      throw error
    }
  }

  const getApps = async () => {
    const payload = await request<{ apps?: PortalApp[] } | PortalApp[]>('/api/apps')
    if (Array.isArray(payload)) return payload
    return payload.apps || []
  }

  const recordAppAccess = async (id: string) => {
    try {
      await request(`/api/apps/${encodeURIComponent(id)}/access`, { method: 'POST', body: '{}' }, false)
    } catch {
      // Opening the application still proceeds when the access record fails.
    }
  }

  const updateProfile = async (body: { name: string | null, username: string | null, mobile: string | null, picture: string | null }) => {
    const payload = await request<{ user?: AccountUser }>('/api/me', { method: 'PATCH', body: JSON.stringify(body) })
    if (payload?.user && session.value) {
      session.value = { ...session.value, user: { ...session.value.user, ...payload.user } }
    }
    return payload
  }

  const changePassword = (currentPassword: string, newPassword: string) => {
    return request('/api/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    }, false)
  }

  const getSessions = async () => {
    const payload = await request<PortalSession[] | { sessions?: PortalSession[] }>('/api/v1/sessions')
    const list = Array.isArray(payload) ? payload : payload.sessions || []
    return list.filter(item => !item.revoked && !item.revokedAt)
  }

  const revokeSession = (id: string) => {
    return request(`/api/v1/sessions/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: '{}' })
  }

  const getGrants = async () => {
    const payload = await request<PortalGrant[] | { grants?: PortalGrant[] }>('/api/v1/grants')
    return Array.isArray(payload) ? payload : payload.grants || []
  }

  const removeGrant = (clientId: string) => {
    return request(`/api/v1/grants/${encodeURIComponent(clientId)}`, { method: 'DELETE' })
  }

  const getPasskeys = async () => {
    const payload = await request<PasskeyStatus>('/api/v1/passkeys')
    return { installed: Boolean(payload?.installed) }
  }

  const setupTotp = () => request<TotpSetup>('/api/v1/mfa/totp/setup', { method: 'POST', body: '{}' })

  const confirmTotp = (code: string) => {
    return request('/api/v1/mfa/totp/confirm', { method: 'POST', body: JSON.stringify({ code }) })
  }

  const verifyMfa = (code: string) => {
    return request<{ continueUrl?: string }>('/api/v1/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) })
  }

  const logout = async ({ redirect = true }: { redirect?: boolean } = {}) => {
    try {
      await request('/api/auth/logout', { method: 'POST', body: '{}' }, false)
    } catch {
      // A failed logout call still clears the local session.
    }
    session.value = null
    if (redirect) pryselAuth.redirectToSignIn('/dashboard')
  }

  const completeCallback = () => pryselAuth.completeCallback()

  return {
    AUTH_BASE: AUTH_ORIGIN,
    ACCOUNT_SITE: ACCOUNT_ORIGIN,
    CORS_MESSAGE,
    corsBlocked,
    authRedirecting,
    session,
    redirectToSignIn,
    completeCallback,
    peekSession,
    ensureSession,
    getApps,
    recordAppAccess,
    updateProfile,
    changePassword,
    getSessions,
    revokeSession,
    getGrants,
    removeGrant,
    getPasskeys,
    setupTotp,
    confirmTotp,
    verifyMfa,
    logout
  }
}
