// Chart colours as CSS variables, so they follow the light/dark theme (see index.css).
export const C = {
  bit0: 'var(--color-data)',
  bit1: 'var(--color-attack)',
  defend: 'var(--color-defend)',
  attack: 'var(--color-attack)',
  warn: 'var(--color-warn)',
  grid: 'var(--color-line)',
  axis: 'var(--color-dim)',
  idle: 'var(--color-line-strong)',
  panel: 'var(--color-panel)',
  ink: 'var(--color-ink)',
  muted: 'var(--color-muted)',
  defendHi: 'var(--color-defend-hi)',
  attackHi: 'var(--color-attack-hi)',
}

export type Tone = 'attack' | 'warn' | 'defend'
export const toneColor = (t: Tone) => (t === 'attack' ? C.attack : t === 'warn' ? C.warn : C.defend)
/** Text-safe variant of a tone (darker in light mode). */
export const toneText = (t: Tone) => (t === 'attack' ? C.attackHi : t === 'warn' ? C.warn : C.defendHi)

/** `color` at `pct`% opacity; works with CSS variables, unlike hex-alpha suffixes. */
export const alpha = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`
