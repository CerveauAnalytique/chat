/**
 * Server system software / guest agent stubs.
 *
 * The portal control panel (Docker, websites, databases, firewall)
 * will talk to a future `lsky-agent` daemon on each VPS.
 * This module reserves the public surface so apps can depend on it now.
 */

import type { ServerAgentSurface } from './types'

export type { ServerAgentSurface }

export const unsupportedAgent: ServerAgentSurface = {
  async ping() {
    return { ok: false }
  },
  async exec() {
    throw new Error('lsky-agent is not installed on this instance')
  },
  async installStack(_host, _token, stack) {
    return { jobId: `queued-${stack}-${Date.now()}` }
  },
}

export function createAgentClient(base?: Partial<ServerAgentSurface>): ServerAgentSurface {
  return {
    ping: base?.ping ?? unsupportedAgent.ping,
    exec: base?.exec ?? unsupportedAgent.exec,
    installStack: base?.installStack ?? unsupportedAgent.installStack,
  }
}
