import type { Mode } from '../lib/mode'
import { stageTones, type Focus } from '../lib/stages'
import { C, toneColor, type Tone } from '../lib/theme'
import type { SimConfig, SimResult } from '../types'
import { Histogram, Scatter } from './Charts'
import { PanelHeader } from './ui'

type Props = {
  mode: Mode
  result: SimResult | null
  config: SimConfig
  running: boolean
  focus: Focus
  onFocus: (f: Focus) => void
  runKey: number
}

const CHART_TITLES = {
  beginner: [
    ['Inside the server', 'Raw timing, before any defense'],
    ['After averaging', 'What the defense uses to decide its delay'],
    ['What the attacker sees', 'T_obs: the response time they measure'],
  ],
  pro: [['Raw Timing'], ['IIR Output'], ['T_obs (attacker)']],
} as const

export function PipelinePanel({ mode, result, config, running, focus, onFocus, runKey }: Props) {
  const tones = result ? stageTones(result) : null
  const cfg = result?.config ?? config
  const chartFocus = focus === 'pid' || focus === 'wcet' ? 't_obs' : focus === 'crypto' ? 'raw' : focus
  const plain = mode === 'beginner'

  return (
    <section className="panel flex min-h-0 flex-col">
      <PanelHeader index="02" title={plain ? 'What happens to the timing' : 'Live Pipeline Visualiser'} right={
        <div className="flex items-center gap-3 font-mono text-[10.5px] text-muted">
          <Legend color={C.bit0} label={plain ? 'secret bit 0' : 'bit=0'} />
          <Legend color={C.bit1} label={plain ? 'secret bit 1' : 'bit=1'} />
          <Legend color={C.defend} label={plain ? 'safe zone' : `±${cfg.threshold_ms}ms safe zone`} square />
        </div>
      } />

      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {plain && !result && !running ? (
          <Welcome />
        ) : (
          <Diagram mode={mode} result={result} config={config} running={running} focus={focus} onFocus={onFocus} />
        )}

        {result && tones ? (
          <>
            {plain && <ReadingGuide threshold={cfg.threshold_ms} />}
            <StageDetail mode={mode} result={result} focus={focus} />
            <div key={runKey} className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {result.stages.map((s, i) => {
                const [title, subtitle] = CHART_TITLES[mode][i] as readonly [string, string?]
                return (
                  <button key={s.stage} type="button" className="text-left"
                    onClick={() => onFocus(s.stage)} aria-pressed={chartFocus === s.stage}>
                    <Histogram stage={s} title={title} subtitle={subtitle} setpoint={cfg.setpoint_ms}
                      threshold={cfg.threshold_ms} tone={tones[i]} delay={i * 320} focused={chartFocus === s.stage} runKey={runKey} />
                  </button>
                )
              })}
            </div>
            <figure className="panel fade-up p-3" style={{ animationDelay: '900ms' }}>
              <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium">
                  {plain ? 'Every response the attacker timed' : 'T_obs over time'}{' '}
                  <span className="text-attack">· attacker's raw data</span>
                </span>
                <span className="font-mono text-[11px] text-dim">
                  {result.attacker.samples_observed} of {result.attacker.samples_total} ops observed
                  {result.attacker.jitter_std_ms > 0 && ` · ±${result.attacker.jitter_std_ms}ms network jitter`}
                </span>
              </figcaption>
              {plain && (
                <p className="mb-1 text-[11.5px] text-dim">
                  One dot per response, left to right in time. If orange dots sit consistently higher than blue ones, the attacker can tell the bits apart.
                </p>
              )}
              <Scatter index={result.series.index} bit={result.series.bit} tObs={result.series.t_obs}
                total={result.attacker.samples_total} setpoint={cfg.setpoint_ms} threshold={cfg.threshold_ms}
                runKey={runKey} />
            </figure>
          </>
        ) : (
          !plain || running ? <Placeholder running={running} /> : null
        )}
      </div>
    </section>
  )
}

