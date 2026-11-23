/**
 * Fuel to Train collections.
 *
 * Sharing model: an athlete owns their rows (`createdBy`). Every row carries a
 * `coaches` JSON array of userIds, declared as `collaboratorsField`, so the
 * RecordRoom lets a listed coach READ the row and nothing else. Writes stay
 * 'own'. Because this runs in the Durable Object's canRead(), rows a coach is
 * not listed on never reach their socket — it is not client-side filtering.
 *
 * Coach notes invert that: the coach owns the note and lists the athlete in
 * `coaches` (the field name is the collaborator list, whoever is on it).
 */

import type { CollectionSchema } from 'deepspace/schema'

const coachesColumn = { name: 'coaches', storage: 'text', interpretation: { kind: 'json' } } as const

const athleteOwned = {
  collaboratorsField: 'coaches',
  permissions: {
    viewer: { read: 'collaborator', create: false, update: false, delete: false },
    member: { read: 'collaborator', create: true, update: 'own', delete: 'own' },
    admin: { read: 'collaborator', create: true, update: 'own', delete: 'own' },
  },
} satisfies Pick<CollectionSchema, 'collaboratorsField' | 'permissions'>

/** One row per athlete: body weight + goal drive every target. */
export const athletesSchema: CollectionSchema = {
  name: 'athletes',
  columns: [
    { name: 'displayName', storage: 'text', interpretation: 'plain' },
    { name: 'weightKg', storage: 'number', interpretation: 'plain' },
    { name: 'goal', storage: 'text', interpretation: { kind: 'select', options: ['maintain', 'cut', 'gain'] } },
    coachesColumn,
  ],
  ...athleteOwned,
}

/** Planned (or completed) training sessions. */
export const sessionsSchema: CollectionSchema = {
  name: 'sessions',
  columns: [
    { name: 'date', storage: 'text', interpretation: 'plain', required: true },
    {
      name: 'type',
      storage: 'text',
      interpretation: {
        kind: 'select',
        options: ['run', 'bike', 'swim', 'intervals', 'lift', 'hybrid', 'sport', 'mobility'],
      },
    },
    { name: 'durationMin', storage: 'number', interpretation: 'plain' },
    { name: 'intensity', storage: 'text', interpretation: { kind: 'select', options: ['easy', 'moderate', 'hard'] } },
    { name: 'timeOfDay', storage: 'text', interpretation: 'plain' },
    { name: 'notes', storage: 'text', interpretation: 'plain' },
    { name: 'done', storage: 'number', interpretation: { kind: 'boolean' } },
    coachesColumn,
  ],
  ...athleteOwned,
}

/** Logged meals. Macros may be AI-estimated (`estimated`) or typed in. */
export const mealsSchema: CollectionSchema = {
  name: 'meals',
  columns: [
    { name: 'date', storage: 'text', interpretation: 'plain', required: true },
    { name: 'description', storage: 'text', interpretation: 'plain' },
    { name: 'label', storage: 'text', interpretation: 'plain' },
    { name: 'kcal', storage: 'number', interpretation: 'plain' },
    { name: 'protein', storage: 'number', interpretation: 'plain' },
    { name: 'carbs', storage: 'number', interpretation: 'plain' },
    { name: 'fat', storage: 'number', interpretation: 'plain' },
    { name: 'estimated', storage: 'number', interpretation: { kind: 'boolean' } },
    coachesColumn,
  ],
  ...athleteOwned,
}

/** AI-written fueling plan for one day (latest wins). */
export const fuelPlansSchema: CollectionSchema = {
  name: 'fuel_plans',
  columns: [
    { name: 'date', storage: 'text', interpretation: 'plain', required: true },
    { name: 'plan', storage: 'text', interpretation: 'plain' },
    { name: 'basis', storage: 'text', interpretation: 'plain' },
    coachesColumn,
  ],
  ...athleteOwned,
}

/** Coach → athlete notes on a given day. Owned by the coach. */
export const coachNotesSchema: CollectionSchema = {
  name: 'coach_notes',
  columns: [
    { name: 'athleteId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'date', storage: 'text', interpretation: 'plain', required: true },
    { name: 'text', storage: 'text', interpretation: 'plain' },
    { name: 'coachName', storage: 'text', interpretation: 'plain' },
    coachesColumn,
  ],
  ...athleteOwned,
}

export interface Athlete {
  displayName: string
  weightKg: number
  goal: 'maintain' | 'cut' | 'gain'
  coaches: string[]
}
export interface Session {
  date: string
  type: import('../lib/fuel').SessionType
  durationMin: number
  intensity: import('../lib/fuel').Intensity
  timeOfDay?: string
  notes?: string
  done?: boolean
  coaches: string[]
}
export interface Meal {
  date: string
  description: string
  label?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  estimated?: boolean
  coaches: string[]
}
export interface FuelPlan {
  date: string
  plan: string
  basis?: string
  coaches: string[]
}
export interface CoachNote {
  athleteId: string
  date: string
  text: string
  coachName?: string
  coaches: string[]
}
