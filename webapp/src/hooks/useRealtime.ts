'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAppStore } from '@/store/appStore'

const CLINICAL_TABLES = [
  'case_logs',
  'procedure_logs',
  'airway_logs',
  'arterial_line_logs',
  'cvc_logs',
  'uss_logs',
  'regional_block_logs',
  'ward_review_logs',
  'transfer_logs',
  'ed_attendance_logs',
  'medicine_placement_logs',
]

// Module-level singleton client — never recreated across renders.
const supabase = createClient()

// Module-level counter. Date.now() can return the same value when
// StrictMode runs mount→cleanup→remount within the same millisecond.
// Supabase's channel() method looks up by name in an internal registry:
// if the name already exists it returns the existing (already-subscribed)
// channel, which makes subsequent .on() calls throw. An incrementing
// counter is always unique within the JS process lifetime.
let _channelSeq = 0

function destroyChannel(ch: RealtimeChannel) {
  // unsubscribe() sends the LEAVE message; removeChannel() removes it
  // from Supabase's internal registry. Both are needed for a clean teardown.
  ch.unsubscribe()
  supabase.removeChannel(ch)
}

export function useRealtime(onUpdate: (table: string) => void) {
  const autoSync = useAppStore((s) => s.autoSync)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Stable callback ref — avoids adding onUpdate to the dep array
  // (callers often pass inline arrow functions which change every render).
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    // Always destroy any leftover channel from the previous run first.
    // This handles StrictMode double-invoke and autoSync toggle.
    if (channelRef.current) {
      destroyChannel(channelRef.current)
      channelRef.current = null
    }

    if (!autoSync) return

    // Fresh channel with a guaranteed-unique name.
    const channel = supabase.channel(`icu-rt-${++_channelSeq}`)

    // ALL .on() calls MUST happen before .subscribe().
    // Registering them here, synchronously, before anything async runs.
    for (const table of CLINICAL_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('postgres_changes' as any, { event: '*', schema: 'public', table }, () =>
        onUpdateRef.current(table)
      )
    }

    channel.subscribe()
    channelRef.current = channel

    return () => {
      destroyChannel(channel)
      channelRef.current = null
    }
  }, [autoSync])

  return { isSubscribed: autoSync }
}
