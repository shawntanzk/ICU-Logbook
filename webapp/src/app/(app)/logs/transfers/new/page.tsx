'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { TransferForm } from '@/components/forms/TransferForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewTransferPage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/transfers" className="text-sm text-primary-700 hover:underline">← Back to transfers</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New transfer</h1>
      </div>
      <Card>
        <TransferForm onSuccess={() => router.push('/logs/transfers')} />
      </Card>
    </div>
  )
}
