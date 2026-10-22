/* PLAYGROUND: toon look, merged static meshes, stations, the fox adapter. */
import * as THREE from '../../vendor/three/three.module.js';

export const INK = 0x1a1626;

/* ---------- materials ---------- */
let GRAD = null, VMAT = null, OMAT = null;
export function gradientMap() {
  if (!GRAD) {
    GRAD = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
    GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
    GRAD.generateMipmaps = false; GRAD.needsUpdate = true;
  }
  return GRAD;
}
export function vcMat() { return VMAT || (VMAT = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() })); }
export function inkMat() { return OMAT || (OMAT = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })); }
export function isShared(m) { return m === VMAT || m === OMAT; }

/* ---------- primitive + merge ---------- */
function prim(kind, p, t) {
  switch (kind) {
    case 'box': return new THREE.BoxGeometry(p[0] + 2 * t, p[1] + 2 * t, p[2] + 2 * t);
    case 'cyl': return new THREE.CylinderGeometry(p[0] + t, p[1] + t, p[2] + 2 * t, p[3] || 12);
    case 'sph': return new THREE.SphereGeometry(p[0] + t, p[1] || 14, p[2] || 10);
    case 'cone': return new THREE.ConeGeometry(p[0] + t, p[1] + 3 * t, p[2] || 10);
    case 'cap': return new THREE.CapsuleGeometry(p[0] + t, p[1], 5, 12);
    case 'tor': return new THREE.TorusGeometry(p[0], p[1] + t, 8, p[2] || 20, p[3] || Math.PI * 2);
  }
  throw new Error('prim ' + kind);
}
const _c = new THREE.Color();
function mergeGeos(list, withColor) {
  let count = 0;
  const flat = list.map(g => { const n = g.index ? g.toNonIndexed() : g; count += n.attributes.position.count; return n; });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = withColor ? new Float32Array(count * 3) : null;
  let o = 0;
  for (const g of flat) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (col) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

/* A Shape gathers coloured primitives and becomes 2 draw calls: fill + ink shell. */
export class Shape {
  constructor() { this.fill = []; this.ink = []; }
  add(kind, p, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], ink = 0.045) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl));
    const g = prim(kind, p, 0).toNonIndexed(); g.applyMatrix4(m);
    _c.set(color);
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { c[k * 3] = _c.r; c[k * 3 + 1] = _c.g; c[k * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.fill.push(g);
    if (ink > 0) { const go = prim(kind, p, ink); go.applyMatrix4(m); this.ink.push(go); }
    return this;
  }
  /* a box or cylinder between two points */
  beam(a, b, r, color, ink = 0.045, seg = 10) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B), mid = A.clone().add(B).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return this.add('cyl', [r, r, len, seg], color, mid.toArray(), [e.x, e.y, e.z], [1, 1, 1], ink);
  }
  build(name) {
    const g = new THREE.Group(); if (name) g.name = name;
    if (this.fill.length) g.add(new THREE.Mesh(mergeGeos(this.fill, true), vcMat()));
    if (this.ink.length) g.add(new THREE.Mesh(mergeGeos(this.ink, false), inkMat()));
    this.fill.forEach(x => x.dispose()); this.ink.forEach(x => x.dispose());
    return g;
  }
}

const shade = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? '#ffffff' : '#000000'), Math.abs(k)).getHexString();

/* ---------- layout (local space: origin = centre, y 0 = ground, +z = player side) ---------- */
export const ST = {
  swings: { x: -6.5, z: -4.5, y: 5.6, L: 4.2, px: [-9.2, -7.4, -5.6, -3.8] },
  bars: { x0: 2.5, step: 1.15, n: 8, y: 4.2, lanes: [-6.6, -5.2, -3.8, -2.4], zc: -4.5, hang: 2.65 },
  spin: { x: -6, z: 5.5, r: 2.6, top: 0.5, ride: 2.3, ang: [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75] },
  sand: { x: 6, z: 5.5, top: 0.25, tx: [3.9, 5.3, 6.7, 8.1], tz: 6.5, fz: 4.9 },
  pad: { w: 25, d: 19 },
};

