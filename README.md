# CryptoGuard

An interactive side-channel timing attack lab. It simulates a crypto operation whose timing depends on a
secret bit, runs it through an IIR + PID defense pipeline, and shows what an attacker at the observable
output (`T_obs`) can extract.

```
Crypto Op → Raw Timing → [IIR Filter] → [PID Controller] → (WCET pad) → T_obs ← ATTACKER
```

- **Frontend:** React + TypeScript + Tailwind (Vite), hand-drawn SVG charts. Phones (<768px) get a
  "use a tablet or PC" notice.
- **Two modes.** *Beginner* (the default) is a guided choose → run → understand journey: plain-language
  scenario cards, a plain explanation beside every setting, advanced settings collapsed, and a "What
  happened" summary with a suggested next scenario. *Pro* is the full technical dashboard. Every
  explanation opens on tap, never on hover alone, so it works on touchscreens.
- **No surprise runs.** A simulation starts only from an explicit click (Run or a "Try …" button), never from
  switching modes, choosing a preset or reloading. Settings and the last result are saved in `localStorage`
  (`src/lib/session.ts`) and restored on return. The header **Guide** explains both modes and can clear the
  saved session.
- **Glossary.** Dotted-underlined terms (IIR, PID, WCET, p-value, …) explain themselves in plain English, with an
  everyday analogy, on hover, tap or keyboard focus. The How it works page ends with the full glossary (`src/lib/glossary.ts`).
- **Backend:** FastAPI. `app/engine.py` is a parameterised port of `original_leakage_analysis.py`, with
  the pipeline maths unchanged.
- **Deploy:** Docker Compose (API + Nginx static/proxy), routed by an existing Traefik instance through
  Docker labels. See [DEPLOY.md](DEPLOY.md).

## Model notes

- `T_obs = raw + max(0, PID(IIR(raw)))`. Heavy smoothing (low α) makes the IIR stage *look* secure, but
  the PID then can't see which bit just ran, so the full gap reaches `T_obs`. The pipeline only closes
  the gap with high α and Kp ≈ 2.
- **Threat models.** An *external* attacker sees 15% of operations with ~30ms network jitter. A *rogue node*
  sees every operation with no jitter.
- **Verdict.** The attacker reports a leak only when gap > threshold **and** Welch's t-test gives p < 0.001.
  This stops jitter noise from producing false "leaks".
- **WCET padding** (`T_obs = max(T_obs, budget)`) is the only deterministic defense: with no overruns the
  gap is exactly 0.

### Scenarios / presets (checked over 30 seeds each)

| Preset | α / Kp / Ki / Kd | Threat | Leak rate |
|---|---|---|---|
| Default (original script) | 0.05 / 0.8 / 0.1 / 0.05 | external | 27/30 |
| Weak Defense | 0.02 / 0.3 / 0.02 / 0.01 | external | 29/30 |
| Strong Defense | 0.99 / 2.0 / 0.01 / 0.01 | external | 1/30 (rogue node: 5/30) |
| WCET Guarantee | as Strong, WCET 600ms | rogue node | 0/30 (external also 0/30) |
| Rogue Node Attack | 0.8 / 1.5 / 0.01 / 0.05 | rogue node | 30/30 (same config, external: 4/30) |

## Local development

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --port 8000        # API on :8000
.venv/bin/pytest -q                               # tests

cd frontend && npm install && npm run dev          # UI on :5173, proxies /api → :8000
```

API docs: `http://localhost:8000/api/docs`.
