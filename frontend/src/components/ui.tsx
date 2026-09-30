import { useId, useState, type ReactNode } from 'react'

export function PanelHeader({ index, title, right }: { index: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] text-dim">{index}</span>
        <h2 className="label !text-ink">{title}</h2>
      </div>
      {right}
    </div>
  )
}

/**
 * An explanation that opens on tap/click, not hover, so it works on touchscreens.
 * Renders inline below its trigger instead of floating over content.
 */
export function Explainable({ label, children, text }: { label: ReactNode; children?: ReactNode; text: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {label}
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
          aria-label={open ? 'Hide explanation' : 'What is this?'}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition ${
            open ? 'border-data bg-data/20 text-ink' : 'border-line-strong text-dim hover:border-data hover:text-ink'
          }`}>
          ?
        </button>
      </div>
      {children}
      {open && (
        <p id={id} className="fade-up mt-1.5 rounded-md border-l-2 border-data bg-data/5 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-muted">
          {text}
        </p>
      )}
    </div>
  )
}

export function Collapsible({ title, defaultOpen = true, children, hint }: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  hint?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
        className="group flex w-full items-center gap-2 py-1 text-left">
        <span className={`font-mono text-[11px] text-dim transition ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="label !text-[10px] group-hover:!text-ink">{title}</span>
        <span className="h-px flex-1 bg-line" />
        {!open && hint && <span className="font-mono text-[10px] text-dim">{hint}</span>}
      </button>
      {open && <div id={id} className="fade-up mt-2.5 space-y-4">{children}</div>}
    </section>
  )
}
