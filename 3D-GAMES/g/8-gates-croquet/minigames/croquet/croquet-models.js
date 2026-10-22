/* 8 GATES 3D - CROQUET - toon materials, ink outlines, court, props and the fox adapter. */
import * as THREE from '../../vendor/three/three.module.js';
import { COURT, BALL_R, HOOPS, HOOP_HALF, LEG_R, PEG, TEE } from './croquet-rules.js';

export const INK = '#1a1626';
export const BALL_COLORS = ['#2f6fdb', '#e8341c', '#2a2730', '#f5c71a'];
export const BALL_NAMES = ['BLUE', 'RED', 'BLACK', 'YELLOW'];

/* ---------- materials ---------- */
let GRAD = null;
export function gradMap() {
  if (!GRAD) {
    const d = new Uint8Array([95, 95, 95, 255, 180, 180, 180, 255, 255, 255, 255, 255]);
    GRAD = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
    GRAD.generateMipmaps = false;
    GRAD.needsUpdate = true;
  }
  return GRAD;
}
export function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial({ color: color == null ? 0xffffff : color, gradientMap: gradMap(), ...extra });
}
export function toonVC(extra = {}) { return toon(0xffffff, { vertexColors: true, ...extra }); }

const outlineCache = new Map();
export function outlineMat(thick = 0.03) {
  const k = thick.toFixed(4);
  if (!outlineCache.has(k)) {
    outlineCache.set(k, new THREE.ShaderMaterial({
      uniforms: { thick: { value: thick }, ink: { value: new THREE.Color(INK) } },
      vertexShader: 'uniform float thick; void main(){ vec3 p = position + normalize(normal) * thick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 ink; void main(){ gl_FragColor = vec4(ink, 1.0); \n#include <colorspace_fragment>\n }',
      side: THREE.BackSide,
    }));
  }
  return outlineCache.get(k);
}
/* mesh + back-face ink shell as a child */
export function inked(geo, mat, thick = 0.03) {
  const m = new THREE.Mesh(geo, mat);
  if (thick > 0) { const o = new THREE.Mesh(geo, outlineMat(thick)); o.raycast = () => {}; m.add(o); }
  return m;
}

