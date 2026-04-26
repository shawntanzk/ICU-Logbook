'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { CaseForm } from '@/components/forms/CaseForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewCasePage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/cases" className="text-sm text-primary-700 hover:underline">← Back to cases</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New ICU case</h1>
      </div>
      <Card>
        <CaseForm onSuccess={() => router.push('/logs/cases')} />
      </Card>
    </div>
  )
}
