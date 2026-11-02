"""Render selected reconstructions beside the object's ground truth, articulated.

render_media.py <out dir> <dataset root> <hidden root> <visible root> <object> <label=study>...

Every panel uses fitting view 4's camera. The ground truth sweeps each moving
joint between its URDF limits; a reconstruction sweeps its own hinges and
slides between their limits, or around their observed value when unlimited.
"""

import json
import sys
import tempfile
from pathlib import Path

import mediapy
import mujoco
import numpy as np
import trimesh
from PIL import Image, ImageDraw
from robotl.handlers.mujoco import compile_model
from scipy.spatial.transform import Rotation

from robotl_reconstruction.observations import load_capture
from robotl_reconstruction.real2code import (
    FOVY_DEG,
    MOVING,
    RESOLUTION,
    Urdf,
    mean_color,
)
from robotl_reconstruction.study import Summary

FRAMES = 48
VIEW = "view_4"


def free_camera(world_from_camera: np.ndarray, center: np.ndarray) -> mujoco.MjvCamera:
    """MuJoCo's free camera at an OpenCV camera pose, looking at ``center``'s depth."""
    forward, position = world_from_camera[:3, 2], world_from_camera[:3, 3]
    distance = float(np.dot(center - position, forward))
    camera = mujoco.MjvCamera()
    camera.type = mujoco.mjtCamera.mjCAMERA_FREE
    camera.lookat[:] = position + forward * distance
    camera.distance = distance
    camera.azimuth = float(np.degrees(np.arctan2(forward[1], forward[0])))
    camera.elevation = float(np.degrees(np.arcsin(forward[2])))
    return camera


def ground_truth_frames(source: Path, camera: mujoco.MjvCamera, mesh_dir: Path) -> list[np.ndarray]:
    """The object's parts as mocap bodies, posed along a sweep of every moving joint."""
    urdf = Urdf.load(source)
    parts = urdf.part_of()
    rest = urdf.poses({})
    heads = sorted({parts[link] for link in urdf.visuals})
    head_link = {name: name for name in heads}
    head_link["root"] = next(link for link in urdf.visuals if parts[link] == "root")
    bodies = {name: [] for name in heads}
    for link, visuals in urdf.visuals.items():
        frame = np.linalg.inv(rest[head_link[parts[link]]]) @ rest[link]
        for path, origin in visuals:
            loaded = trimesh.load(path, force="mesh", process=False)
            if len(loaded.vertices) < 4 or loaded.area <= 0:
                continue
            mesh = trimesh.Trimesh(loaded.vertices, loaded.faces, process=False)
            mesh.apply_transform(frame @ origin)
            bodies[parts[link]].append((mesh, mean_color(loaded)))
    assets, worldbody = [], []
    for name, pieces in bodies.items():
        geoms = []
        for index, (mesh, rgba) in enumerate(pieces):
            path = mesh_dir / f"{name}_{index}.obj"
            mesh.export(path)
            assets.append(f'<mesh name="{name}_{index}" file="{path}" inertia="shell"/>')
            color = " ".join(f"{v:.3f}" for v in rgba)
            geoms.append(f'<geom type="mesh" mesh="{name}_{index}" rgba="{color}" contype="0" conaffinity="0"/>')
        worldbody.append(f'<body name="{name}" mocap="true">{"".join(geoms)}</body>')
    # RoboTL's compiled scenes use this skybox and lighting; matching them keeps
    # the panels comparable.
    model = mujoco.MjModel.from_xml_string(
        f"""<mujoco><visual><global offwidth="{RESOLUTION}" offheight="{RESOLUTION}" fovy="{FOVY_DEG}"/>
        <headlight ambient="0.25 0.25 0.25" diffuse="0.55 0.55 0.55" specular="0.25 0.25 0.25"/>
        <quality offsamples="8"/></visual>
        <asset><texture name="skybox" type="skybox" builtin="gradient" rgb1="0.3 0.5 0.7"
        rgb2="0 0 0" width="512" height="3072"/>{"".join(assets)}</asset><worldbody>
        <light directional="true" pos="0 0 1" dir="0 0 -1"/>
        {"".join(worldbody)}</worldbody></mujoco>"""
    )
    data = mujoco.MjData(model)
    frames = []
    with mujoco.Renderer(model, RESOLUTION, RESOLUTION) as renderer:
        for step in range(FRAMES):
            s = 0.5 - 0.5 * np.cos(2 * np.pi * step / FRAMES)
            state = {
                j.name: j.lower + s * (j.upper - j.lower) if j.type != "continuous" else s * np.pi
                for j in urdf.moving
            }
            poses = urdf.poses(state)
            for name in heads:
                pose = poses[head_link[name]]
                body = model.body(name).mocapid[0]
                data.mocap_pos[body] = pose[:3, 3]
                data.mocap_quat[body] = Rotation.from_matrix(pose[:3, :3]).as_quat(scalar_first=True)
            mujoco.mj_forward(model, data)
            renderer.update_scene(data, camera=camera)
            frames.append(renderer.render().copy())
    return frames


def reconstruction_frames(
    summary: Path, camera: mujoco.MjvCamera
) -> tuple[np.ndarray, list[np.ndarray]] | None:
    """The selected scene at its fitted state, then sweeping its own hinges and slides."""
    record = Summary.load(summary)
    if record.selected is None:
        return None
    factory = record.search.evaluations[record.selected].scene.decode()
    with tempfile.TemporaryDirectory() as build:
        _, _, model = compile_model(factory, build_path=Path(build))
    model.vis.global_.fovy = FOVY_DEG
    model.vis.global_.offwidth = model.vis.global_.offheight = RESOLUTION
    data = mujoco.MjData(model)
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


def label(image: np.ndarray, text: str) -> np.ndarray:
    canvas = Image.fromarray(image)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, RESOLUTION, 26], fill=(255, 255, 255))
    draw.text((8, 6), text, fill=(20, 20, 20))
    return np.asarray(canvas)


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
    panels = [("ground truth", truth)]
    stills = [label(view.rgb, "observed view")]
    blank = np.full_like(truth[0], 235)
    for label_text, study in studies:
        rendered = reconstruction_frames(Path(study) / "summary.json", camera)
        if rendered is None:
            label_text = f"{label_text}: no scene"
        fitted, frames = rendered or (blank, [blank] * FRAMES)
        panels.append((label_text, frames))
        stills.append(label(fitted, label_text))
    video = [
        np.concatenate([label(frames[i], text) for text, frames in panels], axis=1)
        for i in range(FRAMES)
    ]
    still = np.concatenate(stills, axis=1)
    stem = out / name.name
    Image.fromarray(still).save(f"{stem}.png")
    mediapy.write_video(f"{stem}.mp4", video, fps=16)
    small = [Image.fromarray(frame).resize((frame.shape[1] // 2, frame.shape[0] // 2)) for frame in video[::2]]
    small[0].save(f"{stem}.gif", save_all=True, append_images=small[1:], duration=125, loop=0)
    print(stem, len(video), "frames")


if __name__ == "__main__":
    main()
