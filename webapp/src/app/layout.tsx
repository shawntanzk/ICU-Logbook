import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ICU Logbook',
  description: 'Clinical Training Logbook for ICU/Anaesthesia Trainees',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
