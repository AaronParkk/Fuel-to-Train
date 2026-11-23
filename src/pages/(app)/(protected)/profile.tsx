/**
 * Profile & sharing. Adding a coach writes their userId into the `coaches`
 * collaborator list on every row this athlete owns — that list is what the
 * RecordRoom checks on read, so removing a coach revokes access server-side
 * on the next sync.
 */

import { useState } from 'react'
import { useAuthProfileReady } from 'deepspace'
import { X } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { ProfileForm } from '../../../components/fuel/ProfileForm'
import { Card, fieldClass } from '../../../components/fuel/parts'
import { useAthleteData, useFuelMutations, useMe } from '../../../lib/useAthleteData'

export default function ProfilePage() {
  const me = useMe()
  const { user } = useAuthProfileReady({ requireUser: true })
  const data = useAthleteData(me)
  const mutations = useFuelMutations()
  const { success, error } = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  if (data.loading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>

  const coaches = data.profile?.data.coaches ?? []

  async function setCoaches(next: string[]) {
    if (!data.profile) return
    setBusy(true)
    try {
      await mutations.athletes.putConfirmed(data.profile.recordId, { coaches: next })
      // Propagate to every row this athlete owns so access matches the list.
      await Promise.all([
        ...data.sessions.map((r) => mutations.sessions.put(r.recordId, { coaches: next })),
        ...data.meals.map((r) => mutations.meals.put(r.recordId, { coaches: next })),
        ...data.plans.map((r) => mutations.plans.put(r.recordId, { coaches: next })),
      ])
      return true
    } catch (e) {
      error('Could not update sharing', e instanceof Error ? e.message : undefined)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addCoach() {
    const id = code.trim()
    if (!id) return
    if (id === me) return error('That is your own code', 'Ask your coach for theirs from the Coach tab.')
    if (coaches.includes(id)) return error('Already shared with that coach')
    if (await setCoaches([...coaches, id])) {
      setCode('')
      success('Coach added', 'They can now see your plan, meals and targets (read-only).')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <Card title="Body & goal">
        <ProfileForm profile={data.profile} defaultName={user?.name ?? ''} onSaved={() => success('Saved')} />
      </Card>
      {data.profile && (
        <Card title="Coaches">
          <p className="mb-3 text-sm text-muted-foreground">
            Paste your coach’s code (they find it on their Coach tab). Coaches can read your training, meals, targets and plans, and leave notes. They can’t edit anything.
          </p>
          <div className="flex gap-2">
            <input className={fieldClass} placeholder="Coach code" value={code} onChange={(e) => setCode(e.target.value)} data-testid="coach-code-input" />
            <Button onClick={addCoach} loading={busy} disabled={!code.trim()} data-testid="coach-add">Share</Button>
          </div>
          {coaches.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {coaches.map((c) => (
                <li key={c} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <code className="truncate text-xs">{c}</code>
                  <button aria-label="Remove coach" disabled={busy} onClick={() => void setCoaches(coaches.filter((x) => x !== c))} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}
