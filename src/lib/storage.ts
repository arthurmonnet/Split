import type { MerchantRule, CategoryRule, SerializableCardProfile } from '@/types'

const STORAGE_KEYS = {
  MERCHANT_RULES: 'splitsy_merchant_rules',
  MERCHANT_NAMES: 'splitsy_merchant_names',
  CATEGORY_RULES: 'splitsy_category_rules',
  CARD_PROFILES: 'splitsy_card_profiles',
  AMOUNT_THRESHOLD: 'splitsy_amount_threshold',
} as const

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function update<T>(key: string, updater: (current: T) => T, fallback: T): void {
  const current = get<T>(key, fallback)
  set(key, updater(current))
}

export const storage = {
  getMerchantRules: () => get<Record<string, MerchantRule>>(STORAGE_KEYS.MERCHANT_RULES, {}),
  setMerchantRules: (rules: Record<string, MerchantRule>) => set(STORAGE_KEYS.MERCHANT_RULES, rules),
  updateMerchantRule: (name: string, rule: MerchantRule) =>
    update<Record<string, MerchantRule>>(STORAGE_KEYS.MERCHANT_RULES, (r) => ({ ...r, [name]: rule }), {}),

  getMerchantNames: () => get<Record<string, string>>(STORAGE_KEYS.MERCHANT_NAMES, {}),
  setMerchantNames: (names: Record<string, string>) => set(STORAGE_KEYS.MERCHANT_NAMES, names),
  updateMerchantName: (raw: string, clean: string) =>
    update<Record<string, string>>(STORAGE_KEYS.MERCHANT_NAMES, (n) => ({ ...n, [raw]: clean }), {}),

  getCategoryRules: () => get<Record<string, CategoryRule>>(STORAGE_KEYS.CATEGORY_RULES, {}),
  setCategoryRules: (rules: Record<string, CategoryRule>) => set(STORAGE_KEYS.CATEGORY_RULES, rules),
  updateCategoryRule: (category: string, rule: CategoryRule) =>
    update<Record<string, CategoryRule>>(STORAGE_KEYS.CATEGORY_RULES, (r) => ({ ...r, [category]: rule }), {}),

  getCardProfiles: () => get<SerializableCardProfile[]>(STORAGE_KEYS.CARD_PROFILES, []),
  addCardProfile: (profile: SerializableCardProfile) =>
    update<SerializableCardProfile[]>(STORAGE_KEYS.CARD_PROFILES, (ps) => [...ps, profile], []),

  getAmountThreshold: () => get<number>(STORAGE_KEYS.AMOUNT_THRESHOLD, 15),
  setAmountThreshold: (v: number) => set(STORAGE_KEYS.AMOUNT_THRESHOLD, v),
}
