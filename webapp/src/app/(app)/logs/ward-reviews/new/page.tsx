'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { WardReviewForm } from '@/components/forms/WardReviewForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewWardReviewPage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/ward-reviews" className="text-sm text-primary-700 hover:underline">← Back to ward reviews</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New ward review</h1>
      </div>
      <Card>
        <WardReviewForm onSuccess={() => router.push('/logs/ward-reviews')} />
      </Card>
    </div>
  )
}
