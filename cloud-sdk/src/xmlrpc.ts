/**
 * Minimal XML-RPC client for OpenNebula (no native deps, Node + browser).
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function encodeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '<value><nil/></value>'
  }
  if (typeof value === 'boolean') {
    return `<value><boolean>${value ? 1 : 0}</boolean></value>`
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return `<value><int>${value}</int></value>`
    }
    return `<value><double>${value}</double></value>`
  }
  if (typeof value === 'string') {
    return `<value><string>${escapeXml(value)}</string></value>`
  }
  if (Array.isArray(value)) {
    return `<value><array><data>${value.map((item) => encodeValue(item)).join('')}</data></array></value>`
  }
  if (typeof value === 'object') {
    const members = Object.entries(value as Record<string, unknown>)
      .map(
        ([key, val]) =>
          `<member><name>${escapeXml(key)}</name>${encodeValue(val)}</member>`,
      )
      .join('')
    return `<value><struct>${members}</struct></value>`
  }
  return `<value><string>${escapeXml(String(value))}</string></value>`
}

export function buildXmlRpcRequest(method: string, params: unknown[]): string {
  const encoded = params.map((param) => `<param>${encodeValue(param)}</param>`).join('')
  return `<?xml version="1.0"?><methodCall><methodName>${escapeXml(method)}</methodName><params>${encoded}</params></methodCall>`
}

type Token =
  | { type: 'open'; name: string }
  | { type: 'close'; name: string }
  | { type: 'text'; value: string }
  | { type: 'self'; name: string }

function tokenize(xml: string): Token[] {
  const tokens: Token[] = []
  const re = /<\/?([A-Za-z0-9:_-]+)[^>]*\/?>|([^<]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(xml)) !== null) {
    const full = match[0]
    if (full.startsWith('</')) {
      tokens.push({ type: 'close', name: match[1]!.toLowerCase() })
    } else if (full.startsWith('<')) {
      const name = match[1]!.toLowerCase()
      if (full.endsWith('/>')) tokens.push({ type: 'self', name })
      else tokens.push({ type: 'open', name })
    } else if (match[2] && match[2].trim()) {
      tokens.push({ type: 'text', value: decodeXmlEntities(match[2]) })
    }
  }
  return tokens
}

interface XmlNode {
  name: string
  children: Array<XmlNode | string>
}

function parseXml(xml: string): XmlNode {
  const tokens = tokenize(xml.replace(/<\?xml[\s\S]*?\?>/, ''))
  const root: XmlNode = { name: 'root', children: [] }
  const stack: XmlNode[] = [root]

  for (const token of tokens) {
    if (token.type === 'open') {
      const node: XmlNode = { name: token.name, children: [] }
      stack[stack.length - 1]!.children.push(node)
      stack.push(node)
    } else if (token.type === 'self') {
      stack[stack.length - 1]!.children.push({ name: token.name, children: [] })
    } else if (token.type === 'close') {
      if (stack.length > 1) stack.pop()
    } else if (token.type === 'text') {
      stack[stack.length - 1]!.children.push(token.value)
    }
  }

  const methodResponse = root.children.find(
    (c): c is XmlNode => typeof c !== 'string' && c.name === 'methodresponse',
  )
  if (!methodResponse) throw new Error('Invalid XML-RPC response')
  return methodResponse
}

function childElements(node: XmlNode, name?: string): XmlNode[] {
  return node.children.filter(
    (c): c is XmlNode => typeof c !== 'string' && (!name || c.name === name),
  )
}

function firstChild(node: XmlNode, name: string): XmlNode | undefined {
  return childElements(node, name)[0]
}

function textOf(node: XmlNode | undefined): string {
  if (!node) return ''
  return node.children
    .map((c) => (typeof c === 'string' ? c : textOf(c)))
    .join('')
}

function decodeValue(valueNode: XmlNode): unknown {
  const typed = childElements(valueNode)[0]
  if (!typed) return textOf(valueNode)

  switch (typed.name) {
    case 'i4':
    case 'int':
    case 'i8':
      return Number.parseInt(textOf(typed), 10)
    case 'boolean': {
      const t = textOf(typed).trim()
      return t === '1' || t.toLowerCase() === 'true'
    }
    case 'double':
      return Number.parseFloat(textOf(typed))
    case 'string':
      return textOf(typed)
    case 'nil':
      return null
    case 'array': {
      const data = firstChild(typed, 'data')
      if (!data) return []
      return childElements(data, 'value').map(decodeValue)
    }
    case 'struct': {
      const obj: Record<string, unknown> = {}
      for (const member of childElements(typed, 'member')) {
        const name = textOf(firstChild(member, 'name'))
        const value = firstChild(member, 'value')
        if (name && value) obj[name] = decodeValue(value)
      }
      return obj
    }
    default:
      return textOf(typed)
  }
}

export function parseOpenNebulaResponse(xml: string): unknown[] {
  const methodResponse = parseXml(xml)

  const fault = firstChild(methodResponse, 'fault')
  if (fault) {
    const value = firstChild(fault, 'value')
    const decoded = value ? decodeValue(value) : null
    const message =
      typeof decoded === 'object' && decoded && 'faultString' in decoded
        ? String((decoded as { faultString: unknown }).faultString)
        : 'XML-RPC fault'
    throw new Error(message)
  }

  const params = firstChild(methodResponse, 'params')
  if (!params) throw new Error('Invalid XML-RPC response: no params')

  const values = childElements(params, 'param')
    .map((param) => firstChild(param, 'value'))
    .filter((v): v is XmlNode => Boolean(v))
    .map(decodeValue)

  if (values.length === 1 && Array.isArray(values[0])) {
    return values[0] as unknown[]
  }
  return values
}

export async function xmlRpcCall(
  endpoint: string,
  method: string,
  params: unknown[],
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<unknown[]> {
  const fetchImpl = options?.fetchImpl ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 30_000)

  try {
    const body = buildXmlRpcRequest(method, params)
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body,
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`OpenNebula XML-RPC HTTP ${res.status}`)
    }

    const responseXml = await res.text()
    return parseOpenNebulaResponse(responseXml)
  } finally {
    clearTimeout(timeout)
  }
}
