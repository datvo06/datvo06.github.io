"""Replace GPT-5.4 panels using saved trajectories; retain the other baselines.

replace_slide_media.py <rerun-root> <site-checkout>
Read rendered/ from render_selected_trajectory.py and preserve the original grids
under previous-slide-media/ before replacing their GPT-5.4 film panels.
"""

import hashlib
import json
import shutil
import sys
from pathlib import Path

import mediapy
import numpy as np
from compose_baseline_comparison import tile
from PIL import Image

root = Path(sys.argv[1])
deck = Path(sys.argv[2]) / "assets/talks/voxposer"
records = []


for index in range(37):
    name = f"test-{index:02d}"
    comparison = mediapy.read_video(root / "rendered/comparisons" / f"{name}.mp4")
    observed = comparison[:, :256, 256:512]
    panels = []
    for method in ("params", "connect"):
        output = root / "rendered" / f"gpt54-{method}" / name
        selected = json.loads((output / "selection.json").read_text())["selected"]
        frames = (
            mediapy.read_video(output / "reconstruction.mp4")
            if selected is not None
            else np.full_like(observed, 235)
        )
        title = "Params" if method == "params" else "connect"
        panels.append(
            (
                frames,
                f"Film + {title}: "
                + ("fitted trajectory" if selected is not None else "no scene"),
            )
        )
    for directory, size in (
        ("llm-recon-baseline-comparison", 384),
        ("llm-recon-baselines", 512),
    ):
        video = deck / "media/world-models" / directory / f"{name}.mp4"
        backup = root / "previous-slide-media" / directory / video.name
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            shutil.copyfile(video, backup)
        frames = mediapy.read_video(backup)
        frames[:, :size, :size] = tile(observed, "Observed film (GPT-5.4)", size)
        start = 3 if size == 384 else 1
        for column, (replacement, title) in enumerate(panels, start):
            frames[:, :size, column * size : (column + 1) * size] = tile(
                replacement, title, size
            )
        mediapy.write_video(
            video, frames, fps=16, ffmpeg_args=["-movflags", "+faststart"]
        )
        Image.fromarray(frames[24]).save(video.with_suffix(".jpg"), quality=88)
        records.append(
            {
                "object": name,
                "directory": directory,
                "previous_mp4_sha256": hashlib.sha256(backup.read_bytes()).hexdigest(),
                "mp4_sha256": hashlib.sha256(video.read_bytes()).hexdigest(),
                "jpg_sha256": hashlib.sha256(
                    video.with_suffix(".jpg").read_bytes()
                ).hexdigest(),
            }
        )
    print("REPLACED", name, flush=True)
(root / "slide-media-provenance.json").write_text(json.dumps(records, indent=2) + "\n")
