'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Classification } from '@/types'
import { storage } from '@/lib/storage'

type Props = {
  merchants: string[]
  classification: Classification
  onDone: () => void
}

export default function BulkRulePrompt({ merchants, classification, onDone }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set(merchants))
  const MAX_VISIBLE = 6

  const toggle = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const confirm = () => {
    const rule = classification === 'shared' ? 'shared' : 'personal'
    for (const name of checked) {
      storage.updateMerchantRule(name, rule)
    }
    onDone()
  }

  const visible = merchants.slice(0, MAX_VISIBLE)
  const hiddenCount = merchants.length - MAX_VISIBLE

  const label = classification === 'shared' ? 'partagé' : 'perso'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget) onDone() }}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="w-full max-w-md mx-4 sm:mx-auto bg-white rounded-t-2xl p-5 shadow-xl safe-bottom"
      >
        <p className="text-sm text-gray-700 mb-4">
          Toujours <span className="font-semibold">{label}</span> pour ces marchands ?
        </p>

        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {visible.map((name) => (
            <label key={name} className="flex items-center gap-3 py-2 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={checked.has(name)}
                onChange={() => toggle(name)}
                className="rounded border-gray-300 text-gray-900 w-5 h-5"
              />
              <span className="text-sm">{name}</span>
            </label>
          ))}
          {hiddenCount > 0 && (
            <p className="text-xs text-gray-400 pl-7">et {hiddenCount} autres</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={confirm}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Confirmer
          </button>
          <button
            onClick={onDone}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Juste cette fois
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
