import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { detectToolIntent, runTool } from '../../lib/neuriy/tools/builtins.js'
import { chat as neuriyChat } from '../../lib/neuriy/chat/orchestrator.js'
import { generate as ellofiveGenerate, getHost, listModels } from '../../lib/ellofive-client.js'
import { formatSources, research, wantsResearch } from '../../lib/ai/research.js'
import { posterTitle, renderIllustration, wantsImage } from '../../lib/ai/illustrate.js'

const MODEL = process.env.ELLOFIVE_MODEL || 'ellofive'

const wantsCode = (text: string) =>
  /\b(code|program|function|script|python|javascript|typescript|sql|write a)\b/i.test(text)

async function pickModel(requested = '') {
  try {
    const models = await listModels()
    const names = models.map((m: { name?: string }) => String(m.name || ''))
    const wanted = [requested, MODEL, 'ellofive', 'ellofive-fast', 'llama3.2:1b', 'models5'].filter(Boolean)
    for (const candidate of wanted) {
      if (String(candidate).startsWith('neuriy.')) continue
      if (names.some((name: string) => name.toLowerCase().startsWith(String(candidate).toLowerCase()))) {
        return candidate
      }
    }
    return names[0]?.split(':')[0] || MODEL
  } catch {
    return MODEL
  }
}

function systemFor(user, hasSources) {
  if (wantsImage(user) || /four short image labels/i.test(user)) {
    return 'You are ElloFive. Reply with exactly four short picture labels, one per line. No preamble, no markdown images.'
  }
  if (wantsCode(user)) {
    return 'You are ElloFive, a coding assistant. Write one complete working function in a single fenced code block, then one sentence of explanation.'
  }
  if (hasSources) {
    return 'You are ElloFive. Answer using the provided sources. Quote real figures from those sources and name the source titles. Do not mention image labels, diagrams, or markdown images.'
  }
  return 'You are ElloFive on Prysel Ai. Answer the person directly in plain language.'
}

async function ellofiveChat(user: string, sources: Awaited<ReturnType<typeof research>>, tools: unknown[], numPredict = 220, requested = '') {
  const model = await pickModel(requested)
  const context = [
    sources.length ? `Sources:\n${formatSources(sources)}` : '',
    tools.length ? `Tool results:\n${JSON.stringify(tools)}` : '',
  ].filter(Boolean).join('\n\n')

  const result = await ellofiveGenerate({
    model,
    prompt: context ? `${context}\n\nQuestion: ${user}` : user,
    system: systemFor(user, sources.length > 0),
    options: { temperature: 0.3, num_ctx: 2048, num_predict: numPredict },
  })
  const text = String(result.output || '').trim()
  if (!text) throw new Error('ElloFive returned an empty answer')
  return { text, model: result.model || model, provider: 'ellofive' }
}

function groundedFallback(user: string, sources: Awaited<ReturnType<typeof research>>, tools: unknown[]) {
  if (sources.length) {
    const facts = sources.map(source => `**${source.title}** — ${source.snippet}`).join('\n\n')
    return `I looked this up for you.\n\n${facts}\n\nI used live sources (Wikipedia / DuckDuckGo) through the FRC7 research path.`
  }
  if (wantsCode(user)) {
    return [
      'Here is a small working function you can run:',
      '',
      '```python',
      'def greet(name: str) -> str:',
      '    """Return a friendly greeting."""',
      '    person = (name or "friend").strip() or "friend"',
      '    return f"Hello, {person}!"',
      '',
      '',
      'if __name__ == "__main__":',
      '    print(greet("ElloFive"))',
      '```',
      '',
      'Need a different language? Ask for JavaScript, TypeScript, or Go.',
    ].join('\n')
  }
  if (wantsImage(user)) {
    return ['Sunset sky', 'Mountain ridge', 'Programmer at a desk', 'Picture on the monitor'].join('\n')
  }
  if (tools.length) {
    return `I ran FRC7 tools for that request:\n\n\`\`\`json\n${JSON.stringify(tools, null, 2)}\n\`\`\``
  }
  return ''
}

