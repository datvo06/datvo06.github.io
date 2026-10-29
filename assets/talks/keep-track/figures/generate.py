"""Render the recorded pilot comparisons cited in the slides."""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.figure import Figure

OUT = Path(__file__).parent
BLUE, GREEN, GRAY = "#1e3a8a", "#247d70", "#798393"
plt.switch_backend("Agg")
plt.rcParams.update(
    {
        "font.family": "DejaVu Sans",
        "font.size": 16,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.spines.left": False,
        "axes.edgecolor": "#dce1e9",
        "text.color": "#1f2330",
        "axes.labelcolor": "#596170",
        "xtick.color": "#596170",
        "ytick.color": "#1f2330",
        "svg.fonttype": "none",
        "savefig.facecolor": "white",
    }
)


def save(fig: Figure, name: str) -> None:
    """Export a plot with editable SVG text."""
    fig.savefig(OUT / f"{name}.svg", bbox_inches="tight")
    plt.close(fig)


# https://github.com/datvo06/keep-track/pull/12, /13 and /14.
fig, axes = plt.subplots(
    1,
    2,
    figsize=(13, 4.7),
    layout="constrained",
    gridspec_kw={"width_ratios": [1.5, 1]},
)
labels = [
    "Coverage evaluator",
    "Host search",
    "+ clearer instructions",
    "+ document type",
    "+ context manager",
]
targets = [[3, 1, 1], [3, 4, 5], [7, 5, 4], [6, 5, 6], [7, 7, 7]]
colors = [GRAY, BLUE, BLUE, BLUE, GREEN]
for row, (values, color) in enumerate(zip(targets, colors)):
    mean = np.mean(values)
    axes[0].plot([0, mean], [row, row], color=color, alpha=0.18, linewidth=13)
    axes[0].scatter(
        values, row + np.array([-0.12, 0, 0.12]), s=85, color=color, zorder=3
    )
    axes[0].text(8.35, row, f"{mean / 8:.1%}", va="center", fontsize=14, color=color)
axes[0].set(
    yticks=range(5),
    yticklabels=labels,
    xticks=range(9),
    xlim=(-0.2, 9.7),
    ylim=(4.5, -0.6),
    xlabel="Targets recovered per run (out of 8)",
)
axes[0].set_title("Recovery across three runs", loc="left", fontsize=18, pad=16)
for row, (values, color) in enumerate(
    [([29, 52, 75], GRAY), ([223, 217, 215], BLUE), ([161, 192, 157], GREEN)]
):
    axes[1].scatter(values, row + np.array([-0.09, 0, 0.09]), s=85, color=color)
axes[1].set(
    yticks=range(3),
    yticklabels=["Coverage", "Host search", "All interface fixes"],
    xlim=(0, 250),
    ylim=(2.5, -0.6),
    xlabel="Completion requests per run",
)
axes[1].set_title("Request cost", loc="left", fontsize=18, pad=16)
save(fig, "search-progress")


# examples/EXPERIMENT_REPORT.md at 5c43bda, RQ2 and RQ6.
fig, ax = plt.subplots(figsize=(12, 4.4), layout="constrained")
labels = [
    "Soundness only",
    "Coverage (first run)",
    "Host search (Oct 4)",
    "Guided LangExtract",
    "LangExtract +\nproof reconstruction",
    "Direct structured LLM",
]
values = [0, 37.5, 87.5, 100, 100, 75]
precision = ["undefined", "100%", "100%", "80%", "100%", "100%"]
colors = [GRAY, GRAY, BLUE, GRAY, GREEN, GRAY]
y = np.arange(len(labels))
bars = ax.barh(y, values, height=0.52, color=colors)
ax.bar_label(bars, labels=[f"{v:g}%" for v in values], padding=6, fontsize=15)
for row, value in enumerate(precision):
    ax.text(132, row, value, ha="center", va="center", fontsize=15)
ax.text(132, -1, "Precision", ha="center", color="#596170", fontsize=16)
ax.set(
    yticks=y,
    yticklabels=labels,
    xlim=(0, 147),
    xticks=[0, 25, 50, 75, 100],
    xlabel="Recall (%)",
)
ax.invert_yaxis()
save(fig, "october-baselines")


# keep-track experiments/{BASELINE,DOMAIN,DERIVATION,PAID_REFINEMENT}_RESULTS.md:
# relation F1 on 65 BioRelFact development pairs, three gpt-5.4-mini trials each.
fig, axes = plt.subplots(
    1,
    2,
    figsize=(13, 5.4),
    layout="constrained",
    gridspec_kw={"width_ratios": [1.5, 1]},
)
labels = [
    "Plain GPT",
    "LangExtract",
    "Coverage search",
    "+ supplied entity types",
    "Five-word mapping list",
    "Paid mappings, first accepted",
    "Paid mappings + coverage search",
]
f1 = [
    [64.3, 72.1, 74.4],
    [64.3, 65.1, 63.5],
    [64.4, 58.7, 62.2],
    [65.9, 61.5, 62.9],
    [10.5, 5.4, 10.3],
    [59.5, 63.5, 64.3],
    [62.2, 62.4, 64.5],
]
# Reported means average unrounded trial scores, so they can differ from the
# mean of the rounded values above.
means = [70.2, 64.3, 61.8, 63.5, 8.7, 62.4, 63.0]
precision = [62.4, 56.3, 51.3, 53.2, 88.9, 54.5, 51.8]
recall = [80.6, 75.0, 77.8, 78.7, 4.6, 73.1, 80.6]
colors = [GRAY, GRAY, BLUE, BLUE, GRAY, BLUE, GREEN]
for row, (values, mean, color) in enumerate(zip(f1, means, colors)):
    axes[0].plot([0, mean], [row, row], color=color, alpha=0.18, linewidth=13)
    axes[0].scatter(
        values, row + np.array([-0.12, 0, 0.12]), s=85, color=color, zorder=3
    )
    axes[0].text(84, row, f"{mean:.1f}%", va="center", fontsize=14)
axes[0].set(
    yticks=range(len(labels)),
    yticklabels=labels,
    xticks=range(0, 81, 20),
    xlim=(0, 93),
    ylim=(len(labels) - 0.5, -0.6),
    xlabel="Relation F1 per trial (%)",
)
axes[0].set_title("Relation F1 across three trials", loc="left", fontsize=18, pad=16)
for row, (p, r, color) in enumerate(zip(precision, recall, colors)):
    axes[1].plot([p, r], [row, row], color=color, alpha=0.35, linewidth=2)
    axes[1].scatter(p, row, s=85, color=color, zorder=3)
    axes[1].scatter(r, row, s=85, facecolor="white", edgecolor=color, lw=2, zorder=3)
axes[1].scatter([], [], s=85, color=GRAY, label="Precision")
axes[1].scatter([], [], s=85, facecolor="white", edgecolor=GRAY, lw=2, label="Recall")
axes[1].legend(loc="lower left", bbox_to_anchor=(0, 1.0), ncol=2, frameon=False)
axes[1].set(
    yticks=range(len(labels)),
    yticklabels=[],
    xticks=[0, 25, 50, 75, 100],
    xlim=(0, 100),
    ylim=(len(labels) - 0.5, -0.6),
    xlabel="Mean over trials (%)",
)
axes[1].tick_params(axis="y", length=0)
save(fig, "biorelfact-progress")
