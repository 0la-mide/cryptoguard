import { useState } from 'react'

export type Theme = 'dark' | 'light'
export const THEME_KEY = 'cryptoguard.theme'
const META_COLOR: Record<Theme, string> = { dark: '#0f0f1a', light: '#f4f5f9' }

// index.html applies the saved theme before first paint; this reads what it set.
const current = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

/** Dark by default; remembers the visitor's choice. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(current)
  const set = (t: Theme) => {
    document.documentElement.dataset.theme = t
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[t])
    try { localStorage.setItem(THEME_KEY, t) } catch { /* storage blocked: session-only */ }
    setTheme(t)
  }
  return [theme, set]
}
