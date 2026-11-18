// The day cycle: Solmar Bay starts at golden hour and slides into dusk,
// then night, then dawn again. The sun, the sky, the fog and the lamps all
// follow one clock, so the city reads warm and sun-soaked at 17:40 and
// purple-neon at 20:00. Shot presets pin the hour; normal play lets it run.

import * as THREE from 'three';
import { CLOCK_START_HOUR, CLOCK_MINUTES_PER_SECOND } from './config.js';

// Stops along the day: hour -> [sky, fog, sun color, sun intensity, hemi sky, hemi ground]
const STOPS = [
  [6.0, 0xffd9a8, 0xe8c9a0, 0xffd27a, 1.1, 0xbfd9ff, 0x8a7a5a],
  [8.0, 0x9fd4ff, 0xa8c8e0, 0xfff2cc, 1.9, 0xcfe8ff, 0x7a7a5a],
  [12.0, 0x7ec8ff, 0x9fd0e8, 0xfff6e0, 2.2, 0xd8ecff, 0x8a8a6a],
  [16.5, 0x8fd0ff, 0xa8cce0, 0xffe9b0, 2.0, 0xd8ecff, 0x8a7a5a],
  [17.66, 0xffc98a, 0xe8b088, 0xffb347, 1.9, 0xffd9a8, 0x7a6a52],
  [18.5, 0xff9e6e, 0xd89878, 0xff8c42, 1.35, 0xffb088, 0x5a4a48],
  [19.5, 0x8a5a8a, 0x6a4a6a, 0xff6a3d, 0.55, 0x7a5a8a, 0x3a3242],
  [20.5, 0x2a2a55, 0x222244, 0x8a7aff, 0.18, 0x3a3a6a, 0x1a1a28],
  [23.0, 0x141430, 0x12122a, 0x6a7aff, 0.12, 0x2a2a55, 0x12121e],
  [5.0, 0x141430, 0x12122a, 0x6a7aff, 0.12, 0x2a2a55, 0x12121e],
];

function lerpStops(hour) {
  // Find the two stops the hour sits between (the table wraps at midnight).
  let prev = STOPS[STOPS.length - 1];
  let next = STOPS[0];
  for (let i = 0; i < STOPS.length; i++) {
    if (STOPS[i][0] <= hour) prev = STOPS[i];
    if (STOPS[i][0] > hour) {
      next = STOPS[i];
      break;
    }
  }
  const span = (next[0] - prev[0] + 24) % 24 || 24;
  const t = Math.min(1, Math.max(0, (((hour - prev[0]) + 24) % 24) / span));
  const mix = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  return {
    sky: mix(prev[1], next[1]),
    fog: mix(prev[2], next[2]),
    sunColor: mix(prev[3], next[3]),
    sunIntensity: prev[4] + (next[4] - prev[4]) * t,
    hemiSky: mix(prev[5], next[5]),
    hemiGround: mix(prev[6], next[6]),
  };
}

export class Daylight {
  constructor(scene) {
    this.scene = scene;
    this.hour = CLOCK_START_HOUR;
    this.sun = new THREE.DirectionalLight(0xffb347, 1.7);
    this.sun.position.set(120, 90, -60);
    scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0xffd9a8, 0x7a6a52, 1.05);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(this.ambient);

    // A flat glowing disc for the sun itself, so the sky has a source.
    const sunGeo = new THREE.CircleGeometry(14, 24);
    this.sunDisc = new THREE.Mesh(
      sunGeo,
      new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false, transparent: true, opacity: 0.95 }),
    );
    scene.add(this.sunDisc);

    scene.fog = new THREE.Fog(0xe8b088, 180, 520);
    this.lampMats = [];
    this.isNight = false;
  }

  registerLamp(material) {
    this.lampMats.push(material);
  }

  setHour(hour) {
    this.hour = hour;
    this.apply();
  }

  advance(dt) {
    this.hour += (CLOCK_MINUTES_PER_SECOND * dt) / 60;
    if (this.hour >= 24) this.hour -= 24;
    this.apply();
  }

  apply() {
    const c = lerpStops(this.hour);
    this.scene.background = c.sky;
    this.scene.fog.color.copy(c.fog);
    this.sun.color.copy(c.sunColor);
    this.sun.intensity = c.sunIntensity;
    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);

    // Sun swings low in the west at golden hour, high at noon, gone at night.
    const dayFrac = ((this.hour - 6 + 24) % 24) / 12; // 0 dawn, 0.5 noon, 1 dusk
    const elev = Math.sin(dayFrac * Math.PI) * 1.1;
    const azim = dayFrac * Math.PI * 1.4 - 0.4;
    const r = 320;
    const sx = Math.cos(azim) * r;
    const sy = Math.max(18, elev * r);
    const sz = Math.sin(azim) * r * 0.6;
    this.sun.position.set(sx, sy, sz);
    this.sunDisc.position.set(sx * 0.98, sy * 0.98, sz * 0.98);
    this.sunDisc.lookAt(0, 20, 0);
    this.sunDisc.material.color.copy(c.sunColor);
    this.sunDisc.visible = elev > 0.02;

    // Night: lamps flare up, the world goes dim blue.
    const night = this.hour >= 19.8 || this.hour < 5.4;
    if (night !== this.isNight) {
      this.isNight = night;
      for (const m of this.lampMats) m.emissiveIntensity = night ? 1.6 : 0.25;
    }
  }
}