/* ---------- the playground itself (goes into the game group) ---------- */
export function buildStations() {
  const group = new THREE.Group(); group.name = 'playground-stations';
  const S = new Shape();
  /* soft rubber pad (the court) */
  S.add('box', [ST.pad.w, 0.12, ST.pad.d], '#3d7fd0', [0.5, -0.06, 0.5], [0, 0, 0], [1, 1, 1], 0);
  S.add('box', [ST.pad.w + 0.6, 0.16, 0.3], '#f1ece2', [0.5, -0.04, 0.5 - ST.pad.d / 2 - 0.15], [0, 0, 0], [1, 1, 1], 0.03);
  S.add('box', [ST.pad.w + 0.6, 0.16, 0.3], '#f1ece2', [0.5, -0.04, 0.5 + ST.pad.d / 2 + 0.15], [0, 0, 0], [1, 1, 1], 0.03);
  S.add('box', [0.3, 0.16, ST.pad.d], '#f1ece2', [0.5 - ST.pad.w / 2 - 0.15, -0.04, 0.5], [0, 0, 0], [1, 1, 1], 0.03);
  S.add('box', [0.3, 0.16, ST.pad.d], '#f1ece2', [0.5 + ST.pad.w / 2 + 0.15, -0.04, 0.5], [0, 0, 0], [1, 1, 1], 0.03);
  /* station floor marks */
  S.add('cyl', [3.3, 3.3, 0.02, 32], '#2f68b0', [ST.spin.x, 0.01, ST.spin.z], [0, 0, 0], [1, 1, 1], 0);

  /* swings: two A-frames + crossbar */
  const sw = ST.swings, red = '#ec3013';
  for (const x of [sw.px[0] - 1.5, sw.px[3] + 1.5]) {
    S.beam([x, 0, sw.z - 1.9], [x, sw.y, sw.z], 0.16, red);
    S.beam([x, 0, sw.z + 1.9], [x, sw.y, sw.z], 0.16, red);
    S.add('box', [0.2, 0.2, 2.2], red, [x, 1.6, sw.z]);
  }
  S.beam([sw.px[0] - 1.7, sw.y, sw.z], [sw.px[3] + 1.7, sw.y, sw.z], 0.18, red);

  /* monkey bars */
  const br = ST.bars, purple = '#7a4fd0', yel = '#ffd23a';
  const bx0 = br.x0 - 0.5, bx1 = br.x0 + br.step * (br.n - 1) + 0.5, z0 = br.zc - 2.9, z1 = br.zc + 2.9;
  for (const x of [bx0, bx1]) for (const z of [z0, z1]) S.add('cyl', [0.16, 0.18, br.y + 0.2, 10], purple, [x, (br.y + 0.2) / 2, z]);
  S.beam([bx0, br.y, z0], [bx1, br.y, z0], 0.15, purple);
  S.beam([bx0, br.y, z1], [bx1, br.y, z1], 0.15, purple);
  for (let k = 0; k < br.n; k++) { const x = br.x0 + k * br.step; S.beam([x, br.y, z0], [x, br.y, z1], 0.07, k === br.n - 1 ? red : yel, 0.035, 8); }
  /* start platform + finish mat */
  S.add('box', [1.2, 0.5, 6], '#f1ece2', [bx0 - 0.9, 0.25, br.zc]);
  S.add('box', [1.6, 0.06, 6], red, [bx1 + 1.1, 0.03, br.zc], [0, 0, 0], [1, 1, 1], 0);

  /* merry-go-round pedestal (the disc spins separately) */
  S.add('cyl', [0.7, 0.9, 0.22, 16], '#9aa0a6', [ST.spin.x, 0.11, ST.spin.z]);

  /* sandbox */
  const sd = ST.sand, wood = '#b5793a';
  S.add('box', [6.6, 0.45, 0.3], wood, [sd.x, 0.22, sd.z - 3.15]);
  S.add('box', [6.6, 0.45, 0.3], wood, [sd.x, 0.22, sd.z + 3.15]);
  S.add('box', [0.3, 0.45, 6.0], wood, [sd.x - 3.15, 0.22, sd.z]);
  S.add('box', [0.3, 0.45, 6.0], wood, [sd.x + 3.15, 0.22, sd.z]);
  S.add('box', [6.0, 0.25, 6.0], '#f1d9a0', [sd.x, 0.125, sd.z], [0, 0, 0], [1, 1, 1], 0);
  S.add('sph', [0.6, 12, 8], '#ead09a', [sd.x + 2.2, 0.2, sd.z + 2.3], [0, 0, 0], [1, 0.45, 1], 0);
  S.add('cyl', [0.22, 0.17, 0.32, 12], '#2bb3a3', [sd.x - 2.4, 0.4, sd.z + 2.4], [0.3, 0, 0.4]);
  group.add(S.build('static'));

  /* swing pivots */
  const swings = sw.px.map(x => {
    const pivot = new THREE.Group(); pivot.position.set(x, sw.y, sw.z);
    const P = new Shape();
    P.beam([-0.48, 0, 0], [-0.48, -sw.L, 0], 0.035, '#9aa0a6', 0.025, 6);
    P.beam([0.48, 0, 0], [0.48, -sw.L, 0], 0.035, '#9aa0a6', 0.025, 6);
    P.add('box', [1.1, 0.12, 0.55], yel, [0, -sw.L, 0]);
    pivot.add(P.build('swing'));
    group.add(pivot);
    return pivot;
  });

  /* bar hang pivots (fox hangs below) */
  const barPivots = br.lanes.map(z => { const p = new THREE.Group(); p.position.set(br.x0, br.y, z); group.add(p); return p; });

  /* merry-go-round disc */
  const disc = new THREE.Group(); disc.position.set(ST.spin.x, 0, ST.spin.z);
  const D = new Shape();
  D.add('cyl', [ST.spin.r, ST.spin.r, 0.3, 32], '#2bb3a3', [0, ST.spin.top - 0.15, 0]);
  for (let k = 0; k < 8; k++) D.add('box', [ST.spin.r * 1.98, 0.02, 0.06], '#1f8a7e', [0, ST.spin.top + 0.005, 0], [0, k * Math.PI / 8, 0], [1, 1, 1], 0);
  D.add('cyl', [0.22, 0.22, 1.9, 10], '#9aa0a6', [0, ST.spin.top + 0.95, 0]);
  D.add('sph', [0.32, 12, 8], red, [0, ST.spin.top + 1.95, 0]);
  const anchors = ST.spin.ang.map(a => {
    const an = new THREE.Group(); an.rotation.y = a; disc.add(an);
    const t = 0.45, hr = 1.5, hy = ST.spin.top + 1.7;
    const p1 = [Math.sin(a) * hr + Math.cos(a) * t, 0, Math.cos(a) * hr - Math.sin(a) * t];
    const p2 = [Math.sin(a) * hr - Math.cos(a) * t, 0, Math.cos(a) * hr + Math.sin(a) * t];
    D.beam([p1[0], ST.spin.top, p1[2]], [p1[0], hy, p1[2]], 0.06, yel, 0.03, 8);
    D.beam([p2[0], ST.spin.top, p2[2]], [p2[0], hy, p2[2]], 0.06, yel, 0.03, 8);
    D.beam([p1[0], hy, p1[2]], [p2[0], hy, p2[2]], 0.07, yel, 0.03, 8);
    return an;
  });
  disc.add(D.build('disc'));
  group.add(disc);

  /* sand: tower roots + buckets */
  const towers = sd.tx.map(x => { const t = new THREE.Group(); t.position.set(x, sd.top, sd.tz); group.add(t); return t; });

  return { group, swings, barPivots, disc, anchors, towers };
}

