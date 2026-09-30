"""PDF export of a simulation run: summary, per-stage table, verdict, charts."""

import io
from datetime import datetime, timezone

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

RED = colors.HexColor("#d9534f")
GREEN = colors.HexColor("#1D9E75")
INK = colors.HexColor("#1a1a2e")
MUTED = colors.HexColor("#5a5a70")

C_BIT0, C_BIT1, C_BAND = "#378ADD", "#f5825b", "#1D9E75"


def _plots(result: dict) -> bytes:
    cfg = result["config"]
    sp, th = cfg["setpoint_ms"], cfg["threshold_ms"]
    fig, axes = plt.subplots(2, 2, figsize=(11, 7.5))
    fig.patch.set_facecolor("#0f0f1a")
    for ax in axes.flat:
        ax.set_facecolor("#161628")
        ax.tick_params(colors="#aaaaaa", labelsize=8)
        for s in ax.spines.values():
            s.set_edgecolor("#2a2a45")

    for st, ax in zip(result["stages"], axes.flat):
        h = st["histogram"]
        edges = np.array(h["edges"])
        w = np.diff(edges)
        ax.bar(edges[:-1], h["bit0"], width=w, align="edge", alpha=0.7, color=C_BIT0, label="bit=0")
        ax.bar(edges[:-1], h["bit1"], width=w, align="edge", alpha=0.7, color=C_BIT1, label="bit=1")
        ax.axvspan(sp - th, sp + th, alpha=0.15, color=C_BAND, label=f"±{th}ms safe zone")
        col = "#ff6b6b" if st["leaked"] else "#6bff9e"
        tag = "LEAK" if st["leaked"] else "SECURE"
        ax.set_title(f"{st['label']} — gap {st['gap_ms']:.2f}ms  {tag}", color=col, fontsize=10, fontweight="bold")
        ax.legend(fontsize=7, facecolor="#161628", labelcolor="white", edgecolor="#2a2a45")

    ax = axes[1][1]
    s = result["series"]
    idx, bits, t = np.array(s["index"]), np.array(s["bit"]), np.array(s["t_obs"])
    ax.scatter(idx[bits == 0], t[bits == 0], s=4, alpha=0.6, color=C_BIT0, label="bit=0")
    ax.scatter(idx[bits == 1], t[bits == 1], s=4, alpha=0.6, color=C_BIT1, label="bit=1")
    ax.axhline(sp, color="#f5c842", linestyle="--", linewidth=1, label=f"T_ref {sp:.0f}ms")
    ax.axhspan(sp - th, sp + th, alpha=0.12, color=C_BAND)
    ax.set_title("T_obs over time (attacker's view)", color="#cccccc", fontsize=10, fontweight="bold")
    ax.legend(fontsize=7, facecolor="#161628", labelcolor="white", edgecolor="#2a2a45")

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, facecolor=fig.get_facecolor())
    plt.close(fig)
    return buf.getvalue()


