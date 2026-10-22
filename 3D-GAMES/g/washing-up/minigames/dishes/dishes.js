/* WASHING UP: 8 GATES 3D minigame. Scrub dishes clean at the sink, race the clock and up to 3 rival foxes.
   Standalone: makes its own renderer. World mode: opts.world = { renderer, camera, parent }. */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './dishes-rules.js';
import { createAudio } from './dishes-audio.js';

export const GAME = { key: 'dishSink', name: 'WASHING UP', maxPlayers: 4 };

const INK = 0x1a1626;
const DEG = Math.PI / 180;
const SLOTS = [0, 5.6, -5.6, 11.2];
const DY = 1.26;             /* dish base height in the tub */
const FOX_Z = -1.65;
const PITCH = 54 * DEG;
const UP = new THREE.Vector3(0, 1, 0);

/* ---------- materials ---------- */
let GRAD = null;
function gradMap() {
  if (!GRAD) {
    GRAD = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    GRAD.minFilter = THREE.NearestFilter; GRAD.magFilter = THREE.NearestFilter;
    GRAD.generateMipmaps = false; GRAD.needsUpdate = true;
  }
  return GRAD;
}
const MATS = new Map();
function toon(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!MATS.has(key)) MATS.set(key, new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradMap() }, extra || {})));
  return MATS.get(key);
}
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

/* ---------- geometry helpers ---------- */
function xf(g, o = {}) {
  if (o.sx || o.sy || o.sz) g.scale(o.sx || 1, o.sy || 1, o.sz || 1);
  if (o.rx) g.rotateX(o.rx);
  if (o.ry) g.rotateY(o.ry);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(o.x || 0, o.y || 0, o.z || 0);
  return g;
}
const box = (w, h, d, o) => xf(new THREE.BoxGeometry(w, h, d), o);
const cyl = (rt, rb, h, o, seg = 14) => xf(new THREE.CylinderGeometry(rt, rb, h, seg), o);
const sph = (r, o, ws = 12, hs = 9) => xf(new THREE.SphereGeometry(r, ws, hs), o);
const cone = (r, h, o, seg = 10) => xf(new THREE.ConeGeometry(r, h, seg), o);
const cap = (r, l, o) => xf(new THREE.CapsuleGeometry(r, l, 4, 10), o);
const tor = (R0, t, o, seg = 24) => xf(new THREE.TorusGeometry(R0, t, 6, seg), o);

function strip(g) {
  const n = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', n.attributes.position);
  out.setAttribute('normal', n.attributes.normal);
  return out;
}
function merge(list) {
  const parts = list.map(strip);
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}
/* outline shell: the part scaled about its own centre by a fixed thickness */
function inkify(g, w = 0.03) {
  const c = g.clone();
  c.computeBoundingBox();
  const b = c.boundingBox, ctr = new THREE.Vector3(), s = new THREE.Vector3();
  b.getCenter(ctr); b.getSize(s);
  c.translate(-ctr.x, -ctr.y, -ctr.z);
  c.scale((s.x + 2 * w) / Math.max(s.x, 1e-3), (s.y + 2 * w) / Math.max(s.y, 1e-3), (s.z + 2 * w) / Math.max(s.z, 1e-3));
  c.translate(ctr.x, ctr.y, ctr.z);
  return c;
}
/* merges parts per colour into few draw calls, plus one ink mesh */
function builder() {
  const by = new Map(); const inks = [];
  return {
    add(g, color, ink = true, w) { if (!by.has(color)) by.set(color, []); by.get(color).push(g); if (ink) inks.push(inkify(g, w)); return g; },
    build(parent) {
      const made = [];
      for (const [c, list] of by) { const m = new THREE.Mesh(merge(list), toon(c)); parent.add(m); made.push(m); }
      if (inks.length) { const m = new THREE.Mesh(merge(inks), inkMat); m.raycast = () => {}; parent.add(m); made.push(m); }
      return made;
    }
  };
}

/* ---------- dishes ---------- */
const PROFILES = {
  plate:   { pts: [[0, 0], [0.5, 0], [0.55, 0.02], [0.82, 0.1], [0.86, 0.13], [0.82, 0.14], [0.54, 0.065], [0, 0.06]], top: [[0, 0.06], [0.54, 0.065], [0.82, 0.14]], color: '#fbfaf6' },
  bowl:    { pts: [[0, 0], [0.3, 0], [0.34, 0.04], [0.62, 0.3], [0.72, 0.42], [0.68, 0.43], [0.58, 0.32], [0.28, 0.085], [0, 0.08]], top: [[0, 0.08], [0.28, 0.085], [0.58, 0.32], [0.68, 0.43]], color: '#f6efe0' },
  mug:     { pts: [[0, 0], [0.4, 0], [0.43, 0.03], [0.45, 0.48], [0.39, 0.48], [0.37, 0.1], [0, 0.09]], top: [[0, 0.09], [0.37, 0.1]], color: '#3fb6a8' },
  pan:     { pts: [[0, 0], [0.66, 0], [0.74, 0.03], [0.82, 0.18], [0.78, 0.19], [0.72, 0.06], [0, 0.05]], top: [[0, 0.05], [0.72, 0.06], [0.78, 0.19]], color: '#3b3f4a' },
  crystal: { pts: [[0, 0], [0.5, 0], [0.55, 0.02], [0.82, 0.1], [0.86, 0.13], [0.82, 0.14], [0.54, 0.065], [0, 0.06]], top: [[0, 0.06], [0.54, 0.065], [0.82, 0.14]], color: '#bfe7ff' }
};
function topY(type, r) {
  const t = PROFILES[type].top;
  if (r <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (r <= t[i][0]) { const a = t[i - 1], b = t[i]; return a[1] + (b[1] - a[1]) * (r - a[0]) / (b[0] - a[0]); }
  }
  return t[t.length - 1][1];
}
function lathe(pts, seg) {
  let p = pts.map(q => new THREE.Vector2(Math.max(q[0], 0.0005), q[1]));
  let g = new THREE.LatheGeometry(p, seg);
  /* make sure normals face out (vertex of the widest point at phi=0 sits on +z) */
  let wi = 0; p.forEach((v, i) => { if (v.x > p[wi].x) wi = i; });
  if (g.attributes.normal.getZ(wi) < 0) { g.dispose(); p = p.slice().reverse(); g = new THREE.LatheGeometry(p, seg); }
  return g;
}
const DISH_GEO = {};
function dishGeo(type, lowPoly) {
  if (DISH_GEO[type]) return DISH_GEO[type];
  const P = PROFILES[type];
  const seg = lowPoly ? 20 : 30;
  const body = lathe(P.pts, seg);
  const maxR = Math.max(...P.pts.map(q => q[0]));
  const ink = body.clone(); ink.scale((maxR + 0.035) / maxR, 1, (maxR + 0.035) / maxR); ink.translate(0, -0.014, 0);
  const extras = [];
  if (type === 'plate') extras.push([tor(0.7, 0.018, { rx: Math.PI / 2, y: topY('plate', 0.7) + 0.006 }, 32), '#3a6fd8']);
  if (type === 'bowl') extras.push([tor(0.6, 0.026, { rx: Math.PI / 2, y: 0.3 }, 28), '#ec3013']);
  if (type === 'mug') extras.push([tor(0.15, 0.045, { x: 0.52, y: 0.26 }, 14), '#3fb6a8']);
  if (type === 'pan') extras.push([box(0.8, 0.08, 0.15, { x: 1.18, y: 0.14 }), '#7a4a2a']);
  if (type === 'crystal') extras.push([tor(0.84, 0.02, { rx: Math.PI / 2, y: 0.135 }, 32), '#5fb4e8']);
  const crack = [];
  if (type === 'crystal') {
    for (let k = 0; k < 3; k++) {
      const parts = [];
      for (let j = 0; j < 3; j++) {
        const a = k * 2.1 + j * 0.5;
        parts.push(box(0.32, 0.012, 0.02, { ry: a + j * 0.7, x: Math.cos(a) * (0.12 + j * 0.2), z: Math.sin(a) * (0.12 + j * 0.2), y: 0.075 }));
      }
      crack.push(merge(parts));
    }
  }
  DISH_GEO[type] = { body, ink, extras, crack };
  return DISH_GEO[type];
}

