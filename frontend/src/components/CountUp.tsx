import { useEffect, useRef, useState } from 'react'

/** Animates from the previous value to `value`. Re-triggers when `runKey` changes. */
export function CountUp({ value, decimals = 2, duration = 900, runKey }: {
  value: number
  decimals?: number
  duration?: number
  runKey?: unknown
}) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const start = performance.now()
    const a = runKey !== undefined ? 0 : from.current
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = a + (value - a) * eased
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, runKey])

  return <>{shown.toFixed(decimals)}</>
}
