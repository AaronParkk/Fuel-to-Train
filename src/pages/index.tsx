/**
 * Landing — static, prerendered (no auth call, no socket). Shows the core
 * idea with a fixed example week so it reads without signing in.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const WEEK = [
  { d: 'Mon', s: 'Lift 60′', c: 330, t: 'light' },
  { d: 'Tue', s: 'Intervals 50′', c: 450, t: 'moderate' },
  { d: 'Wed', s: 'Easy run 40′ + lift', c: 400, t: 'moderate' },
  { d: 'Thu', s: 'Rest', c: 265, t: 'rest' },
  { d: 'Fri', s: 'Tempo 45′', c: 420, t: 'moderate' },
  { d: 'Sat', s: 'Long run 120′', c: 640, t: 'high' },
  { d: 'Sun', s: 'Mobility', c: 270, t: 'rest' },
]

export default function Landing() {
  const max = Math.max(...WEEK.map((w) => w.c))
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold">Fuel to Train</span>
          <Link to="/today" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
        </header>
        <main className="mx-auto grid max-w-5xl gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b07415]">For hybrid athletes</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Your long-run day and your rest day shouldn’t eat the same.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground">
              Plan the week’s runs and lifts. Fuel to Train turns each day’s training load into carb, protein and fat targets,
              writes a timed fueling plan around your sessions, and estimates macros from a plain-English meal log. Share it with your coach,
              who sees every update live.
            </p>
            <Link
              to="/today"
              className="mt-8 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Plan this week
            </Link>
          </div>
          <figure className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <figcaption className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Example week · 75 kg · carb target
            </figcaption>
            <ul className="space-y-2.5">
              {WEEK.map((w) => (
                <li key={w.d} className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3 text-sm">
                  <span className="font-medium">{w.d}</span>
                  <div>
                    <div className="h-2.5 rounded-full bg-[#e8a13a]" style={{ width: `${(w.c / max) * 100}%` }} />
                    <span className="mt-0.5 block text-xs text-muted-foreground">{w.s}</span>
                  </div>
                  <span className="text-right tabular-nums">{w.c}g</span>
                </li>
              ))}
            </ul>
          </figure>
        </main>
      </div>
    </>
  )
}