/* ---------- geometry merge (position, normal, color) ---------- */
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
export function merge(parts) {
  const geos = parts.map(({ geo, m, color }) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    return { g, c: new THREE.Color(color) };
  });
  let n = 0;
  for (const { g } of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const { g, c } of geos) {
    const P = g.attributes.position.array, N = g.attributes.normal.array, cnt = g.attributes.position.count;
    pos.set(P, o * 3); nor.set(N, o * 3);
    for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += cnt; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
const G = {
  sph: (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h),
  cyl: (r1, r2, h, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s),
  cap: (r, l, s = 10) => new THREE.CapsuleGeometry(r, l, 4, s),
  cone: (r, h, s = 12) => new THREE.ConeGeometry(r, h, s),
  box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
};

/* ---------- court (the playable object: goes into the game group) ---------- */
const MARGIN = 1.3;
function lawnTexture() {
  const W = COURT.hw * 2 + MARGIN * 2, L = COURT.hl * 2 + MARGIN * 2;
  const cw = 512, ch = Math.round(cw * L / W);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  const X = x => (x + W / 2) / W * cw, Z = z => (z + L / 2) / L * ch, S = v => v / W * cw;
  g.fillStyle = '#5fae3f'; g.fillRect(0, 0, cw, ch);
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = i % 2 ? '#6cbd48' : '#5cab3c';
    const z0 = -COURT.hl + i * (COURT.hl * 2 / bands);
    g.fillRect(X(-COURT.hw), Z(z0), S(COURT.hw * 2), S(COURT.hl * 2 / bands) + 1);
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = S(0.09);
  g.strokeRect(X(-COURT.hw), Z(-COURT.hl), S(COURT.hw * 2), S(COURT.hl * 2));
  /* tee spot */
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.arc(X(TEE.x), Z(TEE.z), S(0.12), 0, Math.PI * 2); g.fill();
  /* hoop numbers + running direction */
  g.font = '800 ' + Math.round(S(0.62)) + 'px Archivo, Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  HOOPS.forEach((h, i) => {
    const side = h.x >= 0 ? -1 : 1;
    const nx = h.x + side * 1.05, nz = h.z;
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(String(i + 1), X(nx), Z(nz - 0.05));
    /* small chevron showing the run direction */
    const cz = h.z - h.dir * 0.95;
    g.beginPath();
    g.moveTo(X(h.x - 0.22), Z(cz - h.dir * 0.12));
    g.lineTo(X(h.x), Z(cz + h.dir * 0.12));
    g.lineTo(X(h.x + 0.22), Z(cz - h.dir * 0.12));
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = S(0.06); g.stroke();
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { tex: t, W, L };
}

export function buildCourt(root) {
  const { tex, W, L } = lawnTexture();
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(W, L), toon(0xffffff, { map: tex }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.name = 'lawn';
  root.add(lawn);

  /* fixtures: hoops, peg, corner flags: one merged mesh */
  const parts = [];
  const HH = 0.62;
  HOOPS.forEach((h, i) => {
    for (const s of [-1, 1]) parts.push({ geo: G.cyl(LEG_R, LEG_R, HH, 8), m: M(h.x + s * HOOP_HALF, HH / 2, h.z), color: '#f4f1ea' });
    parts.push({ geo: G.cyl(LEG_R, LEG_R, HOOP_HALF * 2 + LEG_R * 2, 8), m: M(h.x, HH, h.z, 0, 0, Math.PI / 2), color: i === 0 ? '#2f6fdb' : i === 5 ? '#e8341c' : '#f4f1ea' });
  });
  const band = ['#2f6fdb', '#e8341c', '#2a2730', '#f5c71a'];
  band.forEach((c, i) => parts.push({ geo: G.cyl(PEG.r, PEG.r, 0.16, 14), m: M(PEG.x, 0.08 + i * 0.16, PEG.z), color: c }));
  parts.push({ geo: G.cyl(PEG.r, PEG.r * 0.7, 0.14, 14), m: M(PEG.x, 0.71, PEG.z), color: '#f4f1ea' });
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  corners.forEach(([sx, sz], i) => {
    const x = sx * COURT.hw, z = sz * COURT.hl;
    parts.push({ geo: G.cyl(0.03, 0.03, 0.9, 6), m: M(x, 0.45, z), color: '#f4f1ea' });
    parts.push({ geo: G.cone(0.16, 0.3, 4), m: M(x + 0.14 * -sx, 0.78, z, 0, 0, Math.PI / 2 * sx), color: band[i] });
  });
  const fixtures = inked(merge(parts), toonVC(), 0.025);
  fixtures.name = 'fixtures';
  root.add(fixtures);
  return { lawn, fixtures };
}

/* ---------- standalone garden (never added to the world's group) ---------- */
export function buildGarden(scene, { touch = false } = {}) {
  scene.background = new THREE.Color('#a9dcf2');
  scene.fog = new THREE.Fog('#a9dcf2', 30, 85);
  const hemi = new THREE.HemisphereLight('#e8f6ff', '#4c7a35', 1.6);
  const sun = new THREE.DirectionalLight('#fff4dc', 2.4);
  sun.position.set(-8, 14, 6);
  scene.add(hemi, sun);

  const parts = [];
  /* gravel path and outer lawn */
  const W = COURT.hw * 2 + MARGIN * 2, L = COURT.hl * 2 + MARGIN * 2;
  parts.push({ geo: G.box(W + 2.2, 0.04, L + 2.2), m: M(0, -0.03, 0), color: '#d8c9a2' });
  parts.push({ geo: new THREE.CylinderGeometry(70, 70, 0.04, 40), m: M(0, -0.06, 0), color: '#4f9a3a' });
  /* hedges built from blobs so the ink line stays smooth */
  const hedge = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 1.1);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      const s = 0.9 + ((i * 37) % 7) / 30;
      parts.push({ geo: G.sph(0.85, 10, 8), m: M(x, 0.75, z, 0, 0, 0, s, 1.05 * s, s), color: i % 2 ? '#2f7d36' : '#358a3b' });
    }
  };
  const hx = COURT.hw + MARGIN + 2.4, hz = COURT.hl + MARGIN + 2.4;
  hedge(-hx, -hz, hx, -hz);
  hedge(-hx, -hz, -hx, hz - 4);
  hedge(hx, -hz, hx, hz - 4);
  /* flowers in front of the far hedge */
  const fl = ['#ff7aa8', '#ffd23a', '#ffffff', '#ff9a3c', '#b48cff'];
  for (let i = 0; i < 26; i++) {
    const x = -hx + 1.2 + i * ((hx * 2 - 2.4) / 25);
    parts.push({ geo: G.sph(0.16, 8, 6), m: M(x, 0.2, -hz + 1.15 + ((i * 13) % 5) * 0.08), color: fl[i % fl.length] });
  }
  /* trees */
  const trees = [[-15, -16], [-6, -19], [7, -18], [16, -14], [-18, 2], [18, 4], [-17, 13], [17, 15]];
  trees.forEach(([x, z], i) => {
    const s = 1 + (i % 3) * 0.18;
    parts.push({ geo: G.cyl(0.32, 0.42, 2.6, 8), m: M(x, 1.3, z, 0, 0, 0, s), color: '#8a5a36' });
    parts.push({ geo: G.sph(2.0, 12, 9), m: M(x, 3.6 * s, z, 0, 0, 0, s), color: i % 2 ? '#3f9a45' : '#4aa84c' });
    parts.push({ geo: G.sph(1.4, 12, 9), m: M(x + 0.8, 4.9 * s, z - 0.3, 0, 0, 0, s), color: '#56b556' });
  });
  /* a garden bench on each side */
  for (const s of [-1, 1]) {
    const x = s * (COURT.hw + MARGIN + 1.0);
    parts.push({ geo: G.box(0.7, 0.12, 3.2), m: M(x, 0.62, 3), color: '#c98a4b' });
    parts.push({ geo: G.box(0.12, 0.8, 3.2), m: M(x + s * 0.32, 1.05, 3), color: '#c98a4b' });
    for (const dz of [-1.4, 1.4]) parts.push({ geo: G.box(0.6, 0.6, 0.12), m: M(x, 0.3, 3 + dz), color: '#6b4a2e' });
  }
  const env = inked(merge(parts), toonVC(), touch ? 0 : 0.035);
  env.name = 'garden';
  scene.add(env);
  return env;
}

