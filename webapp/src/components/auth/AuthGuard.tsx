'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }

    // Check profile completeness
    supabase
      .from('profiles')
      .select('country, med_reg_hmac')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data && (!data.country || !data.med_reg_hmac)) {
          router.push('/complete-registration')
        }
      })
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary-700 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
