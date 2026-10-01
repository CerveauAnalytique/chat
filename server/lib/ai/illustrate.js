/**
 * Programmer-made SVG illustrations for ElloFive image requests.
 * These are real generated image files the chat UI can display.
 */

const clip = (value, max = 72) => {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const safe = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

export function wantsImage(text) {
  return /\b(image|picture|diagram|draw|chart|illustrat|poster|logo|visual|photo|artwork|paint)\b/i.test(String(text || ""))
}

export function posterTitle(message) {
  const cleaned = String(message || "")
    .replace(/^(please\s+)?(draw|make|create|generate)\s+(me\s+)?(a\s+)?(diagram|image|picture|chart|poster|illustration|photo|artwork)\s+(of\s+)?/i, "")
    .split(/\bwith\b/i)[0]
    .replace(/[?.!]+$/g, "")
    .trim()
  return cleaned || "Illustration"
}

function hashHue(text) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 360
}

function landscape(title, lines, hue) {
  const sky1 = `hsl(${hue}, 72%, 62%)`
  const sky2 = `hsl(${(hue + 40) % 360}, 80%, 78%)`
  const hill1 = `hsl(${(hue + 90) % 360}, 42%, 32%)`
  const hill2 = `hsl(${(hue + 110) % 360}, 38%, 24%)`
  const captions = lines.slice(0, 3).map((line, i) =>
    `<text x="48" y="${430 + i * 22}" fill="#fff" font-size="16" font-family="Inter, Arial, sans-serif">${safe(clip(line, 70))}</text>`,
  ).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky1}"/>
      <stop offset="1" stop-color="${sky2}"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#sky)"/>
  <circle cx="760" cy="120" r="54" fill="#ffe08a"/>
  <circle cx="760" cy="120" r="78" fill="#ffe08a" opacity="0.28"/>
  <path d="M0 340 C 160 280, 280 380, 430 310 C 580 240, 700 360, 960 300 L 960 540 L 0 540 Z" fill="${hill1}"/>
  <path d="M0 400 C 200 350, 360 460, 540 390 C 720 320, 840 430, 960 380 L 960 540 L 0 540 Z" fill="${hill2}"/>
  <rect x="0" y="0" width="960" height="8" fill="#ff7b00"/>
  <text x="48" y="56" fill="#fff" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="700">Prysel Ai · ElloFive</text>
  <text x="48" y="98" fill="#fff" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="700">${safe(clip(title, 42))}</text>
  ${captions}
  <text x="48" y="520" fill="rgba(255,255,255,.8)" font-size="13" font-family="Inter, Arial, sans-serif">Generated image · ElloFive + FRC7</text>
</svg>`
}

function programmer(title, lines) {
  const captions = lines.slice(0, 3).map((line, i) =>
    `<text x="48" y="${456 + i * 20}" fill="#d1d5db" font-size="14" font-family="Inter, Arial, sans-serif">${safe(clip(line, 78))}</text>`,
  ).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#0f172a"/>
  <rect x="0" y="0" width="960" height="8" fill="#ff7b00"/>
  <text x="48" y="48" fill="#fb923c" font-size="16" font-family="Inter, Arial, sans-serif" font-weight="700">ElloFive · programmer image studio</text>
  <text x="48" y="86" fill="#f8fafc" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700">${safe(clip(title, 44))}</text>
  <rect x="80" y="360" width="800" height="18" rx="4" fill="#334155"/>
  <rect x="120" y="378" width="28" height="90" fill="#1e293b"/>
  <rect x="812" y="378" width="28" height="90" fill="#1e293b"/>
  <rect x="230" y="150" width="500" height="210" rx="10" fill="#1e293b" stroke="#64748b"/>
  <rect x="248" y="168" width="464" height="156" fill="#38bdf8"/>
  <circle cx="620" cy="214" r="28" fill="#fde68a"/>
  <path d="M248 300 L 360 250 L 430 270 L 520 220 L 712 300 Z" fill="#166534"/>
  <rect x="450" y="360" width="60" height="12" fill="#475569"/>
  <circle cx="170" cy="250" r="28" fill="#fbbf24"/>
  <rect x="148" y="280" width="44" height="70" rx="10" fill="#22d3ee"/>
  <rect x="190" y="300" width="50" height="12" rx="6" fill="#fbbf24"/>
  <text x="270" y="330" fill="#0f172a" font-size="14" font-family="ui-monospace, monospace">making the image…</text>
  ${captions}
</svg>`
}

