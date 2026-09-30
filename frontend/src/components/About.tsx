import type { ReactNode } from 'react'
import { GLOSSARY, GLOSSARY_GROUPS, type GlossaryKey } from '../lib/glossary'
import { GITHUB_URL, PORTFOLIO_URL } from '../lib/links'
import { Term } from './Term'

export function About() {
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <article className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <header className="fade-up space-y-4">
          <p className="label !text-defend-hi">How it works</p>
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Hiding a secret in <span className="text-attack">how long</span> something takes
          </h1>
          <p className="inline-flex items-center gap-2 rounded-lg border border-data/40 bg-data/10 px-3 py-2 text-[13px] text-ink/90">
            <span className="font-mono text-data">Tip</span>
            Hover over, or tap, any <span className="underline decoration-dotted decoration-data decoration-[1.5px] underline-offset-[3px]">dotted word</span> for a plain-English explanation.
          </p>
        </header>

        <section className="fade-up space-y-4" style={{ animationDelay: '80ms' }}>
          <h2 className="text-lg font-semibold">What is a timing attack?</h2>
          <div className="rounded-xl border border-warn/40 bg-warn/5 p-4">
            <p className="label mb-1.5 !text-warn">An everyday example</p>
            <p className="text-[14.5px] leading-relaxed text-ink/90">
              Imagine a website that checks your password one letter at a time and stops at the first wrong letter.
              A guess starting with the right letter takes a tiny bit longer to be rejected than a guess that's
              wrong from the start. By timing thousands of guesses, an attacker can work out the password one
              letter at a time, without ever seeing it.
            </p>
          </div>
          <p className="leading-relaxed text-muted">
            That's a <Term k="timingAttack">timing</Term> <Term k="sideChannel">side-channel</Term> attack. It
            recovers secret data without breaking any <Term k="cryptography">cryptography</Term>. If a{' '}
            <Term k="cryptoOp">crypto routine</Term> takes a slightly different path when a{' '}
            <Term k="secretBit">key bit</Term> is 1 than when it is 0, it takes a slightly different amount of
            time. An attacker who can time enough operations splits them into two groups, compares the averages,
            and reads the secret bit by bit. The defense has to make the time the attacker observes (<Term k="tObs"><code className="font-mono text-data">T_obs</code></Term>) independent of the secret,
            even though the internal work still depends on it.
          </p>
        </section>

        <section className="fade-up space-y-4" style={{ animationDelay: '160ms' }}>
          <h2 className="text-lg font-semibold">The defense pipeline</h2>
          <p className="leading-relaxed text-muted">
            Each operation passes through these steps, left to right. The attacker only sees the end of the line.
          </p>
          <StaticPipeline />
          <div className="grid gap-3 md:grid-cols-3">
            <Explain color="var(--color-data)" title={<Term k="iir" />} formula="y[n] = α·x[n] + (1−α)·y[n−1]">
              A first-order <Term k="lowPass">low-pass</Term> filter (an{' '}
              <Term k="ema">exponential moving average</Term>) that estimates the operation's typical time.
              Low <Term k="alpha">α</Term> smooths heavily; high α tracks each operation.
            </Explain>
            <Explain color="var(--color-defend)" title={<Term k="pid" />} formula="delay = max(0, Kp·e + Ki·Σe + Kd·Δe)">
              Injects a delay to push the filtered time toward the <Term k="setpoint">setpoint T_ref</Term>, using
              the <Term k="error">error e</Term> and three gains (<Term k="kp">Kp</Term>, <Term k="ki">Ki</Term>,{' '}
              <Term k="kd">Kd</Term>). The delay is added to the <Term k="raw">raw</Term> time:{' '}
              <code className="font-mono">T_obs = raw + delay</code>.
            </Explain>
            <Explain color="var(--color-warn)" title={<Term k="wcetPadding" />} formula="T_obs = max(T_obs, budget)">
              Holds every operation until a <Term k="wcet">worst-case</Term> budget. If nothing{' '}
              <Term k="overrun">overruns</Term>, every operation takes identical time: a{' '}
              <Term k="deterministic">deterministic</Term> guarantee, paid for in <Term k="latency">latency</Term>.
            </Explain>
          </div>
          <div className="rounded-xl border border-attack/40 bg-attack/5 p-4">
            <p className="label mb-1 !text-attack-hi">The smoothing illusion</p>
            <p className="text-[14px] leading-relaxed text-muted">
              Heavy smoothing makes the IIR output look secure: the <Term k="gap">gap</Term> there drops close to zero. But
              the filter feeds the controller, not the attacker. Once the filter has averaged away which bit just
              ran, the PID can't cancel that operation's deviation, so the full gap reaches{' '}
              <code className="font-mono">T_obs</code>. In this model the PID only closes the gap when α is high and
              Kp is near 2, and even then only statistically.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink/80">
              <b>In plain words:</b> the defense blurred its own view so much that it could no longer see what it
              was supposed to hide.
            </p>
          </div>
        </section>

        <section className="fade-up space-y-4" style={{ animationDelay: '240ms' }}>
          <h2 className="text-lg font-semibold"><Term k="threatModel">Threat models</Term>: who is attacking?</h2>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-panel-2 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" />
                  <th className="px-4 py-3 font-medium text-data"><Term k="external" /></th>
                  <th className="px-4 py-3 font-medium text-attack"><Term k="rogueNode" /></th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3">
                <tr><td className="text-muted">Position</td><td>Outside the network, on the wire</td><td>Member of the <Term k="manet" /></td></tr>
                <tr><td className="text-muted"><Term k="samples" /></td><td>~15% of operations</td><td>Every operation, unlimited</td></tr>
                <tr><td className="text-muted">Measurement <Term k="noise">noise</Term></td><td>~30ms <Term k="jitter">network jitter</Term></td><td>None</td></tr>
                <tr>
                  <td className="text-muted">Beats <Term k="noiseInjection">noise-based</Term> defenses?</td>
                  <td>Only with more samples</td>
                  <td className="text-attack-hi">Yes, by <Term k="averaging">averaging</Term></td>
                </tr>
                <tr><td className="text-muted">What holds</td><td>A strong PID, usually</td><td className="text-defend-hi">Only <Term k="wcetPadding" /></td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-[13px] leading-relaxed text-dim">
            An attacker only reports a leak when the observed gap exceeds the <Term k="threshold">threshold</Term>{' '}
            <i>and</i> <Term k="tTest" /> separates the groups at <Term k="pValue">p</Term> &lt; 0.001, meaning there's
            less than a 1-in-1,000 chance the difference is luck.
          </p>
        </section>

        <Glossary />

        <footer className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2 text-sm transition hover:border-data">
            <GitHubIcon /> Source on GitHub
          </a>
          <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-ink">
            Built by Olamide Oladokun
          </a>
        </footer>
      </article>
    </div>
  )
}