/* ---------- balls, mallets, markers ---------- */
export function makeBall(color) {
  const geo = new THREE.SphereGeometry(BALL_R, 22, 16);
  const base = new THREE.Color(color), light = base.clone().lerp(new THREE.Color('#ffffff'), 0.45);
  const n = geo.attributes.normal, col = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const band = Math.abs(n.getX(i)) < 0.14;
    const c = band ? light : base;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const g = new THREE.Group();
  const m = inked(geo, toonVC(), 0.022);
  m.position.y = BALL_R;
  g.add(m);
  g.userData.spinMesh = m;
  return g;
}

export function makeMallet(color, len = 0.92) {
  const parts = [
    { geo: G.cyl(0.032, 0.032, len, 8), m: M(0, -len / 2, 0), color: '#b07a43' },
    { geo: G.cyl(0.04, 0.04, 0.16, 8), m: M(0, -0.08, 0), color: '#2a2730' },
    { geo: G.cyl(0.105, 0.105, 0.42, 14), m: M(0, -len, 0, Math.PI / 2, 0, 0), color: color },
    { geo: G.cyl(0.11, 0.11, 0.04, 14), m: M(0, -len, 0.21, Math.PI / 2, 0, 0), color: '#e2c26b' },
    { geo: G.cyl(0.11, 0.11, 0.04, 14), m: M(0, -len, -0.21, Math.PI / 2, 0, 0), color: '#e2c26b' },
  ];
  const pivot = new THREE.Group();
  pivot.add(inked(merge(parts), toonVC(), 0.02));
  pivot.userData.len = len;
  return pivot;
}

