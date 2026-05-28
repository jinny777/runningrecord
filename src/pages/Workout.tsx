import { useState } from 'react'
import { Plus, Camera, Pencil, X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { workoutApi } from '../lib/supabase'
import WorkoutForm from '../components/workout/WorkoutForm'
import WorkoutCard from '../components/workout/WorkoutCard'
import OCRUploader from '../components/common/OCRUploader'
import type { WorkoutOCRResult, Workout } from '../types'
import { toast } from '../utils/toast'

type Mode = 'list' | 'manual' | 'ocr'

export default function WorkoutPage() {
  const user = useAppStore(s => s.user)
  const workouts = useAppStore(s => s.workouts)
  const addWorkout = useAppStore(s => s.addWorkout)
  const removeWorkout = useAppStore(s => s.removeWorkout)

  const [mode, setMode] = useState<Mode>('list')
  const [ocrData, setOcrData] = useState<Partial<WorkoutOCRResult> | null>(null)
  const [loading, setLoading] = useState(false)

  const handleOCRResult = (result: unknown) => {
    const data = result as WorkoutOCRResult
    if (data.confidence && data.confidence < 0.3) {
      toast.warn('이미지를 인식하기 어렵습니다. 선명한 사진으로 다시 시도해주세요.')
    }
    setOcrData(data)
    setMode('manual')
  }

  const handleSubmit = async (formData: Omit<Workout, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await workoutApi.create({ ...formData, user_id: user.id })
      if (error) throw error
      if (data) {
        addWorkout(data)
        setMode('list')
        setOcrData(null)
        toast.success('운동 기록이 저장되었습니다!')
      }
    } catch (err) {
      toast.error('저장 실패. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await workoutApi.delete(id)
    removeWorkout(id)
    toast.success('운동 기록이 삭제되었습니다.')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">운동 기록</h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {workouts.length}개의 운동</p>
        </div>

        {mode === 'list' && (
          <div className="flex gap-2">
            <button
              onClick={() => setMode('ocr')}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Camera size={14} />
              OCR 스캔
            </button>
            <button
              onClick={() => { setOcrData(null); setMode('manual') }}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Plus size={14} />
              직접 입력
            </button>
          </div>
        )}

        {mode !== 'list' && (
          <button
            onClick={() => { setMode('list'); setOcrData(null) }}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* OCR mode */}
      {mode === 'ocr' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up">
          <h2 className="font-bold text-white mb-1">스마트워치 OCR 분석</h2>
          <p className="text-sm text-gray-500 mb-5">
            Apple Watch, Garmin, 삼성 갤럭시 워치 등 화면을 촬영하면 AI가 자동으로 운동 데이터를 추출합니다.
          </p>
          <OCRUploader type="workout" onResult={handleOCRResult} />
        </div>
      )}

      {/* Manual entry / OCR result form */}
      {mode === 'manual' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-5">
            <Pencil size={16} className="text-orange-400" />
            <h2 className="font-bold text-white">
              {ocrData ? 'OCR 추출 결과 확인' : '운동 직접 입력'}
            </h2>
            {ocrData && (
              <span className="ml-auto text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">
                AI 분석 완료
              </span>
            )}
          </div>

          {ocrData && ocrData.confidence !== undefined && (
            <div className="mb-4 p-3 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A]">
              <p className="text-xs text-gray-500 mb-1">분석 신뢰도</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#2A2A2A] rounded-full">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${Math.round(ocrData.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-orange-400 tabular-nums">
                  {Math.round(ocrData.confidence * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">데이터를 확인하고 필요시 수정 후 저장하세요.</p>
            </div>
          )}

          <WorkoutForm
            initialData={ocrData ?? undefined}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </div>
      )}

      {/* Workout list */}
      {mode === 'list' && (
        <>
          {workouts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏃</div>
              <p className="text-gray-500 mb-4">아직 운동 기록이 없어요</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setMode('ocr')} className="btn-secondary text-sm">
                  <Camera size={14} className="inline mr-1.5" />
                  OCR로 시작하기
                </button>
                <button onClick={() => setMode('manual')} className="btn-primary text-sm">
                  <Plus size={14} className="inline mr-1.5" />
                  직접 입력
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workouts.map(w => (
                <WorkoutCard key={w.id} workout={w} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
