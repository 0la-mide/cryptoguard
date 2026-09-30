import { alpha, C, toneColor, toneText, type Tone } from '../lib/theme'
import type { StageResult } from '../types'

function ticks(lo: number, hi: number, n = 4) {
  const span = hi - lo
  const raw = span / n
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6))
  return out
}

const W = 300, H = 150, PAD = { l: 8, r: 8, t: 8, b: 22 }

export function Histogram({ stage, title, subtitle, setpoint, threshold, tone, delay, focused, runKey }: {
  stage: StageResult
  title: string
  subtitle?: string
  setpoint: number
  threshold: number
  tone: Tone
  delay: number
  focused: boolean
  runKey: number
}) {
  const { edges, bit0, bit1 } = stage.histogram
  const lo = edges[0], hi = edges[edges.length - 1]
  const ymax = Math.max(...bit0, ...bit1) * 1.08 || 1
  const x = (v: number) => PAD.l + ((v - lo) / (hi - lo)) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - (v / ymax) * (H - PAD.t - PAD.b)
  const base = H - PAD.b
  const zoneL = Math.max(PAD.l, x(setpoint - threshold))
  const zoneR = Math.min(W - PAD.r, x(setpoint + threshold))
  const color = toneColor(tone)

  return (
    <figure
      className={`panel fade-up relative flex flex-col p-3 transition ${focused ? '' : 'opacity-95'}`}
      style={{
        animationDelay: `${delay}ms`,
        borderColor: focused ? color : undefined,
        boxShadow: focused ? `0 0 0 1px ${alpha(color, 25)}, 0 0 28px -10px ${color}` : undefined,
      }}>
      <figcaption className="mb-2">
        <div className="text-[12.5px] font-medium leading-tight">{title}</div>
        {subtitle && <div className="mt-0.5 text-[11px] leading-snug text-dim">{subtitle}</div>}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-dim">
            gap <span style={{ color }}>{stage.gap_ms.toFixed(2)}ms</span>
          </span>
          <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider"
            style={{ color: toneText(tone), background: alpha(color, 12), border: `1px solid ${alpha(color, 33)}` }}>
            {tone === 'defend' ? '✓ SECURE' : tone === 'warn' ? '◐ LEAKING' : '⚠ LEAK'}
          </span>
        </div>
      </figcaption>

      <svg key={runKey} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={`${stage.label} histogram, bit 0 mean ${stage.mean_bit0.toFixed(1)}ms, bit 1 mean ${stage.mean_bit1.toFixed(1)}ms`}>
        {zoneR > zoneL && (
          <g>
            <rect x={zoneL} y={PAD.t} width={zoneR - zoneL} height={base - PAD.t} fill={C.defend} opacity={0.13} />
            <line x1={zoneL} x2={zoneL} y1={PAD.t} y2={base} stroke={C.defend} strokeOpacity={0.45} strokeDasharray="2 3" />
            <line x1={zoneR} x2={zoneR} y1={PAD.t} y2={base} stroke={C.defend} strokeOpacity={0.45} strokeDasharray="2 3" />
          </g>
        )}
        {[bit0, bit1].map((series, s) => (
          <g key={s} fill={s === 0 ? C.bit0 : C.bit1} opacity={0.72}>
            {series.map((v, i) => v > 0 && (
              <rect key={i} className="bar-in"
                style={{ animationDelay: `${delay + 120 + i * 9}ms` }}
                x={x(edges[i]) + 0.4} width={Math.max(0.8, x(edges[i + 1]) - x(edges[i]) - 0.8)}
                y={y(v)} height={base - y(v)} rx={0.8} />
            ))}
          </g>
        ))}
        {[stage.mean_bit0, stage.mean_bit1].map((m, i) => (
          <line key={i} x1={x(m)} x2={x(m)} y1={PAD.t} y2={base}
            stroke={i === 0 ? C.bit0 : C.bit1} strokeWidth={1.2} strokeDasharray="4 3" />
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} stroke={C.grid} />
        {ticks(lo, hi).map((t) => (
          <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize={9} fill={C.axis} fontFamily="JetBrains Mono">
            {t}
          </text>
        ))}
      </svg>
    </figure>
  )
}

const SW = 800, SH = 230, SP = { l: 44, r: 12, t: 12, b: 26 }

export function Scatter({ index, bit, tObs, total, setpoint, threshold, runKey }: {
  index: number[]
  bit: number[]
  tObs: number[]
  total: number
  setpoint: number
  threshold: number
  runKey: number
}) {
  const vals = [...tObs, setpoint - threshold, setpoint + threshold]
  let lo = Math.min(...vals), hi = Math.max(...vals)
  const pad = (hi - lo) * 0.06 || 5
  lo -= pad
  hi += pad
  const x = (i: number) => SP.l + (i / Math.max(1, total - 1)) * (SW - SP.l - SP.r)
  const y = (v: number) => SP.t + (1 - (v - lo) / (hi - lo)) * (SH - SP.t - SP.b)
  const r = index.length > 1200 ? 1.6 : index.length > 400 ? 2 : 2.6
  const clip = `reveal-${runKey}`

  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full" role="img"
      aria-label="Scatter plot of T_obs over sample index, coloured by secret bit">
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} height={SH} width={0}>
            <animate attributeName="width" from="0" to={SW} dur="1.6s" begin="0.9s" fill="freeze"
              calcMode="spline" keySplines="0.2 0.8 0.2 1" keyTimes="0;1" />
          </rect>
        </clipPath>
      </defs>
      {ticks(lo, hi, 5).map((t) => (
        <g key={t}>
          <line x1={SP.l} x2={SW - SP.r} y1={y(t)} y2={y(t)} stroke={C.grid} strokeOpacity={0.6} />
          <text x={SP.l - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill={C.axis} fontFamily="JetBrains Mono">{t}</text>
        </g>
      ))}
      <rect x={SP.l} width={SW - SP.l - SP.r} y={y(setpoint + threshold)}
        height={Math.max(1, y(setpoint - threshold) - y(setpoint + threshold))} fill={C.defend} opacity={0.14} />
      {[setpoint + threshold, setpoint - threshold].map((v) => (
        <line key={v} x1={SP.l} x2={SW - SP.r} y1={y(v)} y2={y(v)} stroke={C.attack} strokeOpacity={0.6} strokeDasharray="2 4" />
      ))}
      <line x1={SP.l} x2={SW - SP.r} y1={y(setpoint)} y2={y(setpoint)} stroke={C.warn} strokeDasharray="6 4" strokeWidth={1.2} />
      <text x={SW - SP.r - 4} y={y(setpoint) - 5} textAnchor="end" fontSize={10} fill={C.warn} fontFamily="JetBrains Mono">
        T_ref {setpoint}ms
      </text>

      <g clipPath={`url(#${clip})`}>
        {index.map((idx, k) => (
          <circle key={k} cx={x(idx)} cy={y(tObs[k])} r={r}
            fill={bit[k] === 0 ? C.bit0 : C.bit1} fillOpacity={0.75} />
        ))}
      </g>
      <text x={SP.l} y={SH - 6} fontSize={10} fill={C.axis} fontFamily="JetBrains Mono">0</text>
      <text x={SW - SP.r} y={SH - 6} textAnchor="end" fontSize={10} fill={C.axis} fontFamily="JetBrains Mono">
        sample {total}
      </text>
    </svg>
  )
}
