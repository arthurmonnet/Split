'use client'

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import type { Transaction } from '@/types'
import { CATEGORIES } from '@/lib/categories'
import { formatDate } from '@/lib/ui-utils'

type Props = {
  transaction: Transaction
  onSwipe: (direction: 'left' | 'right') => void
  isTop: boolean
}

const SWIPE_THRESHOLD = 100

export default function SwipeCard({ transaction, onSwipe, isTop }: Props) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const bgColor = useTransform(
    x,
    [-200, -50, 0, 50, 200],
    [
      'rgba(59, 130, 246, 0.15)',
      'rgba(59, 130, 246, 0.05)',
      'rgba(255,255,255,0)',
      'rgba(16, 185, 129, 0.05)',
      'rgba(16, 185, 129, 0.15)',
    ]
  )
  const leftOpacity = useTransform(x, [-150, -50], [1, 0])
  const rightOpacity = useTransform(x, [50, 150], [0, 1])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe('right')
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe('left')
    }
  }

  const categoryLabel = transaction.merchantCategory
    ? CATEGORIES[transaction.merchantCategory]?.label
    : null

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        backgroundColor: isTop ? bgColor : 'white',
        zIndex: isTop ? 10 : 1,
        position: 'absolute',
        width: '100%',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={isTop ? handleDragEnd : undefined}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.6 }}
      animate={{
        scale: isTop ? 1 : 0.95,
        opacity: isTop ? 1 : 0.6,
        y: isTop ? 0 : 10,
      }}
      exit={{
        x: 300,
        opacity: 0,
        transition: { duration: 0.2 },
      }}
      className="rounded-2xl border border-gray-200 shadow-sm p-6 cursor-grab active:cursor-grabbing select-none touch-pan-y"
    >
      {/* Direction indicators */}
      {isTop && (
        <>
          <motion.div
            style={{ opacity: leftOpacity }}
            className="absolute top-4 left-4 text-blue-500 font-bold text-sm"
          >
            PERSO
          </motion.div>
          <motion.div
            style={{ opacity: rightOpacity }}
            className="absolute top-4 right-4 text-emerald-500 font-bold text-sm"
          >
            PARTAGÉ
          </motion.div>
        </>
      )}

      <div className="mt-6 text-center">
        <p className="text-xl sm:text-2xl font-bold mb-1">
          {transaction.enrichedName || transaction.rawName}
        </p>
        {transaction.enrichedName && transaction.enrichedName !== transaction.rawName && (
          <p className="text-xs text-gray-400 mb-3">{transaction.rawName}</p>
        )}
        <p className="text-2xl sm:text-3xl font-mono font-bold mt-4 mb-2">
          {transaction.amount.toFixed(2)}$
        </p>
        <p className="text-sm text-gray-500">{formatDate(transaction.date, 'long')}</p>
        {categoryLabel && (
          <span className="inline-block mt-3 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
            {categoryLabel}
          </span>
        )}
        <p className="text-xs text-gray-300 mt-3">{transaction.cardSource}</p>
      </div>
    </motion.div>
  )
}