function Legend({ color, label, square }: { color: string; label: string; square?: boolean }) {
  return (
    <span className="hidden items-center gap-1.5 xl:flex">
      <span className={square ? 'h-2.5 w-2.5 rounded-sm opacity-60' : 'h-2 w-2 rounded-full'} style={{ background: color }} />
      {label}
    </span>
  )
}

// ── Onboarding ─────────────────────────────────────────────────────────────

function Welcome() {
  return (
    <div className="fade-up space-y-5 rounded-xl border border-line bg-bg/60 p-6">
      <div>
        <p className="label mb-2 !text-defend-hi">Welcome</p>
        <h2 className="text-2xl font-bold tracking-tight">
          Can an attacker read a secret just by <span className="text-attack">timing</span> a server?
        </h2>
      </div>
      <div className="grid gap-4 text-[13.5px] leading-relaxed text-muted lg:grid-cols-3">
        <p><b className="text-ink">The secret.</b> A server does a task that depends on a secret bit (0 or 1). A 1 takes slightly longer than a 0.</p>
        <p><b className="text-ink">The attacker.</b> They can't see the secret, but they can time the server's responses. If 1s look slower than 0s, the secret leaks.</p>
        <p><b className="text-ink">The defense.</b> The server adds carefully chosen delays so every response looks the same. You'll see whether it works.</p>
      </div>
      <IllustratedFlow />
      <ol className="grid gap-2 text-[13px] lg:grid-cols-3">
        {[
          ['1', 'Choose', 'Pick a scenario on the left. Each one tells a short story.'],
          ['2', 'Run', 'Press Run. The server performs hundreds of operations.'],
          ['3', 'Understand', 'The right panel explains in plain words what the attacker found.'],
        ].map(([n, t, d]) => (
          <li key={n} className="flex gap-3 rounded-lg border border-line p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-data font-mono text-[11px] text-data">{n}</span>
            <span><b className="block text-ink">{t}</b><span className="text-muted">{d}</span></span>
          </li>
        ))}
      </ol>
      <p className="text-[12px] text-dim">
        Want the technical view straight away? Switch to <b className="text-muted">Pro</b> at the top of the page.
      </p>
    </div>
  )
}

function IllustratedFlow() {
  const steps: [string, string, string][] = [
    ['Secret task', 'bit 0 or 1', C.bit0],
    ['Defense', 'adds delay', C.defend],
    ['Response', 'timed', '#e6e6f0'],
  ]
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-line bg-panel/60 p-4">
      {steps.map(([t, s, c]) => (
        <div key={t} className="flex items-center gap-2">
          <div className="rounded-lg border bg-bg px-3 py-2 text-center" style={{ borderColor: `${c}88` }}>
            <div className="text-[13px] font-semibold">{t}</div>
            <div className="font-mono text-[10.5px]" style={{ color: c }}>{s}</div>
          </div>
          <span className="font-mono text-dim">──►</span>
        </div>
      ))}
      <div className="rounded-lg border border-attack bg-attack/10 px-3 py-2 font-mono text-[12px] font-bold text-attack-hi">👁 Attacker</div>
    </div>
  )
}

function ReadingGuide({ threshold }: { threshold: number }) {
  return (
    <div className="fade-up flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-line bg-panel-2/50 px-3 py-2 text-[12px] text-muted">
      <span className="label !text-[9.5px]">How to read this</span>
      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-data" /> secret bit 0</span>
      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-attack" /> secret bit 1</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-defend/60" /> safe zone (±{threshold}ms)</span>
      <span className="text-ink/80">Two separate humps = the bits can be told apart. One overlapping hump = hidden.</span>
    </div>
  )
}

// ── Diagram ────────────────────────────────────────────────────────────────

type Node = { id: Focus; title: string; sub: string; tone: Tone | 'idle' | 'data' }

