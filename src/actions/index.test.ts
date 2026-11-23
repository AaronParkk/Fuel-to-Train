import { describe, expect, it } from 'vitest'
import { parseMealEstimate } from './index'

describe('parseMealEstimate', () => {
  it('reads JSON wrapped in prose and clamps values', () => {
    const e = parseMealEstimate('Sure! {"label":"Burrito bowl","kcal":780,"protein":45,"carbs":90,"fat":24} done')
    expect(e).toEqual({ label: 'Burrito bowl', kcal: 780, protein: 45, carbs: 90, fat: 24 })
  })
  it('recomputes kcal when it disagrees with the macros', () => {
    const e = parseMealEstimate('{"label":"x","kcal":5000,"protein":30,"carbs":50,"fat":10}')
    expect(e.kcal).toBe(410)
  })
  it('throws on non-JSON', () => {
    expect(() => parseMealEstimate('no idea')).toThrow()
  })
})
