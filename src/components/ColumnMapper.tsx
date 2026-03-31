'use client'

import { useState } from 'react'
import type { CardProfile, SerializableCardProfile } from '@/types'
import { storage } from '@/lib/storage'

type Props = {
  fileName: string
  headers: string[]
  onMapped: (profile: CardProfile) => void
}

export default function ColumnMapper({ fileName, headers, onMapped }: Props) {
  const [name, setName] = useState(fileName.replace('.csv', ''))
  const [dateCol, setDateCol] = useState(headers[0] || '')
  const [merchantCol, setMerchantCol] = useState(headers[1] || '')
  const [amountCol, setAmountCol] = useState(headers[2] || '')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [amountSign, setAmountSign] = useState<'positive' | 'negative' | 'mixed'>('negative')

  const handleSubmit = () => {
    const serializable: SerializableCardProfile = {
      name,
      columns: { date: dateCol, merchant: merchantCol, amount: amountCol },
      dateFormat,
      amountSign,
    }
    storage.addCardProfile(serializable)

    const profile: CardProfile = {
      ...serializable,
      detect: (h: string[]) => {
        const cols = [dateCol, merchantCol, amountCol]
        return cols.every((col) => h.some((hdr) => hdr.toLowerCase() === col.toLowerCase()))
      },
    }
    onMapped(profile)
  }

  const selectClass = 'w-full p-2 border border-gray-200 rounded-lg bg-white text-sm'

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-bold mb-1">Format inconnu</h2>
        <p className="text-gray-500 text-sm mb-6">
          Indique quelle colonne correspond à quoi pour <span className="font-medium">{fileName}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nom du profil</label>
            <input
              className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Colonne date</label>
            <select className={selectClass} value={dateCol} onChange={(e) => setDateCol(e.target.value)}>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Colonne marchand</label>
            <select className={selectClass} value={merchantCol} onChange={(e) => setMerchantCol(e.target.value)}>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Colonne montant</label>
            <select className={selectClass} value={amountCol} onChange={(e) => setAmountCol(e.target.value)}>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Format de date</label>
            <select className={selectClass} value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Signe des montants</label>
            <select className={selectClass} value={amountSign} onChange={(e) => setAmountSign(e.target.value as 'positive' | 'negative' | 'mixed')}>
              <option value="negative">Négatif (dépenses en -)</option>
              <option value="positive">Positif</option>
              <option value="mixed">Mixte</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-black text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors mt-2"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  )
}
