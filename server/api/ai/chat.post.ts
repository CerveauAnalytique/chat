import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { detectToolIntent, runTool } from '../../lib/neuriy/tools/builtins.js'

const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const MODEL = process.env.ELLOFIVE_MODEL || 'ellofive'

type Source = { title: string; url: string; snippet: string }

const clip = (value: string, max = 500) => {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const wantsImage = (text: string) => /\b(image|picture|diagram|draw|chart|illustrat|poster|logo|visual)\b/i.test(text)
const wantsCode = (text: string) => /\b(code|program|function|script|python|javascript|typescript|sql|write a)\b/i.test(text)
const wantsResearch = (text: string) => /\b(research|look up|lookup|find|who is|what is|population|news|data|history|where is)\b/i.test(text)

async function research(query: string): Promise<Source[]> {
  const sources: Source[] = []
  const q = encodeURIComponent(query.slice(0, 180))
  const headers = { Accept: 'application/json', 'User-Agent': 'PryselAi/1.0 (research)' }

  try {
    const search = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&utf8=1&format=json&srlimit=1&origin=*`, { headers })
    if (search.ok) {
      const data = await search.json() as { query?: { search?: Array<{ title: string }> } }
      const titles = data.query?.search?.map(item => item.title).filter(Boolean) || []
      for (const title of titles.slice(0, 1)) {
        const summary = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { headers })
        if (!summary.ok) continue
        const page = await summary.json() as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } }
        if (page.extract) {
          sources.push({
            title: page.title || title,
            url: page.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
            snippet: clip(page.extract, 420)
          })
        }
      }
    }
  } catch {
    // Research continues with any source that did load.
  }

  if (sources.length === 0) {
    try {
      const duck = await fetch(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`, { headers })
      if (duck.ok) {
        const data = await duck.json() as { AbstractText?: string; AbstractURL?: string; Heading?: string }
        if (data.AbstractText) {
          sources.push({
            title: data.Heading || 'DuckDuckGo',
            url: data.AbstractURL || 'https://duckduckgo.com/',
            snippet: clip(data.AbstractText, 420)
          })
        }
      }
    } catch {
      // No live source was reachable.
    }
  }

  return sources
}

async function ollamaChat(user: string, sources: Source[], tools: unknown[], numPredict = 220) {
  const context = [
    sources.length
      ? `Sources:\n${sources.map(source => `- ${source.title}: ${source.snippet} (${source.url})`).join('\n')}`
      : '',
    tools.length ? `Tool results:\n${JSON.stringify(tools)}` : '',
    /\b(code|program|function|python|javascript)\b/i.test(user)
      ? 'Write one complete short function in a single fenced block, then stop.'
      : ''
  ].filter(Boolean).join('\n\n')

  const response = await fetch(`${OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0.4, num_ctx: 2048, num_predict: numPredict },
      messages: [
        {
          role: 'system',
          content: 'You are ElloFive, the Prysel Ai model. Answer the person directly. Use the sources and tool results when they are present, and name the source titles. When asked to program, include one complete fenced code block. Do not invent numbers when a source gives the figure.'
        },
        {
          role: 'user',
          content: context ? `${context}\n\nQuestion: ${user}` : user
        }
      ]
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw createError({ statusCode: 502, statusMessage: `ElloFive runtime returned ${response.status}: ${detail.slice(0, 180)}` })
  }

  const data = await response.json() as { message?: { content?: string }; model?: string }
  const text = data.message?.content?.trim()
  if (!text) throw createError({ statusCode: 502, statusMessage: 'ElloFive returned an empty answer' })
  return { text, model: data.model || MODEL }
}

function posterSvg(title: string, lines: string[]) {
  const safe = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const rows = lines.slice(0, 4).map((line, index) => {
    const y = 168 + index * 42
    return `<text x="48" y="${y}" fill="#1a1a1a" font-size="18" font-family="Inter, Arial, sans-serif">${safe(clip(line, 78))}</text>`
  }).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#ffffff"/>
  <rect x="0" y="0" width="960" height="8" fill="#ff7b00"/>
  <text x="48" y="78" fill="#ff7b00" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700">Prysel Ai</text>
  <text x="48" y="124" fill="#1a1a1a" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="700">${safe(clip(title, 42))}</text>
  ${rows}
  <text x="48" y="500" fill="#6b7280" font-size="14" font-family="Inter, Arial, sans-serif">Generated by ElloFive</text>
</svg>`
}

function posterTitle(message: string) {
  const cleaned = message
    .replace(/^(please\s+)?(draw|make|create|generate)\s+(me\s+)?(a\s+)?(diagram|image|picture|chart|poster|illustration)\s+(of\s+)?/i, '')
    .split(/\bwith\b/i)[0]
    .replace(/[?.!]+$/g, '')
    .trim()
  return cleaned || 'Diagram'
}

async function savePoster(title: string, answer: string) {
  const lines = answer
    .split(/\n+/)
    .map(line => line.replace(/^[#*\-\d.\s]+/, '').trim())
    .filter(line => line && !line.startsWith('```'))
    .slice(0, 4)
  const id = `${Date.now().toString(36)}`
  const dir = join(process.cwd(), 'public', 'ai-generated')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, `${id}.svg`), posterSvg(title, lines.length ? lines : [answer]), 'utf8')
  return `/ai-generated/${id}.svg`
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const message = String(body?.message || '').trim().slice(0, 2000)
  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'A message is required' })
  }

  const sources = wantsResearch(message) ? await research(message) : []
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
  const answer = await ollamaChat(prompt, sources, tools, wantsCode(message) ? 420 : wantsImage(message) ? 120 : 240)
  const imageUrl = wantsImage(message) ? await savePoster(posterTitle(message), answer.text) : undefined

  return {
    answer: imageUrl ? `Here is the diagram.\n\n${answer.text}` : answer.text,
    model: answer.model,
    provider: 'ellofive',
    kind: wantsCode(message) ? 'code' : wantsImage(message) ? 'image' : wantsResearch(message) ? 'research' : 'chat',
    imageUrl,
    sources: sources.map(({ title, url }) => ({ title, url }))
  }
})
