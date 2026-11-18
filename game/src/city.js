// Solmar Bay itself: a procedural low-poly coastal city. One seeded stream
// decides the towers, the rooftop props, the palms and the billboards, so
// ?seed=7 always builds the same city. The module also owns collision
// (building boxes) and the road grid the traffic and pedestrians drive on.

import * as THREE from 'three';
import { WORLD, LANDMARKS } from './config.js';
import { range, rangeInt, pick } from './rng.js';

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A facade of lit and dark windows. Stretched over a tower it still reads
// as a lit building at dusk, when the emissive map makes windows glow.
function windowTexture(rng, variant) {
  const cols = variant === 0 ? 7 : variant === 1 ? 5 : 9;
  const rows = variant === 0 ? 14 : variant === 1 ? 9 : 18;
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = variant === 0 ? '#3a4a5a' : variant === 1 ? '#5a4a3a' : '#2e3a4a';
    g.fillRect(0, 0, w, h);
    const cw = w / cols;
    const ch = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = rng() < 0.42;
        g.fillStyle = lit ? (rng() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#1a2230';
        g.fillRect(x * cw + cw * 0.22, y * ch + ch * 0.25, cw * 0.56, ch * 0.5);
      }
    }
  });
}

function signTexture(text, color) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#101018';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = color;
    g.font = 'bold 34px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 14;
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

function billboardTexture(lines, bg, fg) {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 30px Arial, sans-serif';
    lines.forEach((line, i) => {
      g.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 36);
    });
  });
}

function roadTexture() {
  return canvasTexture(64, 128, (g, w, h) => {
    g.fillStyle = '#3d4149';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c832';
    g.fillRect(w / 2 - 2, 8, 4, 40);
    g.fillRect(w / 2 - 2, 72, 4, 40);
    g.fillStyle = '#3a3e46';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  });
}

// Same asphalt, dashes running along X for the east-west streets.
function roadTextureStreet() {
  return canvasTexture(128, 64, (g, w, h) => {
    g.fillStyle = '#3d4149';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c832';
    g.fillRect(8, h / 2 - 2, 40, 4);
    g.fillRect(72, h / 2 - 2, 40, 4);
    g.fillStyle = '#3a3e46';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  });
}

const SIGNS = [
  ['SOLMAR HOTEL', '#ff6ec7'],
  ['NEON PALMS', '#39d0ff'],
  ['PIER BAR', '#ffd76e'],
  ['TACOS 24H', '#7dff9a'],
  ['MARINA MOTEL', '#ff9a6e'],
  ['BAY COLA', '#ff5a5a'],
  ['CLUB NOVA', '#c07dff'],
  ['FRESH CATCH', '#6effe0'],
];

const BILLBOARDS = [
  [['SOLMAR COLA'], ['TASTE THE BAY'], '#b3122e', '#ffffff'],
  [['BAY FM 98.7'], ['ALL HITS, ALL NIGHT'], '#123a6e', '#ffd76e'],
  [['NEON PALMS'], ['DANCE ALL NIGHT'], '#2a0a4a', '#39d0ff'],
  [['PIER 9'], ['FRESH CATCH DAILY'], '#0a4a5a', '#ffffff'],
  [['VISIT SOLMAR BAY'], ['SUN • SAND • SPEED'], '#0a6e3a', '#ffffff'],
  [['MARINA MOTEL'], ['VACANCY — $49'], '#4a2a0a', '#ffd76e'],
];

