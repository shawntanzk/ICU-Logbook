'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { AirwayForm } from '@/components/forms/AirwayForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewAirwayPage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/airway" className="text-sm text-primary-700 hover:underline">← Back to airway logs</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New airway log</h1>
      </div>
      <Card>
        <AirwayForm onSuccess={() => router.push('/logs/airway')} />
      </Card>
    </div>
  )
}
