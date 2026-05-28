import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: LucideIcon
  iconColor?: string
  delta?: { value: string; positive: boolean }
  accent?: boolean
  className?: string
  children?: ReactNode
}

export default function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  iconColor = 'text-orange-400',
  delta,
  accent = false,
  className = '',
  children,
}: MetricCardProps) {
  return (
    <div
      className={`
        relative bg-[#141414] border rounded-xl p-5 overflow-hidden transition-all hover:border-[#3A3A3A]
        ${accent ? 'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent' : 'border-[#2A2A2A]'}
        ${className}
      `}
    >
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      )}

      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">{label}</p>
        {Icon && (
          <div className={`p-1.5 rounded-lg bg-white/5 ${iconColor}`}>
            <Icon size={14} />
          </div>
        )}
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-black tabular-nums tracking-tight text-white">
          {value}
        </span>
        {unit && <span className="text-sm text-gray-500 mb-0.5">{unit}</span>}
      </div>

      {delta && (
        <p className={`text-xs mt-1.5 font-medium ${delta.positive ? 'text-green-400' : 'text-red-400'}`}>
          {delta.positive ? '▲' : '▼'} {delta.value}
        </p>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
