import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      {/* 데스크탑 사이드바 */}
      <Sidebar />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8 pt-16 lg:pt-8 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <BottomNav />
    </div>
  )
}
