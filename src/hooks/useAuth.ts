'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from '@/types'

export function useAuth() {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('*, facility:facilities(*)').eq('id', authUser.id).single()
      if (profile) {
        setUser({ id: authUser.id, email: authUser.email!, profile, facility: profile.facility })
      }
      setLoading(false)
    }
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load())
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
