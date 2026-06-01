import { useState, useRef, useCallback } from 'react'
import { Plus, Camera, Pencil, X, ScanText, Upload, Loader2, Sparkles, Save, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { workoutApi } from '../lib/supabase'
import WorkoutForm from '../components/workout/WorkoutForm'
import WorkoutCard from '../components/workout/WorkoutCard'
import OCRUploader from '../components/common/OCRUploader'
import type { WorkoutOCRResult, Workout } from '../types'
import { analyzeImageText } from '../lib/claude'
import { fileToBase64, today } from '../utils/formatters'
import { toast } from '../utils/toast'

type Mode = 'list' | 'manual' | 'ocr' | 'image'

const VALID_WORKOUT_TYPES = ['running', 'walking', 'cycling', 'swimming', 'other'] as const

export default function WorkoutPage() {
  const user = useAppStore(s => s.user)
  const workouts = useAppStore(s => s.workouts)
  const addWorkout = useAppStore(s => s.addWorkout)
  const removeWorkout = useAppStore(s => s.removeWorkout)

  const [mode, setMode] = useState<Mode>('list')
  const [ocrData, setOcrData] = useState<Partial<WorkoutOCRResult> | null>(null)
  const [loading, setLoading] = useState(false)

  // 이미지 분석 상태
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [imgLoading, setImgLoading] = useState(false)
  const [imgResult, setImgResult] = useState<Partial<WorkoutOCRResult> | null>(null)
  const [imgSaved, setImgSaved] = useState(false)
  const [imgError, setImgError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOCRResult = (result: unknown) => {
    setOcrData(result as WorkoutOCRResult)
    setMode('manual')
  }

  // 이미지 분석 → 운동기록 추출
  const handleImageFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return
    setImgFile(f)
    setImgPreview(URL.createObjectURL(f))
    setImgResult(null)
    setImgSaved(false)
    setImgError('')
  }, [])

  const handleImageAnalyze = async () => {
    if (!imgFile) return
    setImgLoading(true)
    setImgError('')
    try {
      const { base64, mimeType } = await fileToBase64(imgFile)
      const res = await analyzeImageText(base64, mimeType, '운동 데이터를 추출해주세요')
      // structuredData를 WorkoutOCRResult로 변환
      const sd = res.structuredData ?? {}
      const rawType = String(sd.type ?? 'running').toLowerCase()
      const validType = VALID_WORKOUT_TYPES.includes(rawType as typeof VALID_WORKOUT_TYPES[number])
        ? (rawType as Workout['type'])
        : 'running'
      setImgResult({
        type: validType,
        date: sd.date as string || undefined,
        duration_seconds: Number(sd.duration_seconds) || undefined,
        distance_km: Number(sd.distance_km) || undefined,
        avg_pace_seconds: Number(sd.avg_pace_seconds) || undefined,
        avg_heart_rate: Number(sd.avg_heart_rate) || undefined,
        max_heart_rate: Number(sd.max_heart_rate) || undefined,
        calories: Number(sd.calories) || undefined,
        elevation_gain_m: Number(sd.elevation_gain_m) || undefined,
        confidence: Number(sd.confidence) || 0.7,
        raw_text: res.extractedText,
      })
      toast.info('운동 데이터 추출 완료! 확인 후 저장하세요.')
    } catch (err) {
      setImgError(err instanceof Error ? err.message : '분석 실패')
    } finally {
      setImgLoading(false)
    }
  }

  const handleImageSave = async () => {
    if (!imgResult) return
    setLoading(true)
    try {
      const rawType = String(imgResult.type ?? 'running').toLowerCase()
      const validType = VALID_WORKOUT_TYPES.includes(rawType as typeof VALID_WORKOUT_TYPES[number])
        ? (rawType as Workout['type'])
        : 'running'

      const workoutData = {
        type: validType,
        date: imgResult.date || today(),
        source: 'ocr' as const,
        duration_seconds: imgResult.duration_seconds || undefined,
        distance_km: imgResult.distance_km || undefined,
        avg_pace_seconds: imgResult.avg_pace_seconds || undefined,
        avg_heart_rate: imgResult.avg_heart_rate || undefined,
        max_heart_rate: imgResult.max_heart_rate || undefined,
        calories: imgResult.calories || undefined,
        elevation_gain_m: imgResult.elevation_gain_m || undefined,
        raw_ocr_data: imgResult as Record<string, unknown>,
      }

      if (user) {
        const { data, error } = await workoutApi.create({ ...workoutData, user_id: user.id })
        if (error) throw new Error(error.message)
        if (data) addWorkout(data)
      } else {
        addWorkout({
          ...workoutData,
          id: crypto.randomUUID(),
          user_id: 'guest',
          created_at: new Date().toISOString(),
        })
        toast.info('게스트 모드: 이 기기에만 저장됩니다.')
      }
      setImgSaved(true)
      toast.success('운동 기록이 저장되었습니다!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (formData: Omit<Workout, 'id' | 'created_at' | 'user_id'>) => {
    setLoading(true)
    try {
      if (user) {
        // 로그인 상태: Supabase 저장
        const { data, error } = await workoutApi.create({ ...formData, user_id: user.id })
        if (error) throw new Error(error.message)
        if (data) addWorkout(data)
      } else {
        // 게스트 모드: 로컬만 저장
        addWorkout({
          ...formData,
          id: crypto.randomUUID(),
          user_id: 'guest',
          created_at: new Date().toISOString(),
        })
        toast.info('게스트 모드: 이 기기에만 저장됩니다. 로그인하면 클라우드에 저장됩니다.')
      }
      setMode('list')
      setOcrData(null)
      toast.success('운동 기록이 저장되었습니다!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await workoutApi.delete(id)
    removeWorkout(id)
    toast.success('삭제되었습니다.')
  }

  const resetImage = () => {
    setImgPreview(null); setImgFile(null)
    setImgResult(null); setImgSaved(false); setImgError('')
    if (inputRef.current) inputRef.current.value = ''
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
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setMode('image')} className="btn-secondary flex items-center gap-1.5 text-sm">
              <ScanText size={14} />이미지 분석
            </button>
            <button onClick={() => setMode('ocr')} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Camera size={14} />OCR 스캔
            </button>
            <button onClick={() => { setOcrData(null); setMode('manual') }} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus size={14} />직접 입력
            </button>
          </div>
        )}
        {mode !== 'list' && (
          <button onClick={() => { setMode('list'); setOcrData(null); resetImage() }}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
            <X size={18} />
          </button>
        )}
      </div>

      {/* 이미지 분석 모드 */}
      {mode === 'image' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up space-y-4">
          <div>
            <h2 className="font-bold text-white mb-1">이미지에서 운동 데이터 추출</h2>
            <p className="text-sm text-gray-500">스마트워치, 런닝앱 스크린샷 등 어떤 이미지든 가능합니다</p>
          </div>

          {/* 이미지 업로드 */}
          <div
            onClick={() => !imgPreview && inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f) }}
            onDragOver={e => e.preventDefault()}
            className={`relative rounded-xl border-2 border-dashed transition-all
              ${!imgPreview ? 'cursor-pointer hover:border-orange-500/50 border-[#2A2A2A] bg-[#0F0F0F]' : 'border-[#2A2A2A]'}`}
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
            {imgPreview ? (
              <div className="relative">
                <img src={imgPreview} alt="preview" className="w-full max-h-60 object-contain rounded-lg p-2" />
                <button onClick={e => { e.stopPropagation(); resetImage() }}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg text-white">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-10">
                <Camera size={24} className="text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">이미지 업로드 또는 드래그</p>
              </div>
            )}
          </div>

          {imgPreview && !imgResult && (
            <button onClick={handleImageAnalyze} disabled={imgLoading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {imgLoading ? <><Loader2 size={15} className="animate-spin" />분석 중...</>
                : <><Sparkles size={15} />운동 데이터 추출</>}
            </button>
          )}

          {imgError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{imgError}</p>}

          {/* 추출 결과 */}
          {imgResult && !imgSaved && (
            <div className="space-y-3 animate-slide-up">
              <p className="text-xs text-orange-400 font-medium">추출된 데이터 확인 후 저장하세요</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: '타입', value: imgResult.type },
                  { label: '날짜', value: imgResult.date },
                  { label: '거리', value: imgResult.distance_km ? `${imgResult.distance_km}km` : null },
                  { label: '시간', value: imgResult.duration_seconds ? `${Math.floor(imgResult.duration_seconds/60)}분` : null },
                  { label: '페이스', value: imgResult.avg_pace_seconds ? `${Math.floor(imgResult.avg_pace_seconds/60)}:${String(imgResult.avg_pace_seconds%60).padStart(2,'0')}/km` : null },
                  { label: '심박수', value: imgResult.avg_heart_rate ? `${imgResult.avg_heart_rate}bpm` : null },
                  { label: '칼로리', value: imgResult.calories ? `${imgResult.calories}kcal` : null },
                  { label: '신뢰도', value: imgResult.confidence ? `${Math.round(imgResult.confidence * 100)}%` : null },
                ].filter(d => d.value).map(d => (
                  <div key={d.label} className="bg-[#0F0F0F] rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-600">{d.label}</p>
                    <p className="text-sm font-bold text-white">{d.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleImageSave} disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={14} className="animate-spin" />저장 중...</>
                    : <><Save size={14} />운동 기록으로 저장</>}
                </button>
                <button onClick={() => { setOcrData(imgResult); setMode('manual') }}
                  className="btn-secondary text-sm px-3">
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          )}

          {imgSaved && (
            <div className="flex items-center gap-2 text-green-400 text-sm py-2">
              <CheckCircle2 size={16} />
              저장 완료! 아래 목록에 추가되었습니다.
            </div>
          )}
        </div>
      )}

      {/* OCR 모드 */}
      {mode === 'ocr' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up">
          <h2 className="font-bold text-white mb-1">스마트워치 OCR 분석</h2>
          <p className="text-sm text-gray-500 mb-5">Apple Watch, Garmin 등 화면을 촬영하면 데이터를 자동 추출합니다.</p>
          <OCRUploader type="workout" onResult={handleOCRResult} />
        </div>
      )}

      {/* 수동 입력 / OCR 결과 폼 */}
      {mode === 'manual' && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-5">
            <Pencil size={16} className="text-orange-400" />
            <h2 className="font-bold text-white">
              {ocrData ? 'OCR 결과 확인' : '운동 직접 입력'}
            </h2>
            {ocrData && (
              <span className="ml-auto text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">
                AI 분석 완료
              </span>
            )}
          </div>
          <WorkoutForm initialData={ocrData ?? undefined} onSubmit={handleSubmit} loading={loading} />
        </div>
      )}

      {/* 목록 */}
      {mode === 'list' && (
        workouts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏃</div>
            <p className="text-gray-500 mb-4">아직 운동 기록이 없어요</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => setMode('image')} className="btn-secondary text-sm">
                <ScanText size={14} className="inline mr-1.5" />이미지 분석
              </button>
              <button onClick={() => setMode('ocr')} className="btn-secondary text-sm">
                <Camera size={14} className="inline mr-1.5" />OCR 스캔
              </button>
              <button onClick={() => setMode('manual')} className="btn-primary text-sm">
                <Plus size={14} className="inline mr-1.5" />직접 입력
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workouts.map(w => (
              <WorkoutCard key={w.id} workout={w} onDelete={handleDelete} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