/* grime blobs: three shapes in the xz plane, radius ~1 */
let BLOBS = null;
function blobGeos() {
  if (BLOBS) return BLOBS;
  const shapes = [[[0, 0, 1], [0.8, 0.3, 0.45], [-0.5, -0.7, 0.4]], [[0, 0, 0.9], [-0.8, 0.4, 0.5], [0.6, -0.6, 0.35], [0.2, 0.9, 0.3]], [[0, 0, 1], [0.95, -0.1, 0.3]]];
  BLOBS = shapes.map(list => merge(list.map(([x, z, r]) => xf(new THREE.CircleGeometry(r, 14), { rx: -Math.PI / 2, x, z }))));
  return BLOBS;
}
const FOOD = ['#d9481e', '#f2a81d', '#8a5230', '#6bb33a'];
function spotMat(s) {
  if (s.kind === 'grease') return toon('#c8bd2c');
  if (s.kind === 'burnt') return toon('#2a1c14');
  return toon(FOOD[s.tint % 4]);
}

/* ---------- foxes ---------- */
function placeholderFox({ torso = ['#ec3013', '#ffd23a', '#2b2b2b'], outfit = 'tee', fur = '#ef7a2a', legs = null, eyes = '#1a1626' } = {}) {
  const fox = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1.45; fox.add(body);
  let b = builder();
  b.add(cap(0.42, 0.6, {}), torso[0]);
  b.add(sph(0.3, { z: 0.22, y: 0.05, sx: 1, sy: 1.2, sz: 0.5 }), '#fff4e6', false);
  if (outfit === 'coat') b.add(cyl(0.47, 0.55, 0.55, { y: -0.35 }), torso[1]);
  else if (outfit === 'dress') b.add(cone(0.62, 0.8, { y: -0.4 }), torso[1]);
  else b.add(cyl(0.44, 0.44, 0.12, { y: 0.15 }), torso[1], false);
  b.build(body);
  const tail = new THREE.Group(); tail.position.set(0, -0.35, -0.38); body.add(tail);
  b = builder();
  b.add(cap(0.17, 0.6, { rx: -0.9, y: 0.1, z: -0.25 }), fur);
  b.add(sph(0.16, { y: 0.38, z: -0.6 }), '#fff4e6', false);
  b.build(tail);

  const head = new THREE.Group(); head.position.y = 2.3; fox.add(head);
  b = builder();
  b.add(sph(0.42, { sy: 0.92 }), fur);
  b.add(cone(0.2, 0.42, { rx: Math.PI / 2, z: 0.48, y: -0.08 }), fur);
  b.add(sph(0.2, { x: 0.18, y: -0.12, z: 0.25, sz: 0.7 }), '#fff4e6', false);
  b.add(sph(0.2, { x: -0.18, y: -0.12, z: 0.25, sz: 0.7 }), '#fff4e6', false);
  b.add(cone(0.15, 0.36, { x: 0.24, y: 0.4, rz: -0.3 }), fur);
  b.add(cone(0.15, 0.36, { x: -0.24, y: 0.4, rz: 0.3 }), fur);
  b.add(cone(0.08, 0.2, { x: 0.25, y: 0.39, z: 0.05, rz: -0.3 }), '#2b1a14', false);
  b.add(cone(0.08, 0.2, { x: -0.25, y: 0.39, z: 0.05, rz: 0.3 }), '#2b1a14', false);
  b.add(sph(0.065, { y: -0.06, z: 0.7 }), '#1a1626', false);
  b.build(head);
  const eyeM = eyes === '#1a1626' ? toon(eyes) : new THREE.MeshBasicMaterial({ color: eyes });
  for (const x of [-0.15, 0.15]) { const e = new THREE.Mesh(sph(0.055, { sy: 1.3 }, 8, 6), eyeM); e.position.set(x, 0.06, 0.37); head.add(e); }

  const arms = [], lg = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(0.48 * s, 1.85, 0); fox.add(a); arms.push(a);
    b = builder(); b.add(cap(0.11, 0.5, { y: -0.35 }), torso[0]); b.add(sph(0.13, { y: -0.72 }), '#fff4e6'); b.build(a);
    const l = new THREE.Group(); l.position.set(0.2 * s, 0.95, 0); fox.add(l); lg.push(l);
    b = builder(); b.add(cap(0.14, 0.5, { y: -0.4 }), legs || torso[2]); b.add(sph(0.16, { y: -0.82, z: 0.08, sz: 1.4, sy: 0.7 }), '#2b1a14'); b.build(l);
  }
  fox.userData.P = { body, head, arms, legs: lg };
  fox.userData.placeholder = true;
  return fox;
}

/* the adapter: the world's fox maker when we have it, our own otherwise */
function makeFoxWith(kit, o) {
  if (kit && kit.makeFox) {
    try { const f = kit.makeFox({ torso: o.torso, outfit: o.outfit, mood: o.mood || 'happy' }); if (f && f.userData && f.userData.P) return f; } catch (e) { /* fall back */ }
  }
  return placeholderFox(o);
}

function dressFox(fox, spec, root) {
  const P = fox.userData.P;
  if (spec.glasses) {
    const b = builder();
    b.add(box(0.2, 0.12, 0.04, { x: -0.15, y: 0.07 }), '#111111', false);
    b.add(box(0.2, 0.12, 0.04, { x: 0.15, y: 0.07 }), '#111111', false);
    b.add(box(0.12, 0.03, 0.03, { y: 0.1 }), '#111111', false);
    const g = new THREE.Group(); g.position.z = 0.41; b.build(g); P.head.add(g);
  }
  if (spec.cane) {
    const b = builder();
    b.add(cyl(0.035, 0.035, 1.5, { y: 0.75 }), '#ffffff');
    b.add(cyl(0.04, 0.04, 0.22, { y: 0.2 }), '#ec3013', false);
    b.add(tor(0.09, 0.035, { x: 0.09, y: 1.5 }, 10), '#ffffff', false);
    const g = new THREE.Group(); g.position.set(0.85, 0, 0.2); g.rotation.z = 0.12; b.build(g); fox.add(g);
  }
  if (spec.redEyes && !fox.userData.placeholder) {
    const m = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
    for (const x of [-0.15, 0.15]) { const e = new THREE.Mesh(sph(0.06, {}, 8, 6), m); e.position.set(x, 0.06, 0.39); P.head.add(e); }
  }
  if (spec.chair) {
    const b = builder();
    b.add(box(1.1, 0.16, 0.95, { y: 1.18 }), '#20222e');
    b.add(box(1.1, 1.05, 0.14, { y: 1.75, z: -0.5 }), '#20222e');
    b.add(box(0.16, 0.12, 0.7, { x: 0.62, y: 1.45 }), '#5b2a86');
    b.add(box(0.16, 0.12, 0.7, { x: -0.62, y: 1.45 }), '#5b2a86');
    b.add(cyl(0.12, 0.2, 0.55, { y: 0.85 }), '#3a3836');
    const g = new THREE.Group(); b.build(g);
    const ring = new THREE.Mesh(tor(0.5, 0.05, { rx: Math.PI / 2, y: 0.5 }, 24), new THREE.MeshBasicMaterial({ color: '#41e2ff' }));
    g.add(ring);
    g.position.copy(fox.position);
    root.add(g);
    fox.position.y += 0.32;
    P.legs.forEach(l => { l.rotation.x = -1.35; });
    fox.userData.chair = g;
  }
}

