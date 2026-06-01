import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { auth, profileApi } from './lib/supabase'
import { useAppStore } from './store/useAppStore'

import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Workout from './pages/Workout'
import Weight from './pages/Weight'
import Analysis from './pages/Analysis'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Coach from './pages/Coach'
import ImageAnalysis from './pages/ImageAnalysis'
import AuthPage from './pages/Auth'

function App() {
  const setUser = useAppStore(s => s.setUser)
  const setSession = useAppStore(s => s.setSession)
  const setProfile = useAppStore(s => s.setProfile)

  useEffect(() => {
    // 초기 로그인 상태 확인
    auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        profileApi.get(data.user.id).then(r => {
          if (r.data) setProfile(r.data)
        })
      }
    })

    const { data: sub } = auth.onAuthChange(async (_event, sess) => {
      setSession(sess)
      if (sess?.user) {
        setUser(sess.user)
        profileApi.get(sess.user.id).then(r => {
          if (r.data) setProfile(r.data)
        })
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 페이지 — 항상 접근 가능 */}
        <Route path="/auth" element={<AuthPage />} />

        {/* 모든 페이지 — 로그인 없이도 접근 가능 (게스트 모드) */}
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="workout" element={<Workout />} />
          <Route path="weight" element={<Weight />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="goals" element={<Goals />} />
          <Route path="reports" element={<Reports />} />
          <Route path="coach" element={<Coach />} />
          <Route path="image-analysis" element={<ImageAnalysis />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
