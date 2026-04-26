'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { COUNTRIES } from '@/lib/data'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    medRegNumber: '',
    termsAccepted: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!form.termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('https://qbkrgjbcizpcunwmzhrq.supabase.co/functions/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          displayName: form.displayName,
          country: form.country,
          med_reg_number: form.medRegNumber,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || data.message || 'Registration failed')
        setLoading(false)
        return
      }

      localStorage.setItem('icu_terms_v1', '1')
      router.push('/login?registered=1')
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">ICU</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Start your ARCP logbook</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            value={form.displayName}
            onChange={update('displayName')}
            placeholder="Dr. Jane Smith"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={update('password')}
            placeholder="Min 8 characters"
            required
            minLength={8}
          />
          <Input
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            placeholder="Repeat password"
            required
          />
          <Select
            label="Country"
            options={COUNTRIES}
            value={form.country}
            onChange={update('country')}
            placeholder="Select country"
            required
          />
          <Input
            label="Medical registration number"
            type="text"
            value={form.medRegNumber}
            onChange={update('medRegNumber')}
            placeholder="e.g. GMC 1234567"
            required
          />

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => setForm((f) => ({ ...f, termsAccepted: e.target.checked }))}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-600">
              I accept the{' '}
              <Link href="/terms" className="text-primary-700 hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy-policy" className="text-primary-700 hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>

          <Button type="submit" className="w-full" loading={loading} size="lg">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
