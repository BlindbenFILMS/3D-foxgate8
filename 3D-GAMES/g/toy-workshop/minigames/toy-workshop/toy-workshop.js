/* TOY WORKSHOP: a toon-shaded toy-making race for 8 GATES 3D.
   Build the toy on the order card part by part, paint it, then hammer it tight.
   Standalone: makes its own renderer. World mode: opts.world = { renderer, camera, parent }. */
import * as THREE from '../../vendor/three/three.module.js';
import {
  PARTS, PART_ORDER, PAINTS, LEVELS, HAMMER, CAPTIONS, RULES_TEXT,
  makeRng, nextOrder, hammerPower, hammerGrade, scoreToy, starsFor, rewardFor, aiThink, aiChoose,
} from './toy-workshop-rules.js';
import { createAudio } from './toy-workshop-audio.js';

export const GAME = { key: 'toyWorkshop', name: 'TOY WORKSHOP', maxPlayers: 4 };

const INK = 0x1a1626;
const BENCH_GAP = 4.8;
const TOP = 1.2; /* bench surface height */
const TOY_SCALE = 1.3;
const IS_TOUCH = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);

/* ---------- materials ---------- */
let GRAD = null;
function gradMap() {
  if (!GRAD) {
    GRAD = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
    GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true;
  }
  return GRAD;
}
const toon = (hex) => new THREE.MeshToonMaterial({ color: hex, gradientMap: gradMap() });
const SHELL = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const VCOL = () => new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradMap() });

/* ---------- unit geometries (all 1 unit across) ---------- */
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 18, 12),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 18),
  cone: new THREE.ConeGeometry(0.5, 1, 18),
  wheel: new THREE.CylinderGeometry(0.5, 0.5, 1, 18).rotateX(Math.PI / 2),
  torus: new THREE.TorusGeometry(0.5, 0.06, 8, 28).rotateX(Math.PI / 2),
};
const PART_GEO = { BLOCK: GEO.box, WHEEL: GEO.wheel, BALL: GEO.sphere, CONE: GEO.cone, PLANK: GEO.box, PEG: GEO.cyl };
const PART_SAMPLE = { /* how each part looks sitting in its bin */
  BLOCK: [0.2, 0.16, 0.16], WHEEL: [0.2, 0.2, 0.08], BALL: [0.18, 0.18, 0.18],
  CONE: [0.16, 0.2, 0.16], PLANK: [0.24, 0.05, 0.16], PEG: [0.05, 0.22, 0.05],
};
const RAW_WOOD = '#ead1a6';

