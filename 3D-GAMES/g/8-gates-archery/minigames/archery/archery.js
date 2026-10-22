/* 8 GATES 3D · ARCHERY RANGE · game module (scene, rules flow, camera, input)
   Standalone: makes its own renderer inside `container`.
   World mode: opts.world = { renderer, camera, parent } — builds into a Group under parent, never renders. */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './archery-rules.js';
import { createAudio } from './archery-audio.js';

export const GAME = { key: 'archeryRange', name: 'ARCHERY', maxPlayers: 4 };

const V3 = THREE.Vector3;
const INK = 0x1a1626;
const UP = new V3(0, 1, 0);
const DOWN = new V3(0, -1, 0);
const LINE_Z = 15;            /* shooting line */
const FACE_Y = 1.7;           /* centre height of the target face */
const BOSS = 2.7;             /* straw boss size */
const AIM_MAX = 2.1;
const DRAW_TIME = 0.85;       /* seconds to full draw */
const OVERDRAW = 2.4;         /* seconds at full draw before arms shake */
const GIVE_OUT = 5.0;         /* seconds at full draw before the arrow slips */
const ARROW_SCALE = 1.2;
const ARROW_LEN = 1.14 * ARROW_SCALE;
const SHOOT_SPOT = new V3(0, 0, LINE_Z + 0.35);

/* ------------------------------------------------------------------ */
/* geometry helpers: merge many parts into one vertex-coloured mesh   */
/* ------------------------------------------------------------------ */
function mergeParts(list) {
  const gs = list.map(({ geo, color, m }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    return { g, color };
  });
  let n = 0;
  for (const { g } of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const { g, color } of gs) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < c; i++) { const k = (o + i) * 3; col[k] = color.r; col[k + 1] = color.g; col[k + 2] = color.b; }
    o += c;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

function inflate(geo, w) {
  const p = geo.attributes.position.array.slice();
  const nm = geo.attributes.normal.array;
  for (let i = 0; i < p.length; i++) p[i] += nm[i] * w;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.computeBoundingSphere();
  return g;
}

class Parts {
  constructor() { this.list = []; }
  add(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
    const m = new THREE.Matrix4().compose(
      new V3(p[0], p[1], p[2]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])),
      new V3(s[0], s[1], s[2]));
    this.list.push({ geo, color: new THREE.Color(color), m });
    return this;
  }
  build(M, outline = 0.035, shadow = false) {
    const geo = mergeParts(this.list);
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(geo, M.toonVC);
    mesh.castShadow = shadow;
    g.add(mesh);
    if (outline > 0) g.add(new THREE.Mesh(inflate(geo, outline), M.ink));
    g.userData.mesh = mesh;
    return g;
  }
}

function makeMaterials() {
  const grad = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.generateMipmaps = false;
  grad.needsUpdate = true;
  const cache = new Map();
  return {
    grad,
    toonVC: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad }),
    ink: new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }),
    string: new THREE.LineBasicMaterial({ color: 0xf4f1ea }),
    toon(color, extra) {
      const k = color + (extra ? JSON.stringify(extra) : '');
      if (!cache.has(k)) cache.set(k, new THREE.MeshToonMaterial({ color, gradientMap: grad, ...(extra || {}) }));
      return cache.get(k);
    },
  };
}

/* ------------------------------------------------------------------ */
/* foxes: adapter over opts.kit with a simple placeholder fallback     */
/* ------------------------------------------------------------------ */
function placeholderFox(M, o, shadow) {
  const [c1, c2, c3] = o.torso || ['#ec3013', '#ffd23a', '#2b2a33'];
  const fur = '#ef7a2d', cream = '#fff3e2', dark = '#2a1d1a';
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1.0; root.add(body);

  const bp = new Parts();
  bp.add(new THREE.CapsuleGeometry(0.42, 0.5, 6, 14), c1, [0, 0.56, 0]);
  bp.add(new THREE.SphereGeometry(0.3, 14, 10), c2, [0, 0.52, 0.26], [0, 0, 0], [1, 1.25, 0.55]);
  if (o.outfit === 'coat') bp.add(new THREE.CylinderGeometry(0.47, 0.56, 0.55, 14), c1, [0, 0.12, 0]);
  if (o.outfit === 'dress') bp.add(new THREE.ConeGeometry(0.66, 0.75, 14), c1, [0, 0.12, 0]);
  if (o.outfit === 'vest') bp.add(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 14), c2, [0, 0.2, 0]);
  bp.add(new THREE.CapsuleGeometry(0.2, 0.55, 6, 10), fur, [0, 0.02, -0.5], [-1.0, 0, 0]);
  bp.add(new THREE.SphereGeometry(0.21, 10, 8), cream, [0, 0.24, -0.85]);
  body.add(bp.build(M, 0.035, shadow));

  const head = new THREE.Group(); head.position.y = 1.2; body.add(head);
  const hp = new Parts();
  hp.add(new THREE.SphereGeometry(0.44, 18, 14), fur, [0, 0, 0], [0, 0, 0], [1, 0.95, 1]);
  hp.add(new THREE.ConeGeometry(0.21, 0.44, 14), cream, [0, -0.1, 0.44], [Math.PI / 2, 0, 0]);
  hp.add(new THREE.SphereGeometry(0.075, 10, 8), dark, [0, -0.1, 0.67]);
  for (const sx of [1, -1]) {
    hp.add(new THREE.SphereGeometry(0.2, 12, 10), cream, [0.2 * sx, -0.16, 0.22]);
    hp.add(new THREE.ConeGeometry(0.17, 0.42, 10), fur, [0.26 * sx, 0.42, -0.02], [0, 0, -0.35 * sx]);
    hp.add(new THREE.ConeGeometry(0.09, 0.26, 8), dark, [0.25 * sx, 0.4, 0.05], [0, 0, -0.35 * sx]);
    hp.add(new THREE.SphereGeometry(0.068, 10, 8), o.eyes || dark, [0.16 * sx, 0.06, 0.37]);
  }
  if (o.glasses) {
    hp.add(new THREE.BoxGeometry(0.64, 0.05, 0.05), '#111111', [0, 0.09, 0.41]);
    for (const sx of [1, -1]) hp.add(new THREE.BoxGeometry(0.22, 0.15, 0.06), '#111111', [0.15 * sx, 0.05, 0.42]);
  }
  head.add(hp.build(M, 0.03, shadow));

  const arms = [1, -1].map((sx) => {
    const a = new THREE.Group(); a.position.set(0.53 * sx, 0.86, 0); body.add(a);
    const ap = new Parts();
    ap.add(new THREE.CapsuleGeometry(0.13, 0.42, 5, 10), c1, [0, -0.33, 0]);
    ap.add(new THREE.SphereGeometry(0.15, 10, 8), fur, [0, -0.72, 0]);
    a.add(ap.build(M, 0.03, shadow));
    return a;
  });
  const legs = [1, -1].map((sx) => {
    const l = new THREE.Group(); l.position.set(0.2 * sx, 1.0, 0); root.add(l);
    const lp = new Parts();
    lp.add(new THREE.CapsuleGeometry(0.16, 0.5, 5, 10), c3, [0, -0.45, 0]);
    lp.add(new THREE.SphereGeometry(0.17, 10, 8), '#3b2a24', [0, -0.92, 0.08], [0, 0, 0], [1, 0.55, 1.5]);
    l.add(lp.build(M, 0.03, shadow));
    return l;
  });
  root.userData.P = { body, head, arms, legs };
  root.userData.armLen = 0.74;
  root.userData.placeholder = true;
  return root;
}

function placeholderAnim(fox, dt, speed, t) {
  const P = fox.userData.P, ud = fox.userData;
  ud.ph = (ud.ph || 0) + dt * speed * 3.0;
  const s = Math.min(1, speed / 2.5);
  const sw = Math.sin(ud.ph);
  P.legs[0].rotation.set(sw * 0.6 * s, 0, 0);
  P.legs[1].rotation.set(-sw * 0.6 * s, 0, 0);
  P.arms[0].rotation.set(-sw * 0.5 * s, 0, 0.08);
  P.arms[1].rotation.set(sw * 0.5 * s, 0, -0.08);
  P.body.position.y = 1.0 + Math.abs(sw) * 0.06 * s + Math.sin(t * 2.1 + (ud.seed || 0)) * 0.012;
}

