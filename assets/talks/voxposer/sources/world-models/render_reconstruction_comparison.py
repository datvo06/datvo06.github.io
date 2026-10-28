"""Render the saved comparison with matplotlib and Pillow.

Run beside reconstruction-baseline-run.zip and reconstruction-domino-run.zip.
Both archives contain the native evaluation images, camera records and metrics.
The default output is domino-fitter-comparison.png in the current directory.
Download run.zip from each release and rename it to the filename above:
https://github.com/datvo06/robotl-reconstruction/releases/tag/reconstruction-baseline-20261027
https://github.com/datvo06/robotl-reconstruction/releases/tag/reconstruction-domino-20261028
The source repository requires access. Input hashes and camera records are in
reconstruction-figure-inputs.json; plotting does not reproject or align images.
"""

import hashlib
import io
import json
import zipfile
from pathlib import Path

import matplotlib.pyplot as plt
from PIL import Image

sources = Path(__file__).resolve().parent
with (
    zipfile.ZipFile(sources / "reconstruction-baseline-run.zip") as old,
    zipfile.ZipFile(sources / "reconstruction-domino-run.zip") as new,
):
    old_metrics = json.loads(old.read("evaluation/metrics.json"))
    new_metrics = json.loads(new.read("evaluation/metrics.json"))
    assert sorted(old_metrics["observation_files"].values()) == sorted(
        new_metrics["observation_files"].values()
    )
    for archive, metrics in ((old, old_metrics), (new, new_metrics)):
        assert hashlib.sha256(archive.read("fit/scene.py")).hexdigest() == metrics[
            "program_sha256"
        ]
    images = [
        Image.open(io.BytesIO(new.read("evaluation/views/tabletop/observed.png"))),
        Image.open(io.BytesIO(old.read("evaluation/tabletop/collision.png"))),
        Image.open(io.BytesIO(new.read("evaluation/views/tabletop/collision.png"))),
    ]

fig, axes = plt.subplots(1, 3, figsize=(12, 3.6), layout="constrained")
for axis, picture, title in zip(
    axes, images, ["Observed", "Generic box SDF", "Reused domino fitter"], strict=True
):
    axis.imshow(picture.crop((320, 280, 570, 475)))
    axis.set_title(title, fontsize=15, pad=10)
    axis.axis("off")
fig.savefig("domino-fitter-comparison.png", format="png", dpi=160, facecolor="white")
plt.close(fig)
