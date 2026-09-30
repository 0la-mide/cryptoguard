import type { SimConfig, SimResult } from '../types'
import { SCENARIOS, type ScenarioId } from './content'

// The visitor's last settings and run, kept in this browser only (localStorage).
// Bump the key if the saved shape changes so old data is ignored, not misread.
const KEY = 'cryptoguard.session.v1'

export type Session = {
  config: SimConfig
  activeScenario: ScenarioId | null
  result: SimResult | null
  stale: boolean
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<Session>
    if (!s.config || typeof s.config.samples !== 'number') return null
    const validScenario = SCENARIOS.some((x) => x.id === s.activeScenario)
    const validResult = !!s.result && Array.isArray(s.result.stages) && s.result.stages.length === 3
    return {
      config: s.config,
      activeScenario: validScenario ? s.activeScenario! : null,
      result: validResult ? s.result! : null,
      stale: !!s.stale,
    }
  } catch {
    return null
  }
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage full or blocked: the lab still works, it just won't remember */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}
