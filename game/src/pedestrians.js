// Pedestrians: people walking the sidewalks, pausing at corners, crossing
// streets on the crosswalks, and running when a gun goes off. They are the
// city's foot traffic — and the reason a wanted star appears when you drive
// like a maniac.

import * as THREE from 'three';
import { WORLD, PED_COUNT } from './config.js';
import { range, pick } from './rng.js';

const SHIRTS = [0xc22e2e, 0x2e6ac2, 0xe8a832, 0x3a8a5a, 0xe8e8e8, 0x8a3ac2, 0x2a2e33, 0xff9a6e];
const SKINS = [0xe8b088, 0xc28858, 0x8a5a3a, 0xf2c8a0];

const torsoGeo = new THREE.BoxGeometry(0.62, 0.75, 0.36);
const legsGeo = new THREE.BoxGeometry(0.55, 0.7, 0.32);
const headGeo = new THREE.SphereGeometry(0.26, 10, 8);

export class Pedestrians {
  constructor(world) {
    this.world = world;
    this.list = [];
    for (let i = 0; i < PED_COUNT; i++) {
      this.list.push(this.spawn(world.rng));
    }
  }

  spawn(rng) {
    const world = this.world;
    const horizontal = rng() < 0.5;
    const road = horizontal
      ? pick(rng, world.city.streets)
      : pick(rng, world.city.avenues);
    const side = pick(rng, [-7.5, 7.5]);
    const along = range(rng, -WORLD.half, WORLD.half);
    const x = horizontal ? along : road + side;
    const z = horizontal ? road + side : along;
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, SHIRTS) });
    const skin = new THREE.MeshLambertMaterial({ color: pick(rng, SKINS) });
    const torso = new THREE.Mesh(torsoGeo, shirt);
    torso.position.y = 1.12;
    group.add(torso);
    const legs = new THREE.Mesh(legsGeo, new THREE.MeshLambertMaterial({ color: 0x2a2e33 }));
    legs.position.y = 0.38;
    group.add(legs);
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 1.72;
    group.add(head);
    group.position.set(x, 0, z);
    world.scene.add(group);
    return {
      group,
      horizontal,
      road,
      side,
      dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, 1.1, 2.0),
      pause: 0,
      flee: 0,
      down: false,
      downTimer: 0,
    };
  }

  // Scare everyone near (x, z): they run away from it for a few seconds.
  scare(x, z, radius) {
    for (const p of this.list) {
      if (p.down) continue;
      const dx = p.group.position.x - x;
      const dz = p.group.position.z - z;
      if (Math.hypot(dx, dz) < radius) p.flee = 3;
    }
  }

  // The nearest standing pedestrian within radius — for melee and for
  // mission pickups that need a person to stand at the marker.
  nearestStanding(x, z, radius) {
    let best = null;
    let bestD = radius;
    for (const p of this.list) {
      if (p.down) continue;
      const d = Math.hypot(p.group.position.x - x, p.group.position.z - z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  update(dt) {
    const world = this.world;
    const px = world.player.pos.x;
    const pz = world.player.pos.z;
    for (const p of this.list) {
      if (p.down) {
        p.downTimer -= dt;
        if (p.downTimer <= 0) {
          // Get up and walk off, a little shaken.
          p.down = false;
          p.group.rotation.z = 0;
          p.group.position.y = 0;
          p.flee = 2;
        }
        continue;
      }
      if (p.pause > 0) {
        p.pause -= dt;
        continue;
      }
      let speed = p.speed;
      let heading;
      if (p.flee > 0) {
        p.flee -= dt;
        speed = 5.2;
        const dx = p.group.position.x - px;
        const dz = p.group.position.z - pz;
        heading = Math.atan2(dx, dz);
        p.group.position.x += Math.sin(heading) * speed * dt;
        p.group.position.z += Math.cos(heading) * speed * dt;
        p.group.rotation.y = heading;
      } else {
        // Walk the sidewalk line, turn around at the city edge.
        if (p.horizontal) {
          p.group.position.x += p.dir * speed * dt;
          heading = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (Math.abs(p.group.position.x) > WORLD.half) p.dir *= -1;
        } else {
          p.group.position.z += p.dir * speed * dt;
          heading = p.dir > 0 ? 0 : Math.PI;
          if (Math.abs(p.group.position.z) > WORLD.half) p.dir *= -1;
        }
        p.group.rotation.y = heading;
        if (world.rng() < dt * 0.02) p.pause = range(world.rng, 1, 4);
      }
      // Little walking bob.
      p.group.position.y = Math.abs(Math.sin(world.time * 6 + p.group.position.x)) * 0.06;
    }
  }
}
