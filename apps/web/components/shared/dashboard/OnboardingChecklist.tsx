'use client'

import { type FC } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface OnboardingItem {
  label: string
  done: boolean
  href: string
  cta: string
}

interface OnboardingChecklistProps {
  title?: string
  items: OnboardingItem[]
}

export const OnboardingChecklist: FC<OnboardingChecklistProps> = ({
  title = 'Primeiros passos',
  items,
}) => {
  const doneCount = items.filter((i) => i.done).length
  if (doneCount === items.length) return null

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <span className="text-xs font-medium text-slate-500">
            {doneCount}/{items.length}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3"
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300" />
              )}
              <span
                className={cn(
                  'flex-1 text-sm',
                  item.done ? 'text-slate-400 line-through' : 'text-slate-700'
                )}
              >
                {item.label}
              </span>
              {!item.done && (
                <Link href={item.href} className="shrink-0">
                  <Button size="sm" variant="outline">
                    {item.cta}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
