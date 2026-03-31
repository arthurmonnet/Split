'use client'

import { motion } from 'framer-motion'
import type { MerchantRule } from '@/types'

type Props = {
  merchantName: string
  onAnswer: (rule: MerchantRule | null) => void
}

// Note: RulePrompt only offers 'shared', 'personal', or null (juste cette fois)
// The 'ask' variant from MerchantRule is not offered in this UI

export default function RulePrompt({ merchantName, onAnswer }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-4 right-4 z-40"
    >
      <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
        <p className="text-sm text-gray-700 mb-3">
          Toujours comme ça pour <span className="font-semibold">{merchantName}</span> ?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onAnswer('shared')}
            className="flex-1 py-2 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            Toujours partagé
          </button>
          <button
            onClick={() => onAnswer('personal')}
            className="flex-1 py-2 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Toujours perso
          </button>
          <button
            onClick={() => onAnswer(null)}
            className="flex-1 py-2 text-xs font-medium rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Juste cette fois
          </button>
        </div>
      </div>
    </motion.div>
  )
}
