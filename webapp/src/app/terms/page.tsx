'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function TermsPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleAccept = () => {
    localStorage.setItem('icu_terms_v1', '1')
    router.push('/dashboard')
  }

  const handleDecline = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Terms and Conditions</h1>
          <p className="text-gray-500 text-sm mt-1">Please read and accept to continue</p>
        </div>

        <div className="prose prose-sm max-h-96 overflow-y-auto border border-gray-200 rounded-xl p-4 mb-6 text-gray-700 text-sm space-y-3">
          <p className="font-semibold">ICU Logbook — Terms of Use</p>
          <p>By using ICU Logbook, you agree to the following terms:</p>
          <p><strong>1. Purpose.</strong> This application is designed to help ICU and anaesthesia trainees record clinical cases and procedures for their ARCP portfolio. It is not intended to replace official hospital records.</p>
          <p><strong>2. Data accuracy.</strong> You are responsible for ensuring all entries are accurate and truthful. Falsification of clinical records is a serious professional misconduct matter.</p>
          <p><strong>3. Patient privacy.</strong> Do not enter identifiable patient information. Use anonymised or de-identified data only. Ensure compliance with GDPR and local data protection regulations.</p>
          <p><strong>4. Data storage.</strong> Your data is stored securely on Supabase infrastructure. We do not share your data with third parties without consent, except where required by law.</p>
          <p><strong>5. Account security.</strong> You are responsible for maintaining the security of your login credentials.</p>
          <p><strong>6. Professional responsibility.</strong> Your use of this application does not confer any clinical endorsement. Supervisors retain clinical and professional responsibility for sign-off.</p>
          <p><strong>7. Modifications.</strong> We reserve the right to modify these terms with notice. Continued use constitutes acceptance.</p>
          <p><strong>8. Disclaimer.</strong> This application is provided &quot;as is&quot; without warranty. We are not liable for any loss arising from its use.</p>
          <p className="text-xs text-gray-400">Last updated: January 2025</p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleDecline}>
            Decline &amp; sign out
          </Button>
          <Button className="flex-1" onClick={handleAccept}>
            Accept &amp; continue
          </Button>
        </div>
      </div>
    </div>
  )
}
