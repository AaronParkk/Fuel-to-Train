/**
 * Data hooks shared by the athlete and coach views.
 *
 * Every query returns only rows the RecordRoom lets this user read (own rows +
 * rows that list them in `coaches`), so "mine" vs "shared with me" is a
 * client-side split of an already-authorized set.
 */

import { useMemo } from 'react'
import { useAuthStatus, useQuery, useMutations, type RecordData } from 'deepspace'
import type { Athlete, CoachNote, FuelPlan, Meal, Session } from '../schemas/fuel-schemas'

export function useMe() {
  const { userId } = useAuthStatus()
  return userId
}

function mine<T>(rows: RecordData<T>[], me: string | null) {
  return me ? rows.filter((r) => r.createdBy === me) : []
}

export function useAthleteData(athleteId: string | null) {
  const athletes = useQuery<Athlete>('athletes')
  const sessions = useQuery<Session>('sessions', { orderBy: 'createdAt', orderDir: 'asc' })
  const meals = useQuery<Meal>('meals', { orderBy: 'createdAt', orderDir: 'asc' })
  const plans = useQuery<FuelPlan>('fuel_plans', { orderBy: 'updatedAt', orderDir: 'desc' })
  const notes = useQuery<CoachNote>('coach_notes', { orderBy: 'createdAt', orderDir: 'asc' })

  return useMemo(() => {
    const profile = mine(athletes.records, athleteId)[0] ?? null
    return {
      loading: [athletes, sessions, meals, plans].some((q) => q.status === 'loading'),
      profile,
      sessions: mine(sessions.records, athleteId),
      meals: mine(meals.records, athleteId),
      plans: mine(plans.records, athleteId),
      notes: notes.records.filter((n) => n.data.athleteId === athleteId),
      allAthletes: athletes.records,
    }
  }, [athletes, sessions, meals, plans, notes, athleteId])
}

export function useFuelMutations() {
  return {
    athletes: useMutations<Athlete>('athletes'),
    sessions: useMutations<Session>('sessions'),
    meals: useMutations<Meal>('meals'),
    plans: useMutations<FuelPlan>('fuel_plans'),
    notes: useMutations<CoachNote>('coach_notes'),
  }
}

export const KG_PER_LB = 0.45359237