function Diagram({ mode, result, config, running, focus, onFocus }: Omit<Props, 'runKey'>) {
  const tones = result ? stageTones(result) : null
  const cfg = result?.config ?? config
  const plain = mode === 'beginner'
  const nodes: Node[] = [
    { id: 'crypto', title: plain ? 'Secret task' : 'Crypto Op', sub: plain ? 'crypto op' : 'secret bit', tone: result ? 'data' : 'idle' },
    { id: 'raw', title: plain ? 'Stopwatch' : 'Raw Timing', sub: plain ? 'raw timing' : 'internal', tone: tones?.[0] ?? 'idle' },
    { id: 'iir', title: plain ? 'Averager' : 'IIR Filter', sub: plain ? 'IIR filter' : `α ${cfg.alpha.toFixed(2)}`, tone: tones?.[1] ?? 'idle' },
    { id: 'pid', title: plain ? 'Delay adder' : 'PID Ctrl', sub: plain ? 'PID controller' : 'inject delay', tone: result ? 'defend' : 'idle' },
    ...(cfg.wcet_enabled
      ? [{ id: 'wcet' as Focus, title: plain ? 'Fixed wait' : 'WCET Pad', sub: plain ? 'WCET padding' : 'deterministic', tone: (result ? 'defend' : 'idle') as Node['tone'] }]
      : []),
    { id: 't_obs', title: plain ? 'Response' : 'T_obs', sub: plain ? 'T_obs' : 'observable', tone: tones?.[2] ?? 'idle' },
  ]

  const VW = 760, VH = 156, NW = 100, NH = 50, CY = 86
  const eyeX = VW - 34
  const gap = (eyeX - 40 - 16 - nodes.length * NW) / (nodes.length - 1)
  const nx = (i: number) => 16 + i * (NW + gap)
  const colorOf = (t: Node['tone']) => (t === 'idle' ? '#34345a' : t === 'data' ? C.bit0 : toneColor(t))
  const attackerLeaks = result?.attacker.leaked
  const iirI = nodes.findIndex((n) => n.id === 'iir')
  const pidI = nodes.findIndex((n) => n.id === 'pid')
  const lineD = `M ${nx(0) + NW} ${CY} H ${eyeX - 26}`

  return (
    <div className="rounded-xl border border-line bg-bg/70 px-2 pt-1">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" role="group" aria-label="Defense pipeline diagram">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#5c5c78" />
          </marker>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {nodes.slice(0, -1).map((_, i) => (
          <line key={i} x1={nx(i) + NW} x2={nx(i + 1) - 3} y1={CY} y2={CY} stroke="#34345a" strokeWidth={1.5} markerEnd="url(#arrow)" />
        ))}
        <line x1={nx(nodes.length - 1) + NW + 3} x2={eyeX - 24} y1={CY} y2={CY}
          stroke={attackerLeaks ? C.attack : '#34345a'} strokeWidth={1.5} strokeDasharray="3 3" />

        {/* feedback loops */}
        <path d={`M ${nx(iirI) + NW * 0.72} ${CY - NH / 2} C ${nx(iirI) + NW * 0.72} ${CY - 70}, ${nx(iirI) + NW * 0.28} ${CY - 70}, ${nx(iirI) + NW * 0.28} ${CY - NH / 2 - 2}`}
          fill="none" stroke={colorOf(nodes[iirI].tone)} strokeWidth={1.3} className="dash-flow" markerEnd="url(#arrow)" />
        <text x={nx(iirI) + NW / 2} y={CY - 60} textAnchor="middle" fontSize={10} fill="#8c8ca8" fontFamily="JetBrains Mono">
          {plain ? 'remembers past' : 'y[n−1]'}
        </text>
        <path d={`M ${nx(pidI) + NW * 0.75} ${CY + NH / 2} C ${nx(pidI) + NW * 0.75} ${CY + 60}, ${nx(pidI) + NW * 0.25} ${CY + 60}, ${nx(pidI) + NW * 0.25} ${CY + NH / 2 + 2}`}
          fill="none" stroke={colorOf(nodes[pidI].tone)} strokeWidth={1.3} className="dash-flow" markerEnd="url(#arrow)" />
        <text x={nx(pidI) + NW / 2} y={CY + 66} textAnchor="middle" fontSize={10} fill="#8c8ca8" fontFamily="JetBrains Mono">
          {plain ? 'corrects error' : 'e = T_ref − y'}
        </text>

        {running && [0, 0.35, 0.7].map((b) => (
          <circle key={b} r={3.5} fill={C.defend}>
            <animateMotion dur="1.05s" begin={`${b}s`} repeatCount="indefinite" path={lineD} />
          </circle>
        ))}

        {nodes.map((n, i) => {
          const c = colorOf(n.tone)
          const on = focus === n.id
          return (
            <g key={n.id} transform={`translate(${nx(i)} ${CY - NH / 2})`} className="cursor-pointer"
              role="button" tabIndex={0} aria-pressed={on} aria-label={`${n.title} stage`}
              onClick={() => onFocus(n.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onFocus(n.id))}>
              {n.tone !== 'idle' && <rect width={NW} height={NH} rx={9} fill={c} opacity={on ? 0.45 : 0.18} filter="url(#glow)" />}
              <rect width={NW} height={NH} rx={9} fill="#141425" stroke={c} strokeWidth={on ? 2 : 1.2} />
              <text x={NW / 2} y={21} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={n.tone === 'idle' ? '#8c8ca8' : '#e6e6f0'} fontFamily="Inter">{n.title}</text>
              <text x={NW / 2} y={37} textAnchor="middle" fontSize={9.5} fill={n.tone === 'idle' ? '#5c5c78' : c} fontFamily="JetBrains Mono">{n.sub}</text>
            </g>
          )
        })}

        <g transform={`translate(${eyeX} ${CY})`}>
          <circle r={22} fill="#141425" stroke={attackerLeaks ? C.attack : attackerLeaks === false ? C.defend : '#34345a'} strokeWidth={1.5} />
          {attackerLeaks && <circle r={22} fill="none" stroke={C.attack} strokeWidth={1.5} opacity={0.6}>
            <animate attributeName="r" from="22" to="34" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.6" to="0" dur="1.6s" repeatCount="indefinite" />
          </circle>}
          <path d="M-12 0 Q0 -10 12 0 Q0 10 -12 0 Z" fill="none" stroke={attackerLeaks === false ? C.defend : C.attack} strokeWidth={1.6} />
          <circle r={3.6} fill={attackerLeaks === false ? C.defend : C.attack} />
          <text y={38} textAnchor="middle" fontSize={9.5} fill={C.attack} fontFamily="JetBrains Mono" letterSpacing="0.1em">ATTACKER</text>
        </g>
      </svg>
      <p className="px-2 pb-2 text-center font-mono text-[10.5px] text-dim">
        {plain
          ? 'Tap any box to see what it does · response = task time + added delay'
          : `Click a stage to inspect it · T_obs = raw + PID delay${cfg.wcet_enabled ? ', padded to the WCET budget' : ''}`}
      </p>
    </div>
  )
}

