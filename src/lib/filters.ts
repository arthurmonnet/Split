import type { Transaction, Classification } from '@/types'
import { CATEGORIES } from './categories'
import { callLLM } from './llm-client'

export type FilterSpec = {
  merchantName?: string
  merchantCategory?: string
  cardSource?: string
  amountRange?: { min?: number; max?: number }
  classification?: Classification
  dayOfWeek?: number[]
}

const CATEGORY_LIST = Object.entries(CATEGORIES)
  .map(([key, cat]) => `${key}: ${cat.label}`)
  .join(', ')

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

  if (lower === 'partagé' || lower === 'partage' || lower === 'shared') {
    return (tx) => tx.classification === 'shared'
  }
  if (lower === 'perso' || lower === 'personal') {
    return (tx) => tx.classification === 'personal'
  }
  if (lower === 'ambigu' || lower === 'ambiguous' || lower === 'à trier') {
    return (tx) => tx.classification === 'ambiguous'
  }

  const amountMatch = lower.match(/^([><])\s*(\d+(?:[.,]\d+)?)$/)
  if (amountMatch) {
    const op = amountMatch[1]
    const val = parseFloat(amountMatch[2].replace(',', '.'))
    return op === '>'
      ? (tx) => tx.amount > val
      : (tx) => tx.amount < val
  }

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (lower === cat.label.toLowerCase() || lower === key) {
      return (tx) => tx.merchantCategory === key
    }
  }

  return (tx) => {
    const name = (tx.enrichedName || tx.rawName).toLowerCase()
    return name.includes(lower)
  }
}

async function parseLLMFilter(query: string): Promise<FilterSpec | null> {
  return callLLM<FilterSpec>(
    `Tu transformes des requêtes en français en filtres JSON pour des transactions bancaires.

Champs disponibles dans FilterSpec :
- merchantName: string — sous-chaîne à chercher dans le nom du marchand
- merchantCategory: string — une de [${CATEGORY_LIST}]
- cardSource: string — nom de la carte (ex: "AMEX Cobalt", "RBC")
- amountRange: { min?: number, max?: number }
- classification: "shared" | "personal" | "ambiguous"
- dayOfWeek: number[] — jours de la semaine (0=dim, 1=lun, ..., 6=sam). "en semaine" = [1,2,3,4,5], "le weekend" = [0,6]

Note : les dates n'ont pas d'heure, ignore les filtres horaires.

Requête : "${query}"

Réponds UNIQUEMENT en JSON valide de type FilterSpec. Pas de markdown, pas d'explication.`
  )
}

export async function parseNLFilter(query: string): Promise<(tx: Transaction) => boolean> {
  if (!query.trim()) {
    return () => true
  }

  const spec = await parseLLMFilter(query)
  if (spec) {
    return applyFilterSpec(spec)
  }

  return parseSimpleFilter(query)
}
