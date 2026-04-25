'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { COUNTRIES } from '@/lib/data'

export default function CompleteRegistrationPage() {
  const router = useRouter()
  const supabase = createClient()
  const [country, setCountry] = useState('')
  const [medRegNumber, setMedRegNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const res = await fetch('https://qbkrgjbcizpcunwmzhrq.supabase.co/functions/v1/set-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ country, med_reg_number: medRegNumber }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || data.message || 'Failed to save registration')
        setLoading(false)
        return
      }

      localStorage.setItem('icu_terms_v1', '1')
      router.push('/dashboard')
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">ICU</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete registration</h1>
          <p className="text-gray-500 text-sm mt-1">A few more details to get started</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Country"
            options={COUNTRIES}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Select country"
            required
          />
          <Input
            label="Medical registration number"
            type="text"
            value={medRegNumber}
            onChange={(e) => setMedRegNumber(e.target.value)}
            placeholder="e.g. GMC 1234567"
            required
          />
          <Button type="submit" className="w-full" loading={loading} size="lg">
            Complete registration
          </Button>
        </form>
      </div>
    </div>
  )
}
