import { useState } from 'react'
import type { SimResult, ThreatModel } from '../types'
import { CountUp } from './CountUp'
import { PanelHeader } from './ControlPanel'

type Props = {
  result: SimResult | null
  runKey: number
  onExport: () => void
  exporting: boolean
}

export const THREAT_TEXT: Record<ThreatModel, { title: string; body: string }> = {
  rogue_node: {
    title: 'Rogue Node',
    body: 'In Rogue Node mode, the attacker is a member of the MANET. They have stable, repeated access to the target and can collect unlimited samples. Statistical averaging at this scale defeats probabilistic defenses like noise injection: only deterministic defenses (WCET padding) provide a mathematical guarantee.',
  },
  external: {
    title: 'External Attacker',
    body: 'The external attacker sits outside the network and times responses over the wire. They catch only a fraction of operations (15% here), each blurred by ~30ms of network jitter. A small residual leak can hide under that noise, but only because the attacker is sample-starved. Give them more samples, or let them inside, and it surfaces.',
  },
}

export function AttackerPanel({ result, runKey, onExport, exporting }: Props) {
  return (
    <aside className="panel flex min-h-0 flex-col">
      <PanelHeader index="03" title="Attacker View & Report" right={
        <button type="button" onClick={onExport} disabled={!result || exporting}
          className="flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 font-mono text-[11px] text-muted transition hover:border-data hover:text-ink disabled:opacity-40">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8 2v8m0 0L5 7m3 3 3-3M3 12.5h10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {exporting ? 'Building…' : 'Export PDF'}
        </button>
      } />
      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {result ? <Report key={runKey} result={result} runKey={runKey} /> : <Idle />}
      </div>
    </aside>
  )
}

