import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { auth } from './lib/supabase'
import { profileApi } from './lib/supabase'
import { useAppStore } from './store/useAppStore'
import type { Session } from '@supabase/supabase-js'

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
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const setUser = useAppStore(s => s.setUser)
  const setSessionStore = useAppStore(s => s.setSession)
  const setProfile = useAppStore(s => s.setProfile)

  useEffect(() => {
    auth.getUser().then(({ data }) => {
      const user = data.user
      if (user) {
        setUser(user)
        profileApi.get(user.id).then(r => {
          if (r.data) setProfile(r.data)
        })
      }
    })

    const { data: sub } = auth.onAuthChange(async (_event, sess) => {
      setSession(sess)
      setSessionStore(sess)
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

  // Wait for initial auth check
  if (session === undefined) {
    return (
      <div className="h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={session ? <Navigate to="/" replace /> : <AuthPage />}
        />
        {session ? (
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
        ) : (
          <Route path="*" element={<Navigate to="/auth" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