function diagram(title, lines) {
  const boxes = (lines.length ? lines : ["Ask", "Research", "Generate", "Reply"]).slice(0, 4)
  const parts = boxes.map((line, i) => {
    const x = 48 + i * 228
    const arrow = i < boxes.length - 1
      ? `<path d="M ${x + 196} 250 L ${x + 220} 250" stroke="#ff7b00" stroke-width="3" marker-end="url(#arr)"/>`
      : ""
    return `<g>
      <rect x="${x}" y="190" width="188" height="120" rx="16" fill="#fff7ed" stroke="#ff7b00"/>
      <text x="${x + 94}" y="258" text-anchor="middle" fill="#9a3412" font-size="16" font-family="Inter, Arial, sans-serif" font-weight="700">${safe(clip(line, 18))}</text>
      ${arrow}
    </g>`
  }).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#ff7b00"/>
    </marker>
  </defs>
  <rect width="960" height="540" fill="#fff"/>
  <rect x="0" y="0" width="960" height="8" fill="#ff7b00"/>
  <text x="48" y="64" fill="#ff7b00" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="700">Prysel Ai diagram</text>
  <text x="48" y="110" fill="#111827" font-size="30" font-family="Inter, Arial, sans-serif" font-weight="700">${safe(clip(title, 42))}</text>
  ${parts}
  <text x="48" y="500" fill="#6b7280" font-size="14" font-family="Inter, Arial, sans-serif">FRC7 Neuriy orchestrates ElloFive · live research · image studio</text>
</svg>`
}

function animal(title, lines, hue) {
  const grass = `hsl(${(hue + 80) % 360}, 45%, 38%)`
  const captions = lines.slice(0, 2).map((line, i) =>
    `<text x="48" y="${470 + i * 22}" fill="#fff" font-size="16" font-family="Inter, Arial, sans-serif">${safe(clip(line, 70))}</text>`,
  ).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="360" fill="hsl(${hue}, 70%, 72%)"/>
  <rect y="360" width="960" height="180" fill="${grass}"/>
  <circle cx="780" cy="90" r="46" fill="#fff4c4"/>
  <ellipse cx="480" cy="340" rx="120" ry="70" fill="#8b5a2b"/>
  <circle cx="600" cy="280" r="48" fill="#8b5a2b"/>
  <ellipse cx="628" cy="300" rx="22" ry="14" fill="#5c3a1e"/>
  <circle cx="616" cy="268" r="6" fill="#111"/>
  <polygon points="572,250 568,210 598,240" fill="#5c3a1e"/>
  <polygon points="620,248 640,210 646,250" fill="#5c3a1e"/>
  <rect x="420" y="390" width="22" height="50" fill="#5c3a1e"/>
  <rect x="520" y="390" width="22" height="50" fill="#5c3a1e"/>
  <path d="M360 340 C 300 300, 280 360, 340 370" fill="none" stroke="#5c3a1e" stroke-width="10"/>
  <text x="48" y="56" fill="#1f2937" font-size="18" font-family="Inter, Arial, sans-serif" font-weight="700">Prysel Ai · ElloFive</text>
  <text x="48" y="100" fill="#111827" font-size="32" font-family="Inter, Arial, sans-serif" font-weight="700">${safe(clip(title, 42))}</text>
  ${captions}
</svg>`
}

export function renderIllustration(title, answer, prompt = "") {
  const lines = String(answer || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[#*\-\d.\s]+/, "").trim())
    .filter((line) => line && !line.startsWith("```"))
    .slice(0, 4)
  const blob = `${title} ${prompt}`.toLowerCase()
  const hue = hashHue(blob)
  if (/\b(program|programmer|code|computer|laptop|developer|studio|make an? image)\b/.test(blob)) {
    return programmer(title, lines)
  }
  if (/\b(diagram|chart|flow|architecture|pipeline|stack)\b/.test(blob)) {
    return diagram(title, lines)
  }
  if (/\b(dog|cat|animal|bird|horse|fox)\b/.test(blob)) {
    return animal(title, lines, hue)
  }
  return landscape(title, lines, hue)
}
