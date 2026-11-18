// The wanted system and the Solmar PD. Crimes raise the heat, cruisers
// spawn at the city edge and chase the player, officers run you down on
// foot, and the stars fade only when nobody can see you for a while.

import * as THREE from 'three';
import { WORLD, POLICE } from './config.js';
import { makeCar } from './vehicles.js';
import { range } from './rng.js';

export class Police {
  constructor(world) {
    this.world = world;
    this.wanted = 0;
    this.heat = 0; // 0..1, fills while committing crimes, drains when hidden
    this.hiddenTimer = 0;
    this.units = []; // { group, wheels, kind: 'car'|'officer', speed }
    this.sirenOn = false;
  }

  addHeat(stars) {
    this.wanted = Math.min(POLICE.maxStars, this.wanted + stars);
    this.heat = 1;
    this.hiddenTimer = 0;
    this.world.audio.setSiren(true);
    this.world.hud.flash(`WANTED — ${this.wanted} STAR${this.wanted > 1 ? 'S' : ''}`, '#ff5a5a');
  }

  // Called every frame: keep the right number of units chasing.
  update(dt) {
    const world = this.world;
    const player = world.player;
    const want = this.wanted > 0 ? Math.min(this.wanted, 3) : 0;

    // Spawn cruisers up to the wanted level's count.
    const cars = this.units.filter((u) => u.kind === 'car').length;
    if (cars < want && world.rng() < dt * 0.8) {
      this.spawnUnit('car');
    }
    if (this.wanted >= 3 && this.units.filter((u) => u.kind === 'officer').length < 2 && world.rng() < dt * 0.5) {
      this.spawnUnit('officer');
    }

    // Heat decays when no unit is close and the player is not committing
    // crimes; one star fades every decay window.
    let nearest = Infinity;
    for (const u of this.units) {
      nearest = Math.min(nearest, Math.hypot(u.group.position.x - player.pos.x, u.group.position.z - player.pos.z));
    }
    if (this.wanted > 0 && nearest > 55) {
      this.hiddenTimer += dt;
      if (this.hiddenTimer > POLICE.decaySeconds) {
        this.wanted -= 1;
        this.hiddenTimer = 0;
        world.hud.flash(this.wanted > 0 ? `Heat cooling — ${this.wanted} star${this.wanted > 1 ? 's' : ''} left` : 'You lost the tail.', '#7dff9a');
        if (this.wanted === 0) world.audio.setSiren(false);
      }
    } else {
      this.hiddenTimer = 0;
    }

    // Chase: cruisers steer at the player and ram; officers run at them.
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      const p = u.group.position;
      const dx = player.pos.x - p.x;
      const dz = player.pos.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (this.wanted === 0 || dist > 300) {
        // Stood down: drive off and despawn.
        world.scene.remove(u.group);
        this.units.splice(i, 1);
        continue;
      }
      const targetHeading = Math.atan2(dx, dz);
      let turn = targetHeading - u.heading;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      u.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, turn));
      const speed = u.kind === 'car' ? Math.min(30, 16 + this.wanted * 3) : 7.5;
      u.speed = speed;
      p.x += Math.sin(u.heading) * speed * dt;
      p.z += Math.cos(u.heading) * speed * dt;
      u.group.rotation.y = u.heading;
      if (u.kind === 'car') {
        for (const w of u.wheels) w.rotation.x += (speed * dt) / 0.42;
      }

      // Contact: a ram hurts, an officer on foot busts you at 3+ stars.
      if (dist < 3.2) {
        if (u.kind === 'car') {
          if (!u.cooldown || u.cooldown <= 0) {
            player.damage(POLICE.ramDamage, 'ram');
            u.cooldown = 1.2;
          }
        } else if (this.wanted >= 3 && !player.inCar) {
          world.main.endGame('busted');
        } else if (!u.cooldown || u.cooldown <= 0) {
          player.damage(POLICE.officerDamage, 'officer');
          u.cooldown = 1.0;
        }
      }
      if (u.cooldown) u.cooldown -= dt;
    }
  }

  spawnUnit(kind) {
    const world = this.world;
    const p = world.player.pos;
    const angle = world.rng() * Math.PI * 2;
    const dist = range(world.rng, 70, 110);
    const x = Math.max(-WORLD.half, Math.min(WORLD.half, p.x + Math.cos(angle) * dist));
    const z = Math.max(-WORLD.half, Math.min(WORLD.half, p.z + Math.sin(angle) * dist));
    if (kind === 'car') {
      const { group, wheels } = makeCar('police');
      group.position.set(x, 0, z);
      world.scene.add(group);
      this.units.push({ group, wheels, kind, heading: Math.atan2(p.x - x, p.z - z), speed: 0, cooldown: 0 });
    } else {
      const group = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.8, 0.38),
        new THREE.MeshLambertMaterial({ color: 0x1a3a6e }),
      );
      torso.position.y = 1.15;
      group.add(torso);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xe8b088 }),
      );
      head.position.y = 1.75;
      group.add(head);
      const legs = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.75, 0.32),
        new THREE.MeshLambertMaterial({ color: 0x1a1d22 }),
      );
      legs.position.y = 0.4;
      group.add(legs);
      group.position.set(x, 0, z);
      world.scene.add(group);
      this.units.push({ group, wheels: [], kind, heading: 0, speed: 0, cooldown: 0 });
    }
  }
}
