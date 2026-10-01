import { getHost, listModels } from '../../lib/ellofive-client.js'
import { healthcheck as neuriyHealth } from '../../lib/neuriy/index.js'

export default defineEventHandler(async () => {
  let ellofive: { ok: boolean; host: string; models: string[]; error?: string } = {
    ok: false,
    host: getHost(),
    models: [],
  }
  try {
    const models = await listModels()
    ellofive = {
      ok: true,
      host: getHost(),
      models: models.map((m: { name?: string }) => String(m.name || '')).filter(Boolean),
    }
  } catch (error) {
    ellofive.error = error instanceof Error ? error.message : 'runtime down'
  }

  let frc7 = { ok: false as boolean, gateway: process.env.FRC7_GATEWAY || 'http://127.0.0.1:3100' }
  try {
    const res = await fetch(`${frc7.gateway}/health`, { signal: AbortSignal.timeout(1500) })
    frc7 = { ...frc7, ok: res.ok }
  } catch {
    // gateway is optional if Neuriy is in-process
  }

  const neuriy = await neuriyHealth()

  return {
    ok: ellofive.ok || neuriy.ok,
    product: 'Prysel Ai',
    stack: {
      ellofive,
      frc7,
      neuriy,
    },
    hint: ellofive.ok
      ? 'ElloFive is live — ask for research, code, or an image.'
      : 'Start the model with bash scripts/install-ai.sh && bash scripts/start-ai.sh',
  }
})
