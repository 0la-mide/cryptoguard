"""
CryptoGuard simulation engine.

A parameterised port of leakage_analysis.py. The pipeline maths is unchanged:

    Crypto Op -> Raw Timing -> [IIR Filter] -> [PID Controller] -> T_obs <- ATTACKER

    filtered = alpha * raw + (1 - alpha) * prev            (IIR / EMA)
    delay    = max(0, Kp*e + Ki*sum(e) + Kd*de),  e = T_ref - filtered
    T_obs    = raw + delay

Additions on top of the original script:
  * Threat model. An external attacker sees only a fraction of operations,
    each blurred by network jitter. A rogue node sees every operation cleanly.
  * Optional WCET padding stage: T_obs = max(T_obs, budget). Deterministic.
  * The attacker verdict at T_obs needs both gap > threshold and p < 0.001 (SIGNIFICANCE),
    so a noisy, under-sampled attacker can't "detect" a leak by chance.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
from scipy import stats

# Raw crypto timing is centred on this base, as in the original (480 / 520ms).
BASE_TIME_MS = 500.0

# External attacker: sees 15% of operations, each with ~30ms of network jitter.
EXTERNAL_SAMPLE_FRACTION = 0.15
EXTERNAL_JITTER_STD_MS = 30.0

SIGNIFICANCE = 0.001  # a careful attacker wants high confidence before acting
HIST_BINS = 40

ThreatModel = Literal["external", "rogue_node"]


@dataclass
class SimConfig:
    samples: int = 500
    bit_gap_ms: float = 40.0
    noise_std_ms: float = 8.0
    alpha: float = 0.05
    kp: float = 0.8
    ki: float = 0.1
    kd: float = 0.05
    setpoint_ms: float = 500.0
    threat_model: ThreatModel = "external"
    threshold_ms: float = 4.5
    wcet_enabled: bool = False
    wcet_budget_ms: float = 600.0
    seed: int | None = None


# ─── Pipeline blocks (unchanged from leakage_analysis.py) ─────────────────────

class IIRFilter:
    """First-order IIR low-pass (Exponential Moving Average)
       y[n] = alpha * x[n] + (1 - alpha) * y[n-1]
    """
    def __init__(self, alpha: float):
        self.alpha = alpha
        self.prev = None

    def process(self, x: float) -> float:
        if self.prev is None:
            self.prev = x
            return x
        y = self.alpha * x + (1 - self.alpha) * self.prev
        self.prev = y
        return y


class PIDController:
    """PID that injects a corrective delay so T_obs -> setpoint."""
    def __init__(self, setpoint: float, kp: float, ki: float, kd: float):
        self.setpoint = setpoint
        self.kp, self.ki, self.kd = kp, ki, kd
        self.integral = 0.0
        self.prev_error = 0.0

    def compute(self, measured: float) -> float:
        error = self.setpoint - measured
        self.integral += error
        derivative = error - self.prev_error
        self.prev_error = error
        delay = self.kp * error + self.ki * self.integral + self.kd * derivative
        return max(0.0, delay)  # can't inject negative time


# ─── Simulation ───────────────────────────────────────────────────────────────

def simulate(cfg: SimConfig, rng: np.random.Generator):
    iir = IIRFilter(cfg.alpha)
    pid = PIDController(cfg.setpoint_ms, cfg.kp, cfg.ki, cfg.kd)

    bits = rng.integers(0, 2, cfg.samples)
    means = (BASE_TIME_MS - cfg.bit_gap_ms / 2, BASE_TIME_MS + cfg.bit_gap_ms / 2)
    raw = rng.normal(np.take(means, bits), cfg.noise_std_ms)

    filtered = np.empty(cfg.samples)
    delays = np.empty(cfg.samples)
    for i, r in enumerate(raw):
        filtered[i] = iir.process(r)
        delays[i] = pid.compute(filtered[i])

    t_obs = raw + delays
    overruns = 0
    if cfg.wcet_enabled:
        overruns = int(np.sum(t_obs > cfg.wcet_budget_ms))
        t_obs = np.maximum(t_obs, cfg.wcet_budget_ms)

    return bits, raw, filtered, delays, t_obs, overruns


def attacker_observation(cfg: SimConfig, bits, t_obs, rng: np.random.Generator):
    """What the attacker actually gets to measure, per the threat model."""
    idx = np.arange(len(t_obs))
    if cfg.threat_model == "rogue_node":
        return idx, bits, t_obs.copy()
    n = max(4, int(round(len(t_obs) * EXTERNAL_SAMPLE_FRACTION)))
    idx = np.sort(rng.choice(len(t_obs), size=min(n, len(t_obs)), replace=False))
    jitter = rng.normal(0.0, EXTERNAL_JITTER_STD_MS, len(idx))
    return idx, bits[idx], t_obs[idx] + jitter


# ─── Analysis ─────────────────────────────────────────────────────────────────

def _welch(t0: np.ndarray, t1: np.ndarray) -> tuple[float, float]:
    if len(t0) < 2 or len(t1) < 2:
        return 0.0, 1.0
    # A perfect defense (e.g. WCET) gives zero variance; scipy returns nan there.
    if np.ptp(np.concatenate([t0, t1])) == 0:
        return 0.0, 1.0
    t, p = stats.ttest_ind(t0, t1, equal_var=False)
    if not np.isfinite(t):
        return 0.0, 1.0
    return float(t), float(p)


def _histogram(t0: np.ndarray, t1: np.ndarray, cfg: SimConfig):
    lo = min(t0.min(), t1.min(), cfg.setpoint_ms - cfg.threshold_ms)
    hi = max(t0.max(), t1.max(), cfg.setpoint_ms + cfg.threshold_ms)
    if hi - lo < 1e-9:
        lo, hi = lo - 1, hi + 1
    edges = np.linspace(lo, hi, HIST_BINS + 1)
    c0, _ = np.histogram(t0, edges, density=True)
    c1, _ = np.histogram(t1, edges, density=True)
    return {"edges": _r(edges), "bit0": _r(c0, 6), "bit1": _r(c1, 6)}


def analyse(bits, timings, cfg: SimConfig, stage: str, label: str,
            require_significance: bool = False):
    t0, t1 = timings[bits == 0], timings[bits == 1]
    mean0, mean1 = float(t0.mean()), float(t1.mean())
    gap = abs(mean1 - mean0)
    t_stat, p_value = _welch(t0, t1)
    distinguishable = p_value < SIGNIFICANCE
    leaked = gap > cfg.threshold_ms and (distinguishable or not require_significance)
    return {
        "stage": stage,
        "label": label,
        "n": int(len(timings)),
        "mean_bit0": mean0,
        "mean_bit1": mean1,
        "std_bit0": float(t0.std()),
        "std_bit1": float(t1.std()),
        "gap_ms": gap,
        "t_stat": t_stat,
        "p_value": p_value,
        "distinguishable": bool(distinguishable),
        "leaked": bool(leaked),
        "histogram": _histogram(t0, t1, cfg),
    }


def samples_to_break(gap_ms: float, pooled_std: float, threshold_ms: float) -> int | None:
    """Rough sample count for a two-sided Welch test to separate the bit groups
    at alpha=0.05 with 80% power. None when the gap is under threshold."""
    if gap_ms <= threshold_ms or gap_ms <= 0:
        return None
    if pooled_std <= 0:
        return 4
    z = 1.96 + 0.8416
    per_group = 2 * (z * pooled_std / gap_ms) ** 2
    return int(np.ceil(max(2, per_group) * 2))


def recommendations(cfg: SimConfig, raw_r, iir_r, obs_r, overruns: int, true_gap: float):
    """Generated from what the model actually does, not from a fixed list."""
    out: list[str] = []
    if not obs_r["leaked"]:
        if cfg.threat_model == "external" and true_gap > cfg.threshold_ms:
            out.append(
                f"The true T_obs gap is {true_gap:.2f}ms: this only holds because the external "
                "attacker is sample-starved. A rogue node would see it."
            )
        return out

    if not iir_r["leaked"] and cfg.alpha < 0.5:
        out.append(
            f"IIR output looks secure ({iir_r['gap_ms']:.2f}ms) but T_obs leaks "
            f"({obs_r['gap_ms']:.2f}ms): heavy smoothing hides which bit just ran from the PID, "
            "so it can't cancel it. Raise IIR α toward 0.9+."
        )
    elif cfg.alpha < 0.9:
        out.append("Raise IIR α toward 0.9+ so the PID tracks each operation instead of the average.")
    if cfg.kp < 1.8:
        out.append("Increase PID Kp toward 2.0 so the injected delay cancels per-operation deviation.")
    if cfg.ki > 0.1 and cfg.alpha >= 0.9:
        out.append("Lower PID Ki: with an open-loop integral, a large Ki adds drift instead of correction.")
    if abs(cfg.setpoint_ms - BASE_TIME_MS) > 40:
        out.append(
            f"Move T_ref closer to the operation's base time (~{BASE_TIME_MS:.0f}ms): a distant "
            "setpoint makes the integral wind up."
        )
    if not cfg.wcet_enabled:
        out.append("Enable WCET padding: the only defense here with a deterministic guarantee.")
    elif overruns:
        out.append(
            f"{overruns} operation(s) overran the {cfg.wcet_budget_ms:.0f}ms WCET budget and leaked "
            "their timing. Raise the budget above the worst case."
        )
    return out


def run(cfg: SimConfig) -> dict:
    seed = cfg.seed if cfg.seed is not None else int(np.random.default_rng().integers(0, 2**31 - 1))
    cfg.seed = seed
    rng = np.random.default_rng(seed)

    bits, raw, filtered, delays, t_obs, overruns = simulate(cfg, rng)
    obs_idx, obs_bits, obs_times = attacker_observation(cfg, bits, t_obs, rng)

    raw_r = analyse(bits, raw, cfg, "raw", "Raw Timing")
    iir_r = analyse(bits, filtered, cfg, "iir", "IIR Output")
    true_obs_r = analyse(bits, t_obs, cfg, "t_obs_true", "T_obs (all samples)")
    obs_r = analyse(obs_bits, obs_times, cfg, "t_obs", "T_obs (attacker)", require_significance=True)

    pooled = float(np.sqrt((obs_r["std_bit0"] ** 2 + obs_r["std_bit1"] ** 2) / 2))

    return {
        "config": cfg.__dict__,
        "stages": [raw_r, iir_r, obs_r],
        "true_t_obs_gap_ms": true_obs_r["gap_ms"],
        "attacker": {
            "threat_model": cfg.threat_model,
            "samples_observed": int(len(obs_idx)),
            "samples_total": cfg.samples,
            "jitter_std_ms": 0.0 if cfg.threat_model == "rogue_node" else EXTERNAL_JITTER_STD_MS,
            "leaked": obs_r["leaked"],
            "samples_to_break": samples_to_break(obs_r["gap_ms"], pooled, cfg.threshold_ms),
        },
        "pid": {
            "mean_delay_ms": float(delays.mean()),
            "max_delay_ms": float(delays.max()),
            "wcet_overruns": overruns,
        },
        "series": {
            "index": obs_idx.tolist(),
            "bit": obs_bits.tolist(),
            "t_obs": _r(obs_times),
        },
        "recommendations": recommendations(cfg, raw_r, iir_r, obs_r, overruns, true_obs_r["gap_ms"]),
    }


def _r(a, nd: int = 3) -> list[float]:
    return [round(float(x), nd) for x in a]
