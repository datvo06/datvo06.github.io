"""Write a film clip for the deck: film_clip.py <trajectory dir> <view> <out stem>

Each frame shows the camera's RGB image beside the same image with every tracked
part mask tinted, at twice the film's resolution; the poster is the first frame.
"""

import json
import sys
from pathlib import Path

import mediapy
import numpy as np
from PIL import Image

PALETTE = np.array([
    [230, 25, 75], [60, 180, 75], [0, 130, 200], [245, 130, 48], [145, 30, 180],
    [70, 240, 240], [240, 50, 230], [210, 245, 60], [250, 190, 212], [0, 128, 128],
])


def tinted(rgb: np.ndarray, masks: np.ndarray) -> np.ndarray:
    image = rgb.astype(float)
    for index, mask in enumerate(masks):
        image[mask] = 0.45 * image[mask] + 0.55 * PALETTE[index % len(PALETTE)]
    return image.astype(np.uint8)


def main() -> None:
    trajectory, view, stem = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
    capture = json.loads((trajectory / "capture.json").read_text())
    views = sorted((v for v in capture["views"] if v["name"].endswith(f"_{view}")), key=lambda v: v["name"])
    frames = []
    for record in views:
        rgb = np.asarray(Image.open(trajectory / record["rgb"]).convert("RGB"))
        with np.load(trajectory / record["masks"]) as archive:
            masks = archive[archive.files[0]].astype(bool)
        pair = np.concatenate([rgb, tinted(rgb, masks)], axis=1)
        frames.append(np.asarray(Image.fromarray(pair).resize((pair.shape[1] * 2, pair.shape[0] * 2), Image.NEAREST)))
    mediapy.write_video(f"{stem}.mp4", frames, fps=8)
    Image.fromarray(frames[0]).save(f"{stem}.jpg", quality=88)
    print(stem, len(frames), "frames", frames[0].shape, "parts", masks.shape[0])


if __name__ == "__main__":
    main()
