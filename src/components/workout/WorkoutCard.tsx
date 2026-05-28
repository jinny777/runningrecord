import { Trash2, MapPin, Heart, Flame, TrendingUp } from 'lucide-react'
import type { Workout } from '../../types'
import { formatDate, formatDuration, formatPace, formatDistance } from '../../utils/formatters'

const TYPE_EMOJI: Record<string, string> = {
  running: '🏃',
  walking: '🚶',
  cycling: '🚴',
  swimming: '🏊',
  other: '💪',
}

interface WorkoutCardProps {
  workout: Workout
  onDelete?: (id: string) => void
}

export default function WorkoutCard({ workout, onDelete }: WorkoutCardProps) {
  const {
    id, type, date, distance_km, duration_seconds,
    avg_pace_seconds, avg_heart_rate, calories,
    elevation_gain_m, notes,
  } = workout

  return (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E1E1E] flex items-center justify-center text-xl">
            {TYPE_EMOJI[type] ?? '💪'}
          </div>
          <div>
            <p className="font-bold text-white capitalize">
              {type === 'running' ? '러닝' : type === 'walking' ? '걷기' : type === 'cycling' ? '사이클' : type === 'swimming' ? '수영' : '운동'}
            </p>
            <p className="text-xs text-gray-500">{formatDate(date, 'M월 d일 (EEE)')}</p>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Primary metrics */}
      <div className="flex gap-4 mb-3">
        {distance_km && (
          <div>
            <p className="text-xl font-black tabular-nums text-white">
              {formatDistance(distance_km)}
            </p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">거리</p>
          </div>
        )}
        {duration_seconds && (
          <div>
            <p className="text-xl font-black tabular-nums text-white">
              {formatDuration(duration_seconds)}
            </p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">시간</p>
          </div>
        )}
        {avg_pace_seconds && (
          <div>
            <p className="text-xl font-black tabular-nums text-orange-400">
              {formatPace(avg_pace_seconds)}
            </p>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">페이스/km</p>
          </div>
        )}
      </div>

      {/* Secondary metrics */}
      {(avg_heart_rate || calories || elevation_gain_m) && (
        <div className="flex gap-3 pt-3 border-t border-[#1E1E1E]">
          {avg_heart_rate && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Heart size={10} className="text-red-400" />
              {avg_heart_rate} bpm
            </span>
          )}
          {calories && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Flame size={10} className="text-orange-400" />
              {calories} kcal
            </span>
          )}
          {elevation_gain_m && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <TrendingUp size={10} className="text-green-400" />
              +{elevation_gain_m}m
            </span>
          )}
        </div>
      )}

      {notes && (
        <p className="mt-2.5 text-xs text-gray-600 italic truncate">{notes}</p>
      )}
    </div>
  )
}
