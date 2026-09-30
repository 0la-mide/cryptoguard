import { useState } from 'react'

export type Mode = 'beginner' | 'pro'
const KEY = 'cryptoguard.mode'

function read(): Mode {
  try {
    return localStorage.getItem(KEY) === 'pro' ? 'pro' : 'beginner'
  } catch {
    return 'beginner'
  }
}

/** Beginner by default; remembers the visitor's choice. */
export function useMode(): [Mode, (m: Mode) => void] {
  const [mode, setMode] = useState<Mode>(read)
  const set = (m: Mode) => {
    setMode(m)
    try { localStorage.setItem(KEY, m) } catch { /* storage blocked: session-only */ }
  }
  return [mode, set]
}
