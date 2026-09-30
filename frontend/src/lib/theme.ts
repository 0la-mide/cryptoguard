export const C = {
  bit0: '#378ADD',
  bit1: '#f5825b',
  defend: '#1D9E75',
  attack: '#f5825b',
  warn: '#f5c842',
  grid: '#26263f',
  axis: '#5c5c78',
}

export type Tone = 'attack' | 'warn' | 'defend'
export const toneColor = (t: Tone) => (t === 'attack' ? C.attack : t === 'warn' ? C.warn : C.defend)
