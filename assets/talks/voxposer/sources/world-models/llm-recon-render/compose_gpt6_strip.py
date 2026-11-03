"""Compose one GPT-6 comparison strip from two rendered strips: compose_gpt6_strip.py <out stem> <strip A> <strip B> <panel>...

A panel is ``A:<index>:<label>`` or ``B:<index>:<label>``: the index-th 512-pixel
panel of that strip, relabelled. Both strips share the camera and sweep, which the
ground-truth panels (index 0 of each) must agree on; their mean absolute difference
is printed. Writes <stem>.mp4 and <stem>.jpg (the first frame).
"""

import sys

import mediapy
import numpy as np
from PIL import Image, ImageDraw

WIDTH = 512
BAR = 26


def relabel(frame: np.ndarray, text: str) -> np.ndarray:
    canvas = Image.fromarray(frame)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, WIDTH, BAR], fill=(255, 255, 255))
    draw.text((8, 6), text, fill=(20, 20, 20))
    return np.asarray(canvas)


def main() -> None:
    stem, a_path, b_path = sys.argv[1:4]
    strips = {"A": mediapy.read_video(a_path), "B": mediapy.read_video(b_path)}
    a_truth, b_truth = strips["A"][:, BAR:, :WIDTH], strips["B"][:, BAR:, :WIDTH]
    print("ground truth panels differ by", float(np.abs(a_truth.astype(int) - b_truth.astype(int)).mean()))
    panels = [arg.split(":", 2) for arg in sys.argv[4:]]
    frames = []
    for i in range(len(strips["A"])):
        row = [relabel(strips[s][i, :, int(k) * WIDTH : (int(k) + 1) * WIDTH], text) for s, k, text in panels]
        frames.append(np.concatenate(row, axis=1))
    mediapy.write_video(f"{stem}.mp4", frames, fps=16)
    Image.fromarray(frames[0]).save(f"{stem}.jpg", quality=88)
    print(stem, len(frames), "frames", frames[0].shape)


if __name__ == "__main__":
    main()
