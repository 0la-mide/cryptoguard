import type { SimConfig } from './types'

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

// Tuned against the engine over 30 seeds each (see README "Presets").
export const PRESETS: { id: string; name: string; hint: string; config: SimConfig }[] = [
  {
    id: 'default',
    name: 'Default',
    hint: 'The original script: α 0.05, Kp 0.8, Ki 0.1',
    config: DEFAULT_CONFIG,
  },
  {
    id: 'weak',
    name: 'Weak Defense',
    hint: 'Heavy smoothing, timid PID: the leak passes straight through',
    config: { ...DEFAULT_CONFIG, alpha: 0.02, kp: 0.3, ki: 0.02, kd: 0.01 },
  },
  {
    id: 'strong',
    name: 'Strong Defense',
    hint: 'Light smoothing + aggressive Kp: PID cancels each operation',
    config: { ...DEFAULT_CONFIG, alpha: 0.99, kp: 2.0, ki: 0.01, kd: 0.01 },
  },
  {
    id: 'rogue',
    name: 'Rogue Node Attack',
    hint: 'A residual ~15ms leak: hidden from outsiders, obvious to an insider',
    config: { ...DEFAULT_CONFIG, alpha: 0.8, kp: 1.5, ki: 0.01, kd: 0.05, threat_model: 'rogue_node' },
  },
]
