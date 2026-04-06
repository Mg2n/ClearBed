'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Hotel, Eye, EyeOff, Loader2 } from 'lucide-react'

const DEMO = [
  { label: 'Manager',     email: 'hotel_manager@clearbed.demo',     pw: 'Manager@123' },
  { label: 'Supervisor',  email: 'hotel_supervisor@clearbed.demo',  pw: 'Supervisor@123' },
  { label: 'Attendant',   email: 'housekeeper1@clearbed.demo',      pw: 'Housekeeper@123' },
  { label: 'Maintenance', email: 'hotel_maintenance@clearbed.demo', pw: 'Maintenance@123' },
  { label: 'Reception',   email: 'hotel_reception@clearbed.demo',   pw: 'Reception@123' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2040] to-[#162952] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Hotel size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ClearBed</h1>
          <p className="text-blue-300 mt-1">Hotel Operations Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Sign in</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
                  value={pw} onChange={e => setPw(e.target.value)} required />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? <><Loader2 size={16} className="animate-spin" />Signing in…</> : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map(a => (
                <button key={a.email} onClick={() => { setEmail(a.email); setPw(a.pw); setError('') }}
                  className="px-2 py-1.5 text-xs bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors font-medium text-slate-600">
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
