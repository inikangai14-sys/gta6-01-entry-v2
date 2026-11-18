// Screenshot presets: ?shot=street|drive|chase|mission&seed=7 stages a
// moment of the game and starts it at once, so the shipped screenshots
// show real gameplay — never the title screen. The same hooks let the
// play-test drive the real game: window.__game and window.__shotReady.

import { JOBS, LANDMARKS } from './config.js';
import { makeCar } from './vehicles.js';

export function readParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    seed: parseInt(q.get('seed') || '7', 10) || 7,
    shot: q.get('shot') || '',
    debug: q.get('debug') === '1',
  };
}

function putPlayerInCar(world, x, z, heading, kind) {
  const { group, wheels } = makeCar(kind, 0xc22e2e);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  world.scene.add(group);
  const car = { group, wheels, kind, heading, speed: 0, cruise: 0, taken: true };
  world.traffic.cars.push(car);
  const player = world.player;
  player.car = car;
  player.inCar = true;
  player.carHeading = heading;
  player.mesh.visible = false;
  player.pos.set(x, 0, z);
  player.camYaw = heading + Math.PI; // camera behind the car, not in front
  return car;
}

// Park a few extra traffic cars where the staged camera can actually see
// them: two ahead on the player's own road, one crossing the path on the
// next cross street. The road is picked near the player, never anywhere
// in the city, so the cars land in frame.
function seedNearbyTraffic(world, count) {
  const p = world.player.pos;
  // The camera sits at pos + forward(camYaw) * dist and looks back at the
  // player, so "ahead in frame" is the OPPOSITE of forward(camYaw).
  const fx = -Math.sin(world.player.camYaw);
  const fz = -Math.cos(world.player.camYaw);
  const nearestRoad = (v) => Math.max(-200, Math.min(200, Math.round(v / 40) * 40));
  for (let i = 0; i < count; i++) {
    const car = world.traffic.spawnCar(world.rng, false);
    const dist = 16 + i * 14 + world.rng() * 6;
    if (i < 2) {
      // On the player's road, ahead of the player, driving the same way.
      const onAvenue = Math.abs(p.x - nearestRoad(p.x)) < 6;
      if (onAvenue) {
        const road = nearestRoad(p.x);
        car.group.position.set(road + (world.rng() < 0.5 ? -2.5 : 2.5), 0, p.z + fz * dist);
        car.heading = fz > 0 ? 0 : Math.PI;
      } else {
        const road = nearestRoad(p.z);
        car.group.position.set(p.x + fx * dist, 0, road + (world.rng() < 0.5 ? -2.5 : 2.5));
        car.heading = fx > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    } else {
      // Crossing the player's path on the next cross street ahead.
      if (Math.abs(fz) > 0.7) {
        const street = nearestRoad(p.z + fz * dist);
        car.group.position.set(p.x + (world.rng() < 0.5 ? -1 : 1) * (10 + world.rng() * 14), 0, street + (world.rng() < 0.5 ? -2.5 : 2.5));
        car.heading = world.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        const avenue = nearestRoad(p.x + fx * dist);
        car.group.position.set(avenue + (world.rng() < 0.5 ? -2.5 : 2.5), 0, p.z + (world.rng() < 0.5 ? -1 : 1) * (10 + world.rng() * 14));
        car.heading = world.rng() < 0.5 ? 0 : Math.PI;
      }
    }
    car.group.rotation.y = car.heading;
  }
}

export function applyShot(world, shot) {
  const m = world.missions;
  const p = world.player;
  if (shot === 'street') {
    // On foot at the plaza, job 1 live, golden hour.
    p.pos.set(0, 0, 8);
    p.mesh.position.copy(p.pos);
    p.camYaw = Math.PI;
    world.daylight.setHour(17.66);
    seedNearbyTraffic(world, 3);
    m.startChain();
  } else if (shot === 'drive') {
    // Mid-delivery in a sports car on the main avenue, timer running.
    putPlayerInCar(world, 0, -60, 0, 'sport');
    p.speed = 22;
    world.daylight.setHour(18.4);
    seedNearbyTraffic(world, 3);
    m.startJob(JOBS[1]);
    m.state = 'toDrop';
    m.timer = 47;
    const drop = LANDMARKS[JOBS[1].drop];
    m.setTarget(drop.x, drop.z, drop.label);
    m.client.visible = false;
    world.hud.hideBriefing();
  } else if (shot === 'chase') {
    // Three stars, three cruisers on the tail, dusk.
    putPlayerInCar(world, 40, 40, Math.PI / 2, 'sport');
    p.speed = 26;
    world.daylight.setHour(19.2);
    world.audio.setSiren(true);
    for (let i = 0; i < 3; i++) world.police.spawnUnit('car');
    // Stage the cruisers where the camera can see them: two ahead on the
    // road, one closing from behind.
    const spots = [[72, 34], [86, 46], [14, 48]];
    world.police.units.forEach((u, i) => {
      if (u.kind !== 'car') return;
      const [sx, sz] = spots[i % spots.length];
      u.group.position.set(sx, 0, sz);
      u.heading = Math.atan2(p.pos.x - sx, p.pos.z - sz);
    });
    m.startJob(JOBS[3]); // job 4 opens with 3 stars of heat
    m.state = 'toDrop';
    m.timer = 88;
    const drop = LANDMARKS[JOBS[3].drop];
    m.setTarget(drop.x, drop.z, drop.label);
    m.client.visible = false;
    world.hud.hideBriefing();
    world.hud.showBanner('SHAKE THE TAIL', 'Lose the cruisers — then reach the Warehouse');
  } else if (shot === 'mission') {
    // The moment after job 3 pays out: banner, cash up, next beacon lit.
    putPlayerInCar(world, -120, -60, Math.PI, 'taxi');
    p.cash = 720;
    m.jobsDone = 3;
    m.index = 3;
    world.daylight.setHour(18.9);
    m.startJob(JOBS[3]);
    world.hud.hideBriefing();
    world.hud.showBanner('JOB DONE', '+$600 · JOB 3 — RICO\'S RIDE');
    world.hud.flash('+$600 — cash $720', '#7dff9a');
  }
  world.mode = 'play';
  world.hud.showScreen(null);
}

export function exposeDebug(world) {
  window.__game = {
    screen: () => world.mode,
    state: () => ({
      mode: world.mode,
      cash: world.player.cash,
      health: Math.round(world.player.health),
      wanted: world.police.wanted,
      ammo: world.player.ammo,
      inCar: world.player.inCar,
      speedKmh: Math.round(Math.abs(world.player.speed) * 3.6),
      mission: world.missions.job ? world.missions.job.title : null,
      missionState: world.missions.state,
      missionTimer: Math.round(world.missions.timer),
      jobsDone: world.missions.jobsDone,
      hour: world.daylight.hour.toFixed(2),
      traffic: world.traffic.cars.length,
      peds: world.peds.list.length,
      police: world.police.units.length,
      x: Math.round(world.player.pos.x),
      z: Math.round(world.player.pos.z),
      yaw: world.player.yaw.toFixed(2),
    }),
    // Test-only helpers: move the player and put them in a car, so the
    // play-test can exercise driving without blind keyboard wandering.
    debug: {
      teleport(x, z) {
        world.player.pos.set(x, 0, z);
        world.player.mesh.position.copy(world.player.pos);
        if (world.player.inCar) {
          world.player.car.group.position.set(x, 0, z);
        }
      },
      enterNearestCar() {
        const car = world.traffic.nearestFree(world.player.pos.x, world.player.pos.z, 30);
        if (car) world.player.enterCar(car);
        return !!car;
      },
      nearestCarPos() {
        const car = world.traffic.nearestFree(world.player.pos.x, world.player.pos.z, 500);
        return car ? { x: Math.round(car.group.position.x), z: Math.round(car.group.position.z) } : null;
      },
      cars() {
        return world.traffic.cars.map((c) => ({
          x: Math.round(c.group.position.x * 10) / 10,
          z: Math.round(c.group.position.z * 10) / 10,
          heading: Math.round(c.heading * 100) / 100,
          taken: c.taken,
        }));
      },
    },
  };
}
