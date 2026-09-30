import { useCallback, useEffect, useRef, useState } from 'react'
import { downloadReport, simulate } from './api'
import { About, GITHUB_URL, GitHubIcon } from './components/About'
import { AttackerPanel } from './components/AttackerPanel'
import { ControlPanel } from './components/ControlPanel'
import { MobileGate } from './components/MobileGate'
import { PipelinePanel, type Focus } from './components/PipelinePanel'
import { DEFAULT_CONFIG, PRESETS } from './presets'
import type { SimConfig, SimResult } from './types'

const STAGES = ['GENERATING BITS', 'RAW TIMING', 'IIR FILTER', 'PID CONTROL', 'ATTACKER ANALYSIS']
const MIN_RUN_MS = 1400 // long enough to watch the pipeline "run"

export default function App() {
  return (
    <MobileGate>
      <Lab />
    </MobileGate>
  )
}

function Lab() {
  const [tab, setTab] = useState<'lab' | 'about'>('lab')
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG)
  const [activePreset, setActivePreset] = useState<string | null>('default')
  const [result, setResult] = useState<SimResult | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [focus, setFocus] = useState<Focus>('t_obs')
  const [runKey, setRunKey] = useState(0)
  const [exporting, setExporting] = useState(false)
  const configRef = useRef(config)
  configRef.current = config

  const run = useCallback(async (cfg?: SimConfig) => {
    setRunning(true)
    setError(null)
    setProgress(0)
    const start = performance.now()
    const timer = setInterval(() => {
      setProgress(Math.min(92, ((performance.now() - start) / MIN_RUN_MS) * 100))
    }, 60)
    try {
      const [res] = await Promise.all([
        simulate(cfg ?? configRef.current),
        new Promise((r) => setTimeout(r, MIN_RUN_MS)),
      ])
      setProgress(100)
      setResult(res)
      setRunKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed')
    } finally {
      clearInterval(timer)
      setRunning(false)
    }
  }, [])

  // First impression: show a populated lab straight away.
  useEffect(() => { void run(DEFAULT_CONFIG) }, [run])

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)
    if (!p) return
    setConfig(p.config)
    setActivePreset(id)
    void run(p.config)
  }

  const exportPdf = async () => {
    if (!result) return
    setExporting(true)
    try {
      await downloadReport(result.config)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const stageText = STAGES[Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length))]

  return (
    <div className="bg-grid flex h-full min-h-[640px] flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line bg-bg/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-2.5" aria-label="CryptoGuard home">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="font-mono text-[15px] font-bold tracking-[0.2em]">
              CRYPTO<span className="text-defend-hi">GUARD</span>
            </span>
          </a>
          <span className="hidden h-5 w-px bg-line-strong lg:block" />
          <span className="hidden text-[13px] text-muted lg:block">Side-Channel Timing Attack Lab</span>
        </div>

        <nav className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1" aria-label="Sections">
          {([['lab', 'Lab'], ['about', 'How it works']] as const).map(([id, name]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
              className={`rounded-md px-3 py-1 text-[13px] transition ${tab === id ? 'bg-panel-2 text-ink shadow-[inset_0_0_0_1px_#34345a]' : 'text-muted hover:text-ink'}`}>
              {name}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 font-mono text-[11px] text-muted xl:flex">
            <span className={`h-1.5 w-1.5 rounded-full ${running ? 'blink bg-warn' : error ? 'bg-attack' : 'bg-defend-hi'}`} />
            {running ? 'RUNNING' : error ? 'ERROR' : 'LIVE'}
          </span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
            <GitHubIcon /> GitHub
          </a>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between border-b border-attack/40 bg-attack/10 px-5 py-2 font-mono text-[12px] text-attack-hi">
          <span>⚠ {error}</span>
          <button type="button" onClick={() => setError(null)} className="text-muted hover:text-ink">dismiss</button>
        </div>
      )}

      <main className="min-h-0 flex-1">
        {tab === 'about' ? (
          <About />
        ) : (
          <div className="h-full overflow-y-auto lg:overflow-hidden">
            <div className="grid grid-cols-[290px_minmax(0,1fr)] gap-3 p-3 lg:h-full lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)_350px] xl:grid-cols-[320px_minmax(0,1fr)_380px]">
              <div className="sticky top-3 row-span-2 flex h-[calc(100dvh-5.5rem)] self-start lg:static lg:row-span-1 lg:h-auto lg:min-h-0 lg:self-stretch [&>*]:flex-1">
                <ControlPanel
                  config={config}
                  onChange={(c) => { setConfig(c); setActivePreset(null) }}
                  onRun={() => run()}
                  running={running}
                  progress={progress}
                  stageText={stageText}
                  activePreset={activePreset}
                  onPreset={applyPreset}
                />
              </div>
              <div className="flex lg:min-h-0 [&>*]:flex-1">
                <PipelinePanel result={result} config={config} running={running} focus={focus} onFocus={setFocus} runKey={runKey} />
              </div>
              <div className="flex lg:min-h-0 [&>*]:flex-1">
                <AttackerPanel result={result} runKey={runKey} onExport={exportPdf} exporting={exporting} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
