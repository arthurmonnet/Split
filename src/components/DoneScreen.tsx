'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Transaction } from '@/types'

type Props = {
  transactions: Transaction[]
  onRestart: () => void
}

export default function DoneScreen({ transactions, onRestart }: Props) {
  const [copied, setCopied] = useState(false)

  const sharedTotal = transactions
    .filter((t) => t.classification === 'shared')
    .reduce((sum, t) => sum + t.amount, 0)
  const personalTotal = transactions
    .filter((t) => t.classification === 'personal')
    .reduce((sum, t) => sum + t.amount, 0)
  const halfShared = sharedTotal / 2
  const totalCount = transactions.length

  const copy = async () => {
    await navigator.clipboard.writeText(halfShared.toFixed(2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 10 }}
          className="text-5xl mb-6"
        >
          ✓
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-6xl font-mono font-bold tracking-tight mb-2"
        >
          {halfShared.toFixed(2)}$
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-500 mb-8"
        >
          à rentrer dans Tricount
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-gray-400 mb-10"
        >
          <p>
            {totalCount} transactions · {sharedTotal.toFixed(2)}$ partagés · {personalTotal.toFixed(2)}$ perso
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3 w-full max-w-xs mx-auto"
        >
          <button
            onClick={copy}
            className="w-full py-3 bg-black text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            {copied ? 'Copié !' : 'Copier le montant'}
          </button>
          <button
            onClick={onRestart}
            className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Recommencer
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
