import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type {
  Profile, Workout, WeightRecord, Goal,
  AnalysisResult, CoachMessage,
} from '../types'

interface AppState {
  // Auth
  user: User | null
  session: Session | null
  profile: Profile | null

  // Data
  workouts: Workout[]
  weightRecords: WeightRecord[]
  goals: Goal[]
  analyses: AnalysisResult[]

  // Coach
  coachMessages: CoachMessage[]

  // UI
  isLoading: boolean
  activeNav: string

  // Actions
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void

  setWorkouts: (workouts: Workout[]) => void
  addWorkout: (workout: Workout) => void
  removeWorkout: (id: string) => void

  setWeightRecords: (records: WeightRecord[]) => void
  addWeightRecord: (record: WeightRecord) => void
  removeWeightRecord: (id: string) => void

  setGoals: (goals: Goal[]) => void
  addGoal: (goal: Goal) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  removeGoal: (id: string) => void

  setAnalyses: (analyses: AnalysisResult[]) => void
  addAnalysis: (analysis: AnalysisResult) => void

  setCoachMessages: (messages: CoachMessage[]) => void
  addCoachMessage: (message: CoachMessage) => void
  clearCoachMessages: () => void

  setLoading: (loading: boolean) => void
  setActiveNav: (nav: string) => void
  reset: () => void
}

const initialState = {
  user: null,
  session: null,
  profile: null,
  workouts: [],
  weightRecords: [],
  goals: [],
  analyses: [],
  coachMessages: [],
  isLoading: false,
  activeNav: 'dashboard',
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),

      setWorkouts: (workouts) => set({ workouts }),
      addWorkout: (workout) =>
        set((s) => ({ workouts: [workout, ...s.workouts] })),
      removeWorkout: (id) =>
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      setWeightRecords: (weightRecords) => set({ weightRecords }),
      addWeightRecord: (record) =>
        set((s) => ({ weightRecords: [record, ...s.weightRecords] })),
      removeWeightRecord: (id) =>
        set((s) => ({ weightRecords: s.weightRecords.filter((r) => r.id !== id) })),

      setGoals: (goals) => set({ goals }),
      addGoal: (goal) =>
        set((s) => ({ goals: [goal, ...s.goals] })),
      updateGoal: (id, updates) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),
      removeGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      setAnalyses: (analyses) => set({ analyses }),
      addAnalysis: (analysis) =>
        set((s) => ({ analyses: [analysis, ...s.analyses] })),

      setCoachMessages: (coachMessages) => set({ coachMessages }),
      addCoachMessage: (message) =>
        set((s) => ({ coachMessages: [...s.coachMessages, message] })),
      clearCoachMessages: () => set({ coachMessages: [] }),

      setLoading: (isLoading) => set({ isLoading }),
      setActiveNav: (activeNav) => set({ activeNav }),
      reset: () => set(initialState),
    }),
    {
      name: 'fitai-storage',
      // 로그인 여부 상관없이 로컬에 저장 (게스트 모드 지원)
      partialize: (state) => ({
        activeNav: state.activeNav,
        coachMessages: state.coachMessages.slice(-50),
        workouts: state.workouts.slice(0, 200),       // 최근 200개
        weightRecords: state.weightRecords.slice(0, 200),
        goals: state.goals,
      }),
    },
  ),
)

// ─── Computed selectors ─────────────────────────────────────────────────────────

export const selectRecentWorkouts = (n = 5) =>
  (s: AppState) => s.workouts.slice(0, n)

export const selectLatestWeight = (s: AppState) =>
  s.weightRecords[0] ?? null

export const selectActiveGoals = (s: AppState) =>
  s.goals.filter((g) => g.status === 'active')

export const selectThisWeekWorkouts = (s: AppState) => {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return s.workouts.filter((w) => new Date(w.date) >= monday)
}
