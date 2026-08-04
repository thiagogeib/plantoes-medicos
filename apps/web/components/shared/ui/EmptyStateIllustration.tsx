import Image from 'next/image'
import { type FC } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateIllustrationProps {
  size?: number
  className?: string
}

export const EmptyStateIllustration: FC<EmptyStateIllustrationProps> = ({ size = 96, className }) => {
  return (
    <Image
      src="/illustrations/empty-state.png"
      alt=""
      width={size}
      height={size}
      className={cn('mx-auto', className)}
    />
  )
}