/* ---------- tiny merger: many shapes, 2 draw calls (fill + ink shell) ---------- */
const _ni = new WeakMap();
function nonIndexed(g) { let r = _ni.get(g); if (!r) { r = g.index ? g.toNonIndexed() : g; _ni.set(g, r); } return r; }
const _v = new THREE.Vector3(), _c = new THREE.Color(), _nm = new THREE.Matrix3();
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
function composeM(p, s, r) {
  _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0);
  return new THREE.Matrix4().compose(new THREE.Vector3(...p), _q.setFromEuler(_e).clone(), new THREE.Vector3(...s));
}
class Merger {
  constructor() { this.fill = []; this.shell = []; }
  add(geo, p, s, r, color, ink = 0.03) {
    this.fill.push({ geo, m: composeM(p, s, r), color });
    if (ink > 0) this.shell.push({ geo, m: composeM(p, s.map(v => v + ink * 2), r) });
    return this;
  }
  static merge(list, withColor) {
    let n = 0; for (const it of list) n += nonIndexed(it.geo).attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = withColor ? new Float32Array(n * 3) : null;
    let o = 0;
    for (const it of list) {
      const g = nonIndexed(it.geo), P = g.attributes.position, N = g.attributes.normal;
      _nm.getNormalMatrix(it.m); if (withColor) _c.set(it.color);
      for (let i = 0; i < P.count; i++, o++) {
        _v.fromBufferAttribute(P, i).applyMatrix4(it.m); pos[o * 3] = _v.x; pos[o * 3 + 1] = _v.y; pos[o * 3 + 2] = _v.z;
        _v.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); nor[o * 3] = _v.x; nor[o * 3 + 1] = _v.y; nor[o * 3 + 2] = _v.z;
        if (withColor) { col[o * 3] = _c.r; col[o * 3 + 1] = _c.g; col[o * 3 + 2] = _c.b; }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (withColor) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    return geo;
  }
  build() {
    const g = new THREE.Group();
    if (this.fill.length) g.add(new THREE.Mesh(Merger.merge(this.fill, true), VCOL()));
    if (this.shell.length) g.add(new THREE.Mesh(Merger.merge(this.shell, false), SHELL));
    return g;
  }
}

/* one shape with its own material + ink shell child (for things that move or recolour) */
function shape(geo, s, color, ink = 0.025) {
  const m = new THREE.Mesh(geo, toon(color));
  m.scale.set(...s);
  if (ink > 0) {
    const sh = new THREE.Mesh(geo, SHELL);
    sh.scale.set((s[0] + ink * 2) / s[0], (s[1] + ink * 2) / s[1], (s[2] + ink * 2) / s[2]);
    m.add(sh);
  }
  return m;
}

/* ---------- foxes: adapter (world kit when given, else a simple placeholder) ---------- */
function placeholderFox({ torso = ['#ec3013', '#e8742c', '#3a3836'], eyes = '#1a1626' }) {
  const [outfit, fur, legs] = torso;
  const cream = '#fbeedd', dark = '#2a2230';
  const root = new THREE.Group();
  const mkLeg = (x) => {
    const g = new THREE.Group(); g.position.set(x, 0.95, 0);
    g.add(new Merger().add(GEO.cyl, [0, -0.42, 0], [0.26, 0.85, 0.26], null, legs)
      .add(GEO.box, [0, -0.88, 0.08], [0.3, 0.13, 0.42], null, dark).build());
    root.add(g); return g;
  };
  const legL = mkLeg(0.22), legR = mkLeg(-0.22);
  const body = new THREE.Group(); body.position.y = 0.95; root.add(body);
  body.add(new Merger()
    .add(GEO.sphere, [0, 0.5, 0], [0.86, 1.08, 0.66], null, outfit)
    .add(GEO.sphere, [0, 0.42, 0.2], [0.5, 0.66, 0.34], null, cream, 0)
    .add(GEO.box, [0, 0.08, 0], [0.8, 0.12, 0.62], null, legs, 0.02)
    .add(GEO.sphere, [0, 0.28, -0.5], [0.32, 0.86, 0.32], [-0.9, 0, 0], fur)
    .add(GEO.sphere, [0, 0.0, -0.84], [0.22, 0.3, 0.22], [-0.9, 0, 0], cream, 0.02).build());
  const head = new THREE.Group(); head.position.y = 1.2; body.add(head);
  head.add(new Merger()
    .add(GEO.sphere, [0, 0, 0], [0.8, 0.72, 0.72], null, fur)
    .add(GEO.cone, [0, -0.08, 0.42], [0.34, 0.36, 0.3], [Math.PI / 2, 0, 0], cream)
    .add(GEO.sphere, [0, -0.07, 0.6], [0.11, 0.1, 0.1], null, dark, 0)
    .add(GEO.sphere, [0.16, 0.08, 0.31], [0.1, 0.13, 0.06], null, eyes, 0)
    .add(GEO.sphere, [-0.16, 0.08, 0.31], [0.1, 0.13, 0.06], null, eyes, 0)
    .add(GEO.cone, [0.22, 0.44, 0], [0.24, 0.36, 0.14], [0, 0, -0.25], fur)
    .add(GEO.cone, [-0.22, 0.44, 0], [0.24, 0.36, 0.14], [0, 0, 0.25], fur).build());
  const mkArm = (x) => {
    const g = new THREE.Group(); g.position.set(x, 0.86, 0);
    g.add(new Merger().add(GEO.cyl, [0, -0.34, 0], [0.2, 0.68, 0.2], null, fur)
      .add(GEO.sphere, [0, -0.72, 0], [0.24, 0.24, 0.24], null, cream).build());
    body.add(g); return g;
  };
  const armL = mkArm(0.5), armR = mkArm(-0.5);
  armL.rotation.z = 0.12; armR.rotation.z = -0.12;
  root.userData.P = { body, head, arms: [armL, armR], legs: [legL, legR] };
  return root;
}
function makeFox(o, kit) {
  if (kit && typeof kit.makeFox === 'function') {
    try {
      const f = kit.makeFox({ torso: o.torso, outfit: o.outfit || 'vest', mood: o.mood || 'happy' });
      if (f && f.userData && f.userData.P) { f.userData.kit = true; return f; }
    } catch (e) { /* fall back to the placeholder */ }
  }
  return placeholderFox(o);
}
function animFox(f, dt, speed, kit, t) {
  if (f.userData.kit && kit && kit.animFox) { kit.animFox(f, dt, speed); return; }
  const P = f.userData.P;
  P.body.position.y = 0.95 + Math.sin(t * 2.2) * 0.02;
  P.head.rotation.z = Math.sin(t * 1.1) * 0.05;
}
function addAccessories(fox, who, benchGroup) {
  const P = fox.userData.P;
  if (who === 'HOPE') {
    const g = new Merger()
      .add(GEO.box, [0.15, 0.08, 0.36], [0.2, 0.12, 0.04], null, '#111018', 0.015)
      .add(GEO.box, [-0.15, 0.08, 0.36], [0.2, 0.12, 0.04], null, '#111018', 0.015)
      .add(GEO.box, [0, 0.1, 0.36], [0.12, 0.03, 0.03], null, '#111018', 0).build();
    P.head.add(g);
    const cane = new Merger()
      .add(GEO.cyl, [0, 0.6, 0], [0.05, 1.2, 0.05], null, '#f4f1ea', 0.015)
      .add(GEO.cyl, [0, 0.08, 0], [0.055, 0.16, 0.055], null, '#ec3013', 0.015)
      .add(GEO.sphere, [0, 1.2, 0], [0.08, 0.08, 0.08], null, '#1a1626', 0).build();
    cane.position.set(-1.9, 0, -0.55); cane.rotation.z = -0.22;
    benchGroup.add(cane);
  }
  if (who === 'PIP') {
    P.head.add(new Merger().add(GEO.cyl, [0, 0.34, 0.04], [0.5, 0.14, 0.5], null, '#ffd23a', 0.02)
      .add(GEO.box, [0, 0.29, 0.3], [0.4, 0.04, 0.24], null, '#ffd23a', 0.02).build());
  }
}
function makeChair() { /* NOBLE's hover chair */
  const g = new Merger()
    .add(GEO.cyl, [0, 0.42, 0], [1.25, 0.14, 1.25], null, '#2b2a38')
    .add(GEO.cyl, [0, 0.34, 0], [0.9, 0.06, 0.9], null, '#ec3013', 0)
    .add(GEO.box, [0, 1.35, -0.62], [1.0, 1.5, 0.14], [-0.12, 0, 0], '#2b2a38')
    .add(GEO.box, [0, 1.35, -0.54], [0.7, 1.1, 0.04], [-0.12, 0, 0], '#ec3013', 0)
    .add(GEO.box, [0.62, 1.0, -0.1], [0.12, 0.12, 0.9], null, '#2b2a38')
    .add(GEO.box, [-0.62, 1.0, -0.1], [0.12, 0.12, 0.9], null, '#2b2a38').build();
  return g;
}

/* ---------- cast ---------- */
const CAST = {
  PIP:   { torso: ['#ffd23a', '#f08a3a', '#c99a1c'], outfit: 'tee' },
  HOPE:  { torso: ['#f4efe6', '#d9692a', '#2f6bff'], outfit: 'coat' },
  NOBLE: { torso: ['#1d1b2a', '#b5452a', '#3a3836'], outfit: 'coat', eyes: '#ff2a1a' },
};
const HUMAN_COLORS = [
  ['#ec3013', '#e8742c', '#3a3836'], ['#2f6bff', '#e8742c', '#3a3836'],
  ['#8b4fd8', '#e8742c', '#3a3836'], ['#2fbf5b', '#e8742c', '#3a3836'],
];

/* ---------- camera fit: frame points inside the free screen rect ---------- */
const _dummy = new THREE.PerspectiveCamera();
function fitCamera(points, w, h, fovDeg, dir, safe) {
  _dummy.position.copy(dir); _dummy.lookAt(0, 0, 0);
  const q = _dummy.quaternion.clone(), qi = q.clone().invert();
  const c = new THREE.Vector3(); points.forEach(p => c.add(p)); c.multiplyScalar(1 / points.length);
  const loc = points.map(p => p.clone().sub(c).applyQuaternion(qi));
  const tv = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2), th = tv * (w / h);
  const l = Math.min(safe.left, w * 0.4), r = Math.min(safe.right, w * 0.4);
  const t = Math.min(safe.top, h * 0.45), b = Math.min(safe.bottom, h * 0.45);
  const x0 = (l / w) * 2 - 1, x1 = ((w - r) / w) * 2 - 1, y0 = 1 - ((h - b) / h) * 2, y1 = 1 - (t / h) * 2;
  const fw = (x1 - x0) * 0.9, fh = (y1 - y0) * 0.9;
  const span = (D, sx, sy) => {
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    for (const p of loc) {
      const d = D - p.z; if (d < 0.3) return null;
      const x = (p.x - sx) / (d * th), y = (p.y - sy) / (d * tv);
      mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
    }
    return { mnx, mxx, mny, mxy };
  };
  let lo = 0.5, hi = 120;
  for (let i = 0; i < 32; i++) {
    const D = (lo + hi) / 2, s = span(D, 0, 0);
    if (s && s.mxx - s.mnx <= fw && s.mxy - s.mny <= fh) hi = D; else lo = D;
  }
  /* refine with the real projection (shift + distance together) */
  let D = hi, sx = 0, sy = 0;
  const fx = (x0 + x1) / 2, fy = (y0 + y1) / 2;
  for (let it = 0; it < 12; it++) {
    const s = span(D, sx, sy);
    if (!s) { D *= 1.2; continue; }
    const cx = (s.mnx + s.mxx) / 2, cy = (s.mny + s.mxy) / 2;
    const r = Math.max((s.mxx - s.mnx) / fw, (s.mxy - s.mny) / fh);
    sx += (cx - fx) * D * th * 0.8; sy += (cy - fy) * D * tv * 0.8;
    D *= 1 + (r - 1) * 0.8;
  }
  const off = new THREE.Vector3(sx, sy, D).applyQuaternion(q);
  return { pos: c.clone().add(off), quat: q };
}

