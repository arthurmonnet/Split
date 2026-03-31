import Papa from 'papaparse'
import { v4 as uuid } from 'uuid'
import type { CardProfile, Transaction, SerializableCardProfile } from '@/types'
import { storage } from './storage'
import { cleanMerchantName } from './enrichment'
import { detectCategory } from './categories'

const AMEX_COBALT: CardProfile = {
  name: 'AMEX Cobalt',
  detect: (headers) =>
    headers.some((h) => h.toLowerCase().includes('référence') || h.toLowerCase().includes('reference')) &&
    headers.some((h) => h.toLowerCase().includes('montant') || h.toLowerCase().includes('amount')),
  columns: { date: 'Date', merchant: 'Description', amount: 'Montant' },
  dateFormat: 'DD/MM/YYYY',
  amountSign: 'negative',
}

const RBC: CardProfile = {
  name: 'RBC',
  detect: (headers) =>
    headers.some((h) => h.toLowerCase().includes('account type')) ||
    headers.some((h) => h.toLowerCase().includes('cheque')),
  columns: { date: 'Transaction Date', merchant: 'Description 1', amount: 'CAD$' },
  dateFormat: 'MM/DD/YYYY',
  amountSign: 'negative',
}

const builtinProfiles: CardProfile[] = [AMEX_COBALT, RBC]

function customProfilesToCardProfiles(profiles: SerializableCardProfile[]): CardProfile[] {
  return profiles.map((p) => ({
    ...p,
    detect: (headers: string[]) => {
      const cols = [p.columns.date, p.columns.merchant, p.columns.amount]
      return cols.every((col) => headers.some((h) => h.toLowerCase() === col.toLowerCase()))
    },
  }))
}

export function detectCardProfile(headers: string[]): CardProfile | null {
  const customProfiles = customProfilesToCardProfiles(storage.getCardProfiles())
  for (const profile of [...customProfiles, ...builtinProfiles]) {
    if (profile.detect(headers)) return profile
  }
  return null
}

export function getHeaders(csvText: string): string[] {
  const result = Papa.parse(csvText, { header: true, preview: 1 })
  return result.meta.fields || []
}

function parseAmount(raw: string): number {
  if (!raw) return 0
  let cleaned = raw.replace(/[$€\s]/g, '')
  // Handle French decimal format: 1 234,56
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(/\s/g, '').replace(',', '.')
  } else if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1,234.56 format — remove commas
    cleaned = cleaned.replace(/,/g, '')
  }
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(raw: string, format: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10)
  const parts = raw.trim().split(/[/\-.]/)
  if (parts.length < 3) return raw

  let year: string, month: string, day: string
  if (format.startsWith('DD')) {
    day = parts[0]; month = parts[1]; year = parts[2]
  } else if (format.startsWith('MM')) {
    month = parts[0]; day = parts[1]; year = parts[2]
  } else {
    year = parts[0]; month = parts[1]; day = parts[2]
  }

  if (year.length === 2) year = '20' + year
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function findColumn(row: Record<string, string>, colName: string): string {
  // Exact match first
  if (row[colName] !== undefined) return row[colName]
  // Case-insensitive match
  const lower = colName.toLowerCase()
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lower) return row[key]
  }
  return ''
}

export function parseCSV(
  csvText: string,
  profile: CardProfile
): { transactions: Transaction[]; cardName: string } {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const cachedNames = storage.getMerchantNames()
  const transactions: Transaction[] = []

  for (const row of result.data) {
    const rawName = findColumn(row, profile.columns.merchant).trim()
    if (!rawName) continue

    let amount = parseAmount(findColumn(row, profile.columns.amount))
    if (profile.amountSign === 'negative') amount = Math.abs(amount)
    if (amount === 0) continue

    const enrichedName = cachedNames[rawName] || cleanMerchantName(rawName)
    const category = detectCategory(enrichedName || rawName)

    transactions.push({
      id: uuid(),
      date: parseDate(findColumn(row, profile.columns.date), profile.dateFormat),
      rawName,
      enrichedName,
      amount,
      classification: 'ambiguous',
      confidence: 0,
      source: 'heuristic',
      merchantCategory: category,
      cardSource: profile.name,
    })
  }

  return { transactions, cardName: profile.name }
}
