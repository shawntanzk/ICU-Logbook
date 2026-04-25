'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ProcedureForm } from '@/components/forms/ProcedureForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewProcedurePage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/procedures" className="text-sm text-primary-700 hover:underline">← Back to procedures</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New procedure</h1>
      </div>
      <Card>
        <ProcedureForm onSuccess={() => router.push('/logs/procedures')} />
      </Card>
    </div>
  )
}
