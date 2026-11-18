// Jay Cruz, on foot and behind the wheel. On foot he walks, runs and
// jumps with a camera-relative move; in a car he steers, brakes and
// handbrakes, and the camera swings behind the car. E steals the nearest
// car, and the police notice.

import * as THREE from 'three';
import { PLAYER, CAR, WORLD } from './config.js';
import { collideCircle } from './city.js';

const torsoGeo = new THREE.BoxGeometry(0.66, 0.8, 0.38);
const legsGeo = new THREE.BoxGeometry(0.58, 0.75, 0.34);
const headGeo = new THREE.SphereGeometry(0.27, 10, 8);
const capGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.12, 10);

export class Player {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(0, 0, 8);
    this.yaw = 0; // facing, radians (atan2(x, z))
    this.velY = 0;
    this.grounded = true;
    this.health = PLAYER.maxHealth;
    this.cash = PLAYER.startCash;
    this.ammo = PLAYER.startAmmo;
    this.inCar = false;
    this.car = null;
    this.speed = 0; // signed, m/s
    this.carHeading = 0;
    this.camYaw = Math.PI;
    this.camPitch = 0.32;
    this.camDist = 11;
    this.regenTimer = 0;

    const jacket = new THREE.MeshLambertMaterial({ color: 0x2a4a6e });
    const denim = new THREE.MeshLambertMaterial({ color: 0x2a2e33 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xe8b088 });
    const cap = new THREE.MeshLambertMaterial({ color: 0xc22e2e });
    this.mesh = new THREE.Group();
    const torso = new THREE.Mesh(torsoGeo, jacket);
    torso.position.y = 1.15;
    this.mesh.add(torso);
    const legs = new THREE.Mesh(legsGeo, denim);
    legs.position.y = 0.4;
    this.mesh.add(legs);
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 1.78;
    this.mesh.add(head);
    const capMesh = new THREE.Mesh(capGeo, cap);
    capMesh.position.y = 1.98;
    this.mesh.add(capMesh);
    this.mesh.position.copy(this.pos);
    world.scene.add(this.mesh);
  }

  damage(amount, cause) {
    if (this.world.mode !== 'play') return;
    this.health = Math.max(0, this.health - amount);
    this.world.fx.shake = Math.min(1, this.world.fx.shake + 0.5);
    this.world.audio.thud();
    this.world.hud.damageFlash();
    this.regenTimer = 5;
    if (this.health <= 0) {
      this.world.main.endGame(cause === 'ram' ? 'wasted' : 'wasted');
    }
  }

  heal(amount) {
    this.health = Math.min(PLAYER.maxHealth, this.health + amount);
  }

  enterCar(car) {
    car.taken = true;
    this.car = car;
    this.inCar = true;
    this.carHeading = car.heading;
    this.speed = 0;
    this.mesh.visible = false;
    this.world.audio.blip(660);
    this.world.hud.flash('Car jacked — the PD noticed.', '#ffd76e');
    this.world.police.addHeat(1);
  }

  exitCar() {
    if (!this.car) return;
    const car = this.car;
    car.taken = false;
    // Step out on the driver's side.
    const side = new THREE.Vector3(Math.cos(this.carHeading), 0, -Math.sin(this.carHeading));
    this.pos.set(car.group.position.x + side.x * 2.4, 0, car.group.position.z + side.z * 2.4);
    this.car = null;
    this.inCar = false;
    this.speed = 0;
    this.mesh.visible = true;
    this.mesh.position.copy(this.pos);
  }

  update(dt) {
    const world = this.world;
    const input = world.input;

    // Camera orbit from the mouse, zoom from the wheel.
    const drag = input.takeDrag();
    this.camYaw -= drag.dx * 0.005;
    this.camPitch = Math.max(0.08, Math.min(1.1, this.camPitch + drag.dy * 0.004));
    this.camDist = Math.max(6, Math.min(17, this.camDist + input.takeWheel() * 0.01));

    if (this.inCar) this.updateCar(dt);
    else this.updateFoot(dt);

    // Slow health regen out of combat.
    this.regenTimer -= dt;
    if (this.regenTimer <= 0 && this.health < PLAYER.maxHealth && this.health > 0) {
      this.heal(2.2 * dt);
    }

    this.updateCamera(dt);
  }

  updateFoot(dt) {
    const world = this.world;
    const input = world.input;
    let fx = 0;
    let fz = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) fz += 1;
    if (input.down('KeyS') || input.down('ArrowDown')) fz -= 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) fx -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) fx += 1;
    const moving = fx !== 0 || fz !== 0;
    const run = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;

    if (moving) {
      // Camera-relative movement: forward is away from the camera.
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      const mx = fx * cos - fz * sin;
      const mz = -(fx * sin + fz * cos);
      const len = Math.hypot(mx, mz) || 1;
      this.pos.x += (mx / len) * speed * dt;
      this.pos.z += (mz / len) * speed * dt;
      this.yaw = Math.atan2(mx, mz);
      this.mesh.rotation.y = this.yaw;
      // Walk bob.
      this.mesh.position.y = Math.abs(Math.sin(world.time * 9)) * 0.08;
    } else {
      this.mesh.position.y = 0;
    }

    if (input.wasPressed('Space') && this.grounded) {
      this.velY = PLAYER.jumpSpeed;
      this.grounded = false;
    }
    if (!this.grounded) {
      this.velY -= PLAYER.gravity * dt;
      this.pos.y += this.velY * dt;
      if (this.pos.y <= 0) {
        this.pos.y = 0;
        this.velY = 0;
        this.grounded = true;
      }
    }

    collideCircle(this.pos, PLAYER.radius, world.city.colliders);
    this.pos.x = Math.max(-WORLD.half - 30, Math.min(WORLD.half + 30, this.pos.x));
    this.pos.z = Math.max(-WORLD.half - 30, Math.min(WORLD.half + 40, this.pos.z));
    this.mesh.position.set(this.pos.x, this.pos.y + this.mesh.position.y * 0, this.pos.z);
    this.mesh.position.y = this.pos.y + (moving ? Math.abs(Math.sin(world.time * 9)) * 0.08 : 0);
    this.speed = moving ? speed : 0;

    if (input.wasPressed('KeyE')) {
      const car = world.traffic.nearestFree(this.pos.x, this.pos.z, 5.5);
      if (car) this.enterCar(car);
    }
  }

  updateCar(dt) {
    const world = this.world;
    const input = world.input;
    const car = this.car;
    const p = car.group.position;

    const accel = input.down('KeyW') || input.down('ArrowUp') ? 1 : 0;
    const brake = input.down('KeyS') || input.down('ArrowDown') ? 1 : 0;
    const handbrake = input.down('Space');
    if (accel) this.speed += CAR.accel * dt;
    if (brake) this.speed -= this.speed > 0.5 ? CAR.brake * dt : CAR.accel * 0.7 * dt;
    if (!accel && !brake) this.speed -= this.speed * 0.9 * dt;
    this.speed = Math.max(-CAR.reverseMax, Math.min(CAR.maxSpeed, this.speed));
    if (handbrake) this.speed *= 1 - 2.2 * dt;

    let steer = 0;
    if (input.down('KeyA') || input.down('ArrowLeft')) steer += 1;
    if (input.down('KeyD') || input.down('ArrowRight')) steer -= 1;
    const steerFactor = Math.min(1, Math.abs(this.speed) / 9) * (this.speed >= 0 ? 1 : -1);
    const grip = handbrake ? CAR.handbrakeGrip : 1;
    this.carHeading += steer * CAR.steer * steerFactor * grip * dt;
    car.heading = this.carHeading;

    p.x += Math.sin(this.carHeading) * this.speed * dt;
    p.z += Math.cos(this.carHeading) * this.speed * dt;

    // Buildings stop the car hard; other cars bump it.
    const before = { x: p.x, z: p.z };
    if (collideCircle(p, 2.3, world.city.colliders)) {
      if (Math.abs(this.speed) > 12) {
        this.damage(Math.abs(this.speed) * 0.4, 'crash');
        world.audio.thud();
      }
      this.speed *= -0.25;
      p.x = before.x;
      p.z = before.z;
    }
    for (const other of world.traffic.cars) {
      if (other === car || other.taken) continue;
      const dx = other.group.position.x - p.x;
      const dz = other.group.position.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 4.6 && d > 0.01) {
        const push = (4.6 - d) / 2;
        p.x -= (dx / d) * push;
        p.z -= (dz / d) * push;
        other.group.position.x += (dx / d) * push;
        other.group.position.z += (dz / d) * push;
        if (Math.abs(this.speed) > 10) {
          this.damage(3, 'crash');
          world.audio.thud();
        }
        this.speed *= 0.82;
      }
    }

    p.x = Math.max(-WORLD.half - 30, Math.min(WORLD.half + 30, p.x));
    p.z = Math.max(-WORLD.half - 30, Math.min(WORLD.half + 40, p.z));
    car.group.rotation.y = this.carHeading;
    for (const w of car.wheels) w.rotation.x += (this.speed * dt) / 0.42;
    // Body lean into the turn, a little bounce over the road.
    car.group.rotation.z = -steer * 0.03 * Math.min(1, Math.abs(this.speed) / 20);
    car.group.position.y = Math.abs(Math.sin(world.time * 14)) * 0.03 * Math.min(1, Math.abs(this.speed) / 15);

    this.pos.set(p.x, 0, p.z);
    this.yaw = this.carHeading;
    world.audio.setEngine(Math.abs(this.speed) / CAR.maxSpeed, true);

    if (input.wasPressed('KeyE')) this.exitCar();
  }

  updateCamera(dt) {
    const world = this.world;
    // While driving the camera eases BEHIND the car: the camera sits at
    // pos + forward(camYaw) * dist, so behind means camYaw = carHeading + PI.
    // (Easing toward carHeading itself parks the camera in FRONT of the car,
    // facing the road the car already left.)
    if (this.inCar && Math.abs(this.speed) > 4) {
      let diff = this.carHeading + Math.PI - this.camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.camYaw += diff * Math.min(1, dt * 1.4);
    }
    const cx = this.pos.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const cz = this.pos.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
    const cy = this.pos.y + 2 + Math.sin(this.camPitch) * this.camDist;
    const shake = world.fx.shake;
    const sx = shake > 0 ? (Math.random() - 0.5) * shake * 0.7 : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake * 0.7 : 0;
    world.camera.position.set(cx + sx, Math.max(1.4, cy + sy), cz);
    world.camera.lookAt(this.pos.x, this.pos.y + 2.2, this.pos.z);
    world.fx.shake = Math.max(0, shake - dt * 1.8);
  }
}
