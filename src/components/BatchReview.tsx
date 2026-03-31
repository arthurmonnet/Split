'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Transaction } from '@/types'
import { formatDate, classificationLabel, classificationColors } from '@/lib/ui-utils'

type Props = {
  transactions: Transaction[]
  onValidate: (transactions: Transaction[]) => void
}

export default function BatchReview({ transactions, onValidate }: Props) {
  const [items, setItems] = useState<Transaction[]>(transactions)

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((tx) =>
        tx.id === id
          ? { ...tx, classification: tx.classification === 'shared' ? 'personal' : 'shared' }
          : tx
      )
    )
  }

  return (
    <div className="flex flex-col min-h-[100vh] px-4 pt-8 pb-24">
      <div className="max-w-lg mx-auto w-full">
        <h2 className="text-xl font-bold mb-1">Vérification</h2>
        <p className="text-gray-500 text-sm mb-6">
          {items.length} transactions triées automatiquement. Ajuste si besoin.
        </p>

        <div className="space-y-1">
          {items.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 py-3 border-b border-gray-100"
            >
              <button
                onClick={() => toggle(tx.id)}
                className={`shrink-0 px-2 py-1 rounded-md text-xs font-semibold transition-colors ${classificationColors(tx.classification)}`}
              >
                {classificationLabel(tx.classification)}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {tx.enrichedName || tx.rawName}
                </p>
                {tx.enrichedName && tx.enrichedName !== tx.rawName && (
                  <p className="text-xs text-gray-400 truncate">{tx.rawName}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-medium">{tx.amount.toFixed(2)}$</p>
                <p className="text-xs text-gray-400">{formatDate(tx.date, 'short')}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => onValidate(items)}
            className="w-full py-3 bg-black text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            Tout valider
          </button>
        </div>
      </div>
    </div>
  )
}
