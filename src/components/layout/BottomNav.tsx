import { NavLink } from 'react-router-dom'
import { Activity, Zap, Scale, MessageSquare, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { NAV_ITEMS } from './Sidebar'
import { auth } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'

const BOTTOM_ITEMS = [
  { to: '/', icon: Activity, label: '홈', end: true },
  { to: '/workout', icon: Zap, label: '운동' },
  { to: '/weight', icon: Scale, label: '체중' },
  { to: '/coach', icon: MessageSquare, label: '코치' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const reset = useAppStore(s => s.reset)

  const handleSignOut = async () => {
    await auth.signOut()
    reset()
    setMoreOpen(false)
  }

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 mx-3 mb-1 bg-[#141414] border border-[#2A2A2A] rounded-2xl p-3 lg:hidden animate-slide-up">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {NAV_ITEMS.filter(item =>
              !['/','  /workout','/weight','/coach'].includes(item.to)
            ).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all
                  ${isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            로그아웃
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0F0F0F] border-t border-[#1E1E1E] lg:hidden">
        <div className="flex items-center justify-around px-2 py-1 pb-safe">
          {BOTTOM_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all min-w-0
                ${isActive ? 'text-orange-400' : 'text-gray-500'}`
              }
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all
              ${moreOpen ? 'text-orange-400' : 'text-gray-500'}`}
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-medium">더보기</span>
          </button>
        </div>
      </nav>
    </>
  )
}
