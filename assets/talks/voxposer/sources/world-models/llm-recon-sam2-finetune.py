"""Plot SAM2's fine-tuning curve and test-set part IoU: llm-recon-sam2-finetune.py <data json> <out png>

Reads sources/world-models/llm-recon-sam2-finetune.json; the curve is held-out
point IoU from the fine-tuning log, the bars are median part IoU on the test
objects' fitting views, each labeled with the number of parts it covers.
"""

import json
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

data = json.load(open(sys.argv[1]))
INK, MUTED, ACCENT, REFERENCE = "#1f2430", "#4a4f5a", "#1E3A8A", "#b9c0cc"
plt.rcParams.update({"font.size": 12, "axes.edgecolor": MUTED, "axes.labelcolor": MUTED,
                     "xtick.color": MUTED, "ytick.color": MUTED, "text.color": INK})

fig, (curve, bars) = plt.subplots(1, 2, figsize=(11, 3.4), gridspec_kw={"width_ratios": [1.15, 1]})

views, iou = zip(*data["training"]["views_seen_vs_held_out_point_iou"])
curve.plot([v / 1000 for v in views], iou, color=ACCENT, marker="o", markersize=4, linewidth=2)
curve.annotate(f"stock {iou[0]:.2f}", (0, iou[0]), xytext=(8, -4), textcoords="offset points", color=MUTED)
# The final check runs after both passes end, at a view count the log does not record, so it is stated, not plotted.
curve.text(0.98, 0.08, f"after both passes: {data['training']['final_held_out_point_iou']:.2f}, the decoder used",
           transform=curve.transAxes, ha="right", color=ACCENT)
curve.set_xlabel("Training views seen (thousands), two passes")
curve.set_ylabel("Held-out point IoU")
curve.set_ylim(0.45, 1.0)
curve.set_title("Fine-tuning the mask decoder", loc="left", fontsize=13)

test = data["test_part_iou"]
rows = [("Agent's boxes", test["agent_boxes"], ACCENT),
        ("Stock SAM2,\nsurface points", test["stock_points"], ACCENT),
        ("Fine-tuned,\nsurface points", test["tuned_points"], ACCENT),
        ("Tight true boxes\n(reference)", test["tight_boxes"], REFERENCE)]
names = [f"{name}\n{row['parts']} parts" for name, row, _ in rows]
heights = [row["median"] for _, row, _ in rows]
bars.bar(names, heights, color=[color for _, _, color in rows], width=0.62)
for x, h in enumerate(heights):
    bars.text(x, h + 0.015, f"{h:.2f}", ha="center", color=INK, fontweight="bold" if x == 2 else "normal")
bars.set_ylim(0, 1.08)
bars.set_ylabel("Median part IoU")
bars.set_title("Test objects", loc="left", fontsize=13)
bars.tick_params(axis="x", labelsize=10)

for ax in (curve, bars):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color="#e3e6ec", linewidth=0.8)
    ax.set_axisbelow(True)
fig.tight_layout()
fig.savefig(sys.argv[2], dpi=180, facecolor="white")
print(sys.argv[2])
