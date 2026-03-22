function S({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
}

/** Single event card row (compact — dashboard + list) */
export function SkeletonEventCard() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-3">
      <S className="w-12 h-14 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <S className="h-4 w-3/4" />
        <S className="h-3 w-1/2" />
        <S className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

/** Featured navy event hero card */
export function SkeletonFeaturedEvent() {
  return (
    <div className="bg-navy/20 animate-pulse rounded-2xl p-5 space-y-3">
      <S className="h-3 w-28 bg-slate-300" />
      <S className="h-6 w-3/4 bg-slate-300" />
      <S className="h-6 w-1/2 bg-slate-300" />
      <div className="flex gap-4 pt-1">
        <S className="h-3 w-20 bg-slate-300" />
        <S className="h-3 w-24 bg-slate-300" />
      </div>
      <S className="h-10 w-full rounded-xl bg-slate-300 mt-2" />
    </div>
  )
}

/** Horizontal job card for dashboard carousel */
export function SkeletonJobCardCompact() {
  return (
    <div className="flex-shrink-0 w-52 bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-2">
      <S className="w-9 h-9 rounded-xl" />
      <S className="h-3 w-2/3" />
      <S className="h-4 w-full" />
      <S className="h-4 w-4/5" />
      <S className="h-3 w-3/4" />
    </div>
  )
}

/** Full-width job card for jobs list */
export function SkeletonJobCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
      <div className="flex items-start gap-3">
        <S className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <S className="h-3 w-1/3" />
          <S className="h-4 w-2/3" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <S className="h-6 w-20 rounded-full" />
        <S className="h-6 w-24 rounded-full" />
      </div>
      <S className="h-9 w-full rounded-xl mt-3" />
    </div>
  )
}

/** News card */
export function SkeletonNewsCard() {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <S className="h-32 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <S className="h-4 w-3/4" />
        <S className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/** XP transaction row */
export function SkeletonXPRow({ border = false }: { border?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${border ? 'border-b border-slate-100' : ''}`}>
      <S className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <S className="h-3.5 w-2/3" />
        <S className="h-3 w-1/3" />
      </div>
      <S className="h-4 w-14" />
    </div>
  )
}

/** Transaction group (date header + rows) */
export function SkeletonTransactionGroup({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mb-4">
      <S className="h-3 w-40 mb-2" />
      <div className="bg-white rounded-2xl shadow-card px-4 divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonXPRow key={i} />
        ))}
      </div>
    </div>
  )
}

/** Reward card — full-width single column */
export function SkeletonRewardCard() {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <S className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <S className="h-4 w-2/3" />
        <S className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
          <S className="h-5 w-24" />
          <S className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
