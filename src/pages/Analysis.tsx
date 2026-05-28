import { useState } from 'react'
import { Loader2, RefreshCw, Zap } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import MetricCard from '../components/common/MetricCard'
import {
  calcWorkoutStats, calcWeightTrend, buildPaceChartData, buildDistanceChartData,
} from '../services/analysis'
import { generateIntegratedAnalysis } from '../lib/claude'
import { buildContextSummary } from '../services/claude-prompts'
import { formatPace, formatDuration, getWeekRange } from '../utils/formatters'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ScatterChart, Scatter, ZAxis,
} from 'recharts'
import { today } from '../utils/formatters'

export default function AnalysisPage() {
  const user = useAppStore(s => s.user)
  const profile = useAppStore(s => s.profile)
  const workouts = useAppStore(s => s.workouts)
  const weightRecords = useAppStore(s => s.weightRecords)
  const goals = useAppStore(s => s.goals)

  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const stats = calcWorkoutStats(workouts)
  const weightTrend = calcWeightTrend(weightRecords.slice(0, 60))
  const paceData = buildPaceChartData(workouts)
  const distData = buildDistanceChartData(workouts)

  const generateInsight = async () => {
    setAiLoading(true)
    try {
      const insight = await generateIntegratedAnalysis({
        recentWorkouts: workouts.slice(0, 20),
        weightRecords: weightRecords.slice(0, 30),
        goals: goals.filter(g => g.status === 'active'),
        profile: {
          full_name: profile?.full_name,
          height_cm: profile?.height_cm,
          gender: profile?.gender,
          birth_date: profile?.birth_date,
        },
        today: today(),
      })
      setAiInsight(insight)
    } catch (err) {
      setAiInsight('AI 분석 중 오류가 발생했습니다. API 설정을 확인해주세요.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">통합 분석</h1>
          <p className="text-sm text-gray-500 mt-0.5">운동 + 체중 데이터 종합 분석</p>
        </div>
        <button
          onClick={generateInsight}
          disabled={aiLoading || workouts.length === 0}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {aiLoading ? (
            <><Loader2 size={14} className="animate-spin" /> 분석 중...</>
          ) : (
            <><Zap size={14} /> AI 분석</>
          )}
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="총 운동" value={stats.total_workouts ?? 0} unit="회" />
        <MetricCard label="총 거리" value={(stats.total_distance_km ?? 0).toFixed(1)} unit="km" accent />
        <MetricCard
          label="평균 페이스"
          value={stats.avg_pace_seconds ? formatPace(stats.avg_pace_seconds) : '--:--'}
          unit="/km"
        />
        <MetricCard
          label="총 칼로리"
          value={(stats.total_calories ?? 0).toLocaleString()}
          unit="kcal"
        />
      </div>

      {/* AI Insight panel */}
      {(aiInsight || aiLoading) && (
        <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-2xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-orange-400" />
              <h3 className="font-bold text-white">AI 통합 분석</h3>
            </div>
            {aiInsight && !aiLoading && (
              <button onClick={generateInsight} className="p-1.5 text-gray-600 hover:text-orange-400 transition-colors">
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          {aiLoading ? (
            <div className="flex items-center gap-3 text-gray-500 py-4">
              <Loader2 size={18} className="animate-spin text-orange-400" />
              <span className="text-sm">운동 + 체중 데이터를 분석하는 중...</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{aiInsight}</p>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pace trend */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="font-bold text-white mb-4">페이스 트렌드</h3>
          {paceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={paceData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={d => d.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v.toFixed(1)}'`}
                  reversed
                />
                <Tooltip
                  contentStyle={{ background: '#1E1E1E', border: '1px solid #3A3A3A', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(2)} 분/km`, '페이스']}
                />
                <Line type="monotone" dataKey="pace" stroke="#FF6B35" strokeWidth={2} dot={{ fill: '#FF6B35', r: 3, strokeWidth: 0 }} />
                <Bar dataKey="distance" fill="#3A3A3A" radius={[2, 2, 0, 0]} yAxisId={1} />
                <YAxis yAxisId={1} hide />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">운동 데이터 없음</div>
          )}
        </div>

        {/* Weekly distance */}
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="font-bold text-white mb-4">주간 거리</h3>
          {distData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={distData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={d => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1E1E1E', border: '1px solid #3A3A3A', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [
                    name === 'distance' ? `${v} km` : `${v}회`,
                    name === 'distance' ? '총 거리' : '운동 횟수',
                  ]}
                />
                <Bar dataKey="distance" fill="#FF6B35" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="runs" stroke="#39FF14" strokeWidth={2} dot={false} yAxisId={1} />
                <YAxis yAxisId={1} orientation="right" hide />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">운동 데이터 없음</div>
          )}
        </div>
      </div>

      {/* Weight-workout correlation */}
      {workouts.length > 0 && weightRecords.length > 0 && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5">
          <h3 className="font-bold text-white mb-2">운동-체중 상관관계</h3>
          <p className="text-xs text-gray-500 mb-4">운동량(주간 km)과 체중 변화의 관계</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-[#0F0F0F] rounded-lg p-4">
              <p className="text-2xl font-black text-orange-400">
                {weightTrend?.weeklyRate != null
                  ? `${weightTrend.weeklyRate > 0 ? '+' : ''}${weightTrend.weeklyRate.toFixed(2)}`
                  : '--'} kg
              </p>
              <p className="text-xs text-gray-500 mt-1">주간 체중 변화율</p>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-4">
              <p className={`text-2xl font-black ${
                weightTrend?.trend === 'down' ? 'text-green-400' :
                weightTrend?.trend === 'up' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {weightTrend?.trend === 'down' ? '감소' : weightTrend?.trend === 'up' ? '증가' : '유지'}
              </p>
              <p className="text-xs text-gray-500 mt-1">체중 트렌드</p>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-4">
              <p className="text-2xl font-black text-white">
                {(stats.total_calories ?? 0) > 0
                  ? Math.round((stats.total_calories ?? 0) / 7700 * 10) / 10
                  : 0} kg
              </p>
              <p className="text-xs text-gray-500 mt-1">예상 지방 소모</p>
            </div>
          </div>
        </div>
      )}

      {workouts.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p>운동 기록을 추가하면 상세 분석이 시작됩니다</p>
        </div>
      )}
    </div>
  )
}
