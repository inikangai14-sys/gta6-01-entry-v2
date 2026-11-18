// Combat: a pistol with a reload, a melee swing, and the consequences.
// Shooting a pedestrian or a cop raises the heat; shooting a car dents it.
// The camera is the crosshair, so a click fires where the player looks.

import * as THREE from 'three';
import { PLAYER } from './config.js';

const raycaster = new THREE.Raycaster();

export class Combat {
  constructor(world) {
    this.world = world;
    this.cooldown = 0;
    this.meleeCooldown = 0;
    this.flash = null;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    const world = this.world;
    const input = world.input;
    if (world.mode !== 'play') return;

    if (input.wasPressed('KeyR')) {
      world.player.ammo = PLAYER.maxAmmo;
      world.hud.flash('Reloaded.', '#cfe8ff');
      world.audio.blip(520);
    }

    if (input.wasPressed('KeyF') && this.meleeCooldown <= 0) {
      this.meleeCooldown = 0.5;
      this.melee();
    }

    if (input.takeClick() && this.cooldown <= 0 && !world.player.inCar) {
      this.shoot();
    }
  }

  shoot() {
    const world = this.world;
    const player = world.player;
    if (player.ammo <= 0) {
      world.hud.flash('Out of ammo — press R to reload.', '#ff9a6e');
      world.audio.blip(180);
      this.cooldown = 0.4;
      return;
    }
    player.ammo -= 1;
    this.cooldown = 0.28;
    world.audio.shot();
    world.fx.muzzle();
    world.fx.shake = Math.min(1, world.fx.shake + 0.25);

    // Fire from the camera through the screen center.
    raycaster.setFromCamera(new THREE.Vector2(0, 0), world.camera);
    raycaster.far = 90;

    // Pedestrians first: a hit drops them and draws the heat.
    for (const p of world.peds.list) {
      if (p.down) continue;
      const toPed = new THREE.Vector3().subVectors(p.group.position, world.camera.position);
      const dist = toPed.length();
      if (dist > 90) continue;
      toPed.normalize();
      const along = toPed.dot(raycaster.ray.direction);
      if (along < 0.9) continue;
      const perp = new THREE.Vector3().copy(toPed).addScaledVector(raycaster.ray.direction, -along);
      if (perp.length() < 1.6 && along > 0 && along < dist + 2) {
        p.down = true;
        p.downTimer = 6;
        p.group.rotation.z = Math.PI / 2;
        p.group.position.y = 0.4;
        world.fx.burst(p.group.position, 0xc22e2e);
        world.peds.scare(p.group.position.x, p.group.position.z, 30);
        world.police.addHeat(1);
        world.hud.flash('You shot a civilian — the PD is coming.', '#ff5a5a');
        return;
      }
    }
    // Police officers and cruisers.
    for (const u of world.police.units) {
      const toU = new THREE.Vector3().subVectors(u.group.position, world.camera.position);
      const dist = toU.length();
      if (dist > 90) continue;
      toU.normalize();
      const along = toU.dot(raycaster.ray.direction);
      if (along < 0.9) continue;
      const perp = new THREE.Vector3().copy(toU).addScaledVector(raycaster.ray.direction, -along);
      if (perp.length() < 2.2 && along > 0 && along < dist + 3) {
        world.fx.burst(u.group.position, 0xffd76e);
        world.police.addHeat(1);
        if (u.kind === 'officer') {
          world.scene.remove(u.group);
          world.police.units.splice(world.police.units.indexOf(u), 1);
        }
        return;
      }
    }
    // Cars: a hit just sparks and annoys the driver.
    for (const car of world.traffic.cars) {
      if (car.taken) continue;
      const toC = new THREE.Vector3().subVectors(car.group.position, world.camera.position);
      const dist = toC.length();
      if (dist > 90) continue;
      toC.normalize();
      const along = toC.dot(raycaster.ray.direction);
      if (along < 0.9) continue;
      const perp = new THREE.Vector3().copy(toC).addScaledVector(raycaster.ray.direction, -along);
      if (perp.length() < 2.4 && along > 0 && along < dist + 3) {
        world.fx.burst(car.group.position, 0xffd76e);
        return;
      }
    }
  }

  melee() {
    const world = this.world;
    const player = world.player;
    const p = world.peds.nearestStanding(player.pos.x, player.pos.z, 2.6);
    if (p) {
      p.down = true;
      p.downTimer = 5;
      p.group.rotation.z = Math.PI / 2;
      p.group.position.y = 0.4;
      world.fx.burst(p.group.position, 0xc22e2e);
      world.police.addHeat(1);
      world.hud.flash('You knocked someone out — the PD is coming.', '#ff5a5a');
    }
    world.fx.shake = Math.min(1, world.fx.shake + 0.15);
  }
}
