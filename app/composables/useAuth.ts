export interface PryselUser {
  id?: string
  name: string
  email: string
  role: string
  sessionToken?: string
  picture?: string | null
}

export type AuthChallenge = {
  status: 'challenge'
  loginToken: string
  next: 'code' | 'passkey'
  factors: { code: boolean; passkey: boolean }
}

export type AuthLoginResult =
  | { status: 'complete'; user: PryselUser }
  | AuthChallenge

interface AuthApiUser {
  id: string
  email: string
  emailVerified?: boolean
  name?: string | null
  username?: string | null
  picture?: string | null
  mobile?: string | null
  role?: string | null
  lastLoginAt?: string | null
}

interface AuthApiLoginResponse {
  status?: string
  accessToken?: string
  user?: AuthApiUser
  loginToken?: string
  next?: 'code' | 'passkey'
  factors?: { code?: boolean; passkey?: boolean }
}

interface PasskeyRequestOptions {
  challenge: string
  timeout?: number
  rpId?: string
  userVerification?: UserVerificationRequirement
  allowCredentials?: Array<{ id: string; type?: string; transports?: AuthenticatorTransport[] }>
}

const AUTH_PRYSEL_URL = 'https://auth.prysel.com'
const TOKEN_KEY = 'prysel_access_token'

export class AuthPryselError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthPryselError'
  }
}

const toUser = (account: AuthApiUser, accessToken?: string): PryselUser => ({
  id: account.id,
  name: account.name || account.username || account.email.split('@')[0],
  email: account.email,
  role: account.role || 'user',
  picture: account.picture ?? null,
  sessionToken: accessToken
})

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = await response.json()
    if (payload && typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message
    }
  } catch {
    // The body is not JSON.
  }
  return fallback
}

const authFetch = async (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${AUTH_PRYSEL_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include'
  })
}

const base64UrlToBuffer = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

const bufferToBase64Url = (value: ArrayBuffer) => {
  const bytes = new Uint8Array(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const assertPasskey = async (options: PasskeyRequestOptions) => {
  if (!navigator.credentials?.get) {
    throw new AuthPryselError('This browser cannot use a passkey.')
  }

  let credential: Credential | null
  try {
    credential = await navigator.credentials.get({
      publicKey: {
        challenge: base64UrlToBuffer(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        userVerification: options.userVerification,
        allowCredentials: options.allowCredentials?.map((item) => ({
          id: base64UrlToBuffer(item.id),
          type: 'public-key' as const,
          transports: item.transports
        }))
      }
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      throw new AuthPryselError('The passkey prompt was closed. Try again.')
    }
    throw new AuthPryselError('Unable to use the passkey. Try again.')
  }

  if (!credential || credential.type !== 'public-key') {
    throw new AuthPryselError('The passkey prompt was closed. Try again.')
  }

  const publicKeyCredential = credential as PublicKeyCredential
  const response = publicKeyCredential.response as AuthenticatorAssertionResponse
  return {
    id: publicKeyCredential.id,
    rawId: bufferToBase64Url(publicKeyCredential.rawId),
    type: publicKeyCredential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : undefined
    },
    clientExtensionResults: publicKeyCredential.getClientExtensionResults(),
    authenticatorAttachment: publicKeyCredential.authenticatorAttachment
  }
}

export const useAuth = () => {
  const user = useState<PryselUser | null>('prysel_auth_user', () => null)
  const isLoaded = useState<boolean>('prysel_auth_loaded', () => false)

  const persistSession = (account: AuthApiUser, accessToken: string) => {
    const nextUser = toUser(account, accessToken)
    user.value = nextUser
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken)
      localStorage.removeItem('lsky_auth_user')
    }
    return nextUser
  }

  const settleLogin = (payload: AuthApiLoginResponse): AuthLoginResult => {
    if (payload.status === 'complete' && payload.accessToken && payload.user) {
      return { status: 'complete', user: persistSession(payload.user, payload.accessToken) }
    }

    if (!payload.loginToken || (payload.next !== 'code' && payload.next !== 'passkey')) {
      throw new AuthPryselError('Auth Prysel returned an unexpected sign-in response.')
    }

    return {
      status: 'challenge',
      loginToken: payload.loginToken,
      next: payload.next,
      factors: {
        code: Boolean(payload.factors?.code),
        passkey: Boolean(payload.factors?.passkey)
      }
    }
  }

  const postLogin = async (path: string, body: Record<string, unknown>) => {
    const response = await authFetch(path, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      throw new AuthPryselError(await readErrorMessage(response, 'Unable to sign in. Please try again.'))
    }
    return settleLogin(await response.json() as AuthApiLoginResponse)
  }

  const initAuth = async () => {
    if (typeof window === 'undefined' || isLoaded.value) return

    localStorage.removeItem('lsky_auth_user')
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      user.value = null
      isLoaded.value = true
      return
    }

    try {
      const response = await authFetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        localStorage.removeItem(TOKEN_KEY)
        user.value = null
      } else {
        const account = await response.json() as AuthApiUser
        user.value = toUser(account, token)
      }
    } catch {
      user.value = null
    } finally {
      isLoaded.value = true
    }
  }

  const login = (credentials: { email: string; password: string }) => {
    return postLogin('/api/auth/login', {
      email: credentials.email.trim(),
      password: credentials.password
    })
  }

  const submitLoginCode = (loginToken: string, code: string) => {
    return postLogin('/api/auth/login/code', { loginToken, code })
  }

  const submitPasskey = async (loginToken: string) => {
    const response = await authFetch('/api/auth/login/passkey/options', {
      method: 'POST',
      body: JSON.stringify({ loginToken })
    })
    if (!response.ok) {
      throw new AuthPryselError(await readErrorMessage(response, 'Unable to start the passkey prompt.'))
    }
    const payload = await response.json() as { options: PasskeyRequestOptions }
    const assertion = await assertPasskey(payload.options)
    return postLogin('/api/auth/login/passkey', { loginToken, response: assertion })
  }

  const requestPasswordReset = async (email: string) => {
    const response = await authFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() })
    })
    if (!response.ok) {
      throw new AuthPryselError(await readErrorMessage(response, 'Unable to send a password reset email.'))
    }
    const payload = await response.json() as { message?: string }
    return payload.message || 'If an account exists for that email, a password reset email is on its way.'
  }

  const logout = async () => {
    user.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('lsky_auth_user')
    }
  }

  return {
    user,
    isLoaded,
    authUrl: AUTH_PRYSEL_URL,
    initAuth,
    login,
    submitLoginCode,
    submitPasskey,
    requestPasswordReset,
    logout
  }
}
