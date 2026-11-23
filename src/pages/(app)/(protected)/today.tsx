/**
 * Today — the athlete's main screen.
 *
 * Week strip (carb targets per day) → selected day: training on the left,
 * targets + meals + AI fueling plan on the right. Targets are recomputed live
 * from the day's sessions by the pure fuel engine; nothing about them is
 * stored, so editing a session instantly moves the numbers (and a coach
 * watching sees the same change over the realtime socket).
 */

import { useMemo, useState } from 'react'
import { useAuthProfileReady } from 'deepspace'
import { Sparkles, Trash2, Check } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { dailyTargets, SESSION_TYPES, sumMeals, toISODate, type Intensity, type SessionType } from '../../../lib/fuel'
import { useAthleteData, useFuelMutations, useMe } from '../../../lib/useAthleteData'
import { callAction } from '../../../lib/callAction'
import type { MealEstimate } from '../../../actions/index'
import { WeekStrip } from '../../../components/fuel/WeekStrip'
import { ProfileForm } from '../../../components/fuel/ProfileForm'
import { Card, TargetsPanel, fieldClass, formatDay } from '../../../components/fuel/parts'
import { cn } from '../../../lib/utils'

export default function TodayPage() {
  const me = useMe()
  const { user } = useAuthProfileReady({ requireUser: true })
  const data = useAthleteData(me)
  const [day, setDay] = useState(() => toISODate(new Date()))

  if (data.loading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading your week…</div>
  }

  if (!data.profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b07415]">Set up</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your targets start from your body weight.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every carb, protein and fat target is grams per kilogram, scaled by the training you plan. You can change this any time.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <ProfileForm profile={null} defaultName={user?.name ?? ''} />
        </div>
      </div>
    )
  }

  return <DayView day={day} setDay={setDay} data={data} />
}

