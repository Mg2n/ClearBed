'use client'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 size={32} className="animate-spin text-blue-600" />
    </div>
  )

  if (!user) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar username={user.profile.username} role={user.profile.role} facilityName={user.facility.name} />
      <main className="flex-1 ml-64 p-8 min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  )
}
