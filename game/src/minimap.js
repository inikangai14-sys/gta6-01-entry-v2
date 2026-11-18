// The minimap: a north-up canvas of Solmar Bay — roads and blocks, the
// beach and the pier, the gold mission marker, the player arrow, police
// dots and traffic dots. It redraws every frame from the live world.

import { WORLD } from './config.js';

const SIZE = 200;
const SCALE = SIZE / (WORLD.half * 2 + 90); // world -265..265 fits the disc

export class Minimap {
  constructor() {
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas.getContext('2d');
  }

  toMap(x, z) {
    return [SIZE / 2 + x * SCALE, SIZE / 2 + z * SCALE];
  }

  draw(world) {
    const g = this.ctx;
    g.clearRect(0, 0, SIZE, SIZE);
    // Sea and sand first.
    g.fillStyle = '#0e2a3a';
    g.fillRect(0, 0, SIZE, SIZE);
    const [, beachY] = this.toMap(0, WORLD.beachZ);
    g.fillStyle = '#e8d8a8';
    g.fillRect(0, beachY, SIZE, SIZE - beachY);
    const [, oceanY] = this.toMap(0, WORLD.oceanZ);
    g.fillStyle = '#2a6a9a';
    g.fillRect(0, oceanY, SIZE, SIZE - oceanY);
    // City blocks.
    g.fillStyle = '#3a3f46';
    g.fillRect(0, 0, SIZE, beachY);
    // Roads.
    g.strokeStyle = '#6a6f76';
    g.lineWidth = Math.max(2, WORLD.roadWidth * SCALE);
    for (const x of world.city.avenues) {
      const [px] = this.toMap(x, 0);
      g.beginPath();
      g.moveTo(px, 0);
      g.lineTo(px, beachY);
      g.stroke();
    }
    for (const z of world.city.streets) {
      const [, py] = this.toMap(0, z);
      g.beginPath();
      g.moveTo(0, py);
      g.lineTo(SIZE, py);
      g.stroke();
    }
    // Pier.
    const [pierX, pierY] = this.toMap(0, WORLD.beachZ + 22);
    g.strokeStyle = '#8a6a42';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(pierX, beachY);
    g.lineTo(pierX, pierY + 24 * SCALE);
    g.stroke();

    // Mission marker: a pulsing gold diamond.
    if (world.missions.beacon.visible) {
      const [mx, my] = this.toMap(world.missions.target.x, world.missions.target.z);
      const pulse = 6 + Math.sin(world.time * 4) * 2;
      g.fillStyle = '#ffd76e';
      g.beginPath();
      g.moveTo(mx, my - pulse);
      g.lineTo(mx + pulse, my);
      g.lineTo(mx, my + pulse);
      g.lineTo(mx - pulse, my);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255, 215, 110, 0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(mx, my, pulse + 6, 0, Math.PI * 2);
      g.stroke();
    }

    // Traffic: white dots. Police: red dots with a blue ring.
    g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const car of world.traffic.cars) {
      if (car.taken) continue;
      const [cx, cy] = this.toMap(car.group.position.x, car.group.position.z);
      g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
    for (const u of world.police.units) {
      const [ux, uy] = this.toMap(u.group.position.x, u.group.position.z);
      g.fillStyle = '#ff3b30';
      g.beginPath();
      g.arc(ux, uy, 3.4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#3b82ff';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(ux, uy, 5.4, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    }

    // Player arrow, pointing the way the player faces.
    const [px, py] = this.toMap(world.player.pos.x, world.player.pos.z);
    g.save();
    g.translate(px, py);
    // The arrow is drawn pointing north (-z); rotate it to the heading.
    // Map north is -z, so a heading of yaw needs a rotation of PI - yaw.
    g.rotate(Math.PI - world.player.yaw);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#111111';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -8);
    g.lineTo(5.5, 6);
    g.lineTo(0, 3);
    g.lineTo(-5.5, 6);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
}
