'use client'
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/appStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const autoSync = useAppStore((s) => s.autoSync)
  const setAutoSync = useAppStore((s) => s.setAutoSync)

  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    if (user?.display_name) setDisplayName(user.display_name)
  }, [user])

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', authUser.id)
      .select()
      .single()
    if (error) { setError(error.message) } else { setMessage('Name updated!'); if (data) setUser(data) }
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setSavingPassword(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setError(error.message) } else { setMessage('Password updated!'); setNewPassword(''); setConfirmPassword('') }
    setSavingPassword(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setError('Type DELETE to confirm')
      return
    }
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    // Soft disable account
    await supabase.from('profiles').update({ disabled: true }).eq('id', authUser.id)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your account preferences</p>
      </div>

      {message && <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">{message}</div>}
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {/* Profile */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="mb-4 space-y-1">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-sm font-medium text-gray-900">{user?.email}</p>
        </div>
        <div className="mb-4 space-y-1">
          <p className="text-sm text-gray-500">Country</p>
          <p className="text-sm font-medium text-gray-900">{user?.country ?? '—'}</p>
        </div>
        <form onSubmit={handleSaveName} className="space-y-3">
          <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Button type="submit" loading={saving} size="sm">Save name</Button>
        </form>
      </Card>

      {/* Password */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <Input label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
          <Input label="Confirm new password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <Button type="submit" loading={savingPassword} size="sm">Update password</Button>
        </form>
      </Card>

      {/* Sync preference */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Auto-sync</p>
            <p className="text-xs text-gray-500">Automatically refresh data when changes occur</p>
          </div>
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSync ? 'bg-primary-700' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </Card>

      {/* Delete account */}
      <Card>
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger zone</h2>
        <p className="text-sm text-gray-600 mb-3">Deleting your account is irreversible. All your data will be disabled.</p>
        <div className="space-y-3">
          <Input
            label="Type DELETE to confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
          />
          <Button variant="danger" onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE'}>
            Delete account
          </Button>
        </div>
      </Card>
    </div>
  )
}
