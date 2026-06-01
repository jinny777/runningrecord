import { NavLink, useNavigate } from 'react-router-dom'
import {
  Activity, Scale, BarChart2, Target, FileText,
  MessageSquare, LogOut, Zap, Menu, X, LogIn, CloudOff,
} from 'lucide-react'
import { useState } from 'react'
import { auth } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'

export const NAV_ITEMS = [
  { to: '/', icon: Activity, label: '대시보드', end: true },
  { to: '/workout', icon: Zap, label: '운동 기록' },
  { to: '/weight', icon: Scale, label: '체중 관리' },
  { to: '/analysis', icon: BarChart2, label: '통합 분석' },
  { to: '/goals', icon: Target, label: '목표 관리' },
  { to: '/reports', icon: FileText, label: '리포트' },
  { to: '/coach', icon: MessageSquare, label: 'AI 코치' },
]

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const reset = useAppStore(s => s.reset)
  const user = useAppStore(s => s.user)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await auth.signOut()
    reset()
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#141414] border border-[#2A2A2A] lg:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-[#0F0F0F] border-r border-[#1E1E1E]
          flex flex-col z-40 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[#1E1E1E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <div>
              <p className="font-black text-lg tracking-tight text-white">FitAI</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Coach</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* 로그인 상태 */}
        <div className="px-3 py-4 border-t border-[#1E1E1E] space-y-2">
          {user ? (
            <>
              <p className="text-xs text-gray-600 px-3 truncate">{user.email}</p>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
              >
                <LogOut size={18} />
                로그아웃
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <CloudOff size={13} className="text-yellow-500 shrink-0" />
                <p className="text-xs text-yellow-600">게스트 모드 · 로컬 저장</p>
              </div>
              <button
                onClick={() => { navigate('/auth'); setMobileOpen(false) }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-orange-400 hover:bg-orange-500/10 transition-all"
              >
                <LogIn size={18} />
                로그인 / 회원가입
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
