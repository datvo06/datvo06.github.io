"""Opposed enclosure and all-three-finger friction capacity margin."""

from typing import cast

import effectful.handlers.jax.numpy as jnp

from experiments.panda_leap_pickup import SUPPORT_ACTIVE_FORCE_N, PickupScene
from robotl.ops import sensors
from robotl.ops.losses import KeepAbove, KeepBelow, Loss, Minimize


def reward_factory(scene: PickupScene) -> dict[str, Loss]:
    terms: dict[str, Loss] = {**scene.support, **scene.capture}
    finger_ratios = jnp.stack(
        tuple(cast(KeepAbove, scene.support[f"finger{i}"]).expr1 for i in range(3))
    )
    terms["finger_capacity_margin"] = KeepAbove(
        jnp.min(finger_ratios), 2.0, weight=20.0
    )
    terms["capture_opposition_margin"] = KeepBelow(
        scene.capture["capture_opposition"].expr1, -0.5, weight=20.0
    )
    terms["loaded_opposition_margin"] = KeepBelow(
        cast(KeepBelow, scene.support["opposition"]).expr1, -0.8, weight=20.0
    )
    gaps = jnp.stack(
        tuple(
            scene.capture[f"capture_{name}"].expr1
            for name in ("thumb", "finger0", "finger1", "finger2")
        )
    )
    terms["reach_worst_pad"] = Minimize(jnp.max(jnp.square(gaps)))
    normal_z, load = jnp.asarray(0.0), jnp.asarray(0.0)
    for group in scene.grip_contacts:
        for contact in group:
            found = contact.field(sensors.ContactField.FOUND)[:, 0]
            force = contact.field(sensors.ContactField.FORCE)[:, 0]
            active = jnp.where((found > 0) & (force > SUPPORT_ACTIVE_FORCE_N), force, 0)
            normal_z += jnp.sum(
                active * contact.field(sensors.ContactField.NORMAL)[:, 2]
            )
            load += jnp.sum(active)
    downward = jnp.maximum(0, normal_z / jnp.maximum(load, 0.01))
    terms["side_contacts"] = Minimize(jnp.square(downward), weight=2.0)
    return terms
