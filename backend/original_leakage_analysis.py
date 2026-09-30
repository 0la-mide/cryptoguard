"""
Timing Leakage Analysis Script
================================
Models the full IIR + PID defense pipeline.
Attacker sits at T_obs (final observable output).
Flags any leakage > 4.5ms variance between secret bit groups.

Pipeline:
  Crypto Op → Raw Timing → [IIR Filter] → [PID Controller] → T_obs ← ATTACKER
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy import stats

# ─── Configuration ────────────────────────────────────────────────────────────

SETPOINT        = 500.0   # ms — target observable time (T_ref)
SAMPLES         = 500     # number of crypto operations simulated
LEAKAGE_THRESHOLD = 4.5   # ms — flag if attacker-observable variance exceeds this

# IIR (first-order low-pass)
ALPHA           = 0.05    # smoothing factor — low = heavy smoothing

# PID gains
Kp              = 0.8
Ki              = 0.1
Kd              = 0.05

# Simulated crypto timing per secret bit (what the system sees internally)
# bit=0: mean 480ms, bit=1: mean 520ms — 40ms raw leakage gap
BIT0_MEAN, BIT0_STD = 480.0, 8.0
BIT1_MEAN, BIT1_STD = 520.0, 8.0

# ─── IIR Filter ───────────────────────────────────────────────────────────────

class IIRFilter:
    """First-order IIR low-pass (Exponential Moving Average)
       y[n] = alpha * x[n] + (1 - alpha) * y[n-1]
    """
    def __init__(self, alpha: float):
        self.alpha = alpha
        self.prev  = None

    def process(self, x: float) -> float:
        if self.prev is None:
            self.prev = x
            return x
        y = self.alpha * x + (1 - self.alpha) * self.prev
        self.prev = y
        return y

# ─── PID Controller ───────────────────────────────────────────────────────────

class PIDController:
    """PID that injects a corrective delay so T_obs → setpoint."""
    def __init__(self, setpoint: float, Kp: float, Ki: float, Kd: float):
        self.setpoint   = setpoint
        self.Kp         = Kp
        self.Ki         = Ki
        self.Kd         = Kd
        self.integral   = 0.0
        self.prev_error = 0.0

    def compute(self, measured: float) -> float:
        error          = self.setpoint - measured
        self.integral += error
        derivative     = error - self.prev_error
        self.prev_error = error

        delay = (self.Kp * error +
                 self.Ki * self.integral +
                 self.Kd * derivative)
        return max(0.0, delay)   # can't inject negative time

# ─── Simulate Pipeline ────────────────────────────────────────────────────────

def simulate(n_samples: int):
    iir = IIRFilter(alpha=ALPHA)
    pid = PIDController(SETPOINT, Kp, Ki, Kd)

    secret_bits  = np.random.randint(0, 2, n_samples)

    raw_times, filtered_times, t_obs_list = [], [], []
    pid_delays = []

    for bit in secret_bits:
        # Crypto operation produces secret-dependent timing (INTERNAL — attacker never sees this)
        if bit == 0:
            raw = np.random.normal(BIT0_MEAN, BIT0_STD)
        else:
            raw = np.random.normal(BIT1_MEAN, BIT1_STD)

        filtered = iir.process(raw)
        delay    = pid.compute(filtered)
        t_obs    = raw + delay          # what the attacker actually measures

        raw_times.append(raw)
        filtered_times.append(filtered)
        pid_delays.append(delay)
        t_obs_list.append(t_obs)

    return (secret_bits,
            np.array(raw_times),
            np.array(filtered_times),
            np.array(pid_delays),
            np.array(t_obs_list))

# ─── Leakage Analyser ─────────────────────────────────────────────────────────

def analyse_leakage(secret_bits, timings, stage_name: str):
    """
    Attacker splits observed timings by secret bit and checks if
    the mean difference exceeds the leakage threshold.
    Returns dict with analysis results.
    """
    t0 = timings[secret_bits == 0]
    t1 = timings[secret_bits == 1]

    mean0, mean1 = t0.mean(), t1.mean()
    std0,  std1  = t0.std(),  t1.std()
    gap          = abs(mean1 - mean0)

    # Welch's t-test — are the two groups statistically distinguishable?
    t_stat, p_value = stats.ttest_ind(t0, t1, equal_var=False)

    leaked = gap > LEAKAGE_THRESHOLD

    result = {
        "stage"    : stage_name,
        "mean_bit0": mean0,
        "mean_bit1": mean1,
        "std_bit0" : std0,
        "std_bit1" : std1,
        "gap_ms"   : gap,
        "t_stat"   : t_stat,
        "p_value"  : p_value,
        "leaked"   : leaked,
        "t0"       : t0,
        "t1"       : t1,
    }
    return result

# ─── Report Printer ───────────────────────────────────────────────────────────

RESET  = "\033[0m"
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"

def print_report(results: list):
    print(f"\n{BOLD}{'═'*62}{RESET}")
    print(f"{BOLD}  TIMING LEAKAGE ANALYSIS REPORT{RESET}")
    print(f"  Threshold : {LEAKAGE_THRESHOLD} ms")
    print(f"  Setpoint  : {SETPOINT} ms")
    print(f"  Samples   : {SAMPLES}")
    print(f"  Attacker  : observing T_obs (final pipeline output)")
    print(f"{BOLD}{'═'*62}{RESET}\n")

    for r in results:
        status = f"{RED}⚠  LEAK DETECTED{RESET}" if r["leaked"] else f"{GREEN}✓  SECURE{RESET}"
        sig    = "YES" if r["p_value"] < 0.05 else "no"
        sig_col= RED if r["p_value"] < 0.05 else GREEN

        print(f"  {BOLD}Stage : {CYAN}{r['stage']}{RESET}")
        print(f"  {'─'*56}")
        print(f"  bit=0  → mean {r['mean_bit0']:7.2f} ms  std {r['std_bit0']:.2f} ms")
        print(f"  bit=1  → mean {r['mean_bit1']:7.2f} ms  std {r['std_bit1']:.2f} ms")
        print(f"  Gap    → {BOLD}{r['gap_ms']:.2f} ms{RESET}  (threshold {LEAKAGE_THRESHOLD} ms)")
        print(f"  t-stat → {r['t_stat']:.3f}   p-value {r['p_value']:.4f}")
        print(f"  Statistically distinguishable: {sig_col}{sig}{RESET}")
        print(f"  Status → {status}")
        print()

    # Attacker summary
    t_obs_result = next(r for r in results if "T_obs" in r["stage"])
    print(f"{BOLD}{'─'*62}{RESET}")
    print(f"{BOLD}  ATTACKER VIEW (T_obs){RESET}")
    if t_obs_result["leaked"]:
        print(f"  {RED}Gap of {t_obs_result['gap_ms']:.2f} ms exceeds {LEAKAGE_THRESHOLD} ms threshold.{RESET}")
        print(f"  {RED}Attacker CAN distinguish secret bits statistically.{RESET}")
        print(f"\n  {YELLOW}Recommendations:{RESET}")
        print(f"  → Lower IIR alpha (increase smoothing)")
        print(f"  → Increase PID Ki (stronger integral correction)")
        print(f"  → Consider WCET padding as a deterministic fallback")
    else:
        print(f"  {GREEN}Gap of {t_obs_result['gap_ms']:.2f} ms is below {LEAKAGE_THRESHOLD} ms threshold.{RESET}")
        print(f"  {GREEN}Attacker CANNOT reliably distinguish secret bits.{RESET}")
        print(f"  {GREEN}Pipeline is holding. No leakage detected at T_obs.{RESET}")
    print(f"{BOLD}{'═'*62}{RESET}\n")

# ─── Plot ─────────────────────────────────────────────────────────────────────

def plot_results(results, t_obs_arr, secret_bits):
    fig, axes = plt.subplots(2, 2, figsize=(13, 9))
    fig.patch.set_facecolor('#0f0f1a')
    for ax in axes.flat:
        ax.set_facecolor('#1a1a2e')
        ax.tick_params(colors='#aaaaaa')
        ax.xaxis.label.set_color('#cccccc')
        ax.yaxis.label.set_color('#cccccc')
        for spine in ax.spines.values():
            spine.set_edgecolor('#333355')

    colors = {'bit0': '#5bc8f5', 'bit1': '#f5825b', 'threshold': '#f5c842'}

    stages_to_plot = [(r, ax) for r, ax in zip(results, axes.flat)]

    for r, ax in stages_to_plot:
        ax.hist(r["t0"], bins=40, alpha=0.7, color=colors['bit0'],
                label='bit=0', density=True)
        ax.hist(r["t1"], bins=40, alpha=0.7, color=colors['bit1'],
                label='bit=1', density=True)

        # Mark means
        ax.axvline(r["mean_bit0"], color=colors['bit0'],
                   linestyle='--', linewidth=1.2)
        ax.axvline(r["mean_bit1"], color=colors['bit1'],
                   linestyle='--', linewidth=1.2)

        # Threshold band around setpoint
        ax.axvspan(SETPOINT - LEAKAGE_THRESHOLD,
                   SETPOINT + LEAKAGE_THRESHOLD,
                   alpha=0.12, color=colors['threshold'],
                   label=f'±{LEAKAGE_THRESHOLD}ms safe zone')

        status = "⚠ LEAK" if r["leaked"] else "✓ SECURE"
        color  = '#ff6b6b' if r["leaked"] else '#6bff9e'
        ax.set_title(f"{r['stage']}  —  gap {r['gap_ms']:.2f}ms  {status}",
                     color=color, fontsize=10, fontweight='bold')
        ax.set_xlabel("Time (ms)", fontsize=9)
        ax.set_ylabel("Density",   fontsize=9)
        ax.legend(fontsize=8, facecolor='#1a1a2e', labelcolor='white',
                  edgecolor='#333355')

    # 4th panel: T_obs time series
    ax4 = axes[1][1]
    x   = np.arange(len(t_obs_arr))
    ax4.scatter(x[secret_bits==0], t_obs_arr[secret_bits==0],
                s=4, alpha=0.5, color=colors['bit0'], label='bit=0')
    ax4.scatter(x[secret_bits==1], t_obs_arr[secret_bits==1],
                s=4, alpha=0.5, color=colors['bit1'], label='bit=1')
    ax4.axhline(SETPOINT, color=colors['threshold'],
                linestyle='--', linewidth=1, label=f'Setpoint {SETPOINT}ms')
    ax4.axhline(SETPOINT + LEAKAGE_THRESHOLD,
                color='#ff6b6b', linestyle=':', linewidth=0.8, label=f'+{LEAKAGE_THRESHOLD}ms limit')
    ax4.axhline(SETPOINT - LEAKAGE_THRESHOLD,
                color='#ff6b6b', linestyle=':', linewidth=0.8, label=f'-{LEAKAGE_THRESHOLD}ms limit')
    ax4.set_title("T_obs over time  (attacker's view)",
                  color='#cccccc', fontsize=10, fontweight='bold')
    ax4.set_xlabel("Sample index", fontsize=9)
    ax4.set_ylabel("T_obs (ms)",   fontsize=9)
    ax4.legend(fontsize=7, facecolor='#1a1a2e', labelcolor='white',
               edgecolor='#333355')

    fig.suptitle("Timing Leakage Analysis  —  IIR + PID Defense Pipeline",
                 color='white', fontsize=13, fontweight='bold', y=1.01)
    plt.tight_layout()
    path = "/mnt/user-data/outputs/leakage_analysis.png"
    plt.savefig(path, dpi=150, bbox_inches='tight',
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"  Plot saved → {path}")
    return path

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    np.random.seed(42)

    print(f"\n{CYAN}Running pipeline simulation ({SAMPLES} samples)...{RESET}")
    secret_bits, raw_times, filtered_times, pid_delays, t_obs = simulate(SAMPLES)

    # Analyse leakage at every stage of the pipeline
    results = [
        analyse_leakage(secret_bits, raw_times,      "1. Raw timing    (internal — attacker CANNOT see)"),
        analyse_leakage(secret_bits, filtered_times, "2. IIR output    (internal — attacker CANNOT see)"),
        analyse_leakage(secret_bits, t_obs,          "3. T_obs         (ATTACKER observes this)"),
    ]

    print_report(results)
    plot_results(results[:2] + [results[2]], t_obs, secret_bits)

if __name__ == "__main__":
    main()
