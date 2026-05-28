import { useState } from 'react'
import { Save, ChevronDown } from 'lucide-react'
import type { Workout, WorkoutType, WorkoutOCRResult } from '../../types'
import { today } from '../../utils/formatters'

interface WorkoutFormProps {
  initialData?: Partial<WorkoutOCRResult>
  onSubmit: (data: Omit<Workout, 'id' | 'created_at' | 'user_id'>) => Promise<void>
  loading?: boolean
}

const WORKOUT_TYPES: { value: WorkoutType; label: string; emoji: string }[] = [
  { value: 'running', label: '러닝', emoji: '🏃' },
  { value: 'walking', label: '걷기', emoji: '🚶' },
  { value: 'cycling', label: '사이클', emoji: '🚴' },
  { value: 'swimming', label: '수영', emoji: '🏊' },
  { value: 'other', label: '기타', emoji: '💪' },
]

function minsToSeconds(min: number, sec: number) {
  return min * 60 + sec
}

function secondsToMinSec(totalSec?: number) {
  if (!totalSec) return { min: 0, sec: 0 }
  return { min: Math.floor(totalSec / 60), sec: totalSec % 60 }
}

export default function WorkoutForm({ initialData, onSubmit, loading }: WorkoutFormProps) {
  const initPace = secondsToMinSec(initialData?.avg_pace_seconds)
  const initDuration = secondsToMinSec(initialData?.duration_seconds)

  const [form, setForm] = useState({
    type: (initialData?.type ?? 'running') as WorkoutType,
    date: initialData?.date ?? today(),
    distance_km: initialData?.distance_km?.toString() ?? '',
    duration_min: initDuration.min.toString(),
    duration_sec: initDuration.sec.toString(),
    pace_min: initPace.min.toString(),
    pace_sec: initPace.sec.toString(),
    avg_heart_rate: initialData?.avg_heart_rate?.toString() ?? '',
    max_heart_rate: initialData?.max_heart_rate?.toString() ?? '',
    calories: initialData?.calories?.toString() ?? '',
    elevation_gain_m: initialData?.elevation_gain_m?.toString() ?? '',
    notes: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const duration = minsToSeconds(+form.duration_min || 0, +form.duration_sec || 0)
    const avgPace = minsToSeconds(+form.pace_min || 0, +form.pace_sec || 0)

    await onSubmit({
      type: form.type,
      date: form.date,
      source: initialData ? 'ocr' : 'manual',
      duration_seconds: duration || undefined,
      distance_km: form.distance_km ? +form.distance_km : undefined,
      avg_pace_seconds: avgPace || undefined,
      avg_heart_rate: form.avg_heart_rate ? +form.avg_heart_rate : undefined,
      max_heart_rate: form.max_heart_rate ? +form.max_heart_rate : undefined,
      calories: form.calories ? +form.calories : undefined,
      elevation_gain_m: form.elevation_gain_m ? +form.elevation_gain_m : undefined,
      notes: form.notes || undefined,
      raw_ocr_data: initialData ? (initialData as Record<string, unknown>) : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">운동 종류</label>
        <div className="flex gap-2 flex-wrap">
          {WORKOUT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('type', t.value)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                ${form.type === t.value
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                  : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'}
              `}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">날짜</label>
        <input
          type="date"
          value={form.date}
          onChange={e => set('date', e.target.value)}
          required
          className="input-field"
        />
      </div>

      {/* Distance + Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">거리 (km)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.distance_km}
            onChange={e => set('distance_km', e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">시간 (분:초)</label>
          <div className="flex gap-1.5">
            <input
              type="number" min="0" max="999"
              value={form.duration_min}
              onChange={e => set('duration_min', e.target.value)}
              placeholder="00"
              className="input-field text-center"
            />
            <span className="text-gray-600 self-center">:</span>
            <input
              type="number" min="0" max="59"
              value={form.duration_sec}
              onChange={e => set('duration_sec', e.target.value)}
              placeholder="00"
              className="input-field text-center"
            />
          </div>
        </div>
      </div>

      {/* Pace + Heart Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">평균 페이스 (/km)</label>
          <div className="flex gap-1.5">
            <input
              type="number" min="0" max="30"
              value={form.pace_min}
              onChange={e => set('pace_min', e.target.value)}
              placeholder="0"
              className="input-field text-center"
            />
            <span className="text-gray-600 self-center">:</span>
            <input
              type="number" min="0" max="59"
              value={form.pace_sec}
              onChange={e => set('pace_sec', e.target.value)}
              placeholder="00"
              className="input-field text-center"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">평균 심박수 (bpm)</label>
          <input
            type="number" min="40" max="250"
            value={form.avg_heart_rate}
            onChange={e => set('avg_heart_rate', e.target.value)}
            placeholder="--"
            className="input-field"
          />
        </div>
      </div>

      {/* Calories + Elevation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">칼로리 (kcal)</label>
          <input
            type="number" min="0"
            value={form.calories}
            onChange={e => set('calories', e.target.value)}
            placeholder="--"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">고도 획득 (m)</label>
          <input
            type="number" min="0"
            value={form.elevation_gain_m}
            onChange={e => set('elevation_gain_m', e.target.value)}
            placeholder="--"
            className="input-field"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">메모</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
          placeholder="컨디션, 경로, 느낀 점..."
          className="input-field resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            저장 중...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Save size={16} />
            운동 기록 저장
          </span>
        )}
      </button>
    </form>
  )
}