export function makeBucket(color = '#ec3013') {
  const S = new Shape();
  S.add('cyl', [0.36, 0.48, 0.5, 14], color, [0, 0.25, 0]);
  S.add('tor', [0.48, 0.035, 14], shade(color, -0.3), [0, 0.02, 0], [Math.PI / 2, 0, 0], [1, 1, 1], 0);
  return S.build('bucket');
}
export function makeLayer(k) {
  const S = new Shape(), s = Math.pow(0.95, k);
  S.add('cyl', [0.42 * s, 0.5 * s, 0.38, 14], k % 2 ? '#e2c27e' : '#ecd08f', [0, 0.19, 0]);
  return S.build('layer');
}
export function makeFlag() {
  const S = new Shape();
  S.add('cyl', [0.025, 0.025, 0.8, 6], '#f1ece2', [0, 0.4, 0], [0, 0, 0], [1, 1, 1], 0.02);
  S.add('box', [0.4, 0.26, 0.03], '#ec3013', [0.2, 0.65, 0], [0, 0, 0], [1, 1, 1], 0.02);
  return S.build('flag');
}

/* ---------- the town-free surroundings (standalone only, never in the group) ---------- */
export function buildEnv(scene, touch) {
  scene.background = new THREE.Color('#9fd6ff');
  scene.fog = new THREE.Fog('#9fd6ff', 45, 110);
  scene.add(new THREE.HemisphereLight('#e8f4ff', '#5a7d3a', 1.7));
  const sun = new THREE.DirectionalLight('#fff4dd', 2.3); sun.position.set(12, 25, 14); scene.add(sun);
  const E = new Shape();
  E.add('box', [160, 0.2, 160], '#7cc35a', [0, -0.22, 0], [0, 0, 0], [1, 1, 1], 0);
  E.add('box', [5, 0.04, 30], '#d9cdb4', [0.5, -0.1, 25], [0, 0, 0], [1, 1, 1], 0);
  const trees = touch ? 10 : 16;
  for (let k = 0; k < trees; k++) {
    const a = k / trees * Math.PI * 2 + 0.2, r = 21 + (k % 3) * 3.5;
    const x = Math.cos(a) * r * 1.15, z = Math.sin(a) * r;
    if (z > 12 && Math.abs(x) < 6) continue;
    const h = 3 + (k % 4) * 0.6;
    E.add('cyl', [0.3, 0.4, h, 8], '#8a5a34', [x, h / 2, z]);
    E.add('cone', [2.2, 3.6, 10], k % 2 ? '#3f9a4a' : '#4fb35a', [x, h + 1.4, z]);
    E.add('cone', [1.6, 2.8, 10], k % 2 ? '#4fb35a' : '#5fc46a', [x, h + 3.0, z]);
  }
  for (let k = 0; k < 9; k++) {
    const x = -12 + k * 3.2;
    E.add('sph', [0.9, 10, 8], '#4fa64a', [x, 0.4, -12], [0, 0, 0], [1.3, 0.8, 1]);
  }
  /* benches */
  for (const x of [-4, 5]) {
    E.add('box', [2.4, 0.12, 0.6], '#b5793a', [x, 0.6, 11.4]);
    E.add('box', [2.4, 0.5, 0.1], '#b5793a', [x, 0.95, 11.7]);
    E.add('box', [0.12, 0.6, 0.5], '#444', [x - 1, 0.3, 11.4]);
    E.add('box', [0.12, 0.6, 0.5], '#444', [x + 1, 0.3, 11.4]);
  }
  const env = E.build('env'); scene.add(env);
  return env;
}

