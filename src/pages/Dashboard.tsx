import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Scale, TrendingUp, Flame, Plus, ArrowRight, Target } from 'lucide-react'
import { useAppStore, selectThisWeekWorkouts, selectLatestWeight, selectActiveGoals } from '../store/useAppStore'
import { workoutApi, weightApi, goalApi } from '../lib/supabase'
import MetricCard from '../components/common/MetricCard'
import WorkoutCard from '../components/workout/WorkoutCard'
import {
  formatPace, formatDistance, formatWeight, calcProgress, getProgressColor,
} from '../utils/formatters'
import { calcWorkoutStats, calcWeightTrend } from '../services/analysis'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export default function Dashboard() {
  const user = useAppStore(s => s.user)
  const profile = useAppStore(s => s.profile)
  const workouts = useAppStore(s => s.workouts)
  const weightRecords = useAppStore(s => s.weightRecords)
  const setWorkouts = useAppStore(s => s.setWorkouts)
  const setWeightRecords = useAppStore(s => s.setWeightRecords)
  const setGoals = useAppStore(s => s.setGoals)

  const thisWeek = useAppStore(selectThisWeekWorkouts)
  const latestWeight = useAppStore(selectLatestWeight)
  const activeGoals = useAppStore(selectActiveGoals)

  useEffect(() => {
    if (!user) return
    workoutApi.list(user.id).then(r => { if (r.data) setWorkouts(r.data) })
    weightApi.list(user.id).then(r => { if (r.data) setWeightRecords(r.data) })
    goalApi.list(user.id).then(r => { if (r.data) setGoals(r.data) })
  }, [user])

  const weekStats = calcWorkoutStats(thisWeek)
  const weightTrend = calcWeightTrend(weightRecords.slice(0, 30))

  // Mini chart data: last 7 days weights
  const chartData = [...weightRecords]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(r => ({
      date: format(parseISO(r.date), 'M/d'),
      weight: r.weight_kg,
    }))

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return '좋은 아침이에요'
    if (h < 18) return '좋은 오후예요'
    return '좋은 저녁이에요'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{greeting()},</p>
          <h1 className="text-2xl font-black text-white mt-0.5">
            {profile?.full_name ?? '러너'} 님 👋
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/workout" className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5">
            <Plus size={14} />
            운동
          </Link>
          <Link to="/weight" className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5">
            <Plus size={14} />
            체중
          </Link>
        </div>
      </div>

      {/* This week banner */}
      <div className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-5">
        <p className="text-xs text-orange-400 uppercase tracking-widest mb-3 font-medium">이번 주 활동</p>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-3xl font-black tabular-nums text-white">{thisWeek.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">운동 횟수</p>
          </div>
          <div>
            <p className="text-3xl font-black tabular-nums text-white">
              {weekStats.total_distance_km?.toFixed(1) ?? '0'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">총 km</p>
          </div>
          <div>
            <p className="text-3xl font-black tabular-nums text-orange-400">
              {weekStats.avg_pace_seconds ? formatPace(weekStats.avg_pace_seconds) : '--:--'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">평균 페이스</p>
          </div>
          <div>
            <p className="text-3xl font-black tabular-nums text-white">
              {weekStats.total_calories?.toLocaleString() ?? '0'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">소모 kcal</p>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="현재 체중"
          value={latestWeight ? latestWeight.weight_kg.toFixed(1) : '--'}
          unit="kg"
          icon={Scale}
          accent={!!latestWeight}
          delta={weightTrend?.change7d !== null && weightTrend?.change7d !== undefined ? {
            value: `${Math.abs(weightTrend.change7d).toFixed(1)}kg (7일)`,
            positive: (weightTrend.change7d ?? 0) < 0,
          } : undefined}
        />
        <MetricCard
          label="체지방률"
          value={latestWeight?.body_fat_pct?.toFixed(1) ?? '--'}
          unit="%"
          icon={Activity}
          iconColor="text-blue-400"
        />
        <MetricCard
          label="이번 달 러닝"
          value={workouts.filter(w => {
            const now = new Date()
            return new Date(w.date).getMonth() === now.getMonth()
          }).length}
          unit="회"
          icon={TrendingUp}
          iconColor="text-green-400"
        />
        <MetricCard
          label="이번 달 소모"
          value={(workouts
            .filter(w => {
              const now = new Date()
              return new Date(w.date).getMonth() === now.getMonth()
            })
            .reduce((s, w) => s + (w.calories ?? 0), 0)
          ).toLocaleString()}
          unit="kcal"
          icon={Flame}
          iconColor="text-orange-400"
        />
      </div>

      {/* Weight chart + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight trend */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">체중 트렌드</h3>
            <Link to="/weight" className="text-xs text-orange-400 flex items-center gap-1 hover:text-orange-300">
              더보기 <ArrowRight size={12} />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{ background: '#1E1E1E', border: '1px solid #3A3A3A', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)} kg`, '체중']}
                />
                <Area type="monotone" dataKey="weight" stroke="#FF6B35" strokeWidth={2} fill="url(#wGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center">
              <Link to="/weight" className="text-sm text-gray-600 hover:text-orange-400 transition-colors">
                + 첫 체중 기록 추가하기
              </Link>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">목표 진행률</h3>
            <Link to="/goals" className="text-xs text-orange-400 flex items-center gap-1 hover:text-orange-300">
              관리 <ArrowRight size={12} />
            </Link>
          </div>
          {activeGoals.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center gap-2">
              <Target size={24} className="text-gray-700" />
              <Link to="/goals" className="text-sm text-gray-600 hover:text-orange-400 transition-colors">
                + 목표 설정하기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGoals.slice(0, 4).map(goal => {
                const pct = goal.type === 'target_weight' || goal.type === 'pace' || goal.type === 'body_fat'
                  ? calcProgress(goal.target_value, goal.current_value)
                  : calcProgress(goal.current_value, goal.target_value)
                const progress = Math.max(0, Math.min(pct, 100))
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{goal.title}</span>
                      <span className="text-gray-500 tabular-nums">
                        {goal.current_value} / {goal.target_value} {goal.unit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent workouts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">최근 운동</h3>
          <Link to="/workout" className="text-xs text-orange-400 flex items-center gap-1 hover:text-orange-300">
            전체 보기 <ArrowRight size={12} />
          </Link>
        </div>
        {workouts.length === 0 ? (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <Activity size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600 text-sm mb-3">아직 운동 기록이 없어요</p>
            <Link to="/workout" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
              <Plus size={14} />
              첫 운동 기록하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workouts.slice(0, 4).map(w => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
