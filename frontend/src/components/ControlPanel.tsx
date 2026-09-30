import { PARAMS, SCENARIOS, type ParamKey, type ScenarioId } from '../lib/content'
import type { Mode } from '../lib/mode'
import type { SimConfig, ThreatModel } from '../types'
import type { GlossaryKey } from '../lib/glossary'
import { Term } from './Term'
import { Collapsible, Explainable, PanelHeader } from './ui'

const PARAM_TERM: Record<ParamKey, GlossaryKey> = {
  samples: 'samples', bit_gap_ms: 'gap', noise_std_ms: 'noise', alpha: 'alpha', kp: 'kp', ki: 'ki', kd: 'kd',
  setpoint_ms: 'setpoint', wcet: 'wcetPadding', wcet_budget_ms: 'wcet', threshold_ms: 'threshold', threat_model: 'threatModel',
}

export type JourneyStep = 1 | 2 | 3

type Props = {
  mode: Mode
  config: SimConfig
  onChange: (c: SimConfig) => void
  onRun: () => void
  running: boolean
  progress: number
  stageText: string
  activeScenario: ScenarioId | null
  onScenario: (id: ScenarioId) => void
  step: JourneyStep
}

export function ControlPanel(p: Props) {
  return p.mode === 'beginner' ? <GuidedPanel {...p} /> : <ProPanel {...p} />
}

// ── Beginner: choose → run → understand ────────────────────────────────────

function GuidedPanel({ config, onChange, onRun, running, progress, stageText, activeScenario, onScenario, step }: Props) {
  return (
    <aside className="panel flex min-h-0 flex-col">
      <div className="px-4 pt-4 pb-3">
        <h2 className="label !text-ink">Your experiment</h2>
        <Stepper step={step} />
      </div>

      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <StepTitle n={1} active={step === 1}>Choose a scenario</StepTitle>
        <div className="space-y-2" role="radiogroup" aria-label="Scenarios">
          {SCENARIOS.map((s) => {
            const on = activeScenario === s.id
            return (
              <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => onScenario(s.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  on ? 'border-data bg-data/10 shadow-[0_0_0_1px_rgba(55,138,221,.4)]' : 'border-line hover:border-line-strong'
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold">{s.title}</span>
                  <span className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] ${
                    s.config.threat_model === 'rogue_node' ? 'bg-attack/15 text-attack-hi' : 'bg-data/15 text-[#7db6ef]'
                  }`}>
                    {s.config.threat_model === 'rogue_node' ? 'insider' : 'outsider'}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-muted">{s.story}</p>
                {on && (
                  <p className="fade-up mt-2 border-t border-line pt-2 text-[11.5px] leading-snug text-ink/85">
                    <span className="font-mono text-warn">Watch for: </span>{s.watch}
                  </p>
                )}
              </button>
            )
          })}
        </div>

        <Collapsible title="Fine-tune settings" defaultOpen={false} hint="advanced">
          <Settings mode="beginner" config={config} onChange={onChange} />
        </Collapsible>
      </div>

      <div className="space-y-2.5 border-t border-line p-4">
        <StepTitle n={2} active={step === 2}>Run it</StepTitle>
        <RunButton onRun={onRun} running={running} progress={progress} stageText={stageText}
          disabled={!activeScenario && step === 1} label={activeScenario || step > 1 ? '▶ RUN SIMULATION' : 'PICK A SCENARIO FIRST'} />
      </div>
    </aside>
  )
}

function Stepper({ step }: { step: JourneyStep }) {
  const steps = ['Choose', 'Run', 'Understand']
  return (
    <ol className="mt-3 flex items-center gap-1.5 font-mono text-[10.5px]" aria-label="Progress">
      {steps.map((s, i) => {
        const n = i + 1
        const done = n < step, current = n === step
        return (
          <li key={s} className="flex flex-1 items-center gap-1.5" aria-current={current ? 'step' : undefined}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              done ? 'border-defend bg-defend text-[#04140e]' : current ? 'border-data text-ink' : 'border-line-strong text-dim'
            }`}>
              {done ? '✓' : n}
            </span>
            <span className={current ? 'text-ink' : done ? 'text-defend-hi' : 'text-dim'}>{s}</span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        )
      })}
    </ol>
  )
}

