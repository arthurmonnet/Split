import type { Classification } from '@/types'

export function formatDate(d: string, month: 'short' | 'long' = 'short'): string {
  try {
    return new Date(d).toLocaleDateString('fr-CA', { day: 'numeric', month })
  } catch {
    return d
  }
}

export function classificationLabel(c: Classification): string {
  const labels: Record<Classification, string> = {
    shared: 'Partagé',
    personal: 'Perso',
    ambiguous: 'À trier',
  }
  return labels[c]
}

export function classificationColors(c: Classification): string {
  const colors: Record<Classification, string> = {
    shared: 'bg-emerald-100 text-emerald-700',
    personal: 'bg-blue-100 text-blue-700',
    ambiguous: 'bg-orange-100 text-orange-700',
  }
  return colors[c]
}
