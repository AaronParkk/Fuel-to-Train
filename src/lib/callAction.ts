/**
 * Fetch wrapper for server actions at /api/actions/:name (pattern from the
 * DeepSpace StoryNest example). Sends the session JWT as a bearer token; the
 * worker verifies it before the action runs.
 */

import { getAuthToken } from 'deepspace'

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function callAction<T>(name: string, body: unknown, timeoutMs = 60_000): Promise<ActionResult<T>> {
  let token: string | null = null
  try {
    token = await getAuthToken()
  } catch {
    token = null
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
    return (await res.json()) as ActionResult<T>
  } catch (err) {
    if (controller.signal.aborted) return { success: false, error: 'Timed out — try again.' }
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  } finally {
    clearTimeout(timer)
  }
}
