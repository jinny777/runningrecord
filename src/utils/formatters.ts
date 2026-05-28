import { format, parseISO, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'

// ─── 시간/페이스 ────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--'
  const m = Math.floor(secondsPerKm / 60)
  const s = Math.round(secondsPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function paceToSpeed(secondsPerKm: number): number {
  return secondsPerKm > 0 ? Math.round((3600 / secondsPerKm) * 10) / 10 : 0
}

export function speedToPace(kmh: number): number {
  return kmh > 0 ? Math.round(3600 / kmh) : 0
}

// ─── 거리 ───────────────────────────────────────────────────────────────────────

export function formatDistance(km: number): string {
  if (km >= 1) return `${km.toFixed(2)} km`
  return `${Math.round(km * 1000)} m`
}

export function formatDistanceShort(km: number): string {
  return `${km.toFixed(1)}`
}

// ─── 체중 / 체성분 ──────────────────────────────────────────────────────────────

export function formatWeight(kg: number): string {
  return `${kg.toFixed(1)} kg`
}

export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100
  return Math.round((weightKg / (h * h)) * 10) / 10
}

export function getBMILabel(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: '저체중', color: 'text-blue-400' }
  if (bmi < 23) return { label: '정상', color: 'text-green-400' }
  if (bmi < 25) return { label: '과체중', color: 'text-yellow-400' }
  if (bmi < 30) return { label: '비만 1단계', color: 'text-orange-400' }
  return { label: '비만 2단계', color: 'text-red-400' }
}

// ─── 날짜 ───────────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string, fmt = 'M월 d일'): string {
  try {
    return format(parseISO(dateStr), fmt, { locale: ko })
  } catch {
    return dateStr
  }
}

export function formatDateFull(dateStr: string): string {
  return formatDate(dateStr, 'yyyy년 M월 d일 (EEE)')
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getWeekRange(date = new Date()) {
  return {
    start: format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

export function getMonthRange(date = new Date()) {
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date())
}

// ─── 칼로리 / 점수 ──────────────────────────────────────────────────────────────

export function formatCalories(kcal: number): string {
  return `${kcal.toLocaleString()} kcal`
}

export function getConsistencyLabel(score: number): string {
  if (score >= 80) return '매우 꾸준함'
  if (score >= 60) return '꾸준함'
  if (score >= 40) return '보통'
  return '개선 필요'
}

// ─── 심박수 Zone ─────────────────────────────────────────────────────────────────

export function getHRZone(hr: number, maxHR = 190): { zone: number; label: string; color: string } {
  const pct = (hr / maxHR) * 100
  if (pct < 50) return { zone: 1, label: 'Zone 1 회복', color: 'text-gray-400' }
  if (pct < 60) return { zone: 2, label: 'Zone 2 지방연소', color: 'text-blue-400' }
  if (pct < 70) return { zone: 3, label: 'Zone 3 유산소', color: 'text-green-400' }
  if (pct < 80) return { zone: 4, label: 'Zone 4 임계', color: 'text-yellow-400' }
  return { zone: 5, label: 'Zone 5 최대', color: 'text-red-400' }
}

// ─── 파일 / Base64 ───────────────────────────────────────────────────────────────

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve({ base64, mimeType: file.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── 진행률 ─────────────────────────────────────────────────────────────────────

export function calcProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

export function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 70) return 'bg-brand-orange'
  if (pct >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}
