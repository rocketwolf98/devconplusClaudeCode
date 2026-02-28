interface StatItem {
  label: string
  value: string | number
}

interface OrgBannerProps {
  chapterName: string
  role: string
  stats: StatItem[]
}

export function OrgBanner({ chapterName, role, stats }: OrgBannerProps) {
  return (
    <div className="text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
        DEVCON Philippines
      </p>
      <h1 className="text-2xl font-black mb-0.5">{chapterName} Chapter</h1>
      <p className="text-sm text-white/70 mb-5">{role}</p>

      <div className="flex gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 bg-white/10 rounded-xl border border-white/20 px-4 py-3"
          >
            <p className="text-2xl font-black leading-none mb-1">{stat.value}</p>
            <p className="text-xs text-white/60 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
