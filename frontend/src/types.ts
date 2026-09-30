export type ThreatModel = 'external' | 'rogue_node'

export interface SimConfig {
  samples: number
  bit_gap_ms: number
  noise_std_ms: number
  alpha: number
  kp: number
  ki: number
  kd: number
  setpoint_ms: number
  threat_model: ThreatModel
  threshold_ms: number
  wcet_enabled: boolean
  wcet_budget_ms: number
  seed?: number | null
}

export interface StageResult {
  stage: 'raw' | 'iir' | 't_obs'
  label: string
  n: number
  mean_bit0: number
  mean_bit1: number
  std_bit0: number
  std_bit1: number
  gap_ms: number
  t_stat: number
  p_value: number
  distinguishable: boolean
  leaked: boolean
  histogram: { edges: number[]; bit0: number[]; bit1: number[] }
}

export interface SimResult {
  config: SimConfig & { seed: number }
  stages: [StageResult, StageResult, StageResult]
  true_t_obs_gap_ms: number
  attacker: {
    threat_model: ThreatModel
    samples_observed: number
    samples_total: number
    jitter_std_ms: number
    leaked: boolean
    samples_to_break: number | null
  }
  pid: { mean_delay_ms: number; max_delay_ms: number; wcet_overruns: number }
  series: { index: number[]; bit: number[]; t_obs: number[] }
  recommendations: string[]
}
