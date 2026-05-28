import { useState, useRef, useEffect } from 'react'
import { Send, RefreshCw, Zap, User, Bot } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { askHealthCoach } from '../lib/claude'
import { QUICK_QUESTIONS } from '../services/claude-prompts'
import type { CoachMessage } from '../types'
import { today } from '../utils/formatters'

export default function CoachPage() {
  const profile = useAppStore(s => s.profile)
  const workouts = useAppStore(s => s.workouts)
  const weightRecords = useAppStore(s => s.weightRecords)
  const goals = useAppStore(s => s.goals)
  const coachMessages = useAppStore(s => s.coachMessages)
  const addCoachMessage = useAppStore(s => s.addCoachMessage)
  const clearCoachMessages = useAppStore(s => s.clearCoachMessages)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [coachMessages, loading])

  const buildContext = () => ({
    recentWorkouts: workouts.slice(0, 15),
    weightRecords: weightRecords.slice(0, 14),
    goals: goals.filter(g => g.status === 'active'),
    profile: {
      full_name: profile?.full_name,
      height_cm: profile?.height_cm,
      gender: profile?.gender,
      birth_date: profile?.birth_date,
    },
    today: today(),
  })

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: CoachMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    addCoachMessage(userMsg)
    setInput('')
    setLoading(true)

    try {
      const allMessages = [...coachMessages, userMsg]
      const reply = await askHealthCoach(allMessages, buildContext())

      addCoachMessage({
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      addCoachMessage({
        role: 'assistant',
        content: 'AI 코치에 연결할 수 없습니다. API 설정을 확인해주세요.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-white">AI 헬스 코치</h1>
          <p className="text-sm text-gray-500 mt-0.5">당신의 데이터를 기반으로 개인화된 코칭</p>
        </div>
        <button
          onClick={clearCoachMessages}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-white transition-colors py-1.5 px-2.5 rounded-lg hover:bg-white/5"
        >
          <RefreshCw size={12} />
          대화 초기화
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-thin">
        {coachMessages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-orange-400" />
            </div>
            <h3 className="font-bold text-white mb-2">FitAI 헬스 코치</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              러닝, 체중, 체성분에 관한 질문을 해보세요.<br />
              당신의 실제 데이터를 기반으로 답변합니다.
            </p>

            {/* Quick questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {QUICK_QUESTIONS.slice(0, 6).map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-2.5 rounded-xl bg-[#141414] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-orange-500/30 hover:bg-orange-500/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {coachMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up`}
          >
            {/* Avatar */}
            <div className={`
              w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center
              ${msg.role === 'user'
                ? 'bg-[#2A2A2A]'
                : 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 border border-orange-500/20'}
            `}>
              {msg.role === 'user'
                ? <User size={14} className="text-gray-400" />
                : <Zap size={14} className="text-orange-400" />
              }
            </div>

            {/* Bubble */}
            <div className={`
              max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-orange-500/10 border border-orange-500/20 text-white rounded-tr-sm'
                : 'bg-[#141414] border border-[#2A2A2A] text-gray-200 rounded-tl-sm'}
            `}>
              <p className="whitespace-pre-line">{msg.content}</p>
              <p className="text-[10px] text-gray-600 mt-1.5 text-right">
                {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex-shrink-0 bg-gradient-to-br from-orange-500/30 to-orange-600/20 border border-orange-500/20 flex items-center justify-center">
              <Zap size={14} className="text-orange-400" />
            </div>
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick questions (when messages exist) */}
      {coachMessages.length > 0 && !loading && (
        <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0 scrollbar-none">
          {QUICK_QUESTIONS.slice(0, 4).map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-gray-500 hover:text-white hover:border-[#3A3A3A] transition-all whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 items-end flex-shrink-0 mt-3">
        <div className="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-xl focus-within:border-orange-500/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="코치에게 질문하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
            rows={1}
            disabled={loading}
            className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none max-h-32"
            style={{ minHeight: '46px' }}
          />
        </div>
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  )
}
