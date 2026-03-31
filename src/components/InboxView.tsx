'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Transaction, Classification } from '@/types'
import { storage } from '@/lib/storage'
import { parseNLFilter } from '@/lib/filters'
import BulkRulePrompt from './BulkRulePrompt'

type Props = {
  transactions: Transaction[]
  onComplete: (classified: Transaction[]) => void
  onSwitchToSwipe: (ambiguous: Transaction[], rest: Transaction[]) => void
}

export default function InboxView({ transactions, onComplete, onSwitchToSwipe }: Props) {
  const [items, setItems] = useState<Transaction[]>(transactions)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterQuery, setFilterQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [filterFn, setFilterFn] = useState<((tx: Transaction) => boolean) | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const [bulkPrompt, setBulkPrompt] = useState<{
    merchants: string[]
    classification: Classification
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sort: ambiguous first, then by date desc
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.classification === 'ambiguous' && b.classification !== 'ambiguous') return -1
      if (a.classification !== 'ambiguous' && b.classification === 'ambiguous') return 1
      return b.date.localeCompare(a.date)
    })
  }, [items])

  const visibleItems = useMemo(() => {
    if (!filterFn) return sortedItems
    return sortedItems.filter(filterFn)
  }, [sortedItems, filterFn])

  const ambiguousCount = useMemo(() => items.filter((t) => t.classification === 'ambiguous').length, [items])

  // Apply filter
  const applyFilter = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setFilterFn(null)
        setActiveFilter(null)
        return
      }
      setIsFiltering(true)
      try {
        const fn = await parseNLFilter(query, items)
        setFilterFn(() => fn)
        setActiveFilter(query)
      } finally {
        setIsFiltering(false)
      }
    },
    [items]
  )

  const clearFilter = useCallback(() => {
    setFilterQuery('')
    setFilterFn(null)
    setActiveFilter(null)
    setSelected(new Set())
  }, [])

  const handleFilterSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      applyFilter(filterQuery)
    },
    [filterQuery, applyFilter]
  )

  // Debounced simple text search
  useEffect(() => {
    if (!filterQuery.trim()) {
      setFilterFn(null)
      setActiveFilter(null)
      return
    }
    const timer = setTimeout(() => {
      // Only auto-apply simple text search (no LLM)
      const lower = filterQuery.toLowerCase().trim()
      setFilterFn(() => (tx: Transaction) => {
        const name = (tx.enrichedName || tx.rawName).toLowerCase()
        return name.includes(lower)
      })
      setActiveFilter(filterQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [filterQuery])

  // Toggle single item classification
  const toggleClassification = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx
        const next: Classification =
          tx.classification === 'ambiguous'
            ? 'shared'
            : tx.classification === 'shared'
              ? 'personal'
              : 'shared'
        return { ...tx, classification: next, confidence: 100, source: 'manual' as const }
      })
    )
  }, [])

  // Toggle selection
  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Select all visible
  const selectAllVisible = useCallback(() => {
    const visibleIds = visibleItems.map((t) => t.id)
    setSelected((prev) => {
      const allSelected = visibleIds.every((id) => prev.has(id))
      if (allSelected) {
        // Deselect all visible
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      }
      return new Set([...prev, ...visibleIds])
    })
  }, [visibleItems])

  // Bulk classify
  const bulkClassify = useCallback(
    (classification: Classification) => {
      if (classification === 'ambiguous') return

      const selectedItems = items.filter((t) => selected.has(t.id))

      setItems((prev) =>
        prev.map((tx) =>
          selected.has(tx.id)
            ? { ...tx, classification, confidence: 100, source: 'manual' as const }
            : tx
        )
      )

      // Find merchants without existing rules
      const merchantRules = storage.getMerchantRules()
      const merchantCounts: Record<string, number> = {}
      for (const tx of selectedItems) {
        const name = tx.enrichedName || tx.rawName
        if (!merchantRules[name]) {
          merchantCounts[name] = (merchantCounts[name] || 0) + 1
        }
      }

      // Only prompt for merchants appearing 2+ times
      const merchants = Object.entries(merchantCounts)
        .filter(([, count]) => count >= 2)
        .map(([name]) => name)

      if (merchants.length > 0) {
        setBulkPrompt({ merchants, classification })
      }

      setSelected(new Set())
    },
    [items, selected]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Don't hijack if input is focused
        if (document.activeElement === inputRef.current) return
        e.preventDefault()
        selectAllVisible()
      }
      if (e.key === 'Escape') {
        if (selected.size > 0) {
          setSelected(new Set())
        } else if (activeFilter) {
          clearFilter()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectAllVisible, selected, activeFilter, clearFilter])

  const handleComplete = useCallback(() => {
    onComplete(items)
  }, [items, onComplete])

  const handleSwitchToSwipe = useCallback(() => {
    const ambiguous = items.filter((t) => t.classification === 'ambiguous')
    const rest = items.filter((t) => t.classification !== 'ambiguous')
    onSwitchToSwipe(ambiguous, rest)
  }, [items, onSwitchToSwipe])

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
    } catch {
      return d
    }
  }

  const classLabel = (c: Classification) => {
    switch (c) {
      case 'shared': return 'Partagé'
      case 'personal': return 'Perso'
      case 'ambiguous': return 'À trier'
    }
  }

  const classColors = (c: Classification) => {
    switch (c) {
      case 'shared': return 'bg-emerald-100 text-emerald-700'
      case 'personal': return 'bg-blue-100 text-blue-700'
      case 'ambiguous': return 'bg-orange-100 text-orange-700'
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-4 pt-6 pb-28">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold">Inbox</h2>
          <p className="text-sm text-gray-400">
            {items.length - ambiguousCount}/{items.length} triées
          </p>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleFilterSubmit} className="mb-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder='Filtrer... ex: "iga", "courses", "> 50"'
              className="w-full py-2.5 px-4 pr-10 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-gray-300 focus:outline-none transition-colors"
            />
            {isFiltering && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              </div>
            )}
            {activeFilter && !isFiltering && (
              <button
                type="button"
                onClick={clearFilter}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Active filter chip */}
        {activeFilter && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
              {activeFilter}
              <button onClick={clearFilter} className="ml-1 hover:text-gray-900">✕</button>
            </span>
            <span className="text-xs text-gray-400">{visibleItems.length} résultat{visibleItems.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Bulk action bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="sticky top-0 z-20 bg-white border border-gray-200 rounded-xl p-3 mb-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium">{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => bulkClassify('shared')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  >
                    Tout partagé
                  </button>
                  <button
                    onClick={() => bulkClassify('personal')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    Tout perso
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Select all button when filter active but no selection */}
        {activeFilter && selected.size === 0 && visibleItems.length > 0 && (
          <button
            onClick={selectAllVisible}
            className="w-full py-2 mb-3 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Tout sélectionner ({visibleItems.length})
          </button>
        )}

        {/* Transaction list */}
        <div className="space-y-0.5">
          {visibleItems.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${
                selected.has(tx.id) ? 'bg-gray-50' : 'hover:bg-gray-50'
              } ${tx.classification === 'ambiguous' ? 'border-l-2 border-l-orange-300' : ''}`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(tx.id)}
                onChange={() => toggleSelected(tx.id)}
                className="shrink-0 rounded border-gray-300 text-gray-900 w-4 h-4 cursor-pointer"
              />

              {/* Classification badge */}
              <button
                onClick={() => toggleClassification(tx.id)}
                className={`shrink-0 px-2 py-1 rounded-md text-xs font-semibold transition-colors min-w-[60px] text-center ${classColors(tx.classification)}`}
              >
                {classLabel(tx.classification)}
              </button>

              {/* Name & raw */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {tx.enrichedName || tx.rawName}
                </p>
                {tx.enrichedName && tx.enrichedName !== tx.rawName && (
                  <p className="text-xs text-gray-400 truncate">{tx.rawName}</p>
                )}
              </div>

              {/* Amount & date */}
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-medium">{tx.amount.toFixed(2)}$</p>
                <p className="text-xs text-gray-400">{formatDate(tx.date)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {visibleItems.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            {activeFilter ? 'Aucun résultat pour ce filtre.' : 'Aucune transaction.'}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="max-w-lg mx-auto flex gap-2">
          {ambiguousCount > 0 && (
            <button
              onClick={handleSwitchToSwipe}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Swiper les {ambiguousCount} restante{ambiguousCount > 1 ? 's' : ''} →
            </button>
          )}
          <button
            onClick={handleComplete}
            disabled={ambiguousCount > 0}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
              ambiguousCount > 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {ambiguousCount > 0 ? `Encore ${ambiguousCount} à trier` : 'Valider'}
          </button>
        </div>
      </div>

      {/* Bulk rule prompt */}
      <AnimatePresence>
        {bulkPrompt && (
          <BulkRulePrompt
            merchants={bulkPrompt.merchants}
            classification={bulkPrompt.classification}
            onDone={() => setBulkPrompt(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
