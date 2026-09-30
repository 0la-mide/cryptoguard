import { useCallback, useEffect, useState } from 'react'
import { downloadReport, simulate } from './api'
import { About, GitHubIcon } from './components/About'
import { AttackerPanel } from './components/AttackerPanel'
import { ControlPanel, type JourneyStep } from './components/ControlPanel'
import { GuideDialog } from './components/GuideDialog'
import { MobileGate } from './components/MobileGate'
import { PipelinePanel } from './components/PipelinePanel'
import { DEFAULT_CONFIG, scenario, type ScenarioId } from './lib/content'
import { GITHUB_URL } from './lib/links'
import { useMode, type Mode } from './lib/mode'
import { clearSession, loadSession, saveSession } from './lib/session'
import type { Focus } from './lib/stages'
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
  const [mode, setMode] = useMode()
  const [tab, setTab] = useState<'lab' | 'about'>('lab')
  // Restore the last settings and run saved in this browser, if any.
  const [saved] = useState(loadSession)
  const [config, setConfig] = useState<SimConfig>(saved?.config ?? DEFAULT_CONFIG)
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(saved?.activeScenario ?? null)
  const [result, setResult] = useState<SimResult | null>(saved?.result ?? null)
  // True when the settings differ from what the shown result was run with.
  const [stale, setStale] = useState(saved?.stale ?? false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [focus, setFocus] = useState<Focus>('t_obs')
  const [runKey, setRunKey] = useState(0)
  const [exporting, setExporting] = useState(false)

  const run = useCallback(async (cfg: SimConfig) => {
    setRunning(true)
    setError(null)
    setProgress(0)
    const start = performance.now()
    const timer = setInterval(() => {
      setProgress(Math.min(92, ((performance.now() - start) / MIN_RUN_MS) * 100))
    }, 60)
    try {
      const [res] = await Promise.all([simulate(cfg), new Promise((r) => setTimeout(r, MIN_RUN_MS))])
      setProgress(100)
      setResult(res)
      setStale(false)
      setFocus('t_obs')
      setRunKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed')
    } finally {
      clearInterval(timer)
      setRunning(false)
    }
  }, [])

  // Simulations only ever start from an explicit click (Run, or a "Try …" button).
  // Switching modes, choosing a scenario or reloading never starts one.
  useEffect(() => {
    saveSession({ config, activeScenario, result, stale })
  }, [config, activeScenario, result, stale])

  const closeGuide = useCallback(() => setGuideOpen(false), [])

  const resetSession = () => {
    clearSession()
    setConfig(DEFAULT_CONFIG)
    setActiveScenario(null)
    setResult(null)
    setStale(false)
    setFocus('t_obs')
    setGuideOpen(false)
  }

  const chooseScenario = (id: ScenarioId, andRun = false) => {
    const cfg = scenario(id).config
    setConfig(cfg)
    setActiveScenario(id)
    setStale(true)
    if (andRun) void run(cfg)
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

  const step: JourneyStep = result && !stale && !running ? 3 : activeScenario || stale || result ? 2 : 1
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
          <span className="hidden h-5 w-px bg-line-strong xl:block" />
          <span className="hidden text-[13px] text-muted xl:block">Side-Channel Timing Attack Lab</span>
        </div>

        <nav className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1" aria-label="Sections">
          {([['lab', 'Lab'], ['about', 'How it works']] as const).map(([id, name]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
              className={`rounded-md px-3 py-1 text-[13px] transition ${tab === id ? 'bg-panel-2 text-ink shadow-[inset_0_0_0_1px_#34345a]' : 'text-muted hover:text-ink'}`}>
              {name}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setGuideOpen(true)} aria-haspopup="dialog"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-[12.5px] text-muted transition hover:border-data hover:text-ink">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current font-mono text-[10px]">i</span>
            Guide
          </button>
          <ModeSwitch mode={mode} onChange={setMode} />
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
            <GitHubIcon /> <span className="hidden lg:inline">GitHub</span>
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
            <div className="grid grid-cols-[290px_minmax(0,1fr)] gap-3 p-3 lg:h-full lg:grid-cols-[300px_minmax(0,1fr)_350px] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_380px]">
              <div className="sticky top-3 row-span-2 flex h-[calc(100dvh-5.5rem)] self-start lg:static lg:row-span-1 lg:h-auto lg:min-h-0 lg:self-stretch [&>*]:flex-1">
                <ControlPanel
                  mode={mode}
                  config={config}
                  onChange={(c) => { setConfig(c); setActiveScenario(null); setStale(true) }}
                  onRun={() => run(config)}
                  running={running}
                  progress={progress}
                  stageText={stageText}
                  activeScenario={activeScenario}
                  onScenario={(id) => chooseScenario(id)}
                  step={step}
                />
              </div>
              <div className="flex lg:min-h-0 [&>*]:flex-1">
                <PipelinePanel mode={mode} result={result} config={config} running={running} focus={focus} onFocus={setFocus} runKey={runKey} />
              </div>
              <div className="flex lg:min-h-0 [&>*]:flex-1">
                <AttackerPanel mode={mode} result={result} runKey={runKey} onExport={exportPdf} exporting={exporting}
                  onTryNext={(id) => chooseScenario(id, true)} />
              </div>
            </div>
          </div>
        )}
      </main>

      {guideOpen && (
        <GuideDialog mode={mode} onClose={closeGuide} onSwitchMode={setMode}
          onReset={resetSession} hasSaved={!!result || activeScenario !== null} />
      )}
    </div>
  )
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1" role="radiogroup" aria-label="Interface mode">
      {([['beginner', 'Beginner'], ['pro', 'Pro']] as const).map(([id, name]) => {
        const on = mode === id
        return (
          <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)}
            className={`rounded-md px-2.5 py-1 font-mono text-[11.5px] transition ${
              on
                ? id === 'pro' ? 'bg-attack/15 text-attack-hi shadow-[inset_0_0_0_1px_rgba(245,130,91,.45)]' : 'bg-data/15 text-[#7db6ef] shadow-[inset_0_0_0_1px_rgba(55,138,221,.45)]'
                : 'text-muted hover:text-ink'
            }`}>
            {name}
          </button>
        )
      })}
    </div>
  )
}
