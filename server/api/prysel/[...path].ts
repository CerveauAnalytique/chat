const AUTH_PRYSEL_URL = 'https://auth.prysel.com'

const ALLOWED: Record<string, 'GET' | 'POST'> = {
  login: 'POST',
  'login/code': 'POST',
  'login/passkey': 'POST',
  'login/passkey/options': 'POST',
  'forgot-password': 'POST',
  me: 'GET'
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'path')
  const subpath = (Array.isArray(raw) ? raw.join('/') : raw || '').replace(/^\/+|\/+$/g, '')
  const allowedMethod = ALLOWED[subpath]

  if (!allowedMethod) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown Auth Prysel route' })
  }

  const method = getMethod(event)
  if (method !== allowedMethod) {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  const authorization = getHeader(event, 'authorization')
  if (authorization) headers.Authorization = authorization

  let body: string | undefined
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json'
    const payload = await readBody(event)
    body = JSON.stringify(payload ?? {})
  }

  const response = await fetch(`${AUTH_PRYSEL_URL}/api/auth/${subpath}`, {
    method,
    headers,
    body
  })

  const text = await response.text()
  setResponseStatus(event, response.status)
  setHeader(event, 'content-type', response.headers.get('content-type') || 'application/json')

  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { message: text || 'Auth Prysel returned an unreadable response.' }
  }
})
