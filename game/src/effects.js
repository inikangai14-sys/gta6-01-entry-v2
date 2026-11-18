// Juice: particle bursts, a muzzle flash, screen shake and the floating
// "+$300" text that pops when a job pays. Small systems, big feel.

import * as THREE from 'three';

const burstGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);

export class Effects {
  constructor(world) {
    this.world = world;
    this.shake = 0;
    this.particles = [];
    this.flashLight = new THREE.PointLight(0xffe9a8, 0, 18);
    world.scene.add(this.flashLight);
    this.floatEl = null;
  }

  burst(pos, color) {
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(burstGeo, new THREE.MeshLambertMaterial({ color }));
      m.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0));
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 7,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 7,
      );
      this.world.scene.add(m);
      this.particles.push({ mesh: m, vel, life: 0.7 });
    }
  }

  muzzle() {
    const p = this.world.player.pos;
    this.flashLight.position.set(p.x, p.y + 1.8, p.z);
    this.flashLight.intensity = 14;
  }

  floatText(text) {
    const el = document.getElementById('float-text');
    if (!el) return;
    el.textContent = text;
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, -10px)';
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -46px)';
    }, 900);
  }

  update(dt) {
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 90);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.world.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      pt.vel.y -= 14 * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      pt.mesh.rotation.x += dt * 6;
      pt.mesh.rotation.y += dt * 5;
      pt.mesh.material.transparent = true;
      pt.mesh.material.opacity = Math.min(1, pt.life / 0.4);
    }
  }
}
