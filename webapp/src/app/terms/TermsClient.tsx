'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function TermsClient({ content }: { content: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleAccept = () => {
    localStorage.setItem('icu_terms_v1', '1')
    router.push('/dashboard')
  }

  const handleDecline = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-2xl p-8">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-500 text-sm mt-1">Please read and accept to continue</p>
        </div>

        <div className="prose prose-sm prose-blue max-h-96 overflow-y-auto border border-gray-200 rounded-xl p-4 mb-6">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleDecline}>
            Decline &amp; sign out
          </Button>
          <Button className="flex-1" onClick={handleAccept}>
            Accept &amp; continue
          </Button>
        </div>

      </div>
    </div>
  )
}
