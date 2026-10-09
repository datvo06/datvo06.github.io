"""Render a native pickup recording: a real-time wide view and a slow close-up of its end."""

import sys
from pathlib import Path

import mediapy
import mujoco
import numpy as np

native, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
model = mujoco.MjModel.from_binary_path(str(native / "scene.mjb"))
trace = np.load(native / "recording.npz")
times = trace["time_s"]
obj = model.body("root_assembly_obj").id
data = mujoco.MjData(model)
data.qpos[:], data.qvel[:], data.ctrl[:] = trace["qpos"][0], trace["qvel"][0], trace["ctrl"][0]
data.time = float(times[0])
mujoco.mj_forward(model, data)
data.qacc_warmstart[:] = trace["initial_warmstart"]

wide = mujoco.MjvCamera()
wide.lookat[:] = [0.42, 0.0, 0.08]
wide.distance, wide.elevation, wide.azimuth = 0.75, -25, 135
close = mujoco.MjvCamera()
close.distance, close.elevation, close.azimuth = 0.22, -20, 160
plain = mujoco.MjvOption()
contacts = mujoco.MjvOption()
contacts.flags[mujoco.mjtVisFlag.mjVIS_CONTACTFORCE] = 1
model.vis.map.force = 0.05
model.vis.scale.forcewidth = 0.03
close_from = len(times) - round(0.6 / model.opt.timestep)

wide_frames, close_frames = [], []
with mujoco.Renderer(model, 480, 640) as renderer:
    for index in range(1, len(times)):
        data.ctrl[:] = trace["ctrl"][index]
        mujoco.mj_step(model, data)
        if index % 10 == 0:
            renderer.update_scene(data, wide, plain)
            wide_frames.append(renderer.render())
        if index >= close_from and index % 2 == 0:
            close.lookat[:] = data.xpos[obj]
            renderer.update_scene(data, close, contacts)
            close_frames.append(renderer.render())
# Wide: one frame per 25 ms at 40 fps is real time. Close-up: one per 5 ms at 40 fps is 1/5 speed.
mediapy.write_video(out / "wide_realtime.mp4", wide_frames, fps=40)
mediapy.write_video(out / "end_closeup_fifth_speed.mp4", close_frames, fps=40)
mediapy.write_image(out / "final_closeup.png", close_frames[-1])
print(len(wide_frames), len(close_frames), float(times[-1]))
