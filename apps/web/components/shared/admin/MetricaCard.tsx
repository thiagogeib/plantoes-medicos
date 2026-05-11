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
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn('rounded-lg p-2.5', colors.bg)}>
            <Icon className={cn('h-5 w-5', colors.icon)} />
          </div>
          {trend && <TrendIcon trend={trend} />}
        </div>
        <div className={cn('text-3xl font-bold mb-1', colors.text)}>{value}</div>
        <p className="text-sm text-slate-500">{title}</p>
      </CardContent>
    </Card>
  )
}
