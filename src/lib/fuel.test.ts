import { describe, expect, it } from 'vitest'
import { addDays, dailyTargets, sessionLoad, sumMeals, weekOf } from './fuel'

describe('fuel engine', () => {
  it('rest day sits near the carb floor', () => {
    const t = dailyTargets([], 80, 'maintain')
    expect(t.dayType).toBe('rest')
    expect(t.carbs).toBe(280) // 3.5 g/kg
    expect(t.protein).toBe(135) // 1.7 g/kg, rounded to 5
  })

  it('a long hard run raises carbs well above a lift day', () => {
    const run = dailyTargets([{ type: 'run', durationMin: 120, intensity: 'hard' }], 75, 'maintain')
    const lift = dailyTargets([{ type: 'lift', durationMin: 60, intensity: 'hard' }], 75, 'maintain')
    expect(run.carbs).toBeGreaterThan(lift.carbs + 200)
    expect(lift.protein).toBeGreaterThan(run.protein) // lifting bumps protein
  })

  it('caps carbs at 10 g/kg', () => {
    const t = dailyTargets([{ type: 'bike', durationMin: 400, intensity: 'hard' }], 70, 'maintain')
    expect(t.carbs).toBe(700)
    expect(t.dayType).toBe('very high')
  })

  it('cutting protects protein and trims carbs', () => {
    const s = [{ type: 'run' as const, durationMin: 45, intensity: 'moderate' as const }]
    const m = dailyTargets(s, 80, 'maintain')
    const c = dailyTargets(s, 80, 'cut')
    expect(c.carbs).toBeLessThan(m.carbs)
    expect(c.protein).toBeGreaterThan(m.protein)
  })

  it('emits during-session fueling cues for long efforts', () => {
    const t = dailyTargets([{ type: 'run', durationMin: 160, intensity: 'moderate' }], 70, 'maintain')
    expect(t.cues.some((c) => c.includes('60–90 g'))).toBe(true)
  })

  it('weights load by type and intensity', () => {
    expect(sessionLoad({ type: 'run', durationMin: 60, intensity: 'moderate' })).toBe(60)
    expect(sessionLoad({ type: 'lift', durationMin: 60, intensity: 'moderate' })).toBe(30)
  })

  it('sums meals and handles dates', () => {
    expect(sumMeals([{ kcal: 500, protein: 30, carbs: 60, fat: 15 }, { kcal: 200, protein: 10, carbs: 20, fat: 8 }]))
      .toEqual({ kcal: 700, protein: 40, carbs: 80, fat: 23 })
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(weekOf('2026-11-23')[0]).toBe('2026-11-23') // a Monday
    expect(weekOf('2026-11-29')[0]).toBe('2026-11-23')
  })
})
