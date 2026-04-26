'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { EDForm } from '@/components/forms/EDForm'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

export default function NewEDPage() {
  const router = useRouter()
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/logs/ed" className="text-sm text-primary-700 hover:underline">← Back to ED attendances</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New ED attendance</h1>
      </div>
      <Card>
        <EDForm onSuccess={() => router.push('/logs/ed')} />
      </Card>
    </div>
  )
}