let SHADOW_TEX = null;
export function makeShadow(size) {
  if (!SHADOW_TEX) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(20,22,30,0.55)'); gr.addColorStop(1, 'rgba(20,22,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    SHADOW_TEX = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.renderOrder = 1;
  return m;
}

export function makeAimGuide() {
  const g = new THREE.Group();
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.06, 10),
    new THREE.MeshBasicMaterial({ color: '#ffd23a', depthWrite: false, transparent: true }), 16);
  dots.frustumCulled = false;
  const tri = new THREE.Shape();
  tri.moveTo(0, 0.22); tri.lineTo(-0.16, -0.06); tri.lineTo(0.16, -0.06); tri.lineTo(0, 0.22);
  const head = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: '#ffd23a', depthWrite: false, transparent: true }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(BALL_R + 0.07, BALL_R + 0.14, 28),
    new THREE.MeshBasicMaterial({ color: '#ffd23a', depthWrite: false, transparent: true }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
  g.add(dots, head, ring);
  g.userData = { dots, head, ring };
  [dots, head, ring].forEach(o => { o.renderOrder = 2; });
  return g;
}

export function makeTargetMarker() {
  const g = new THREE.Group();
  const gem = inked(new THREE.OctahedronGeometry(0.2, 0), toon('#ffd23a'), 0.025);
  gem.position.y = 1.3;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.66, 32),
    new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.renderOrder = 2;
  g.add(gem, ring);
  g.userData = { gem, ring };
  return g;
}

/* ---------- foxes ---------- */
/* Placeholder fox with the same joints as the world's kit fox: userData.P = { body, head, arms[2], legs[2] }.
   Faces +z, about 2.8 units tall. */
