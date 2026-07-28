import Image from 'next/image'
import { type FC } from 'react'

interface NotebookMockupProps {
  src: string
  alt: string
  className?: string
}

export const NotebookMockup: FC<NotebookMockupProps> = ({ src, alt, className }) => {
  return (
    <div className={className}>
      <div className="rounded-t-xl bg-slate-800 pt-3 px-3 shadow-2xl">
        <div className="flex justify-center pb-2">
          <div className="h-1 w-1 rounded-full bg-slate-600" />
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-md bg-white ring-1 ring-black/10">
          <Image src={src} alt={alt} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 640px" />
        </div>
      </div>
      <div className="relative">
        <div className="h-3 rounded-b-xl bg-gradient-to-b from-slate-700 to-slate-800" />
        <div className="mx-auto -mt-px h-1.5 w-24 rounded-b-md bg-slate-600" />
      </div>
    </div>
  )
}

interface PhoneMockupProps {
  src: string
  alt: string
  className?: string
}

export const PhoneMockup: FC<PhoneMockupProps> = ({ src, alt, className }) => {
  return (
    <div className={className}>
      <div className="relative rounded-[2.25rem] bg-slate-800 p-2.5 shadow-2xl">
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-black/10">
          <div className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-800" />
          <Image src={src} alt={alt} fill className="object-cover object-top" sizes="(max-width: 768px) 60vw, 320px" />
          <div className="absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-slate-300/70" />
        </div>
      </div>
    </div>
  )
}
