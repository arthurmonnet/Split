'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Transaction, CategoryRule } from '@/types'
import { CATEGORIES } from '@/lib/categories'
import { storage } from '@/lib/storage'

type CategoryInfo = {
  key: string
  label: string
  merchants: string[]
}

type Props = {
  transactions: Transaction[]
  onDone: (updatedRules: Record<string, CategoryRule>) => void
}

export default function OnboardingQuestions({ transactions, onDone }: Props) {
  const existingRules = storage.getCategoryRules()

  // Find categories present in data that aren't configured yet
  const unconfigured: CategoryInfo[] = []
  const seen = new Set<string>()
  for (const tx of transactions) {
    if (tx.merchantCategory && !existingRules[tx.merchantCategory] && !seen.has(tx.merchantCategory)) {
      seen.add(tx.merchantCategory)
      const cat = CATEGORIES[tx.merchantCategory]
      if (!cat) continue
      const merchants = transactions
        .filter((t) => t.merchantCategory === tx.merchantCategory)
        .map((t) => t.enrichedName || t.rawName)
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 4)
      unconfigured.push({ key: tx.merchantCategory, label: cat.label, merchants })
    }
  }

  const [currentIndex, setCurrentIndex] = useState(0)
  const [rules, setRules] = useState<Record<string, CategoryRule>>({ ...existingRules })

  if (unconfigured.length === 0) {
    // Nothing to configure
    onDone(rules)
    return null
  }

  const current = unconfigured[currentIndex]

  const answer = (rule: CategoryRule) => {
    const updated = { ...rules, [current.key]: rule }
    setRules(updated)
    storage.updateCategoryRule(current.key, rule)

    if (currentIndex + 1 < unconfigured.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onDone(updated)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
      <div className="w-full max-w-sm">
        <p className="text-xs text-gray-400 mb-6 text-center">
          {currentIndex + 1} / {unconfigured.length}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-bold mb-2 text-center">{current.label}</h2>
            <p className="text-gray-500 text-sm mb-8 text-center">
              {current.merchants.join(', ')}
              {transactions.filter((t) => t.merchantCategory === current.key).length > current.merchants.length && ' …'}
            </p>

            <p className="text-center text-gray-700 font-medium mb-6">C&apos;est partagé ?</p>

            <div className="space-y-3">
              <button
                onClick={() => answer('shared')}
                className="w-full py-3 rounded-xl text-sm font-medium border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                Oui, partagé
              </button>
              <button
                onClick={() => answer('personal')}
                className="w-full py-3 rounded-xl text-sm font-medium border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Non, perso
              </button>
              <button
                onClick={() => answer('ask')}
                className="w-full py-3 rounded-xl text-sm font-medium border-2 border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Ça dépend
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
