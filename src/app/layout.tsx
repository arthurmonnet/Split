import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Splitsy',
  description: 'Trie tes dépenses entre perso et partagé, en un swipe.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        {children}
      </body>
    </html>
  )
}
