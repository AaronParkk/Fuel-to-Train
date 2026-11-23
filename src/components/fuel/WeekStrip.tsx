import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { RecordData } from 'deepspace'
import { addDays, dailyTargets, toISODate, weekOf, type Goal } from '../../lib/fuel'
import type { Session } from '../../schemas/fuel-schemas'
import { cn } from '../../lib/utils'
import { DAY_TYPE_STYLE, formatDay } from './parts'

/**
 * Seven days with each day's carb target drawn as a bar — the "periodized
 * fueling" idea at a glance: big training days get tall bars.
 */
export function WeekStrip({
  selected,
  onSelect,
  sessions,
  weightKg,
  goal,
}: {
  selected: string
  onSelect: (iso: string) => void
  sessions: RecordData<Session>[]
  weightKg: number
  goal: Goal
}) {
  const days = weekOf(selected)
  const today = toISODate(new Date())
  const perDay = days.map((d) => dailyTargets(sessions.filter((s) => s.data.date === d).map((s) => s.data), weightKg, goal))
  const maxCarbs = Math.max(...perDay.map((t) => t.carbs), 1)

  return (
    <div className="flex items-stretch gap-1.5">
      <button aria-label="Previous week" onClick={() => onSelect(addDays(selected, -7))} className="rounded-lg px-1 text-muted-foreground hover:bg-accent">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="grid flex-1 grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const t = perDay[i]
          const active = d === selected
          return (
            <button
              key={d}
              data-testid={`day-${d}`}
              onClick={() => onSelect(d)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-1 pb-2 pt-1.5 transition-colors',
                active ? 'border-foreground bg-card shadow-sm' : 'border-transparent hover:bg-card',
              )}
            >
              <span className={cn('text-[11px] uppercase tracking-wider text-muted-foreground', d === today && 'font-bold text-foreground')}>
                {formatDay(d)}
              </span>
              <span className="text-sm font-semibold tabular-nums">{Number(d.slice(8))}</span>
              <div className="flex h-12 w-full items-end justify-center">
                <div className="w-3 rounded-t-sm bg-[#e8a13a]" style={{ height: `${Math.max(8, (t.carbs / maxCarbs) * 100)}%` }} />
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">{t.carbs}g</span>
              <span className={cn('hidden rounded-full px-1.5 text-[10px] capitalize sm:block', DAY_TYPE_STYLE[t.dayType])}>{t.dayType}</span>
            </button>
          )
        })}
      </div>
      <button aria-label="Next week" onClick={() => onSelect(addDays(selected, 7))} className="rounded-lg px-1 text-muted-foreground hover:bg-accent">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
