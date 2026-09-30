import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GLOSSARY, type GlossaryKey } from '../lib/glossary'

// Anchored with top or bottom (not a transform): the fade-in animation owns `transform`.
type Pos = { left: number; top?: number; bottom?: number }
const WIDTH = 300

/**
 * A glossary term with a dotted underline. The explanation appears:
 *  - on mouse hover (desktop / presenting from a laptop),
 *  - on tap, and stays until you tap elsewhere (touchscreens),
 *  - on keyboard focus (Tab), closing with Escape.
 * The card is portalled to <body> so scrolling panels never clip it.
 */
export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const g = GLOSSARY[k]
  const id = useId()
  const trigger = useRef<HTMLSpanElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const [pos, setPos] = useState<Pos | null>(null)
  const [pinned, setPinned] = useState(false)

  const show = () => {
    window.clearTimeout(closeTimer.current)
    const r = trigger.current?.getBoundingClientRect()
    if (!r) return
    const left = Math.min(Math.max(8, r.left + r.width / 2 - WIDTH / 2), window.innerWidth - WIDTH - 8)
    const above = r.top > 230
    setPos(above ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 })
  }
  const hideSoon = () => {
    if (pinned) return
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setPos(null), 120)
  }
  const toggle = () => {
    if (pinned) close()
    else { setPinned(true); show() }
  }
  const close = () => {
    setPinned(false)
    setPos(null)
  }

  // While open: close on outside tap, Escape, or scroll (the card would drift from its word).
  useEffect(() => {
    if (!pos) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!trigger.current?.contains(t) && !card.current?.contains(t)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onScroll = (e: Event) => {
      if (!card.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [pos])

  return (
    <>
      {/* A span, not a <button>: buttons render inline-block, which lets a following comma wrap away. */}
      <span
        ref={trigger}
        role="button"
        tabIndex={0}
        aria-describedby={pos ? id : undefined}
        aria-expanded={!!pos}
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hideSoon()}
        onFocus={show}
        onBlur={() => !pinned && hideSoon()}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() }
        }}
        className={`cursor-help rounded-sm underline decoration-dotted decoration-[#378ADD]/80 decoration-[1.5px] underline-offset-[3px] transition hover:decoration-[#378ADD] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-data ${
          pos ? 'text-ink decoration-[#378ADD] decoration-solid' : ''
        }`}
      >
        {children ?? g.term}
      </span>
      {pos && createPortal(
        <div
          ref={card}
          id={id}
          role="tooltip"
          onPointerEnter={() => window.clearTimeout(closeTimer.current)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && hideSoon()}
          className="fade-up fixed z-50 rounded-xl border border-line-strong bg-panel-2 p-3.5 text-left shadow-[0_18px_50px_-12px_rgba(0,0,0,.8)]"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: WIDTH }}
        >
          <p className="mb-1 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#7db6ef]">
            <span className="h-1.5 w-1.5 rounded-full bg-data" /> {g.term}
          </p>
          <p className="text-[13.5px] leading-relaxed text-ink">{g.plain}</p>
          {'like' in g && g.like && (
            <p className="mt-2 border-t border-line pt-2 text-[12.5px] leading-relaxed text-muted">
              <span className="font-semibold text-warn">Think of it like: </span>{g.like}
            </p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
