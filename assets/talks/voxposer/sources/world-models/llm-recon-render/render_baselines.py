"""Render four selected film baselines with their saved fits and the archived reference."""

import argparse
import hashlib
import json
from pathlib import Path

import mediapy
import numpy as np
from PIL import Image
from render_media import FRAMES, VIEW, free_camera, label
from render_media_joints import scene_frames

from robotl_reconstruction.articulation import solved
from robotl_reconstruction.observations import load_capture
from robotl_reconstruction.study import Summary
from robotl_reconstruction.utils.real2code import RESOLUTION

RUNS = (
    ("gpt54-film", "GPT-5.4: film + Params"),
    ("gpt54-connect", "GPT-5.4: film + connect"),
    ("gem31-film", "Gemini 3.1 Pro: film + Params"),
    ("gem31-connect", "Gemini 3.1 Pro: film + connect"),
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("reference", type=Path)
    parser.add_argument("object")
    args = parser.parse_args()
    output = args.root / "rendered"
    output.mkdir(exist_ok=True)
    name = args.object
    summaries = [Summary.load(args.root / "runs" / key / name / "summary.json")
                 for key, _ in RUNS]
    _, views = load_capture(summaries[0].search.config.fitting)
    view = next(v for v in views if v.files.name == VIEW)
    points = np.concatenate([v.points(part) for v in views for part in v.files.object_ids])
    camera = free_camera(np.asarray(view.files.world_from_camera), np.median(points, axis=0))
    reference = args.reference / f"{name}.mp4"
    original = mediapy.read_video(reference)
    if original.shape[:2] != (FRAMES, RESOLUTION) or original.shape[2] < RESOLUTION:
        raise ValueError(f"{reference}: unexpected reference dimensions {original.shape}")
    panels = [original[:, :, :RESOLUTION]]
    programs = []
    provenance = {
        "object": name,
        "reference": str(reference),
        "reference_sha256": hashlib.sha256(reference.read_bytes()).hexdigest(),
        "reference_panel": 0,
        "runs": [],
    }
    for (key, title), summary in zip(RUNS, summaries, strict=True):
        record = {"run": key, "selected": summary.selected}
        summary_path = args.root / "runs" / key / name / "summary.json"
        record["summary_sha256"] = hashlib.sha256(summary_path.read_bytes()).hexdigest()
        if summary.selected is None:
            blank = np.full((RESOLUTION, RESOLUTION, 3), 235, dtype=np.uint8)
            panels.append(np.stack([label(blank, f"{title}: no scene")] * FRAMES))
            record["fitted"] = False
        else:
            evaluation = summary.search.evaluations[summary.selected]
            factory = evaluation.scene.decode()
            if evaluation.fit is not None:
                factory = solved(factory, evaluation.fit.connections)
            _, frames = scene_frames(factory, evaluation.parameters, camera)
            fitted = evaluation.fit is not None
            caption = f"{title}: {'fitted' if fitted else 'unfitted'}"
            panels.append(np.stack([label(frame, caption) for frame in frames]))
            programs.append({"run": key, "title": title, "language": "python",
                             "code": evaluation.scene.code})
            if fitted:
                programs.append({"run": f"{key}-fit", "title": f"{title}: fit record",
                                 "language": "json",
                                 "code": evaluation.fit.model_dump_json(indent=2)})
            record["fitted"] = fitted
        provenance["runs"].append(record)
    video = np.concatenate(panels, axis=2)
    mediapy.write_video(output / f"{name}.mp4", video, fps=16)
    Image.fromarray(video[0]).save(output / f"{name}.jpg", quality=88)
    (output / f"{name}-programs.json").write_text(json.dumps(programs, indent=2) + "\n")
    (output / f"{name}-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(name, len(video), "frames", flush=True)


if __name__ == "__main__":
    main()
