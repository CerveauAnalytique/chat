/**
 * Auth SDK surface for lsky Cloud.
 *
 * Today this wraps OpenNebula session strings / login tokens.
 * Later this package can grow into a standalone auth SDK
 * (API keys, OAuth device flow, scoped personal access tokens).
 */

import type { AuthSdkSurface, AuthTokenOptions } from './types'

export type { AuthSdkSurface, AuthTokenOptions }

export function createAuthHelpers(deps: {
  createSession: AuthSdkSurface['createSession']
  createLoginToken: AuthSdkSurface['createLoginToken']
  validateSession: AuthSdkSurface['validateSession']
}): AuthSdkSurface {
  return {
    createSession: deps.createSession,
    createLoginToken: deps.createLoginToken,
    validateSession: deps.validateSession,
  }
}

/** Format an OpenNebula ONE_AUTH session string */
export function formatOneAuth(user: string, secret: string): string {
  return `${user}:${secret}`
}

/** Parse `user:token` session strings */
export function parseOneAuth(session: string): { user: string; secret: string } | null {
  const idx = session.indexOf(':')
  if (idx <= 0) return null
  return {
    user: session.slice(0, idx),
    secret: session.slice(idx + 1),
  }
}