function Glossary() {
  const entries = Object.values(GLOSSARY)
  return (
    <section className="fade-up space-y-5" style={{ animationDelay: '320ms' }} aria-labelledby="glossary">
      <div>
        <h2 id="glossary" className="text-lg font-semibold">Glossary</h2>
        <p className="text-[13px] text-dim">Every term used in the lab, in plain English.</p>
      </div>
      {GLOSSARY_GROUPS.map((group) => (
        <div key={group}>
          <h3 className="label mb-2 !text-[10.5px]">{group}</h3>
          <dl className="grid gap-2 md:grid-cols-2">
            {entries.filter((e) => e.group === group).map((e) => (
              <div key={e.term} className="rounded-lg border border-line bg-panel/60 p-3">
                <dt className="text-[13.5px] font-semibold text-ink">{e.term}</dt>
                <dd className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  {e.plain}
                  {'like' in e && e.like && (
                    <span className="mt-1 block text-ink/75"><span className="text-warn">Like: </span>{e.like}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}

function Explain({ color, title, formula, children }: { color: string; title: ReactNode; formula: string; children: ReactNode }) {
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
  const steps: { k: GlossaryKey; t: string; s: string; c: string }[] = [
    { k: 'cryptoOp', t: 'Crypto Op', s: 'uses the secret', c: 'var(--color-data)' },
    { k: 'raw', t: 'Raw Timing', s: 'leaks internally', c: 'var(--color-attack)' },
    { k: 'iir', t: 'IIR Filter', s: 'running average', c: 'var(--color-data)' },
    { k: 'pid', t: 'PID Controller', s: 'adds delay', c: 'var(--color-defend)' },
    { k: 'tObs', t: 'T_obs', s: 'what is measured', c: 'var(--color-ink)' },
  ]
  return (
    <div className="panel flex flex-wrap items-center justify-center gap-2 p-5">
      {steps.map((st, i) => (
        <div key={st.t} className="flex items-center gap-2">
          <div className="rounded-lg border bg-bg px-3 py-2 text-center" style={{ borderColor: `color-mix(in srgb, ${st.c} 53%, transparent)` }}>
            <div className="text-[13px] font-semibold"><Term k={st.k}>{st.t}</Term></div>
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
