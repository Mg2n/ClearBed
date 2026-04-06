'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, BedDouble, Brush, Wrench, RefreshCw, Users, LogOut, Hotel, ChevronRight } from 'lucide-react'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/rooms',        label: 'Rooms',        icon: BedDouble },
  { href: '/housekeeping', label: 'Housekeeping', icon: Brush },
  { href: '/maintenance',  label: 'Maintenance',  icon: Wrench },
  { href: '/turnovers',    label: 'Turnovers',    icon: RefreshCw },
  { href: '/users',        label: 'Users',        icon: Users,           roles: ['MANAGER'] },
] as const

export default function Sidebar({ username, role, facilityName }: { username: string; role: UserRole; facilityName: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 min-h-screen bg-[#0a1628] flex flex-col fixed left-0 top-0 z-40">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Hotel size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">ClearBed</p>
            <p className="text-blue-300 text-xs mt-0.5 truncate max-w-[120px]">{facilityName}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, roles }: any) => {
          if (roles && !roles.includes(role)) return null
          const active = pendingHref ? pendingHref === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={() => setPendingHref(href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold uppercase">{username[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{username}</p>
            <p className="text-slate-400 text-xs">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
          <LogOut size={16} />Sign out
        </button>
      </div>
    </aside>
  )
}