/* ---------- the game ---------- */
export async function createWashingUp({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const touch = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);

  /* renderer */
  let renderer, dom;
  if (world) { renderer = world.renderer; dom = renderer.domElement; }
  else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.shadowMap.enabled = false;
    dom = renderer.domElement;
    dom.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    container.appendChild(dom);
  }

  /* scene: a Group in the world, a full Scene standalone */
  let root, env;
  if (world) { root = new THREE.Group(); root.name = 'dishSink'; world.parent.add(root); env = new THREE.Scene(); }
  else { root = new THREE.Scene(); root.background = new THREE.Color('#d6eef2'); env = root; }
  const fullRoom = !world;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 250);
  const wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  const goalPos = new THREE.Vector3(0, 6, 7), goalQ = new THREE.Quaternion();
  camera.position.copy(goalPos);

  const audio = createAudio({ music: !world, sound: true });

  /* storage */
  const store = {
    get(k, d) {
      if (save && save.stat) { try { const v = save.stat('dishSink.' + k, d); return v == null ? d : v; } catch (e) { /* use local */ } }
      try { const v = localStorage.getItem('dishSink.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      if (save && save.setStat) { try { save.setStat('dishSink.' + k, v); return; } catch (e) { /* use local */ } }
      try { localStorage.setItem('dishSink.' + k, JSON.stringify(v)); } catch (e) { /* no storage */ }
    },
    gold(n) {
      if (!n) return;
      if (save && save.addGold) { try { save.addGold(n); return; } catch (e) { /* use local */ } }
      this.set('gold', (Number(this.get('gold', 0)) || 0) + n);
    }
  };

  const S = {
    mode: 'cpu', diff: store.get('diff', 'pip'), rivals: 1, seats: 2, roundPref: R.ROUND, round: R.ROUND,
    sound: true, music: !world, phase: 'count', t: 3, time: R.ROUND, paused: false, seed: 1,
    turn: 0, active: 0, stations: [], msg: '', msgT: 0, caption: '', capT: 0, capI: 0,
    result: null, hint: null, lastInput: 0, clock: 0, safe: { top: 0, bottom: 0, left: 0, right: 0 },
    demoT: 0, dirty: true
  };
  if (!R.CAST[S.diff]) S.diff = 'pip';

  /* lights + room (standalone only) */
  if (fullRoom) {
    env.add(new THREE.HemisphereLight(0xffffff, 0x9aa7b8, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(4, 9, 6); env.add(sun);
    const b = builder();
    b.add(box(60, 0.1, 30, { y: -0.05, z: 4 }), '#f2cfa8', false);
    b.add(box(60, 9, 0.2, { y: 4.5, z: -3.1 }), '#9fd8ca', false);
    b.add(box(60, 0.25, 0.3, { y: 1.9, z: -2.95 }), '#f7f3ea', false);
    for (const wx of [-2.8, 2.8, 8.4]) {
      b.add(box(2.4, 1.7, 0.05, { x: wx, y: 3.6, z: -2.98 }), '#bfe9ff', false);
      b.add(box(2.6, 0.12, 0.12, { x: wx, y: 4.5, z: -2.95 }), '#ffffff');
      b.add(box(2.6, 0.12, 0.12, { x: wx, y: 2.7, z: -2.95 }), '#ffffff');
      b.add(box(0.12, 1.9, 0.12, { x: wx - 1.25, y: 3.6, z: -2.95 }), '#ffffff');
      b.add(box(0.12, 1.9, 0.12, { x: wx + 1.25, y: 3.6, z: -2.95 }), '#ffffff');
      b.add(box(0.08, 1.7, 0.08, { x: wx, y: 3.6, z: -2.94 }), '#ffffff', false);
    }
    b.add(cyl(0.35, 0.35, 0.04, { rx: Math.PI / 2, x: -2.2, y: 4.0, z: -2.94 }), '#ffd23a', false);
    for (const cx of [-5.6, 0, 5.6, 11.2]) b.add(box(1.4, 1.1, 0.7, { x: cx, y: 5.6, z: -2.65 }), '#f6b73c');
    b.build(env);
  }

  /* particles */
  const pGeo = { bubble: sph(1, {}, 8, 6), spark: new THREE.OctahedronGeometry(1, 0), shard: new THREE.TetrahedronGeometry(1, 0) };
  const pMat = { bubble: toon('#ffffff'), spark: new THREE.MeshBasicMaterial({ color: '#ffd23a' }), shard: toon('#bfe7ff') };
  const parts = [];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(pGeo.bubble, pMat.bubble); m.visible = false; root.add(m);
    parts.push({ m, life: 0, max: 1, v: new THREE.Vector3(), size: 0.1, g: 0 });
  }
  let pNext = 0;
  function spawn(kind, x, y, z, vx, vy, vz, life, size, g = 0) {
    const p = parts[pNext]; pNext = (pNext + 1) % parts.length;
    p.m.geometry = pGeo[kind]; p.m.material = pMat[kind];
    p.m.position.set(x, y, z); p.v.set(vx, vy, vz); p.life = p.max = life; p.size = size; p.g = g; p.m.visible = true;
    p.m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
  }
  function updateParts(dt) {
    for (const p of parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.m.visible = false; continue; }
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      const k = p.life / p.max;
      p.m.scale.setScalar(p.size * Math.min(1, k * 2.5));
      p.m.rotation.y += dt * 4;
    }
  }

  /* ---------- stations ---------- */
  const CAST_LOOK = {
    you:   { name: 'YOU', color: '#ec3013', torso: ['#ec3013', '#ffd23a', '#2b2b2b'], outfit: 'tee' },
    pip:   { name: 'PIP', color: '#ffd23a', torso: ['#ffd23a', '#fff1a8', '#c9a200'], outfit: 'tee' },
    hope:  { name: 'HOPE', color: '#3a6fd8', torso: ['#f4f4f4', '#3a6fd8', '#3a6fd8'], outfit: 'coat', legs: '#3a6fd8', glasses: true, cane: true },
    noble: { name: 'NOBLE', color: '#b07ce8', torso: ['#5b2a86', '#1d1d2b', '#ec3013'], outfit: 'coat', eyes: '#ff2a2a', redEyes: true, chair: true },
    p2:    { name: 'P2', color: '#1fb5a8', torso: ['#1fb5a8', '#ffffff', '#16615b'], outfit: 'vest' },
    p3:    { name: 'P3', color: '#b07ce8', torso: ['#8c5bd6', '#ffd23a', '#3d2266'], outfit: 'dress' },
    p4:    { name: 'P4', color: '#5cc85f', torso: ['#4caf50', '#ffffff', '#1f5e22'], outfit: 'tee' }
  };

  function makeStation(i, spec) {
    const g = new THREE.Group(); g.position.x = SLOTS[i]; root.add(g);
    const b = builder();
    b.add(box(5.6, 0.14, 2.4, { y: 1.1 }), '#f3ede2');
    b.add(box(5.5, 1.03, 2.2, { y: 0.52 }), '#2f6fb0');
    b.add(box(0.5, 0.08, 0.06, { x: -1.4, y: 0.85, z: 1.12 }), '#ffd23a', false);
    b.add(box(0.5, 0.08, 0.06, { x: 1.4, y: 0.85, z: 1.12 }), '#ffd23a', false);
    b.add(box(0.03, 0.9, 0.03, { y: 0.52, z: 1.11 }), '#1a1626', false);
    /* the tub */
    b.add(box(2.5, 0.06, 2.0, { y: 1.19 }), '#2c5d74', false);
    b.add(box(2.6, 0.36, 0.1, { y: 1.36, z: 1.05 }), '#cfd8e0');
    b.add(box(2.6, 0.36, 0.1, { y: 1.36, z: -1.05 }), '#cfd8e0');
    b.add(box(0.1, 0.36, 2.0, { x: 1.25, y: 1.36 }), '#cfd8e0');
    b.add(box(0.1, 0.36, 2.0, { x: -1.25, y: 1.36 }), '#cfd8e0');
    b.add(cyl(0.07, 0.08, 0.7, { x: -1.05, y: 1.85, z: -1.0 }), '#cfd8e0');
    b.add(cyl(0.06, 0.06, 0.5, { rx: Math.PI / 2, x: -1.05, y: 2.18, z: -0.78 }), '#cfd8e0');
    b.add(cyl(0.07, 0.05, 0.14, { x: -1.05, y: 2.1, z: -0.55 }), '#cfd8e0');
    /* soap bottle */
    b.add(cyl(0.17, 0.19, 0.5, { x: 1.7, y: 1.42, z: -0.7 }), '#3cc46b');
    b.add(cyl(0.06, 0.1, 0.16, { x: 1.7, y: 1.75, z: -0.7 }), '#ec3013');
    /* rack */
    b.add(box(1.1, 0.06, 1.2, { x: 2.1, y: 1.2 }), '#9aa6b2');
    for (let k = 0; k < 6; k++) b.add(box(0.03, 0.42, 0.03, { x: 1.62 + k * 0.19, y: 1.42, z: 0.5 }), '#9aa6b2', false);
    for (let k = 0; k < 6; k++) b.add(box(0.03, 0.42, 0.03, { x: 1.62 + k * 0.19, y: 1.42, z: -0.5 }), '#9aa6b2', false);
    /* dirty pile */
    for (let k = 0; k < 5; k++) b.add(cyl(0.62, 0.5, 0.08, { x: -2.1 + (k % 2) * 0.03, y: 1.22 + k * 0.09, z: 0.05 }, 18), '#fbfaf6', k === 0 || k === 4, 0.02);
    b.add(xf(new THREE.CircleGeometry(0.2, 10), { rx: -Math.PI / 2, x: -2.0, y: 1.63, z: 0.1 }), '#d9481e', false);
    b.add(xf(new THREE.CircleGeometry(0.13, 10), { rx: -Math.PI / 2, x: -2.25, y: 1.631, z: -0.15 }), '#c8bd2c', false);
    b.build(g);
    const water = new THREE.Mesh(xf(new THREE.PlaneGeometry(2.4, 2.0), { rx: -Math.PI / 2, y: 1.3 }), toon('#62c6e6', { transparent: true, opacity: 0.82 }));
    g.add(water);

    /* sponge */
    const sponge = new THREE.Group();
    const sb = builder();
    sb.add(box(0.42, 0.13, 0.3, { y: 0.1 }), '#ffd23a');
    sb.add(box(0.42, 0.06, 0.3, { y: 0.0 }), '#3cc46b');
    sb.build(sponge);
    g.add(sponge);

    /* fox */
    const look = CAST_LOOK[spec.look];
    const fox = makeFoxWith(kit, look);
    fox.position.set(0, 0, FOX_Z);
    g.add(fox);
    dressFox(fox, look, g);

    const st = {
      i, g, x: SLOTS[i], fox, sponge, water, name: look.name, color: look.color, lvl: spec.cpu || null,
      score: 0, dishes: 0, broken: 0, soap: 1, crack: 0, dish: null, dm: null, dishIndex: 0, dishT0: 0,
      trans: null, rack: [], rub: 0, rubAcc: 0, spd: 0, sp: { x: 0.95, z: 0.55 }, hop: 0, needSoap: false,
      ai: { target: -1, wait: 0.6 + i * 0.2, phase: Math.random() * 6 }, warnT: 0, greaseT: 0, gone: 0
    };
    placeSponge(st);
    return st;
  }

  function clearStations() {
    for (const st of S.stations) { root.remove(st.g); }
    S.stations = [];
  }

  function rubPlaneY(st) { return DY + topY(st.dish ? st.dish.type : 'plate', (st.dish ? st.dish.R : 0.8) * 0.45); }

  function placeSponge(st) {
    const y = st.dish ? rubPlaneY(st) + 0.03 : DY + 0.1;
    st.sponge.position.set(st.sp.x, y, st.sp.z);
  }

  function buildDishMesh(d) {
    const G = dishGeo(d.type, touch);
    const g = new THREE.Group();
    const bodyMat = d.type === 'crystal' ? toon(PROFILES.crystal.color, { transparent: true, opacity: 0.6 }) : toon(PROFILES[d.type].color);
    g.add(new THREE.Mesh(G.body, bodyMat));
    if (d.type !== 'crystal') { const ink = new THREE.Mesh(G.ink, inkMat); g.add(ink); }
    for (const [geo, c] of G.extras) g.add(new THREE.Mesh(geo, toon(c)));
    const cracks = G.crack.map(cg => { const m = new THREE.Mesh(cg, toon('#1a1626')); m.visible = false; g.add(m); return m; });
    const blobs = blobGeos();
    const spots = d.spots.map(s => {
      const m = new THREE.Mesh(blobs[s.shape], spotMat(s));
      m.position.set(s.x, topY(d.type, Math.hypot(s.x, s.z)) + 0.014, s.z);
      m.rotation.y = s.rot;
      m.scale.setScalar(s.r);
      if (s.kind === 'grease') {
        const h = new THREE.Mesh(blobs[2], toon('#fffbd0'));
        h.scale.setScalar(0.2); h.position.set(-0.35, 0.004, -0.3); m.add(h);
      }
      g.add(m);
      return m;
    });
    return { g, spots, cracks };
  }

  function newDish(st, instant) {
    st.dish = R.makeDish(S.seed, st.dishIndex);
    st.crack = 0;
    st.dm = buildDishMesh(st.dish);
    st.g.add(st.dm.g);
    st.ai.target = -1;
    if (instant) { st.dm.g.position.set(0, DY, 0); st.trans = null; st.dishT0 = S.clock; }
    else { st.trans = { kind: 'in', t: 0, dur: 0.4 }; st.dm.g.position.set(-2.1, 1.7, 0.05); }
    placeSponge(st);
  }

  function updateSpotMeshes(st) {
    const d = st.dish;
    d.spots.forEach((s, k) => {
      const m = st.dm.spots[k];
      if (s.dirt <= 0) { m.visible = false; return; }
      m.scale.setScalar(s.r * (0.35 + 0.65 * s.dirt / s.max));
    });
    if (st.dm.cracks.length) st.dm.cracks.forEach((m, k) => { m.visible = st.crack > 0.25 + k * 0.25; });
  }

  function isActiveHuman(st) { return st && !st.lvl && S.stations[S.active] === st; }
  function audible(st) { return S.stations[S.active] === st; }

  /* scrub at a point on the dish: returns dirt removed */
  function rubAt(st, x, z, amt) {
    const d = st.dish;
    if (!d || st.trans) return 0;
    let cleaned = 0;
    for (const s of d.spots) {
      if (s.dirt <= 0) continue;
      if (Math.hypot(s.x - x, s.z - z) > s.r + R.SPONGE_R) continue;
      const mult = R.rubMult(s.kind, st.soap);
      if (s.kind === 'grease' && st.soap <= 0) st.greaseT = 0.6;
      const take = Math.min(s.dirt, amt * mult);
      s.dirt -= take; cleaned += take;
      st.soap = Math.max(0, st.soap - take * R.soapCost(s.kind));
      if (s.dirt <= 0.001) {
        s.dirt = 0;
        st.gone++;
        if (audible(st)) audio.spotGone(st.gone);
        const wp = st.g.position;
        for (let k = 0; k < 4; k++) spawn('spark', wp.x + s.x, DY + 0.3, s.z, (Math.random() - 0.5) * 1.5, 1.5 + Math.random(), (Math.random() - 0.5) * 1.5, 0.45, 0.07, 4);
      }
    }
    if (cleaned > 0) {
      st.rub = Math.min(1, st.rub + cleaned * 2);
      if (st.soap > 0 && Math.random() < 0.5) spawn('bubble', st.x + x + (Math.random() - 0.5) * 0.3, rubPlaneY(st) + 0.1, z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, 0.8, 0.05 + Math.random() * 0.05);
      updateSpotMeshes(st);
      if (R.isClean(d)) finishDish(st);
    }
    return cleaned;
  }

  function finishDish(st) {
    const secs = S.clock - st.dishT0;
    const r = R.scoreDish(st.dish, secs);
    st.score += r.pts; st.dishes++; st.hop = 0.4;
    st.trans = { kind: 'out', t: 0, dur: 0.5, from: st.dm.g.position.clone() };
    if (audible(st)) { audio.clink(); audio.sparkle(); }
    if (isActiveHuman(st)) setMsg(r.fast ? '+' + r.pts + ' FAST!' : '+' + r.pts + ' CLEAN', 0.9);
    const wp = st.g.position;
    for (let k = 0; k < 8; k++) spawn('spark', wp.x + (Math.random() - 0.5) * 1.2, DY + 0.4, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2, 2 + Math.random() * 1.5, (Math.random() - 0.5) * 2, 0.6, 0.08, 5);
    S.dirty = true;
  }

  function breakDish(st) {
    st.broken++; st.score = Math.max(0, st.score - 1);
    st.trans = { kind: 'break', t: 0, dur: 0.35 };
    if (audible(st)) audio.shatter();
    if (isActiveHuman(st)) setMsg('CRASH! Too hard. -1', 1.3);
    else if (S.stations[S.active] && st.lvl) setMsg(st.name + ' broke the crystal!', 1.3);
    const wp = st.g.position;
    for (let k = 0; k < 14; k++) spawn('shard', wp.x + (Math.random() - 0.5), DY + 0.2, (Math.random() - 0.5), (Math.random() - 0.5) * 4, 2 + Math.random() * 2, (Math.random() - 0.5) * 4, 0.8, 0.09, 9);
    S.dirty = true;
  }

  function stepTrans(st, dt) {
    const tr = st.trans; if (!tr) return;
    tr.t += dt;
    const k = Math.min(1, tr.t / tr.dur);
    const m = st.dm.g;
    if (tr.kind === 'in') {
      const e = 1 - Math.pow(1 - k, 3);
      m.position.set(-2.1 + 2.1 * e, 1.7 + (DY - 1.7) * e + Math.sin(k * Math.PI) * 0.6, 0.05 - 0.05 * e);
      m.rotation.z = (1 - e) * 0.5;
      if (k >= 1) { st.trans = null; st.dishT0 = S.clock; m.rotation.z = 0; if (audible(st)) audio.splash(); splash(st); }
    } else if (tr.kind === 'out') {
      const slot = st.rack.length;
      const tx = 1.68 + (slot % 6) * 0.17, ty = 1.23 + st.dish.R * 0.55, tz = 0;
      const e = k * k * (3 - 2 * k);
      m.position.set(tr.from.x + (tx - tr.from.x) * e, tr.from.y + (ty - tr.from.y) * e + Math.sin(k * Math.PI) * 1.0, tr.from.z * (1 - e));
      m.rotation.set(0, 0, -e * Math.PI / 2);
      m.scale.setScalar(1 - e * 0.4);
      if (k >= 1) {
        st.dm.spots.forEach(s => { s.visible = false; });
        st.rack.push(m);
        if (st.rack.length > 6) { const old = st.rack.shift(); st.g.remove(old); st.rack.forEach((r2, j) => { r2.position.x = 1.68 + j * 0.17; }); }
        st.dishIndex++; st.trans = null; newDish(st, false);
      }
    } else if (tr.kind === 'break') {
      m.scale.setScalar(Math.max(0.01, 1 - k));
      if (k >= 1) { st.g.remove(m); st.dishIndex++; st.trans = null; newDish(st, false); }
    }
  }

  function splash(st) {
    for (let k = 0; k < 6; k++) spawn('bubble', st.x + (Math.random() - 0.5) * 1.6, 1.34, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.8, 1.2 + Math.random(), (Math.random() - 0.5) * 0.8, 0.6, 0.08, 4);
  }

  function doSoap(st) {
    if (!st || st.trans && st.trans.kind !== 'in' && st.trans.kind !== 'out') { /* still allow */ }
    st.soap = 1; st.needSoap = false;
    if (audible(st)) audio.soap();
    for (let k = 0; k < 10; k++) spawn('bubble', st.x + (Math.random() - 0.5) * 1.2, rubPlaneY(st) + 0.08, (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4, 1.2, 0.07 + Math.random() * 0.06);
    S.dirty = true;
  }

  /* ---------- CPU ---------- */
  function cpuUpdate(st, dt) {
    if (st.trans || !st.dish) return;
    const C = R.CAST[st.lvl];
    const ai = st.ai;
    if (ai.wait > 0) { ai.wait -= dt; st.rub *= 0.9; return; }
    const d = st.dish;
    if (st.soap < 0.12 && d.spots.some(s => s.dirt > 0 && s.kind === 'grease')) { doSoap(st); ai.wait = C.soapWait; return; }
    if (Math.random() < C.daydream * dt) { ai.wait = 0.5 + Math.random() * 0.7; return; }
    if (ai.target < 0 || !d.spots[ai.target] || d.spots[ai.target].dirt <= 0) ai.target = R.aiTarget(d, st.sp.x, st.sp.z, st.lvl);
    const s = d.spots[ai.target];
    if (!s) return;
    ai.phase += dt * C.circle;
    const gx = s.x + Math.cos(ai.phase) * 0.08, gz = s.z + Math.sin(ai.phase) * 0.08;
    const dx = gx - st.sp.x, dz = gz - st.sp.z, dl = Math.hypot(dx, dz);
    const mv = Math.min(dl, C.speed * dt);
    if (dl > 1e-4) { st.sp.x += dx / dl * mv; st.sp.z += dz / dl * mv; }
    placeSponge(st);
    if (Math.hypot(s.x - st.sp.x, s.z - st.sp.z) < s.r + R.SPONGE_R) {
      rubAt(st, st.sp.x, st.sp.z, C.rate * dt);
      st.rub = Math.min(1, st.rub + dt * 4);
      if (st.dish && st.dish.fragile && !st.trans && C.slip > 0 && Math.random() < C.slip * dt) {
        st.crack += 0.4; updateSpotMeshes(st);
        if (audible(st)) audio.crack();
        if (st.crack >= 1) breakDish(st);
      }
    }
  }

  /* ---------- human input ---------- */
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const hitV = new THREE.Vector3();
  let drag = null;

  function localHit(cx, cy, st) {
    const r = dom.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    plane.set(UP, -rubPlaneY(st));
    if (!ray.ray.intersectPlane(plane, hitV)) return null;
    return { x: hitV.x - st.x, z: hitV.z };
  }

  function clampToDish(st, p) {
    const lim = (st.dish ? st.dish.R : 0.8) + 0.12;
    const l = Math.hypot(p.x, p.z);
    if (l > lim) { p.x *= lim / l; p.z *= lim / l; }
    return p;
  }

  function moveSpongeHuman(st, nx, nz) {
    const p = clampToDish(st, { x: nx, z: nz });
    let dx = p.x - st.sp.x, dz = p.z - st.sp.z;
    let len = Math.hypot(dx, dz);
    if (len > 2.2) { st.sp.x = p.x; st.sp.z = p.z; placeSponge(st); return; }
    const steps = Math.max(1, Math.ceil(len / 0.08));
    let cleaned = 0, onDirt = false;
    for (let k = 1; k <= steps; k++) {
      const x = st.sp.x + dx * k / steps, z = st.sp.z + dz * k / steps;
      const c = rubAt(st, x, z, (len / steps) * R.RUB_K);
      if (c > 0) onDirt = true;
      cleaned += c;
      if (st.trans) break;
    }
    st.sp.x = p.x; st.sp.z = p.z;
    st.rubAcc += len;
    st.onDirt = onDirt ? 0.15 : Math.max(0, (st.onDirt || 0));
    placeSponge(st);
  }

  function canPlay() { const st = S.stations[S.active]; return S.phase === 'play' && !S.paused && st && !st.lvl && st.dish; }

  function onDown(e) {
    audio.unlock();
    S.lastInput = S.clock; S.hint = null;
    if (!world && container.focus) { try { container.focus({ preventScroll: true }); } catch (er) { /* ok */ } }
    if (!canPlay()) return;
    const st = S.stations[S.active];
    const h = localHit(e.clientX, e.clientY, st);
    if (!h) return;
    if (Math.hypot(h.x, h.z) > st.dish.R + 0.9) return;
    drag = { id: e.pointerId };
    const p = clampToDish(st, h);
    st.sp.x = p.x; st.sp.z = p.z; placeSponge(st);
    if (!world && dom.setPointerCapture) { try { dom.setPointerCapture(e.pointerId); } catch (er) { /* ok */ } }
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return false;
    S.lastInput = S.clock;
    if (!canPlay()) return true;
    const st = S.stations[S.active];
    const h = localHit(e.clientX, e.clientY, st);
    if (h) moveSpongeHuman(st, h.x, h.z);
    return true;
  }
  function onUp(e) { if (!drag || e.pointerId !== drag.id) return false; drag = null; return true; }

  /* world mode: capture on window, act only on the world canvas, keep the town from reacting */
  const wDown = e => { if (e.target !== dom) return; e.preventDefault(); e.stopImmediatePropagation(); onDown(e); };
  const wMove = e => { if (onMove(e)) { e.preventDefault(); e.stopImmediatePropagation(); } };
  const wUp = e => { if (onUp(e)) { e.stopImmediatePropagation(); } };
  const sMove = e => { onMove(e); };
  const sUp = e => { onUp(e); };
  const sKey = e => { if (key(e)) e.preventDefault(); };
  if (world) {
    window.addEventListener('pointerdown', wDown, true);
    window.addEventListener('pointermove', wMove, true);
    window.addEventListener('pointerup', wUp, true);
    window.addEventListener('pointercancel', wUp, true);
  } else {
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', sMove);
    window.addEventListener('pointerup', sUp);
    window.addEventListener('pointercancel', sUp);
    if (container.tabIndex < 0) container.tabIndex = 0;
    container.style.outline = 'none';
    container.addEventListener('keydown', sKey);
  }

  function key(e) {
    const k = e.key;
    audio.unlock();
    S.lastInput = S.clock; S.hint = null;
    if (k === 'Enter') {
      if (S.phase === 'pass') { ready(); return true; }
      if (S.phase === 'results') { start(S.mode); return true; }
      return false;
    }
    if (k === 'r' || k === 'R') { start(S.mode); return true; }
    if (k === 'p' || k === 'P') { pause(!S.paused); return true; }
    if (!canPlay()) return false;
    const st = S.stations[S.active];
    if (k === ' ' || k === 'e' || k === 'E') { doSoap(st); return true; }
    const dirs = { ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0], ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1] };
    const v = dirs[k];
    if (!v) return false;
    moveSpongeHuman(st, st.sp.x + v[0] * 0.14, st.sp.z + v[1] * 0.14);
    st.rub = Math.min(1, st.rub + 0.3);
    return true;
  }

  /* ---------- flow ---------- */
  function setMsg(t, secs = 1.4) { S.msg = t; S.msgT = secs; S.dirty = true; }

  function specsFor(mode) {
    if (mode === 'demo') return [{ look: 'hope', cpu: 'hope' }, { look: 'noble', cpu: 'noble' }];
    if (mode === 'local') return ['you', 'p2', 'p3', 'p4'].slice(0, Math.max(2, Math.min(4, S.seats))).map((l, i) => ({ look: i === 0 ? 'you' : l, name: 'P' + (i + 1) }));
    const top = R.ORDER.indexOf(S.diff);
    const list = [{ look: 'you' }];
    const pref = [top, top - 1, top + 1, top - 2, top + 2].filter(k => k >= 0 && k < 3);
    for (let k = 0; k < Math.max(1, Math.min(3, S.rivals)); k++) {
      const lv = R.ORDER[pref[k]];
      list.push({ look: lv, cpu: lv });
    }
    return list;
  }

  function start(mode = S.mode) {
    if (mode === 'pvp' || mode === 'pass') mode = 'local';
    if (!['cpu', 'local', 'demo'].includes(mode)) mode = 'cpu';
    S.mode = mode;
    clearStations();
    drag = null;
    S.seed = (Math.random() * 1e9) | 0;
    S.result = null; S.paused = false; S.msg = ''; S.msgT = 0; S.hint = null;
    const specs = specsFor(mode);
    S.stations = specs.map((sp, i) => {
      const st = makeStation(i, sp);
      if (mode === 'local') st.name = sp.name;
      newDish(st, true);
      return st;
    });
    S.active = 0; S.turn = 0;
    S.round = mode === 'demo' ? 30 : S.roundPref;
    S.time = S.round;
    S.capI = 0; S.capT = 0; S.caption = R.TIPS[0];
    if (mode === 'local') { S.phase = 'pass'; }
    else { S.phase = 'count'; S.t = 3; S.lastBeep = 4; }
    audio.setRub(0, false);
    S.lastInput = S.clock;
    snapCam();
    emitNow();
  }

  function ready() {
    if (S.phase !== 'pass') return;
    S.phase = 'count'; S.t = 3; S.lastBeep = 4; S.time = S.round;
    const st = S.stations[S.active];
    st.dishT0 = S.clock;
    S.lastInput = S.clock;
    emitNow();
  }

  function pause(on) { S.paused = !!on; if (S.paused) { audio.setRub(0, false); drag = null; } emitNow(); }

  function endTurn() {
    audio.setRub(0, false);
    audio.whistle();
    drag = null;
    if (S.mode === 'local' && S.turn < S.stations.length - 1) {
      setMsg(S.stations[S.active].name + ': ' + S.stations[S.active].score + ' points', 2);
      S.turn++; S.active = S.turn; S.phase = 'pass';
      emitNow();
      return;
    }
    finish();
  }

  function finish() {
    const sts = S.stations;
    const rows = sts.map((s, i) => ({ name: s.name, score: s.score, dishes: s.dishes, broken: s.broken, color: s.color, i }))
      .sort((a, b) => b.score - a.score || b.dishes - a.dishes);
    const top = rows[0];
    const tie = rows.length > 1 && rows[1].score === top.score && rows[1].dishes === top.dishes;
    let title, win = false, score, lvl = S.diff;
    if (S.mode === 'cpu') {
      const you = sts[0];
      score = you.score;
      win = !tie && top.i === 0;
      title = win ? 'YOU WIN' : tie && top.score === you.score ? 'DRAW' : top.name + ' WINS';
    } else {
      score = top.score;
      title = tie ? 'DRAW' : top.name + ' WINS';
      win = !tie && S.mode === 'local';
      lvl = 'pip';
    }
    const bestKey = 'best.' + S.mode;
    const best0 = Number(store.get(bestKey, 0)) || 0;
    const best = Math.max(best0, score);
    let rw = { gold: 0, xp: 0 };
    if (S.mode !== 'demo') {
      rw = R.rewards(score, win, lvl);
      if (best > best0) store.set(bestKey, best);
      store.gold(rw.gold);
      store.set('xp', (Number(store.get('xp', 0)) || 0) + rw.xp);
      store.set('diff', S.diff);
    }
    S.result = { title, win, draw: tie, score, best, newBest: score > best0 && S.mode !== 'demo', gold: rw.gold, xp: rw.xp, stars: R.stars(score),
      rows: rows.map((r, k) => ({ place: k + 1, name: r.name, score: r.score, dishes: r.dishes, broken: r.broken, color: r.color })) };
    S.phase = 'results';
    sts.forEach(s => { if (rows[0].i === s.i && !tie) s.hop = 1.2; });
    if (S.mode === 'demo') S.demoT = 4;
    else if (win || S.mode === 'local') audio.win(); else audio.lose();
    emitNow();
  }

  /* ---------- per-frame ---------- */
  function update(dt) {
    S.clock += dt;
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) { S.msg = ''; S.dirty = true; } }
    updateParts(dt);
    for (const st of S.stations) animateFox(st, dt);
    if (S.paused) return;

    if (S.phase === 'count') {
      S.t -= dt;
      const n = Math.ceil(S.t);
      if (n !== S.lastBeep) { S.lastBeep = n; if (n > 0) audio.beep(false); S.dirty = true; }
      if (S.t <= 0) { S.phase = 'play'; audio.beep(true); setMsg('GO!', 0.8); S.stations.forEach(s => { s.dishT0 = S.clock; }); S.lastInput = S.clock; }
    } else if (S.phase === 'play') {
      S.time -= dt;
      for (const st of S.stations) {
        if (st.lvl && (S.mode !== 'local')) cpuUpdate(st, dt);
        stepTrans(st, dt);
      }
      const st = S.stations[S.active];
      if (st && !st.lvl) {
        /* sponge speed: crystal cracks when scrubbed too fast */
        const inst = st.rubAcc / Math.max(dt, 1e-3); st.rubAcc = 0;
        st.spd += (inst - st.spd) * Math.min(1, dt * 10);
        if (st.dish && st.dish.fragile && !st.trans) {
          if (st.spd > R.CRACK_SPEED) {
            const before = st.crack;
            st.crack += (st.spd - R.CRACK_SPEED) * dt * 0.09;
            if (Math.floor(before * 4) !== Math.floor(st.crack * 4)) audio.crack();
            updateSpotMeshes(st);
            if (st.crack >= 1) breakDish(st);
          }
          if (st.spd > R.WARN_SPEED && st.warnT <= 0) { setMsg('GENTLE! Crystal cracks.', 1); audio.warn(); st.warnT = 1.2; }
        }
        st.warnT -= dt;
        if (st.greaseT > 0) { st.greaseT -= dt; if (S.msgT <= 0.1) setMsg('GREASE! Tap SOAP.', 1.2); }
        const need = st.soap <= 0.05 && st.dish && st.dish.spots.some(s => s.dirt > 0 && s.kind === 'grease');
        if (need !== st.needSoap) { st.needSoap = need; S.dirty = true; }
        const lvl = Math.min(1, st.spd / 6);
        st.onDirt = Math.max(0, (st.onDirt || 0) - dt);
        audio.setRub(drag ? lvl : st.rub * 0.5, st.onDirt > 0);
        if (st.spd > 0.3) st.rub = Math.min(1, st.rub + dt * 3);
        if (S.clock - S.lastInput > 3 && !st.trans) {
          const v = new THREE.Vector3(st.x, rubPlaneY(st), 0).project(camera);
          const [W, H] = size();
          S.hint = { x: Math.round((v.x + 1) / 2 * W), y: Math.round((1 - v.y) / 2 * H) };
        } else S.hint = null;
      } else if (st && st.lvl) {
        audio.setRub(st.rub * 0.35, true);
      }
      if (S.mode === 'demo') {
        S.capT += dt;
        if (S.capT > 4.5) { S.capT = 0; S.capI = (S.capI + 1) % R.TIPS.length; S.caption = R.TIPS[S.capI]; S.dirty = true; }
      }
      if (S.time <= 0) { S.time = 0; endTurn(); }
    } else {
      for (const st of S.stations) stepTrans(st, dt);
      if (S.phase === 'results' && S.mode === 'demo') { S.demoT -= dt; if (S.demoT <= 0) start('demo'); }
    }
  }

  function animateFox(st, dt) {
    const f = st.fox, P = f.userData.P;
    st.rub = Math.max(0, st.rub - dt * 1.5);
    if (kit && kit.animFox && !f.userData.placeholder) { try { kit.animFox(f, dt, 0); } catch (e) { /* ignore */ } }
    const baseY = f.userData.chair ? 0.32 : 0;
    if (st.hop > 0) { st.hop -= dt; f.position.y = baseY + Math.abs(Math.sin(st.hop * 9)) * 0.35; } else f.position.y = baseY + Math.sin(S.clock * 2 + st.i) * 0.02;
    if (f.userData.chair) f.userData.chair.position.y = Math.sin(S.clock * 2.4 + st.i) * 0.05;
    if (!P) return;
    const scrub = st.rub;
    const w = Math.sin(S.clock * 22) * 0.3 * scrub;
    const reachX = st.sp.x / 3;
    if (P.arms && P.arms[1]) { P.arms[1].rotation.x = -1.15 - w - 0.25 * (st.sp.z + 0.5); P.arms[1].rotation.z = 0.15 - reachX; }
    if (P.arms && P.arms[0]) { P.arms[0].rotation.x = -1.0 + w * 0.5; P.arms[0].rotation.z = -0.15 - reachX * 0.5; }
    if (P.head) { P.head.rotation.x = 0.12; P.head.rotation.y = st.sp.x * 0.25; }
    if (P.body) P.body.rotation.y = st.sp.x * 0.08 + Math.sin(S.clock * 22) * 0.04 * scrub;
    /* sponge wiggle */
    st.sponge.rotation.y = Math.sin(S.clock * 18) * 0.25 * scrub;
    st.sponge.scale.y = 1 - 0.25 * scrub * (0.5 + 0.5 * Math.sin(S.clock * 22));
  }

  /* ---------- camera: fitted from points into the free screen area ---------- */
  function size() {
    if (world) { const el = world.renderer.domElement; return [el.clientWidth || window.innerWidth, el.clientHeight || window.innerHeight]; }
    return [container.clientWidth || 1, container.clientHeight || 1];
  }

  function fitPoints() {
    const st = S.stations[S.active];
    const x = st ? st.x : 0;
    const [W, H] = size();
    const pts = [];
    for (const sx of [-1.3, 1.3]) for (const sz of [-1.1, 1.1]) { pts.push([x + sx, 1.25, sz]); pts.push([x + sx, 1.55, sz]); }
    pts.push([x, 3.05, FOX_Z], [x - 0.5, 2.9, FOX_Z], [x + 0.5, 2.9, FOX_Z]);
    if (W > H * 1.1) { pts.push([x - 2.6, 1.3, 0.6], [x + 2.6, 1.3, 0.6], [x - 2.6, 1.3, -0.6], [x + 2.6, 1.3, -0.6]); }
    return pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  }

  function computeGoal() {
    const [W, H] = size();
    camera.aspect = W / H;
    camera.fov = world && world.camera ? world.camera.fov : (W < H ? 58 : 42);
    camera.updateProjectionMatrix();
    const pts = fitPoints();
    const f = new THREE.Vector3(0, -Math.sin(PITCH), -Math.cos(PITCH));
    const r = new THREE.Vector3().crossVectors(f, UP).normalize();
    const u = new THREE.Vector3().crossVectors(r, f);
    const c = new THREE.Vector3(); pts.forEach(p => c.add(p)); c.multiplyScalar(1 / pts.length);
    const ty = Math.tan(camera.fov * DEG / 2), tx = ty * camera.aspect;
    const sf = S.safe;
    const m = 0.04;
    let a0 = 2 * (sf.left || 0) / W - 1 + m, a1 = 1 - 2 * (sf.right || 0) / W - m;
    let b0 = 1 - 2 * (H - (sf.bottom || 0)) / H + m, b1 = 1 - 2 * (sf.top || 0) / H - m;
    if (a1 - a0 < 0.3) { a0 = -0.9; a1 = 0.9; }
    if (b1 - b0 < 0.3) { b0 = -0.9; b1 = 0.9; }
    const rel = pts.map(p => { const d = p.clone().sub(c); return [d.dot(r), d.dot(u), d.dot(f)]; });
    function bounds(D) {
      let sLo = -1e9, sHi = 1e9, tLo = -1e9, tHi = 1e9;
      for (const [px, py, pz] of rel) {
        const z = pz + D;
        if (z < 0.3) return null;
        sLo = Math.max(sLo, px - a1 * tx * z); sHi = Math.min(sHi, px - a0 * tx * z);
        tLo = Math.max(tLo, py - b1 * ty * z); tHi = Math.min(tHi, py - b0 * ty * z);
      }
      return sLo <= sHi && tLo <= tHi ? [(sLo + sHi) / 2, (tLo + tHi) / 2] : null;
    }
    let lo = 0.5, hi = 120;
    for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (bounds(mid)) hi = mid; else lo = mid; }
    const st = bounds(hi) || [0, 0];
    goalPos.copy(c).addScaledVector(f, -hi).addScaledVector(r, st[0]).addScaledVector(u, st[1]);
    goalQ.setFromRotationMatrix(new THREE.Matrix4().lookAt(goalPos, goalPos.clone().add(f), UP));
  }

  const qTmp = new THREE.Quaternion();
  function mirror() {
    camera.updateMatrixWorld(); root.updateWorldMatrix(true, false);
    wcam.position.copy(camera.position); root.localToWorld(wcam.position);
    root.getWorldQuaternion(qTmp); wcam.quaternion.copy(qTmp).multiply(camera.quaternion);
    wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
  }

  function aimCamera(dt) {
    computeGoal();
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(goalPos, k);
    camera.quaternion.slerp(goalQ, k);
    camera.updateMatrixWorld();
    if (world) mirror();
  }

  function snapCam() {
    computeGoal();
    camera.position.copy(goalPos); camera.quaternion.copy(goalQ); camera.updateMatrixWorld();
    if (world) mirror();
  }

  function setSafe(s = {}) {
    S.safe = { top: +s.top || 0, bottom: +s.bottom || 0, left: +s.left || 0, right: +s.right || 0 };
  }

  /* resize (standalone) */
  let ro = null;
  function resize() {
    if (world) return;
    const [W, H] = size();
    renderer.setSize(W, H, false);
  }
  if (!world) {
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(container); }
    resize();
  }

  /* ---------- state out ---------- */
  function hud() {
    const st = S.stations[S.active];
    const D = st && st.dish ? R.DISHES[st.dish.type] : null;
    return {
      key: GAME.key, name: GAME.name, mode: S.mode, phase: S.phase, paused: S.paused,
      count: Math.max(0, Math.ceil(S.t)), time: Math.max(0, Math.ceil(S.time)), timeMax: S.round,
      players: S.stations.map((s, i) => ({ name: s.name, color: s.color, score: s.score, dishes: s.dishes, cpu: !!s.lvl, active: i === S.active })),
      active: S.active, turn: S.turn,
      human: !!(st && !st.lvl),
      dish: D ? { type: st.dish.type, name: D.name, tip: D.tip, fragile: !!D.fragile, pts: D.pts } : null,
      soap: st ? Math.round(st.soap * 100) / 100 : 0, needSoap: !!(st && st.needSoap), crack: st ? Math.min(1, Math.round(st.crack * 100) / 100) : 0,
      msg: S.msg, caption: S.mode === 'demo' && S.phase !== 'results' ? S.caption : '',
      hint: S.phase === 'play' && !S.paused ? S.hint : null,
      diff: S.diff, rivals: S.rivals, seats: S.seats, round: S.roundPref, sound: S.sound, music: S.music,
      pass: S.phase === 'pass' && st ? { name: st.name, color: st.color, turn: S.turn + 1, of: S.stations.length } : null,
      result: S.result, rules: R.RULES, cast: R.ORDER.map(k => ({ key: k, name: R.CAST[k].name }))
    };
  }
  let emitAcc = 0, lastSig = '';
  function emitNow() {
    const h = hud();
    lastSig = sig(h);
    S.dirty = false;
    try { onState(h); } catch (e) { console.error(e); }
  }
  function sig(h) { return [h.phase, h.paused, h.count, h.time, h.msg, h.caption, h.needSoap, h.dish && h.dish.type, h.players.map(p => p.score).join(','), !!h.hint, h.active].join('|'); }
  function emitTick(dt) {
    emitAcc += dt;
    if (S.dirty) { emitNow(); emitAcc = 0; return; }
    if (emitAcc >= 0.1) {
      emitAcc = 0;
      const h = hud();
      const s = sig(h);
      lastSig = s;
      try { onState(h); } catch (e) { console.error(e); }
    }
  }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), dead = false;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    update(dt);
    aimCamera(dt);
    if (!world) renderer.render(root, camera);
    emitTick(dt);
  }

  function destroy() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    audio.close();
    if (world) {
      window.removeEventListener('pointerdown', wDown, true);
      window.removeEventListener('pointermove', wMove, true);
      window.removeEventListener('pointerup', wUp, true);
      window.removeEventListener('pointercancel', wUp, true);
      world.parent.remove(root);
    } else {
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', sMove);
      window.removeEventListener('pointerup', sUp);
      window.removeEventListener('pointercancel', sUp);
      container.removeEventListener('keydown', sKey);
      if (ro) ro.disconnect();
      renderer.dispose();
      if (dom.parentNode) dom.parentNode.removeChild(dom);
    }
  }

  const api = {
    hud, setSafe, start, key, snapCam, destroy, ready, pause,
    get camera() { return world ? wcam : camera; },
    soap() { audio.unlock(); if (canPlay()) { doSoap(S.stations[S.active]); S.lastInput = S.clock; } },
    restart() { audio.unlock(); start(S.mode); },
    setMode(m) { audio.unlock(); start(m); },
    setDifficulty(d) { if (R.CAST[d]) { S.diff = d; store.set('diff', d); if (S.mode === 'cpu') start('cpu'); else emitNow(); } },
    setRivals(n) { S.rivals = Math.max(1, Math.min(3, n | 0)); if (S.mode === 'cpu') start('cpu'); else emitNow(); },
    setSeats(n) { S.seats = Math.max(2, Math.min(4, n | 0)); if (S.mode === 'local') start('local'); else emitNow(); },
    setRound(s) { S.roundPref = [45, 60, 90].includes(s) ? s : 60; if (S.mode !== 'demo') start(S.mode); else emitNow(); },
    setSound(on) { S.sound = !!on; audio.setSound(S.sound); emitNow(); },
    setMusic(on) { S.music = !!on; audio.unlock(); audio.setMusic(S.music); emitNow(); },
    unlockAudio() { audio.unlock(); }
  };

  start(opts.mode || 'cpu');
  raf = requestAnimationFrame(frame);
  return api;
}

export const createDishes = createWashingUp;
export default createWashingUp;
