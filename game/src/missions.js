// Mara's night jobs: a six-job story chain, then endless courier gigs.
// Every job is two legs — go to the pickup, then carry it to the drop —
// with a countdown and a payout in the HUD, and a gold beacon in the world
// marking where to go next.

import * as THREE from 'three';
import { JOBS, GIG_NAMES, LANDMARKS } from './config.js';
import { pick, range, rangeInt } from './rng.js';

const beaconGeo = new THREE.CylinderGeometry(1.4, 1.4, 70, 12, 1, true);
const beaconMat = new THREE.MeshBasicMaterial({
  color: 0xf2c230,
  transparent: true,
  opacity: 0.32,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const markerGeo = new THREE.OctahedronGeometry(1.6);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd76e });
const clientTorsoGeo = new THREE.BoxGeometry(0.66, 0.8, 0.38);
const clientHeadGeo = new THREE.SphereGeometry(0.27, 10, 8);

export class Missions {
  constructor(world) {
    this.world = world;
    this.index = 0;
    this.state = 'idle'; // idle | toPickup | toDrop | between | gigPickup | gigDrop
    this.job = null;
    this.timer = 0;
    this.target = new THREE.Vector3();
    this.targetName = '';
    this.payout = 0;
    this.betweenTimer = 0;
    this.jobsDone = 0;
    this.gigCount = 0;
    this.failed = false; // the between-state follows a failed job: retry it

    this.beacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.beacon.visible = false;
    world.scene.add(this.beacon);
    this.marker = new THREE.Mesh(markerGeo, markerMat);
    this.marker.visible = false;
    world.scene.add(this.marker);

    // The client waiting at the pickup: a gold-jacketed figure.
    this.client = new THREE.Group();
    const torso = new THREE.Mesh(clientTorsoGeo, new THREE.MeshLambertMaterial({ color: 0xf2c230 }));
    torso.position.y = 1.15;
    this.client.add(torso);
    const head = new THREE.Mesh(clientHeadGeo, new THREE.MeshLambertMaterial({ color: 0xe8b088 }));
    head.position.y = 1.78;
    this.client.add(head);
    this.client.visible = false;
    world.scene.add(this.client);
  }

  startChain() {
    this.index = 0;
    this.startJob(JOBS[0]);
  }

  startJob(job) {
    const world = this.world;
    this.job = job;
    this.state = 'toPickup';
    this.timer = job.time;
    this.payout = job.payout;
    const pick = LANDMARKS[job.pickup];
    this.setTarget(pick.x, pick.z, pick.label);
    this.client.position.set(pick.x, 0, pick.z);
    this.client.visible = true;
    world.hud.showBriefing(job.title, job.brief);
    world.hud.showBanner(job.title, `Payout $${job.payout} · ${Math.floor(job.time / 60)}:${String(job.time % 60).padStart(2, '0')} on the clock`);
    world.audio.blip(740);
    if (job.wanted > 0) world.police.addHeat(job.wanted);
  }

  startGig() {
    const world = this.world;
    const keys = Object.keys(LANDMARKS).filter((k) => k !== 'ferris');
    const from = pick(world.rng, keys);
    let to = pick(world.rng, keys);
    while (to === from) to = pick(world.rng, keys);
    const name = pick(world.rng, GIG_NAMES);
    const payout = rangeInt(world.rng, 150, 400);
    const time = rangeInt(world.rng, 60, 90);
    this.job = { id: `gig-${this.gigCount}`, title: `GIG — ${name.toUpperCase()}`, brief: `Courier gig: collect at ${LANDMARKS[from].label}, deliver to ${LANDMARKS[to].label}. $${payout} if you beat the clock.`, pickup: from, drop: to, time, payout, wanted: 0 };
    this.gigCount += 1;
    this.state = 'gigPickup';
    this.timer = time;
    this.payout = payout;
    const pick = LANDMARKS[from];
    this.setTarget(pick.x, pick.z, pick.label);
    this.client.position.set(pick.x, 0, pick.z);
    this.client.visible = true;
    world.hud.showBriefing(this.job.title, this.job.brief);
    world.hud.showBanner(this.job.title, `Payout $${payout}`);
    world.audio.blip(740);
  }

