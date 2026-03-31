import type { Transaction } from '@/types'
import { storage } from './storage'

export function classifyTransactions(transactions: Transaction[]): Transaction[] {
  const merchantRules = storage.getMerchantRules()
  const categoryRules = storage.getCategoryRules()
  const threshold = storage.getAmountThreshold()

  return transactions.map((tx) => {
    const name = tx.enrichedName || tx.rawName

    // Layer 1: Merchant exact match
    const merchantRule = merchantRules[name]
    if (merchantRule === 'shared') {
      return { ...tx, classification: 'shared' as const, confidence: 100, source: 'rule' as const }
    }
    if (merchantRule === 'personal') {
      return { ...tx, classification: 'personal' as const, confidence: 100, source: 'rule' as const }
    }
    if (merchantRule === 'ask') {
      return { ...tx, classification: 'ambiguous' as const, confidence: 0, source: 'rule' as const }
    }

    // Layer 2: Category match
    if (tx.merchantCategory) {
      const catRule = categoryRules[tx.merchantCategory]
      if (catRule === 'shared') {
        return { ...tx, classification: 'shared' as const, confidence: 90, source: 'category' as const }
      }
      if (catRule === 'personal') {
        return { ...tx, classification: 'personal' as const, confidence: 90, source: 'category' as const }
      }
      if (catRule === 'ask') {
        return { ...tx, classification: 'ambiguous' as const, confidence: 0, source: 'category' as const }
      }
    }

    // Layer 3: Amount heuristic
    if (tx.amount < threshold) {
      return { ...tx, classification: 'personal' as const, confidence: 40, source: 'heuristic' as const }
    }

    return { ...tx, classification: 'ambiguous' as const, confidence: 0, source: 'heuristic' as const }
  })
}
