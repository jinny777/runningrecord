import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { auth, profileApi, workoutApi, weightApi, goalApi } from './lib/supabase'
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
  const setWorkouts = useAppStore(s => s.setWorkouts)
  const setWeightRecords = useAppStore(s => s.setWeightRecords)
  const setGoals = useAppStore(s => s.setGoals)

  const loadUserData = async (userId: string) => {
    const state = useAppStore.getState()

    // 게스트 데이터 수집 (로그인 전 로컬 저장 데이터)
    const guestWorkouts = state.workouts.filter(w => w.user_id === 'guest')
    const guestWeights = state.weightRecords.filter(r => r.user_id === 'guest')
    const guestGoals = state.goals.filter(g => g.user_id === 'guest')

    const [workoutsRes, weightRes, goalsRes] = await Promise.all([
      workoutApi.list(userId),
      weightApi.list(userId),
      goalApi.list(userId),
    ])

    const cloudWorkouts = workoutsRes.data ?? []
    const cloudWeights = weightRes.data ?? []
    const cloudGoals = goalsRes.data ?? []

    // 게스트 운동 기록 → Supabase 이전
    if (guestWorkouts.length > 0) {
      const migrated: typeof cloudWorkouts = []
      for (const w of guestWorkouts) {
        const { id: _id, user_id: _uid, created_at: _ca, ...rest } = w
        const { data } = await workoutApi.create({ ...rest, user_id: userId })
        if (data) migrated.push(data)
      }
      setWorkouts([...migrated, ...cloudWorkouts])
    } else {
      setWorkouts(cloudWorkouts)
    }

    // 게스트 체중 기록 → Supabase 이전
    if (guestWeights.length > 0) {
      const migrated: typeof cloudWeights = []
      for (const r of guestWeights) {
        const { id: _id, user_id: _uid, created_at: _ca, ...rest } = r
        const { data } = await weightApi.create({ ...rest, user_id: userId })
        if (data) migrated.push(data)
      }
      setWeightRecords([...migrated, ...cloudWeights])
    } else {
      setWeightRecords(cloudWeights)
    }

    // 게스트 목표 → Supabase 이전
    if (guestGoals.length > 0) {
      const migrated: typeof cloudGoals = []
      for (const g of guestGoals) {
        const { id: _id, user_id: _uid, created_at: _ca, ...rest } = g
        const { data } = await goalApi.create({ ...rest, user_id: userId })
        if (data) migrated.push(data)
      }
      setGoals([...migrated, ...cloudGoals])
    } else {
      setGoals(cloudGoals)
    }
  }

  useEffect(() => {
    // 초기 로그인 상태 확인
    auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        profileApi.get(data.user.id).then(r => {
          if (r.data) setProfile(r.data)
        })
        loadUserData(data.user.id)
      }
    })

    const { data: sub } = auth.onAuthChange(async (_event, sess) => {
      setSession(sess)
      if (sess?.user) {
        setUser(sess.user)
        profileApi.get(sess.user.id).then(r => {
          if (r.data) setProfile(r.data)
        })
        loadUserData(sess.user.id)
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
