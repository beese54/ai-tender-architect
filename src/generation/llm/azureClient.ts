/**
 * Minimal Azure OpenAI Chat Completions client (via the Vite dev proxy).
 *
 * SECURITY / CORS: The browser does NOT call Azure directly and does NOT hold
 * the API key. Instead it calls the same-origin path `/azure-openai/...`, which
 * the Vite dev server proxies to the real Azure endpoint, injecting the
 * `api-key` header server-side (see `vite.config.ts`). This both avoids browser
 * CORS (Azure OpenAI sends no CORS headers) and keeps the key out of the client
 * bundle entirely — the client only reads the non-secret deployment name and
 * API version. The key lives only in the gitignored `.env.local`.
 *
 * NOTE: The proxy exists only under `npm run dev`. A static production build
 * would need its own server-side proxy — do not deploy this build publicly.
 */

/** Same-origin prefix that the Vite dev server proxies to Azure OpenAI. */
const PROXY_PREFIX = '/azure-openai'

interface ClientConfig {
  deployment: string
  apiVersion: string
}

/** Read the non-secret client config. The key/endpoint live server-side in the proxy. */
function readConfig(): ClientConfig | null {
  const deployment = (import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT ?? '').trim()
  const apiVersion = (import.meta.env.VITE_AZURE_OPENAI_API_VERSION ?? '2024-10-21').trim()
  if (!deployment) return null
  return { deployment, apiVersion }
}

/** True when the Azure deployment is configured (and the proxy can reach it). */
export function isAzureConfigured(): boolean {
  return readConfig() !== null
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Call Azure OpenAI Chat Completions (through the dev proxy) and return the
 * assistant message content. Forces a JSON object response. Throws on
 * misconfiguration or a non-OK response.
 */
export async function chatJson(
  messages: ChatMessage[],
  opts: { temperature?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const cfg = readConfig()
  if (!cfg) {
    throw new Error('Azure OpenAI is not configured (missing VITE_AZURE_OPENAI_DEPLOYMENT).')
  }

  // Same-origin path → the Vite proxy rewrites it to the Azure endpoint and
  // injects the api-key header. No key or endpoint is sent from the browser.
  const url = `${PROXY_PREFIX}/openai/deployments/${encodeURIComponent(
    cfg.deployment,
  )}/chat/completions?api-version=${encodeURIComponent(cfg.apiVersion)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      temperature: opts.temperature ?? 0.4,
      response_format: { type: 'json_object' },
    }),
    signal: opts.signal,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Azure OpenAI request failed (${res.status} ${res.statusText}). ${detail.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Azure OpenAI returned an empty response.')
  return content
}

/** Parse a JSON object from an LLM response, tolerating ```json fences and stray prose. */
export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  // Strip a leading/trailing markdown code fence if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = (fenced ? fenced[1] : trimmed).trim()
  try {
    return JSON.parse(body)
  } catch {
    // Last resort: grab the outermost {...} span.
    const start = body.indexOf('{')
    const end = body.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(body.slice(start, end + 1))
    }
    throw new Error('Could not parse JSON from the model response.')
  }
}
