"""Render selected fitted trajectories against their observed film cameras.

render_selected_trajectory.py <rerun-root> <object>
Use the search environment and manifest paths; the root holds selected-records/.
"""

import json
import sys
from pathlib import Path

import mediapy
import mujoco
import numpy as np
from PIL import Image, ImageDraw
from robotl_reconstruction.evaluation import film_cameras, project_collision
from robotl_reconstruction.observations import load_capture
from robotl_reconstruction.study import Summary

root = Path(sys.argv[1])
name = sys.argv[2]
manifest = json.loads((root / "manifest.json").read_text())
evidence = Path(manifest["hosts"]["rolly"]["evidence"])
_, views = load_capture(evidence / name / "trajectory" / "capture.json")
cameras = film_cameras(views)
frames = len(cameras[0])
observed = [
    np.concatenate([camera[k].rgb for camera in cameras], axis=1) for k in range(frames)
]
rows = [observed]
labels = ["Observed film | three cameras"]
for method in ("params", "connect"):
    job = next(
        j for j in manifest["jobs"] if j["object"] == name and j["construct"] == method
    )
    record = Summary.load(
        root
        / "selected-records"
        / job["host"]
        / f"gpt54-{method}"
        / name
        / "summary.json"
    )
    out = root / "rendered" / f"gpt54-{method}" / name
    out.mkdir(parents=True, exist_ok=True)
    metadata = {
        "object": name,
        "method": method,
        "selected": record.selected,
        "candidates": len(record.search.evaluations),
        "source_search": str(record.search.config.output),
        "validation": record.validation,
        "code_tree": manifest["tree"],
        "playback": "Fitted joint positions at the observed film timestamps",
    }
    (out / "selection.json").write_text(json.dumps(metadata, indent=2) + "\n")
    title = "GPT-5.4 film + Params" if method == "params" else "GPT-5.4 film + connect"
    if record.selected is None:
        rows.append([np.full_like(frame, 235) for frame in observed])
        labels.append(title + " | no accepted scene")
        continue
    selected = record.search.evaluations[record.selected]
    fit = selected.fit
    assert fit is not None, f"{name}/{method}: selected scene has no fit"
    model = selected.scene.compile(out / "build", fit.parameters, fit.connections)
    data = mujoco.MjData(model)
    rendered = []
    for k in range(frames):
        data.qpos[:] = model.qpos0
        for joint, positions in fit.tracked.items():
            data.qpos[model.joint(joint).qposadr[0]] = positions[k]
        mujoco.mj_forward(model, data)
        rendered.append(
            np.concatenate(
                [project_collision(model, data, camera[k])[0] for camera in cameras],
                axis=1,
            )
        )
    width = cameras[0][0].rgb.shape[1]
    single_camera = [frame[:, width : 2 * width] for frame in rendered]
    mediapy.write_video(out / "reconstruction.mp4", single_camera, fps=16)
    Image.fromarray(single_camera[0]).save(out / "reconstruction.png")
    (out / "scene.py").write_text(selected.scene.code)
    (out / "fit.json").write_text(fit.model_dump_json(indent=2))
    rows.append(rendered)
    labels.append(
        title + f" | selected candidate {record.selected} | fitted trajectory"
    )

comparison = []
height = observed[0].shape[0]
for k in range(frames):
    panel = Image.fromarray(np.concatenate([row[k] for row in rows], axis=0))
    draw = ImageDraw.Draw(panel)
    for i, label in enumerate(labels):
        y = i * height
        draw.rectangle((0, y, panel.width, y + 18), fill="black")
        draw.text((6, y + 3), label, fill="white")
    comparison.append(np.asarray(panel))
out = root / "rendered" / "comparisons"
out.mkdir(parents=True, exist_ok=True)
mediapy.write_video(out / f"{name}.mp4", comparison, fps=16)
Image.fromarray(comparison[frames // 2]).save(out / f"{name}.png")
print("RENDERED", name, frames, "frames", flush=True)
