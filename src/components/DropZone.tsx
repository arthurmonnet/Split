'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type FileResult = {
  name: string
  content: string
}

type Props = {
  onFiles: (files: FileResult[]) => void
}

export default function DropZone({ onFiles }: Props) {
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const promises: Promise<FileResult>[] = []
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        if (!file.name.endsWith('.csv')) continue
        promises.push(
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve({ name: file.name, content: reader.result as string })
            reader.readAsText(file)
          })
        )
      }
      Promise.all(promises).then(onFiles)
    },
    [onFiles]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onClickSelect = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.multiple = true
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        handleFiles(input.files)
      }
    }
    input.click()
  }, [handleFiles])

  return (
    <div className="flex flex-col items-center justify-center min-h-[80dvh] px-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-2 tracking-tight"
      >
        Splitsy
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-gray-500 mb-10 text-center"
      >
        Trie tes dépenses entre perso et partagé, en un swipe.
      </motion.p>

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={onClickSelect}
          className={`
            w-full max-w-md aspect-square rounded-2xl border-2 border-dashed
            flex flex-col items-center justify-center cursor-pointer
            transition-colors duration-200
            ${dragging ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
          `}
        >
          <div className="text-5xl mb-4 opacity-40">📄</div>
          <p className="text-gray-600 font-medium">Dépose tes fichiers CSV ici</p>
          <p className="text-gray-400 text-sm mt-1">ou clique pour sélectionner</p>
          <p className="text-gray-300 text-xs mt-4">AMEX, RBC, ou autre</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
