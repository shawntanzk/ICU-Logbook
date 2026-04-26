'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { CVCForm } from '@/components/forms/CVCForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewCVCPage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/cvc" className="text-sm text-primary-700 hover:underline">← Back to CVC logs</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New CVC log</h1>
      </div>
      <Card>
        <CVCForm onSuccess={() => router.push('/logs/cvc')} />
      </Card>
    </div>
  )
}
