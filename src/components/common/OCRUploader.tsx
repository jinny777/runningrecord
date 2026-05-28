import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { fileToBase64 } from '../../utils/formatters'

interface OCRUploaderProps {
  type: 'workout' | 'weight'
  onResult: (result: unknown) => void
  onError?: (err: string) => void
}

type Status = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'

export default function OCRUploader({ type, onResult, onError }: OCRUploaderProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const label = type === 'workout' ? '스마트워치 화면' : '체중계 화면'

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일만 업로드 가능합니다.')
      setStatus('error')
      return
    }

    // Preview
    const url = URL.createObjectURL(file)
    setPreview(url)
    setStatus('uploading')

    try {
      const { base64, mimeType } = await fileToBase64(file)
      setStatus('analyzing')

      // Dynamically import to avoid top-level circular deps
      const { analyzeWorkoutImage, analyzeWeightImage } = await import('../../lib/claude')
      const result = type === 'workout'
        ? await analyzeWorkoutImage(base64, mimeType)
        : await analyzeWeightImage(base64, mimeType)

      setStatus('done')
      onResult(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR 분석 실패'
      setErrorMsg(msg)
      setStatus('error')
      onError?.(msg)
    }
  }, [type, onResult, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const reset = () => {
    setStatus('idle')
    setPreview(null)
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`
          relative rounded-xl border-2 border-dashed transition-all cursor-pointer
          ${status === 'idle' ? 'border-[#2A2A2A] hover:border-orange-500/50 bg-[#0F0F0F]' : ''}
          ${status === 'uploading' || status === 'analyzing' ? 'border-orange-500/50 bg-orange-500/5' : ''}
          ${status === 'done' ? 'border-green-500/50 bg-green-500/5' : ''}
          ${status === 'error' ? 'border-red-500/50 bg-red-500/5' : ''}
        `}
        onClick={() => status === 'idle' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="OCR preview"
              className="w-full h-48 object-contain rounded-lg p-2"
            />
            {status !== 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60">
                {(status === 'uploading' || status === 'analyzing') && (
                  <div className="text-center">
                    <Loader2 size={28} className="animate-spin text-orange-400 mx-auto mb-2" />
                    <p className="text-sm text-orange-300">
                      {status === 'uploading' ? '이미지 처리 중...' : 'AI 분석 중...'}
                    </p>
                  </div>
                )}
                {status === 'done' && (
                  <div className="text-center">
                    <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-green-300">분석 완료!</p>
                  </div>
                )}
                {status === 'error' && (
                  <div className="text-center px-4">
                    <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
                    <p className="text-sm text-red-300">{errorMsg}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 px-4">
            <div className="w-12 h-12 rounded-full bg-[#1E1E1E] flex items-center justify-center mb-3">
              <Camera size={22} className="text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-300 mb-1">
              {label} 이미지 업로드
            </p>
            <p className="text-xs text-gray-600 text-center">
              드래그 앤 드롭 또는 클릭 · AI가 자동으로 데이터를 추출합니다
            </p>
          </div>
        )}
      </div>

      {(status === 'done' || status === 'error') && (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
        >
          <X size={12} />
          다시 업로드
        </button>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#3A3A3A] transition-all"
      >
        <Upload size={14} />
        갤러리에서 선택
      </button>
    </div>
  )
}
