import { useState } from 'react'
import { FileText, Loader2, RefreshCw, Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { generateReport, type ReportOutput } from '../lib/claude'
import { analysisApi } from '../lib/supabase'
import { calcWorkoutStats, calcWeightTrend } from '../services/analysis'
import MetricCard from '../components/common/MetricCard'
import { getWeekRange, getMonthRange, formatDate, today } from '../utils/formatters'

type PeriodType = 'weekly' | 'monthly'

export default function ReportsPage() {
  const user = useAppStore(s => s.user)
  const profile = useAppStore(s => s.profile)
  const workouts = useAppStore(s => s.workouts)
  const weightRecords = useAppStore(s => s.weightRecords)
  const goals = useAppStore(s => s.goals)
  const analyses = useAppStore(s => s.analyses)
  const addAnalysis = useAppStore(s => s.addAnalysis)

  const [period, setPeriod] = useState<PeriodType>('weekly')
  const [report, setReport] = useState<ReportOutput | null>(null)
  const [loading, setLoading] = useState(false)

  const range = period === 'weekly' ? getWeekRange() : getMonthRange()

  const filteredWorkouts = workouts.filter(
    w => w.date >= range.start && w.date <= range.end,
  )
  const filteredWeight = weightRecords.filter(
    r => r.date >= range.start && r.date <= range.end,
  )

  const stats = calcWorkoutStats(filteredWorkouts)
  const weightTrend = calcWeightTrend(filteredWeight)

  const generateAIReport = async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await generateReport({
        period,
        periodStart: range.start,
        periodEnd: range.end,
        context: {
          recentWorkouts: filteredWorkouts,
          weightRecords: filteredWeight,
          goals: goals.filter(g => g.status === 'active'),
          profile: {
            full_name: profile?.full_name,
            height_cm: profile?.height_cm,
            gender: profile?.gender,
          },
          today: today(),
        },
      })
      setReport(result)

      // Save to DB
      const { data } = await analysisApi.create({
        user_id: user.id,
        type: period,
        period_start: range.start,
        period_end: range.end,
        content: stats,
        ai_summary: result.summary,
        recommendations: result.recommendations,
      })
      if (data) addAnalysis(data)
    } catch {
      setReport({
        summary: 'AI 리포트 생성 중 오류가 발생했습니다. API 설정을 확인해주세요.',
        highlights: [],
        recommendations: [],
        motivationalMessage: '',
      })
    } finally {
      setLoading(false)
    }
  }

  const pastReports = analyses.filter(a => a.type === period).slice(0, 5)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">리포트</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(range.start)} ~ {formatDate(range.end)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="flex bg-[#1A1A1A] rounded-lg p-0.5 border border-[#2A2A2A]">
            {(['weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setReport(null) }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  period === p ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                {p === 'weekly' ? '주간' : '월간'}
              </button>
            ))}
          </div>
          <button
            onClick={generateAIReport}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {loading ? '생성 중...' : 'AI 리포트'}
          </button>
        </div>
      </div>

      {/* Period stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="운동 횟수" value={filteredWorkouts.length} unit="회" />
        <MetricCard label="총 거리" value={(stats.total_distance_km ?? 0).toFixed(1)} unit="km" accent />
        <MetricCard label="소모 칼로리" value={(stats.total_calories ?? 0).toLocaleString()} unit="kcal" />
        <MetricCard
          label="체중 변화"
          value={weightTrend?.change7d != null
            ? `${weightTrend.change7d > 0 ? '+' : ''}${weightTrend.change7d.toFixed(1)}`
            : '--'}
          unit="kg"
          delta={weightTrend?.trend ? {
            value: weightTrend.trend === 'down' ? '감소 트렌드' : weightTrend.trend === 'up' ? '증가 트렌드' : '유지',
            positive: weightTrend.trend === 'down',
          } : undefined}
        />
      </div>

      {/* No workouts */}
      {filteredWorkouts.length === 0 && (
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-8 text-center">
          <FileText size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {period === 'weekly' ? '이번 주' : '이번 달'} 운동 기록이 없습니다
          </p>
        </div>
      )}

      {/* AI Report */}
      {report && (
        <div className="bg-gradient-to-br from-orange-500/5 to-transparent border border-orange-500/20 rounded-2xl p-6 animate-slide-up space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-orange-400" />
              AI {period === 'weekly' ? '주간' : '월간'} 리포트
            </h3>
            <button onClick={generateAIReport} className="p-1.5 text-gray-600 hover:text-orange-400 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Summary */}
          <div>
            <p className="text-xs text-orange-400 uppercase tracking-widest mb-2 font-medium">요약</p>
            <p className="text-gray-200 text-sm leading-relaxed">{report.summary}</p>
          </div>

          {/* Highlights */}
          {report.highlights.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">하이라이트</p>
              <ul className="space-y-1.5">
                {report.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-orange-500 mt-0.5">▸</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">다음 주 권고사항</p>
              <ul className="space-y-1.5">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Motivational message */}
          {report.motivationalMessage && (
            <div className="border-t border-orange-500/15 pt-4">
              <p className="text-orange-300 text-sm font-medium italic">
                "{report.motivationalMessage}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Past reports */}
      {pastReports.length > 0 && (
        <div>
          <h3 className="font-bold text-white mb-3">이전 리포트</h3>
          <div className="space-y-2">
            {pastReports.map(a => (
              <div key={a.id} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">
                    {a.period_start && a.period_end
                      ? `${formatDate(a.period_start)} ~ ${formatDate(a.period_end)}`
                      : formatDate(a.created_at)}
                  </p>
                  <span className="text-xs text-gray-600">{a.type === 'weekly' ? '주간' : '월간'}</span>
                </div>
                {a.ai_summary && (
                  <p className="text-sm text-gray-300 line-clamp-2">{a.ai_summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
