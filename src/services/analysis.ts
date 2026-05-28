/**
 * 통계 분석 알고리즘
 * Claude API 없이 로컬에서 계산하는 지표들
 */

import type { Workout, WeightRecord, Goal, AnalysisContent, WeeklyStats } from '../types'
import { format, parseISO, startOfWeek, getISOWeek } from 'date-fns'

// ─── 운동 통계 ──────────────────────────────────────────────────────────────────

export function calcWorkoutStats(workouts: Workout[]): AnalysisContent {
  if (workouts.length === 0) return {}

  const totalDistance = workouts.reduce((sum, w) => sum + (w.distance_km ?? 0), 0)
  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_seconds ?? 0), 0)
  const totalCalories = workouts.reduce((sum, w) => sum + (w.calories ?? 0), 0)

  const withPace = workouts.filter(w => w.avg_pace_seconds && w.avg_pace_seconds > 0)
  const avgPace = withPace.length
    ? Math.round(withPace.reduce((s, w) => s + w.avg_pace_seconds!, 0) / withPace.length)
    : undefined

  const withHR = workouts.filter(w => w.avg_heart_rate)
  const avgHR = withHR.length
    ? Math.round(withHR.reduce((s, w) => s + w.avg_heart_rate!, 0) / withHR.length)
    : undefined

  const bestPace = withPace.length
    ? Math.min(...withPace.map(w => w.avg_pace_seconds!))
    : undefined

  return {
    total_workouts: workouts.length,
    total_distance_km: Math.round(totalDistance * 100) / 100,
    total_duration_seconds: totalDuration,
    avg_pace_seconds: avgPace,
    avg_heart_rate: avgHR,
    total_calories: totalCalories,
    best_pace_seconds: bestPace,
  }
}

// ─── 주간별 집계 ─────────────────────────────────────────────────────────────────

export function groupWorkoutsByWeek(workouts: Workout[]): WeeklyStats[] {
  const weekMap = new Map<string, Workout[]>()

  for (const w of workouts) {
    const date = parseISO(w.date)
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const existing = weekMap.get(weekStart) ?? []
    weekMap.set(weekStart, [...existing, w])
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, ws]) => ({
      week,
      totalRuns: ws.length,
      totalDistance: Math.round(ws.reduce((s, w) => s + (w.distance_km ?? 0), 0) * 10) / 10,
      totalTime: ws.reduce((s, w) => s + (w.duration_seconds ?? 0), 0),
      avgPace: calcAvgPace(ws),
      calories: ws.reduce((s, w) => s + (w.calories ?? 0), 0),
    }))
}

function calcAvgPace(workouts: Workout[]): number {
  const filtered = workouts.filter(w => w.avg_pace_seconds && w.avg_pace_seconds > 0)
  if (!filtered.length) return 0
  return Math.round(filtered.reduce((s, w) => s + w.avg_pace_seconds!, 0) / filtered.length)
}

// ─── 체중 트렌드 ─────────────────────────────────────────────────────────────────

export interface WeightTrend {
  change7d: number | null
  change30d: number | null
  avgWeight: number
  minWeight: number
  maxWeight: number
  trend: 'down' | 'up' | 'stable'
  weeklyRate: number   // kg/week
}

export function calcWeightTrend(records: WeightRecord[]): WeightTrend | null {
  if (records.length === 0) return null

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const weights = sorted.map(r => r.weight_kg)

  const avgWeight = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)

  // 7일 전 기록 찾기
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const record7d = sorted.findLast(r => new Date(r.date) <= sevenDaysAgo)
  const change7d = record7d
    ? Math.round((latest.weight_kg - record7d.weight_kg) * 10) / 10
    : null

  // 30일 전 기록 찾기
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const record30d = sorted.findLast(r => new Date(r.date) <= thirtyDaysAgo)
  const change30d = record30d
    ? Math.round((latest.weight_kg - record30d.weight_kg) * 10) / 10
    : null

  // 주간 변화율 (최근 4주 선형회귀)
  const recent = sorted.slice(-28)
  const weeklyRate = calcLinearTrend(recent)

  const trend: WeightTrend['trend'] =
    Math.abs(weeklyRate) < 0.1 ? 'stable'
    : weeklyRate < 0 ? 'down'
    : 'up'

  return { change7d, change30d, avgWeight, minWeight, maxWeight, trend, weeklyRate }
}

