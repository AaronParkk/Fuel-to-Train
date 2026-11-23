import { useState } from 'react'
import { Button } from '@/components/ui'
import type { RecordData } from 'deepspace'
import type { Athlete } from '../../schemas/fuel-schemas'
import type { Goal } from '../../lib/fuel'
import { KG_PER_LB, useFuelMutations } from '../../lib/useAthleteData'
import { fieldClass } from './parts'

export function ProfileForm({ profile, defaultName, onSaved }: { profile: RecordData<Athlete> | null; defaultName: string; onSaved?: () => void }) {
  const { athletes } = useFuelMutations()
  const [name, setName] = useState(profile?.data.displayName ?? defaultName)
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb')
  const initialKg = profile?.data.weightKg ?? 75
  const [weight, setWeight] = useState(String(Math.round(unit === 'lb' ? initialKg / KG_PER_LB : initialKg)))
  const [goal, setGoal] = useState<Goal>(profile?.data.goal ?? 'maintain')
  const [saving, setSaving] = useState(false)

  const weightKg = (Number(weight) || 0) * (unit === 'lb' ? KG_PER_LB : 1)
  const valid = name.trim().length > 0 && weightKg >= 35 && weightKg <= 200

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      const data = { displayName: name.trim(), weightKg: Math.round(weightKg * 10) / 10, goal }
      if (profile) await athletes.putConfirmed(profile.recordId, data)
      else await athletes.createConfirmed({ ...data, coaches: [] })
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Name</span>
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Body weight</span>
        <div className="flex gap-1">
          <input className={fieldClass + ' w-24'} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} data-testid="profile-weight" />
          <select
            className={fieldClass + ' w-16'}
            value={unit}
            onChange={(e) => {
              const next = e.target.value as 'lb' | 'kg'
              setWeight(String(Math.round(next === 'lb' ? weightKg / KG_PER_LB : weightKg)))
              setUnit(next)
            }}
          >
            <option value="lb">lb</option>
            <option value="kg">kg</option>
          </select>
        </div>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted-foreground">Goal</span>
        <select className={fieldClass} value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
          <option value="maintain">Maintain / perform</option>
          <option value="cut">Lean out</option>
          <option value="gain">Build</option>
        </select>
      </label>
      <div className="sm:col-span-3">
        <Button onClick={save} loading={saving} disabled={!valid || !athletes.ready} data-testid="profile-save">
          {profile ? 'Save profile' : 'Start fueling'}
        </Button>
      </div>
    </div>
  )
}
