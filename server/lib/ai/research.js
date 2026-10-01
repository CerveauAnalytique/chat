/**
 * Live research: Wikipedia + DuckDuckGo so the chat can find real data.
 */

const clip = (value, max = 500) => {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const headers = {
  Accept: "application/json",
  "User-Agent": "PryselAi/1.0 (ElloFive+FRC7 research; https://github.com/EricksonAtHome/ElloFive)",
}

async function wikipedia(query) {
  const sources = []
  const q = encodeURIComponent(query.slice(0, 180))
  const search = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&utf8=1&format=json&srlimit=3&origin=*`,
    { headers },
  )
  if (!search.ok) return sources
  const data = await search.json()
  const titles = (data.query?.search || []).map((item) => item.title).filter(Boolean)
  const words = String(query || "").toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  titles.sort((a, b) => {
    const score = (title) => words.reduce((n, w) => n + (title.toLowerCase().includes(w) ? 1 : 0), 0)
    return score(b) - score(a)
  })
  for (const title of titles.slice(0, 1)) {
    const summary = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers },
    )
    if (!summary.ok) continue
    const page = await summary.json()
    if (page.extract) {
      sources.push({
        title: page.title || title,
        url: page.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        snippet: clip(page.extract, 480),
      })
    }
  }
  return sources
}

async function duckduckgo(query) {
  const q = encodeURIComponent(query.slice(0, 180))
  const duck = await fetch(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1&skip_disambig=1`, { headers })
  if (!duck.ok) return []
  const data = await duck.json()
  const sources = []
  if (data.AbstractText) {
    sources.push({
      title: data.Heading || "DuckDuckGo",
      url: data.AbstractURL || "https://duckduckgo.com/",
      snippet: clip(data.AbstractText, 480),
    })
  }
  for (const topic of data.RelatedTopics || []) {
    if (topic.Text && topic.FirstURL && sources.length < 3) {
      sources.push({
        title: clip(topic.Text, 60),
        url: topic.FirstURL,
        snippet: clip(topic.Text, 280),
      })
    }
  }
  return sources
}

export function cleanQuery(text) {
  return String(text || "")
    .replace(/[?!.]/g, " ")
    .replace(/\b(please|find real data|look up|lookup|research|tell me about|what is|what's|whats|who is|how many|where is)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}
export function wantsResearch(text) {
  return /\b(research|look up|lookup|find|who is|what is|what's|whats|population|news|data|history|where is|how many|capital of|when did|when was|tell me about)\b/i.test(
    String(text || ""),
  )
}

export async function research(query) {
  const q = cleanQuery(query) || String(query || "").trim()
  const sources = []
  try {
    sources.push(...(await wikipedia(q)))
  } catch {
    // continue
  }
  if (sources.length < 2) {
    try {
      for (const extra of await duckduckgo(q)) {
        if (!sources.some((s) => s.url === extra.url)) sources.push(extra)
      }
    } catch {
      // no live source
    }
  }
  return sources.slice(0, 4)
}

export function formatSources(sources) {
  if (!sources?.length) return ""
  return sources.map((source) => `- ${source.title}: ${source.snippet} (${source.url})`).join("\n")
}
