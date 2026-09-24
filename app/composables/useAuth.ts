import { ref } from 'vue'
import {
  createAuthHelpers,
  formatOneAuth,
  parseOneAuth,
  createCloudClient
} from '../../cloud-sdk/src/index'

export interface LskyUser {
  id?: string
  name: string
  email: string
  role: string
  sessionToken?: string
  oneAuth?: string
}

// In-memory / client SDK auth wrapper
const cloudClient = createCloudClient({ demo: true })

export const useAuth = () => {
  const user = useState<LskyUser | null>('lsky_auth_user', () => null)
  const isLoaded = useState<boolean>('lsky_auth_loaded', () => false)
  const serverUrl = 'http://localhost:3000'

  // SDK Auth helpers from @lsky/cloud-sdk
  const authHelpers = createAuthHelpers({
    createSession: async (u: string, p: string) => formatOneAuth(u, p),
    createLoginToken: async (opts) => formatOneAuth(opts.user, `token_${Date.now()}`),
    validateSession: async (session: string) => {
      const parsed = parseOneAuth(session)
      return Boolean(parsed && parsed.user && parsed.secret)
    }
  })

  const initAuth = async () => {
    if (typeof window !== 'undefined' && !isLoaded.value) {
      try {
        const saved = localStorage.getItem('lsky_auth_user')
        if (saved) {
          user.value = JSON.parse(saved)
        } else {
          // Check if already logged in via lsky-eu backend /api/users/me
          try {
            const res = await fetch(`${serverUrl}/api/users/me`, {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              method: 'GET'
            })
            if (res.ok) {
              const data = await res.json()
              if (data?.user) {
                user.value = {
                  id: data.user.id,
                  name: data.user.name || data.user.email.split('@')[0],
                  email: data.user.email,
                  role: data.user.roles?.[0] || 'Enterprise User'
                }
              }
            }
          } catch (e) {
            // fallback
          }

          if (!user.value) {
            // Default demo authenticated session formatted with cloud-sdk
            const oneAuthSession = formatOneAuth('oneadmin', 'lsky_cloud_token')
            user.value = {
              name: 'Mark',
              email: 'mark@lsky.eu',
              role: 'Enterprise Administrator',
              oneAuth: oneAuthSession
            }
            localStorage.setItem('lsky_auth_user', JSON.stringify(user.value))
          }
        }
      } catch (e) {
        user.value = {
          name: 'Mark',
          email: 'mark@lsky.eu',
          role: 'Enterprise Administrator'
        }
      }
      isLoaded.value = true
    }
  }

  const login = async (credentials: { email: string; password?: string }) => {
    const rawUser = credentials.email.includes('@') ? credentials.email.split('@')[0] : credentials.email
    const userSecret = credentials.password || 'cloud_token_secret'

    // 1. Generate OpenNebula ONE_AUTH session using cloud-sdk
    const sessionString = await authHelpers.createSession(rawUser, userSecret)
    const isValid = await authHelpers.validateSession(sessionString)

    let finalUser: LskyUser = {
      name: rawUser.charAt(0).toUpperCase() + rawUser.slice(1),
      email: credentials.email.includes('@') ? credentials.email : `${credentials.email}@lsky.eu`,
      role: 'Enterprise Administrator',
      oneAuth: sessionString
    }

    // 2. Also try contacting lsky-eu backend API if available
    try {
      const res = await fetch(`${serverUrl}/api/users/login`, {
        body: JSON.stringify({
          email: finalUser.email,
          password: credentials.password || 'password'
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      })

      if (res.ok) {
        const payloadData = await res.json()
        if (payloadData?.user) {
          finalUser = {
            id: payloadData.user.id,
            name: payloadData.user.name || finalUser.name,
            email: payloadData.user.email || finalUser.email,
            role: payloadData.user.roles?.[0] || finalUser.role,
            sessionToken: payloadData.token,
            oneAuth: sessionString
          }
        }
      }
    } catch (e) {
      // Backend not running on 3000 or network offline; proceed with cloud-sdk auth
    }

    user.value = finalUser
    if (typeof window !== 'undefined') {
      localStorage.setItem('lsky_auth_user', JSON.stringify(finalUser))
    }

    return finalUser
  }

  const logout = async () => {
    try {
      await fetch(`${serverUrl}/api/users/logout`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      })
    } catch (e) {}

    user.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lsky_auth_user')
    }
  }

  return {
    user,
    isLoaded,
    cloudClient,
    authHelpers,
    formatOneAuth,
    parseOneAuth,
    initAuth,
    login,
    logout
  }
}
