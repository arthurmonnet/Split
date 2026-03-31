'use client'

import { useState, useCallback } from 'react'
import type { Transaction, CardProfile, AppStep, CategoryRule } from '@/types'
import { getHeaders, detectCardProfile, parseCSV } from '@/lib/csv-parser'
import { classifyTransactions } from '@/lib/rules-engine'
import { enrichBatchLLM } from '@/lib/enrichment'
import { storage } from '@/lib/storage'
import DropZone from '@/components/DropZone'
import ColumnMapper from '@/components/ColumnMapper'
import OnboardingQuestions from '@/components/OnboardingQuestions'
import BatchReview from '@/components/BatchReview'
import SwipeDeck from '@/components/SwipeDeck'
import InboxView from '@/components/InboxView'
import DoneScreen from '@/components/DoneScreen'

type PendingFile = {
  name: string
  content: string
  headers: string[]
}

type ParseSummary = {
  cardName: string
  count: number
}

export default function Home() {
  const [step, setStep] = useState<AppStep>('drop')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingMapper, setPendingMapper] = useState<PendingFile | null>(null)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [summaries, setSummaries] = useState<ParseSummary[]>([])

  const processFile = useCallback(
    (content: string, fileName: string, profile: CardProfile): { txs: Transaction[]; summary: ParseSummary } => {
      const { transactions: txs, cardName } = parseCSV(content, profile)
      return { txs, summary: { cardName, count: txs.length } }
    },
    []
  )

  const finishParsing = useCallback(
    async (allTxs: Transaction[], allSummaries: ParseSummary[]) => {
      setSummaries(allSummaries)

      // Try LLM enrichment
      const rawNames = allTxs.map((t) => t.rawName)
      const enrichedMap = await enrichBatchLLM(rawNames)
      const enriched = allTxs.map((tx) => ({
        ...tx,
        enrichedName: enrichedMap[tx.rawName] || tx.enrichedName,
      }))

      // Classify
      const classified = classifyTransactions(enriched)
      setTransactions(classified)

      // Check if onboarding needed
      const existingCatRules = storage.getCategoryRules()
      const hasUnconfigured = classified.some(
        (t) => t.merchantCategory && !existingCatRules[t.merchantCategory]
      )

      if (hasUnconfigured) {
        setStep('onboarding')
      } else {
        setStep('inbox')
      }
    },
    []
  )

  const handleFiles = useCallback(
    async (files: { name: string; content: string }[]) => {
      const allTxs: Transaction[] = []
      const allSummaries: ParseSummary[] = []
      const needMapping: PendingFile[] = []

      for (const file of files) {
        const headers = getHeaders(file.content)
        const profile = detectCardProfile(headers)

        if (profile) {
          const { txs, summary } = processFile(file.content, file.name, profile)
          allTxs.push(...txs)
          allSummaries.push(summary)
        } else {
          needMapping.push({ name: file.name, content: file.content, headers })
        }
      }

      if (needMapping.length > 0) {
        setTransactions(allTxs)
        setSummaries(allSummaries)
        setPendingFiles(needMapping.slice(1))
        setPendingMapper(needMapping[0])
      } else {
        await finishParsing(allTxs, allSummaries)
      }
    },
    [processFile, finishParsing]
  )

  const handleMapped = useCallback(
    async (profile: CardProfile) => {
      if (!pendingMapper) return

      const { txs, summary } = processFile(pendingMapper.content, pendingMapper.name, profile)
      const allTxs = [...transactions, ...txs]
      const allSummaries = [...summaries, summary]

      if (pendingFiles.length > 0) {
        const next = pendingFiles[0]
        const headers = getHeaders(next.content)
        setTransactions(allTxs)
        setSummaries(allSummaries)
        setPendingMapper({ ...next, headers })
        setPendingFiles(pendingFiles.slice(1))
      } else {
        setPendingMapper(null)
        await finishParsing(allTxs, allSummaries)
      }
    },
    [pendingMapper, pendingFiles, transactions, summaries, processFile, finishParsing]
  )

  const handleOnboardingDone = useCallback(
    (_updatedRules: Record<string, CategoryRule>) => {
      const reclassified = classifyTransactions(transactions)
      setTransactions(reclassified)
      setStep('inbox')
    },
    [transactions]
  )

  const handleBatchValidate = useCallback(
    (validated: Transaction[]) => {
      const ambiguous = transactions.filter((t) => t.classification === 'ambiguous')
      const all = [...validated, ...ambiguous]
      setTransactions(all)

      if (ambiguous.length > 0) {
        setStep('swipe')
      } else {
        setStep('done')
      }
    },
    [transactions]
  )

  const handleSwipeComplete = useCallback(
    (swiped: Transaction[]) => {
      const nonAmbiguous = transactions.filter((t) => t.classification !== 'ambiguous')
      const merged = [...nonAmbiguous, ...swiped]
      setTransactions(merged)

      // After swiping, check if all done
      const stillAmbiguous = merged.some((t) => t.classification === 'ambiguous')
      if (stillAmbiguous) {
        setStep('inbox')
      } else {
        setStep('done')
      }
    },
    [transactions]
  )

  const handleInboxComplete = useCallback(
    (classified: Transaction[]) => {
      setTransactions(classified)
      setStep('done')
    },
    []
  )

  const handleInboxSwitchToSwipe = useCallback(
    (ambiguous: Transaction[], rest: Transaction[]) => {
      setTransactions([...rest, ...ambiguous])
      setStep('swipe')
    },
    []
  )

  const handleRestart = useCallback(() => {
    setStep('drop')
    setTransactions([])
    setSummaries([])
    setPendingMapper(null)
    setPendingFiles([])
  }, [])

  // Column mapper
  if (pendingMapper) {
    return (
      <ColumnMapper
        fileName={pendingMapper.name}
        headers={pendingMapper.headers}
        onMapped={handleMapped}
      />
    )
  }

  switch (step) {
    case 'drop':
      return <DropZone onFiles={handleFiles} />

    case 'onboarding':
      return (
        <OnboardingQuestions
          transactions={transactions}
          onDone={handleOnboardingDone}
        />
      )

    case 'inbox':
      return (
        <InboxView
          transactions={transactions}
          onComplete={handleInboxComplete}
          onSwitchToSwipe={handleInboxSwitchToSwipe}
        />
      )

    case 'batch': {
      const nonAmbiguous = transactions.filter((t) => t.classification !== 'ambiguous')
      return <BatchReview transactions={nonAmbiguous} onValidate={handleBatchValidate} />
    }

    case 'swipe': {
      const ambiguous = transactions.filter((t) => t.classification === 'ambiguous')
      if (ambiguous.length === 0) {
        return <DoneScreen transactions={transactions} onRestart={handleRestart} />
      }
      return <SwipeDeck transactions={ambiguous} onComplete={handleSwipeComplete} />
    }

    case 'done':
      return <DoneScreen transactions={transactions} onRestart={handleRestart} />
  }
}