function StepTitle({ n, active, children }: { n: number; active: boolean; children: string }) {
  return (
    <h3 className={`flex items-center gap-2 text-[12.5px] font-semibold ${active ? 'text-ink' : 'text-muted'}`}>
      <span className={`font-mono text-[11px] ${active ? 'text-data' : 'text-dim'}`}>Step {n}</span>
      {children}
    </h3>
  )
}

// ── Pro ────────────────────────────────────────────────────────────────────

function ProPanel({ config, onChange, onRun, running, progress, stageText, activeScenario, onScenario }: Props) {
  return (
    <aside className="panel flex min-h-0 flex-col">
      <PanelHeader index="01" title="Control Panel" />
      <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-4">
        <Settings mode="pro" config={config} onChange={onChange} />
      </div>
      <div className="space-y-3 border-t border-line p-4">
        <div className="grid grid-cols-2 gap-1.5">
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" onClick={() => onScenario(s.id)}
              className={`rounded-md border px-2 py-1.5 text-[11.5px] font-medium transition last:col-span-2 ${
                activeScenario === s.id
                  ? s.risky ? 'border-attack/60 bg-attack/10 text-attack-hi' : 'border-defend/60 bg-defend/10 text-defend-hi'
                  : 'border-line text-muted hover:border-line-strong hover:text-ink'
              }`}>
              {s.name}
            </button>
          ))}
        </div>
        <RunButton onRun={onRun} running={running} progress={progress} stageText={stageText} label="▶ RUN SIMULATION" />
      </div>
    </aside>
  )
}

// ── Shared settings ────────────────────────────────────────────────────────

function Settings({ mode, config, onChange }: { mode: Mode; config: SimConfig; onChange: (c: SimConfig) => void }) {
  const set = <K extends keyof SimConfig>(k: K, v: SimConfig[K]) => onChange({ ...config, [k]: v })
  const plain = mode === 'beginner'
  const f0 = (v: number) => v.toFixed(0), f1 = (v: number) => v.toFixed(1), f2 = (v: number) => v.toFixed(2)

  return (
    <div className="space-y-4">
      <Collapsible title={plain ? 'The secret task' : 'Simulation'}>
        <Slider mode={mode} param="samples" value={config.samples} min={100} max={2000} step={50} format={f0}
          onChange={(v) => set('samples', v)} accent="data" />
        <Slider mode={mode} param="bit_gap_ms" unit="ms" value={config.bit_gap_ms} min={5} max={80} step={1} format={f0}
          onChange={(v) => set('bit_gap_ms', v)} accent="attack" />
        <Slider mode={mode} param="noise_std_ms" unit="ms" value={config.noise_std_ms} min={1} max={20} step={0.5} format={f1}
          onChange={(v) => set('noise_std_ms', v)} accent="data" />
      </Collapsible>

      <Collapsible title={plain ? 'The defense' : 'Defense'}>
        <Slider mode={mode} param="alpha" value={config.alpha} min={0.01} max={0.99} step={0.01} format={f2}
          onChange={(v) => set('alpha', v)} scale={['Heavy smoothing', 'Light smoothing']} />
        <Slider mode={mode} param="kp" value={config.kp} min={0.1} max={2} step={0.05} format={f2} onChange={(v) => set('kp', v)} />
        <Slider mode={mode} param="ki" value={config.ki} min={0.01} max={0.5} step={0.01} format={f2} onChange={(v) => set('ki', v)} />
        <Slider mode={mode} param="kd" value={config.kd} min={0.01} max={0.2} step={0.01} format={f2} onChange={(v) => set('kd', v)} />
        <Slider mode={mode} param="setpoint_ms" unit="ms" value={config.setpoint_ms} min={400} max={700} step={5} format={f0}
          onChange={(v) => set('setpoint_ms', v)} />

        <div className="rounded-lg border border-line bg-bg/60 p-3">
          <ParamLabel mode={mode} param="wcet" right={
            <Toggle checked={config.wcet_enabled} onChange={(v) => set('wcet_enabled', v)} label={PARAMS.wcet.plain} />
          } />
          {config.wcet_enabled && (
            <div className="fade-up mt-3">
              <Slider mode={mode} param="wcet_budget_ms" unit="ms" value={config.wcet_budget_ms} min={500} max={900} step={10}
                format={f0} onChange={(v) => set('wcet_budget_ms', v)} />
            </div>
          )}
        </div>
      </Collapsible>

      <Collapsible title={plain ? 'The attacker' : 'Threat model'}>
        <ParamLabel mode={mode} param="threat_model" />
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-bg p-1">
          {([
            ['external', plain ? 'Outsider' : 'External Attacker'],
            ['rogue_node', plain ? 'Insider' : 'Rogue Node'],
          ] as [ThreatModel, string][]).map(([id, name]) => {
            const on = config.threat_model === id
            return (
              <button key={id} type="button" onClick={() => set('threat_model', id)} aria-pressed={on}
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
            ? 'Sees every operation, with no network jitter.'
            : 'Sees 15% of operations through ~30ms of network jitter.'}
        </p>

        <ParamLabel mode={mode} param="threshold_ms" right={
          <div className="flex items-center rounded-md border border-line bg-bg focus-within:border-data">
            <input id="threshold" type="number" min={0.5} max={50} step={0.5} value={config.threshold_ms}
              aria-label={PARAMS.threshold_ms.plain}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!Number.isNaN(v)) set('threshold_ms', Math.min(50, Math.max(0.5, v)))
              }}
              className="w-16 bg-transparent px-2 py-1.5 text-right font-mono text-[13px] outline-none" />
            <span className="pr-2 font-mono text-[11px] text-dim">ms</span>
          </div>
        } />
      </Collapsible>
    </div>
  )
}

