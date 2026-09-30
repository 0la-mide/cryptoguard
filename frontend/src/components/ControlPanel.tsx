import type { ReactNode } from 'react'
import { PRESETS } from '../presets'
import type { SimConfig, ThreatModel } from '../types'

type Props = {
  config: SimConfig
  onChange: (c: SimConfig) => void
  onRun: () => void
  running: boolean
  progress: number
  stageText: string
  activePreset: string | null
  onPreset: (id: string) => void
}

export function ControlPanel({ config, onChange, onRun, running, progress, stageText, activePreset, onPreset }: Props) {
  const set = <K extends keyof SimConfig>(k: K, v: SimConfig[K]) => onChange({ ...config, [k]: v })

  return (
    <aside className="panel flex min-h-0 flex-col">
      <PanelHeader index="01" title="Control Panel" />
      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        <Section title="Simulation">
          <Slider label="Samples" value={config.samples} min={100} max={2000} step={50}
            format={(v) => v.toFixed(0)} onChange={(v) => set('samples', v)} accent="data" />
          <Slider label="Secret bit gap" unit="ms" value={config.bit_gap_ms} min={5} max={80} step={1}
            format={(v) => v.toFixed(0)} onChange={(v) => set('bit_gap_ms', v)} accent="attack"
            hint="Raw leakage: how much slower bit=1 runs than bit=0" />
          <Slider label="System noise σ" unit="ms" value={config.noise_std_ms} min={1} max={20} step={0.5}
            format={(v) => v.toFixed(1)} onChange={(v) => set('noise_std_ms', v)} accent="data" />
        </Section>

        <Section title="Defense">
          <Slider label="IIR α" value={config.alpha} min={0.01} max={0.99} step={0.01}
            format={(v) => v.toFixed(2)} onChange={(v) => set('alpha', v)}
            scale={['Heavy smoothing', 'Light smoothing']} />
          <Slider label="PID Kp" value={config.kp} min={0.1} max={2} step={0.05}
            format={(v) => v.toFixed(2)} onChange={(v) => set('kp', v)} />
          <Slider label="PID Ki" value={config.ki} min={0.01} max={0.5} step={0.01}
            format={(v) => v.toFixed(2)} onChange={(v) => set('ki', v)} />
          <Slider label="PID Kd" value={config.kd} min={0.01} max={0.2} step={0.01}
            format={(v) => v.toFixed(2)} onChange={(v) => set('kd', v)} />
          <Slider label="Setpoint T_ref" unit="ms" value={config.setpoint_ms} min={400} max={700} step={5}
            format={(v) => v.toFixed(0)} onChange={(v) => set('setpoint_ms', v)} />

          <div className="rounded-lg border border-line bg-bg/60 p-3">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-[13px] font-medium">WCET padding</span>
                <span className="block text-[11px] text-dim">Pad every op to a fixed budget</span>
              </span>
              <Toggle checked={config.wcet_enabled} onChange={(v) => set('wcet_enabled', v)} />
            </label>
            {config.wcet_enabled && (
              <div className="fade-up mt-3">
                <Slider label="WCET budget" unit="ms" value={config.wcet_budget_ms} min={500} max={900} step={10}
                  format={(v) => v.toFixed(0)} onChange={(v) => set('wcet_budget_ms', v)} />
              </div>
            )}
          </div>
        </Section>

        <Section title="Threat Model">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-bg p-1">
            {([['external', 'External Attacker'], ['rogue_node', 'Rogue Node']] as [ThreatModel, string][]).map(([id, name]) => {
              const on = config.threat_model === id
              return (
                <button key={id} type="button" onClick={() => set('threat_model', id)}
                  className={`rounded-md px-2 py-2 font-mono text-[11px] font-medium tracking-wide transition ${
                    on
                      ? id === 'rogue_node'
                        ? 'bg-attack/15 text-attack-hi shadow-[inset_0_0_0_1px_rgba(245,130,91,.5)]'
                        : 'bg-data/15 text-[#7db6ef] shadow-[inset_0_0_0_1px_rgba(55,138,221,.5)]'
                      : 'text-muted hover:text-ink'
                  }`}>
                  {name}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] leading-relaxed text-dim">
            {config.threat_model === 'rogue_node'
              ? 'Insider inside the MANET: every operation, zero network jitter.'
              : 'Outsider on the wire: sees 15% of operations through ~30ms of jitter.'}
          </p>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="threshold" className="text-[13px] text-muted">Leakage threshold</label>
            <div className="flex items-center rounded-md border border-line bg-bg focus-within:border-data">
              <input id="threshold" type="number" min={0.5} max={50} step={0.5}
                value={config.threshold_ms}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!Number.isNaN(v)) set('threshold_ms', Math.min(50, Math.max(0.5, v)))
                }}
                className="w-16 bg-transparent px-2 py-1.5 text-right font-mono text-[13px] outline-none" />
              <span className="pr-2 font-mono text-[11px] text-dim">ms</span>
            </div>
          </div>
        </Section>
      </div>

      <div className="space-y-3 border-t border-line p-4">
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" title={p.hint} onClick={() => onPreset(p.id)}
              className={`rounded-md border px-2 py-1.5 text-[11.5px] font-medium transition ${
                activePreset === p.id
                  ? p.id === 'rogue' || p.id === 'weak'
                    ? 'border-attack/60 bg-attack/10 text-attack-hi'
                    : 'border-defend/60 bg-defend/10 text-defend-hi'
                  : 'border-line text-muted hover:border-line-strong hover:text-ink'
              }`}>
              {p.name}
            </button>
          ))}
        </div>

        <button type="button" onClick={onRun} disabled={running}
          className="group relative w-full overflow-hidden rounded-lg bg-defend py-3 font-mono text-[13px] font-bold tracking-[0.18em] text-[#04140e] shadow-[0_0_24px_-4px_rgba(29,158,117,.6)] transition hover:bg-defend-hi disabled:cursor-wait">
          {running ? (
            <>
              <span className="absolute inset-y-0 left-0 bg-defend-hi/60 transition-[width] duration-200"
                style={{ width: `${progress}%` }} />
              <span className="relative">{stageText}</span>
            </>
          ) : (
            <span className="relative">▶ RUN SIMULATION</span>
          )}
        </button>
      </div>
    </aside>
  )
}

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5">
      <h3 className="label flex items-center gap-2 !text-[10px]">
        {title}
        <span className="h-px flex-1 bg-line" />
      </h3>
      {children}
    </section>
  )
}