  setTarget(x, z, name) {
    this.target.set(x, 0, z);
    this.targetName = name;
    this.beacon.position.set(x, 35, z);
    this.beacon.visible = true;
    this.marker.position.set(x, 6, z);
    this.marker.visible = true;
  }

  hideTarget() {
    this.beacon.visible = false;
    this.marker.visible = false;
    this.client.visible = false;
  }

  failJob(reason) {
    const world = this.world;
    world.hud.flash(`JOB FAILED — ${reason}. Mara gives you one more shot.`, '#ff5a5a');
    world.audio.blip(220);
    this.hideTarget();
    this.failed = true;
    this.state = 'between';
    this.betweenTimer = 2.5;
  }

  completeLeg() {
    const world = this.world;
    if (this.state === 'toPickup' || this.state === 'gigPickup') {
      // Picked up: now carry it to the drop.
      this.state = this.state === 'toPickup' ? 'toDrop' : 'gigDrop';
      const drop = LANDMARKS[this.job.drop];
      this.setTarget(drop.x, drop.z, drop.label);
      this.client.visible = false;
      world.hud.flash(`Got it — now to ${drop.label}.`, '#7dff9a');
      world.audio.blip(990);
    } else {
      // Delivered: pay out and move on.
      const payout = this.payout;
      world.player.cash += payout;
      this.jobsDone += 1;
      world.save.jobsDone = this.jobsDone;
      world.save.bestCash = Math.max(world.save.bestCash, world.player.cash);
      world.main.persistSave();
      world.hud.showBanner('JOB DONE', `+$${payout} · ${this.job.title}`);
      world.hud.flash(`+$${payout} — cash $${world.player.cash}`, '#7dff9a');
      world.audio.jingle();
      world.fx.floatText(`+$${payout}`);
      this.hideTarget();
      this.state = 'between';
      this.betweenTimer = 3;
    }
  }

  update(dt) {
    const world = this.world;
    if (this.state === 'idle') return;

    // Beacon pulse + marker bob.
    if (this.beacon.visible) {
      beaconMat.opacity = 0.24 + Math.sin(world.time * 3) * 0.1;
      this.marker.position.y = 6 + Math.sin(world.time * 2.4) * 0.9;
      this.marker.rotation.y += dt * 1.5;
    }

    if (this.state === 'between') {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) {
        if (this.failed) {
          // Retry the job that just failed.
          this.failed = false;
          if (this.job && this.job.id && this.job.id.startsWith('gig')) this.startGig();
          else this.startJob(JOBS[this.index]);
        } else if (this.job && this.job.id && this.job.id.startsWith('gig')) {
          this.startGig();
        } else if (this.index < JOBS.length - 1) {
          this.index += 1;
          this.startJob(JOBS[this.index]);
        } else if (this.index === JOBS.length - 1 && this.jobsDone >= JOBS.length) {
          world.hud.showBanner('CLEAN SLATE', 'Six jobs, one clean slate. The city is yours, Jay.');
          this.startGig();
        } else {
          this.startGig();
        }
      }
      return;
    }

    // Active leg: countdown and arrival check.
    this.timer -= dt;
    if (this.timer <= 0) {
      this.failJob('out of time');
      return;
    }
    const p = world.player.pos;
    const dist = Math.hypot(p.x - this.target.x, p.z - this.target.z);
    if (dist < 7) this.completeLeg();
  }

  // What the HUD shows: title, objective line, countdown, payout, distance.
  objective() {
    if (this.state === 'idle') return null;
    if (this.state === 'between') return { title: 'Next job coming up…', text: '', timer: null, payout: 0, distance: 0 };
    const leg = this.state === 'toPickup' || this.state === 'gigPickup' ? 'Pick up' : 'Deliver to';
    const dist = Math.hypot(this.world.player.pos.x - this.target.x, this.world.player.pos.z - this.target.z);
    return {
      title: this.job.title,
      text: `${leg}: ${this.targetName}`,
      timer: Math.max(0, this.timer),
      payout: this.payout,
      distance: Math.round(dist),
    };
  }
}