/* ---------- foxes ---------- */
export function placeholderFox({ torso = ['#e8692c', '#fff1df', '#2b2d42'], outfit = 'tee' } = {}) {
  const [c1, c2, c3] = torso;
  const oc = shade(c3, 0.15);
  const root = new THREE.Group(); root.name = 'fox';
  const body = new THREE.Group(); body.position.y = 1.0; root.add(body);
  const T = new Shape();
  T.add('cap', [0.36, 0.45], c1, [0, 0.5, 0]);
  T.add('sph', [0.26, 12, 8], c2, [0, 0.55, 0.2], [0, 0, 0], [1, 1.25, 0.6], 0);
  if (outfit === 'dress') T.add('cone', [0.62, 0.8, 14], oc, [0, 0.25, 0], [0, 0, 0], [1, 1, 1], 0.03);
  else if (outfit === 'coat') { T.add('cyl', [0.4, 0.5, 0.85, 14], oc, [0, 0.4, 0], [0, 0, 0], [1, 1, 1], 0.03); T.add('box', [0.06, 0.7, 0.05], shade(oc, -0.4), [0, 0.42, 0.47], [0.1, 0, 0], [1, 1, 1], 0); }
  else if (outfit === 'vest') { T.add('cyl', [0.4, 0.42, 0.5, 14], oc, [0, 0.62, 0], [0, 0, 0], [1, 1, 1], 0.03); T.add('box', [0.18, 0.5, 0.06], c2, [0, 0.62, 0.38], [0, 0, 0], [1, 1, 1], 0); }
  else T.add('cyl', [0.39, 0.4, 0.42, 14], oc, [0, 0.62, 0], [0, 0, 0], [1, 1, 1], 0.03);
  body.add(T.build('torso'));

  const head = new THREE.Group(); head.position.y = 1.28; body.add(head);
  const H = new Shape();
  H.add('sph', [0.42, 16, 12], c1, [0, 0, 0]);
  H.add('sph', [0.22, 12, 10], c2, [0, -0.1, 0.32], [0, 0, 0], [1, 0.8, 1.25]);
  H.add('sph', [0.07, 8, 6], '#1a1626', [0, -0.04, 0.58], [0, 0, 0], [1, 1, 1], 0);
  H.add('cone', [0.17, 0.4, 8], c1, [-0.25, 0.42, -0.02], [0, 0, 0.35]);
  H.add('cone', [0.17, 0.4, 8], c1, [0.25, 0.42, -0.02], [0, 0, -0.35]);
  H.add('cone', [0.09, 0.24, 8], c2, [-0.24, 0.4, 0.06], [0, 0, 0.35], [1, 1, 1], 0);
  H.add('cone', [0.09, 0.24, 8], c2, [0.24, 0.4, 0.06], [0, 0, -0.35], [1, 1, 1], 0);
  H.add('sph', [0.055, 8, 6], '#1a1626', [-0.15, 0.08, 0.37], [0, 0, 0], [1, 1, 1], 0);
  H.add('sph', [0.055, 8, 6], '#1a1626', [0.15, 0.08, 0.37], [0, 0, 0], [1, 1, 1], 0);
  H.add('sph', [0.15, 10, 8], c2, [-0.28, -0.14, 0.22], [0, 0, 0], [1, 0.7, 0.6], 0);
  H.add('sph', [0.15, 10, 8], c2, [0.28, -0.14, 0.22], [0, 0, 0], [1, 0.7, 0.6], 0);
  head.add(H.build('head'));

  const arms = [-1, 1].map(s => {
    const a = new THREE.Group(); a.position.set(s * 0.47, 0.85, 0); body.add(a);
    const A = new Shape();
    A.add('cyl', [0.11, 0.1, 0.72, 8], outfit === 'coat' ? oc : c1, [0, -0.36, 0], [0, 0, 0], [1, 1, 1], 0.035);
    A.add('sph', [0.13, 10, 8], c2, [0, -0.8, 0], [0, 0, 0], [1, 1, 1], 0.035);
    a.add(A.build('arm')); return a;
  });
  const legs = [-1, 1].map(s => {
    const l = new THREE.Group(); l.position.set(s * 0.2, 1.0, 0); root.add(l);
    const L = new Shape();
    L.add('cyl', [0.14, 0.12, 0.82, 8], c3, [0, -0.44, 0], [0, 0, 0], [1, 1, 1], 0.035);
    L.add('sph', [0.17, 10, 8], shade(c3, -0.35), [0, -0.9, 0.08], [0, 0, 0], [1, 0.6, 1.4], 0.035);
    l.add(L.build('leg')); return l;
  });
  const tail = new THREE.Group(); tail.position.set(0, 1.0, -0.3); root.add(tail);
  const TL = new Shape();
  TL.add('cap', [0.17, 0.55], c1, [0, 0.1, -0.35], [-1.1, 0, 0]);
  TL.add('sph', [0.18, 10, 8], c2, [0, 0.36, -0.72], [0, 0, 0], [1, 1.1, 1]);
  tail.add(TL.build('tail'));
  root.userData.P = { body, head, arms, legs, tail };
  return root;
}

