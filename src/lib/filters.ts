import type { Transaction, Classification } from '@/types'
import { CATEGORIES } from './categories'

export type FilterSpec = {
  merchantName?: string
  merchantCategory?: string
  cardSource?: string
  amountRange?: { min?: number; max?: number }
  classification?: Classification
  dayOfWeek?: number[]
}

function applyFilterSpec(spec: FilterSpec): (tx: Transaction) => boolean {
  return (tx: Transaction) => {
    const name = (tx.enrichedName || tx.rawName).toLowerCase()

    if (spec.merchantName && !name.includes(spec.merchantName.toLowerCase())) {
      return false
    }

    if (spec.merchantCategory && tx.merchantCategory !== spec.merchantCategory) {
      return false
    }

    if (spec.cardSource && !tx.cardSource.toLowerCase().includes(spec.cardSource.toLowerCase())) {
      return false
    }

    if (spec.amountRange) {
      if (spec.amountRange.min !== undefined && tx.amount < spec.amountRange.min) return false
      if (spec.amountRange.max !== undefined && tx.amount > spec.amountRange.max) return false
    }

    if (spec.classification && tx.classification !== spec.classification) {
      return false
    }

    if (spec.dayOfWeek && spec.dayOfWeek.length > 0) {
      const date = new Date(tx.date)
      if (!spec.dayOfWeek.includes(date.getDay())) return false
    }

    return true
  }
}

function parseSimpleFilter(query: string): (tx: Transaction) => boolean {
  const lower = query.toLowerCase().trim()

  // Classification filters
  if (lower === 'partagé' || lower === 'partage' || lower === 'shared') {
    return (tx) => tx.classification === 'shared'
  }
  if (lower === 'perso' || lower === 'personal') {
    return (tx) => tx.classification === 'personal'
  }
  if (lower === 'ambigu' || lower === 'ambiguous' || lower === 'à trier') {
    return (tx) => tx.classification === 'ambiguous'
  }

  // Amount filters: "> 50", "< 20", ">50"
  const amountMatch = lower.match(/^([><])\s*(\d+(?:[.,]\d+)?)$/)
  if (amountMatch) {
    const op = amountMatch[1]
    const val = parseFloat(amountMatch[2].replace(',', '.'))
    return op === '>'
      ? (tx) => tx.amount > val
      : (tx) => tx.amount < val
  }

  // Category label match
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (lower === cat.label.toLowerCase() || lower === key) {
      return (tx) => tx.merchantCategory === key
    }
  }

  // Default: substring match on merchant name
  return (tx) => {
    const name = (tx.enrichedName || tx.rawName).toLowerCase()
    return name.includes(lower)
  }
}

async function parseLLMFilter(query: string): Promise<FilterSpec | null> {
  const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
  if (!apiKey) return null

  const categoryList = Object.entries(CATEGORIES)
    .map(([key, cat]) => `${key}: ${cat.label}`)
    .join(', ')

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
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Tu transformes des requêtes en français en filtres JSON pour des transactions bancaires.

Champs disponibles dans FilterSpec :
- merchantName: string — sous-chaîne à chercher dans le nom du marchand
- merchantCategory: string — une de [${categoryList}]
- cardSource: string — nom de la carte (ex: "AMEX Cobalt", "RBC")
- amountRange: { min?: number, max?: number }
- classification: "shared" | "personal" | "ambiguous"
- dayOfWeek: number[] — jours de la semaine (0=dim, 1=lun, ..., 6=sam). "en semaine" = [1,2,3,4,5], "le weekend" = [0,6]

Note : les dates n'ont pas d'heure, ignore les filtres horaires.

Requête : "${query}"

Réponds UNIQUEMENT en JSON valide de type FilterSpec. Pas de markdown, pas d'explication.`,
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as FilterSpec
    }
  } catch {
    // LLM parsing failed, fall back to simple
  }

  return null
}

export async function parseNLFilter(
  query: string,
  _transactions: Transaction[]
): Promise<(tx: Transaction) => boolean> {
  if (!query.trim()) {
    return () => true
  }

  // Try LLM first if available
  const spec = await parseLLMFilter(query)
  if (spec) {
    return applyFilterSpec(spec)
  }

  // Fallback to simple text parsing
  return parseSimpleFilter(query)
}
