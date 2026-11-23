/**
 * Fuel engine — turns a day's training into macro targets.
 *
 * Pure functions, no I/O: the same code runs in the browser (live targets as
 * you plan) and is unit-tested in fuel.test.ts. Numbers follow the ranges in
 * the IOC / ISSN sport-nutrition consensus statements:
 *   - Carbohydrate scales with training load: ~3–5 g/kg on light days,
 *     5–7 g/kg for ~1 h/day moderate work, 6–10 g/kg for 1–3 h/day, up to
 *     ~10–12 g/kg for very high loads.
 *   - Protein 1.6–2.2 g/kg/day, higher on lifting days and when cutting.
 *   - Fat fills the remainder, floored at ~0.8 g/kg.
 * This is general guidance for healthy adults, not medical advice — the UI
 * says so.
 */

export type SessionType = 'run' | 'bike' | 'swim' | 'intervals' | 'lift' | 'hybrid' | 'sport' | 'mobility'
export type Intensity = 'easy' | 'moderate' | 'hard'
export type Goal = 'maintain' | 'cut' | 'gain'

export interface SessionInput {
  type: SessionType
  durationMin: number
  intensity: Intensity
}

export interface Targets {
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Weighted training minutes — the number the carb target is built from. */
  load: number
  dayType: 'rest' | 'light' | 'moderate' | 'high' | 'very high'
  /** Short, deterministic fueling cues (pre/during/post). */
  cues: string[]
}

export const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'run', label: 'Run' },
  { value: 'bike', label: 'Bike' },
  { value: 'swim', label: 'Swim' },
  { value: 'intervals', label: 'Intervals / HIIT' },
  { value: 'lift', label: 'Lift' },
  { value: 'hybrid', label: 'Hybrid (e.g. HYROX)' },
  { value: 'sport', label: 'Team sport' },
  { value: 'mobility', label: 'Mobility / yoga' },
]

/** How much a minute of each session type drives carbohydrate need. */
const CARB_WEIGHT: Record<SessionType, number> = {
  run: 1,
  bike: 1,
  swim: 1,
  intervals: 1.1,
  hybrid: 1,
  sport: 0.9,
  lift: 0.5, // strength work is less glycogen-hungry per minute
  mobility: 0.1,
}

const INTENSITY_MULT: Record<Intensity, number> = { easy: 0.7, moderate: 1, hard: 1.3 }

const ENDURANCE: SessionType[] = ['run', 'bike', 'swim', 'hybrid', 'sport', 'intervals']

export function sessionLoad(s: SessionInput): number {
  const minutes = Math.max(0, Math.min(s.durationMin || 0, 600))
  return minutes * CARB_WEIGHT[s.type] * INTENSITY_MULT[s.intensity]
}

const round = (n: number, step = 5) => Math.round(n / step) * step

export function dailyTargets(sessions: SessionInput[], weightKg: number, goal: Goal): Targets {
  const kg = Math.max(35, Math.min(weightKg || 70, 200))
  const load = sessions.reduce((sum, s) => sum + sessionLoad(s), 0)

  // Carbs: 3.5 g/kg floor, +~2 g/kg per weighted hour, capped at 10 g/kg.
  let carbPerKg = Math.min(10, 3.5 + (load / 60) * 2)
  const dayType: Targets['dayType'] =
    load < 15 ? 'rest' : load < 45 ? 'light' : load < 90 ? 'moderate' : load < 180 ? 'high' : 'very high'

  const lifts = sessions.some((s) => s.type === 'lift' || s.type === 'hybrid')
  let proteinPerKg = lifts ? 2.0 : 1.7
  let fatPerKg = 1.0

  if (goal === 'cut') {
    // Protect protein, trim carbs on easy days harder than on hard days.
    carbPerKg *= dayType === 'rest' || dayType === 'light' ? 0.8 : 0.9
    proteinPerKg += 0.2
    fatPerKg = 0.8
  } else if (goal === 'gain') {
    carbPerKg *= 1.1
    fatPerKg = 1.1
  }

  const carbs = round(carbPerKg * kg)
  const protein = round(proteinPerKg * kg)
  const fat = round(fatPerKg * kg)
  const kcal = round(carbs * 4 + protein * 4 + fat * 9, 10)

  return { kcal, protein, carbs, fat, load: Math.round(load), dayType, cues: fuelingCues(sessions, kg) }
}

export function fuelingCues(sessions: SessionInput[], kg: number): string[] {
  const cues: string[] = []
  const longest = sessions
    .filter((s) => ENDURANCE.includes(s.type))
    .reduce((m, s) => Math.max(m, s.durationMin), 0)
  const hardOrLong = sessions.some(
    (s) => s.intensity === 'hard' || (ENDURANCE.includes(s.type) && s.durationMin >= 60),
  )

  if (sessions.length === 0) {
    cues.push('Rest day: keep protein steady across 3–4 meals; carbs can come mostly from whole foods.')
    return cues
  }
  if (hardOrLong) {
    cues.push(`Pre-session (1–4 h before): ~${round(1 * kg)}–${round(2 * kg)} g carbs, low fat and fiber.`)
  }
  if (longest >= 150) {
    cues.push('During: 60–90 g carbs per hour (mix glucose + fructose), plus fluids and sodium.')
  } else if (longest >= 75) {
    cues.push('During: 30–60 g carbs per hour once you pass ~60 minutes.')
  }
  if (sessions.some((s) => s.type === 'lift' || s.type === 'hybrid')) {
    cues.push(`Post-lift: ~${round(0.3 * kg)} g protein within a couple of hours.`)
  }
  if (sessions.length >= 2) {
    cues.push(`Two sessions today: refuel between them with ~${round(1 * kg)} g carbs + protein.`)
  }
  return cues
}

export interface Totals {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export function sumMeals(meals: Totals[]): Totals {
  return meals.reduce(
    (t, m) => ({
      kcal: t.kcal + (m.kcal || 0),
      protein: t.protein + (m.protein || 0),
      carbs: t.carbs + (m.carbs || 0),
      fat: t.fat + (m.fat || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

/** Local-date helpers (YYYY-MM-DD) — dates are stored as strings, never UTC instants. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + n))
}

/** Monday-start week containing `iso`. */
export function weekOf(iso: string): string[] {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const offset = (date.getDay() + 6) % 7
  const monday = toISODate(new Date(y, m - 1, d - offset))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