function makeFox(kit, M, look, shadow) {
  if (kit && typeof kit.makeFox === 'function') {
    try {
      const f = kit.makeFox({ torso: look.torso, outfit: look.outfit, mood: look.mood || 'happy' });
      if (f && f.userData && f.userData.P) {
        f.userData.kit = true;
        f.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(f.userData.P.arms[0]);
        f.userData.armLen = Math.max(0.4, (b.max.y - b.min.y) * 0.9);
        return f;
      }
    } catch (e) { /* fall back to the placeholder */ }
  }
  return placeholderFox(M, look, shadow);
}

function animFox(kit, fox, dt, speed, t) {
  if (fox.userData.kit && kit && typeof kit.animFox === 'function') kit.animFox(fox, dt, speed);
  else placeholderAnim(fox, dt, speed, t);
}

function buildChair(M) {
  const p = new Parts();
  p.add(new THREE.CylinderGeometry(0.55, 0.66, 0.18, 20), '#2b2f3a', [0, 0.32, 0]);
  p.add(new THREE.CylinderGeometry(0.13, 0.13, 0.45, 10), '#2b2f3a', [0, 0.62, 0]);
  p.add(new THREE.BoxGeometry(0.96, 0.16, 0.9), '#e9edf5', [0, 0.86, 0.05]);
  p.add(new THREE.BoxGeometry(0.96, 1.1, 0.14), '#e9edf5', [0, 1.45, -0.42], [-0.12, 0, 0]);
  for (const sx of [1, -1]) p.add(new THREE.BoxGeometry(0.12, 0.12, 0.8), '#2b2f3a', [0.52 * sx, 1.18, 0.05]);
  const g = p.build(M, 0.035);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0x39e6ff }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
  return g;
}

function buildCane(M) {
  const p = new Parts();
  p.add(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 8), '#f4f1ea', [0, 0.68, 0]);
  p.add(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 8), '#ec3013', [0, 0.09, 0]);
  p.add(new THREE.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), '#f4f1ea', [0.1, 1.35, 0]);
  return p.build(M, 0.015);
}

function buildBow(M) {
  const curve = new THREE.CatmullRomCurve3([
    new V3(0, 0.85, -0.32), new V3(0, 0.45, -0.06), new V3(0, 0, 0), new V3(0, -0.45, -0.06), new V3(0, -0.85, -0.32)]);
  const p = new Parts();
  p.add(new THREE.TubeGeometry(curve, 24, 0.042, 6), '#8a4b2a');
  p.add(new THREE.BoxGeometry(0.1, 0.32, 0.13), '#2a1d1a');
  const g = p.build(M, 0.018);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.85, -0.32, 0, 0, -0.32, 0, -0.85, -0.32]), 3));
  g.add(new THREE.Line(sg, M.string));
  g.userData.string = sg;
  return g;
}

function arrowGeo(color) {
  const p = new Parts();
  p.add(new THREE.CylinderGeometry(0.024, 0.024, 1.0, 6), '#f2e6cf', [0, 0, -0.6], [Math.PI / 2, 0, 0]);
  p.add(new THREE.ConeGeometry(0.055, 0.17, 8), '#4a4a55', [0, 0, -0.085], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.0944;
    p.add(new THREE.BoxGeometry(0.012, 0.11, 0.24), color, [Math.sin(a) * 0.06, Math.cos(a) * 0.06, -1.0], [0, 0, -a]);
  }
  p.add(new THREE.BoxGeometry(0.06, 0.06, 0.06), color, [0, 0, -1.12]);
  return mergeParts(p.list);
}

/* ------------------------------------------------------------------ */
/* the range (playable object) and the standalone room                 */
/* ------------------------------------------------------------------ */
function faceTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  const cols = ['#f4f1ea', '#f4f1ea', '#1c1b1f', '#1c1b1f', '#2f7fd8', '#2f7fd8', '#ec3013', '#ec3013', '#ffd23a', '#ffd23a'];
  for (let i = 0; i < 10; i++) {
    const r = 254 * (10 - i) / 10;
    x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2);
    x.fillStyle = cols[i]; x.fill();
    x.lineWidth = 2; x.strokeStyle = (i === 2 || i === 3) ? '#f4f1ea' : '#1c1b1f'; x.stroke();
  }
  x.beginPath(); x.arc(256, 256, 12.7, 0, Math.PI * 2); x.lineWidth = 1.5; x.strokeStyle = '#1c1b1f'; x.stroke();
  x.beginPath(); x.moveTo(250, 256); x.lineTo(262, 256); x.moveTo(256, 250); x.lineTo(256, 262); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function buildTarget(M) {
  const g = new THREE.Group();
  const p = new Parts();
  p.add(new THREE.BoxGeometry(BOSS, BOSS, 0.5), '#e0bd63', [0, FACE_Y, -0.25]);
  for (const dy of [-0.95, 0.95]) p.add(new THREE.BoxGeometry(BOSS + 0.04, 0.12, 0.54), '#c49640', [0, FACE_Y + dy, -0.25]);
  for (const sx of [1, -1]) {
    p.add(new THREE.BoxGeometry(0.16, 2.2, 0.16), '#8a5a33', [1.0 * sx, 0.95, -1.0], [-0.45, 0, 0]);
    p.add(new THREE.BoxGeometry(0.16, 0.5, 0.16), '#8a5a33', [1.15 * sx, 0.22, -0.15]);
  }
  p.add(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), '#e9edf5', [1.2, FACE_Y + BOSS / 2 + 0.7, -0.25]);
  g.add(p.build(M, 0.04, true));
  const face = new THREE.Mesh(new THREE.CircleGeometry(R.FACE_R, 64), new THREE.MeshBasicMaterial({ map: faceTexture() }));
  face.position.set(0, FACE_Y, 0.012); g.add(face);
  const rim = new THREE.Mesh(new THREE.RingGeometry(R.FACE_R, R.FACE_R + 0.04, 64), new THREE.MeshBasicMaterial({ color: INK }));
  rim.position.set(0, FACE_Y, 0.014); g.add(rim);
  const flag = new THREE.Group(); flag.position.set(1.2, FACE_Y + BOSS / 2 + 1.32, -0.25); g.add(flag);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.75, -0.18, 0, 0, -0.36, 0]), 3));
  fg.computeVertexNormals();
  const fm = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xec3013, side: THREE.DoubleSide }));
  flag.add(fm);
  return { group: g, flag };
}

function buildRange(M) {
  const p = new Parts();
  const z0 = LINE_Z + 6, z1 = LINE_Z - R.DISTANCES[R.DISTANCES.length - 1] - 5;
  const len = z0 - z1, zc = (z0 + z1) / 2;
  p.add(new THREE.BoxGeometry(6.6, 0.04, len), '#97d46f', [0, 0.02, zc]);
  for (const sx of [1, -1]) p.add(new THREE.BoxGeometry(0.1, 0.05, len), '#f4f1ea', [3.3 * sx, 0.04, zc]);
  p.add(new THREE.BoxGeometry(6.6, 0.06, 0.18), '#f4f1ea', [0, 0.05, LINE_Z]);
  p.add(new THREE.BoxGeometry(6.6, 0.06, 0.08), '#ffd23a', [0, 0.05, LINE_Z + 2.4]);
  R.DISTANCES.forEach((d, i) => {
    const z = LINE_Z - d;
    const cap = ['#f4f1ea', '#2f7fd8', '#ec3013', '#ffd23a'][i];
    for (const sx of [1, -1]) {
      p.add(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), '#f4f1ea', [3.6 * sx, 0.35, z]);
      p.add(new THREE.BoxGeometry(0.34, 0.2, 0.06), cap, [3.6 * sx, 0.78, z]);
    }
  });
  p.add(new THREE.BoxGeometry(0.55, 0.12, 6.4), '#8a5a33', [-5.0 + 0.0, 0.55, LINE_Z + 3.2]);
  for (const dz of [-2.8, 0, 2.8]) p.add(new THREE.BoxGeometry(0.45, 0.5, 0.12), '#6b4325', [-5.0, 0.25, LINE_Z + 3.2 + dz]);
  p.add(new THREE.CylinderGeometry(0.2, 0.17, 0.8, 10), '#2a1d1a', [2.7, 0.4, LINE_Z + 0.9]);
  for (let k = 0; k < 4; k++) p.add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), '#f2e6cf', [2.65 + (k % 2) * 0.08, 0.95, LINE_Z + 0.85 + (k > 1 ? 0.08 : 0)]);
  p.add(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), '#f4f1ea', [-3.7, 1.6, LINE_Z - 1]);
  const g = p.build(M, 0.03);
  g.userData.mesh.receiveShadow = true;
  const sock = new THREE.Group(); sock.position.set(-3.7, 3.05, LINE_Z - 1); g.add(sock);
  const sg = new THREE.ConeGeometry(0.2, 0.9, 12, 1, true);
  sg.translate(0, 0.45, 0); sg.rotateZ(-Math.PI / 2);
  const sm = new THREE.Mesh(sg, M.toon('#ec3013', { side: THREE.DoubleSide }));
  sock.add(sm);
  return { group: g, sock };
}

