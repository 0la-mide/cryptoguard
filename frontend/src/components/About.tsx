export const GITHUB_URL = 'https://github.com/0la-mide/cryptoguard'

export function About() {
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <article className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <header className="fade-up">
          <p className="label mb-3 !text-defend-hi">How it works</p>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Hiding a secret in <span className="text-attack">how long</span> something takes
          </h1>
        </header>

        <section className="fade-up space-y-3" style={{ animationDelay: '80ms' }}>
          <h2 className="text-lg font-semibold">What is a timing attack?</h2>
          <p className="leading-relaxed text-muted">
            A timing side-channel attack recovers secret data without breaking any cryptography. If a
            crypto routine takes a slightly different path when a key bit is 1 than when it is 0, it
            takes a slightly different amount of time. An attacker who can time enough operations
            splits them into two groups, compares the averages, and reads the secret bit by bit. The
            defense has to make the time the attacker observes (<code className="font-mono text-data">T_obs</code>)
            independent of the secret, even though the internal work still depends on it.
          </p>
        </section>

        <section className="fade-up space-y-4" style={{ animationDelay: '160ms' }}>
          <h2 className="text-lg font-semibold">The defense pipeline</h2>
          <StaticPipeline />
          <div className="grid gap-3 md:grid-cols-3">
            <Explain color="#378ADD" title="IIR filter" formula="y[n] = α·x[n] + (1−α)·y[n−1]">
              A first-order low-pass (an exponential moving average) that estimates the operation's typical time.
              Low α smooths heavily; high α tracks each operation.
            </Explain>
            <Explain color="#1D9E75" title="PID controller" formula="delay = max(0, Kp·e + Ki·Σe + Kd·Δe)">
              Injects a delay to push the filtered time toward the setpoint T_ref. The delay is added to the
              <i> raw</i> time: <code className="font-mono">T_obs = raw + delay</code>.
            </Explain>
            <Explain color="#f5c842" title="WCET padding" formula="T_obs = max(T_obs, budget)">
              Holds every operation until a worst-case budget. If nothing overruns, every operation
              takes identical time: a deterministic guarantee, paid for in latency.
            </Explain>
          </div>
          <div className="rounded-xl border border-attack/40 bg-attack/5 p-4">
            <p className="label mb-1 !text-attack-hi">The smoothing illusion</p>
            <p className="text-[14px] leading-relaxed text-muted">
              Heavy smoothing makes the IIR output look secure: the gap there drops close to zero. But the filter
              feeds the controller, not the attacker. Once the filter has averaged away which bit just ran, the PID
              can't cancel that operation's deviation, so the full gap reaches <code className="font-mono">T_obs</code>.
              In this model the PID only closes the gap when α is high and Kp is near 2, and even then only
              statistically.
            </p>
          </div>
        </section>

        <section className="fade-up space-y-4" style={{ animationDelay: '240ms' }}>
          <h2 className="text-lg font-semibold">Threat models</h2>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-panel-2 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" />
                  <th className="px-4 py-3 font-medium text-data">External attacker</th>
                  <th className="px-4 py-3 font-medium text-attack">Rogue node</th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3">
                <tr><td className="text-muted">Position</td><td>Outside the network, on the wire</td><td>Member of the MANET</td></tr>
                <tr><td className="text-muted">Samples</td><td>~15% of operations</td><td>Every operation, unlimited</td></tr>
                <tr><td className="text-muted">Measurement noise</td><td>~30ms network jitter</td><td>None</td></tr>
                <tr><td className="text-muted">Beats noise-based defenses?</td><td>Only with more samples</td><td className="text-attack-hi">Yes, by averaging</td></tr>
                <tr><td className="text-muted">What holds</td><td>A strong PID, usually</td><td className="text-defend-hi">Only WCET padding</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[13px] text-dim">
            An attacker only reports a leak when the observed gap exceeds the threshold <i>and</i> Welch's t-test
            separates the groups at p &lt; 0.001.
          </p>
        </section>

        <footer className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2 text-sm transition hover:border-data">
            <GitHubIcon /> Source on GitHub
          </a>
          <a href="https://olamideoladokun.com/" target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-ink">
            Built by Olamide Oladokun
          </a>
        </footer>
      </article>
    </div>
  )
}

function Explain({ color, title, formula, children }: { color: string; title: string; formula: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <h3 className="text-[14px] font-semibold">{title}</h3>
      </div>
      <p className="mb-3 rounded-md bg-bg px-2 py-1.5 font-mono text-[11.5px]" style={{ color }}>{formula}</p>
      <p className="text-[13px] leading-relaxed text-muted">{children}</p>
    </div>
  )
}

function StaticPipeline() {
  const steps = [
    { t: 'Crypto Op', s: 'secret bit', c: '#378ADD' },
    { t: 'Raw Timing', s: 'leaks internally', c: '#f5825b' },
    { t: 'IIR Filter', s: 'estimate', c: '#378ADD' },
    { t: 'PID Controller', s: '+ delay', c: '#1D9E75' },
    { t: 'T_obs', s: 'observable', c: '#e6e6f0' },
  ]
  return (
    <div className="panel flex flex-wrap items-center justify-center gap-2 p-5">
      {steps.map((st, i) => (
        <div key={st.t} className="flex items-center gap-2">
          <div className="rounded-lg border bg-bg px-3 py-2 text-center" style={{ borderColor: `${st.c}88` }}>
            <div className="text-[13px] font-semibold">{st.t}</div>
            <div className="font-mono text-[10.5px]" style={{ color: st.c }}>{st.s}</div>
          </div>
          <span className="font-mono text-dim">{i < steps.length - 1 ? '──►' : '◄──'}</span>
        </div>
      ))}
      <div className="rounded-lg border border-attack bg-attack/10 px-3 py-2 font-mono text-[12px] font-bold text-attack-hi">
        👁 ATTACKER
      </div>
    </div>
  )
}

export function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