function makeChair() {
  const g = new THREE.Group(); g.name = 'hover-chair';
  const S = new Shape();
  S.add('cyl', [0.55, 0.5, 0.18, 18], '#22202a', [0, 0.86, 0]);
  S.add('box', [0.9, 0.9, 0.14], '#22202a', [0, 1.35, -0.48], [-0.15, 0, 0]);
  S.add('box', [0.12, 0.1, 0.7], '#3a3836', [-0.52, 1.08, -0.05]);
  S.add('box', [0.12, 0.1, 0.7], '#3a3836', [0.52, 1.08, -0.05]);
  S.add('cyl', [0.3, 0.16, 0.4, 12], '#3a3836', [0, 0.58, 0]);
  g.add(S.build('chair'));
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 24), new THREE.MeshBasicMaterial({ color: '#4ff0ff' }));
  glow.rotation.x = Math.PI / 2; glow.position.y = 0.36; g.add(glow);
  g.userData.glow = glow;
  return g;
}
function makeCane() {
  const S = new Shape();
  S.add('cyl', [0.03, 0.03, 1.5, 6], '#ffffff', [0, 0.75, 0], [0, 0, 0], [1, 1, 1], 0.02);
  S.add('cyl', [0.032, 0.032, 0.2, 6], '#ec3013', [0, 0.1, 0], [0, 0, 0], [1, 1, 1], 0.02);
  S.add('tor', [0.1, 0.03, 8, Math.PI], '#ffffff', [-0.1, 1.5, 0], [0, 0, 0], [1, 1, 1], 0.02);
  return S.build('cane');
}

