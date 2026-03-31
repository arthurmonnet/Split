import { storage } from './storage'

const CLEANUP_RULES: RegExp[] = [
  /^SQ \*\s*/i,
  /^TST\*\s*/i,
  /^PP\*\s*/i,
  /^AMZN MKTP\s*/i,
  /^AMZN\s*/i,
  /^SP \*\s*/i,
  /^IN \*\s*/i,
  /^CKO\*\s*/i,
  /\s+(MONTREA|MONTREAL|TORONTO|QUEBEC|OTTAW|VANC|CALGA|QC|ON|BC|AB|CA)\s*$/i,
  /\s*[*#]\s*[A-Z0-9]{4,}$/i,
  /\s*-\s*\d{3,}$/,
]

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
    .trim()
}

export function cleanMerchantName(raw: string): string {
  let name = raw
  for (const rule of CLEANUP_RULES) {
    name = name.replace(rule, '')
  }
  name = name.replace(/\s{2,}/g, ' ').trim()
  return toTitleCase(name)
}

function isCryptic(name: string): boolean {
  if (name.length < 4) return true
  if (/\d{3,}/.test(name)) return true
  if (name === name.toUpperCase() && name.length > 6) return true
  return false
}

export async function enrichBatchLLM(rawNames: string[]): Promise<Record<string, string>> {
  const cachedNames = storage.getMerchantNames()
  const unknowns = rawNames.filter((n) => !cachedNames[n] && isCryptic(cleanMerchantName(n)))

  if (unknowns.length === 0) return cachedNames

  const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
  if (!apiKey) return cachedNames

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Voici des noms de marchands extraits d'un relevé de carte de crédit. Pour chacun, donne le vrai nom lisible du commerce. Réponds UNIQUEMENT en JSON : {"results": [{"raw": "...", "clean": "..."}]}\n\nNoms :\n${unknowns.map((n) => `- ${n}`).join('\n')}`,
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { results: { raw: string; clean: string }[] }
      for (const r of parsed.results) {
        cachedNames[r.raw] = r.clean
        storage.updateMerchantName(r.raw, r.clean)
      }
    }
  } catch {
    // LLM enrichment is best-effort
  }

  return cachedNames
}
