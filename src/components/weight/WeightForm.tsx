import { useState } from 'react'
import { Save } from 'lucide-react'
import type { WeightRecord, WeightOCRResult } from '../../types'
import { today } from '../../utils/formatters'

interface WeightFormProps {
  initialData?: Partial<WeightOCRResult>
  heightCm?: number
  onSubmit: (data: Omit<WeightRecord, 'id' | 'created_at' | 'user_id'>) => Promise<void>
  loading?: boolean
}

export default function WeightForm({ initialData, heightCm, onSubmit, loading }: WeightFormProps) {
  const [form, setForm] = useState({
    date: initialData?.date ?? today(),
    weight_kg: initialData?.weight_kg?.toString() ?? '',
    body_fat_pct: initialData?.body_fat_pct?.toString() ?? '',
    muscle_mass_kg: initialData?.muscle_mass_kg?.toString() ?? '',
    water_pct: initialData?.water_pct?.toString() ?? '',
    notes: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const calcBMI = () => {
    if (!heightCm || !form.weight_kg) return undefined
    const h = heightCm / 100
    return Math.round((+form.weight_kg / (h * h)) * 10) / 10
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.weight_kg) return

    const bmi = initialData?.bmi ?? calcBMI()

    await onSubmit({
      date: form.date,
      weight_kg: +form.weight_kg,
      body_fat_pct: form.body_fat_pct ? +form.body_fat_pct : undefined,
      muscle_mass_kg: form.muscle_mass_kg ? +form.muscle_mass_kg : undefined,
      water_pct: form.water_pct ? +form.water_pct : undefined,
      bmi,
      notes: form.notes || undefined,
      source: initialData ? 'ocr' : 'manual',
      raw_ocr_data: initialData ? (initialData as Record<string, unknown>) : undefined,
    })
  }

  const bmiPreview = calcBMI()

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">체중 (kg)</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.1"
            min="20"
            max="300"
            value={form.weight_kg}
            onChange={e => set('weight_kg', e.target.value)}
            placeholder="00.0"
            required
            className="input-field text-2xl font-black tabular-nums"
          />
          {bmiPreview && (
            <div className="text-right shrink-0">
              <p className="text-lg font-black text-orange-400">{bmiPreview}</p>
              <p className="text-[10px] text-gray-600 uppercase">BMI</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">체지방 (%)</label>
          <input
            type="number"
            step="0.1" min="1" max="70"
            value={form.body_fat_pct}
            onChange={e => set('body_fat_pct', e.target.value)}
            placeholder="--"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">근육량 (kg)</label>
          <input
            type="number"
            step="0.1" min="0" max="200"
            value={form.muscle_mass_kg}
            onChange={e => set('muscle_mass_kg', e.target.value)}
            placeholder="--"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">수분율 (%)</label>
          <input
            type="number"
            step="0.1" min="0" max="100"
            value={form.water_pct}
            onChange={e => set('water_pct', e.target.value)}
            placeholder="--"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">메모</label>
        <input
          type="text"
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="식후, 공복, 운동 전/후..."
          className="input-field"
        />
      </div>

      <button type="submit" disabled={loading || !form.weight_kg} className="btn-primary w-full">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            저장 중...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Save size={16} />
            체중 기록 저장
          </span>
        )}
      </button>
    </form>
  )
}