const JOINTS = ['body', 'head', 'aL', 'aR', 'lL', 'lR'];
/* The adapter: the world's kit fox when given, else the placeholder. Same joints either way. */
export function makeFox(look, kit) {
  let f = null, fromKit = false;
  if (kit && typeof kit.makeFox === 'function') {
    try { f = kit.makeFox({ torso: look.torso, outfit: look.outfit || 'tee', mood: look.mood || 'happy' }); fromKit = true; } catch (e) { f = null; }
  }
  if (!f || !f.userData || !f.userData.P) { f = placeholderFox(look); fromKit = false; }
  const P = f.userData.P;
  const J = { body: P.body, head: P.head, aL: P.arms && P.arms[0], aR: P.arms && P.arms[1], lL: P.legs && P.legs[0], lR: P.legs && P.legs[1] };
  const R = {};
  for (const k of JOINTS) if (J[k]) R[k] = J[k].rotation.clone();
  f.userData.J = J; f.userData.R = R; f.userData.fromKit = fromKit;

  /* accessories on the head, placed from its bounds so they fit the kit fox too */
  if (J.head && (look.glasses || look.redEyes)) {
    f.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(J.head), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const r = Math.min(sz.x, sz.z) * 0.5;
    const eye = J.head.worldToLocal(new THREE.Vector3(c.x, c.y - sz.y * 0.08, c.z + r * 0.86));
    if (!fromKit) eye.set(0, 0.08, 0.38);
    if (look.glasses) {
      const G = new Shape();
      G.add('box', [0.62, 0.05, 0.05], '#111', [0, 0.04, 0], [0, 0, 0], [1, 1, 1], 0);
      G.add('box', [0.24, 0.15, 0.05], '#111', [-0.15, 0, 0.02], [0, 0, 0], [1, 1, 1], 0.015);
      G.add('box', [0.24, 0.15, 0.05], '#111', [0.15, 0, 0.02], [0, 0, 0], [1, 1, 1], 0.015);
      const g = G.build('glasses'); g.position.copy(eye); J.head.add(g);
    }
    if (look.redEyes) {
      const m = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), m); e.position.set(eye.x + s * 0.15, eye.y, eye.z + 0.01); J.head.add(e); }
    }
  }
  if (look.cane) { const c = makeCane(); c.position.set(0.62, 0, 0.3); c.rotation.z = -0.1; f.add(c); f.userData.cane = c; }
  if (look.chair) f.userData.chair = makeChair();
  /* blob shadow */
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.015; sh.renderOrder = 1;
  f.userData.shadow = sh;
  return f;
}

const Z = [0, 0, 0];
/* pose = { body:[x,y,z], head, aL, aR, lL, lR } offsets from rest. aL = arms[0], aR = arms[1]. */
export function setPose(f, pose) {
  const J = f.userData.J, R = f.userData.R;
  for (const k of JOINTS) {
    const o = J[k]; if (!o) continue;
    const p = pose[k] || Z, r = R[k];
    o.rotation.set(r.x + p[0], r.y + p[1], r.z + p[2]);
  }
}
export function walkPose(f, ph, amp = 1) {
  const s = Math.sin(ph) * amp;
  setPose(f, { lL: [0.6 * s, 0, 0], lR: [-0.6 * s, 0, 0], aL: [-0.5 * s, 0, -0.08], aR: [0.5 * s, 0, 0.08], body: [0.05 * amp, 0, 0] });
}

export function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (!isShared(m)) m.dispose(); });
  });
}
