import { useState } from 'react'
import { Plus, X, Target, CheckCircle2, Trash2 } from 'lucide-react'
import { useAppStore, selectActiveGoals } from '../store/useAppStore'
import { goalApi } from '../lib/supabase'
import type { Goal, GoalType } from '../types'
import { calcProgress, getProgressColor, formatDate, daysUntil } from '../utils/formatters'
import { toast } from '../utils/toast'

const GOAL_TEMPLATES: { type: GoalType; title: string; unit: string; placeholder: string; emoji: string }[] = [
  { type: 'target_weight', title: '목표 체중', unit: 'kg', placeholder: '65', emoji: '⚖️' },
  { type: 'weekly_distance', title: '주간 거리', unit: 'km', placeholder: '30', emoji: '📍' },
  { type: 'monthly_runs', title: '월간 러닝 횟수', unit: '회', placeholder: '12', emoji: '🏃' },
  { type: 'pace', title: '목표 페이스', unit: '초/km', placeholder: '300', emoji: '⚡' },
  { type: 'body_fat', title: '목표 체지방률', unit: '%', placeholder: '18', emoji: '💪' },
]

export default function GoalsPage() {
  const user = useAppStore(s => s.user)
  const goals = useAppStore(s => s.goals)
  const addGoal = useAppStore(s => s.addGoal)
  const updateGoal = useAppStore(s => s.updateGoal)
  const removeGoal = useAppStore(s => s.removeGoal)

  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'target_weight' as GoalType,
    target_value: '',
    deadline: '',
  })

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  const selectedTemplate = GOAL_TEMPLATES.find(t => t.type === form.type)!

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.target_value) return
    setLoading(true)
    try {
      const { data, error } = await goalApi.create({
        user_id: user.id,
        type: form.type,
        title: selectedTemplate.title,
        target_value: +form.target_value,
        current_value: 0,
        unit: selectedTemplate.unit,
        deadline: form.deadline || undefined,
        status: 'active',
      })
      if (error) throw error
      if (data) {
        addGoal(data)
        setShowForm(false)
        setForm({ type: 'target_weight', target_value: '', deadline: '' })
        toast.success('목표가 설정되었습니다!')
      }
    } catch {
      toast.error('목표 저장 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await goalApi.delete(id)
    removeGoal(id)
  }

  const handleComplete = async (goal: Goal) => {
    await goalApi.update(goal.id, { status: 'completed' })
    updateGoal(goal.id, { status: 'completed' })
    toast.success('목표 달성! 🎉')
  }

  const getGoalProgress = (goal: Goal) => {
    if (goal.type === 'target_weight' || goal.type === 'body_fat' || goal.type === 'pace') {
      // 낮을수록 좋은 목표
      if (goal.current_value <= 0) return 0
      const initial = goal.target_value * 1.15 // 기준점 추정
      return calcProgress(initial - goal.current_value, initial - goal.target_value)
    }
    return calcProgress(goal.current_value, goal.target_value)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">목표 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeGoals.length}개 진행 중</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? '취소' : '목표 추가'}
        </button>
      </div>

      {/* Goal form */}
      {showForm && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 animate-slide-up">
          <h2 className="font-bold text-white mb-5">새 목표 설정</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Type picker */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">목표 유형</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GOAL_TEMPLATES.map(t => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.type }))}
                    className={`
                      px-3 py-2.5 rounded-lg text-sm border transition-all text-left
                      ${form.type === t.type
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'}
                    `}
                  >
                    <span className="mr-1.5">{t.emoji}</span>{t.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                  목표값 ({selectedTemplate.unit})
                </label>
                <input
                  type="number"
                  value={form.target_value}
                  onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                  placeholder={selectedTemplate.placeholder}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">목표 기한</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '저장 중...' : '목표 설정하기'}
            </button>
          </form>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length === 0 && !showForm ? (
        <div className="text-center py-20">
          <Target size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">설정된 목표가 없어요</p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            첫 목표 설정하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map(goal => {
            const progress = getGoalProgress(goal)
            const days = goal.deadline ? daysUntil(goal.deadline) : null

            return (
              <div key={goal.id} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 group hover:border-[#3A3A3A] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {GOAL_TEMPLATES.find(t => t.type === goal.type)?.emoji ?? '🎯'}
                      </span>
                      <p className="font-bold text-white">{goal.title}</p>
                    </div>
                    {days !== null && (
                      <p className={`text-xs mt-0.5 ${days < 7 ? 'text-red-400' : days < 30 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {days > 0 ? `D-${days} (${formatDate(goal.deadline!)})` : days === 0 ? '오늘 마감' : '기한 초과'}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleComplete(goal)}
                      className="p-1.5 text-gray-600 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                      title="목표 달성 처리"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                      style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-gray-400 w-10 text-right">{progress}%</span>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>현재: <span className="text-white font-semibold">{goal.current_value} {goal.unit}</span></span>
                  <span>목표: <span className="text-orange-400 font-semibold">{goal.target_value} {goal.unit}</span></span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" />
            달성한 목표
          </h3>
          <div className="space-y-2">
            {completedGoals.map(goal => (
              <div key={goal.id} className="flex items-center justify-between bg-green-500/5 border border-green-500/15 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">{goal.title}</p>
                    <p className="text-xs text-gray-600">목표: {goal.target_value} {goal.unit}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(goal.id)} className="text-gray-700 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
