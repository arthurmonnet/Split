export type Classification = 'shared' | 'personal' | 'ambiguous'
export type RuleSource = 'rule' | 'category' | 'heuristic' | 'manual'
export type MerchantRule = 'shared' | 'personal' | 'ask'
export type CategoryRule = 'shared' | 'personal' | 'ask'

export type Transaction = {
  id: string
  date: string
  rawName: string
  enrichedName: string | null
  amount: number
  classification: Classification
  confidence: number
  source: RuleSource
  merchantCategory: string | null
  cardSource: string
}

export type CardProfile = {
  name: string
  detect: (headers: string[]) => boolean
  columns: {
    date: string
    merchant: string
    amount: string
    category?: string
    reference?: string
  }
  dateFormat: string
  amountSign: 'positive' | 'negative' | 'mixed'
}

export type SerializableCardProfile = {
  name: string
  columns: {
    date: string
    merchant: string
    amount: string
    category?: string
    reference?: string
  }
  dateFormat: string
  amountSign: 'positive' | 'negative' | 'mixed'
}

export type StoredData = {
  merchantRules: Record<string, MerchantRule>
  merchantNames: Record<string, string>
  categoryRules: Record<string, CategoryRule>
  cardProfiles: SerializableCardProfile[]
  amountThreshold: number
}

export type AppStep = 'drop' | 'onboarding' | 'batch' | 'swipe' | 'inbox' | 'done'
