import { useState } from 'react'
import { auth } from '../lib/supabase'
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signup') {
        const { error } = await auth.signUp(email, password)
        if (error) throw error
        setMessage({ text: '가입 완료! 이메일을 확인해 인증 링크를 클릭하세요.', type: 'success' })
      } else {
        const { error } = await auth.signIn(email, password)
        if (error) throw error
        // App.tsx의 onAuthChange가 리다이렉트 처리
      }
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : '오류가 발생했습니다.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
            <Zap size={24} className="text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-black text-white">FitAI</h1>
          <p className="text-sm text-gray-500 mt-1">AI 러닝 & 체중 관리 코치</p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex bg-[#0F0F0F] rounded-xl p-1">
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setMessage(null) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                {m === 'signin' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
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
            </div>

            <div>
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
            </div>

            {message && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                message.type === 'error'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}>
                {message.text}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? '로그인' : '시작하기'}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-700 mt-4">
          By Nike Run Club 스타일 UI ·{' '}
          <span className="text-orange-500/60">Powered by Claude AI</span>
        </p>
      </div>
    </div>
  )
}
