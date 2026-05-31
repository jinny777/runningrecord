import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Upload, Loader2, FileText, Sparkles, X,
  Save, Activity, Scale, CheckCircle2,
} from 'lucide-react'
import { analyzeImageText, type ImageAnalysisResult } from '../lib/claude'
import { workoutApi, weightApi } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { fileToBase64, today } from '../utils/formatters'
import { toast } from '../utils/toast'
import type { Workout, WeightRecord } from '../types'

const DATA_TYPE_EMOJI: Record<string, string> = {
  '운동기록': '🏃',
  '체중계': '⚖️',
  '식단': '🥗',
  '검진결과': '🏥',
  '처방전': '💊',
  '기타': '📄',
}

// structuredData → Workout 변환
function toWorkout(data: Record<string, unknown>): Partial<Workout> {
  return {
    type: (data.type as Workout['type']) || 'running',
    date: (data.date as string) || today(),
    duration_seconds: data.duration_seconds as number || undefined,
    distance_km: data.distance_km as number || undefined,
    avg_pace_seconds: data.avg_pace_seconds as number || undefined,
    avg_heart_rate: data.avg_heart_rate as number || undefined,
    max_heart_rate: data.max_heart_rate as number || undefined,
    calories: data.calories as number || undefined,
    elevation_gain_m: data.elevation_gain_m as number || undefined,
    source: 'ocr',
  }
}

// structuredData → WeightRecord 변환
function toWeightRecord(data: Record<string, unknown>): Partial<WeightRecord> {
  return {
    date: (data.date as string) || today(),
    weight_kg: data.weight_kg as number,
    body_fat_pct: data.body_fat_pct as number || undefined,
    muscle_mass_kg: data.muscle_mass_kg as number || undefined,
    water_pct: data.water_pct as number || undefined,
    bmi: data.bmi as number || undefined,
    source: 'ocr',
  }
}