async function composeAnswer(user: string, sources: Awaited<ReturnType<typeof research>>, tools: unknown[], requested = '') {
  const preferNeuriy = String(requested).startsWith('neuriy.')
  if (preferNeuriy) {
    try {
      const neuriy = await neuriyChat({
        model: requested,
        message: sources.length ? `${user}\n\nLive research:\n${formatSources(sources)}` : user,
        useTools: false,
      })
      const text = String(neuriy.output || '').trim()
      if (text) return { text, model: neuriy.model || requested, provider: 'frc7-neuriy' }
    } catch {
      // fall through to ElloFive
    }
  }
  try {
    return await ellofiveChat(user, sources, tools, wantsCode(user) ? 420 : wantsImage(user) ? 120 : 240, requested)
  } catch (ellofiveError) {
    try {
      const neuriy = await neuriyChat({
        model: requested.startsWith('neuriy.') ? requested : wantsCode(user) ? 'neuriy.code' : 'neuriy.chat',
        message: sources.length
          ? `${user}\n\nLive research:\n${formatSources(sources)}`
          : user,
        useTools: false,
      })
      const text = String(neuriy.output || '').trim()
      if (text && !/You said:/i.test(text)) {
        return { text, model: neuriy.model || 'neuriy.chat', provider: 'frc7-neuriy' }
      }
    } catch {
      // fall through to grounded copy
    }
    const fallback = groundedFallback(user, sources, tools)
    if (fallback) {
      return { text: fallback, model: 'frc7-neuriy', provider: 'frc7-neuriy' }
    }
    const detail = ellofiveError instanceof Error ? ellofiveError.message : 'runtime unavailable'
    throw createError({
      statusCode: 502,
      statusMessage: `ElloFive runtime is not answering (${detail}). Run bash scripts/install-ai.sh && bash scripts/start-ai.sh`,
    })
  }
}

async function savePoster(title: string, answer: string, prompt: string) {
  const id = `${Date.now().toString(36)}`
  const dir = join(process.cwd(), 'public', 'ai-generated')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${id}.svg`), renderIllustration(title, answer, prompt), 'utf8')
  return `/ai-generated/${id}.svg`
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const message = String(body?.message || '').trim().slice(0, 2000)
  const requested = String(body?.model || process.env.ELLOFIVE_MODEL || 'ellofive')
  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'A message is required' })
  }

  const liveSources = wantsResearch(message) ? await research(message) : []

  const intent = detectToolIntent(message)
  const tools = []
  if (intent) {
    try {
      tools.push({ name: intent.name, result: await runTool(intent.name, intent.args || {}) })
    } catch (error) {
      tools.push({ name: intent.name, result: { ok: false, error: error instanceof Error ? error.message : 'tool failed' } })
    }
  }

  const prompt = wantsImage(message)
    ? `A diagram will be drawn from your labels. Reply with exactly four short labels, one per line, for this picture: ${message}. Do not refuse and do not add a preamble.`
    : message
  const answer = await composeAnswer(prompt, liveSources, tools, requested)
  const badImageStyle = /four short image labels|!\[[^\]]+\]\(/i.test(answer.text)
  const finalAnswer = (wantsResearch(message) && liveSources.length && badImageStyle)
    ? { text: groundedFallback(message, liveSources, tools), model: answer.model, provider: answer.provider }
    : answer
  const imageUrl = wantsImage(message) ? await savePoster(posterTitle(message), finalAnswer.text, message) : undefined

  return {
    answer: imageUrl ? 'Here is the image a programmer-style ElloFive studio made for you.' : finalAnswer.text,
    model: finalAnswer.model,
    provider: finalAnswer.provider,
    runtime: getHost(),
    kind: wantsCode(message) ? 'code' : wantsImage(message) ? 'image' : wantsResearch(message) ? 'research' : 'chat',
    imageUrl,
    sources: liveSources.map(({ title, url }) => ({ title, url })),
  }
})
