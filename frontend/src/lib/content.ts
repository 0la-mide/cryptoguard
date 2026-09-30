import type { SimConfig, SimResult, ThreatModel } from '../types'

export const DEFAULT_CONFIG: SimConfig = {
  samples: 500,
  bit_gap_ms: 40,
  noise_std_ms: 8,
  alpha: 0.05,
  kp: 0.8,
  ki: 0.1,
  kd: 0.05,
  setpoint_ms: 500,
  threat_model: 'external',
  threshold_ms: 4.5,
  wcet_enabled: false,
  wcet_budget_ms: 600,
}

export type ScenarioId = 'default' | 'weak' | 'strong' | 'rogue' | 'wcet'

export type Scenario = {
  id: ScenarioId
  /** Short name used in Pro mode. */
  name: string
  /** Plain-language name used in Beginner mode. */
  title: string
  story: string
  watch: string
  risky: boolean
  config: SimConfig
}

// Tuned against the engine over 30 seeds each (see README "Presets").
export const SCENARIOS: Scenario[] = [
  {
    id: 'weak',
    name: 'Weak Defense',
    title: 'Leaky server',
    story: 'The server averages its timings so heavily that its added delay can\'t react to individual operations.',
    watch: 'The middle chart looks safe. Does the attacker\'s chart agree?',
    risky: true,
    config: { ...DEFAULT_CONFIG, alpha: 0.02, kp: 0.3, ki: 0.02, kd: 0.01 },
  },
  {
    id: 'default',
    name: 'Default',
    title: 'The original design',
    story: 'The starting setup from the research script: gentle averaging and a moderate controller.',
    watch: 'Compare the "after averaging" chart with what the attacker sees.',
    risky: true,
    config: DEFAULT_CONFIG,
  },
  {
    id: 'strong',
    name: 'Strong Defense',
    title: 'Well-tuned defense',
    story: 'The added delay now reacts to every single operation. The attacker is an outsider timing responses over the internet.',
    watch: 'Does the attacker\'s difference fall inside the green safe zone?',
    risky: false,
    config: { ...DEFAULT_CONFIG, alpha: 0.99, kp: 2.0, ki: 0.01, kd: 0.01 },
  },
  {
    id: 'rogue',
    name: 'Rogue Node Attack',
    title: 'Insider attack',
    story: 'A similar defense leaves a small leak. This time the attacker is a rogue device inside the network and times every operation.',
    watch: 'Afterwards, switch "Who is attacking?" to Outsider and run again.',
    risky: true,
    config: { ...DEFAULT_CONFIG, alpha: 0.8, kp: 1.5, ki: 0.01, kd: 0.05, threat_model: 'rogue_node' },
  },
  {
    id: 'wcet',
    name: 'WCET Guarantee',
    title: 'Constant-time padding',
    story: 'Every response is held until a fixed deadline, so all operations take the same time, even against an insider.',
    watch: 'The two colours in the attacker\'s chart should sit exactly on top of each other.',
    risky: false,
    config: { ...DEFAULT_CONFIG, alpha: 0.99, kp: 2.0, ki: 0.01, kd: 0.01, threat_model: 'rogue_node', wcet_enabled: true },
  },
]

export const scenario = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!

// ── Parameters: a plain name, the technical name, and what it does ─────────

export type ParamKey =
  | 'samples' | 'bit_gap_ms' | 'noise_std_ms' | 'alpha' | 'kp' | 'ki' | 'kd'
  | 'setpoint_ms' | 'wcet' | 'wcet_budget_ms' | 'threshold_ms' | 'threat_model'

export const PARAMS: Record<ParamKey, { plain: string; pro: string; what: string }> = {
  samples: {
    plain: 'Operations to run', pro: 'Samples',
    what: 'How many times the server performs its secret task. More operations give an attacker more data.',
  },
  bit_gap_ms: {
    plain: 'Leak size', pro: 'Secret bit gap',
    what: 'How much longer the task takes when the secret bit is 1 instead of 0, before any defense. This is the leak.',
  },
  noise_std_ms: {
    plain: 'Natural jitter', pro: 'System noise σ',
    what: 'Random wobble in every timing. Small leaks can hide inside it.',
  },
  alpha: {
    plain: 'Smoothing', pro: 'IIR α',
    what: 'The IIR filter is a running average the defense uses to estimate timing. Low α averages heavily and reacts slowly; high α follows each operation.',
  },
  kp: {
    plain: 'Reaction strength', pro: 'PID Kp',
    what: 'How strongly the added delay reacts to the current timing error. Near 2 cancels most of each operation\'s deviation.',
  },
  ki: {
    plain: 'Memory', pro: 'PID Ki',
    what: 'How much past errors build up into extra delay. Too much makes the delay drift.',
  },
  kd: {
    plain: 'Damping', pro: 'PID Kd',
    what: 'Reacts to how fast the error is changing, which calms overshoot.',
  },
  setpoint_ms: {
    plain: 'Target response time', pro: 'Setpoint T_ref',
    what: 'The response time the controller tries to hit. Far from the task\'s real ~500ms, the controller\'s memory winds up.',
  },
  wcet: {
    plain: 'Fixed-time padding', pro: 'WCET padding',
    what: 'WCET means worst-case execution time. Every response waits until a fixed deadline, so all of them take the same time.',
  },
  wcet_budget_ms: {
    plain: 'Deadline', pro: 'WCET budget',
    what: 'The fixed wait. Operations slower than the deadline still give away their timing.',
  },
  threshold_ms: {
    plain: 'Allowed difference', pro: 'Leakage threshold',
    what: 'Timing differences between bit 0 and bit 1 smaller than this count as safe.',
  },
  threat_model: {
    plain: 'Who is attacking?', pro: 'Threat model',
    what: 'An outsider sees only some responses, blurred by the network. An insider (a rogue node) sees every one, perfectly.',
  },
}

