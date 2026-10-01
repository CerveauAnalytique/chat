import type { AccountUser } from '~/composables/useAccountPortal'

export interface PryselUser {
  id?: string
  name: string
  email: string
  username?: string | null
  mobile?: string | null
  role: string
  picture?: string | null
}

const toChatUser = (account: AccountUser): PryselUser => ({
  id: account.id,
  name: account.name || account.username || (account.email ? account.email.split('@')[0] : 'Account'),
  email: account.email,
  username: account.username ?? null,
  mobile: account.mobile ?? null,
  role: account.role || 'user',
  picture: account.picture ?? null
})

export const useAuth = () => {
  const portal = useAccountPortal()
  const isLoaded = useState<boolean>('prysel_auth_loaded', () => false)

  const user = computed<PryselUser | null>(() => {
    const account = portal.session.value?.user
    return account ? toChatUser(account) : null
  })

  const initAuth = async () => {
    if (!import.meta.client || isLoaded.value) return
    try {
      await portal.peekSession()
    } catch {
      // Chat stays usable while signed out. Account pages still require a session.
    } finally {
      isLoaded.value = true
    }
  }

  const signIn = (afterPath = '/') => {
    portal.redirectToSignIn(afterPath)
  }

  const logout = async () => {
    try {
      await portal.logout({ redirect: false })
    } catch {
      portal.session.value = null
    }
  }

  return {
    user,
    isLoaded,
    authUrl: portal.AUTH_BASE,
    initAuth,
    signIn,
    logout
  }
}
