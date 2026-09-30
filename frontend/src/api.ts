import type { SimConfig, SimResult } from './types'

async function post(path: string, body: SimConfig): Promise<Response> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limited. Wait a few seconds and try again.')
    throw new Error(`Backend returned ${res.status}`)
  }
  return res
}

export async function simulate(cfg: SimConfig): Promise<SimResult> {
  return (await post('/api/simulate', cfg)).json()
}

export async function downloadReport(cfg: SimConfig & { seed: number }) {
  const blob = await (await post('/api/report', cfg)).blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cryptoguard-report-${cfg.seed}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