function calcLinearTrend(records: WeightRecord[]): number {
  if (records.length < 2) return 0
  const n = records.length
  const first = new Date(records[0].date).getTime()
  const xs = records.map(r => (new Date(r.date).getTime() - first) / (1000 * 3600 * 24 * 7))
  const ys = records.map(r => r.weight_kg)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const sumXX = xs.reduce((a, x) => a + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  return Math.round(slope * 100) / 100
}

// ─── 꾸준함 점수 ─────────────────────────────────────────────────────────────────

export function calcConsistencyScore(workouts: Workout[], targetPerWeek = 3): number {
  if (workouts.length === 0) return 0

  const weeks = groupWorkoutsByWeek(workouts)
  if (weeks.length === 0) return 0

  const recentWeeks = weeks.slice(-8) // 최근 8주
  const scores = recentWeeks.map(w => {
    const ratio = Math.min(w.totalRuns / targetPerWeek, 1)
    return ratio * 100
  })

  return Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
}

// ─── 피트니스 점수 ───────────────────────────────────────────────────────────────

export function calcFitnessScore(workouts: Workout[], weightRecords: WeightRecord[]): number {
  if (workouts.length === 0) return 0

  let score = 0

  // 볼륨 (최근 4주 총 거리)
  const recentWorkouts = workouts.slice(0, 20)
  const totalKm = recentWorkouts.reduce((s, w) => s + (w.distance_km ?? 0), 0)
  score += Math.min(totalKm / 100 * 30, 30) // 최대 30점 (100km = 만점)

  // 꾸준함 (최근 8주)
  const consistency = calcConsistencyScore(workouts)
  score += consistency * 0.3 // 최대 30점

  // 페이스 향상
  const paceImprovement = calcPaceImprovement(workouts)
  score += Math.max(0, Math.min(paceImprovement * 10, 20)) // 최대 20점

  // 체중 관리 (BMI 18.5-23 이면 만점)
  if (weightRecords.length > 0) {
    const latestBMI = weightRecords[0].bmi
    if (latestBMI && latestBMI >= 18.5 && latestBMI < 23) score += 20
    else if (latestBMI) score += 10
  }

  return Math.round(Math.min(score, 100))
}

function calcPaceImprovement(workouts: Workout[]): number {
  const withPace = workouts.filter(w => w.avg_pace_seconds && w.avg_pace_seconds > 0)
  if (withPace.length < 4) return 0

  const firstHalf = withPace.slice(-Math.floor(withPace.length / 2))
  const secondHalf = withPace.slice(0, Math.floor(withPace.length / 2))

  const avgFirst = firstHalf.reduce((s, w) => s + w.avg_pace_seconds!, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((s, w) => s + w.avg_pace_seconds!, 0) / secondHalf.length

  // 페이스가 낮아지면(빨라지면) 양수 반환
  return (avgFirst - avgSecond) / 60
}

// ─── 목표 진행률 자동 계산 ───────────────────────────────────────────────────────

export function updateGoalProgress(
  goals: Goal[],
  workouts: Workout[],
  weightRecords: WeightRecord[],
): Goal[] {
  return goals.map(goal => {
    let currentValue = goal.current_value

    switch (goal.type) {
      case 'weekly_distance': {
        const now = new Date()
        const monday = new Date(now)
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
        monday.setHours(0, 0, 0, 0)
        const thisWeek = workouts.filter(w => new Date(w.date) >= monday)
        currentValue = Math.round(
          thisWeek.reduce((s, w) => s + (w.distance_km ?? 0), 0) * 10
        ) / 10
        break
      }
      case 'monthly_runs': {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const thisMonth = workouts.filter(w => new Date(w.date) >= monthStart)
        currentValue = thisMonth.length
        break
      }
      case 'target_weight': {
        if (weightRecords.length > 0) {
          currentValue = weightRecords[0].weight_kg
        }
        break
      }
      case 'body_fat': {
        if (weightRecords.length > 0 && weightRecords[0].body_fat_pct) {
          currentValue = weightRecords[0].body_fat_pct
        }
        break
      }
      case 'pace': {
        const recentWith = workouts.slice(0, 5).filter(w => w.avg_pace_seconds)
        if (recentWith.length > 0) {
          currentValue = Math.min(...recentWith.map(w => w.avg_pace_seconds!))
        }
        break
      }
    }

    // 목표 달성 여부 확인
    let status = goal.status
    if (status === 'active') {
      if (goal.type === 'target_weight' || goal.type === 'body_fat' || goal.type === 'pace') {
        if (currentValue <= goal.target_value) status = 'completed'
      } else {
        if (currentValue >= goal.target_value) status = 'completed'
      }
    }

    return { ...goal, current_value: currentValue, status }
  })
}

// ─── 차트 데이터 생성 ────────────────────────────────────────────────────────────

export function buildWeightChartData(records: WeightRecord[]) {
  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => ({
      date: r.date,
      weight: r.weight_kg,
      bodyFat: r.body_fat_pct,
      muscle: r.muscle_mass_kg,
    }))
}

export function buildPaceChartData(workouts: Workout[]) {
  return [...workouts]
    .filter(w => w.avg_pace_seconds && w.distance_km && w.distance_km >= 1)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map(w => ({
      date: w.date,
      pace: Math.round((w.avg_pace_seconds! / 60) * 100) / 100, // 분 단위
      distance: w.distance_km,
      hr: w.avg_heart_rate,
    }))
}

export function buildDistanceChartData(workouts: Workout[]) {
  const weekly = groupWorkoutsByWeek(workouts).slice(-8)
  return weekly.map(w => ({
    week: w.week,
    distance: w.totalDistance,
    runs: w.totalRuns,
    calories: w.calories,
  }))
}
