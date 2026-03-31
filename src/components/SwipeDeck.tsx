'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Transaction, Classification, MerchantRule } from '@/types'
import { storage } from '@/lib/storage'
import SwipeCard from './SwipeCard'
import RulePrompt from './RulePrompt'

type Props = {
  transactions: Transaction[]
  onComplete: (classified: Transaction[]) => void
}

export default function SwipeDeck({ transactions, onComplete }: Props) {
  const [remaining, setRemaining] = useState<Transaction[]>(transactions)
  const [classified, setClassified] = useState<Transaction[]>([])
  const [rulePrompt, setRulePrompt] = useState<{ name: string; classification: Classification } | null>(null)

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (remaining.length === 0) return

      const current = remaining[0]
      const classification: Classification = direction === 'right' ? 'shared' : 'personal'

      const updated: Transaction = {
        ...current,
        classification,
        confidence: 100,
        source: 'manual',
      }

      const newClassified = [...classified, updated]
      const newRemaining = remaining.slice(1)

      setClassified(newClassified)
      setRemaining(newRemaining)

      // Check if merchant has a rule already
      const merchantRules = storage.getMerchantRules()
      const name = current.enrichedName || current.rawName
      if (!merchantRules[name]) {
        setRulePrompt({ name, classification })
      } else {
        setRulePrompt(null)
      }

      if (newRemaining.length === 0) {
        setTimeout(() => onComplete(newClassified), 300)
      }
    },
    [remaining, classified, onComplete]
  )

  const handleRuleAnswer = useCallback(
    (rule: MerchantRule | null) => {
      if (rule && rulePrompt) {
        storage.updateMerchantRule(rulePrompt.name, rule)
      }
      setRulePrompt(null)
    },
    [rulePrompt]
  )

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleSwipe('left')
      if (e.key === 'ArrowRight') handleSwipe('right')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSwipe])

  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm text-gray-400 mb-6">
          {remaining.length} restante{remaining.length > 1 ? 's' : ''}
        </p>

        <div className="relative h-[340px]">
          <AnimatePresence>
            {remaining.slice(0, 2).map((tx, i) => (
              <SwipeCard
                key={tx.id}
                transaction={tx}
                onSwipe={handleSwipe}
                isTop={i === 0}
              />
            ))}
          </AnimatePresence>

          {remaining.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">
              Tout est trié !
            </div>
          )}
        </div>

        <div className="flex justify-center gap-8 mt-8">
          <div className="text-center">
            <span className="text-xs text-gray-400">← Perso</span>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-400">Partagé →</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rulePrompt && (
          <RulePrompt
            merchantName={rulePrompt.name}
            onAnswer={handleRuleAnswer}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