function DayView({ day, setDay, data }: { day: string; setDay: (d: string) => void; data: ReturnType<typeof useAthleteData> }) {
  const profile = data.profile!
  const { weightKg, goal, coaches } = profile.data
  const daySessions = data.sessions.filter((s) => s.data.date === day)
  const dayMeals = data.meals.filter((m) => m.data.date === day)
  const targets = useMemo(() => dailyTargets(daySessions.map((s) => s.data), weightKg, goal), [daySessions, weightKg, goal])
  const eaten = sumMeals(dayMeals.map((m) => m.data))
  const plan = data.plans.find((p) => p.data.date === day) ?? null
  const dayNotes = data.notes.filter((n) => n.data.date === day)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{profile.data.displayName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatDay(day, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h1>
        </div>
        {coaches?.length > 0 && (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
            Shared with {coaches.length} coach{coaches.length > 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <WeekStrip selected={day} onSelect={setDay} sessions={data.sessions} weightKg={weightKg} goal={goal} />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <SessionsCard day={day} sessions={daySessions} coaches={coaches ?? []} />
          {dayNotes.length > 0 && (
            <Card title="Coach notes">
              <ul className="space-y-2 text-sm">
                {dayNotes.map((n) => (
                  <li key={n.recordId} className="rounded-lg bg-muted/60 p-3">
                    <p>{n.data.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">— {n.data.coachName || 'Coach'}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Targets">
            <TargetsPanel targets={targets} eaten={eaten} />
          </Card>
          <PlanCard
            day={day}
            plan={plan}
            coaches={coaches ?? []}
            context={{
              date: day,
              athlete: { weightKg, goal },
              sessions: daySessions.map((s) => ({ type: s.data.type, minutes: s.data.durationMin, intensity: s.data.intensity, time: s.data.timeOfDay || 'unspecified' })),
              targets: { kcal: targets.kcal, carbs: targets.carbs, protein: targets.protein, fat: targets.fat, dayType: targets.dayType },
              alreadyEaten: dayMeals.map((m) => ({ meal: m.data.label || m.data.description, carbs: m.data.carbs, protein: m.data.protein, fat: m.data.fat })),
            }}
          />
          <MealsCard day={day} meals={dayMeals} coaches={coaches ?? []} />
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Targets follow published sport-nutrition ranges for healthy adults. They are general guidance, not medical advice.
      </p>
    </div>
  )
}

function SessionsCard({ day, sessions, coaches }: { day: string; sessions: ReturnType<typeof useAthleteData>['sessions']; coaches: string[] }) {
  const { sessions: m } = useFuelMutations()
  const [type, setType] = useState<SessionType>('run')
  const [minutes, setMinutes] = useState('45')
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [time, setTime] = useState('')

  function add() {
    const durationMin = Math.round(Number(minutes))
    if (!durationMin || durationMin <= 0) return
    void m.create({ date: day, type, durationMin: Math.min(durationMin, 600), intensity, timeOfDay: time, done: false, coaches })
  }

  return (
    <Card title="Training">
      {sessions.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">Rest day so far. Add a session and watch the targets move.</p>
      ) : (
        <ul className="mb-4 space-y-2">
          {sessions.map((s) => (
            <li key={s.recordId} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2" data-testid="session-row">
              <button
                aria-label={s.data.done ? 'Mark not done' : 'Mark done'}
                onClick={() => void m.put(s.recordId, { done: !s.data.done })}
                className={cn('flex h-5 w-5 items-center justify-center rounded-full border', s.data.done ? 'border-[#3a7d6b] bg-[#3a7d6b] text-white' : 'border-border')}
              >
                {s.data.done && <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{SESSION_TYPES.find((t) => t.value === s.data.type)?.label ?? s.data.type}</span>
                <span className="text-muted-foreground">
                  {' '}· {s.data.durationMin} min · {s.data.intensity}
                  {s.data.timeOfDay ? ` · ${s.data.timeOfDay}` : ''}
                </span>
              </div>
              <button aria-label="Delete session" onClick={() => void m.remove(s.recordId)} className="text-muted-foreground hover:text-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className={fieldClass} value={type} onChange={(e) => setType(e.target.value as SessionType)} aria-label="Session type" data-testid="session-type">
          {SESSION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input className={fieldClass} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Minutes" data-testid="session-minutes" />
        <select className={fieldClass} value={intensity} onChange={(e) => setIntensity(e.target.value as Intensity)} aria-label="Intensity">
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </select>
        <input className={fieldClass} type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Start time" />
      </div>
      <Button className="mt-2 w-full" variant="outline" onClick={add} disabled={!m.ready} data-testid="session-add">
        Add session
      </Button>
    </Card>
  )
}

function MealsCard({ day, meals, coaches }: { day: string; meals: ReturnType<typeof useAthleteData>['meals']; coaches: string[] }) {
  const { meals: m } = useFuelMutations()
  const { error } = useToast()
  const [text, setText] = useState('')
  const [estimating, setEstimating] = useState(false)
  const [draft, setDraft] = useState<MealEstimate | null>(null)

  async function estimate() {
    setEstimating(true)
    const res = await callAction<MealEstimate>('estimateMeal', { description: text })
    setEstimating(false)
    if (res.success) setDraft(res.data)
    else error('Could not estimate', res.error)
  }

  function save() {
    if (!draft) return
    void m.create({ date: day, description: text.trim(), ...draft, estimated: true, coaches })
    setDraft(null)
    setText('')
  }

  const field = (k: keyof Omit<MealEstimate, 'label'>, label: string) => (
    <label className="text-xs text-muted-foreground">
      {label}
      <input
        className={fieldClass + ' mt-0.5 h-9'}
        inputMode="numeric"
        value={draft?.[k] ?? 0}
        onChange={(e) => setDraft((d) => (d ? { ...d, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) } : d))}
      />
    </label>
  )

  return (
    <Card title="Meals">
      {meals.length > 0 && (
        <ul className="mb-4 divide-y divide-border">
          {meals.map((meal) => (
            <li key={meal.recordId} className="flex items-center gap-3 py-2 text-sm" data-testid="meal-row">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{meal.data.label || meal.data.description}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {meal.data.kcal} kcal · C {meal.data.carbs} · P {meal.data.protein} · F {meal.data.fat}
                  {meal.data.estimated ? ' · AI estimate' : ''}
                </p>
              </div>
              <button aria-label="Delete meal" onClick={() => void m.remove(meal.recordId)} className="text-muted-foreground hover:text-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        className={fieldClass + ' h-20 resize-none py-2'}
        placeholder="What did you eat? e.g. “Chipotle bowl, double chicken, white rice, no sour cream”"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setDraft(null)
        }}
        data-testid="meal-text"
      />
      {!draft ? (
        <Button className="mt-2 w-full" onClick={estimate} loading={estimating} disabled={text.trim().length < 3} data-testid="meal-estimate">
          <Sparkles /> Estimate macros
        </Button>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-border p-3">
          <p className="mb-2 text-sm">
            <span className="font-medium">{draft.label}</span>
            <span className="text-muted-foreground"> · check and adjust before saving</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {field('carbs', 'Carbs g')}
            {field('protein', 'Protein g')}
            {field('fat', 'Fat g')}
            {field('kcal', 'kcal')}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={save} disabled={!m.ready} data-testid="meal-save">Log meal</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function PlanCard({ day, plan, coaches, context }: { day: string; plan: ReturnType<typeof useAthleteData>['plans'][number] | null; coaches: string[]; context: Record<string, unknown> }) {
  const { plans: m } = useFuelMutations()
  const { error } = useToast()
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await callAction<{ plan: string }>('fuelPlan', { context })
    setLoading(false)
    if (!res.success) return error('Could not build a plan', res.error)
    const basis = JSON.stringify(context)
    if (plan) void m.put(plan.recordId, { plan: res.data.plan, basis })
    else void m.create({ date: day, plan: res.data.plan, basis, coaches })
  }

  const stale = plan && plan.data.basis !== JSON.stringify(context)
  const lines = plan?.data.plan.split('\n').map((l) => l.trim()).filter(Boolean) ?? []

  return (
    <Card
      title="Fueling plan"
      action={
        <Button size="sm" variant={plan && !stale ? 'outline' : 'default'} onClick={generate} loading={loading} data-testid="plan-generate">
          <Sparkles /> {plan ? 'Rebuild' : 'Plan my day'}
        </Button>
      }
    >
      {!plan ? (
        <p className="text-sm text-muted-foreground">Builds timed meals around today’s sessions to hit the targets, counting what you’ve already logged.</p>
      ) : (
        <div data-testid="plan-text">
          {stale && <p className="mb-2 text-xs font-medium text-[#8a5a12]">Your training or meals changed since this plan was written. Rebuild to update it.</p>}
          <ul className="space-y-1.5 text-sm">
            {lines.map((l, i) =>
              l.startsWith('Why:') ? (
                <li key={i} className="pt-1 text-xs text-muted-foreground">{l}</li>
              ) : (
                <li key={i} className="rounded-md bg-muted/50 px-2.5 py-1.5">{l}</li>
              ),
            )}
          </ul>
        </div>
      )}
    </Card>
  )
}