def build_pdf(result: dict) -> bytes:
    cfg, att = result["config"], result["attacker"]
    obs = result["stages"][2]
    ss = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=ss["Title"], alignment=TA_LEFT, textColor=INK, fontSize=20, spaceAfter=2)
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], textColor=INK, fontSize=12, spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle("b", parent=ss["BodyText"], fontSize=9.5, leading=13)
    small = ParagraphStyle("s", parent=body, fontSize=8, textColor=MUTED)
    mono = ParagraphStyle("m", parent=body, fontName="Courier", fontSize=9)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                            topMargin=14 * mm, bottomMargin=14 * mm,
                            title="CryptoGuard Timing Leakage Report")
    story = []
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story += [
        Paragraph("CryptoGuard — Timing Leakage Report", h1),
        Paragraph(f"Side-channel timing attack lab · generated {stamp} · seed {cfg['seed']}", small),
        Spacer(1, 6),
    ]

    verdict_col = RED if att["leaked"] else GREEN
    verdict = "LEAK DETECTED — secret bits ARE distinguishable at T_obs" if att["leaked"] \
        else "DEFENSE HOLDING — no signal extractable at T_obs"
    vt = Table([[Paragraph(f"<font color='white'><b>{verdict}</b></font>", body)]], colWidths=[178 * mm])
    vt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), verdict_col),
                            ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.append(vt)

    threat = "Rogue node (all samples, no network jitter)" if cfg["threat_model"] == "rogue_node" \
        else f"External attacker ({att['samples_observed']} of {att['samples_total']} samples, ±{att['jitter_std_ms']:.0f}ms jitter)"
    story.append(Paragraph("Configuration", h2))
    conf = [
        ["Samples", cfg["samples"], "IIR α", cfg["alpha"]],
        ["Secret bit gap", f"{cfg['bit_gap_ms']} ms", "PID Kp / Ki / Kd", f"{cfg['kp']} / {cfg['ki']} / {cfg['kd']}"],
        ["System noise σ", f"{cfg['noise_std_ms']} ms", "Setpoint T_ref", f"{cfg['setpoint_ms']} ms"],
        ["Leakage threshold", f"{cfg['threshold_ms']} ms", "WCET padding",
         f"{cfg['wcet_budget_ms']} ms" if cfg["wcet_enabled"] else "off"],
    ]
    t = Table(conf, colWidths=[38 * mm, 50 * mm, 38 * mm, 52 * mm])
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "Helvetica", 9),
                           ("FONT", (1, 0), (1, -1), "Courier", 9), ("FONT", (3, 0), (3, -1), "Courier", 9),
                           ("TEXTCOLOR", (0, 0), (0, -1), MUTED), ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
                           ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#dddddd"))]))
    story += [t, Spacer(1, 3), Paragraph(f"Threat model: {threat}", body)]

    story.append(Paragraph("Stage analysis", h2))
    rows = [["Stage", "n", "mean bit=0", "mean bit=1", "Gap", "t", "p", "Status"]]
    for st in result["stages"]:
        rows.append([st["label"], st["n"], f"{st['mean_bit0']:.2f}", f"{st['mean_bit1']:.2f}",
                     f"{st['gap_ms']:.2f} ms", f"{st['t_stat']:.3f}", f"{st['p_value']:.4f}",
                     "LEAK" if st["leaked"] else "SECURE"])
    t = Table(rows, colWidths=[36 * mm, 12 * mm, 22 * mm, 22 * mm, 22 * mm, 20 * mm, 20 * mm, 20 * mm])
    style = [("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5), ("FONT", (0, 1), (-1, -1), "Courier", 8.5),
             ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeef4")),
             ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#dddddd"))]
    for i, st in enumerate(result["stages"], start=1):
        style.append(("TEXTCOLOR", (7, i), (7, i), RED if st["leaked"] else GREEN))
    t.setStyle(TableStyle(style))
    story.append(t)
    story.append(Spacer(1, 3))
    story.append(Paragraph(
        f"True T_obs gap across all {cfg['samples']} operations: {result['true_t_obs_gap_ms']:.2f} ms. "
        f"Mean PID delay {result['pid']['mean_delay_ms']:.2f} ms (max {result['pid']['max_delay_ms']:.2f} ms)."
        + (f" WCET overruns: {result['pid']['wcet_overruns']}." if cfg["wcet_enabled"] else ""), small))

    story.append(Paragraph("Welch's t-test (attacker, T_obs)", h2))
    story.append(Paragraph(
        f"t-statistic: {obs['t_stat']:.3f}<br/>p-value: {obs['p_value']:.4g}<br/>"
        f"Distinguishable (p &lt; 0.001): {'YES' if obs['distinguishable'] else 'NO'}", mono))

    if result["recommendations"]:
        story.append(Paragraph("Findings &amp; recommendations", h2))
        for r in result["recommendations"]:
            story.append(Paragraph(f"→ {r}", body))

    story.append(Spacer(1, 6))
    story.append(Image(io.BytesIO(_plots(result)), width=178 * mm, height=121 * mm))
    doc.build(story)
    return buf.getvalue()