export default function ImageAnalysisPage() {
  const navigate = useNavigate()
  const user = useAppStore(s => s.user)
  const addWorkout = useAppStore(s => s.addWorkout)
  const addWeightRecord = useAppStore(s => s.addWeightRecord)

  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [result, setResult] = useState<ImageAnalysisResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('이미지 파일만 가능합니다.'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setSaved(false)
    setError('')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setSaved(false)
    setError('')
    try {
      const { base64, mimeType } = await fileToBase64(file)
      const res = await analyzeImageText(base64, mimeType, question || undefined)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 실패')
    } finally {
      setLoading(false)
    }
  }

  // 운동기록으로 저장
  const saveAsWorkout = async () => {
    if (!result?.structuredData || !user) return
    setSaving(true)
    try {
      const workoutData = toWorkout(result.structuredData)
      if (!workoutData.date) workoutData.date = today()
      const { data, error } = await workoutApi.create({
        ...workoutData,
        user_id: user.id,
        type: workoutData.type || 'running',
        date: workoutData.date!,
        source: 'ocr',
      } as Omit<Workout, 'id' | 'created_at'>)
      if (error) throw error
      if (data) {
        addWorkout(data)
        setSaved(true)
        toast.success('운동 기록이 저장되었습니다!')
      }
    } catch {
      toast.error('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  // 체중기록으로 저장
  const saveAsWeight = async () => {
    if (!result?.structuredData || !user) return
    const w = result.structuredData.weight_kg as number
    if (!w) { toast.error('체중 데이터를 찾을 수 없습니다.'); return }
    setSaving(true)
    try {
      const weightData = toWeightRecord(result.structuredData)
      const { data, error } = await weightApi.create({
        ...weightData,
        user_id: user.id,
        date: weightData.date!,
        weight_kg: w,
        source: 'ocr',
      } as Omit<WeightRecord, 'id' | 'created_at'>)
      if (error) throw error
      if (data) {
        addWeightRecord(data)
        setSaved(true)
        toast.success('체중 기록이 저장되었습니다!')
      }
    } catch {
      toast.error('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const isWorkoutData = result?.dataType === '운동기록'
  const isWeightData = result?.dataType === '체중계'
  const hasSaveable = isWorkoutData || isWeightData

  const reset = () => {
    setPreview(null); setFile(null); setResult(null)
    setError(''); setQuestion(''); setSaved(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white">이미지 텍스트 분석</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          이미지에서 텍스트를 추출하고 운동/체중 데이터를 대시보드에 바로 저장합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업로드 */}
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !preview && inputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all
              ${!preview ? 'cursor-pointer hover:border-orange-500/50 border-[#2A2A2A] bg-[#0F0F0F]' : 'border-[#2A2A2A]'}`}
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="preview" className="w-full max-h-80 object-contain rounded-xl p-2" />
                <button onClick={e => { e.stopPropagation(); reset() }}
                  className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-14 px-4">
                <div className="w-14 h-14 rounded-full bg-[#1E1E1E] flex items-center justify-center mb-3">
                  <Camera size={24} className="text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-300 mb-1">이미지 업로드</p>
                <p className="text-xs text-gray-600 text-center">
                  운동기록, 식단, 검진결과, 처방전 등<br />모든 이미지 가능
                </p>
              </div>
            )}
          </div>

          {preview && (
            <button onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#3A3A3A] transition-all">
              <Upload size={14} />다른 이미지 선택
            </button>
          )}

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">궁금한 점 (선택)</label>
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="예: 이 식단의 칼로리는? / 혈압 수치가 정상인가요?"
              className="input-field" />
          </div>

          <button onClick={handleAnalyze} disabled={!file || loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" />AI 분석 중...</>
              : <><Sparkles size={16} />텍스트 추출 & 분석</>}
          </button>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* 결과 */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="h-64 flex flex-col items-center justify-center text-gray-700 border border-[#1E1E1E] rounded-2xl">
              <FileText size={32} className="mb-3 text-gray-800" />
              <p className="text-sm">이미지를 업로드하면 결과가 여기 표시됩니다</p>
            </div>
          )}

          {loading && (
            <div className="h-64 flex flex-col items-center justify-center border border-orange-500/20 rounded-2xl bg-orange-500/5">
              <Loader2 size={28} className="animate-spin text-orange-400 mb-3" />
              <p className="text-sm text-orange-300">텍스트 추출 및 분석 중...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-slide-up">
              {/* 데이터 유형 + 저장 버튼 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{DATA_TYPE_EMOJI[result.dataType] ?? '📄'}</span>
                  <span className="text-sm font-medium text-orange-400">{result.dataType} 감지</span>
                </div>

                {/* 저장 버튼 */}
                {hasSaveable && !saved && (
                  <button
                    onClick={isWorkoutData ? saveAsWorkout : saveAsWeight}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm hover:bg-green-500/20 transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {isWorkoutData ? '운동기록 저장' : '체중기록 저장'}
                  </button>
                )}

                {saved && (
                  <div className="flex items-center gap-1.5 text-green-400 text-sm">
                    <CheckCircle2 size={14} />
                    저장 완료
                  </div>
                )}
              </div>

              {/* 저장 후 바로가기 */}
              {saved && (
                <div className="flex gap-2">
                  <button onClick={() => navigate('/')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white transition-all">
                    <Activity size={13} />대시보드 확인
                  </button>
                  <button onClick={() => navigate(isWorkoutData ? '/workout' : '/weight')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white transition-all">
                    {isWorkoutData ? <Activity size={13} /> : <Scale size={13} />}
                    {isWorkoutData ? '운동 기록' : '체중 기록'} 보기
                  </button>
                </div>
              )}

              {/* 추출된 텍스트 */}
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">추출된 텍스트</p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
                  {result.extractedText}
                </p>
              </div>

              {/* AI 분석 */}
              <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-orange-400" />
                  <p className="text-xs text-orange-400 uppercase tracking-widest font-medium">AI 분석</p>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{result.analysis}</p>
              </div>

              {/* 구조화 데이터 */}
              {result.structuredData && Object.keys(result.structuredData).length > 0 && (
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">추출된 수치</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.structuredData)
                      .filter(([, v]) => v !== null && v !== undefined)
                      .map(([k, v]) => (
                        <div key={k} className="bg-[#0F0F0F] rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-600">{k}</p>
                          <p className="text-sm font-bold text-white">{String(v)}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 예시 */}
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">사용 예시</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { emoji: '🏃', label: '스마트워치\n운동기록', save: '운동기록 자동 저장' },
            { emoji: '⚖️', label: '스마트\n체중계', save: '체중 자동 저장' },
            { emoji: '🥗', label: '식단\n영양정보', save: 'AI 분석' },
            { emoji: '🏥', label: '건강검진\n결과지', save: 'AI 분석' },
            { emoji: '💊', label: '처방전', save: 'AI 분석' },
            { emoji: '📋', label: '운동\n계획표', save: 'AI 분석' },
          ].map((item, i) => (
            <div key={i} className="text-center p-3 bg-[#0F0F0F] rounded-lg">
              <div className="text-2xl mb-1">{item.emoji}</div>
              <p className="text-[10px] text-gray-600 whitespace-pre-line leading-tight">{item.label}</p>
              <p className="text-[9px] text-orange-500/60 mt-1">{item.save}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
