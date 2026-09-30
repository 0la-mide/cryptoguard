import { useSyncExternalStore, type ReactNode } from 'react'
import { PORTFOLIO_URL } from '../lib/links'

// Phones get a notice; tablets (≥768px) and desktops get the lab.
const QUERY = '(max-width: 767px)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function MobileGate({ children }: { children: ReactNode }) {
  const isPhone = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
  if (!isPhone) return <>{children}</>

  return (
    <main className="bg-grid flex min-h-full items-center justify-center px-6 py-10">
      <div className="panel fade-up w-full max-w-sm p-7 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line-strong bg-panel-2">
          <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="9" width="30" height="21" rx="2.5" stroke="var(--color-data)" strokeWidth="2.4" />
            <path d="M13 36h12M19 30v6" stroke="var(--color-data)" strokeWidth="2.4" />
            <rect x="32" y="17" width="12" height="22" rx="2.5" fill="var(--color-bg)" stroke="var(--color-defend)" strokeWidth="2.4" />
            <path d="M36.5 35h3" stroke="var(--color-defend)" strokeWidth="2.4" />
          </svg>
        </div>
        <p className="label mb-2 text-defend-hi">CryptoGuard</p>
        <h1 className="mb-3 text-xl font-semibold">This lab needs a bigger screen</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          CryptoGuard runs live timing simulations across three side-by-side panels: controls, the signal
          pipeline and the attacker's report. Open it on a <span className="text-ink">tablet or computer</span> for
          the full experience.
        </p>
        <div className="rounded-lg border border-line bg-bg px-4 py-3 font-mono text-[13px] text-data">
          cryptoguard.olamide.cloud
        </div>
        <a href={PORTFOLIO_URL}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-defend py-3 font-mono text-[13px] font-bold tracking-[0.12em] text-on-accent transition active:bg-defend-hi">
          ← GO BACK
        </a>
        <p className="mt-5 font-mono text-[11px] text-dim">
          <span className="blink text-attack">■</span> min width 768px
        </p>
      </div>
    </main>
  )
}
