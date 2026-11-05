"""Compose one-state RoboTL/XML and fitted film results for both baseline models.

compose_baseline_comparison.py <root> <visible inputs> <object>
The root contains one-state/ and film/ published videos, xml/runs/ scored
summaries, and objects.json. Missing XML results remain pending.
"""

import argparse
import hashlib
import json
from collections.abc import Iterable
from pathlib import Path

import mediapy
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from render_media import FRAMES, VIEW, free_camera, reconstruction_frames
from robotl_reconstruction.observations import load_capture

SIZE = 384
FONT = ImageFont.truetype("DejaVuSans.ttf", 15)


def tile(frames: Iterable[np.ndarray], title: str) -> np.ndarray:
    """Resize a panel and replace its caption at the composite's resolution."""
    result = []
    for frame in frames:
        image = Image.fromarray(frame).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, SIZE, 27), fill="white")
        draw.text((8, 5), title, fill="#1f2330", font=FONT)
        result.append(np.asarray(image))
    return np.stack(result)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("visible", type=Path)
    parser.add_argument("object")
    args = parser.parse_args()
    name = args.object
    output = args.root / "rendered"
    output.mkdir(exist_ok=True)
    data = json.loads((args.root / "objects.json").read_text())
    result = next(o for o in data["objects"] if o["name"] == name)["runs"]
    state_path = args.root / "one-state" / f"{name}.mp4"
    film_path = args.root / "film" / f"{name}.mp4"
    states = mediapy.read_video(state_path)
    films = mediapy.read_video(film_path)
    if states.shape != (FRAMES, 768, 1536, 3) or films.shape != (FRAMES, 512, 2560, 3):
        raise ValueError(
            f"Unexpected input video dimensions: {states.shape}, {films.shape}"
        )
    _, views = load_capture(args.visible / name / "fitting" / "capture.json")
    view = next(v for v in views if v.files.name == VIEW)
    points = np.concatenate(
        [v.points(part) for v in views for part in v.files.object_ids]
    )
    camera = free_camera(
        np.asarray(view.files.world_from_camera), np.median(points, axis=0)
    )
    provenance = {
        "object": name,
        "inputs": [
            {"path": str(p), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in (state_path, film_path)
        ],
        "xml": [],
    }
    rows = []
    blank = np.full((FRAMES, SIZE, SIZE, 3), 235, dtype=np.uint8)
    for row, (model, title) in enumerate(
        (("gpt54", "GPT-5.4"), ("gem31", "Gemini 3.1 Pro"))
    ):
        panels = [tile(states[:, :SIZE, :SIZE], "Reference")]
        state = result[f"{model}-seg"]
        panels.append(
            tile(
                states[:, row * SIZE : (row + 1) * SIZE, 2 * SIZE : 3 * SIZE],
                f"{title}: RoboTL" + (" — no scene" if state is None else ""),
            )
        )
        key = f"{model}-xml"
        frames = blank
        caption = f"{title}: XML"
        record = {"run": key}
        if key not in result:
            caption += " — pending"
            record["status"] = "pending"
        else:
            summary = args.root / "xml" / "runs" / key / name / "summary.json"
            record["summary_sha256"] = hashlib.sha256(summary.read_bytes()).hexdigest()
            record["selected"] = json.loads(summary.read_text())["selected"]
            if result[key] is None:
                caption += " — no scene"
            else:
                _, frames = reconstruction_frames(summary, camera)
        panels.append(tile(frames, caption))
        provenance["xml"].append(record)
        for column, condition in enumerate(("film", "connect")):
            score = result[f"{model}-{condition}"]
            status = (
                "no scene"
                if score is None
                else "fitted"
                if score["fitted"]
                else "unfitted"
            )
            label = "Film + Params" if condition == "film" else "Film + connect"
            index = 1 + row * 2 + column
            panels.append(
                tile(films[:, :, index * 512 : (index + 1) * 512], f"{label}: {status}")
            )
        rows.append(np.concatenate(panels, axis=2))
    video = np.concatenate(rows, axis=1)
    mediapy.write_video(output / f"{name}.mp4", video, fps=16)
    Image.fromarray(video[24]).save(output / f"{name}.jpg", quality=88)
    (output / f"{name}-provenance.json").write_text(
        json.dumps(provenance, indent=2) + "\n"
    )
    print(name, len(video), "frames", flush=True)


if __name__ == "__main__":
    main()