const ACCENTS = { defend: '#1D9E75', attack: '#f5825b', data: '#378ADD' }

function Slider({ label, unit, value, min, max, step, format, onChange, accent = 'defend', hint, scale }: {
  label: string
  unit?: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  accent?: keyof typeof ACCENTS
  hint?: string
  scale?: [string, string]
}) {
  const fill = ((value - min) / (max - min)) * 100
  const id = `s-${label.replace(/\W+/g, '-')}`
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] text-muted" title={hint}>{label}</label>
        <span className="font-mono text-[13px] tabular-nums" style={{ color: ACCENTS[accent] }}>
          {format(value)}{unit && <span className="ml-0.5 text-[11px] text-dim">{unit}</span>}
        </span>
      </div>
      <input id={id} type="range" className="slider" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--fill': `${fill}%`, '--accent': ACCENTS[accent] } as React.CSSProperties} />
      {scale && (
        <div className="mt-0.5 flex justify-between font-mono text-[10px] text-dim">
          <span className={fill < 50 ? 'text-muted' : ''}>← {scale[0]}</span>
          <span className={fill >= 50 ? 'text-muted' : ''}>{scale[1]} →</span>
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition ${
        checked ? 'border-defend bg-defend/30' : 'border-line-strong bg-panel-2'
      }`}>
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
        checked ? 'left-[18px] bg-defend-hi' : 'left-0.5 bg-dim'
      }`} />
    </button>
  )
}
