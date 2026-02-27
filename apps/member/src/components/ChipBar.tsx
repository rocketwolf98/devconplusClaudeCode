interface Props {
  options: string[]
  selected: string
  onChange: (value: string) => void
}

export default function ChipBar({ options, selected, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
            selected === opt
              ? 'bg-blue text-white border-blue'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
