import { useState } from 'react'
import { X, Mail, Lock, Loader2, CloudUpload } from 'lucide-react'
import { auth } from '../../lib/supabase'

interface Props {
  onAuthenticated: (userId: string) => void
  onGuestSave: () => void
  onClose: () => void
}

export default function SaveAuthModal({ onAuthenticated, onGuestSave, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 로그인 먼저 시도
      const { data: signInData, error: signInError } = await auth.signIn(email, password)
      if (!signInError && signInData.user) {
        onAuthenticated(signInData.user.id)
        return
      }

      // 로그인 실패 시 회원가입 시도
      const { data: signUpData, error: signUpError } = await auth.signUp(email, password)
      if (signUpError) throw signUpError
      if (signUpData.user) {
        onAuthenticated(signUpData.user.id)
        return
      }

      setError('인증에 실패했습니다. 다시 시도해주세요.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.'
      if (msg.includes('Failed to fetch') || msg.includes('fetch')) {
        setError('서버에 연결할 수 없습니다. Supabase 대시보드 → Authentication → URL Configuration에서 Site URL을 https://runningrecord.onrender.com 으로 설정해주세요.')
      } else if (msg.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 틀렸습니다.')
      } else if (msg.includes('already registered')) {
        setError('이미 가입된 이메일입니다. 비밀번호를 확인해주세요.')
      } else if (msg.includes('Password should be')) {
        setError('비밀번호는 6자 이상이어야 합니다.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-5">
          <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mb-3">
            <CloudUpload size={20} className="text-orange-400" />
          </div>
          <h2 className="text-lg font-bold text-white">클라우드에 저장하기</h2>
          <p className="text-sm text-gray-500 mt-1">
            이메일과 비밀번호를 입력하면 다른 기기에서도 데이터를 볼 수 있어요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일"
              required
              className="input-field pl-9"
            />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              minLength={6}
              required
              className="input-field pl-9"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" />저장 중...</>
            ) : (
              '저장하기'
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#2A2A2A]" />
          <span className="text-xs text-gray-600">또는</span>
          <div className="flex-1 h-px bg-[#2A2A2A]" />
        </div>

        <button
          onClick={onGuestSave}
          className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          이 기기에만 저장 (게스트)
        </button>
      </div>
    </div>
  )
}
