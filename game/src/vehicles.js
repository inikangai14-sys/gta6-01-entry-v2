// Car factory: every car in Solmar Bay — traffic sedans, taxis, trucks,
// sports cars and police cruisers — is built from the same parts with a
// different body color and trim. Wheels spin, headlights glow at night.

import * as THREE from 'three';

const CAR_COLORS = [0xc22e2e, 0x2e6ac2, 0xe8e8e8, 0x2a2e33, 0xe8a832, 0x3a8a5a, 0x8a3ac2, 0xc27a2e];

const bodyGeo = new THREE.BoxGeometry(2.0, 0.62, 4.4);
const cabinGeo = new THREE.BoxGeometry(1.7, 0.55, 2.2);
const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 12);
const lightGeo = new THREE.BoxGeometry(0.34, 0.18, 0.08);
const spoilerGeo = new THREE.BoxGeometry(1.8, 0.1, 0.5);
const signGeo = new THREE.BoxGeometry(0.9, 0.3, 0.5);
const barGeo = new THREE.BoxGeometry(1.1, 0.22, 0.5);
const glassMat = new THREE.MeshLambertMaterial({ color: 0x18242e });
const tireMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2c8, emissive: 0xffe9a8, emissiveIntensity: 0.7 });
const tailMat = new THREE.MeshLambertMaterial({ color: 0xc22e2e, emissive: 0x881111, emissiveIntensity: 0.8 });

export function makeCar(kind, color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: color ?? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] });

  const body = new THREE.Mesh(bodyGeo, paint);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 1.18, -0.25);
  group.add(cabin);

  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(lightGeo, headMat);
    head.position.set(s * 0.62, 0.66, 2.22);
    group.add(head);
    const tail = new THREE.Mesh(lightGeo, tailMat);
    tail.position.set(s * 0.62, 0.66, -2.22);
    group.add(tail);
  }

  if (kind === 'taxi') {
    group.children[0].material = new THREE.MeshLambertMaterial({ color: 0xf2c230 });
    const sign = new THREE.Mesh(signGeo, new THREE.MeshLambertMaterial({ color: 0x2a2e33, emissive: 0xf2c230, emissiveIntensity: 0.5 }));
    sign.position.set(0, 1.62, -0.25);
    group.add(sign);
  }
  if (kind === 'sport') {
    const spoiler = new THREE.Mesh(spoilerGeo, paint);
    spoiler.position.set(0, 1.05, -2.05);
    group.add(spoiler);
    body.scale.set(1.05, 0.8, 1);
  }
  if (kind === 'truck') {
    body.scale.set(1.15, 1.5, 1.25);
    cabin.scale.set(1.1, 1.3, 1);
    cabin.position.y = 1.5;
  }
  if (kind === 'police') {
    group.children[0].material = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
    const bar = new THREE.Mesh(barGeo, new THREE.MeshLambertMaterial({ color: 0x2244cc, emissive: 0x2244ff, emissiveIntensity: 1.2 }));
    bar.position.set(0, 1.58, -0.25);
    group.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0xff2222, emissiveIntensity: 1.2 }));
    bar2.position.set(-0.55, 1.58, -0.25);
    group.add(bar2);
  }

  return { group, wheels };
}

export function randomCarColor(rng) {
  return CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
}
