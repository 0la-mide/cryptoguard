import type { SimResult } from '../types'
import type { Tone } from './theme'

export type Focus = 'crypto' | 'raw' | 'iir' | 'pid' | 'wcet' | 't_obs'

export function stageTones(r: SimResult): [Tone, Tone, Tone] {
  const [, iir, obs] = r.stages
  return ['attack', iir.leaked ? 'warn' : 'defend', obs.leaked ? 'attack' : 'defend']
}
