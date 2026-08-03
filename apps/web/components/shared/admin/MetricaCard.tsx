import { type FC, type ElementType } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricaCardProps {
  title: string
  value: string | number
  icon: ElementType
  color: 'blue' | 'emerald' | 'amber' | 'red' | 'slate'
  trend?: 'up' | 'down' | 'neutral'
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'text-blue-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    icon: 'text-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    icon: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    icon: 'text-red-600',
  },
  slate: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    icon: 'text-slate-600',
  },
}

const TrendIcon: FC<{ trend: 'up' | 'down' | 'neutral' }> = ({ trend }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-slate-400" />
}

export const MetricaCard: FC<MetricaCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
}) => {
  const colors = colorConfig[color]

  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="sm:hidden">
          <div className="flex items-center gap-2">
            <div className={cn('rounded-lg p-1.5 shrink-0', colors.bg)}>
              <Icon className={cn('h-4 w-4', colors.icon)} />
            </div>
            <div className={cn('text-lg font-bold leading-none', colors.text)}>{value}</div>
            {trend && (
              <div className="ml-auto shrink-0">
                <TrendIcon trend={trend} />
              </div>
            )}
          </div>
          <p className="text-[11px] leading-snug text-slate-500 mt-1.5">{title}</p>
        </div>

        <div className="hidden sm:block">
          <div className="flex items-center justify-between mb-4">
            <div className={cn('rounded-lg p-2.5', colors.bg)}>
              <Icon className={cn('h-5 w-5', colors.icon)} />
            </div>
            {trend && <TrendIcon trend={trend} />}
          </div>
          <div className={cn('text-3xl font-bold mb-1', colors.text)}>{value}</div>
          <p className="text-sm text-slate-500">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}
