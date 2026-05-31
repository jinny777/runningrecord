import { createClient } from '@supabase/supabase-js'
import type {
  Profile, Workout, WeightRecord, Goal,
  AnalysisResult, CoachConversation,
} from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  || 'https://bpwjkqacuvjorvohjhzh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwd2prcWFjdXZqb3J2b2hqaHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzM3NTgsImV4cCI6MjA5NTUwOTc1OH0.D9Jdr-V0jvtKqIWxHmJtxXriU6EVwjoQqI4aVAp2_4M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth helpers ───────────────────────────────────────────────────────────────

export const auth = {
  signUp: (email: string, password: string) =>
    supabase.auth.signUp({ email, password }),

  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  signInWithGoogle: () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    }),

  getUser: () => supabase.auth.getUser(),

  onAuthChange: (cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(cb),
}

// ─── Profile ────────────────────────────────────────────────────────────────────

export const profileApi = {
  get: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data: data as Profile | null, error }
  },

  upsert: async (profile: Partial<Profile> & { id: string }) => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...profile, updated_at: new Date().toISOString() })
      .select()
      .single()
    return { data: data as Profile | null, error }
  },
}

// ─── Workouts ───────────────────────────────────────────────────────────────────

export const workoutApi = {
  list: async (userId: string, limit = 50) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)
    return { data: (data ?? []) as Workout[], error }
  },

  listByRange: async (userId: string, from: string, to: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
    return { data: (data ?? []) as Workout[], error }
  },

  create: async (workout: Omit<Workout, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert(workout)
      .select()
      .single()
    return { data: data as Workout | null, error }
  },

  update: async (id: string, updates: Partial<Workout>) => {
    const { data, error } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data: data as Workout | null, error }
  },

  delete: async (id: string) =>
    supabase.from('workouts').delete().eq('id', id),
}

// ─── Weight Records ─────────────────────────────────────────────────────────────

export const weightApi = {
  list: async (userId: string, limit = 90) => {
    const { data, error } = await supabase
      .from('weight_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)
    return { data: (data ?? []) as WeightRecord[], error }
  },

  listByRange: async (userId: string, from: string, to: string) => {
    const { data, error } = await supabase
      .from('weight_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
    return { data: (data ?? []) as WeightRecord[], error }
  },

  create: async (record: Omit<WeightRecord, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('weight_records')
      .insert(record)
      .select()
      .single()
    return { data: data as WeightRecord | null, error }
  },

  delete: async (id: string) =>
    supabase.from('weight_records').delete().eq('id', id),
}

// ─── Goals ──────────────────────────────────────────────────────────────────────

export const goalApi = {
  list: async (userId: string) => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data: (data ?? []) as Goal[], error }
  },

  create: async (goal: Omit<Goal, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('goals')
      .insert(goal)
      .select()
      .single()
    return { data: data as Goal | null, error }
  },

  update: async (id: string, updates: Partial<Goal>) => {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data: data as Goal | null, error }
  },

  delete: async (id: string) =>
    supabase.from('goals').delete().eq('id', id),
}

// ─── Analysis ───────────────────────────────────────────────────────────────────

export const analysisApi = {
  list: async (userId: string) => {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    return { data: (data ?? []) as AnalysisResult[], error }
  },

  create: async (result: Omit<AnalysisResult, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('analysis_results')
      .insert(result)
      .select()
      .single()
    return { data: data as AnalysisResult | null, error }
  },
}

// ─── Coach Conversations ────────────────────────────────────────────────────────

export const coachApi = {
  get: async (userId: string) => {
    const { data, error } = await supabase
      .from('coach_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    return { data: data as CoachConversation | null, error }
  },

  upsert: async (conv: Partial<CoachConversation> & { user_id: string }) => {
    const { data, error } = await supabase
      .from('coach_conversations')
      .upsert({ ...conv, updated_at: new Date().toISOString() })
      .select()
      .single()
    return { data: data as CoachConversation | null, error }
  },
}

// ─── Storage (OCR images) ───────────────────────────────────────────────────────

export const storageApi = {
  uploadOCRImage: async (userId: string, file: File, bucket = 'ocr-images') => {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false })
    if (error) return { url: null, error }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    return { url: urlData.publicUrl, error: null }
  },
}
