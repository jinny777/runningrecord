import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2, FileText, Sparkles, X } from 'lucide-react'
import { analyzeImageText, type ImageAnalysisResult } from '../lib/claude'
import { fileToBase64 } from '../utils/formatters'

const DATA_TYPE_EMOJI: Record<string, string> = {
  '운동기록': '🏃',
  '체중계': '⚖️',
  '식단': '🥗',
  '검진결과': '🏥',
  '처방전': '💊',
  '기타': '📄',
}

export default function ImageAnalysisPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImageAnalysisResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
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
    setError('')
    try {
      const { base64, mimeType } = await fileToBase64(file)
      const res = await analyzeImageText(base64, mimeType, question || undefined)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 실패. API 키를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setPreview(null)
    setFile(null)
    setResult(null)
    setError('')
    setQuestion('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white">이미지 텍스트 분석</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          어떤 이미지든 텍스트를 추출하고 AI가 건강 관점으로 분석합니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업로드 영역 */}
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !preview && inputRef.current?.click()}
            className={`
              relative rounded-2xl border-2 border-dashed transition-all
              ${!preview ? 'cursor-pointer hover:border-orange-500/50 border-[#2A2A2A] bg-[#0F0F0F]' : 'border-[#2A2A2A]'}
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {preview ? (
              <div className="relative">
                <img src={preview} alt="preview" className="w-full max-h-80 object-contain rounded-xl p-2" />
                <button
                  onClick={e => { e.stopPropagation(); reset() }}
                  className="absolute top-3 right-3 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80"
                >
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
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#3A3A3A] transition-all"
            >
              <Upload size={14} />
              다른 이미지 선택
            </button>
          )}

          {/* 질문 입력 */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
              궁금한 점 (선택)
            </label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="예: 이 식단의 칼로리는? / 혈압 수치가 정상인가요?"
              className="input-field"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> AI 분석 중...</>
            ) : (
              <><Sparkles size={16} /> 텍스트 추출 & 분석</>
            )}
          </button>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* 결과 영역 */}
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
              {/* 데이터 유형 */}
              <div className="flex items-center gap-2">
                <span className="text-xl">{DATA_TYPE_EMOJI[result.dataType] ?? '📄'}</span>
                <span className="text-sm font-medium text-orange-400">{result.dataType} 감지</span>
              </div>

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
                <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                  {result.analysis}
                </p>
              </div>

              {/* 구조화된 데이터 */}
              {result.structuredData && Object.keys(result.structuredData).length > 0 && (
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">추출된 수치</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.structuredData).map(([k, v]) => (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { emoji: '🏃', label: '스마트워치\n운동기록' },
            { emoji: '⚖️', label: '스마트\n체중계' },
            { emoji: '🥗', label: '식단\n영양정보' },
            { emoji: '🏥', label: '건강검진\n결과지' },
            { emoji: '💊', label: '처방전' },
            { emoji: '📋', label: '운동\n계획표' },
          ].map((item, i) => (
            <div key={i} className="text-center p-3 bg-[#0F0F0F] rounded-lg">
              <div className="text-2xl mb-1">{item.emoji}</div>
              <p className="text-[10px] text-gray-600 whitespace-pre-line leading-tight">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
