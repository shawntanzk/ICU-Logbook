'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ArterialLineForm } from '@/components/forms/ArterialLineForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewArterialLinePage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/arterial-line" className="text-sm text-primary-700 hover:underline">← Back to arterial lines</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New arterial line</h1>
      </div>
      <Card>
        <ArterialLineForm onSuccess={() => router.push('/logs/arterial-line')} />
      </Card>
    </div>
  )
}
