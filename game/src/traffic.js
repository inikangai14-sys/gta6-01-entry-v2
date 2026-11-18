// Traffic: cars that cruise the avenue/street grid, turn at intersections,
// brake for the car ahead and respawn near the player when they drift too
// far. They are the city's moving life — and the cars you steal.

import * as THREE from 'three';
import { WORLD, TRAFFIC_COUNT } from './config.js';
import { makeCar, randomCarColor } from './vehicles.js';
import { range, pick } from './rng.js';

const KINDS = ['sedan', 'sedan', 'sedan', 'taxi', 'sport', 'truck'];

export class Traffic {
  constructor(world) {
    this.world = world;
    this.cars = [];
    const rng = world.rng;
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      this.spawnCar(rng, true);
    }
  }

  spawnCar(rng, anywhere) {
    const world = this.world;
    const horizontal = rng() < 0.5;
    const road = horizontal
      ? pick(rng, world.city.streets)
      : pick(rng, world.city.avenues);
    let x;
    let z;
    let heading;
    if (horizontal) {
      // On a street (east-west road): constant z, drive east or west.
      z = road + pick(rng, [-2.5, 2.5]);
      x = anywhere ? range(rng, -WORLD.half, WORLD.half) : range(rng, -60, 60);
      heading = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      // On an avenue (north-south road): constant x, drive south or north.
      x = road + pick(rng, [-2.5, 2.5]);
      z = anywhere ? range(rng, -WORLD.half, WORLD.half) : range(rng, -60, 60);
      heading = rng() < 0.5 ? 0 : Math.PI;
    }
    const kind = pick(rng, KINDS);
    const { group, wheels } = makeCar(kind, randomCarColor(rng));
    group.position.set(x, 0, z);
    group.rotation.y = heading;
    world.scene.add(group);
    const car = {
      group,
      wheels,
      kind,
      heading,
      speed: range(rng, 7, 13),
      cruise: range(rng, 8, 14),
      lane: 0,
      taken: false, // true while the player drives it
    };
    this.cars.push(car);
    return car;
  }

  // The nearest free car within `radius` of a point, for E to enter.
  nearestFree(x, z, radius) {
    let best = null;
    let bestD = radius;
    for (const car of this.cars) {
      if (car.taken) continue;
      const dx = car.group.position.x - x;
      const dz = car.group.position.z - z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  update(dt) {
    const world = this.world;
    const px = world.player.pos.x;
    const pz = world.player.pos.z;
    for (const car of this.cars) {
      if (car.taken) continue;
      const p = car.group.position;

      // Brake for the car ahead on the same lane.
      let blocked = false;
      for (const other of this.cars) {
        if (other === car || other.taken) continue;
        const dx = other.group.position.x - p.x;
        const dz = other.group.position.z - p.z;
        const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 9 && side < 2.2) {
          blocked = true;
          break;
        }
      }
      const target = blocked ? 0 : car.cruise;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.6);

      const step = car.speed * dt;
      p.x += Math.sin(car.heading) * step;
      p.z += Math.cos(car.heading) * step;
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.42;
      car.group.rotation.y = car.heading;

      // At an intersection, sometimes turn onto the cross road — and snap
      // into its lane, so the car never drifts off the asphalt.
      const distToLine = (v) => {
        const d = (((v + 200) % WORLD.roadGap) + WORLD.roadGap) % WORLD.roadGap;
        return Math.min(d, WORLD.roadGap - d);
      };
      const nearestRoad = (v) => Math.max(-WORLD.half, Math.min(WORLD.half, Math.round(v / WORLD.roadGap) * WORLD.roadGap));
      if (distToLine(p.x) < 3 && distToLine(p.z) < 3 && world.rng() < dt * 2.5) {
        const horizontal = Math.abs(Math.sin(car.heading)) > 0.7;
        if (horizontal && world.rng() < 0.6) {
          const av = nearestRoad(p.x);
          p.x = av + (p.x - av >= 0 ? 2.5 : -2.5);
          car.heading = world.rng() < 0.5 ? 0 : Math.PI;
        } else if (!horizontal && world.rng() < 0.6) {
          const st = nearestRoad(p.z);
          p.z = st + (p.z - st >= 0 ? 2.5 : -2.5);
          car.heading = world.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        }
      }

      // Respawn on a road near the player when far away, so the streets
      // never empty — and so a stolen car is always on asphalt, never
      // wedged inside a block.
      if (Math.hypot(p.x - px, p.z - pz) > 260 || Math.abs(p.x) > WORLD.half + 20 || Math.abs(p.z) > WORLD.half + 20) {
        const horizontal = world.rng() < 0.5;
        if (horizontal) {
          const road = pick(world.rng, world.city.streets);
          p.x = Math.max(-WORLD.half, Math.min(WORLD.half, px + range(world.rng, -90, 90)));
          p.z = road + pick(world.rng, [-2.5, 2.5]);
          car.heading = world.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          const road = pick(world.rng, world.city.avenues);
          p.x = road + pick(world.rng, [-2.5, 2.5]);
          p.z = Math.max(-WORLD.half, Math.min(WORLD.half, pz + range(world.rng, -90, 90)));
          car.heading = world.rng() < 0.5 ? 0 : Math.PI;
        }
        car.group.rotation.y = car.heading;
        car.speed = car.cruise;
      }
    }
  }
}