export const THREAT_TEXT: Record<ThreatModel, { title: string; plain: string; body: string }> = {
  rogue_node: {
    title: 'Rogue Node',
    plain: 'Insider',
    body: 'In Rogue Node mode, the attacker is a member of the MANET (a self-organising wireless network). They have stable, repeated access to the target and can collect unlimited samples. Statistical averaging at this scale defeats probabilistic defenses like noise injection: only deterministic defenses (WCET padding) provide a mathematical guarantee.',
  },
  external: {
    title: 'External Attacker',
    plain: 'Outsider',
    body: 'The external attacker sits outside the network and times responses over the wire. They catch only a fraction of operations (15% here), each blurred by ~30ms of network jitter. A small residual leak can hide under that noise, but only because the attacker is sample-starved. Give them more samples, or let them inside, and it surfaces.',
  },
}

// ── Plain-language reading of a result ─────────────────────────────────────

export type Explanation = {
  headline: string
  body: string
  why?: string
  next?: { id: ScenarioId; label: string }
}

export function explain(r: SimResult): Explanation {
  const cfg = r.config
  const [, iir, obs] = r.stages
  const gap = obs.gap_ms.toFixed(1)
  const th = cfg.threshold_ms
  const insider = cfg.threat_model === 'rogue_node'
  const who = insider ? 'The insider' : 'The outsider'

  if (obs.leaked) {
    let why = 'The defense cancels part of the leak, but not enough of it.'
    let next: Explanation['next'] = cfg.wcet_enabled
      ? undefined
      : { id: 'wcet', label: 'Try constant-time padding' }
    if (!iir.leaked && cfg.alpha < 0.5) {
      why = 'The averager smoothed so much that the delay adder couldn\'t tell which bit had just run, so the original leak passed straight through. Hiding the leak inside the server is not the same as hiding it from the attacker.'
      next = { id: 'strong', label: 'Try the well-tuned defense' }
    } else if (cfg.wcet_enabled && r.pid.wcet_overruns > 0) {
      why = `${r.pid.wcet_overruns} operations ran past the deadline and gave away their real timing. Raise the deadline.`
    } else if (insider && !cfg.wcet_enabled) {
      why = 'An insider sees every response with no network noise, so even a small leak adds up. Averaging over many samples beats defenses that only blur timing.'
    }
    return {
      headline: 'The attacker can read the secret.',
      body: `${who} measured bit-1 operations as ${gap}ms slower than bit-0 ones. That's more than the ${th}ms allowed, and too consistent to be chance.`,
      why,
      next,
    }
  }

  if (cfg.wcet_enabled && r.true_t_obs_gap_ms === 0) {
    return {
      headline: 'Nothing to measure.',
      body: 'Every response took exactly the same time, so there is no difference between bit 0 and bit 1 for anyone to find, no matter how many samples they collect.',
      why: 'This is a deterministic guarantee. The cost is speed: every operation now waits as long as the slowest one.',
      next: { id: 'weak', label: 'Compare with a leaky server' },
    }
  }

  if (!insider && r.true_t_obs_gap_ms > th) {
    return {
      headline: 'Safe, but only for now.',
      body: `The outsider couldn't tell the bits apart, because they saw only ${r.attacker.samples_observed} noisy responses. The real difference is ${r.true_t_obs_gap_ms.toFixed(1)}ms.`,
      why: 'The leak is still there. An attacker with more access would find it.',
      next: { id: 'rogue', label: 'See what an insider finds' },
    }
  }

  return {
    headline: 'The defense is holding.',
    body: `${who} saw a ${gap}ms difference between bit 0 and bit 1. That's within the ${th}ms allowed and indistinguishable from random noise.`,
    why: insider
      ? 'This defense only blurs timing statistically. Run it again, or raise the operation count, and an insider may still get lucky.'
      : 'This defense works statistically. Against an insider with unlimited samples it can still fail.',
    next: insider ? { id: 'wcet', label: 'See a guaranteed defense' } : { id: 'rogue', label: 'Try it against an insider' },
  }
}
