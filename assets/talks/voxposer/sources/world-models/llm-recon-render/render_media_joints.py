"""Render solved-joint scenes beside the ground truth, articulated.

render_media_joints.py <out dir> <dataset root> <hidden root> <visible root> <object> <label=spec>...

A spec is ``study:<search.json>:<index>``: a search's evaluation, rebuilt with its
fit's connections and parameters when it was fitted. Panels share fitting view 4's
camera; the ground truth sweeps each joint between its URDF limits, a scene
sweeps its hinges and slides between their ranges, or around their observed
value when unlimited. Needs robotl-reconstruction at PR #12 (claude/joint-solver)
on the path, beside render_media.py from this folder.
"""

import json
import sys
import tempfile
from pathlib import Path

import mediapy
import mujoco
import numpy as np
from effectful.ops.semantics import handler
from PIL import Image
from render_media import FRAMES, VIEW, free_camera, ground_truth_frames, label, load_capture
from robotl.handlers.mujoco import compile_model

from robotl_reconstruction.articulation import WELDED, built_under, solved
from robotl_reconstruction.real2code import FOVY_DEG, RESOLUTION
from robotl_reconstruction.study import Search


def factory_of(spec: str):
    """The scene factory a spec names, with its connections built as solved, and its parameters."""
    kind, first, second = spec.split(":", 2)
    if kind != "study":
        raise ValueError(f"A spec is study:<search.json>:<index>, got {spec!r}")
    evaluation = Search.load(Path(first)).evaluations[int(second)]
    factory = evaluation.scene.decode()
    if evaluation.fit is None:
        return factory, None
    return solved(factory, evaluation.fit.connections), evaluation.fit.parameters


def scene_frames(factory, parameters, camera: mujoco.MjvCamera) -> tuple[np.ndarray, list[np.ndarray]]:
    """The scene at its fitted state, then sweeping its hinges and slides."""
    with tempfile.TemporaryDirectory() as build, built_under(parameters), handler(WELDED):
        _, _, model = compile_model(factory, build_path=Path(build))
    model.vis.global_.fovy = FOVY_DEG
    model.vis.global_.offwidth = model.vis.global_.offheight = RESOLUTION
    data = mujoco.MjData(model)

    def extent(address: int, value: float) -> float:
        """The scene's bounding-box volume with one joint at ``value``, the rest at their start."""
        data.qpos[:] = model.qpos0
        data.qpos[address] = value
        mujoco.mj_forward(model, data)
        radius = model.geom_rbound[:, None]
        return float(np.prod((data.geom_xpos + radius).max(0) - (data.geom_xpos - radius).min(0)))

    sweeps = []
    for joint in range(model.njnt):
        kind = model.jnt_type[joint]
        if kind not in (mujoco.mjtJoint.mjJNT_HINGE, mujoco.mjtJoint.mjJNT_SLIDE):
            continue
        address = model.jnt_qposadr[joint]
        q0 = model.qpos0[address]
        if model.jnt_limited[joint]:
            low, high = model.jnt_range[joint]
        else:
            width = 0.6 if kind == mujoco.mjtJoint.mjJNT_HINGE else 0.15
            low, high = q0 - width, q0 + width
        # A solved range may run either way, so every sweep starts at the closed end, the
        # one where the scene is smallest, and the panels open together like the ground truth.
        if extent(address, low) > extent(address, high):
            low, high = high, low
        sweeps.append((address, low, high))
    frames = []
    with mujoco.Renderer(model, RESOLUTION, RESOLUTION) as renderer:
        data.qpos[:] = model.qpos0
        mujoco.mj_forward(model, data)
        renderer.update_scene(data, camera=camera)
        fitted = renderer.render().copy()
        for step in range(FRAMES):
            s = 0.5 - 0.5 * np.cos(2 * np.pi * step / FRAMES)
            data.qpos[:] = model.qpos0
            for address, low, high in sweeps:
                data.qpos[address] = low + s * (high - low)
            mujoco.mj_forward(model, data)
            renderer.update_scene(data, camera=camera)
            frames.append(renderer.render().copy())
    return fitted, frames


def main() -> None:
    out, dataset, hidden, visible, name = map(Path, sys.argv[1:6])
    panels_spec = [arg.split("=", 1) for arg in sys.argv[6:]]
    out.mkdir(parents=True, exist_ok=True)
    record = json.loads((hidden / name.name / "ground_truth" / "object.json").read_text())
    _, views = load_capture(visible / name.name / "fitting" / "capture.json")
    view = next(v for v in views if v.files.name == VIEW)
    # The film captures carry one mask per part, so the object's extent is every part's points.
    points = np.concatenate([view.points(part) for view in views for part in view.files.object_ids])
    camera = free_camera(np.asarray(view.files.world_from_camera), np.median(points, axis=0))
    with tempfile.TemporaryDirectory() as meshes:
        truth = ground_truth_frames(dataset / record["category"] / record["object"], camera, Path(meshes))
    panels = [("ground truth", truth)]
    stills = [label(view.rgb, "observed view")]
    for text, spec in panels_spec:
        factory, parameters = factory_of(spec)
        fitted, frames = scene_frames(factory, parameters, camera)
        panels.append((text, frames))
        stills.append(label(fitted, text))
    video = [np.concatenate([label(frames[i], text) for text, frames in panels], axis=1) for i in range(FRAMES)]
    stem = out / name.name
    Image.fromarray(np.concatenate(stills, axis=1)).save(f"{stem}.png")
    mediapy.write_video(f"{stem}.mp4", video, fps=16)
    small = [Image.fromarray(f).resize((f.shape[1] // 2, f.shape[0] // 2)) for f in video[::2]]
    small[0].save(f"{stem}.gif", save_all=True, append_images=small[1:], duration=125, loop=0)
    print(stem, len(video), "frames")


if __name__ == "__main__":
    main()
