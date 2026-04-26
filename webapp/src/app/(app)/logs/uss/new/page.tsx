'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { USSForm } from '@/components/forms/USSForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewUSSPage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/uss" className="text-sm text-primary-700 hover:underline">← Back to USS logs</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New USS log</h1>
      </div>
      <Card>
        <USSForm onSuccess={() => router.push('/logs/uss')} />
      </Card>
    </div>
  )
}
