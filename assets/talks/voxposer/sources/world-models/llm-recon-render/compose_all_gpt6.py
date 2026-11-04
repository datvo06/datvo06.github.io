"""Compose the five-panel GPT-6 strip for every object: compose_all_gpt6.py <out dir> <single-out dir> <film dir> <object>...

The single-out strip holds ground truth, one state with RoboTL and one state
with MuJoCo XML; the film strip holds the two film attempts, the agent's own
joints then connect with the solver, each already labelled or marked as having
no scene. Panels are relabelled here so every object reads the same.
"""

import sys
from pathlib import Path

import mediapy
import numpy as np
from PIL import Image, ImageDraw

WIDTH = 512
BAR = 26
LABELS = [
    ("B", 0, "ground truth"),
    ("B", 1, "one state, wrote RoboTL"),
    ("B", 2, "one state, wrote MuJoCo XML"),
    ("A", 0, "film, wrote the joints"),
    ("A", 1, "film, wrote connect; solver chose the joints"),
]


def relabel(frame: np.ndarray, text: str) -> np.ndarray:
    canvas = Image.fromarray(frame)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, WIDTH, BAR], fill=(255, 255, 255))
    draw.text((8, 6), text, fill=(20, 20, 20))
    return np.asarray(canvas)


def panel_text(strip: np.ndarray, index: int) -> bool:
    """Whether the panel was rendered empty: a flat 235 gray below its label bar."""
    panel = strip[0, BAR:, index * WIDTH : (index + 1) * WIDTH]
    return bool((panel == 235).all())


def main() -> None:
    out, single, film = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    for name in sys.argv[4:]:
        strips = {"A": mediapy.read_video(film / f"{name}.mp4"), "B": mediapy.read_video(single / f"{name}.mp4")}
        frames = []
        for i in range(len(strips["B"])):
            row = []
            for strip, index, text in LABELS:
                empty = panel_text(strips[strip], index)
                row.append(relabel(strips[strip][i, :, index * WIDTH : (index + 1) * WIDTH], f"{text}: no scene" if empty else text))
            frames.append(np.concatenate(row, axis=1))
        mediapy.write_video(out / f"{name}.mp4", frames, fps=16)
        Image.fromarray(frames[0]).save(out / f"{name}.jpg", quality=88)
        print(name, len(frames), "frames")


if __name__ == "__main__":
    main()
