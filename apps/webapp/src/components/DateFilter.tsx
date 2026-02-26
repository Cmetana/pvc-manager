import clsx from 'clsx'

export type DateFilter = 'today' | 'tomorrow' | 'week' | 'custom'

interface Props {
  value: DateFilter
  customDate?: string
  onChange: (f: DateFilter, custom?: string) => void
}

const OPTIONS: { key: DateFilter; label: string }[] = [
  { key: 'today',    label: 'Сьогодні' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'week',     label: 'Тиждень' },
  { key: 'custom',   label: '📅 Дата' },
]

export function getDateRange(filter: DateFilter, customDate?: string): { dateFrom: string; dateTo: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  if (filter === 'today') {
    return { dateFrom: fmt(today), dateTo: fmt(today) }
  }
  if (filter === 'tomorrow') {
    const t = new Date(today); t.setDate(t.getDate() + 1)
    return { dateFrom: fmt(t), dateTo: fmt(t) }
  }
  if (filter === 'week') {
    const end = new Date(today); end.setDate(end.getDate() + 6)
    return { dateFrom: fmt(today), dateTo: fmt(end) }
  }
  if (filter === 'custom' && customDate) {
    return { dateFrom: customDate, dateTo: customDate }
  }
  return { dateFrom: fmt(today), dateTo: fmt(today) }
}

export default function DateFilter({ value, customDate, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => {
            if (opt.key === 'custom') {
              // Відкриваємо input[type=date]
              const input = document.createElement('input')
              input.type = 'date'
              input.value = customDate ?? new Date().toISOString().split('T')[0]
              input.onchange = (e) => onChange('custom', (e.target as HTMLInputElement).value)
              input.click()
            } else {
              onChange(opt.key)
            }
          }}
          className={clsx(
            'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            value === opt.key
              ? 'bg-tg-button text-tg-button-text'
              : 'bg-tg-secondary text-tg-hint'
          )}
        >
          {opt.key === 'custom' && customDate && value === 'custom'
            ? new Date(customDate).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
            : opt.label}
        </button>
      ))}
    </div>
  )
}