function placeholderFox({ torso = ['#e8743b', '#fff3e0', '#3a6ea5'], outfit = 'vest', legs = null, eyes = '#1a1626' } = {}) {
  const fur = torso[0], belly = torso[1] || '#fff3e0', cloth = torso[2] || '#3a6ea5';
  const legC = legs || fur;
  const root = new THREE.Group();
  const T = 0.028;
  /* body */
  const bp = [
    { geo: G.cap(0.4, 0.45, 12), m: M(0, 1.45, 0), color: fur },
    { geo: G.sph(1, 12, 10), m: M(0, 1.38, 0.27, 0, 0, 0, 0.27, 0.4, 0.14), color: belly },
    { geo: G.sph(1, 12, 10), m: M(0, 1.12, -0.55, -0.75, 0, 0, 0.22, 0.22, 0.52), color: fur },
  ];
  if (outfit === 'coat') bp.push({ geo: G.cyl(0.43, 0.5, 1.0, 16), m: M(0, 1.35, 0), color: cloth });
  else if (outfit === 'dress') bp.push({ geo: G.cyl(0.38, 0.62, 0.95, 16), m: M(0, 1.25, 0), color: cloth });
  else if (outfit === 'tee') bp.push({ geo: G.cyl(0.425, 0.43, 0.5, 16), m: M(0, 1.62, 0), color: cloth });
  else bp.push({ geo: G.cyl(0.425, 0.44, 0.55, 16), m: M(0, 1.5, -0.02), color: cloth });
  const body = inked(merge(bp), toonVC(), T);
  root.add(body);
  /* head */
  const head = new THREE.Group(); head.position.set(0, 2.3, 0);
  const hp = [
    { geo: G.sph(0.4, 16, 12), m: M(0, 0, 0, 0, 0, 0, 1, 0.92, 1), color: fur },
    { geo: G.cone(0.2, 0.42, 12), m: M(0, -0.09, 0.44, Math.PI / 2, 0, 0), color: belly },
    { geo: G.sph(0.065, 8, 6), m: M(0, -0.09, 0.66), color: '#1a1626' },
    { geo: G.sph(1, 10, 8), m: M(0, -0.14, 0.2, 0, 0, 0, 0.3, 0.18, 0.2), color: belly },
    { geo: G.cone(0.17, 0.4, 10), m: M(-0.24, 0.4, -0.03, 0, 0, 0.35), color: fur },
    { geo: G.cone(0.17, 0.4, 10), m: M(0.24, 0.4, -0.03, 0, 0, -0.35), color: fur },
    { geo: G.cone(0.08, 0.2, 8), m: M(-0.27, 0.48, -0.02, 0, 0, 0.35), color: '#3a2a22' },
    { geo: G.cone(0.08, 0.2, 8), m: M(0.27, 0.48, -0.02, 0, 0, -0.35), color: '#3a2a22' },
  ];
  const headMesh = inked(merge(hp), toonVC(), T);
  head.add(headMesh);
  const eyeParts = [
    { geo: G.sph(0.058, 8, 6), m: M(-0.15, 0.07, 0.34), color: eyes },
    { geo: G.sph(0.058, 8, 6), m: M(0.15, 0.07, 0.34), color: eyes },
  ];
  const eyeMat = eyes === '#1a1626' ? toonVC() : new THREE.MeshBasicMaterial({ vertexColors: true });
  head.add(new THREE.Mesh(merge(eyeParts), eyeMat));
  root.add(head);
  /* limbs */
  const limb = (x, y, len, r, c, paw) => {
    const pv = new THREE.Group(); pv.position.set(x, y, 0);
    const lp = [
      { geo: G.cap(r, len, 8), m: M(0, -(len / 2 + r), 0), color: c },
      { geo: G.sph(1, 10, 8), m: M(0, -(len + r * 1.6), paw ? 0.0 : 0.07, 0, 0, 0, r * 1.15, r * 0.9, paw ? r * 1.15 : r * 1.6), color: '#3a2a22' },
    ];
    pv.add(inked(merge(lp), toonVC(), T * 0.8));
    root.add(pv);
    return pv;
  };
  const legsArr = [limb(-0.2, 0.92, 0.55, 0.14, legC, false), limb(0.2, 0.92, 0.55, 0.14, legC, false)];
  const armsArr = [limb(-0.5, 1.88, 0.48, 0.11, fur, true), limb(0.5, 1.88, 0.48, 0.11, fur, true)];
  root.userData.P = { body, head, arms: armsArr, legs: legsArr };
  root.userData.placeholder = true;
  return root;
}

function placeholderAnim(fox, dt, speed) {
  const u = fox.userData;
  u.t = (u.t || 0) + dt * (speed > 0.05 ? 6 + speed * 2 : 1.6);
  const P = u.P;
  if (speed > 0.05) {
    const a = Math.sin(u.t) * Math.min(0.75, 0.3 + speed * 0.12);
    P.legs[0].rotation.x = a; P.legs[1].rotation.x = -a;
    P.arms[0].rotation.x = -a * 0.8; P.arms[1].rotation.x = a * 0.8;
    P.body.position.y = Math.abs(Math.cos(u.t)) * 0.05;
  } else {
    P.legs[0].rotation.x *= 0.8; P.legs[1].rotation.x *= 0.8;
    P.arms[0].rotation.x *= 0.85; P.arms[1].rotation.x *= 0.85;
    P.body.position.y = Math.sin(u.t) * 0.015;
  }
  P.head.rotation.z = Math.sin(u.t * 0.5) * 0.04;
}

/* THE ADAPTER: every fox in the game is made and animated through these two calls. */
export function makeFox(opts, kit) {
  if (kit && typeof kit.makeFox === 'function') {
    const f = kit.makeFox({ torso: opts.torso, outfit: opts.outfit, mood: opts.mood });
    f.userData.kitFox = true;
    if (opts.legs && f.userData.P) tintGroup(f.userData.P.legs, opts.legs);
    if (opts.eyes && opts.eyes !== '#1a1626') addKitEyes(f, opts.eyes);
    return f;
  }
  return placeholderFox(opts);
}
export function animFox(fox, dt, speed, kit) {
  if (fox.userData.kitFox && kit && typeof kit.animFox === 'function') kit.animFox(fox, dt, speed);
  else if (fox.userData.P) placeholderAnim(fox, dt, speed);
}

