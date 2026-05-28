// ─── Domain Types ──────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username?: string
  full_name?: string
  avatar_url?: string
  height_cm?: number
  weight_goal_kg?: number
  birth_date?: string
  gender?: 'male' | 'female' | 'other'
  created_at: string
  updated_at: string
}

export type WorkoutType = 'running' | 'walking' | 'cycling' | 'swimming' | 'other'
export type RecordSource = 'manual' | 'ocr' | 'api'

export interface Workout {
  id: string
  user_id: string
  type: WorkoutType
  date: string
  duration_seconds?: number
  distance_km?: number
  avg_pace_seconds?: number   // 초/km
  max_pace_seconds?: number
  avg_heart_rate?: number
  max_heart_rate?: number
  calories?: number
  elevation_gain_m?: number
  notes?: string
  source: RecordSource
  ocr_image_url?: string
  raw_ocr_data?: Record<string, unknown>
  created_at: string
}

export interface WeightRecord {
  id: string
  user_id: string
  date: string
  weight_kg: number
  body_fat_pct?: number
  muscle_mass_kg?: number
  water_pct?: number
  bmi?: number
  source: RecordSource
  ocr_image_url?: string
  raw_ocr_data?: Record<string, unknown>
  notes?: string
  created_at: string
}

export type GoalType = 'target_weight' | 'weekly_distance' | 'monthly_runs' | 'pace' | 'body_fat'

export interface Goal {
  id: string
  user_id: string
  type: GoalType
  title: string
  target_value: number
  current_value: number
  unit: string
  deadline?: string
  status: 'active' | 'completed' | 'failed'
  created_at: string
}

export type AnalysisType = 'weekly' | 'monthly' | 'integrated' | 'workout' | 'weight'

export interface AnalysisResult {
  id: string
  user_id: string
  type: AnalysisType
  period_start?: string
  period_end?: string
  content?: AnalysisContent
  ai_summary?: string
  recommendations?: string[]
  created_at: string
}

export interface AnalysisContent {
  total_workouts?: number
  total_distance_km?: number
  total_duration_seconds?: number
  avg_pace_seconds?: number
  avg_heart_rate?: number
  total_calories?: number
  weight_change_kg?: number
  avg_weight_kg?: number
  best_pace_seconds?: number
  consistency_score?: number   // 0-100
  fitness_score?: number       // 0-100
}

// ─── OCR Types ─────────────────────────────────────────────────────────────────

export interface WorkoutOCRResult {
  type?: WorkoutType
  duration_seconds?: number
  distance_km?: number
  avg_pace_seconds?: number
  max_pace_seconds?: number
  avg_heart_rate?: number
  max_heart_rate?: number
  calories?: number
  elevation_gain_m?: number
  date?: string
  confidence: number   // 0-1
  raw_text?: string
}

export interface WeightOCRResult {
  weight_kg?: number
  body_fat_pct?: number
  muscle_mass_kg?: number
  water_pct?: number
  bmi?: number
  date?: string
  confidence: number
  raw_text?: string
}

// ─── Coach Types ────────────────────────────────────────────────────────────────

export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface CoachConversation {
  id: string
  user_id: string
  messages: CoachMessage[]
  context_type?: string
  created_at: string
  updated_at: string
}

// ─── Chart / UI Types ───────────────────────────────────────────────────────────

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface WeeklyStats {
  week: string
  totalRuns: number
  totalDistance: number
  totalTime: number
  avgPace: number
  calories: number
}

// ─── API Response ───────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T
  error?: string
  loading?: boolean
}
