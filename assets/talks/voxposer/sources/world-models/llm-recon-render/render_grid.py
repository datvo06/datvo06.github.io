"""Render every run's reconstruction of one object in a grid beside the ground truth.

render_grid.py <out dir> <dataset root> <hidden root> <visible root> <object> <label=study>...

The studies fill two rows: the first half follows the ground truth's sweep on
the top row, the second half follows the observed view on the bottom row.
Panels come from render_media.py, so every panel uses the same camera and sweep.
"""

import json
import sys
import tempfile
from pathlib import Path

import mediapy
import numpy as np
from PIL import Image
from render_media import (
    FRAMES,
    VIEW,
    free_camera,
    ground_truth_frames,
    label,
    load_capture,
    reconstruction_frames,
)

SCALE = 0.75


def main() -> None:
    out, dataset, hidden, visible, name = map(Path, sys.argv[1:6])
    studies = [arg.split("=", 1) for arg in sys.argv[6:]]
    out.mkdir(parents=True, exist_ok=True)
    record = json.loads((hidden / name.name / "ground_truth" / "object.json").read_text())
    _, views = load_capture(visible / name.name / "fitting" / "capture.json")
    view = next(v for v in views if v.files.name == VIEW)
    points = np.concatenate([view.points("object") for view in views])
    camera = free_camera(np.asarray(view.files.world_from_camera), np.median(points, axis=0))
    with tempfile.TemporaryDirectory() as meshes:
        truth = ground_truth_frames(dataset / record["category"] / record["object"], camera, Path(meshes))
    blank = np.full_like(truth[0], 235)
    panels = []
    for label_text, study in studies:
        rendered = reconstruction_frames(Path(study) / "summary.json", camera)
        frames = rendered[1] if rendered else [blank] * FRAMES
        panels.append((label_text if rendered else f"{label_text}: no scene", frames))
    half = (len(panels) + 1) // 2
    rows = [[("ground truth", truth)] + panels[:half], [("observed view", [view.rgb] * FRAMES)] + panels[half:]]
    if len(rows[1]) < len(rows[0]):
        rows[1].append(("", [blank] * FRAMES))
    video = []
    for i in range(FRAMES):
        grid = np.concatenate(
            [np.concatenate([label(frames[i], text) for text, frames in row], axis=1) for row in rows], axis=0
        )
        image = Image.fromarray(grid)
        video.append(np.asarray(image.resize((int(image.width * SCALE), int(image.height * SCALE)))))
    stem = out / name.name
    Image.fromarray(video[FRAMES // 2]).save(f"{stem}.jpg", quality=80)
    mediapy.write_video(f"{stem}.mp4", video, fps=16)
    print(stem, len(video), "frames")


if __name__ == "__main__":
    main()
