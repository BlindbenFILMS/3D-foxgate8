/* AIRPORT TSA . fox adapter: uses the world's kit.makeFox when given, else a placeholder fox with the same joints */
import * as THREE from '../../vendor/three/three.module.js';
import { Builder, basicVC } from './airport-kit.js';
import { makeProp } from './airport-world.js';

const FUR = '#e8742c', WHITE = '#f6efe2', DARK = '#1a1626';

export function makeFoxMaker(kit) {
  return function makeFox(o = {}) {
    let fox;
    if (kit && typeof kit.makeFox === 'function') {
      fox = kit.makeFox({ torso: o.torso || ['#3b7dd8', '#2a2f45', '#ffd23a'], outfit: o.outfit || 'tee', mood: o.mood || 'happy' });
      fox.userData.kit = kit;
    } else fox = placeholderFox(o);
    addExtras(fox, o);
    fox.userData.look = o;
    return fox;
  };
}

function placeholderFox(o) {
  const fur = o.fur || FUR, t = o.torso || ['#3b7dd8', '#2a2f45', '#ffd23a'];
  const shirt = t[0], pants = t[1], acc = t[2];
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 1.0; root.add(hips);

  const b = new Builder();
  b.cap(0, 0.52, 0, 0.44, 0.42, shirt);
  b.add(new THREE.CylinderGeometry(0.455, 0.455, 0.14, 14), DARK, { y: 0.1, ink: false });
  if (o.outfit === 'coat') b.add(new THREE.CylinderGeometry(0.47, 0.6, 0.7, 14), shirt, { y: 0.05 });
  if (o.outfit === 'dress') b.add(new THREE.CylinderGeometry(0.45, 0.78, 0.85, 14), shirt, { y: -0.05 });
  if (o.outfit === 'vest') { b.add(new THREE.CylinderGeometry(0.47, 0.47, 0.09, 14), acc, { y: 0.55, ink: false }); b.add(new THREE.CylinderGeometry(0.465, 0.465, 0.09, 14), acc, { y: 0.8, ink: false }); }
  b.sph(0, 0.96, 0.2, 0.24, WHITE, { ink: false });
  if (o.badge) { b.box(0.2, 0.66, 0.39, 0.17, 0.2, 0.06, '#ffd23a', { ink: false }); b.box(-0.22, 0.74, 0.39, 0.18, 0.1, 0.05, '#ffffff', { ink: false }); }
  const tn = [0, 0.24, -0.97], tl = Math.hypot(...tn), nx = tn[1] / tl, nz = tn[2] / tl, th = Math.atan2(nz, nx);
  b.add(new THREE.CapsuleGeometry(0.24, 0.5, 4, 10), fur, { y: 0.15 + nx * 0.45, z: -0.36 + nz * 0.45, rx: th });
  b.sph(0, 0.15 + nx * 0.92, -0.36 + nz * 0.92, 0.22, WHITE);
  hips.add(b.build());

  const neck = new THREE.Group(); neck.position.y = 1.05; hips.add(neck);
  const h = new Builder();
  h.sph(0, 0.32, 0, 0.44, fur, { seg: 16, seg2: 12 });
  h.sph(0, 0.2, 0.26, 0.27, WHITE, { ink: false });
  h.add(new THREE.ConeGeometry(0.2, 0.44, 12), fur, { y: 0.24, z: 0.5, rx: Math.PI / 2 });
  h.sph(0, 0.25, 0.73, 0.075, DARK, { ink: false });
  const eye = o.eyes || DARK;
  h.sph(-0.17, 0.4, 0.37, 0.065, eye, { ink: false }); h.sph(0.17, 0.4, 0.37, 0.065, eye, { ink: false });
  for (const s of [-1, 1]) {
    h.add(new THREE.ConeGeometry(0.15, 0.38, 8), fur, { x: s * 0.25, y: 0.78, z: -0.02, rz: -s * 0.28 });
    h.add(new THREE.ConeGeometry(0.08, 0.22, 6), '#3a2222', { x: s * 0.25, y: 0.76, z: 0.07, rz: -s * 0.28, ink: false });
    h.sph(s * 0.34, 0.16, 0.12, 0.14, WHITE, { ink: false });
  }
  if (o.shades) { h.box(0, 0.33, 0.39, 0.64, 0.15, 0.08, DARK, { ink: false }); }
  if (o.cap) { h.cyl(0, 0.6, 0, 0.4, 0.43, 0.2, o.cap); h.box(0, 0.6, 0.38, 0.5, 0.05, 0.34, o.cap); h.box(0, 0.68, 0.41, 0.3, 0.08, 0.04, '#ffd23a', { ink: false }); }
  neck.add(h.build());

  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(s * 0.2, 0, 0); hips.add(lg);
    const lb = new Builder(); lb.cap(0, -0.45, 0, 0.17, 0.55, pants, { ink: false }); lb.box(0, -1.0, 0.08, 0.3, 0.16, 0.44, DARK, { ink: false });
    lg.add(lb.build({ ink: false })); legs.push(lg);
    const ag = new THREE.Group(); ag.position.set(s * 0.54, 0.86, 0); ag.rotation.z = s * 0.1; hips.add(ag);
    const ab = new Builder(); ab.cap(0, -0.34, 0, 0.14, 0.45, shirt, { ink: false }); ab.sph(0, -0.72, 0, 0.15, fur, { ink: false });
    ag.add(ab.build({ ink: false })); arms.push(ag);
  }
  root.userData.P = { body: hips, head: neck, arms, legs };
  root.userData.own = true;
  return root;
}

