import { useState } from 'react'
import { Plus, Camera, X, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { weightApi } from '../lib/supabase'
import WeightForm from '../components/weight/WeightForm'
import WeightChart from '../components/weight/WeightChart'
import OCRUploader from '../components/common/OCRUploader'
import MetricCard from '../components/common/MetricCard'
import type { WeightRecord, WeightOCRResult } from '../types'
import { formatDate, getBMILabel } from '../utils/formatters'
import { calcWeightTrend } from '../services/analysis'
import { toast } from '../utils/toast'

type Mode = 'list' | 'manual' | 'ocr'

export default function WeightPage() {
  const user = useAppStore(s => s.user)
  const profile = useAppStore(s => s.profile)
  const weightRecords = useAppStore(s => s.weightRecords)
  const addWeightRecord = useAppStore(s => s.addWeightRecord)
  const removeWeightRecord = useAppStore(s => s.removeWeightRecord)

  const [mode, setMode] = useState<Mode>('list')
  const [ocrData, setOcrData] = useState<Partial<WeightOCRResult> | null>(null)
  const [loading, setLoading] = useState(false)

  const latest = weightRecords[0]
  const trend = calcWeightTrend(weightRecords.slice(0, 30))

  const handleOCRResult = (result: unknown) => {
    setOcrData(result as WeightOCRResult)
    setMode('manual')
  }

  const handleSubmit = async (formData: Omit<WeightRecord, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await weightApi.create({ ...formData, user_id: user.id })
      if (error) throw error
      if (data) {
        addWeightRecord(data)
        setMode('list')
        setOcrData(null)
        toast.success('체중이 기록되었습니다!')
      }
    } catch {
      toast.error('저장 실패. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await weightApi.delete(id)
    removeWeightRecord(id)
    toast.success('삭제되었습니다.')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">체중 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">{weightRecords.length}개의 기록</p>
        </div>
        {mode === 'list' && (
          <div className="flex gap-2">
            <button onClick={() => setMode('ocr')} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Camera size={14} />
              체중계 스캔
            </button>
            <button onClick={() => { setOcrData(null); setMode('manual') }} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus size={14} />
              기록하기
            </button>
          </div>
        )}
        {mode !== 'list' && (
          <button onClick={() => { setMode('list'); setOcrData(null) }} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5">
            <X size={18} />
          </button>
        )}
      </div>

      {/* OCR */}
      {mode === 'ocr' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up">
          <h2 className="font-bold text-white mb-1">체중계 OCR 분석</h2>
          <p className="text-sm text-gray-500 mb-5">
            스마트 체중계(이노바, Xiaomi Mi Scale, Withings 등) 화면을 촬영하면 체성분 데이터를 자동 추출합니다.
          </p>
          <OCRUploader type="weight" onResult={handleOCRResult} />
        </div>
      )}

      {/* Form */}
      {mode === 'manual' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up">
          <h2 className="font-bold text-white mb-5">
            {ocrData ? 'OCR 데이터 확인' : '체중 기록'}
          </h2>
          <WeightForm
            initialData={ocrData ?? undefined}
            heightCm={profile?.height_cm}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>
      )}

      {/* List */}
      {mode === 'list' && (
        <>
          {/* Summary metrics */}
          {latest && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="현재 체중"
                value={latest.weight_kg.toFixed(1)}
                unit="kg"
                accent
                delta={trend?.change7d != null ? {
                  value: `${Math.abs(trend.change7d).toFixed(1)}kg`,
                  positive: trend.change7d < 0,
                } : undefined}
              />
              {latest.body_fat_pct && (
                <MetricCard label="체지방률" value={latest.body_fat_pct.toFixed(1)} unit="%" />
              )}
              {latest.muscle_mass_kg && (
                <MetricCard label="근육량" value={latest.muscle_mass_kg.toFixed(1)} unit="kg" />
              )}
              {latest.bmi && (
                <MetricCard
                  label="BMI"
                  value={latest.bmi.toFixed(1)}
                  delta={{ value: getBMILabel(latest.bmi).label, positive: latest.bmi < 23 }}
                />
              )}
            </div>
          )}

          {/* Chart */}
          {weightRecords.length > 1 && (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="font-bold text-white mb-4">체중 변화 그래프</h3>
              <WeightChart records={weightRecords.slice(0, 60)} />
            </div>
          )}

          {/* Trend summary */}
          {trend && (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
              <h3 className="font-bold text-white mb-3">트렌드 분석</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className={`text-xl font-black tabular-nums ${
                    (trend.change7d ?? 0) < 0 ? 'text-green-400' : (trend.change7d ?? 0) > 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {trend.change7d != null ? `${trend.change7d > 0 ? '+' : ''}${trend.change7d.toFixed(1)}` : '--'} kg
                  </p>
                  <p className="text-xs text-gray-500 mt-1">7일 변화</p>
                </div>
                <div>
                  <p className={`text-xl font-black tabular-nums ${
                    (trend.change30d ?? 0) < 0 ? 'text-green-400' : (trend.change30d ?? 0) > 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {trend.change30d != null ? `${trend.change30d > 0 ? '+' : ''}${trend.change30d.toFixed(1)}` : '--'} kg
                  </p>
                  <p className="text-xs text-gray-500 mt-1">30일 변화</p>
                </div>
                <div>
                  <p className="text-xl font-black tabular-nums text-white">{trend.avgWeight.toFixed(1)} kg</p>
                  <p className="text-xs text-gray-500 mt-1">평균 체중</p>
                </div>
              </div>
            </div>
          )}

          {/* Records list */}
          {weightRecords.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">⚖️</div>
              <p className="text-gray-500 mb-4">아직 체중 기록이 없어요</p>
              <button onClick={() => setMode('manual')} className="btn-primary text-sm">
                첫 체중 기록하기
              </button>
            </div>
          ) : (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#2A2A2A]">
                <h3 className="font-bold text-white">기록 내역</h3>
              </div>
              <div className="divide-y divide-[#1E1E1E]">
                {weightRecords.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/2 group transition-colors">
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-gray-500 w-20">{formatDate(r.date)}</p>
                      <p className="text-lg font-black tabular-nums text-white">{r.weight_kg.toFixed(1)} <span className="text-sm font-normal text-gray-500">kg</span></p>
                      {r.body_fat_pct && <p className="text-sm text-blue-400">체지방 {r.body_fat_pct.toFixed(1)}%</p>}
                      {r.muscle_mass_kg && <p className="text-sm text-green-400">근육 {r.muscle_mass_kg.toFixed(1)}kg</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
