/** Small presentational pieces shared by the athlete and coach views. */

import type { ReactNode } from 'react'
import type { Targets, Totals } from '../../lib/fuel'
import { cn } from '../../lib/utils'

export const MACRO_COLORS = {
  carbs: 'bg-[#e8a13a]',
  protein: 'bg-[#3a7d6b]',
  fat: 'bg-[#c4664f]',
  kcal: 'bg-foreground',
} as const

export const DAY_TYPE_STYLE: Record<Targets['dayType'], string> = {
  rest: 'bg-muted text-muted-foreground',
  light: 'bg-[#3a7d6b]/15 text-[#2c6152]',
  moderate: 'bg-[#e8a13a]/20 text-[#8a5a12]',
  high: 'bg-[#e8a13a]/35 text-[#7a4b08]',
  'very high': 'bg-[#c4664f]/25 text-[#8c3b28]',
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-border bg-card p-4 sm:p-5', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function MacroBar({ label, eaten, target, unit = 'g', color }: { label: string; eaten: number; target: number; unit?: string; color: string }) {
  const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0
  const over = eaten > target * 1.1
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('tabular-nums text-muted-foreground', over && 'text-[#8c3b28]')}>
          <span className="font-semibold text-foreground">{Math.round(eaten)}</span> / {target}
          {unit}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function TargetsPanel({ targets, eaten }: { targets: Targets; eaten: Totals }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', DAY_TYPE_STYLE[targets.dayType])}>
          {targets.dayType} day
        </span>
        <span className="text-xs text-muted-foreground">training load {targets.load}</span>
      </div>
      <MacroBar label="Carbs" eaten={eaten.carbs} target={targets.carbs} color={MACRO_COLORS.carbs} />
      <MacroBar label="Protein" eaten={eaten.protein} target={targets.protein} color={MACRO_COLORS.protein} />
      <MacroBar label="Fat" eaten={eaten.fat} target={targets.fat} color={MACRO_COLORS.fat} />
      <MacroBar label="Calories" eaten={eaten.kcal} target={targets.kcal} unit=" kcal" color={MACRO_COLORS.kcal} />
      {targets.cues.length > 0 && (
        <ul className="space-y-1.5 border-t border-border pt-3 text-sm text-foreground/85">
          {targets.cues.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8a13a]" />
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const fieldClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40'

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short' }) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts)
}