/**
 * Beginner: plain name, the technical term beside it, and the explanation always visible.
 * Pro: technical name with a tap-to-open explanation.
 */
function ParamLabel({ mode, param, right, htmlFor }: { mode: Mode; param: ParamKey; right?: React.ReactNode; htmlFor?: string }) {
  const p = PARAMS[param]
  if (mode === 'beginner') {
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-ink">
            <label htmlFor={htmlFor}>{p.plain}</label>{' '}
            <span className="ml-1 rounded bg-panel-2 px-1 py-px font-mono text-[10px] text-dim">
              <Term k={PARAM_TERM[param]}>{p.pro}</Term>
            </span>
          </span>
          {right}
        </div>
        <p className="mt-0.5 text-[11.5px] leading-snug text-dim">{p.what}</p>
      </div>
    )
  }
  return (
    <Explainable text={p.what} label={
      <div className="flex flex-1 items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] text-muted">{p.pro}</label>
        {right}
      </div>
    } />
  )
}

const ACCENTS = { defend: '#1D9E75', attack: '#f5825b', data: '#378ADD' }

function Slider({ mode, param, unit, value, min, max, step, format, onChange, accent = 'defend', scale }: {
  mode: Mode
  param: ParamKey
  unit?: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  accent?: keyof typeof ACCENTS
  scale?: [string, string]
}) {
  const fill = ((value - min) / (max - min)) * 100
  const id = `s-${param}`
  return (
    <div>
      <ParamLabel mode={mode} param={param} htmlFor={id} right={
        <span className="font-mono text-[13px] tabular-nums" style={{ color: ACCENTS[accent] }}>
          {format(value)}{unit && <span className="ml-0.5 text-[11px] text-dim">{unit}</span>}
        </span>
      } />
      <input id={id} type="range" className="slider mt-1" min={min} max={max} step={step} value={value}
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition ${
        checked ? 'border-defend bg-defend/30' : 'border-line-strong bg-panel-2'
      }`}>
      <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
        checked ? 'left-[18px] bg-defend-hi' : 'left-0.5 bg-dim'
      }`} />
    </button>
  )
}

function RunButton({ onRun, running, progress, stageText, label, disabled }: {
  onRun: () => void
  running: boolean
  progress: number
  stageText: string
  label: string
  disabled?: boolean
}) {
  return (
    <button type="button" onClick={onRun} disabled={running || disabled}
      className={`group relative w-full overflow-hidden rounded-lg py-3 font-mono text-[13px] font-bold tracking-[0.18em] transition ${
        disabled && !running
          ? 'cursor-not-allowed bg-panel-2 text-dim shadow-[inset_0_0_0_1px_#34345a]'
          : 'bg-defend text-[#04140e] shadow-[0_0_24px_-4px_rgba(29,158,117,.6)] hover:bg-defend-hi disabled:cursor-wait'
      }`}>
      {running ? (
        <>
          <span className="absolute inset-y-0 left-0 bg-defend-hi/60 transition-[width] duration-200" style={{ width: `${progress}%` }} />
          <span className="relative text-[#04140e]">{stageText}</span>
        </>
      ) : (
        <span className="relative">{label}</span>
      )}
    </button>
  )
}