function buildRoom(M, root, shadows) {
  root.background = new THREE.Color('#9fd8ff');
  root.fog = new THREE.Fog('#9fd8ff', 70, 170);
  root.add(new THREE.HemisphereLight('#ffffff', '#5b8f3e', 1.5));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
  sun.position.set(14, 26, 20);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0008;
  }
  sun.target.position.set(0, 0, 2);
  root.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), M.toon('#6dbb4f'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);

  const r = R.rng(8);
  const p = new Parts();
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (7.5 + r() * 10), z = 24 - i * 1.7 - r() * 2;
    const h = 2.6 + r() * 2.4;
    p.add(new THREE.CylinderGeometry(0.22, 0.3, h * 0.45, 7), '#7a4a2a', [x, h * 0.22, z]);
    if (i % 3) p.add(new THREE.ConeGeometry(1.3 + r() * 0.5, h, 8), r() < 0.5 ? '#2f8f4e' : '#3c9d55', [x, h * 0.45 + h / 2, z]);
    else p.add(new THREE.SphereGeometry(1.4 + r() * 0.4, 10, 8), '#47a85c', [x, h * 0.45 + 1.1, z]);
  }
  for (let i = 0; i < 9; i++) {
    p.add(new THREE.SphereGeometry(14 + r() * 10, 14, 8), i % 2 ? '#5fae48' : '#4f9a3c', [-70 + i * 18, -6, -62 - r() * 20], [0, 0, 0], [1.4, 0.55, 1]);
  }
  for (let z = LINE_Z + 7; z > -26; z -= 2.2) {
    for (const sx of [1, -1]) p.add(new THREE.BoxGeometry(0.14, 1.0, 0.14), '#f4f1ea', [6.2 * sx, 0.5, z]);
  }
  for (const sx of [1, -1]) {
    p.add(new THREE.BoxGeometry(0.08, 0.1, 33.5), '#f4f1ea', [6.2 * sx, 0.85, LINE_Z - 9.4]);
    p.add(new THREE.BoxGeometry(0.08, 0.1, 33.5), '#f4f1ea', [6.2 * sx, 0.45, LINE_Z - 9.4]);
  }
  for (const sx of [1, -1]) p.add(new THREE.CylinderGeometry(0.08, 0.08, 6, 8), '#f4f1ea', [4.6 * sx, 3, LINE_Z - 3]);
  const bunt = ['#ec3013', '#ffd23a', '#f4f1ea', '#2f7fd8'];
  for (let i = 0; i < 12; i++) {
    const x = -4.2 + i * 0.76, y = 5.6 - Math.sin((i + 0.5) / 12 * Math.PI) * 0.6;
    p.add(new THREE.ConeGeometry(0.26, 0.5, 3), bunt[i % 4], [x, y, LINE_Z - 3], [Math.PI, 0, 0]);
  }
  root.add(p.build(M, 0.05));
  const clouds = new Parts();
  for (let i = 0; i < 7; i++) {
    const cx = -60 + i * 21 + r() * 8, cy = 26 + r() * 10, cz = -50 - r() * 30;
    for (let k = 0; k < 3; k++) clouds.add(new THREE.SphereGeometry(3 + r() * 2, 10, 8), '#ffffff', [cx + k * 3.5, cy + (k === 1 ? 1.5 : 0), cz]);
  }
  root.add(clouds.build(M, 0));
}

/* ------------------------------------------------------------------ */
/* camera fit: place a camera with a fixed view direction so every    */
/* point sits inside the free (unsafe-covered) part of the screen      */
/* ------------------------------------------------------------------ */
function fitPose(points, fwd, fov, aspect, W, H, safe, out) {
  const f = fwd.clone().normalize();
  const r = new V3().crossVectors(f, UP).normalize();
  const u = new V3().crossVectors(r, f).normalize();
  const c = new V3();
  points.forEach((p) => c.add(p)); c.multiplyScalar(1 / points.length);
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov) / 2), tanH = tanV * aspect;
  let L = -1 + 2 * (safe.left || 0) / W, Rt = 1 - 2 * (safe.right || 0) / W;
  let B = -1 + 2 * (safe.bottom || 0) / H, T = 1 - 2 * (safe.top || 0) / H;
  if (Rt - L < 0.35) { L = -1; Rt = 1; }
  if (T - B < 0.35) { B = -1; T = 1; }
  const px = (Rt - L) * 0.06, py = (T - B) * 0.06;
  L += px; Rt -= px; B += py; T -= py;
  const loc = points.map((p) => { const d = p.clone().sub(c); return [d.dot(r), d.dot(u), d.dot(f)]; });
  const test = (D) => {
    let xl = -Infinity, xh = Infinity, yl = -Infinity, yh = Infinity;
    for (const [x, y, z] of loc) {
      const depth = D + z;
      if (depth < 0.4) return null;
      const kx = depth * tanH, ky = depth * tanV;
      xl = Math.max(xl, x - Rt * kx); xh = Math.min(xh, x - L * kx);
      yl = Math.max(yl, y - T * ky); yh = Math.min(yh, y - B * ky);
    }
    return (xl <= xh && yl <= yh) ? [(xl + xh) / 2, (yl + yh) / 2] : null;
  };
  let lo = 0.5, hi = 400, best = test(hi) || [0, 0];
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2, s = test(mid);
    if (s) { hi = mid; best = s; } else lo = mid;
  }
  out.pos.copy(c).addScaledVector(f, -hi).addScaledVector(r, best[0]).addScaledVector(u, best[1]);
  const m = new THREE.Matrix4().makeBasis(r, u, f.clone().negate());
  out.quat.setFromRotationMatrix(m);
  return out;
}

/* ------------------------------------------------------------------ */
/* cast                                                                 */
/* ------------------------------------------------------------------ */
const CAST = {
  you:   { name: 'YOU',   color: '#ff7a1a', torso: ['#ff7a1a', '#ffd23a', '#2b2a33'], outfit: 'vest' },
  pip:   { name: 'PIP',   color: '#ffd23a', torso: ['#ffd23a', '#fff3c4', '#c98a12'], outfit: 'tee', mood: 'excited' },
  hope:  { name: 'HOPE',  color: '#2f7fd8', torso: ['#f4f1ea', '#2f7fd8', '#2f7fd8'], outfit: 'coat', glasses: true, cane: true, mood: 'calm' },
  noble: { name: 'NOBLE', color: '#c9cdd8', torso: ['#2b2a33', '#ec3013', '#2b2a33'], outfit: 'coat', eyes: '#ff2a2a', chair: true, mood: 'focused' },
};
const LOCAL = [
  { color: '#ff7a1a', torso: ['#ff7a1a', '#ffd23a', '#2b2a33'], outfit: 'vest' },
  { color: '#2fae6b', torso: ['#2fae6b', '#f4f1ea', '#1f3b2c'], outfit: 'tee' },
  { color: '#b07be8', torso: ['#b07be8', '#f4f1ea', '#352a47'], outfit: 'dress' },
  { color: '#2fc4d9', torso: ['#2fc4d9', '#ffd23a', '#1d3940'], outfit: 'coat' },
];
const CPU_LINES = {
  pip: 'PIP IS NEW HERE. EXPECT A FEW WILD ARROWS.',
  hope: 'HOPE LISTENS TO THE WIND AND SHOOTS BY FEEL.',
  noble: 'NOBLE’S CHAIR LOCKS STEADY. RED EYES, NO NERVES.',
};
const DEMO_TIPS = [
  'DRAG TO MOVE THE SIGHT. HOLD TO DRAW. LET GO TO SHOOT.',
  'FULL DRAW FLIES FLAT. A SHORT DRAW DROPS LOW.',
  'GOLD SCORES 10. THE TINY INNER RING IS AN X.',
  'WATCH THE FLAG. WIND PUSHES ARROWS SIDEWAYS, SO AIM INTO IT.',
  'HOLD TOO LONG AT FULL DRAW AND YOUR ARMS SHAKE.',
  'FOUR ENDS, THREE ARROWS EACH. THE TARGET MOVES BACK EVERY END.',
];