/* ======================================================================= */
export async function createToyWorkshop({ container, onState = () => {}, opts = {} }) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const isWorld = !!world;

  /* ---------- save ---------- */
  const LS = (k) => GAME.key + '.' + k;
  const store = {
    get(k, d) {
      if (save) { try { return save.stat(LS(k), d); } catch (e) { /* ignore */ } }
      try { const v = localStorage.getItem(LS(k)); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      if (save) { try { save.setStat(LS(k), v); return; } catch (e) { /* ignore */ } }
      try { localStorage.setItem(LS(k), JSON.stringify(v)); } catch (e) { /* ignore */ }
    },
    gold(n) {
      if (save) { try { save.addGold(n); return; } catch (e) { /* ignore */ } }
      store.set('gold', (store.get('gold', 0) || 0) + n);
    },
  };
  const saved = store.get('settings', {}) || {};

  /* ---------- renderer / scene ---------- */
  let renderer = null, scene, room;
  if (isWorld) {
    scene = new THREE.Group(); world.parent.add(scene);
    room = new THREE.Scene(); /* throw-away: lights + room never touch the town */
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.75 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    container.appendChild(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color('#f3e2c4');
    room = scene;
  }
  const dom = () => (isWorld ? world.renderer.domElement : renderer.domElement);

  /* lights + room (standalone only gets them in the rendered scene) */
  room.add(new THREE.HemisphereLight(0xfff4e2, 0x8a6a50, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(4, 10, 7); room.add(sun);
  if (!isWorld) buildRoom(room);

  const camera = new THREE.PerspectiveCamera(isWorld ? world.camera.fov : 40, 1, 0.1, 300);
  const wcam = new THREE.PerspectiveCamera(camera.fov, 1, 0.1, 300);
  camera.position.set(0, 6, 9); camera.lookAt(0, 1.5, 0);
  const camGoal = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
  let safe = { top: 0, bottom: 0, left: 0, right: 0 };

  const audio = createAudio({ music: isWorld ? false : (saved.music ?? true), sound: saved.sound ?? true });

  /* particles: one instanced mesh */
  const PMAX = 140;
  const parts = new THREE.InstancedMesh(GEO.box, new THREE.MeshToonMaterial({ gradientMap: gradMap() }), PMAX);
  parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parts.frustumCulled = false;
  const pool = [];
  for (let i = 0; i < PMAX; i++) { pool.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.08, r: 0 }); parts.setColorAt(i, new THREE.Color('#ffffff')); }
  scene.add(parts);
  const _m4 = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _ps = new THREE.Vector3();
  function burst(pos, color, n = 12, speed = 2.2, up = 2.5) {
    const col = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = pool.findIndex(p => p.life <= 0); if (i < 0) return;
      const p = pool[i];
      p.life = 0.6 + Math.random() * 0.4; p.p.copy(pos);
      p.v.set((Math.random() - 0.5) * speed, up * (0.5 + Math.random()), (Math.random() - 0.5) * speed);
      p.s = 0.05 + Math.random() * 0.06; p.r = Math.random() * 6;
      parts.setColorAt(i, col);
    }
    parts.instanceColor.needsUpdate = true;
  }
  function updateParticles(dt) {
    for (let i = 0; i < PMAX; i++) {
      const p = pool[i];
      if (p.life > 0) {
        p.life -= dt; p.v.y -= 7 * dt; p.p.addScaledVector(p.v, dt); p.r += dt * 6;
        if (p.p.y < TOP + 0.02 && p.v.y < 0) { p.p.y = TOP + 0.02; p.v.multiplyScalar(0.4); p.v.y *= -0.5; }
        const s = p.life > 0 ? p.s * Math.min(1, p.life * 3) : 0;
        _pq.setFromEuler(_e.set(p.r, p.r * 0.7, 0)); _ps.set(s, s, s);
        _m4.compose(p.p, _pq, _ps);
      } else _m4.makeScale(0, 0, 0);
      parts.setMatrixAt(i, _m4);
    }
    parts.instanceMatrix.needsUpdate = true;
  }

  /* ---------- tweens ---------- */
  let tweens = [];
  function tween(dur, fn, done) { tweens.push({ t: 0, dur, fn, done }); }
  function updateTweens(dt) {
    const list = tweens; tweens = [];
    for (const tw of list) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) { if (tw.done) tw.done(); } else tweens.push(tw);
    }
  }
  const ease = (k) => 1 - Math.pow(1 - k, 3);

  /* ---------- game state ---------- */
  const S = {
    phase: 'countdown', mode: saved.mode || 'cpu', level: saved.level ?? 1, cpuCount: saved.cpuCount ?? 1,
    players: saved.players ?? 2, shiftCfg: saved.shift ?? 90, shift: 90, time: 90, capT: 4.5, cd: 1.6, paused: false,
    benches: [], active: 0, turn: 0, toast: null, toastT: 0, caption: null, result: null,
    idle: 0, hint: null, demoT: 0, flash: 0, lastTick: 99, best: store.get('best', 0) || 0, seed: 1,
  };
  if (!['cpu', 'local', 'demo'].includes(S.mode)) S.mode = 'cpu';
  if (opts.mode) S.mode = opts.mode;
  if (opts.level != null) S.level = opts.level;

  /* ---------- benches ---------- */
  function makeBench(i, cfg) {
    const g = new THREE.Group();
    const xs = [0, BENCH_GAP, -BENCH_GAP, BENCH_GAP * 2];
    g.position.x = cfg.x ?? xs[i];
    scene.add(g);
    /* static pieces: bench, crates with sample parts, paint pots */
    const M = new Merger();
    M.add(GEO.box, [0, TOP - 0.08, 0], [3.7, 0.16, 1.6], null, '#c58b55', 0.035);
    for (const [x, z] of [[-1.7, -0.65], [1.7, -0.65], [-1.7, 0.65], [1.7, 0.65]]) M.add(GEO.box, [x, (TOP - 0.16) / 2, z], [0.16, TOP - 0.16, 0.16], null, '#8a5a32', 0.03);
    M.add(GEO.box, [0, TOP - 0.25, 0.74], [3.5, 0.18, 0.06], null, '#9a6a3c', 0.02);
    M.add(GEO.box, [0, 0.3, 0], [3.4, 0.06, 1.3], null, '#8a5a32', 0.02);
    M.add(GEO.box, [0.1, TOP + 0.012, 0.05], [1.3, 0.025, 1.0], null, '#2f5d50', 0.012);
    const bins = [], pots = [], hits = [];
    PART_ORDER.forEach((id, k) => {
      const x = [-1.5, -1.07, -0.64][k % 3], z = k < 3 ? 0.33 : -0.28;
      M.add(GEO.box, [x, TOP + 0.08, z], [0.38, 0.16, 0.38], null, '#8a5a32', 0.025);
      M.add(GEO.box, [x, TOP + 0.163, z], [0.3, 0.01, 0.3], null, '#3b2a1c', 0);
      const sc = PART_SAMPLE[id];
      M.add(PART_GEO[id], [x, TOP + 0.17 + sc[1] / 2, z], sc, id === 'CONE' ? null : null, id === 'WHEEL' ? '#3b3340' : PARTS[id].wood, 0.018);
      const hit = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
      hit.scale.set(0.42, 0.5, 0.42); hit.position.set(x, TOP + 0.2, z); hit.userData = { kind: 'part', id };
      g.add(hit); hits.push(hit); bins.push({ id, pos: new THREE.Vector3(x, TOP + 0.3, z) });
    });
    PAINTS.forEach((pt, k) => {
      const x = [0.98, 1.44][k % 2], z = k < 2 ? 0.33 : -0.28;
      M.add(GEO.cyl, [x, TOP + 0.13, z], [0.32, 0.26, 0.32], null, '#d8d4cc', 0.025);
      M.add(GEO.cyl, [x, TOP + 0.265, z], [0.27, 0.02, 0.27], null, pt.hex, 0);
      const hit = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
      hit.scale.set(0.42, 0.5, 0.42); hit.position.set(x, TOP + 0.2, z); hit.userData = { kind: 'paint', id: pt.id };
      g.add(hit); hits.push(hit); pots.push({ id: pt.id, pos: new THREE.Vector3(x, TOP + 0.3, z), hex: pt.hex });
    });
    g.add(M.build());

    /* hammer */
    const hammer = new THREE.Group();
    const hm = new Merger().add(GEO.cyl, [0, 0.3, 0], [0.07, 0.6, 0.07], null, '#b9824c', 0.02)
      .add(GEO.box, [0, 0.62, 0], [0.32, 0.15, 0.15], null, '#5d5a66', 0.025).build();
    hammer.add(hm); g.add(hammer);
    const hammerRest = { p: new THREE.Vector3(0.45, TOP + 0.05, 0.62), r: new THREE.Euler(0, 0.25, -Math.PI / 2) };
    hammer.position.copy(hammerRest.p); hammer.rotation.copy(hammerRest.r);
    const hHit = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
    hHit.scale.set(0.8, 0.4, 0.4); hHit.position.set(0.4, TOP + 0.1, 0.62); hHit.userData = { kind: 'hammer', id: 'HAMMER' };
    g.add(hHit); hits.push(hHit);

    /* toy anchor + toy hit (tap the toy to hammer) */
    const anchor = new THREE.Group(); anchor.position.set(0.1, TOP + 0.025, 0.05); anchor.scale.setScalar(TOY_SCALE); g.add(anchor);
    const toy = new THREE.Group(); anchor.add(toy);
    const ghost = new THREE.Group(); anchor.add(ghost);
    const tHit = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ visible: false }));
    tHit.scale.set(1.3, 1.5, 1.0); tHit.position.set(0.1, TOP + 0.75, 0.05); tHit.userData = { kind: 'toy', id: 'TOY' };
    g.add(tHit); hits.push(tHit);

    /* gift box */
    const gift = new Merger().add(GEO.box, [0, 0.4, 0], [1.0, 0.8, 0.8], null, '#ec3013', 0.03)
      .add(GEO.box, [0, 0.4, 0], [1.02, 0.82, 0.16], null, '#ffd23a', 0)
      .add(GEO.box, [0, 0.4, 0], [0.16, 0.82, 0.82], null, '#ffd23a', 0)
      .add(GEO.sphere, [0.12, 0.86, 0], [0.24, 0.16, 0.16], null, '#ffd23a', 0.02)
      .add(GEO.sphere, [-0.12, 0.86, 0], [0.24, 0.16, 0.16], null, '#ffd23a', 0.02).build();
    gift.visible = false; anchor.add(gift);

    /* hint marker */
    const marker = new THREE.Mesh(GEO.torus, new THREE.MeshBasicMaterial({ color: '#ffd23a' }));
    marker.scale.set(0.5, 0.5, 0.5); marker.visible = false; g.add(marker);

    /* fox */
    const who = cfg.who;
    const look = CAST[who] || { torso: HUMAN_COLORS[cfg.colorIdx || 0], outfit: 'vest' };
    const fox = makeFox({ torso: look.torso, outfit: look.outfit, eyes: look.eyes, mood: 'happy' }, kit);
    fox.position.set(0.1, 0, -1.3);
    let chair = null;
    if (who === 'NOBLE') { chair = makeChair(); chair.position.set(0.1, 0, -1.3); g.add(chair); fox.position.y = 0.38; }
    g.add(fox); addAccessories(fox, who, g);

    const b = {
      i, g, bins, pots, hits, hammer, hammerRest, anchor, toy, ghost, gift, marker, fox, chair,
      human: !!cfg.human, level: cfg.level ?? 1, name: cfg.name, who, color: look.torso[0],
      score: 0, toys: 0, order: null, step: 0, mistakes: 0, t0: 0, busy: 0,
      ham: { charging: false, held: 0, power: 0, tries: 0, inPerfect: false, slam: 0 },
      aiT: 1, aiHam: null, rng: makeRng(S.seed * 97 + i * 13 + 7),
      pose: { arms: [0, 0], armT: [0, 0], lean: 0, leanT: 0 },
      toyMeshes: [], paintable: [],
    };
    newOrder(b);
    return b;
  }

  function clearToy(b) {
    for (const m of b.toyMeshes) b.toy.remove(m);
    b.toyMeshes = []; b.paintable = [];
    b.toy.scale.set(1, 1, 1); b.toy.position.set(0, 0, 0); b.toy.visible = true;
  }
  function mirrors(slot) {
    const out = [{ p: slot.p.slice(), r: (slot.r || [0, 0, 0]).slice() }];
    if (slot.mir === 'x' || slot.mir === 'xz') out.push({ p: [-slot.p[0], slot.p[1], slot.p[2]], r: [slot.r ? slot.r[0] : 0, slot.r ? slot.r[1] : 0, slot.r ? -slot.r[2] : 0] });
    if (slot.mir === 'z' || slot.mir === 'xz') out.slice().forEach(o => out.push({ p: [o.p[0], o.p[1], -o.p[2]], r: o.r.slice() }));
    return out;
  }
  function slotColor(slot) { return slot.nat ? (slot.col || (slot.t === 'WHEEL' ? '#3b3340' : PARTS[slot.t].wood)) : RAW_WOOD; }
  function showGhost(b) {
    while (b.ghost.children.length) b.ghost.remove(b.ghost.children[0]);
    const st = b.order && b.order.steps[b.step];
    if (!st || st.kind !== 'part') return;
    const slot = b.order.toy.slots[st.slot];
    for (const m of mirrors(slot)) {
      const gm = new THREE.Mesh(PART_GEO[slot.t], new THREE.MeshBasicMaterial({ color: '#5aa0ff', transparent: true, opacity: 0.35, depthWrite: false }));
      gm.scale.set(...slot.s); gm.position.set(...m.p); gm.rotation.set(...m.r);
      b.ghost.add(gm);
    }
  }
  function newOrder(b) {
    clearToy(b);
    b.order = nextOrder(b.rng, b.toys);
    b.step = 0; b.mistakes = 0; b.t0 = elapsed(b); b.ham.tries = 0;
    showGhost(b);
  }
  function elapsed(b) { return S.mode === 'local' ? (S.shift - S.time) : (S.shift - S.time); }

  function benchWorldPos(b, local) { return local.clone().add(b.g.position); }

  /* ---------- actions ---------- */
  function setArm(b, side, v, back = 0.35) {
    b.pose.armT[side] = v;
    if (back) setTimeout(() => { if (b.pose.armT[side] === v) b.pose.armT[side] = 0; }, back * 1000);
  }
  function armFor(b, x) { /* arm whose shoulder is on the same side as x */
    const A = b.fox.userData.P.arms;
    return (A[0].position.x >= 0) === (x >= 0) ? 0 : 1;
  }

  function act(b, kind, id) {
    if (S.phase !== 'play' || S.paused || b.busy > 0) return false;
    const st = b.order.steps[b.step];
    if (!st) return false;
    if (st.kind !== kind || st.id !== id) { wrong(b, kind, id); return false; }
    if (kind === 'part') placePart(b, st.slot);
    else if (kind === 'paint') paintToy(b);
    return true;
  }

  function wrong(b, kind, id) {
    b.mistakes++; b.busy = 0.3;
    if (b.human || b.i === S.active) audio.sfx.wrong();
    const src = kind === 'part' ? b.bins.find(x => x.id === id) : kind === 'paint' ? b.pots.find(x => x.id === id) : null;
    if (src) {
      setArm(b, armFor(b, src.pos.x), -1.0, 0.25);
      burst(benchWorldPos(b, src.pos), '#3a3836', 5, 1, 1.2);
    }
    const x0 = b.toy.position.x;
    tween(0.3, k => { b.toy.position.x = x0 + Math.sin(k * Math.PI * 6) * 0.04 * (1 - k); });
    if (b.human) { toast('WRONG PART  -15', 'bad'); S.idle = 2.2; }
    notify();
  }

  function placePart(b, slotIdx) {
    const slot = b.order.toy.slots[slotIdx];
    const bin = b.bins.find(x => x.id === slot.t);
    b.busy = 0.32; b.step++;
    setArm(b, armFor(b, bin.pos.x), -1.25, 0.3);
    b.pose.leanT = 0.18; setTimeout(() => { b.pose.leanT = 0; }, 300);
    const col = slotColor(slot);
    const from = bin.pos.clone().sub(b.anchor.position).multiplyScalar(1 / TOY_SCALE);
    for (const m of mirrors(slot)) {
      const mesh = shape(PART_GEO[slot.t], slot.s, col, 0.022);
      mesh.rotation.set(...m.r);
      const to = new THREE.Vector3(...m.p);
      mesh.position.copy(from); mesh.scale.multiplyScalar(0.4);
      b.toy.add(mesh); b.toyMeshes.push(mesh);
      if (!slot.nat) b.paintable.push(mesh);
      const s0 = mesh.scale.clone(), s1 = new THREE.Vector3(...slot.s);
      tween(0.26, k => {
        const e = ease(k);
        mesh.position.lerpVectors(from, to, e); mesh.position.y += Math.sin(k * Math.PI) * 0.45;
        mesh.scale.lerpVectors(s0, s1, e);
      }, () => { mesh.position.copy(to); mesh.scale.copy(s1); });
    }
    setTimeout(() => {
      if (!b.order) return;
      tween(0.18, k => { const s = 1 + Math.sin(k * Math.PI) * 0.1; b.toy.scale.set(s, 2 - s, s); });
      if (b.human || b.i === S.active) audio.sfx.place(b.step);
    }, 260);
    showGhost(b);
    notify();
  }

  function paintToy(b) {
    const pt = b.order.paint;
    const pot = b.pots.find(x => x.id === pt.id);
    b.busy = 0.42; b.step++;
    setArm(b, armFor(b, pot.pos.x), -1.25, 0.35);
    if (b.human || b.i === S.active) audio.sfx.paint();
    const target = new THREE.Color(pt.hex);
    const mats = b.paintable.map(m => ({ mat: m.material, from: m.material.color.clone() }));
    tween(0.38, k => { for (const x of mats) x.mat.color.copy(x.from).lerp(target, ease(k)); });
    const top = benchWorldPos(b, b.anchor.position.clone().add(new THREE.Vector3(0, 0.75, 0)));
    burst(top, pt.hex, 16, 2.4, 2.2);
    showGhost(b);
    notify();
  }

  function hammerDown(b) {
    if (S.phase !== 'play' || S.paused || b.busy > 0) return;
    const st = b.order.steps[b.step];
    if (!st) return;
    if (st.kind !== 'hammer') { if (b.human) { audio.sfx.tap(); toast(st.kind === 'part' ? 'PARTS FIRST' : 'PAINT FIRST', 'bad'); } return; }
    if (b.ham.charging) return;
    b.ham.charging = true; b.ham.held = 0; b.ham.power = 0; b.ham.inPerfect = false;
    notify();
  }
  function hammerUp(b) {
    if (!b.ham.charging) return;
    b.ham.charging = false;
    if (b.human || b.i === S.active) audio.charge(false);
    release(b, b.ham.power);
  }
  function release(b, power) {
    const grade = hammerGrade(power);
    b.busy = 0.4;
    /* slam */
    const hp = b.hammer.position, hr = b.hammer.rotation;
    const p0 = hp.clone(), r0 = hr.x;
    const piv = hammerPivot(b);
    tween(0.12, k => { hp.lerpVectors(p0, piv, k); hr.set(THREE.MathUtils.lerp(r0, 1.35, k), 0, 0); }, () => {
      if (b.human || b.i === S.active) audio.sfx.hammer(grade);
      tween(0.2, k => { const s = 1 - Math.sin(k * Math.PI) * 0.16; b.toy.scale.set(2 - s, s, 2 - s); });
      const at = benchWorldPos(b, b.anchor.position.clone().add(new THREE.Vector3(0, toyHeight(b), 0)));
      burst(at, grade === 'PERFECT' ? '#ffd23a' : grade === 'GOOD' ? '#ffffff' : '#3a3836', grade === 'PERFECT' ? 18 : 8, 2.6, 2.6);
    });
    setArm(b, armFor(b, 1), -1.1, 0.35);
    if (grade === 'MISS') {
      b.ham.tries++;
      if (b.human) toast(b.ham.tries >= 2 ? 'WOBBLY, SHIPPED' : 'MISS, TRY AGAIN', 'bad');
      if (b.ham.tries >= 2) setTimeout(() => ship(b, 'MISS'), 380);
      else setTimeout(() => restHammer(b), 380);
    } else setTimeout(() => ship(b, grade), 380);
    notify();
  }
  function hammerPivot(b) { return b.anchor.position.clone().add(new THREE.Vector3(0.12, toyHeight(b) - 0.08, -0.6)); }
  function toyHeight(b) {
    let h = 0.4;
    if (b.order) for (const s of b.order.toy.slots) h = Math.max(h, s.p[1] + s.s[1] / 2);
    return h * TOY_SCALE;
  }
  function restHammer(b) {
    const p0 = b.hammer.position.clone(), r0 = b.hammer.rotation.clone();
    tween(0.25, k => {
      b.hammer.position.lerpVectors(p0, b.hammerRest.p, ease(k));
      b.hammer.rotation.set(THREE.MathUtils.lerp(r0.x, b.hammerRest.r.x, k), THREE.MathUtils.lerp(r0.y, b.hammerRest.r.y, k), THREE.MathUtils.lerp(r0.z, b.hammerRest.r.z, k));
    });
  }
  function ship(b, grade) {
    if (!b.order || S.phase === 'result') return;
    const seconds = elapsed(b) - b.t0;
    const sc = scoreToy({ order: b.order, seconds, mistakes: b.mistakes, grade });
    b.score += sc.total; b.toys++;
    b.busy = 0.85; b.step = b.order.steps.length;
    if (b.human) toast((grade === 'PERFECT' ? 'PERFECT  ' : grade === 'GOOD' ? 'NICE  ' : '') + '+' + sc.total, 'good');
    if (b.human || b.i === S.active) audio.sfx.ship();
    restHammer(b);
    b.gift.visible = true; b.gift.scale.set(0.01, 0.01, 0.01); b.gift.position.set(0, 0, 0);
    tween(0.2, k => { const s = ease(k) * 1.02; b.gift.scale.set(s, s, s); }, () => {
      b.toy.visible = false;
      burst(benchWorldPos(b, b.anchor.position.clone().add(new THREE.Vector3(0, 1.1, 0))), '#ffd23a', 14, 3, 3);
      tween(0.45, k => {
        b.gift.position.set(k * 2.2, Math.sin(k * Math.PI) * 0.8 + k * 0.5, -k * 1.4);
        const s = 1 - k * 0.6; b.gift.scale.set(s, s, s); b.gift.rotation.z = -k * 1.5;
      }, () => { b.gift.visible = false; b.gift.rotation.z = 0; if (S.phase !== 'result') newOrder(b); notify(); });
    });
    notify();
  }

  /* ---------- toasts / captions ---------- */
  let toastN = 0;
  function toast(text, tone = 'good') { S.toast = { text, tone, n: ++toastN }; S.toastT = 1.1; notify(); }

  /* ---------- match setup ---------- */
  function clearBenches() {
    for (const b of S.benches) scene.remove(b.g);
    S.benches = []; tweens = [];
    for (const p of pool) p.life = 0;
  }
  function setupMatch(mode) {
    clearBenches();
    S.mode = mode || S.mode; S.seed = (S.seed * 7 + 3) % 9973;
    S.shift = S.mode === 'demo' ? 60 : S.mode === 'local' ? Math.min(S.shiftCfg, 60) : S.shiftCfg;
    S.time = S.shift; S.capT = 4.5; S.turn = 0; S.active = 0; S.result = null; S.paused = false;
    S.phase = 'countdown'; S.cd = 1.6; S.toast = null; S.hint = null; S.idle = 0; S.lastTick = 99; S.caption = null;
    if (S.mode === 'cpu') {
      S.benches.push(makeBench(0, { human: true, name: 'YOU', colorIdx: 0 }));
      const order = [LEVELS[S.level].name, ...['PIP', 'HOPE', 'NOBLE'].filter(n => n !== LEVELS[S.level].name)];
      for (let k = 0; k < Math.max(1, Math.min(3, S.cpuCount)); k++) {
        const who = order[k]; const lv = LEVELS.findIndex(l => l.name === who);
        S.benches.push(makeBench(k + 1, { human: false, name: who, who, level: lv }));
      }
    } else if (S.mode === 'local') {
      const n = Math.max(2, Math.min(4, S.players));
      for (let k = 0; k < n; k++) S.benches.push(makeBench(k, { human: true, name: 'PLAYER ' + (k + 1), colorIdx: k, x: k * BENCH_GAP }));
    } else {
      S.benches.push(makeBench(0, { human: false, name: 'HOPE', who: 'HOPE', level: 1 }));
      S.benches.push(makeBench(1, { human: false, name: 'NOBLE', who: 'NOBLE', level: 2 }));
      S.caption = CAPTIONS.part;
    }
    refit(); snap();
    persist();
    notify();
  }
  function persist() {
    store.set('settings', { mode: S.mode, level: S.level, cpuCount: S.cpuCount, players: S.players, shift: S.shiftCfg, sound: audio.sound, music: isWorld ? (saved.music ?? true) : audio.music });
  }

  function humanBench() {
    const b = S.benches[S.active];
    return b && b.human ? b : null;
  }

  function endShift() {
    audio.sfx.bell();
    for (const b of S.benches) { if (b.ham.charging) { b.ham.charging = false; } }
    audio.charge(false);
    if (S.mode === 'local' && S.turn < S.benches.length - 1) {
      S.phase = 'pass'; S.passTo = S.benches[S.turn + 1].name; notify(); return;
    }
    S.phase = 'result';
    const rows = S.benches.map(b => ({ name: b.name, score: b.score, toys: b.toys, me: b.human && S.mode === 'cpu', color: b.color }))
      .sort((a, c) => c.score - a.score);
    let title, win = false, score = 0, toys = 0;
    if (S.mode === 'cpu') {
      const me = S.benches[0]; score = me.score; toys = me.toys;
      win = S.benches.slice(1).every(b => me.score > b.score);
      title = win ? 'YOU WIN THE SHIFT' : rows[0].score === me.score ? 'A TIE AT THE TOP' : rows[0].name + ' WINS THE SHIFT';
    } else if (S.mode === 'local') {
      const tie = rows.length > 1 && rows[0].score === rows[1].score;
      title = tie ? 'IT IS A TIE' : rows[0].name + ' WINS'; score = rows[0].score; toys = rows[0].toys; win = !tie;
    } else {
      title = rows[0].name + ' WINS THE DEMO'; score = rows[0].score; toys = rows[0].toys;
    }
    const stars = starsFor(score, S.shift);
    let gold = 0, xp = 0, newBest = false;
    if (S.mode !== 'demo') {
      const r = rewardFor({ score, toys, stars, win }); gold = r.gold; xp = r.xp;
      store.gold(gold); store.set('xp', (store.get('xp', 0) || 0) + xp);
      if (score > S.best) { S.best = score; newBest = true; store.set('best', score); }
      (win ? audio.sfx.win : audio.sfx.lose)();
    }
    S.result = { title, rows, score, best: S.best, gold, xp, stars, win, newBest, toys };
    S.demoT = 5;
    notify();
  }

  /* ---------- camera ---------- */
  function viewSize() {
    const el = isWorld ? world.renderer.domElement : container;
    return { w: Math.max(1, el.clientWidth || 1), h: Math.max(1, el.clientHeight || 1) };
  }
  function refit() {
    const { w, h } = viewSize();
    const portrait = h > w * 1.1;
    camera.fov = isWorld ? world.camera.fov : (portrait ? 52 : 38);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const b = S.benches[S.active] || S.benches[0];
    const ox = b ? b.g.position.x : 0;
    const pts = [];
    const X = portrait ? [-1.78, 1.78] : [-1.95, 1.95];
    for (const x of X) for (const y of [TOP - 0.1, portrait ? 2.6 : 2.9]) for (const z of [-1.4, 0.82]) pts.push(new THREE.Vector3(x + ox, y, z));
    const dir = new THREE.Vector3(0, portrait ? 1.05 : 0.62, 1).normalize();
    const f = fitCamera(pts, w, h, camera.fov, dir, safe);
    camGoal.pos.copy(f.pos); camGoal.quat.copy(f.quat);
  }
  function snap() { camera.position.copy(camGoal.pos); camera.quaternion.copy(camGoal.quat); mirrorCam(); }
  const _wq = new THREE.Quaternion();
  function mirrorCam() {
    camera.updateMatrixWorld();
    if (!isWorld) return;
    scene.updateWorldMatrix(true, false);
    wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
    scene.getWorldQuaternion(_wq); wcam.quaternion.copy(_wq).multiply(camera.quaternion);
    wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let pointerHammer = false;
  function onDown(e) {
    if (e.target !== dom()) return;
    if (isWorld) { e.preventDefault(); e.stopImmediatePropagation(); }
    audio.unlock(); S.idle = 0; S.hint = null;
    const b = humanBench(); if (!b || S.phase !== 'play') return;
    const rect = dom().getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(b.hits, false)[0];
    if (!hit) return;
    const u = hit.object.userData;
    if (u.kind === 'part' || u.kind === 'paint') act(b, u.kind, u.id);
    else if (u.kind === 'hammer' || u.kind === 'toy') {
      const st = b.order.steps[b.step];
      if (st && st.kind === 'hammer') { hammerDown(b); pointerHammer = true; }
      else if (u.kind === 'hammer') hammerDown(b);
    }
  }
  function onUp() { if (pointerHammer) { pointerHammer = false; const b = humanBench(); if (b) hammerUp(b); } }

  let spaceHeld = false;
  function key(e) {
    const k = (e.key || '').toLowerCase();
    const type = e.type || 'keydown';
    audio.unlock();
    if (type === 'keyup') {
      if (k === ' ' || k === 'spacebar') { spaceHeld = false; const b = humanBench(); if (b) hammerUp(b); }
      return;
    }
    if (S.phase === 'pass' && (k === 'enter' || k === ' ')) { api.continuePass(); return; }
    if (S.phase === 'result' && k === 'enter') { api.playAgain(); return; }
    const b = humanBench(); if (!b) return;
    S.idle = 0; S.hint = null;
    if (k === ' ' || k === 'spacebar') {
      if (e.repeat) return;
      if (b.ham.charging && !spaceHeld) { hammerUp(b); return; }
      if (b.ham.charging) { hammerUp(b); spaceHeld = false; return; }
      spaceHeld = true; hammerDown(b); return;
    }
    const pi = ['1', '2', '3', '4', '5', '6'].indexOf(k);
    if (pi >= 0) { act(b, 'part', PART_ORDER[pi]); return; }
    const ci = ['q', 'w', 'e', 'r'].indexOf(k);
    if (ci >= 0) { act(b, 'paint', PAINTS[ci].id); }
  }

  window.addEventListener('pointerdown', onDown, isWorld ? { capture: true } : false);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  const winKeys = !isWorld && !opts.noWindowKeys;
  const kd = (e) => { if (e.target && /input|textarea|select/i.test(e.target.tagName)) return; if (e.key === ' ') e.preventDefault(); key(e); };
  if (winKeys) { window.addEventListener('keydown', kd); window.addEventListener('keyup', kd); }

  let ro = null;
  if (!isWorld) {
    const resize = () => {
      const { w, h } = viewSize();
      renderer.setSize(w, h, false); refit();
    };
    ro = new ResizeObserver(resize); ro.observe(container); resize();
  }

  /* ---------- HUD ---------- */
  function hint(b) {
    const st = b.order && b.order.steps[b.step];
    return st ? st.id : null;
  }
  function hud() {
    const b = S.benches[S.active] || null;
    const hb = humanBench();
    const st = b && b.order ? b.order.steps[b.step] : null;
    let choices = null;
    if (hb && (S.phase === 'play' || S.phase === 'countdown')) {
      const kind = st ? st.kind : 'part';
      if (kind === 'part') choices = { kind, items: PART_ORDER.map(id => ({ id, label: PARTS[id].label, key: PARTS[id].key, hint: S.hint === id })) };
      else if (kind === 'paint') choices = { kind, items: PAINTS.map(p => ({ id: p.id, label: p.label, key: p.key, hex: p.hex, hint: S.hint === p.id })) };
      else choices = { kind, items: [{ id: 'HAMMER', label: 'HOLD TO HAMMER', key: 'SPACE', hint: S.hint === 'HAMMER' }] };
    }
    return {
      key: GAME.key, name: GAME.name, phase: S.phase, mode: S.mode, paused: S.paused,
      level: S.level, levelName: LEVELS[S.level].name, cpuCount: S.cpuCount, players: S.players, shift: S.shift, shiftCfg: S.shiftCfg,
      time: Math.max(0, Math.ceil(S.time)), timeLow: S.time <= 10,
      countdown: S.phase === 'countdown' ? (S.cd > 0.5 ? 'READY' : 'GO') : null,
      active: S.active, turnName: b ? b.name : '',
      benches: S.benches.map((x, i) => ({ name: x.name, score: x.score, toys: x.toys, human: x.human, active: i === S.active, color: x.color })),
      order: b && b.order ? {
        toy: b.order.toy.name, paint: b.order.paint.id, paintHex: b.order.paint.hex,
        steps: b.order.steps.map((s, i) => ({
          kind: s.kind, id: s.id, done: i < b.step, current: i === b.step,
          label: s.kind === 'part' ? PARTS[s.id].label : s.kind === 'paint' ? 'PAINT' : 'HAMMER',
          hex: s.kind === 'paint' ? b.order.paint.hex : null,
        })),
      } : null,
      choices,
      hammer: b ? { charging: b.ham.charging || !!b.aiHam, power: b.ham.power, zone: HAMMER.zone, perfect: HAMMER.perfect, tries: b.ham.tries } : null,
      hint: S.hint, toast: S.toast, caption: S.caption,
      passTo: S.phase === 'pass' ? S.passTo : null,
      result: S.result, best: S.best,
      sound: audio.sound, music: audio.music, world: isWorld,
      rules: RULES_TEXT,
    };
  }
  let lastNotify = 0;
  function notify() { lastNotify = 0; }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), T = 0, dead = false;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    update(dt);
    camera.position.lerp(camGoal.pos, 1 - Math.exp(-dt * 4));
    camera.quaternion.slerp(camGoal.quat, 1 - Math.exp(-dt * 4));
    if (isWorld) {
      const { w, h } = viewSize();
      if (Math.abs(camera.aspect - w / h) > 1e-3 || camera.fov !== world.camera.fov) refit();
      camera.aspect = w / h; camera.fov = world.camera.fov; camera.updateProjectionMatrix();
    }
    mirrorCam();
    if (!isWorld) renderer.render(scene, camera);
    lastNotify -= dt;
    if (lastNotify <= 0) { lastNotify = 0.1; try { onState(hud()); } catch (e) { console.error(e); } }
  }

  function update(dt) {
    updateTweens(dt);
    updateParticles(dt);
    if (S.toastT > 0) { S.toastT -= dt; if (S.toastT <= 0) { S.toast = null; notify(); } }
    const running = !S.paused;

    if (running && S.phase === 'countdown') {
      const before = S.cd; S.cd -= dt;
      if (before > 0.5 && S.cd <= 0.5) audio.sfx.go();
      if (S.cd <= 0) { S.phase = 'play'; notify(); }
    }
    if (running && S.phase === 'play') {
      S.time -= dt;
      const sec = Math.ceil(S.time);
      if (sec <= 5 && sec !== S.lastTick && sec > 0) { S.lastTick = sec; audio.sfx.tick(); }
      for (const b of S.benches) {
        if (b.busy > 0) b.busy -= dt;
        const isTurn = S.mode !== 'local' || b.i === S.active;
        if (!isTurn) continue;
        if (b.human) {
          if (b.ham.charging) {
            b.ham.held += dt; b.ham.power = hammerPower(b.ham.held);
            const inP = b.ham.power >= HAMMER.perfect[0] && b.ham.power <= HAMMER.perfect[1];
            if (inP && !b.ham.inPerfect) audio.sfx.chime();
            b.ham.inPerfect = inP;
            audio.charge(true, b.ham.power);
          }
          if (!b.ham.charging && b.busy <= 0) {
            S.idle += dt;
            if (S.idle > 3 && !S.hint) { S.hint = hint(b); notify(); }
          }
        } else aiStep(b, dt);
      }
      if (S.mode === 'demo') {
        S.capT -= dt;
        if (S.capT <= 0) {
          const b = S.benches[0]; const st = b.order.steps[b.step];
          const k = st ? st.kind : 'part';
          const pick = Math.random();
          S.caption = pick < 0.6 ? CAPTIONS[k] : pick < 0.8 ? CAPTIONS.hope : CAPTIONS.noble;
          S.capT = 4.5; notify();
        }
      }
      if (S.time <= 0) { S.time = 0; endShift(); }
    }
    if (S.phase === 'result' && S.mode === 'demo' && running) {
      S.demoT -= dt; if (S.demoT <= 0) setupMatch('demo');
    }

    /* visuals per bench */
    for (const b of S.benches) {
      animFox(b.fox, dt, 0, kit, T + b.i);
      const P = b.fox.userData.P;
      /* hammer arm + hammer lift while charging */
      const charging = b.ham.charging || !!b.aiHam;
      if (charging) {
        const pw = b.aiHam ? Math.min(1, b.aiHam.t / b.aiHam.dur) * b.aiHam.power : b.ham.power;
        b.hammer.position.lerp(hammerPivot(b), 1 - Math.exp(-dt * 18));
        b.hammer.rotation.set(-0.15 - pw * 1.1, 0, 0);
        b.pose.armT[armFor(b, 1)] = -2.1 - pw * 0.6;
      }
      for (let s = 0; s < 2; s++) {
        b.pose.arms[s] += (b.pose.armT[s] - b.pose.arms[s]) * (1 - Math.exp(-dt * 14));
        P.arms[s].rotation.x = b.pose.arms[s];
      }
      b.pose.lean += (b.pose.leanT - b.pose.lean) * (1 - Math.exp(-dt * 10));
      P.body.rotation.x = b.pose.lean;
      if (b.chair) { b.chair.position.y = Math.sin(T * 2 + b.i) * 0.05; b.fox.position.y = 0.38 + b.chair.position.y; }
      /* ghost pulse */
      for (const gm of b.ghost.children) gm.material.opacity = 0.22 + Math.sin(T * 5) * 0.12;
      /* hint marker */
      const showHint = b.human && S.hint && S.phase === 'play' && b.i === S.active;
      b.marker.visible = !!showHint;
      if (showHint) {
        const tgt = b.bins.find(x => x.id === S.hint) || b.pots.find(x => x.id === S.hint);
        const pos = tgt ? tgt.pos : b.anchor.position.clone().add(new THREE.Vector3(0, toyHeight(b) + 0.15, 0));
        b.marker.position.set(pos.x, pos.y + 0.12 + Math.abs(Math.sin(T * 4)) * 0.15, pos.z);
        b.marker.rotation.y = T * 2;
      }
    }
  }

  function aiStep(b, dt) {
    if (b.aiHam) {
      b.aiHam.t += dt;
      if (b.aiHam.t >= b.aiHam.dur) { const p = b.aiHam.power; b.aiHam = null; release(b, p); b.aiT = aiThink(b.level, b.rng); }
      return;
    }
    if (b.busy > 0) return;
    b.aiT -= dt;
    if (b.aiT > 0) return;
    const st = b.order.steps[b.step];
    if (!st) return;
    const c = aiChoose(b.level, b.rng, st);
    if (c.kind === 'hammer') { b.aiHam = { t: 0, dur: 0.35 + c.power * 0.4, power: c.power }; return; }
    if (c.id === st.id) act(b, c.kind, c.id); else wrong(b, c.kind, c.id);
    b.aiT = aiThink(b.level, b.rng);
  }

  /* ---------- room (standalone only) ---------- */
  function buildRoom(into) {
    const M = new Merger();
    M.add(GEO.box, [0, -0.05, 0], [60, 0.1, 40], null, '#b9875a', 0);
    for (let i = -14; i <= 14; i++) M.add(GEO.box, [i * 2, 0.002, 0], [0.04, 0.01, 40], null, '#a5764c', 0);
    M.add(GEO.box, [0, 0.006, 1.2], [26, 0.01, 7], null, '#3a5f8f', 0);
    M.add(GEO.box, [0, 0.008, 1.2], [25.4, 0.01, 6.4], null, '#4b72a3', 0);
    M.add(GEO.box, [0, 5, -4.2], [60, 10, 0.2], null, '#f1dfbf', 0);
    M.add(GEO.box, [0, 0.6, -4.05], [60, 1.2, 0.08], null, '#9a6a3c', 0.02);
    for (const x of [-9, 9]) {
      M.add(GEO.box, [x, 4.6, -4.08], [3.6, 2.6, 0.08], null, '#9a6a3c', 0.03);
      M.add(GEO.box, [x, 4.6, -4.03], [3.2, 2.2, 0.04], null, '#a9d4f0', 0);
      M.add(GEO.box, [x, 4.6, -4.0], [0.1, 2.2, 0.04], null, '#9a6a3c', 0);
      M.add(GEO.box, [x, 4.6, -4.0], [3.2, 0.1, 0.04], null, '#9a6a3c', 0);
    }
    const toyCols = ['#ec3013', '#2f6bff', '#ffd23a', '#2fbf5b'];
    for (let r = 0; r < 2; r++) {
      const y = 3.2 + r * 1.6;
      M.add(GEO.box, [0, y, -3.85], [11, 0.12, 0.5], null, '#9a6a3c', 0.03);
      for (let k = 0; k < 9; k++) {
        const x = -4.8 + k * 1.2, c = toyCols[(k + r) % 4];
        const t = (k + r * 2) % 4;
        if (t === 0) M.add(GEO.box, [x, y + 0.24, -3.85], [0.5, 0.36, 0.34], null, c, 0.02);
        if (t === 1) M.add(GEO.sphere, [x, y + 0.26, -3.85], [0.44, 0.44, 0.44], null, c, 0.02);
        if (t === 2) M.add(GEO.cone, [x, y + 0.3, -3.85], [0.4, 0.5, 0.4], null, c, 0.02);
        if (t === 3) { M.add(GEO.wheel, [x - 0.12, y + 0.16, -3.85], [0.22, 0.22, 0.08], null, '#3b3340', 0.015); M.add(GEO.box, [x, y + 0.26, -3.85], [0.56, 0.18, 0.3], null, c, 0.02); }
      }
    }
    M.add(GEO.box, [0, 7.4, -4.06], [9, 1.1, 0.06], null, '#1a1626', 0);
    M.add(GEO.box, [0, 7.4, -4.03], [8.7, 0.08, 0.04], null, '#ec3013', 0);
    into.add(M.build());
  }

  /* ---------- API ---------- */
  const api = {
    hud,
    get info() { return renderer ? renderer.info.render : null; },
    setSafe(s) { safe = { top: s.top || 0, bottom: s.bottom || 0, left: s.left || 0, right: s.right || 0 }; refit(); },
    start(mode, cfg = {}) {
      if (cfg.level != null) S.level = cfg.level;
      if (cfg.cpuCount != null) S.cpuCount = cfg.cpuCount;
      if (cfg.players != null) S.players = cfg.players;
      if (cfg.shift != null) S.shiftCfg = cfg.shift;
      setupMatch(mode || S.mode);
    },
    key,
    get camera() { return isWorld ? wcam : camera; },
    snapCam() { refit(); snap(); },
    destroy() {
      dead = true; cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', onDown, isWorld ? { capture: true } : false);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      if (winKeys) { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', kd); }
      if (ro) ro.disconnect();
      audio.close();
      if (isWorld) world.parent.remove(scene);
      else { renderer.dispose(); renderer.domElement.remove(); }
    },
    /* buttons */
    pickPart(id) { audio.unlock(); S.idle = 0; S.hint = null; const b = humanBench(); if (b) act(b, 'part', id); },
    pickPaint(id) { audio.unlock(); S.idle = 0; S.hint = null; const b = humanBench(); if (b) act(b, 'paint', id); },
    hammerDown() { audio.unlock(); S.idle = 0; S.hint = null; const b = humanBench(); if (b) hammerDown(b); },
    hammerUp() { const b = humanBench(); if (b) hammerUp(b); },
    pause(v) { S.paused = !!v; if (S.paused) { const b = humanBench(); if (b && b.ham.charging) { b.ham.charging = false; audio.charge(false); } } notify(); },
    restart() { setupMatch(S.mode); },
    playAgain() { setupMatch(S.mode); },
    continuePass() {
      if (S.phase !== 'pass') return;
      S.turn++; S.active = S.turn; S.time = S.shift; S.lastTick = 99;
      S.phase = 'countdown'; S.cd = 1.6; S.idle = 0; S.hint = null;
      refit(); notify();
    },
    setMode(m) { setupMatch(m); },
    endShift() { /* BACK in standalone: finish the match now and show results */
      if (S.phase === 'result') return;
      S.paused = false; S.time = 0;
      if (S.mode === 'local') S.turn = S.benches.length - 1;
      endShift();
    },
    setLevel(l) { S.level = Math.max(0, Math.min(2, l)); if (S.mode === 'cpu') setupMatch('cpu'); else { persist(); notify(); } },
    setCpuCount(n) { S.cpuCount = Math.max(1, Math.min(3, n)); if (S.mode === 'cpu') setupMatch('cpu'); else { persist(); notify(); } },
    setPlayers(n) { S.players = Math.max(2, Math.min(4, n)); if (S.mode === 'local') setupMatch('local'); else { persist(); notify(); } },
    setShift(sec) { S.shiftCfg = sec; if (S.mode === 'cpu') setupMatch('cpu'); else { persist(); notify(); } },
    toggleSound() { audio.setSound(!audio.sound); persist(); notify(); },
    toggleMusic() { audio.setMusic(!audio.music); persist(); notify(); },
    unlockAudio() { audio.unlock(); },
  };

  setupMatch(S.mode);
  raf = requestAnimationFrame(frame);
  return api;
}

export default createToyWorkshop;
export { THREE };
