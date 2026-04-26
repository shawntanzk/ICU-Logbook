'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { MedicinePlacementForm } from '@/components/forms/MedicinePlacementForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewMedicinePage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/medicine" className="text-sm text-primary-700 hover:underline">← Back to medicine placements</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New medicine placement</h1>
      </div>
      <Card>
        <MedicinePlacementForm onSuccess={() => router.push('/logs/medicine')} />
      </Card>
    </div>
  )
}
