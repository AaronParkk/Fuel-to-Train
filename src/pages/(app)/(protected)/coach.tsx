/**
 * Coach view. Lists athletes who have shared with this user (rows the
 * RecordRoom lets us read because we're in their `coaches` list), shows the
 * selected athlete's week, targets, meals and plan read-only, and lets the
 * coach leave a note on a day. Everything updates live as the athlete logs.
 */

import { useState } from 'react'
import { useAuthProfileReady, usePresence } from 'deepspace'
import { Copy } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { dailyTargets, SESSION_TYPES, sumMeals, toISODate } from '../../../lib/fuel'
import { useAthleteData, useFuelMutations, useMe } from '../../../lib/useAthleteData'
import { WeekStrip } from '../../../components/fuel/WeekStrip'
import { Card, TargetsPanel, fieldClass, formatDay } from '../../../components/fuel/parts'
import { cn } from '../../../lib/utils'

export default function CoachPage() {
  const me = useMe()
  const { success } = useToast()
  const mineData = useAthleteData(me)
  const shared = mineData.allAthletes.filter((a) => a.createdBy !== me && a.data.coaches?.includes(me ?? ''))
  const [selected, setSelected] = useState<string | null>(null)
  const athleteId = selected ?? shared[0]?.createdBy ?? null
  const { isOnline } = usePresence()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Coach</h1>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="text-muted-foreground">Your coach code</span>
          <code className="max-w-[14rem] truncate text-xs" data-testid="my-coach-code">{me}</code>
          <button
            aria-label="Copy coach code"
            onClick={() => {
              void navigator.clipboard?.writeText(me ?? '')
              success('Copied', 'Send this to your athlete. They paste it on their Profile page.')
            }}
          >
            <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {shared.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            No athletes have shared with you yet. Copy your coach code above and send it to an athlete. Once they add it on their Profile page, their week shows up here live.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {shared.map((a) => (
              <button
                key={a.recordId}
                onClick={() => setSelected(a.createdBy)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
                  a.createdBy === athleteId ? 'border-foreground bg-card' : 'border-border text-muted-foreground hover:bg-card',
                )}
                data-testid="coach-athlete"
              >
                <span className={cn('h-2 w-2 rounded-full', isOnline(a.createdBy) ? 'bg-[#3a7d6b]' : 'bg-muted-foreground/30')} title={isOnline(a.createdBy) ? 'Online now' : 'Offline'} />
                {a.data.displayName}
              </button>
            ))}
          </div>
          {athleteId && <AthleteReadOnly athleteId={athleteId} />}
        </>
      )}
    </div>
  )
}

function AthleteReadOnly({ athleteId }: { athleteId: string }) {
  const data = useAthleteData(athleteId)
  const { user } = useAuthProfileReady({ requireUser: true })
  const { notes } = useFuelMutations()
  const [day, setDay] = useState(() => toISODate(new Date()))
  const [note, setNote] = useState('')
  if (!data.profile) return null
  const { weightKg, goal } = data.profile.data
  const daySessions = data.sessions.filter((s) => s.data.date === day)
  const dayMeals = data.meals.filter((m) => m.data.date === day)
  const targets = dailyTargets(daySessions.map((s) => s.data), weightKg, goal)
  const plan = data.plans.find((p) => p.data.date === day)
  const dayNotes = data.notes.filter((n) => n.data.date === day)

  function send() {
    if (!note.trim()) return
    void notes.create({ athleteId, date: day, text: note.trim().slice(0, 1000), coachName: user?.name ?? 'Coach', coaches: [athleteId] })
    setNote('')
  }

  return (
    <>
      <WeekStrip selected={day} onSelect={setDay} sessions={data.sessions} weightKg={weightKg} goal={goal} />
      <h2 className="mb-3 mt-5 text-lg font-semibold">{formatDay(day, { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card title="Training">
            {daySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rest day.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {daySessions.map((s) => (
                  <li key={s.recordId}>
                    <span className="font-medium">{SESSION_TYPES.find((t) => t.value === s.data.type)?.label}</span>
                    <span className="text-muted-foreground"> · {s.data.durationMin} min · {s.data.intensity}{s.data.done ? ' · done ✓' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Meals logged">
            {dayMeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {dayMeals.map((m) => (
                  <li key={m.recordId} className="flex justify-between gap-2">
                    <span className="truncate">{m.data.label || m.data.description}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">C {m.data.carbs} · P {m.data.protein} · F {m.data.fat}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {plan && (
            <Card title="Their fueling plan">
              <p className="whitespace-pre-line text-sm">{plan.data.plan}</p>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Targets vs eaten">
            <TargetsPanel targets={targets} eaten={sumMeals(dayMeals.map((m) => m.data))} />
          </Card>
          <Card title="Notes for this day">
            {dayNotes.length > 0 && (
              <ul className="mb-3 space-y-2 text-sm">
                {dayNotes.map((n) => (
                  <li key={n.recordId} className="rounded-lg bg-muted/60 p-3">{n.data.text}</li>
                ))}
              </ul>
            )}
            <textarea className={fieldClass + ' h-20 resize-none py-2'} placeholder="e.g. Add a gel at 60 min on Saturday's long run." value={note} onChange={(e) => setNote(e.target.value)} data-testid="coach-note-text" />
            <Button className="mt-2" onClick={send} disabled={!note.trim() || !notes.ready} data-testid="coach-note-send">Send note</Button>
          </Card>
        </div>
      </div>
    </>
  )
}