function tintGroup(list, color) {
  for (const o of list) o.traverse(m => {
    if (m.isMesh && m.material && m.material.color && !(m.material.isShaderMaterial)) {
      m.material = m.material.clone(); m.material.color.set(color);
    }
  });
}

/* front-of-head point in the head's own space (works for kit foxes too) */
function headFront(fox) {
  const head = fox.userData.P && fox.userData.P.head;
  if (!head) return null;
  fox.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(head);
  const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const front = new THREE.Vector3(c.x, c.y + sz.y * 0.08, c.z).applyMatrix4(inv);
  const r = Math.max(sz.x, sz.z) * 0.5;
  return { head, front, r };
}
function addKitEyes(fox, color) {
  const h = headFront(fox); if (!h) return;
  const geo = merge([
    { geo: G.sph(0.06, 8, 6), m: M(-0.15, h.front.y, h.front.z + h.r * 0.85), color },
    { geo: G.sph(0.06, 8, 6), m: M(0.15, h.front.y, h.front.z + h.r * 0.85), color },
  ]);
  h.head.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true })));
}

/* HOPE: sunglasses + white cane */
export function addSunglasses(fox) {
  const P = fox.userData.P; if (!P) return;
  let y = 0.07, z = 0.37, head = P.head;
  if (fox.userData.kitFox) { const h = headFront(fox); if (!h) return; y = h.front.y; z = h.front.z + h.r * 0.9; head = h.head; }
  const geo = merge([
    { geo: G.box(0.2, 0.13, 0.05), m: M(-0.15, y, z), color: '#121018' },
    { geo: G.box(0.2, 0.13, 0.05), m: M(0.15, y, z), color: '#121018' },
    { geo: G.box(0.12, 0.03, 0.03), m: M(0, y + 0.03, z), color: '#121018' },
  ]);
  head.add(new THREE.Mesh(geo, toonVC()));
}
export function makeCane() {
  const g = inked(merge([
    { geo: G.cyl(0.025, 0.025, 1.5, 8), m: M(0, 0.75, 0), color: '#f7f7f2' },
    { geo: G.cyl(0.027, 0.027, 0.2, 8), m: M(0, 0.1, 0), color: '#e8341c' },
    { geo: G.cyl(0.03, 0.03, 0.18, 8), m: M(0, 1.48, 0), color: '#2a2730' },
  ]), toonVC(), 0.015);
  return g;
}
/* NOBLE: a futuristic hover chair */
export function makeChair() {
  const g = new THREE.Group();
  const body = inked(merge([
    { geo: G.cyl(0.62, 0.5, 0.26, 20), m: M(0, 1.05, 0), color: '#2b2d42' },
    { geo: G.box(1.0, 1.1, 0.2), m: M(0, 1.65, -0.55, -0.12, 0, 0), color: '#2b2d42' },
    { geo: G.box(0.14, 0.32, 0.8), m: M(-0.56, 1.32, -0.05), color: '#3d405b' },
    { geo: G.box(0.14, 0.32, 0.8), m: M(0.56, 1.32, -0.05), color: '#3d405b' },
    { geo: G.cyl(0.18, 0.32, 0.5, 14), m: M(0, 0.72, 0), color: '#3d405b' },
  ]), toonVC(), 0.03);
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 28), new THREE.MeshBasicMaterial({ color: '#3ae7ff' }));
  glow.rotation.x = Math.PI / 2; glow.position.y = 0.42;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.05, 0.4, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: '#3ae7ff', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 0.2;
  g.add(body, glow, beam);
  g.userData.glow = glow;
  return g;
}