// ── Stage detail strip ─────────────────────────────────────────────────────

function StageDetail({ mode, result, focus }: { mode: Mode; result: SimResult; focus: Focus }) {
  const [raw, iir, obs] = result.stages
  const cfg = result.config
  const plain = mode === 'beginner'
  const rows: Record<Focus, { title: string; body: string; stats: [string, string][] }> = {
    crypto: {
      title: plain ? 'The secret task (crypto operation)' : 'Crypto operation',
      body: 'Each operation handles one secret bit. A 1 takes the slow path, so it runs longer by the leak size. This is the difference every later step tries to hide.',
      stats: [['leak size', `${cfg.bit_gap_ms}ms`], ['jitter σ', `${cfg.noise_std_ms}ms`], ['operations', `${cfg.samples}`]],
    },
    raw: {
      title: plain ? 'Stopwatch: raw timing inside the server' : 'Raw timing (internal)',
      body: 'How long each operation really took, before any defense. The attacker never sees this directly.',
      stats: [['bit 0 avg', raw.mean_bit0.toFixed(2)], ['bit 1 avg', raw.mean_bit1.toFixed(2)], ['gap', `${raw.gap_ms.toFixed(2)}ms`]],
    },
    iir: {
      title: plain ? 'Averager (IIR filter)' : 'IIR filter output (internal)',
      body: iir.leaked
        ? 'Light smoothing: the average still follows each operation, so the gap survives here. That\'s good, because the delay adder can see it and cancel it.'
        : 'Heavy smoothing flattens the gap here. But this average feeds the delay adder, not the attacker, and now the delay adder can\'t tell which bit just ran.',
      stats: [['α', cfg.alpha.toFixed(2)], ['bit 0 avg', iir.mean_bit0.toFixed(2)], ['bit 1 avg', iir.mean_bit1.toFixed(2)], ['gap', `${iir.gap_ms.toFixed(2)}ms`]],
    },
    pid: {
      title: plain ? 'Delay adder (PID controller)' : 'PID controller',
      body: 'Adds a delay (never negative) to push the averaged time toward the target. The delay is added to the real task time, so it only hides the leak if it reacts to each operation.',
      stats: [['Kp/Ki/Kd', `${cfg.kp}/${cfg.ki}/${cfg.kd}`], ['avg delay', `${result.pid.mean_delay_ms.toFixed(2)}ms`], ['max delay', `${result.pid.max_delay_ms.toFixed(2)}ms`]],
    },
    wcet: {
      title: plain ? 'Fixed wait (WCET padding)' : 'WCET padding',
      body: 'Every operation is held until a fixed deadline. If none overrun it, all operations take exactly the same time: a guarantee, paid for with speed.',
      stats: [['deadline', `${cfg.wcet_budget_ms}ms`], ['overruns', `${result.pid.wcet_overruns}`], ['true gap', `${result.true_t_obs_gap_ms.toFixed(2)}ms`]],
    },
    t_obs: {
      title: plain ? 'Response: what the attacker measures (T_obs)' : 'T_obs: what the attacker measures',
      body: result.attacker.threat_model === 'rogue_node'
        ? 'The insider (rogue node) times every operation with no network noise.'
        : `The outsider catches ${result.attacker.samples_observed} operations, each blurred by ±${result.attacker.jitter_std_ms}ms of network jitter.`,
      stats: [['seen gap', `${obs.gap_ms.toFixed(2)}ms`], ['true gap', `${result.true_t_obs_gap_ms.toFixed(2)}ms`], ['p', obs.p_value < 1e-4 ? '<0.0001' : obs.p_value.toFixed(4)]],
    },
  }
  const d = rows[focus]
  return (
    <div key={focus} className="fade-up flex flex-col gap-3 rounded-lg border border-line bg-panel-2/60 px-4 py-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{d.title}</div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{d.body}</p>
      </div>
      <dl className="flex shrink-0 gap-4">
        {d.stats.map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-[9.5px] uppercase tracking-wider text-dim">{k}</dt>
            <dd className="font-mono text-[13px] text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Placeholder({ running }: { running: boolean }) {
  return (
    <div className="relative flex h-80 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong text-center">
      {running && <div className="scanline absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-defend/10 to-transparent" />}
      <p className="label">{running ? 'Pipeline running' : 'Awaiting simulation'}</p>
      <p className="mt-2 max-w-xs text-[13px] text-dim">
        {running ? 'Generating secret bits, filtering, injecting delay…' : 'Configure the pipeline and press Run.'}
      </p>
    </div>
  )
}