function addExtras(fox, o) {
  const P = fox.userData.P; if (!P) return;
  if (o.cane) {
    const cb = new Builder();
    cb.cyl(0, -1.15, 0, 0.035, 0.035, 1.25, '#ffffff', { ink: false });
    cb.cyl(0, -1.15, 0, 0.04, 0.04, 0.22, '#ec3013', { ink: false });
    const cane = cb.build({ ink: false }); cane.position.set(0, -0.62, 0.05); cane.rotation.x = 0.35;
    P.arms[1].add(cane);
  }
  if (o.chair) {
    const ch = makeProp('chair'); fox.add(ch); fox.userData.chair = ch;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 6, 28), new THREE.MeshBasicMaterial({ color: '#ff2d55' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.32; ch.add(ring);
    fox.userData.sit = true; fox.userData.sitY = 1.25; fox.userData.hover = true;
  }
  if (fox.userData.kit && o.shades) {
    const sb = new Builder(); sb.box(0, 0.33, 0.39, 0.64, 0.15, 0.08, DARK, { ink: false }); P.head.add(sb.build({ ink: false }));
  }
}

export function animFox(fox, dt, speed) {
  const u = fox.userData, P = u.P; if (!P) return;
  u.ph = (u.ph || 0) + dt * (speed > 0.05 ? 2.2 + speed * 1.1 : 2.0);
  if (u.hover && u.chair) { u.chair.position.y = 0.08 + Math.sin(u.ph * 1.3) * 0.06; }
  if (u.kit && !u.sit) { try { u.kit.animFox(fox, dt, speed); } catch (e) { /* kit missing anim */ } pose(u, P); return; }
  if (u.sit) {
    P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45;
    P.body.position.y = (u.sitY ?? 1.12) + (u.hover && u.chair ? u.chair.position.y : 0);
    P.body.rotation.set(0, 0, 0);
    P.arms[0].rotation.x = P.arms[1].rotation.x = -0.4;
    P.head.rotation.set(Math.sin(u.ph * 0.5) * 0.04, 0, 0);
    pose(u, P); return;
  }
  const k = Math.min(1, speed / 4.5), sw = Math.sin(u.ph);
  P.legs[0].rotation.x = sw * 0.75 * k; P.legs[1].rotation.x = -sw * 0.75 * k;
  P.arms[0].rotation.x = -sw * 0.6 * k; P.arms[1].rotation.x = sw * 0.6 * k;
  P.body.position.y = 1.0 + Math.abs(Math.cos(u.ph)) * 0.07 * k + (1 - k) * Math.sin(u.ph * 0.8) * 0.015;
  P.body.rotation.set(0, 0, sw * 0.04 * k);
  P.head.rotation.set(0, 0, 0);
  pose(u, P);
}

function pose(u, P) {
  const t = u.ph || 0;
  switch (u.pose) {
    case 'type': P.arms[0].rotation.x = -1.05 + Math.sin(t * 6) * 0.08; P.arms[1].rotation.x = -1.05 + Math.cos(t * 6) * 0.08; break;
    case 'tug': P.arms[1].rotation.x = -1.35 + Math.sin(t * 5) * 0.15; P.arms[0].rotation.x = -1.1 + Math.sin(t * 5 + 1) * 0.15; P.body.rotation.x = -0.08 + Math.sin(t * 5) * 0.05; break;
    case 'swipe': P.arms[1].rotation.x = -1.25; break;
    case 'read': P.arms[0].rotation.x = P.arms[1].rotation.x = -1.0; P.head.rotation.x = 0.3; break;
    case 'sleep': P.head.rotation.x = 0.45; break;
    case 'point': P.arms[1].rotation.x = -1.55; break;
    case 'hand': P.arms[1].rotation.x = -1.3; break;
    case 'look': P.head.rotation.y = Math.sin(t * 0.7) * 0.6; break;
    case 'carry': P.arms[1].rotation.x *= 0.25; break;
    case 'cheer': P.arms[0].rotation.x = P.arms[1].rotation.x = -2.8 + Math.sin(t * 8) * 0.2; break;
  }
}

export { basicVC };