function Report({ result, runKey }: { result: SimResult; runKey: number }) {
  const obs = result.stages[2]
  const leaked = result.attacker.leaked
  const tone = leaked ? '#f5825b' : '#1D9E75'
  const cfg = result.config

  return (
    <>
      {/* status card */}
      <div className="fade-up relative overflow-hidden rounded-xl border p-4"
        style={{ borderColor: `${tone}66`, background: `linear-gradient(160deg, ${tone}14, transparent 60%)` }}>
        <div className="label mb-3 flex items-center gap-2 !text-ink">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#f5825b" strokeWidth="1.8">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" fill="#f5825b" />
          </svg>
          Attacker Analysis
        </div>
        <div className="pulse mb-4 inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-[13px] font-bold tracking-wider"
          style={{ color: tone, background: `${tone}22`, border: `1px solid ${tone}`, '--pulse': tone } as React.CSSProperties}>
          {leaked ? '⚠ LEAK DETECTED' : '✓ DEFENSE HOLDING'}
        </div>
        <dl className="grid grid-cols-2 gap-y-2 font-mono text-[13px]">
          <dt className="text-muted">Gap</dt>
          <dd className="text-right text-lg font-bold tabular-nums" style={{ color: tone }}>
            <CountUp value={obs.gap_ms} runKey={runKey} />ms
          </dd>
          <dt className="text-muted">Threshold</dt>
          <dd className="text-right tabular-nums">{cfg.threshold_ms}ms</dd>
        </dl>
        <p className="mt-3 border-t border-line pt-3 text-[13px] leading-snug">
          <span className="text-muted">Verdict: </span>
          {leaked ? <>Secret bits <b style={{ color: tone }}>ARE</b> distinguishable</> : 'No signal extractable at T_obs'}
        </p>
      </div>

      {/* stage table */}
      <Block title="Statistical breakdown" delay={150}>
        <table className="w-full font-mono text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-dim">
              <th className="pb-2 font-normal">Stage</th>
              <th className="pb-2 text-right font-normal">Gap</th>
              <th className="pb-2 pl-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.stages.map((s, i) => {
              const internal = i < 2
              const color = !s.leaked ? '#3fd6a2' : internal ? '#f5c842' : '#ff9d7c'
              return (
                <tr key={s.stage} className="border-t border-line">
                  <td className="py-2 pr-2 text-ink">
                    {s.stage === 't_obs' ? 'T_obs' : s.label.replace(' Timing', '').replace(' Output', '')}
                    {!internal && <span className="text-attack"> (att.)</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums"><CountUp value={s.gap_ms} runKey={runKey} />ms</td>
                  <td className="py-2 pl-3 text-[11px]" style={{ color }}>
                    {s.leaked ? '⚠ LEAK' : '✓ SECURE'}
                    {internal && <span className="text-dim"> (int.)</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {cfg.threat_model === 'external' && Math.abs(result.true_t_obs_gap_ms - obs.gap_ms) > 0.5 && (
          <p className="mt-2 font-mono text-[11px] text-dim">
            True T_obs gap (all ops, no jitter): <span className="text-ink">{result.true_t_obs_gap_ms.toFixed(2)}ms</span>
          </p>
        )}
      </Block>

      {/* t-test */}
      <Block title="Welch's t-test" delay={300}>
        <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 font-mono text-[12.5px]">
          <dt className="text-muted">t-statistic</dt>
          <dd className="text-right tabular-nums"><CountUp value={obs.t_stat} decimals={3} runKey={runKey} /></dd>
          <dt className="text-muted">p-value</dt>
          <dd className="text-right tabular-nums">{obs.p_value < 1e-4 ? '< 0.0001' : obs.p_value.toFixed(4)}</dd>
          <dt className="text-muted">Samples used</dt>
          <dd className="text-right tabular-nums">{obs.n}</dd>
          <dt className="text-muted">Distinguishable</dt>
          <dd className="text-right font-bold" style={{ color: obs.distinguishable ? '#ff9d7c' : '#3fd6a2' }}>
            {obs.distinguishable ? 'YES' : 'NO'}
          </dd>
          {result.attacker.samples_to_break && (
            <>
              <dt className="text-muted">Ops to break (est.)</dt>
              <dd className="text-right tabular-nums text-attack-hi">~{result.attacker.samples_to_break.toLocaleString()}</dd>
            </>
          )}
        </dl>
        <p className="mt-2 text-[11px] text-dim">Leak requires gap &gt; threshold and p &lt; 0.001.</p>
      </Block>

      {result.recommendations.length > 0 && (
        <Block title={leaked ? 'Recommendations' : 'Caveat'} delay={450} accent={leaked ? '#f5825b' : '#f5c842'}>
          <ul className="space-y-2">
            {result.recommendations.map((r) => (
              <li key={r} className="flex gap-2 text-[12.5px] leading-snug">
                <span className="font-mono text-attack">→</span>
                <span className="text-ink/90">{r}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <ThreatCard model={cfg.threat_model} />
      <p className="text-center font-mono text-[10.5px] text-dim">seed {cfg.seed}</p>
    </>
  )
}

function ThreatCard({ model }: { model: ThreatModel }) {
  const [open, setOpen] = useState(true)
  const t = THREAT_TEXT[model]
  const color = model === 'rogue_node' ? '#f5825b' : '#378ADD'
  return (
    <div className="fade-up overflow-hidden rounded-xl border border-line" style={{ animationDelay: '600ms' }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 bg-panel-2/70 px-4 py-2.5 text-left">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="label !text-ink">Threat model: {t.title}</span>
        </span>
        <span className={`font-mono text-muted transition ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && (
        <blockquote className="border-l-2 px-4 py-3 text-[12.5px] leading-relaxed text-muted" style={{ borderColor: color }}>
          {t.body}
        </blockquote>
      )}
    </div>
  )
}

function Block({ title, children, delay = 0, accent }: { title: string; children: React.ReactNode; delay?: number; accent?: string }) {
  return (
    <section className="fade-up rounded-xl border border-line bg-bg/50 p-4" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="label mb-3 !text-[10px]" style={accent ? { color: accent } : undefined}>{title}</h3>
      {children}
    </section>
  )
}

function Idle() {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong text-center">
      <p className="label"><span className="blink text-attack">●</span> Attacker idle</p>
      <p className="mt-2 max-w-[14rem] text-[13px] text-dim">Run a simulation to see what the attacker can extract.</p>
    </div>
  )
}
