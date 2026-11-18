// Solmar Bay: Night Shift — bootstrap and the game loop. Builds the world
// (city, traffic, pedestrians, police, missions, HUD, minimap), runs the
// title / play / pause / over screens, saves progress, and exposes the
// debug hooks the play-test drives.

import * as THREE from 'three';
import { makeRng } from './rng.js';
import { CLOCK_START_HOUR } from './config.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { Daylight } from './daylight.js';
import { buildCity } from './city.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Police } from './police.js';
import { Player } from './player.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { Effects } from './effects.js';
import { HUD } from './hud.js';
import { Minimap } from './minimap.js';
import { readParams, applyShot, exposeDebug } from './shots.js';

const SAVE_KEY = 'solmar-bay-night-shift-v2';

class Game {
  constructor() {
    this.params = readParams();
    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.world = {
      rng: makeRng(this.params.seed),
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900),
      renderer: this.renderer,
      time: 0,
      mode: 'title',
      main: this,
      save: { bestCash: 120, jobsDone: 0 },
    };
    const w = this.world;
    w.camera.position.set(0, 26, -60);

    // Systems, in the order they need each other.
    w.input = new Input(canvas);
    w.audio = new AudioEngine();
    w.daylight = new Daylight(w.scene);
    w.city = buildCity(w);
    w.scene.add(w.city.group);
    for (const m of w.city.lampMats) w.daylight.registerLamp(m);
    w.daylight.setHour(CLOCK_START_HOUR);
    w.traffic = new Traffic(w);
    w.peds = new Pedestrians(w);
    w.hud = new HUD();
    w.fx = new Effects(w);
    w.player = new Player(w);
    w.police = new Police(w);
    w.missions = new Missions(w);
    w.combat = new Combat(w);
    w.minimap = new Minimap();
    this.loadSave();

    // Menus.
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());
    document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    document.getElementById('mute-btn').addEventListener('click', () => this.toggleMute());
    document.getElementById('again-btn').addEventListener('click', () => this.restart());
    window.addEventListener('resize', () => this.onResize());

    exposeDebug(w);
    this.updateSaveLine();

    if (this.params.shot) {
      // Staged screenshots skip the title screen entirely.
      applyShot(w, this.params.shot);
      this.frames = 0;
    } else if (this.params.debug) {
      w.mode = 'title';
    }
    w.hud.showScreen(this.params.shot ? null : 'title');

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.bestCash === 'number') this.world.save.bestCash = data.bestCash;
      if (typeof data.jobsDone === 'number') this.world.save.jobsDone = data.jobsDone;
    } catch {
      // A corrupt save is just ignored.
    }
  }

  persistSave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.world.save));
    } catch {
      // Private mode or no storage: the game still plays.
    }
    this.updateSaveLine();
  }

  updateSaveLine() {
    const s = this.world.save;
    this.world.hud.setSaveLine(
      s.jobsDone > 0 || s.bestCash > 120
        ? `Best cash $${s.bestCash.toLocaleString('en-US')} · ${s.jobsDone} job${s.jobsDone === 1 ? '' : 's'} done`
        : 'No save yet — your best cash and finished jobs will show here.',
    );
  }

  startGame() {
    const w = this.world;
    w.audio.unlock();
    w.mode = 'play';
    w.hud.showScreen(null);
    w.hud.flash('Mara: "First job is at the Marina. Move."', '#ffd76e');
    if (w.missions.state === 'idle') w.missions.startChain();
  }

  restart() {
    const w = this.world;
    // A fresh run: health and heat reset, cash and the chain restart.
    w.player.health = 100;
    w.player.cash = 120;
    w.player.ammo = 12;
    w.police.wanted = 0;
    w.police.heat = 0;
    w.audio.setSiren(false);
    for (const u of w.police.units.splice(0)) w.scene.remove(u.group);
    w.missions.index = 0;
    w.missions.jobsDone = 0;
    w.missions.state = 'idle';
    w.missions.hideTarget();
    w.missions.startChain();
    w.player.pos.set(0, 0, 8);
    w.player.mesh.position.copy(w.player.pos);
    if (w.player.inCar) w.player.exitCar();
    w.mode = 'play';
    w.hud.showScreen(null);
  }

  togglePause() {
    const w = this.world;
    if (w.mode === 'play') {
      w.mode = 'pause';
      w.hud.showScreen('pause');
    } else if (w.mode === 'pause') {
      w.mode = 'play';
      w.hud.showScreen(null);
    }
  }

  toggleMute() {
    const w = this.world;
    w.audio.setMuted(!w.audio.muted);
    document.getElementById('mute-btn').textContent = w.audio.muted ? '🔇 Sound: Off (M)' : '🔊 Sound: On (M)';
  }

  endGame(kind) {
    const w = this.world;
    if (w.mode !== 'play') return;
    w.mode = 'over';
    w.audio.setSiren(false);
    w.audio.setEngine(0, false);
    if (kind === 'busted') {
      w.hud.setEnd('BUSTED', 'The Solmar PD finally got you. Mara is already planning the bail — or the breakout.');
    } else {
      w.hud.setEnd('WASTED', 'Solmar Bay chewed you up. The crew is waiting at Coral Row for the next run.');
    }
    w.hud.showScreen('end');
  }

  onResize() {
    const w = this.world;
    w.camera.aspect = window.innerWidth / window.innerHeight;
    w.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  frame() {
    const w = this.world;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    w.time += dt;

    if (w.mode === 'play') {
      w.daylight.advance(dt);
      w.player.update(dt);
      w.traffic.update(dt);
      w.peds.update(dt);
      w.police.update(dt);
      w.missions.update(dt);
      w.combat.update(dt);
      w.fx.update(dt);
      w.city.update(dt);
      w.hud.update(w);
      w.minimap.draw(w);
      if (w.input.wasPressed('KeyP')) this.togglePause();
      if (w.input.wasPressed('KeyM')) this.toggleMute();
      w.input.endFrame();
    } else if (w.mode === 'title') {
      // Slow orbit over the city behind the title screen.
      const t = w.time * 0.05;
      w.camera.position.set(Math.sin(t) * 150, 70, Math.cos(t) * 150);
      w.camera.lookAt(0, 10, 0);
      w.city.update(dt);
      w.daylight.advance(dt * 0.2);
      if (w.input.wasPressed('Space') || w.input.wasPressed('Enter')) this.startGame();
      w.input.endFrame();
    } else if (w.mode === 'pause') {
      if (w.input.wasPressed('KeyP')) this.togglePause();
      if (w.input.wasPressed('KeyM')) this.toggleMute();
      w.input.endFrame();
    } else if (w.mode === 'over') {
      if (w.input.wasPressed('Space') || w.input.wasPressed('Enter')) this.restart();
      w.input.endFrame();
    }

    this.renderer.render(w.scene, w.camera);

    // Screenshot presets report ready after a few real frames.
    if (this.params.shot && !window.__shotReady) {
      this.frames = (this.frames || 0) + 1;
      if (this.frames >= 4) window.__shotReady = true;
    }
  }
}

new Game();
