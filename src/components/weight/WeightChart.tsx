import {
  ResponsiveContainer, ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { WeightRecord } from '../../types'
import { buildWeightChartData } from '../../services/analysis'

interface WeightChartProps {
  records: WeightRecord[]
  showComposition?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1E1E1E] border border-[#3A3A3A] rounded-lg p-3 text-sm">
      <p className="text-gray-400 mb-1.5 text-xs">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          {p.name === '체중' ? ' kg' : p.name === '근육량' ? ' kg' : ' %'}
        </p>
      ))}
    </div>
  )
}

export default function WeightChart({ records, showComposition = true }: WeightChartProps) {
  const data = buildWeightChartData(records).map(d => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'M/d', { locale: ko }),
  }))

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        체중 기록이 없습니다
      </div>
    )
  }

  const weights = data.map(d => d.weight)
  const minWeight = Math.floor(Math.min(...weights) - 1)
  const maxWeight = Math.ceil(Math.max(...weights) + 1)

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" vertical={false} />
        <XAxis
          dataKey="dateLabel"
          tick={{ fontSize: 10, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[minWeight, maxWeight]}
          tick={{ fontSize: 10, fill: '#6B7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={(value) => <span className="text-gray-400">{value}</span>}
        />

        {/* Weight line */}
        <Line
          type="monotone"
          dataKey="weight"
          name="체중"
          stroke="#FF6B35"
          strokeWidth={2.5}
          dot={{ fill: '#FF6B35', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />

        {/* Composition bars (optional) */}
        {showComposition && records.some(r => r.body_fat_pct) && (
          <>
            <Bar
              dataKey="bodyFat"
              name="체지방%"
              fill="#EF4444"
              fillOpacity={0.4}
              radius={[2, 2, 0, 0]}
              yAxisId={1}
            />
            <Bar
              dataKey="muscle"
              name="근육량"
              fill="#10B981"
              fillOpacity={0.4}
              radius={[2, 2, 0, 0]}
              yAxisId={1}
            />
            <YAxis
              yAxisId={1}
              orientation="right"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