export function buildCity(world) {
  const rng = world.rng;
  const group = new THREE.Group();
  const colliders = [];
  const lampMats = [];
  const H = WORLD.half;

  // --- ground, roads, sidewalks -----------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(H * 2 + 160, H * 2 + 320),
    new THREE.MeshLambertMaterial({ color: 0x9a9f88 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 60);
  group.add(ground);

  const avenues = [];
  const streets = [];
  for (let i = -5; i <= 5; i++) {
    avenues.push(i * WORLD.roadGap);
    streets.push(i * WORLD.roadGap);
  }

  const roadTex = roadTexture();
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  for (const x of avenues) {
    const tex = roadTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 11);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.roadWidth, H * 2),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    group.add(road);
  }
  const streetTex = roadTextureStreet();
  streetTex.wrapS = THREE.RepeatWrapping;
  streetTex.wrapT = THREE.RepeatWrapping;
  for (const z of streets) {
    // PlaneGeometry(H*2, roadWidth) with rotation.x = -PI/2 already lies
    // east-west; no extra rotation (an added rotation.z would tip the
    // strip north-south and leave the street unpaved).
    const tex = streetTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(11, 1);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(H * 2, WORLD.roadWidth),
      new THREE.MeshLambertMaterial({ map: tex }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, z);
    group.add(road);
  }

  // --- buildings ----------------------------------------------------------
  const facadeTex = [windowTexture(rng, 0), windowTexture(rng, 1), windowTexture(rng, 2)];
  const facadeMats = facadeTex.map((tex) => {
    const m = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 });
    return m;
  });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const propMat = new THREE.MeshLambertMaterial({ color: 0x6a6f76 });
  const towerMat = new THREE.MeshLambertMaterial({ color: 0x8a7a5a });
  const acGeo = new THREE.BoxGeometry(2.2, 1.1, 2.2);
  const antennaGeo = new THREE.CylinderGeometry(0.12, 0.2, 7, 6);
  const tankGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.6, 10);
  const tankRoofGeo = new THREE.ConeGeometry(1.8, 1.4, 10);

  const signMats = SIGNS.map(([text, color]) => new THREE.MeshBasicMaterial({ map: signTexture(text, color) }));

  function addBuilding(cx, cz, w, d, h, downtown) {
    const mat = facadeMats[Math.floor(rng() * facadeMats.length)];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat, mat, roofMat, roofMat, mat, mat]);
    mesh.position.set(cx, h / 2, cz);
    group.add(mesh);
    colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
    // Rooftop props: AC units, antennas, water towers.
    const roll = rng();
    if (roll < 0.35) {
      const ac = new THREE.Mesh(acGeo, propMat);
      ac.position.set(cx + range(rng, -w / 4, w / 4), h + 0.55, cz + range(rng, -d / 4, d / 4));
      group.add(ac);
    } else if (roll < 0.6) {
      const ant = new THREE.Mesh(antennaGeo, propMat);
      ant.position.set(cx, h + 3.5, cz);
      group.add(ant);
    } else if (roll < 0.75 && h > 18) {
      const tank = new THREE.Mesh(tankGeo, towerMat);
      tank.position.set(cx + w / 4, h + 1.3, cz - d / 4);
      group.add(tank);
      const roof = new THREE.Mesh(tankRoofGeo, roofMat);
      roof.position.set(cx + w / 4, h + 3.3, cz - d / 4);
      group.add(roof);
    }
    // A neon sign on some downtown towers.
    if (downtown && rng() < 0.3) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 3),
        signMats[Math.floor(rng() * signMats.length)],
      );
      sign.position.set(cx, h * 0.82, cz + d / 2 + 0.15);
      group.add(sign);
    }
    return mesh;
  }

  for (let bx = -5; bx <= 4; bx++) {
    for (let bz = -5; bz <= 4; bz++) {
      const cx = bx * WORLD.roadGap + WORLD.roadGap / 2;
      const cz = bz * WORLD.roadGap + WORLD.roadGap / 2;
      const downtown = Math.hypot(cx, cz) < 90;
      const roll = rng();
      if (roll < 0.42) {
        // One tower filling the block.
        const h = downtown ? range(rng, 26, 68) : range(rng, 10, 26);
        addBuilding(cx, cz, 26, 26, h, downtown);
      } else if (roll < 0.78) {
        // Two mid buildings.
        const h1 = downtown ? range(rng, 16, 44) : range(rng, 8, 18);
        const h2 = downtown ? range(rng, 14, 36) : range(rng, 7, 16);
        addBuilding(cx - 7, cz, 12, 26, h1, downtown);
        addBuilding(cx + 7, cz, 12, 26, h2, downtown);
      } else {
        // Four small shops with flat roofs.
        for (const [ox, oz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
          addBuilding(cx + ox, cz + oz, 11, 11, range(rng, 5, 11), false);
        }
      }
    }
  }

  // --- street props -------------------------------------------------------
  const lampPoleGeo = new THREE.CylinderGeometry(0.14, 0.2, 7, 6);
  const lampHeadGeo = new THREE.SphereGeometry(0.55, 10, 8);
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x2a2e33 });
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffd76e, emissiveIntensity: 0.25 });
  lampMats.push(lampHeadMat);
  for (let i = 0; i < 64; i++) {
    const x = avenues[Math.floor(rng() * avenues.length)] + pick(rng, [-7, 7]);
    const z = streets[Math.floor(rng() * streets.length)] + pick(rng, [-7, 7]);
    const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
    pole.position.set(x, 3.5, z);
    group.add(pole);
    const head = new THREE.Mesh(lampHeadGeo, lampHeadMat);
    head.position.set(x, 7.1, z);
    group.add(head);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 5, 7);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const crownGeo = new THREE.ConeGeometry(2.6, 3.2, 8);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2e7a3a });
  function addPalm(x, z) {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 2.5, z);
    trunk.rotation.z = range(rng, -0.08, 0.08);
    group.add(trunk);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(x, 6.2, z);
    group.add(crown);
  }
  for (let x = -200; x <= 200; x += 16) addPalm(x + range(rng, -3, 3), WORLD.beachZ - 6);
  for (let i = 0; i < 26; i++) {
    addPalm(range(rng, -200, 200), range(rng, -200, 200));
  }

  const benchMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2a });
  const benchGeo = new THREE.BoxGeometry(2.6, 0.5, 0.8);
  const hydrantMat = new THREE.MeshLambertMaterial({ color: 0xc22e2e });
  const hydrantGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.1, 8);
  for (let i = 0; i < 14; i++) {
    const x = avenues[Math.floor(rng() * avenues.length)] + pick(rng, [-8, 8]);
    const z = streets[Math.floor(rng() * streets.length)] + pick(rng, [-8, 8]);
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(x, 0.6, z);
    group.add(bench);
  }
  for (let i = 0; i < 14; i++) {
    const x = avenues[Math.floor(rng() * avenues.length)] + pick(rng, [-8, 8]);
    const z = streets[Math.floor(rng() * streets.length)] + pick(rng, [-8, 8]);
    const hyd = new THREE.Mesh(hydrantGeo, hydrantMat);
    hyd.position.set(x, 0.55, z);
    group.add(hyd);
  }

  // Billboards along the main avenues.
  const postGeo = new THREE.BoxGeometry(0.5, 9, 0.5);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  BILLBOARDS.forEach(([lines, bg, fg], i) => {
    const x = pick(rng, [-120, -40, 40, 120]);
    const z = pick(rng, [-160, -80, 0, 80, 160]);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(14, 7, 0.6),
      new THREE.MeshLambertMaterial({ map: billboardTexture(lines, bg, fg) }),
    );
    board.position.set(x, 11, z);
    board.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
    group.add(board);
    const p1 = new THREE.Mesh(postGeo, postMat);
    p1.position.set(x - 5, 4.5, z);
    group.add(p1);
    const p2 = new THREE.Mesh(postGeo, postMat);
    p2.position.set(x + 5, 4.5, z);
    group.add(p2);
    colliders.push({ minX: x - 7, maxX: x + 7, minZ: z - 1, maxZ: z + 1 });
  });

  // --- beach, ocean, pier, ferris wheel, marina ---------------------------
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(H * 2 + 160, 30),
    new THREE.MeshLambertMaterial({ color: 0xe8d8a8 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, WORLD.beachZ + 15);
  group.add(sand);

  const waterMat = new THREE.MeshLambertMaterial({ color: 0x2a6a9a, transparent: true, opacity: 0.94 });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(H * 2 + 160, 180), waterMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.01, WORLD.oceanZ + 90);
  group.add(ocean);
  const harbor = new THREE.Mesh(new THREE.PlaneGeometry(60, 90), waterMat);
  harbor.rotation.x = -Math.PI / 2;
  harbor.position.set(232, 0.01, 160);
  group.add(harbor);

  // Pier: wooden deck out into the ocean with a shack at the end.
  const deckMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 46), deckMat);
  deck.position.set(0, 0.8, WORLD.beachZ + 22);
  group.add(deck);
  const postGeo2 = new THREE.CylinderGeometry(0.3, 0.3, 2.4, 6);
  for (let z = WORLD.beachZ + 4; z <= WORLD.beachZ + 42; z += 8) {
    for (const dx of [-2.6, 2.6]) {
      const post = new THREE.Mesh(postGeo2, deckMat);
      post.position.set(dx, 0.4, z);
      group.add(post);
    }
  }
  const shack = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 6), new THREE.MeshLambertMaterial({ color: 0x5a7a8a }));
  shack.position.set(0, 2.8, WORLD.beachZ + 42);
  group.add(shack);
  colliders.push({ minX: -3.5, maxX: 3.5, minZ: WORLD.beachZ + 39, maxZ: WORLD.beachZ + 45 });

  // Ferris wheel on the beach, slowly turning.
  const ferris = new THREE.Group();
  ferris.position.set(LANDMARKS.ferris.x, 0, LANDMARKS.ferris.z);
  const legMat = new THREE.MeshLambertMaterial({ color: 0xc22e5a });
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 26, 1.2), legMat);
    leg.position.set(s * 7, 13, 0);
    leg.rotation.z = -s * 0.28;
    ferris.add(leg);
  }
  const wheel = new THREE.Group();
  wheel.position.set(0, 24, 0);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.7, 8, 28), legMat);
  wheel.add(rim);
  const spokeGeo = new THREE.BoxGeometry(0.5, 26, 0.5);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(spokeGeo, legMat);
    spoke.rotation.z = (i * Math.PI) / 4;
    wheel.add(spoke);
  }
  const cabinGeo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0xffd76e });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(Math.cos(a) * 13, Math.sin(a) * 13, 0);
    wheel.add(cabin);
  }
  ferris.add(wheel);
  group.add(ferris);
  colliders.push({ minX: LANDMARKS.ferris.x - 8, maxX: LANDMARKS.ferris.x + 8, minZ: LANDMARKS.ferris.z - 2, maxZ: LANDMARKS.ferris.z + 2 });

  // Boats in the ocean and the harbor.
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  const hullMat2 = new THREE.MeshLambertMaterial({ color: 0x3a6a8a });
  function addBoat(x, z, mat) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 8), mat);
    hull.position.y = 0.4;
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 3), new THREE.MeshLambertMaterial({ color: 0x2a2e33 }));
    cabin.position.set(0, 1.6, -0.5);
    boat.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), propMat);
    mast.position.set(0, 3.4, 1);
    boat.add(mast);
    boat.position.set(x, 0, z);
    boat.rotation.y = range(rng, 0, Math.PI * 2);
    group.add(boat);
  }
  addBoat(-30, 268, hullMat);
  addBoat(40, 282, hullMat2);
  addBoat(90, 262, hullMat);
  addBoat(225, 140, hullMat2);
  addBoat(240, 178, hullMat);

  return {
    group,
    colliders,
    lampMats,
    avenues,
    streets,
    update(dt) {
      wheel.rotation.z += dt * 0.12;
    },
  };
}

// Push a circle (x, z, radius) out of every building box it overlaps.
// Returns true when a push happened.
export function collideCircle(pos, radius, colliders) {
  let hit = false;
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
    }
  }
  return hit;
}

// True when (x, z) is on a road strip (used by traffic to stay on roads).
export function onRoad(x, z) {
  const near = (v, gap) => {
    const m = ((v % gap) + gap) % gap;
    return m < 7 || m > gap - 7;
  };
  return near(x + 200, WORLD.roadGap) || near(z + 200, WORLD.roadGap);
}
