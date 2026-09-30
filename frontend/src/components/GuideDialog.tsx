import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Mode } from '../lib/mode'

type Props = {
  mode: Mode
  onClose: () => void
  onSwitchMode: (m: Mode) => void
  onReset: () => void
  hasSaved: boolean
}

export function GuideDialog({ mode, onClose, onSwitchMode, onReset, hasSaved }: Props) {
  const [tab, setTab] = useState<Mode>(mode)
  const dialog = useRef<HTMLDivElement>(null)

  // Focus the dialog on open, close on Escape, and hand focus back to the Guide button afterwards.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    dialog.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="guide-title" tabIndex={-1}
        className="fade-up flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
          <div>
            <p className="label mb-1 !text-defend-hi">Guide</p>
            <h2 id="guide-title" className="text-xl font-semibold">How to use CryptoGuard</h2>
            <p className="mt-1 text-[13px] text-muted">
              Two ways to use the same lab. You're in <b className="text-ink">{mode === 'pro' ? 'Pro' : 'Beginner'}</b> mode.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close guide"
            className="rounded-md border border-line px-2 py-1 font-mono text-[12px] text-muted hover:border-line-strong hover:text-ink">
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b border-line px-6 pt-3" role="tablist">
          {([['beginner', 'Beginner mode'], ['pro', 'Pro mode']] as const).map(([id, name]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-[13px] transition ${
                tab === id ? 'border-data text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}>
              {name}{mode === id && <span className="ml-1.5 font-mono text-[10px] text-dim">(current)</span>}
            </button>
          ))}
        </div>

        <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-6 py-5" role="tabpanel">
          {tab === 'beginner' ? <BeginnerGuide /> : <ProGuide />}

          {tab !== mode && (
            <button type="button" onClick={() => { onSwitchMode(tab); onClose() }}
              className="rounded-md border border-data bg-data/15 px-3 py-1.5 text-[13px] text-ink hover:bg-data/25">
              Switch to {tab === 'pro' ? 'Pro' : 'Beginner'} mode →
            </button>
          )}

          <Section title="Good to know (both modes)">
            <Items items={[
              ['Nothing runs by itself', 'A simulation only starts when you press Run (or a "Try …" button). Switching modes, picking a scenario or reloading the page never starts one.'],
              ['Switching modes keeps your work', 'Beginner and Pro are two views of the same lab. Your settings and your last result carry over.'],
              ['Saved in this browser', 'Your settings and last result are remembered on this device, so they\'re still here after a reload. They aren\'t sent anywhere or shared.'],
              ['Dotted words', 'Hover over, or tap, any dotted-underlined word for a plain-English explanation. The full glossary is at the bottom of How it works.'],
              ['Screen size', 'Use a tablet or computer. Phones get a notice instead of the lab.'],
            ]} />
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg/60 p-3">
              <span className="flex-1 text-[12.5px] text-muted">Start fresh: forget the saved settings and result.</span>
              <button type="button" onClick={onReset} disabled={!hasSaved}
                className="rounded-md border border-attack/50 px-3 py-1.5 text-[12.5px] text-attack-hi transition hover:bg-attack/10 disabled:cursor-not-allowed disabled:opacity-40">
                Clear saved session
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function BeginnerGuide() {
  return (
    <>
      <p className="text-[14px] leading-relaxed text-muted">
        For anyone new to security or statistics. The lab walks you through three steps and explains every result in plain words.
      </p>
      <Section title="The three steps">
        <ol className="grid gap-2 md:grid-cols-3">
          {[
            ['1', 'Choose', 'Pick a scenario card on the left. Each one tells a short story and says what to watch for.'],
            ['2', 'Run', 'Press Run. The server performs a few hundred secret operations while the attacker times them.'],
            ['3', 'Understand', 'Read "What happened" on the right. Press its "Try …" button to run the suggested next scenario.'],
          ].map(([n, t, d]) => (
            <li key={n} className="flex gap-3 rounded-lg border border-line p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-data font-mono text-[11px] text-data">{n}</span>
              <span className="text-[12.5px]"><b className="block text-ink">{t}</b><span className="text-muted">{d}</span></span>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Reading the charts">
        <Items items={[
          ['Blue and orange', 'Operations whose secret bit was 0 (blue) or 1 (orange).'],
          ['Green band', 'The safe zone. Differences smaller than this are allowed.'],
          ['Two separate humps', 'The attacker can tell the bits apart: the secret leaks. One overlapping hump means it\'s hidden.'],
          ['Left to right', 'Inside the server → after averaging → what the attacker sees. Only the last one matters to the attacker.'],
        ]} />
      </Section>
      <Section title="Optional">
        <Items items={[
          ['Fine-tune settings', 'Open it under the scenario cards to change any setting. Each one has a plain explanation beside it.'],
          ['Tap a box in the diagram', 'Shows what that step does and its numbers.'],
          ['Suggested order', 'Leaky server → Well-tuned defense → Insider attack → Constant-time padding. Together they tell the whole story.'],
        ]} />
      </Section>
    </>
  )
}

function ProGuide() {
  return (
    <>
      <p className="text-[14px] leading-relaxed text-muted">
        The full technical dashboard: every parameter, the raw statistics, and the attacker's report.
      </p>
      <Section title="Control panel (left)">
        <Items items={[
          ['Parameters', 'Samples, secret bit gap and noise σ; IIR α; PID Kp, Ki and Kd; setpoint T_ref; optional WCET padding and budget. Each "?" opens a short explanation.'],
          ['Threat model', 'External attacker (15% of operations, ~30ms jitter) or rogue node (every operation, no jitter).'],
          ['Presets', 'Load a set of parameters. Nothing runs until you press Run.'],
        ]} />
      </Section>
      <Section title="Pipeline (centre)">
        <Items items={[
          ['Diagram', 'Click a stage (Crypto Op, Raw Timing, IIR, PID, WCET, T_obs) to see its statistics.'],
          ['Histograms', 'bit=0 against bit=1 at each stage, with the ±threshold safe zone around T_ref.'],
          ['Scatter', 'The attacker\'s actual samples of T_obs over time: only the operations they observed, with jitter applied.'],
        ]} />
      </Section>
      <Section title="Attacker report (right)">
        <Items items={[
          ['Verdict', 'LEAK only if the observed gap exceeds the threshold and Welch\'s t-test gives p < 0.001.'],
          ['Statistics', 'Per-stage gap table, t-statistic, p-value, sample count, and an estimate of the operations needed to break it.'],
          ['Recommendations', 'Generated from this run\'s numbers, not a fixed list.'],
          ['Export PDF', 'Re-runs the same seed on the server and downloads a report with the charts.'],
        ]} />
      </Section>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="label mb-2.5 !text-[10.5px]">{title}</h3>
      {children}
    </section>
  )
}

function Items({ items }: { items: [string, string][] }) {
  return (
    <dl className="space-y-2">
      {items.map(([t, d]) => (
        <div key={t} className="grid gap-1 text-[13px] md:grid-cols-[180px_1fr] md:gap-4">
          <dt className="font-medium text-ink">{t}</dt>
          <dd className="leading-relaxed text-muted">{d}</dd>
        </div>
      ))}
    </dl>
  )
}