/* ------------------------------------------------------------------ */
/* createArchery                                                        */
/* ------------------------------------------------------------------ */
export async function createArchery({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const shadows = !world && !touch;
  const M = makeMaterials();
  const now = () => performance.now();

  /* --- scene roots --- */
  const scene = new THREE.Group(); scene.name = 'archeryRange';
  let renderer = null, root = null, ro = null;
  let W = 800, H = 600;
  if (world) {
    world.parent.add(scene);
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch || (window.devicePixelRatio || 1) < 2, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const el = renderer.domElement;
    el.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent';
    el.tabIndex = 0;
    el.setAttribute('aria-label', 'Archery range. Drag to aim, hold to draw, release to shoot. Space draws and looses, arrow keys aim.');
    container.appendChild(el);
    root = new THREE.Scene();
    root.add(scene);
    buildRoom(M, root, shadows);
    const size = () => {
      W = Math.max(1, container.clientWidth); H = Math.max(1, container.clientHeight);
      renderer.setSize(W, H, false);
    };
    size();
    ro = new ResizeObserver(size); ro.observe(container);
  }
  const domEl = world ? world.renderer.domElement : renderer.domElement;
  function readSize() { if (world) { W = domEl.clientWidth || 800; H = domEl.clientHeight || 600; } }
  readSize();

  const range = buildRange(M); scene.add(range.group);
  const target = buildTarget(M); scene.add(target.group);
  const reticle = new THREE.Group();
  {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.22, 32), mat);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.035), mat);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.62), mat);
    const back = new THREE.Mesh(new THREE.RingGeometry(0.155, 0.235, 32), new THREE.MeshBasicMaterial({ color: INK, depthTest: false, transparent: true, opacity: 0.6 }));
    [back, ring, h, v].forEach((m, i) => { m.renderOrder = 20 + i; reticle.add(m); });
    reticle.userData.mat = mat;
    reticle.visible = false;
    scene.add(reticle);
  }

  /* --- camera --- */
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
  const wcam = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);
  const cam = { mode: 'line', pos: new V3(8, 9, LINE_Z + 14), quat: new THREE.Quaternion(), fov: 50, snap: true, speed: 4 };
  const goal = { pos: new V3(), quat: new THREE.Quaternion() };
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };
  const _q = new THREE.Quaternion();

  /* --- audio + save --- */
  const audio = createAudio({ music: !world && opts.music !== false });
  const save = opts.save || {
    addGold(n) { try { const k = GAME.key + '.gold'; localStorage.setItem(k, String((+localStorage.getItem(k) || 0) + n)); } catch (e) { /* storage off */ } },
    stat(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    setStat(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } },
  };
  const statKey = (k) => GAME.key + '.' + k;

  /* --- state --- */
  const G = {
    mode: opts.mode || 'cpu', level: opts.level || 'hope', nLocal: R.clamp(opts.players || 2, 2, 4),
    match: null, phase: 'boot', pt: 0, t: 0, paused: false, left: false,
    end: 0, showEnd: 0, dist: R.DISTANCES[0], zFace: LINE_Z - R.DISTANCES[0], wind: 0,
    aim: new THREE.Vector2(), aimStart: new THREE.Vector2(), sway: new THREE.Vector2(),
    power: 0, drawing: false, drawT: 0, fullT: 0, plan: null, ptr: null, px: 0, py: 0, keyAt: 0,
    fly: null, nocked: null, stuck: [],
    lastInput: now(), msg: '', caption: '', last: null, result: null, say: '',
    sound: true, music: !world && opts.music !== false, aimTone: !!opts.aimTone,
    tips: {}, demoTip: 0, capT: 0, shakeAt: 0, tickAt: 0, emitAt: 0, dirty: true,
    rng: R.rng((Date.now() ^ 0x5eed) >>> 0),
  };
  const actors = [];
  const arrowGeos = new Map();
  const geoFor = (color) => { if (!arrowGeos.has(color)) arrowGeos.set(color, arrowGeo(color)); return arrowGeos.get(color); };

  function makeArrow(color) {
    const m = new THREE.Mesh(geoFor(color), M.toonVC);
    m.scale.setScalar(ARROW_SCALE);
    m.castShadow = shadows;
    scene.add(m);
    return m;
  }

  function lookAtLocal(obj, localPoint) {
    const w = localPoint.clone(); scene.localToWorld(w); obj.lookAt(w);
  }

  /* --- actors --- */
  function clearActors() {
    actors.forEach((a) => { scene.remove(a.fox); scene.remove(a.bow); });
    actors.length = 0;
  }
  function buildActors(players) {
    clearActors();
    const n = players.length;
    players.forEach((p, i) => {
      const look = p.look;
      const fox = makeFox(kit, M, look, shadows);
      fox.userData.seed = i * 1.7;
      if (look.cane) { const cane = buildCane(M); cane.position.set(-0.45, 0, 0.3); cane.rotation.z = 0.22; fox.add(cane); }
      let chair = null;
      if (look.chair) { chair = buildChair(M); fox.add(chair); }
      if (fox.userData.kit && look.eyes) {
        for (const sx of [1, -1]) {
          const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: look.eyes }));
          e.position.set(0.16 * sx, 0.06, 0.38); fox.userData.P.head.add(e);
        }
      }
      const spot = new V3(-4.3, 0, LINE_Z + 0.9 + i * 1.7);
      scene.add(fox);
      const bow = buildBow(M); scene.add(bow);
      actors.push({ fox, bow, chair, look, spot, pos: spot.clone(), target: spot.clone(), rot: Math.PI, face: Math.PI, moving: false });
    });
  }

  function handWorld(a, idx, out) {
    const P = a.fox.userData.P;
    return P.arms[idx].localToWorld(out.set(0, -a.fox.userData.armLen, 0));
  }
  function pointArm(fox, arm, dir) {
    const qf = fox.getWorldQuaternion(new THREE.Quaternion());
    const qp = arm.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const d = dir.clone().normalize().applyQuaternion(qf).applyQuaternion(qp).normalize();
    arm.quaternion.setFromUnitVectors(DOWN, d);
  }

  /* --- players / match --- */
  function roster(mode) {
    if (mode === 'local') {
      return Array.from({ length: G.nLocal }, (_, i) => ({ name: 'P' + (i + 1), kind: 'human', color: LOCAL[i].color, look: LOCAL[i] }));
    }
    if (mode === 'demo') {
      return [
        { name: 'PIP', kind: 'cpu', level: 'pip', color: CAST.pip.color, look: CAST.pip },
        { name: 'HOPE', kind: 'cpu', level: 'hope', color: CAST.hope.color, look: CAST.hope },
      ];
    }
    const c = CAST[G.level] || CAST.hope;
    return [
      { name: 'YOU', kind: 'human', color: CAST.you.color, look: CAST.you },
      { name: c.name, kind: 'cpu', level: G.level, color: c.color, look: c },
    ];
  }

  function startMatch(mode, o = {}) {
    if (mode) G.mode = mode;
    if (o.level && R.LEVELS[o.level]) G.level = o.level;
    if (o.players) G.nLocal = R.clamp(o.players | 0, 2, 4);
    cancelDraw(true);
    clearArrows();
    if (G.fly) { scene.remove(G.fly.mesh); G.fly = null; }
    const players = roster(G.mode);
    G.match = R.newMatch(players.map((p) => ({ name: p.name, kind: p.kind, level: p.level, color: p.color })));
    buildActors(players);
    G.result = null; G.left = false; G.paused = false; G.last = null; G.tips = {}; G.caption = ''; G.demoTip = 0;
    beginEnd(0);
    cam.snap = true;
    mark();
  }

  function clearArrows() {
    G.stuck.forEach((m) => scene.remove(m));
    G.stuck.length = 0;
    if (G.nocked) { scene.remove(G.nocked); G.nocked = null; }
  }

  function beginEnd(e) {
    G.end = e; G.showEnd = e;
    G.dist = R.DISTANCES[e];
    G.zFace = LINE_Z - G.dist;
    target.group.position.z = G.zFace;
    G.wind = R.windFor(e, G.rng);
    clearArrows();
    if (G.mode === 'cpu' && e === 1) tip('wind', 'WATCH THE RED FLAG. WIND PUSHES ARROWS, SO AIM INTO IT.');
    if (G.mode === 'cpu' && e === 2) tip('drop', 'LONGER RANGE NOW. ONLY A FULL DRAW FLIES FLAT.');
    beginShooter();
  }

  function shooter() { return G.match ? G.match.players[G.match.shooter] : null; }
  function shooterActor() { return G.match ? actors[G.match.shooter] : null; }

  function beginShooter() {
    const m = G.match, s = m.shooter, p = shooter();
    actors.forEach((a, i) => a.target.copy(i === s ? SHOOT_SPOT : a.spot));
    const ang = G.rng() * Math.PI * 2, rad = 0.35 + G.rng() * 0.45;
    G.aim.set(Math.cos(ang) * rad, Math.sin(ang) * rad);
    setPhase('walk');
    cam.mode = 'line'; cam.speed = 3.5;
    G.msg = G.mode === 'local' ? 'PASS THE DEVICE TO ' + p.name : p.name + ' TO THE LINE';
    G.say = G.msg;
    if (G.mode === 'demo') nextDemoTip();
    audio.play('chime');
  }

  function setPhase(p) { G.phase = p; G.pt = 0; mark(); }
  function mark() { G.dirty = true; }
  function tip(id, text) { if (G.tips[id]) return; G.tips[id] = true; G.caption = text; G.capT = G.t; mark(); }
  function nextDemoTip() { G.caption = DEMO_TIPS[G.demoTip % DEMO_TIPS.length]; G.capT = G.t; G.demoTip++; }

  function humanTurn() {
    const p = shooter();
    return !!(p && p.kind === 'human' && !G.left && !G.paused && (G.phase === 'aim' || G.phase === 'draw'));
  }

  function enterAim() {
    setPhase('aim');
    cam.mode = 'aim'; cam.speed = 3.5;
    G.power = 0; G.drawing = false; G.drawT = 0; G.fullT = 0;
    const p = shooter();
    if (!G.nocked) G.nocked = makeArrow(p.color);
    G.lastInput = now();
    if (p.kind === 'cpu') {
      G.plan = R.cpuPlan(p.level, { dist: G.dist, wind: G.wind }, G.rng);
      G.aimStart.copy(G.aim);
      G.msg = p.name + ' IS AIMING';
      if (G.mode !== 'demo' && CPU_LINES[p.level]) tip('cpu-' + p.level, CPU_LINES[p.level]);
    } else {
      G.msg = (G.mode === 'local' ? p.name + ': ' : 'YOUR SHOT · ') + 'ARROW ' + (G.match.arrow + 1) + ' OF ' + R.ARROWS;
      if (G.mode === 'cpu') tip('how', 'DRAG TO AIM. HOLD TO DRAW. LET GO TO SHOOT.');
    }
    G.say = G.msg;
  }

  function startDraw() {
    if (G.drawing) return;
    G.drawing = true; G.drawT = 0; G.fullT = 0; G.power = 0;
    setPhase('draw');
    audio.play('creak');
    const p = shooter();
    if (p && p.kind === 'human') { G.msg = 'DRAWING'; cam.mode = 'scope'; cam.speed = 5; }
  }

  function cancelDraw(silent) {
    if (!G.drawing) return;
    G.drawing = false; G.power = 0; G.ptr = null;
    audio.setTone(false);
    if (G.phase === 'draw') cam.mode = 'aim';
    if (!silent && G.phase === 'draw') {
      setPhase('aim');
      G.msg = 'HOLD LONGER TO DRAW THE BOW';
    }
  }

  function aimPoint(out) {
    const p = shooter();
    if (p && p.kind === 'cpu') return out.set(G.aim.x, FACE_Y + G.aim.y, G.zFace);
    return out.set(G.aim.x + G.sway.x, FACE_Y + G.aim.y + G.sway.y, G.zFace);
  }

  function release() {
    if (!G.drawing) return;
    const p = shooter();
    G.drawing = false; G.ptr = null;
    audio.setTone(false);
    const A = aimPoint(new V3());
    const O = G.nocked.position.clone();
    const T = Math.max(0.05, (O.z - G.zFace) / R.V_FULL);
    const vel = A.clone().sub(O).multiplyScalar(1 / T);
    vel.y += 0.5 * R.GRAVITY * T;
    vel.multiplyScalar(R.speedScale(G.power));
    G.fly = { mesh: G.nocked, pos: O, vel, t: 0, owner: G.match.shooter, power: G.power };
    G.nocked = null;
    setPhase('flight');
    cam.mode = 'flight'; cam.speed = 9;
    G.msg = '';
    audio.play('twang', G.power);
    audio.play('whoosh');
    if (p.kind === 'human' && G.power < 0.8) tip('short', 'SHORT DRAW. THE ARROW DROPS. HOLD UNTIL THE BAR FILLS.');
  }

  function stick(v, x, inTarget) {
    const m = G.match, p = shooter();
    G.stuck.push(G.fly.mesh);
    G.fly = null;
    R.record(m, v, x);
    G.last = { v, x, label: R.label({ v, x }), color: R.ringColor(v), ring: v };
    G.msg = v === 0 ? 'MISS' : (x ? 'X! DEAD CENTRE' : v === 10 ? 'GOLD! 10' : v >= 9 ? 'GOLD! 9' : 'SCORE ' + v);
    G.say = p.name + (v === 0 ? ' missed' : ' scored ' + (x ? 'X, 10' : v));
    if (!inTarget) audio.play('ground');
    else { audio.play('thud'); if (v >= 9) { audio.play('bell'); if (v === 10) audio.play('cheer'); } }
    setPhase('hit');
    cam.mode = 'hit'; cam.speed = 5;
  }

  function advance() {
    const m = G.match;
    const finishedEnd = m.end;
    const step = R.nextStep(m);
    G.last = null;
    if (step === 'arrow') { enterAim(); return; }
    if (step === 'shooter') { beginShooter(); return; }
    if (step === 'end') {
      G.showEnd = finishedEnd;
      const rows = m.players.map((p) => p.name + ' ' + R.endTotal(p, finishedEnd)).join(' · ');
      G.msg = 'END ' + (finishedEnd + 1) + ' DONE: ' + rows;
      G.say = G.msg;
      setPhase('endsum');
      cam.mode = 'hit'; cam.speed = 3;
      actors.forEach((a) => a.target.copy(a.spot));
      return;
    }
    finishMatch();
  }

  function finishMatch() {
    const m = G.match;
    const st = R.standings(m);
    const top = st[0];
    const tie = st.length > 1 && st[1].place === 1;
    const human = G.mode === 'cpu' ? m.players[0] : G.mode === 'local' ? m.players[top.i] : null;
    const won = G.mode === 'cpu' ? (!tie && top.i === 0) : G.mode === 'local';
    const title = tie ? 'DRAW' : (G.mode === 'cpu' ? (top.i === 0 ? 'YOU WIN' : top.name + ' WINS') : top.name + ' WINS');
    const score = human ? human.total : top.total;
    let best = 0, newBest = false, gold = 0, xp = 0;
    if (G.mode !== 'demo') {
      const rw = R.rewards({ mode: G.mode, level: G.level, won, tie, total: score });
      gold = rw.gold; xp = rw.xp;
      best = save.stat(statKey('best'), 0) || 0;
      if (score > best) { best = score; newBest = true; save.setStat(statKey('best'), score); }
      if (gold) save.addGold(gold);
      save.setStat(statKey('xp'), (save.stat(statKey('xp'), 0) || 0) + xp);
      if (won && G.mode === 'cpu') save.setStat(statKey('wins.' + G.level), (save.stat(statKey('wins.' + G.level), 0) || 0) + 1);
    }
    G.result = {
      title, tie, mode: G.mode, score, max: R.MAX_SCORE, best, newBest, gold, xp,
      stars: R.stars(score),
      rows: st.map((r) => ({ place: r.place, name: r.name, total: r.total, xs: r.xs, color: r.color })),
      winners: st.filter((r) => r.place === 1).map((r) => r.i),
    };
    G.msg = title; G.say = title + '. ' + st.map((r) => r.name + ' ' + r.total).join(', ');
    const n = actors.length;
    actors.forEach((a, i) => a.target.set((i - (n - 1) / 2) * 1.9, 0, LINE_Z + 1.6));
    setPhase('result');
    cam.mode = 'result'; cam.speed = 2.5;
    const happy = G.mode === 'demo' || G.mode === 'local' || won || tie;
    audio.play(happy ? 'fanfare' : 'sad');
    if (happy) audio.play('cheer');
  }

  /* --- per-frame logic --- */
  const _a = new V3(), _b = new V3(), _c = new V3();

  function update(dt) {
    G.t += dt; G.pt += dt;
    if (G.caption && G.t - G.capT > 9) { G.caption = ''; mark(); }
    const p = shooter();
    switch (G.phase) {
      case 'walk': {
        const a = shooterActor();
        if (a && a.pos.distanceTo(a.target) < 0.06 && G.pt > 0.9) enterAim();
        break;
      }
      case 'aim': {
        if (p.kind === 'cpu' && G.pt > G.plan.think * 0.6) startDraw();
        break;
      }
      case 'draw': {
        G.drawT += dt;
        const was = G.power;
        G.power = Math.min(1, G.power + dt / DRAW_TIME);
        if (G.power >= 1) { G.fullT += dt; if (was < 1) audio.play('full'); }
        if (p.kind === 'cpu') {
          const dur = DRAW_TIME * G.plan.power + G.plan.think * 0.4 + G.plan.hold;
          const k = THREE.MathUtils.smootherstep(Math.min(1, G.drawT / (dur * 0.85)), 0, 1);
          G.aim.set(THREE.MathUtils.lerp(G.aimStart.x, G.plan.ax, k), THREE.MathUtils.lerp(G.aimStart.y, G.plan.ay, k));
          if (G.power > G.plan.power) G.power = G.plan.power;
          if (G.power > 0.6 && cam.mode === 'aim') { cam.mode = 'scope'; cam.speed = 4; }
          if (p.level === 'hope' && G.sound) {
            const close = 1 - Math.min(1, Math.hypot(G.aim.x - G.plan.ax, G.aim.y - G.plan.ay) / 1.2);
            if (G.t - G.tickAt > 0.32 - close * 0.24) { G.tickAt = G.t; audio.play('tick', close); }
          }
          if (G.drawT >= dur) release();
        } else {
          const over = G.fullT > OVERDRAW ? Math.min(0.55, (G.fullT - OVERDRAW) * 0.3) : 0;
          const amp = 0.05 + 0.06 * G.power + over;
          const t = G.t;
          G.sway.set(
            amp * (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 3.1 + 1.3) * 0.4) + (over ? Math.sin(t * 23) * over * 0.12 : 0),
            amp * (Math.cos(t * 1.3) * 0.5 + Math.sin(t * 2.3 + 0.4) * 0.5) + (over ? Math.cos(t * 19) * over * 0.12 : 0));
          if (over) {
            if (G.msg !== 'ARMS SHAKING. LET GO!') { G.msg = 'ARMS SHAKING. LET GO!'; mark(); }
            if (G.t - G.shakeAt > 0.35) { G.shakeAt = G.t; audio.play('shake'); }
          } else if (G.power >= 1 && G.msg !== 'FULL DRAW. LET GO TO SHOOT') { G.msg = 'FULL DRAW. LET GO TO SHOOT'; mark(); }
          if (G.aimTone) {
            const off = R.predictOffset(G.dist, G.wind, G.power);
            const lx = G.aim.x + G.sway.x + off.x, ly = G.aim.y + G.sway.y + off.y;
            audio.setTone(true, Math.max(0, 1 - Math.hypot(lx, ly) / 1.3));
          }
          if (G.fullT > GIVE_OUT) { G.msg = 'YOUR ARMS GAVE OUT'; release(); }
        }
        break;
      }
      case 'flight': {
        const f = G.fly;
        const sdt = dt * 0.7;
        const steps = Math.max(1, Math.ceil(sdt / (1 / 240)));
        const h = sdt / steps;
        for (let i = 0; i < steps && G.fly; i++) {
          _a.copy(f.pos);
          f.vel.x += G.wind * h;
          f.vel.y -= R.GRAVITY * h;
          f.pos.addScaledVector(f.vel, h);
          f.t += h;
          if (_a.z > G.zFace && f.pos.z <= G.zFace) {
            const k = (_a.z - G.zFace) / (_a.z - f.pos.z);
            _b.copy(_a).lerp(f.pos, k);
            const dx = _b.x, dy = _b.y - FACE_Y;
            if (Math.abs(dx) <= BOSS / 2 && Math.abs(dy) <= BOSS / 2) {
              const dir = f.vel.clone().normalize();
              f.pos.copy(_b).addScaledVector(dir, 0.16 * ARROW_SCALE);
              f.mesh.position.copy(f.pos);
              lookAtLocal(f.mesh, _c.copy(f.pos).add(dir));
              const r = Math.hypot(dx, dy);
              stick(R.ringOf(r), R.isX(r), true);
              break;
            }
          }
          if (f.pos.y <= 0.05 || f.pos.z < G.zFace - 14 || f.t > 4) {
            const dir = f.vel.clone().normalize();
            f.pos.y = Math.max(f.pos.y, 0.05);
            f.mesh.position.copy(f.pos).addScaledVector(dir, 0.25);
            lookAtLocal(f.mesh, _c.copy(f.mesh.position).add(dir));
            stick(0, false, false);
            break;
          }
        }
        if (G.fly) {
          f.mesh.position.copy(f.pos);
          lookAtLocal(f.mesh, _c.copy(f.pos).add(f.vel));
        }
        break;
      }
      case 'hit': if (G.pt > 1.6) advance(); break;
      case 'endsum': if (G.pt > 2.8) beginEnd(G.match.end); break;
      case 'result': if (G.mode === 'demo' && G.pt > 7) startMatch('demo'); break;
      default: break;
    }
  }

  /* --- actors + props, every frame --- */
  function updateActors(dt) {
    const sIdx = G.match ? G.match.shooter : -1;
    const aiming = G.phase === 'aim' || G.phase === 'draw' || (G.phase === 'flight' && G.pt < 0.5) || (G.phase === 'hit' && G.pt < 0.4);
    scene.updateWorldMatrix(true, false);
    actors.forEach((a, i) => {
      const d = _a.subVectors(a.target, a.pos); d.y = 0;
      const dist = d.length();
      let speed = 0;
      if (dist > 0.04) {
        const step = Math.min(dist, 3.4 * dt);
        a.pos.addScaledVector(d.normalize(), step);
        speed = 3.4; a.face = Math.atan2(d.x, d.z);
      } else {
        a.face = (i === sIdx && aiming) ? Math.PI / 2 : Math.PI;
      }
      let df = a.face - a.rot;
      while (df > Math.PI) df -= Math.PI * 2;
      while (df < -Math.PI) df += Math.PI * 2;
      a.rot += df * (1 - Math.exp(-dt * 10));
      const fox = a.fox, P = fox.userData.P;
      fox.position.copy(a.pos);
      if (a.chair) fox.position.y = 0.1 + Math.sin(G.t * 2.2 + i) * 0.06;
      fox.rotation.y = a.rot;
      P.arms.forEach((x) => x.rotation.set(0, 0, 0));
      P.legs.forEach((x) => x.rotation.set(0, 0, 0));
      P.head.rotation.set(0, 0, 0);
      animFox(kit, fox, dt, a.chair ? 0 : speed, G.t);
      fox.updateMatrixWorld(true);
      if (a.chair) P.legs.forEach((l, k) => { l.quaternion.setFromUnitVectors(DOWN, _b.set(0.08 * (k ? -1 : 1), -0.25, 1).normalize()); });
      const isShooter = i === sIdx && aiming && dist <= 0.04;
      let drawP = 0;
      if (isShooter) {
        drawP = G.phase === 'draw' ? G.power : 0;
        pointArm(fox, P.arms[0], _b.set(1, 0.07 + G.aim.y * 0.03, 0));
        pointArm(fox, P.arms[1], _b.set(1, 0.05, 0.42).lerp(_c.set(0.32, 0.45, 0.64), drawP));
        P.head.rotation.set(0, Math.PI / 2 * 0.85, 0);
        if (!a.chair) { P.legs[0].rotation.z = 0.12; P.legs[1].rotation.z = -0.12; }
      } else if (G.phase === 'result' && G.result) {
        const winner = G.result.winners.includes(i);
        if (winner) {
          pointArm(fox, P.arms[0], _b.set(0.35, 1, 0.1));
          pointArm(fox, P.arms[1], _b.set(-0.35, 1, 0.1));
          if (!a.chair) fox.position.y = Math.abs(Math.sin(G.t * 6 + i)) * 0.35;
        } else {
          P.head.rotation.x = 0.45;
        }
      }
      fox.updateMatrixWorld(true);
      /* bow in the left paw */
      const bow = a.bow;
      handWorld(a, 0, _a);
      bow.position.copy(scene.worldToLocal(_b.copy(_a)));
      if (isShooter) {
        lookAtLocal(bow, _b.set(0, FACE_Y, G.zFace));
        bow.updateMatrixWorld(true);
        handWorld(a, 1, _a);
        const nock = bow.worldToLocal(_c.copy(_a));
        nock.x = 0;
        nock.z = Math.min(-0.32, nock.z);
        const s = bow.userData.string.attributes.position;
        s.setXYZ(1, 0, R.clamp(nock.y, -0.2, 0.2), nock.z); s.needsUpdate = true;
      } else {
        const fwd = _c.set(Math.sin(a.rot), 0, Math.cos(a.rot));
        lookAtLocal(bow, _b.copy(bow.position).addScaledVector(fwd, 1).add(_c.set(0, -0.6, 0)));
        const s = bow.userData.string.attributes.position;
        s.setXYZ(1, 0, 0, -0.32); s.needsUpdate = true;
      }
      /* nocked arrow */
      if (isShooter && G.nocked) {
        a.bow.updateMatrixWorld(true);
        const s = a.bow.userData.string.attributes.position;
        const nockW = a.bow.localToWorld(_a.set(0, s.getY(1), s.getZ(1)));
        const nockL = scene.worldToLocal(nockW);
        const dir = aimPoint(_b).sub(nockL).normalize();
        G.nocked.visible = true;
        G.nocked.position.copy(nockL).addScaledVector(dir, ARROW_LEN);
        lookAtLocal(G.nocked, _c.copy(G.nocked.position).add(dir));
      }
    });
    if (G.nocked && !(G.phase === 'aim' || G.phase === 'draw')) G.nocked.visible = false;
    /* hide any fox standing between the camera and the target in the close shots */
    const close = cam.mode === 'scope' || cam.mode === 'flight' || cam.mode === 'hit' || cam.mode === 'aim';
    const shooterA = shooterActor();
    const tgt = _a.set(0, FACE_Y, G.zFace);
    const toT = _b.copy(tgt).sub(cam.pos);
    const len2 = Math.max(1e-6, toT.lengthSq());
    actors.forEach((a) => {
      let hide = false;
      if (close && !(cam.mode === 'aim' && a === shooterA)) {
        const rel = _c.copy(a.pos).setY(1.6).sub(cam.pos);
        const t = rel.dot(toT) / len2;
        if (t > -0.05 && t < 1) hide = rel.addScaledVector(toT, -t).length() < 1.9;
      }
      a.fox.visible = !hide; a.bow.visible = !hide;
      if (G.nocked && hide && a === shooterA) G.nocked.visible = false;
    });

    /* reticle */
    const showRet = (G.phase === 'aim' || G.phase === 'draw') && G.match && !G.left;
    reticle.visible = !!showRet;
    if (showRet) {
      aimPoint(_a); reticle.position.set(_a.x, _a.y, G.zFace + 0.08);
      reticle.userData.mat.color.set(shooter().color);
      const s = 1 + (G.phase === 'draw' ? (1 - G.power) * 0.6 : 0.6);
      reticle.scale.setScalar(s);
    }
    /* wind flag + sock */
    const w = G.wind, ws = Math.min(1, Math.abs(w) / 2.1);
    const flap = Math.sin(G.t * (6 + ws * 8)) * (0.08 + ws * 0.14);
    [target.flag, range.sock].forEach((f) => {
      f.rotation.set(0, (w < 0 ? Math.PI : 0) + flap, -1.25 * (1 - ws) - 0.08);
    });
  }

  /* --- camera goals --- */
  const _pts = [];
  function pushBox(cx, cy, cz, hx, hy, hz) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) _pts.push(new V3(cx + sx * hx, cy + sy * hy, cz + sz * hz));
  }
  function computeGoal() {
    _pts.length = 0;
    const portrait = W < H;
    let fov = world ? (world.camera.fov || 50) : (portrait ? 60 : 46);
    let fwd;
    const zF = G.zFace;
    switch (cam.mode) {
      case 'aim': {
        fwd = _a.set(0, FACE_Y, (zF + LINE_Z) / 2).sub(_b.set(portrait ? 3.6 : 5.5, 3.6, LINE_Z + 4.5)).clone();
        _pts.push(new V3(0, 0, LINE_Z + 0.35), new V3(0, 3.0, LINE_Z + 0.35), new V3(0, 2.0, LINE_Z - 1.3), new V3(0.6, 1.5, LINE_Z + 0.8));
        pushBox(0, FACE_Y, zF, 1.4, 1.4, 0.05);
        break;
      }
      case 'scope': {
        if (!world) fov = portrait ? 42 : 30;
        fwd = _a.set(0, FACE_Y, zF).sub(_b.set(0, 2.35, LINE_Z)).clone();
        _pts.push(new V3(-AIM_MAX - 0.4, 0, zF), new V3(AIM_MAX + 0.4, 0, zF), new V3(-AIM_MAX - 0.4, FACE_Y + AIM_MAX + 0.3, zF), new V3(AIM_MAX + 0.4, FACE_Y + AIM_MAX + 0.3, zF));
        break;
      }
      case 'flight': {
        if (G.fly) {
          const dir = G.fly.vel.clone().normalize();
          const eye = G.fly.pos.clone().addScaledVector(dir, -3.4).add(_c.set(0.7, 0.75, 0));
          const look = G.fly.pos.clone().addScaledVector(dir, 4);
          goal.pos.copy(eye);
          goal.quat.setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, look, UP));
          return fov;
        }
        fwd = _a.set(-0.25, -0.12, -1);
        pushBox(0, FACE_Y, zF, 1.5, 1.5, 0.1);
        break;
      }
      case 'hit': {
        if (!world && !portrait) fov = 40;
        fwd = _a.set(0, FACE_Y, zF).sub(_b.set(2.4, 2.8, zF + 7)).clone();
        pushBox(0, FACE_Y, zF, 1.45, 1.45, 0.05);
        break;
      }
      case 'result': {
        fwd = _a.set(0, -0.32, 1).clone();
        actors.forEach((a) => { _pts.push(a.pos.clone().setY(0), a.pos.clone().setY(3.2)); });
        if (!_pts.length) pushBox(0, 1.4, LINE_Z, 3, 1.4, 1);
        _pts.push(new V3(-3.4, 0, LINE_Z + 3.4), new V3(3.4, 0, LINE_Z + 3.4));
        break;
      }
      default: {
        fwd = _a.set(0, 1.4, (LINE_Z + zF) / 2).sub(_b.set(portrait ? 4 : 8, 9.5, LINE_Z + 14)).clone();
        actors.forEach((a) => { _pts.push(a.pos.clone().setY(0), a.pos.clone().setY(3)); });
        pushBox(0, 1.6, zF, 1.5, 1.6, 0.3);
        _pts.push(new V3(-3.3, 0, LINE_Z + 4.5), new V3(3.3, 0, LINE_Z + 4.5));
      }
    }
    fitPose(_pts, fwd, fov, W / H, W, H, safe, goal);
    return fov;
  }

  function updateCam(dt) {
    const fov = computeGoal();
    const k = cam.snap ? 1 : 1 - Math.exp(-dt * cam.speed);
    cam.pos.lerp(goal.pos, k);
    cam.quat.slerp(goal.quat, k);
    cam.fov += (fov - cam.fov) * k;
    cam.snap = false;
    camera.position.copy(cam.pos);
    camera.quaternion.copy(cam.quat);
    camera.fov = world ? (world.camera.fov || 50) : cam.fov;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    if (world) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      scene.getWorldQuaternion(_q); wcam.quaternion.copy(_q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }

  /* --- input --- */
  function aimSens() { return 4.2 / Math.max(240, Math.min(W, H)); }
  function onDown(e) {
    if (world) {
      if (e.target !== domEl || !G.match || G.left) return;
      e.preventDefault(); e.stopImmediatePropagation();
    } else {
      try { domEl.focus({ preventScroll: true }); } catch (err) { /* old browser */ }
    }
    audio.unlock();
    G.lastInput = now(); mark();
    if (!humanTurn() || G.drawing) return;
    G.ptr = e.pointerId; G.px = e.clientX; G.py = e.clientY;
    G.aimStart.copy(G.aim);
    startDraw();
  }
  function onMove(e) {
    if (!G.drawing || e.pointerId !== G.ptr || G.paused) return;
    const s = aimSens();
    G.aim.x = R.clamp(G.aimStart.x + (e.clientX - G.px) * s, -AIM_MAX, AIM_MAX);
    G.aim.y = R.clamp(G.aimStart.y - (e.clientY - G.py) * s, -AIM_MAX, AIM_MAX);
    G.lastInput = now();
  }
  function onUp(e) {
    if (!G.drawing || e.pointerId !== G.ptr) return;
    G.ptr = null;
    G.lastInput = now();
    if (G.power < 0.25) cancelDraw(); else release();
  }
  function onCancel(e) { if (e.pointerId === G.ptr) cancelDraw(); }
  function onKey(e) {
    const k = e.key, up = e.type === 'keyup';
    if (!humanTurn()) return;
    if (k === ' ' || k === 'Spacebar' || k === 'Enter') {
      if (e.preventDefault) e.preventDefault();
      audio.unlock();
      G.lastInput = now(); mark();
      if (!up) {
        if (e.repeat) return;
        if (!G.drawing) { G.keyAt = now(); G.ptr = 'key'; startDraw(); } else if (G.power >= 0.25) release();
      } else if (G.drawing && G.ptr === 'key' && now() - G.keyAt > 350 && G.power >= 0.25) release();
      return;
    }
    if (up) return;
    const step = e.shiftKey ? 0.02 : 0.08;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step], a: [-step, 0], d: [step, 0], w: [0, step], s: [0, -step] };
    const mv = map[k];
    if (mv) {
      if (e.preventDefault) e.preventDefault();
      G.aim.x = R.clamp(G.aim.x + mv[0], -AIM_MAX, AIM_MAX);
      G.aim.y = R.clamp(G.aim.y + mv[1], -AIM_MAX, AIM_MAX);
      G.lastInput = now(); mark();
    }
  }
  if (world) window.addEventListener('pointerdown', onDown, true);
  else {
    domEl.addEventListener('pointerdown', onDown);
    domEl.addEventListener('keydown', onKey);
    domEl.addEventListener('keyup', onKey);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  /* --- HUD state --- */
  function hud() {
    const m = G.match, p = shooter();
    const endIdx = G.showEnd;
    const hint = !!(m && humanTurn() && G.phase === 'aim' && now() - G.lastInput > 3000);
    return {
      key: GAME.key, name: GAME.name,
      phase: G.phase, mode: G.mode, level: G.level, localPlayers: G.nLocal,
      end: endIdx + 1, ends: R.ENDS, arrow: m ? Math.min(m.arrow + 1, R.ARROWS) : 1, arrows: R.ARROWS,
      dist: G.dist,
      wind: { value: G.wind, kmh: R.windKmh(G.wind), dir: G.wind < 0 ? 'left' : G.wind > 0 ? 'right' : 'calm' },
      players: m ? m.players.map((q, i) => ({
        name: q.name, color: q.color, kind: q.kind, total: q.total,
        active: i === m.shooter && !m.done && G.phase !== 'endsum',
        arrows: (q.ends[endIdx] || []).map(R.label),
      })) : [],
      shooter: p ? p.name : '', shooterKind: p ? p.kind : '',
      humanTurn: humanTurn(),
      power: Math.round(G.power * 100) / 100, drawing: G.drawing,
      full: G.drawing && G.power >= 1, overdraw: G.drawing && G.fullT > OVERDRAW,
      message: G.msg, caption: G.caption, last: G.last, say: G.say,
      hint, result: G.result, left: G.left, paused: G.paused,
      sound: G.sound, music: G.music, aimTone: G.aimTone,
    };
  }
  function emit(force) {
    const t = now();
    if (!force && t - G.emitAt < (G.drawing ? 50 : 100)) return;
    G.emitAt = t; G.dirty = false;
    try { onState(hud()); } catch (e) { console.error(e); }
  }

  /* --- loop --- */
  let raf = 0, last = now(), dead = false;
  function frame(t) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)) * (opts.speed || 1); last = t;
    readSize();
    if (G.match && !G.paused && !G.left) update(dt);
    else G.t += dt;
    if (G.match) updateActors(G.paused ? 0 : dt);
    updateCam(dt);
    if (!world) renderer.render(root, camera);
    emit(G.dirty);
  }

  function destroy() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    if (world) window.removeEventListener('pointerdown', onDown, true);
    else {
      domEl.removeEventListener('pointerdown', onDown);
      domEl.removeEventListener('keydown', onKey);
      domEl.removeEventListener('keyup', onKey);
    }
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (ro) ro.disconnect();
    audio.close();
    const geos = new Set(), mats = new Set(), texs = new Set();
    const collect = (o) => o.traverse((n) => {
      if (n.geometry) geos.add(n.geometry);
      if (n.material) [].concat(n.material).forEach((mm) => { mats.add(mm); if (mm.map) texs.add(mm.map); });
    });
    collect(scene);
    if (root) collect(root);
    arrowGeos.forEach((g) => geos.add(g));
    if (world) world.parent.remove(scene);
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    texs.forEach((x) => x.dispose());
    M.grad.dispose();
    if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
  }

  /* --- api --- */
  const api = {
    hud,
    setSafe(s = {}) { ['top', 'bottom', 'left', 'right'].forEach((k) => { if (typeof s[k] === 'number') safe[k] = Math.max(0, s[k]); }); },
    start(mode = G.mode, o = {}) { startMatch(mode, o); },
    key(e) { onKey(e); },
    get camera() { return world ? wcam : camera; },
    snapCam() { cam.snap = true; updateCam(0); },
    destroy,
    restart() { startMatch(G.mode); },
    playAgain() { startMatch(G.mode); },
    setLevel(l) { if (R.LEVELS[l]) { G.level = l; mark(); } },
    setPlayers(n) { G.nLocal = R.clamp(n | 0, 2, 4); mark(); },
    setSound(b) { G.sound = !!b; audio.setSound(G.sound); mark(); },
    setMusic(b) { G.music = !!b; if (G.music) audio.unlock(); audio.setMusic(G.music); mark(); },
    setAimTone(b) { G.aimTone = !!b; if (!G.aimTone) audio.setTone(false); mark(); },
    pause(b) { G.paused = !!b; if (G.paused) cancelDraw(true); if (G.phase === 'draw' && G.paused) setPhase('aim'); mark(); },
    leave() { cancelDraw(true); G.left = true; G.paused = false; audio.setTone(false); mark(); },
    /* button-driven shooting for switch / assistive input */
    draw() { if (humanTurn() && !G.drawing) { audio.unlock(); G.ptr = 'btn'; startDraw(); } },
    loose() { if (G.drawing && shooter().kind === 'human') { if (G.power < 0.25) cancelDraw(); else release(); } },
    nudge(dx, dy) { if (humanTurn()) { G.aim.x = R.clamp(G.aim.x + dx, -AIM_MAX, AIM_MAX); G.aim.y = R.clamp(G.aim.y + dy, -AIM_MAX, AIM_MAX); G.lastInput = now(); } },
    unlockAudio() { audio.unlock(); },
  };

  startMatch(G.mode, {});
  updateActors(0);
  api.snapCam();
  raf = requestAnimationFrame(frame);
  emit(true);
  return api;
}
