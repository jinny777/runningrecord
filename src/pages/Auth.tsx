import { useState } from 'react'
import { auth } from '../lib/supabase'
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await auth.signInWithGoogle()
      if (error) throw error
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Google 로그인 실패',
        type: 'error',
      })
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
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

        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
          {/* Google 로그인 */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 font-medium text-sm transition-all disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google로 계속하기
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#2A2A2A]" />
            <span className="text-xs text-gray-600">또는</span>
            <div className="flex-1 h-px bg-[#2A2A2A]" />
          </div>

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
                <>{mode === 'signin' ? '로그인' : '시작하기'}<ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-700 mt-4">
          Powered by <span className="text-orange-500/60">Claude AI</span>
        </p>
      </div>
    </div>
  )
}
