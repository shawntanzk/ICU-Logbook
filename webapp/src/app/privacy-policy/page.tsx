import { readFileSync } from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'

export const metadata = {
  title: 'Privacy Policy — ICU Logbook',
}

export default function PrivacyPolicyPage() {
  const content = readFileSync(
    path.join(process.cwd(), 'content', 'privacy-policy.md'),
    'utf8'
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
        <article className="prose prose-blue max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
