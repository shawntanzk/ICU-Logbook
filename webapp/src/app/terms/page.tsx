import { readFileSync } from 'fs'
import path from 'path'
import TermsClient from './TermsClient'

export const metadata = {
  title: 'Terms of Service — ICU Logbook',
}

export default function TermsPage() {
  const content = readFileSync(
    path.join(process.cwd(), 'content', 'terms-of-service.md'),
    'utf8'
  )

  return <TermsClient content={content} />
}
