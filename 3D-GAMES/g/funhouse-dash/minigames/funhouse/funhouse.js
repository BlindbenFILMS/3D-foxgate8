/* FUNHOUSE DASH: an 8 GATES 3D minigame.
   Hold to run through a carnival funhouse: swinging hammers, air jets, a rolling barrel,
   a tippy floor and a mirror hall where only one door is real. Fastest clean run wins.
   Works standalone (own renderer) and in WORLD MODE (opts.world = { renderer, camera, parent }). */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './funhouse-rules.js';
import { createAudio } from './funhouse-audio.js';

export const GAME = { key: 'funhouse', name: 'FUNHOUSE DASH', maxPlayers: 4 };

const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);
const INK = 0x1a1626;
const COL = {
  red: 0xec3013, cream: 0xfff1d6, yellow: 0xffd23a, purple: 0x5b2a86, deep: 0x2a2340,
  teal: 0x1fb5a8, blue: 0x2f6fd6, mirror: 0xbfe9ff, pink: 0xff6fae, green: 0x3aa655,
  grate: 0x3a3550, brown: 0x3a2418,
};

/* Opponent cast: easy / medium / hard */
const CAST = {
  easy:   { name: 'PIP',   css: '#ffd23a', torso: [0xf2b81f, 0xfff3c4, 0xffd23a], outfit: 'tee',  extra: 'pip' },
  medium: { name: 'HOPE',  css: '#6fa8ff', torso: [0xe8743b, 0xfff1e0, 0xf4f1ea], outfit: 'coat', legs: 0x2f6fd6, extra: 'hope' },
  hard:   { name: 'NOBLE', css: '#ff5a4a', torso: [0x9a4a2e, 0xf0e2d0, 0x1d1b2a], outfit: 'coat', eyes: 0xff2020, extra: 'noble' },
};
const LOOKS = [
  { css: '#ec3013', torso: [0xe8731f, 0xfff1e0, 0xec3013], outfit: 'vest' },
  { css: '#1fb5a8', torso: [0xd9662a, 0xfff1e0, 0x1fb5a8], outfit: 'tee' },
  { css: '#9b74ff', torso: [0xc8602e, 0xfff1e0, 0x7b4fd6], outfit: 'coat' },
  { css: '#3aa655', torso: [0xe07a35, 0xfff1e0, 0x3aa655], outfit: 'dress' },
];

const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function createFunhouse({ container, onState = () => {}, opts = {} }) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const full = !world;
  const touch = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  /* ---------------- renderer + scene ---------------- */
  let renderer, scene, env, ro = null;
  if (world) {
    renderer = world.renderer;
    scene = new THREE.Group();
    scene.name = 'funhouse';
    world.parent.add(scene);
    env = new THREE.Scene(); /* throw-away: lights, sky, decor never touch the town */
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const cv = renderer.domElement;
    Object.assign(cv.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', outline: 'none' });
    container.appendChild(cv);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x231a40);
    scene.fog = new THREE.Fog(0x231a40, 70, 170);
    env = scene;
  }

  let W = 1, H = 1;
  function readSize() {
    const el = world ? renderer.domElement : container;
    W = Math.max(1, el.clientWidth || 1);
    H = Math.max(1, el.clientHeight || 1);
  }
  readSize();
  if (!world) {
    renderer.setSize(W, H, false);
    ro = new ResizeObserver(() => { readSize(); renderer.setSize(W, H, false); });
    ro.observe(container);
  }

  /* ---------------- materials + shared geometry ---------------- */
  const grad = new THREE.DataTexture(new Uint8Array([80, 165, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.generateMipmaps = false;
  grad.needsUpdate = true;
  const textures = [grad];
  const matCache = new Map();
  function toon(c, side) {
    const k = c + '|' + (side || 0);
    if (!matCache.has(k)) matCache.set(k, new THREE.MeshToonMaterial({ color: c, gradientMap: grad, side: side || THREE.FrontSide }));
    return matCache.get(k);
  }
  const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sph: new THREE.SphereGeometry(1, 18, 12),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
    cone: new THREE.ConeGeometry(1, 1, 16),
    caps: new THREE.CapsuleGeometry(0.5, 1, 6, 12),
  };
  const UNIT = { box: [1, 1, 1], sph: [2, 2, 2], cyl: [2, 1, 2], cone: [2, 1, 2], caps: [1, 2, 1] };
  const _e = new THREE.Euler(), _qq = new THREE.Quaternion();
  function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    return new THREE.Matrix4().compose(new V3(x, y, z), _qq.setFromEuler(_e.set(rx, ry, rz)), new V3(sx, sy, sz));
  }

  /* merge many static parts into one mesh per colour + one ink shell mesh */
  function mergeGeos(list) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      o += g.attributes.position.count;
      g.dispose();
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.computeBoundingSphere();
    return m;
  }
  function builder() {
    const parts = new Map();
    const inks = [];
    const sz = new V3(), c = new V3();
    return {
      add(geo, color, m, w = 0.05, side) {
        const g = geo.index ? geo.toNonIndexed() : geo.clone();
        g.applyMatrix4(m);
        const key = color + '|' + (side || 0);
        if (!parts.has(key)) parts.set(key, { color, side, list: [] });
        parts.get(key).list.push(g);
        if (w > 0) {
          g.computeBoundingBox();
          g.boundingBox.getSize(sz); g.boundingBox.getCenter(c);
          const kx = 1 + (2 * w) / Math.max(sz.x, 3 * w), ky = 1 + (2 * w) / Math.max(sz.y, 3 * w), kz = 1 + (2 * w) / Math.max(sz.z, 3 * w);
          const sh = g.clone();
          sh.applyMatrix4(new THREE.Matrix4().makeTranslation(c.x * (1 - kx), c.y * (1 - ky), c.z * (1 - kz)).multiply(new THREE.Matrix4().makeScale(kx, ky, kz)));
          inks.push(sh);
        }
      },
      box(color, x, y, z, sx, sy, sz2, w = 0.05, rx = 0, ry = 0, rz = 0) { this.add(G.box, color, M(x, y, z, rx, ry, rz, sx, sy, sz2), w); },
      build(parent) {
        for (const p of parts.values()) parent.add(new THREE.Mesh(mergeGeos(p.list), toon(p.color, p.side)));
        if (inks.length) parent.add(new THREE.Mesh(mergeGeos(inks), inkMat));
        return parent;
      },
    };
  }

  function labelTex(text, w = 512, h = 128, o = {}) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = o.bg || '#1a1626'; g.fillRect(0, 0, w, h);
    if (o.border !== false) { g.strokeStyle = o.border || '#ec3013'; g.lineWidth = h * 0.08; g.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h * 0.08 > 0 ? h - h * 0.08 : h); }
    g.fillStyle = o.fg || '#ffd23a';
    let fs = h * (o.scale || 0.56);
    g.font = `900 ${fs}px Archivo, "Arial Black", Arial, sans-serif`;
    while (g.measureText(text).width > w * 0.86 && fs > 8) { fs -= 2; g.font = `900 ${fs}px Archivo, "Arial Black", Arial, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + fs * 0.04);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textures.push(t);
    return t;
  }
  function sign(parent, text, x, y, z, ry, w, h, o) {
    const tex = labelTex(text, 512, Math.round(512 * h / w), o);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z); m.rotation.y = ry;
    parent.add(m);
    return m;
  }

  const FY = R.FLOOR_Y;
  const zOf = R.zOf;
  const PODIUM_S = 51.6;
  const PODIUM = [[1.0, 0.75], [-0.45, 0.5], [2.45, 0.3], [-1.9, 0.15]];

  /* ---------------- the funhouse (playable object, goes in the group) ---------------- */
  {
    const B = builder();
    /* plinth with a pit under the tippy floor */
    B.box(COL.purple, 0, (FY - 0.2) / 2, zOf((-0.2 + R.PLANK_A) / 2), 6.6, FY - 0.2, R.PLANK_A + 0.2);
    B.box(COL.purple, 0, (FY - 0.2) / 2, zOf((R.PLANK_B + 42.7) / 2), 6.6, FY - 0.2, 42.7 - R.PLANK_B);
    B.box(COL.deep, 0, 0.05, zOf(R.PLANK_C), 6.6, 0.1, 6, 0);
    B.box(COL.yellow, 3.32, FY - 0.32, zOf(21.25), 0.1, 0.18, 42.9, 0.03);
    /* checker floor */
    let row = 0;
    const tileRow = (s0, len) => {
      for (let c = 0; c < 2; c++) B.box((row + c) % 2 ? COL.deep : COL.cream, c ? 1.65 : -1.65, FY - 0.1, zOf(s0 + len / 2), 3.3, 0.2, len, 0);
      row++;
    };
    for (let i = 0; i < 20; i++) tileRow(i * 1.45, 1.45);
    for (let i = 0; i < 5; i++) tileRow(R.PLANK_B + i * 1.5, 1.5);
    /* entrance stairs */
    for (let i = 0; i < 4; i++) {
      const s0 = -2 + i * 0.5, top = (i + 1) * 0.25;
      B.box(i % 2 ? COL.yellow : COL.red, 0, top / 2, zOf(s0 / 2), 4.2, top, -s0, 0.04);
    }
    /* back wall: candy stripes, then mirror panels in the hall */
    for (let s = -0.2, i = 0; s < 36.5; s += 1.5, i++) {
      const len = Math.min(1.5, 36.5 - s);
      B.box(i % 2 ? COL.cream : COL.red, -3.45, FY + 2.8, zOf(s + len / 2), 0.3, 5.6, len, 0);
    }
    B.box(COL.purple, -3.45, FY + 2.8, zOf(39.6), 0.3, 5.6, 6.2, 0);
    for (const s of [37.3, 39.1, 41.8]) {
      B.box(COL.yellow, -3.3, FY + 2.4, zOf(s), 0.06, 3.9, 1.5, 0.04);
      B.box(COL.mirror, -3.25, FY + 2.4, zOf(s), 0.06, 3.6, 1.25, 0);
    }
    B.box(COL.yellow, -3.45, FY + 5.72, zOf(21.25), 0.5, 0.26, 42.9);
    B.box(COL.purple, -3.45, FY + 2.8, zOf(21.25), 0.32, 5.62, 42.9, 0.05);
    /* near rail */
    for (let s = 0; s <= 42; s += 3) B.add(G.cyl, COL.yellow, M(3.3, (FY + 0.7) / 2, zOf(s), 0, 0, 0, 0.07, FY + 0.7, 0.07), 0.03);
    B.box(COL.red, 3.3, FY + 0.72, zOf(21), 0.14, 0.14, 42.2, 0.03);
    /* corner towers + top beam */
    for (const s of [-0.2, 42.7]) for (const x of [-3.45, 3.45]) {
      for (let k = 0; k < 7; k++) B.add(G.cyl, k % 2 ? COL.cream : COL.red, M(x, k + 0.5, zOf(s), 0, 0, 0, 0.28, 1, 0.28), 0.04);
      B.add(G.sph, COL.yellow, M(x, 7.25, zOf(s), 0, 0, 0, 0.36), 0.04);
    }
    B.box(COL.purple, 0, FY + 6.0, zOf(-0.2), 6.9, 0.36, 0.36);
    B.box(COL.purple, 0, FY + 6.0, zOf(42.7), 6.9, 0.36, 0.36);
    B.box(COL.red, -3.45, FY + 6.75, zOf(21), 0.2, 1.1, 10.4, 0.04);
    /* hammer cross beams */
    for (const h of R.HAMMERS) {
      B.box(COL.purple, -1.45, R.HAMMER_PIVOT_Y + 0.28, zOf(h.s), 4.3, 0.34, 0.34);
      B.add(G.cyl, COL.yellow, M(0, R.HAMMER_PIVOT_Y, zOf(h.s), Math.PI / 2, 0, 0, 0.26, 0.5, 0.26), 0.04);
    }
    /* jet grate slats */
    for (const s of R.JETS) for (const dz of [-0.27, -0.09, 0.09, 0.27]) B.box(INK, 0, FY + 0.06, zOf(s) + dz, 4.3, 0.02, 0.07, 0);
    /* plank pivot wedge */
    B.add(G.cyl, COL.deep, M(0, 0.55, zOf(R.PLANK_C), 0, 0, Math.PI / 2, 0.6, 4.4, 0.6), 0.05);
    /* mirror hall partition with three doorways */
    const dz = zOf(R.DOOR_S);
    for (const [x0, x1] of [[-3.3, -2.45], [-1.15, -0.65], [0.65, 1.15], [2.45, 3.3]]) B.box(COL.purple, (x0 + x1) / 2, FY + 2.1, dz, x1 - x0, 4.2, 0.3);
    B.box(COL.purple, 0, FY + 3.75, dz, 6.6, 0.9, 0.3);
    for (const x of R.DOOR_X) B.box(COL.yellow, x, FY + 3.27, dz + 0.17, R.DOOR_W + 0.1, 0.1, 0.06, 0.02);
    /* slide + ball pit + finish arch */
    const slLen = Math.hypot(R.SLIDE_B - R.SLIDE_A, FY - 0.15), slAng = Math.atan2(FY - 0.15, R.SLIDE_B - R.SLIDE_A);
    const slMid = zOf((R.SLIDE_A + R.SLIDE_B) / 2), slY = (FY + 0.15) / 2 - 0.1;
    B.add(G.box, COL.teal, M(0, slY, slMid, -slAng, 0, 0, 3.8, 0.2, slLen + 0.2), 0.05);
    for (const x of [-2, 2]) B.add(G.box, COL.yellow, M(x, slY + 0.25, slMid, -slAng, 0, 0, 0.16, 0.36, slLen), 0.04);
    B.box(COL.deep, 0, 0.05, zOf((R.SLIDE_B + R.PIT_B) / 2), 6.2, 0.1, R.PIT_B - R.SLIDE_B + 0.2, 0);
    B.box(COL.red, 0, 0.3, zOf(R.PIT_B), 6.4, 0.6, 0.3);
    for (const x of [-3.1, 3.1]) B.box(COL.red, x, 0.3, zOf((R.SLIDE_B + R.PIT_B) / 2), 0.3, 0.6, R.PIT_B - R.SLIDE_B + 0.3);
    for (const x of [-3.2, 3.2]) for (let k = 0; k < 5; k++) B.add(G.cyl, k % 2 ? COL.cream : COL.red, M(x, k * 0.9 + 0.45, zOf(R.FINISH_S), 0, 0, 0, 0.18, 0.9, 0.18), 0.04);
    for (let k = 0; k < 10; k++) B.box(k % 2 ? INK : COL.cream, -2.88 + k * 0.64, 4.6, zOf(R.FINISH_S), 0.64, 0.42, 0.3, 0);
    B.box(COL.yellow, 0, 4.6, zOf(R.FINISH_S), 6.5, 0.46, 0.2, 0.04);
    /* winners' podium */
    PODIUM.forEach(([x, hgt], k) => B.box([COL.yellow, COL.cream, COL.red, COL.teal][k], x, hgt / 2, zOf(PODIUM_S), 1.3, hgt, 1.3));
    B.build(scene);

    /* signs */
    sign(scene, 'FUNHOUSE', 0, FY + 6.95, zOf(-0.45), 0, 6.8, 1.4, { border: '#ffd23a', fg: '#fff1d6', bg: '#ec3013' });
    sign(scene, 'FUNHOUSE DASH', -3.33, FY + 6.75, zOf(21), Math.PI / 2, 10, 1.05, { border: '#ffd23a', fg: '#fff1d6', bg: '#ec3013' });
    sign(scene, 'FINISH', 3.42, 3.6, zOf(R.FINISH_S), Math.PI / 2, 2.2, 0.62);
    for (const g of R.SEGMENTS) {
      if (g.id === 'entry' || g.id === 'slide') continue;
      sign(scene, g.name, -3.27, FY + 4.65, zOf((Math.max(0, g.a) + g.b) / 2), Math.PI / 2, 3.8, 0.85);
    }
    R.DOOR_X.forEach((x, i) => sign(scene, String(i + 1), x, FY + 3.72, dz + 0.17, 0, 0.7, 0.62, { border: false }));
  }

  /* hammers */
  const hammers = R.HAMMERS.map((h) => {
    const g = new THREE.Group();
    g.position.set(0, R.HAMMER_PIVOT_Y, zOf(h.s));
    const B = builder();
    B.add(G.cyl, COL.yellow, M(0, -R.HAMMER_ARM / 2, 0, 0, 0, 0, 0.1, R.HAMMER_ARM, 0.1), 0.03);
    B.add(G.cyl, COL.red, M(0, -R.HAMMER_ARM, 0, 0, 0, Math.PI / 2, 0.55, 2.6, 0.55), 0.05);
    for (const x of [-0.75, 0.75]) B.add(G.cyl, COL.cream, M(x, -R.HAMMER_ARM, 0, 0, 0, Math.PI / 2, 0.575, 0.26, 0.575), 0);
    for (const x of [-1.31, 1.31]) B.add(G.cyl, COL.yellow, M(x, -R.HAMMER_ARM, 0, 0, 0, Math.PI / 2, 0.42, 0.04, 0.42), 0);
    B.build(g);
    scene.add(g);
    return { g, last: 0 };
  });

  /* air jets */
  const puffGeo = new THREE.CylinderGeometry(0.75, 0.42, 1, 14, 1, true);
  puffGeo.translate(0, 0.5, 0);
  const jets = R.JETS.map((s) => {
    const mat = new THREE.MeshToonMaterial({ color: COL.grate, gradientMap: grad });
    const grate = new THREE.Mesh(G.box, mat);
    grate.scale.set(4.4, 0.06, 0.8);
    grate.position.set(0, FY + 0.02, zOf(s));
    scene.add(grate);
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const puff = new THREE.Mesh(puffGeo, puffMat);
    puff.position.set(0, FY + 0.05, zOf(s));
    puff.scale.set(2.6, 0.1, 0.6);
    puff.visible = false;
    scene.add(puff);
    return { mat, puff, puffMat, last: 0 };
  });

  /* rolling barrel */
  const barrel = new THREE.Group();
  barrel.position.set(0, FY + 2.0, zOf(R.BARREL_C));
  {
    const B = builder();
    const n = 10, step = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const geo = new THREE.CylinderGeometry(R.BARREL_R, R.BARREL_R, 6, 3, 1, true, i * step, step * 0.62);
      B.add(geo, i % 2 ? COL.red : COL.yellow, M(0, 0, 0, Math.PI / 2, 0, 0), 0, THREE.DoubleSide);
      geo.dispose();
    }
    for (const zz of [-3, 0, 3]) {
      const tor = new THREE.TorusGeometry(R.BARREL_R + 0.04, 0.12, 6, 40);
      B.add(tor, COL.purple, M(0, 0, zz), 0);
      tor.dispose();
    }
    B.build(barrel);
  }
  scene.add(barrel);

  /* tippy floor */
  const plank = new THREE.Group();
  plank.position.set(0, FY - 0.15, zOf(R.PLANK_C));
  {
    const B = builder();
    B.box(COL.yellow, 0, 0, 0, 4.4, 0.3, 6, 0.05);
    for (const zz of [-2.7, -2.25, 2.25, 2.7]) B.box(INK, 0, 0.16, zz, 4.4, 0.02, 0.2, 0);
    B.box(COL.teal, 0, 0.16, 0, 0.18, 0.02, 3.6, 0);
    B.build(plank);
  }
  scene.add(plank);

  /* mirror doors */
  const doors = R.DOOR_X.map((x) => {
    const hinge = new THREE.Group();
    hinge.position.set(x - R.DOOR_W / 2, FY, zOf(R.DOOR_S));
    const mat = new THREE.MeshToonMaterial({ color: COL.mirror, gradientMap: grad });
    const panel = new THREE.Mesh(G.box, mat);
    panel.scale.set(R.DOOR_W - 0.06, 3.2, 0.08);
    panel.position.set(R.DOOR_W / 2, 1.6, 0);
    const pin = new THREE.Mesh(G.box, inkMat);
    pin.scale.set(1 + 0.08 / (R.DOOR_W - 0.06), 1 + 0.08 / 3.2, 1.6);
    panel.add(pin);
    hinge.add(panel);
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const [dx, dy, len] of [[0.35, 2.3, 0.9], [0.55, 2.0, 0.5]]) {
      const st = new THREE.Mesh(G.box, shine);
      st.scale.set(0.07, len, 0.02); st.position.set(dx, dy, 0.06); st.rotation.z = -0.6;
      hinge.add(st);
    }
    const crack = new THREE.Group();
    for (const a of [0.4, -0.5, 1.4]) {
      const c = new THREE.Mesh(G.box, inkMat.clone());
      c.material.side = THREE.FrontSide;
      c.scale.set(0.05, 2.4, 0.03); c.rotation.z = a; c.position.set(R.DOOR_W / 2, 1.6, 0.07);
      crack.add(c);
    }
    crack.visible = false;
    hinge.add(crack);
    scene.add(hinge);
    return { hinge, mat, crack, open: 0, opening: false };
  });
  const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({
    map: (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const g = cv.getContext('2d'); g.fillStyle = '#fff6c4';
      g.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 31, a = (i * Math.PI) / 4; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
      g.fill();
      const t = new THREE.CanvasTexture(cv); textures.push(t); return t;
    })(), transparent: true, opacity: 0, depthWrite: false,
  }));
  scene.add(glint);

  /* tickets (instanced) */
  const tTex = labelTex('ADMIT 1', 128, 72, { bg: '#ffd23a', fg: '#ec3013', border: '#ec3013', scale: 0.42 });
  const tGeo = new THREE.BoxGeometry(0.62, 0.36, 0.05);
  const tMesh = new THREE.InstancedMesh(tGeo, new THREE.MeshToonMaterial({ map: tTex, gradientMap: grad }), R.TICKETS.length);
  const tInk = new THREE.InstancedMesh(tGeo, inkMat, R.TICKETS.length);
  scene.add(tMesh, tInk);

  /* chasing bulbs (instanced) */
  const bulbPos = [];
  for (let s = 0.2; s <= 42.7; s += 0.9) bulbPos.push([-3.18, FY + 5.95, zOf(s)]);
  for (const s of [-0.2, 42.7]) for (let x = -3; x <= 3.1; x += 0.75) bulbPos.push([x, FY + 6.3, zOf(s)]);
  for (const x of [-3.75, 3.75]) for (let y = 0.6; y < 7; y += 0.7) bulbPos.push([x, y, zOf(-0.2)]);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbPos.length);
  const _m4 = new THREE.Matrix4();
  bulbPos.forEach((p, i) => { bulbs.setMatrixAt(i, _m4.makeTranslation(p[0], p[1], p[2])); bulbs.setColorAt(i, new THREE.Color(0xffe9a0)); });
  scene.add(bulbs);

  /* ball pit balls (instanced) */
  {
    const n = 70;
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad }), n);
    const cols = [COL.red, COL.yellow, COL.teal, COL.blue, COL.pink].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      balls.setMatrixAt(i, _m4.makeTranslation(-2.75 + Math.random() * 5.5, 0.22 + Math.random() * 0.25, zOf(R.SLIDE_B + 0.15 + Math.random() * (R.PIT_B - R.SLIDE_B - 0.35))));
      balls.setColorAt(i, cols[i % cols.length]);
    }
    scene.add(balls);
  }

  /* ---------------- the room around it (standalone only) ---------------- */
  let wheel = null;
  {
    const hemi = new THREE.HemisphereLight(0xd8deff, 0x4a3560, 1.6);
    const sun = new THREE.DirectionalLight(0xfff0dd, 2.2);
    sun.position.set(14, 26, 12);
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    env.add(hemi, sun, amb);
    if (full) {
      const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), toon(0x24364a));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01;
      env.add(ground);
      const B = builder();
      const tent = (x, z, r, c1, c2) => {
        for (let i = 0; i < 12; i++) {
          const geo = new THREE.CylinderGeometry(r, r, 4, 2, 1, true, (i * Math.PI) / 6, Math.PI / 6);
          B.add(geo, i % 2 ? c1 : c2, M(x, 2, z), 0, THREE.DoubleSide); geo.dispose();
          const cg = new THREE.ConeGeometry(r * 1.15, 3.2, 2, 1, true, (i * Math.PI) / 6, Math.PI / 6);
          B.add(cg, i % 2 ? c2 : c1, M(x, 5.6, z), 0, THREE.DoubleSide); cg.dispose();
        }
        B.add(G.sph, COL.yellow, M(x, 7.4, z, 0, 0, 0, 0.35), 0.05);
      };
      tent(-24, 12, 5, COL.red, COL.cream);
      tent(22, -30, 4, COL.teal, COL.cream);
      tent(30, 18, 4.5, COL.purple, COL.yellow);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        B.add(G.cyl, COL.cream, M(Math.cos(a) * 46, 4, Math.sin(a) * 46, 0, 0, 0, 0.15, 8, 0.15), 0.04);
      }
      B.build(env);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3c8, fog: false }));
      moon.position.set(-60, 55, -110);
      env.add(moon);
      wheel = new THREE.Group();
      wheel.position.set(-34, 15, -26);
      const WB = builder();
      const rim = new THREE.TorusGeometry(12, 0.35, 8, 48);
      WB.add(rim, COL.cream, M(), 0); rim.dispose();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        WB.add(G.cyl, COL.purple, M(Math.cos(a) * 6, Math.sin(a) * 6, 0, 0, 0, a - Math.PI / 2, 0.12, 12, 0.12), 0);
        WB.add(G.box, i % 2 ? COL.red : COL.yellow, M(Math.cos(a) * 12, Math.sin(a) * 12 - 1, 0, 0, 0, 0, 1.4, 1.2, 1.2), 0.06);
      }
      WB.build(wheel);
      env.add(wheel);
      const legs = builder();
      for (const sx of [-1, 1]) legs.add(G.box, COL.purple, M(-34 + sx * 5, 7.5, -26, 0, 0, sx * 0.33, 0.6, 16, 0.6), 0.06);
      legs.build(env);
    }
  }

  /* ---------------- foxes (adapter: opts.kit fox or our placeholder) ---------------- */
  function part(parent, gk, color, p, s, r, o = {}) {
    const m = new THREE.Mesh(G[gk], o.mat || toon(color));
    m.position.set(p[0], p[1], p[2]);
    m.scale.set(s[0], s[1], s[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    parent.add(m);
    const w = o.ink === undefined ? 0.035 : o.ink;
    if (w > 0) {
      const u = UNIT[gk];
      const sh = new THREE.Mesh(G[gk], inkMat);
      sh.scale.set(1 + (2 * w) / (u[0] * s[0]), 1 + (2 * w) / (u[1] * s[1]), 1 + (2 * w) / (u[2] * s[2]));
      m.add(sh);
    }
    return m;
  }
  function placeholderFox(spec) {
    const [fur, cream, cloth] = spec.torso;
    const legC = spec.legs || fur;
    const f = new THREE.Group();
    const body = new THREE.Group();
    body.position.y = 0.98;
    f.add(body);
    part(body, 'caps', cloth, [0, 0.55, 0], [0.84, 0.48, 0.7]);
    part(body, 'sph', cream, [0, 0.52, 0.3], [0.28, 0.32, 0.1], null, { ink: 0 });
    if (spec.outfit === 'dress') part(body, 'cone', cloth, [0, 0.2, 0], [0.62, 0.5, 0.55], null);
    const head = new THREE.Group();
    head.position.set(0, 1.27, 0.02);
    body.add(head);
    part(head, 'sph', fur, [0, 0, 0], [0.44, 0.42, 0.42]);
    part(head, 'sph', cream, [0, -0.13, 0.2], [0.3, 0.2, 0.26], null, { ink: 0 });
    part(head, 'cone', fur, [0, -0.06, 0.47], [0.17, 0.36, 0.17], [Math.PI / 2, 0, 0]);
    part(head, 'sph', INK, [0, -0.06, 0.66], [0.075, 0.065, 0.06], null, { ink: 0 });
    const eyeMat = spec.eyes ? new THREE.MeshBasicMaterial({ color: spec.eyes }) : toon(INK);
    for (const sx of [-1, 1]) {
      part(head, 'sph', INK, [sx * 0.17, 0.08, 0.37], [0.065, 0.08, 0.05], null, { ink: 0, mat: eyeMat });
      part(head, 'cone', fur, [sx * 0.25, 0.44, 0], [0.15, 0.36, 0.09], [0, 0, -sx * 0.28]);
      part(head, 'cone', 0x5a2a1a, [sx * 0.25, 0.42, 0.05], [0.08, 0.22, 0.03], [0, 0, -sx * 0.28], { ink: 0 });
    }
    const arms = [], legs = [];
    for (const sx of [-1, 1]) {
      const a = new THREE.Group();
      a.position.set(sx * 0.5, 0.95, 0);
      body.add(a);
      part(a, 'caps', fur, [0, -0.3, 0], [0.24, 0.3, 0.24]);
      part(a, 'sph', cream, [0, -0.62, 0], [0.11, 0.11, 0.11]);
      arms.push(a);
      const l = new THREE.Group();
      l.position.set(sx * 0.22, 0.02, 0);
      body.add(l);
      part(l, 'caps', legC, [0, -0.42, 0], [0.3, 0.4, 0.3]);
      part(l, 'sph', COL.brown, [0, -0.86, 0.08], [0.16, 0.1, 0.24]);
      legs.push(l);
    }
    const tail = new THREE.Group();
    tail.position.set(0, 0.15, -0.35);
    tail.rotation.x = 0.6;
    body.add(tail);
    part(tail, 'sph', fur, [0, 0, -0.42], [0.2, 0.2, 0.5]);
    part(tail, 'sph', cream, [0, 0, -0.9], [0.14, 0.14, 0.18]);
    f.userData.P = { body, head, arms, legs, tail };
    f.userData.baseY = 0.98;
    return f;
  }
  function addExtras(f, spec) {
    const P = f.userData.P;
    if (!P) return;
    if (spec.extra === 'hope') {
      part(P.head, 'box', INK, [0, 0.08, 0.4], [0.64, 0.14, 0.06], null, { ink: 0 });
      part(P.head, 'box', 0x6fa8ff, [0.15, 0.1, 0.435], [0.18, 0.04, 0.01], null, { ink: 0 });
      part(P.arms[1], 'cyl', 0xffffff, [0, -0.95, 0.2], [0.035, 1.3, 0.035], [-0.35, 0, 0]);
      part(P.arms[1], 'cyl', COL.red, [0, -1.5, 0.4], [0.042, 0.18, 0.042], [-0.35, 0, 0], { ink: 0 });
    } else if (spec.extra === 'noble') {
      f.userData.sit = true;
      const ch = new THREE.Group();
      f.add(ch);
      part(ch, 'box', 0x1d1b2a, [0, 0.9, -0.05], [1.1, 0.18, 1.0]);
      part(ch, 'box', 0x1d1b2a, [0, 1.62, -0.56], [1.1, 1.3, 0.16]);
      part(ch, 'box', COL.red, [0, 2.2, -0.5], [0.9, 0.08, 0.06], null, { ink: 0 });
      for (const sx of [-1, 1]) part(ch, 'box', 0x2c2940, [sx * 0.62, 1.12, -0.05], [0.14, 0.3, 0.9]);
      part(ch, 'cyl', 0x2c2940, [0, 0.55, -0.05], [0.5, 0.5, 0.5]);
      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 24), new THREE.MeshBasicMaterial({ color: 0x46e6ff }));
      glow.rotation.x = Math.PI / 2; glow.position.set(0, 0.28, -0.05);
      ch.add(glow);
      f.userData.chair = ch;
    } else if (spec.extra === 'pip') {
      part(P.body, 'cyl', COL.red, [0, 1.08, 0], [0.36, 0.12, 0.33]);
      part(P.head, 'cone', COL.yellow, [0.05, 0.5, 0.05], [0.12, 0.2, 0.12], [0, 0, -0.3]);
    }
  }
  function ghostify(f, css) {
    const gm = new THREE.MeshToonMaterial({ color: new THREE.Color(css), gradientMap: grad, transparent: true, opacity: 0.38, depthWrite: false });
    f.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material && o.material.side === THREE.BackSide) o.visible = false;
      else o.material = gm;
    });
  }
  const shadowGeo = new THREE.CircleGeometry(0.62, 20);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  function buildFox(spec, css, ghost) {
    let fox;
    if (kit && kit.makeFox) {
      fox = kit.makeFox({ torso: spec.torso, outfit: spec.outfit, mood: 'happy' });
      fox.userData.kit = true;
      if (fox.userData.baseY == null && fox.userData.P && fox.userData.P.body) fox.userData.baseY = fox.userData.P.body.position.y;
    } else fox = placeholderFox(spec);
    addExtras(fox, spec);
    if (ghost) ghostify(fox, css);
    const rig = new THREE.Group(), inner = new THREE.Group();
    rig.add(inner);
    inner.add(fox);
    let sh = null;
    if (!ghost) {
      sh = new THREE.Mesh(shadowGeo, shadowMat);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.03;
      rig.add(sh);
    }
    rig.visible = false;
    scene.add(rig);
    return { rig, inner, fox, sh };
  }
  function animFox(F, dt, speed, pose, t) {
    const f = F.fox, u = f.userData, P = u.P;
    if (u.kit && kit.animFox) kit.animFox(f, dt, u.sit ? 0 : speed);
    else if (P) {
      u.ph = (u.ph || 0) + dt * (2 + speed * 1.6);
      const k = Math.min(1, speed / 5), sw = Math.sin(u.ph);
      P.legs[0].rotation.x = sw * 0.95 * k;
      P.legs[1].rotation.x = -sw * 0.95 * k;
      P.arms[0].rotation.x = -sw * 0.85 * k;
      P.arms[1].rotation.x = sw * 0.85 * k;
      P.body.position.y = u.baseY + Math.abs(Math.cos(u.ph)) * 0.12 * k + (1 - k) * Math.sin(t * 2) * 0.015;
      P.body.rotation.x = 0.2 * k;
      P.tail.rotation.y = Math.sin(t * 5) * 0.3;
    }
    if (!P) return;
    if (u.sit) {
      P.legs[0].rotation.x = P.legs[1].rotation.x = -1.45;
      P.arms[0].rotation.x = P.arms[1].rotation.x = -0.45;
      P.body.rotation.x = -0.05;
      if (u.chair) { u.chair.position.y = Math.sin(t * 3) * 0.06; P.body.position.y = u.baseY + u.chair.position.y; }
    }
    if (pose === 'cheer') {
      const w = Math.sin(t * 9) * 0.25;
      P.arms[0].rotation.set(0, 0, -2.6 + w);
      P.arms[1].rotation.set(0, 0, 2.6 - w);
    } else if (pose === 'tumble') {
      P.arms[0].rotation.set(0, 0, -1.4);
      P.arms[1].rotation.set(0, 0, 1.4);
    } else {
      P.arms[0].rotation.z = 0;
      P.arms[1].rotation.z = 0;
    }
    if (P.head) P.head.rotation.z = pose === 'dizzy' ? Math.sin(t * 14) * 0.25 : 0;
  }

  /* ---------------- game state ---------------- */
  const audio = createAudio({ music: !world && opts.music !== false, sound: opts.sound !== false });
  const S = {
    mode: opts.mode || 'cpu', diff: opts.difficulty || 'medium', nPlayers: 2,
    players: [], turn: 0, phase: 'intro', pt: 0, clock: 0, runT: 0, runner: null,
    ff: false, paused: false, holdPtr: false, holdUi: false, holdKey: false, keyTimer: 0,
    lastInput: performance.now(), msg: '', caption: '', count: '', segId: '', segName: '',
    pop: '', popT: 0, correct: 0, chimeT: 0, glint: 0, result: null, recT: 0,
    shake: 0, stepT: 0, hint: '', best: 0, emitT: 0, bulbT: 0, bulbTick: 0, firstTurn: true,
  };

  function statGet(k, d) {
    try {
      if (save && save.stat) { const v = save.stat('funhouse.' + k, d); return v == null ? d : v; }
      const v = localStorage.getItem('funhouse.' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  }
  function statSet(k, v) {
    try {
      if (save && save.setStat) return save.setStat('funhouse.' + k, v);
      localStorage.setItem('funhouse.' + k, JSON.stringify(v));
    } catch (e) { /* storage blocked */ }
  }
  function addGold(n) {
    if (!n) return;
    if (save && save.addGold) save.addGold(n);
    else statSet('gold', statGet('gold', 0) + n);
  }
  S.best = statGet('best', 0);

  function clearFoxes() {
    for (const p of S.players) {
      for (const F of [p.F, p.G]) if (F) scene.remove(F.rig);
    }
  }

  function newGame(mode) {
    if (mode) S.mode = mode;
    clearFoxes();
    const list = [];
    const human = (i, name) => ({ name, css: LOOKS[i].css, spec: LOOKS[i], cpu: false });
    const cpu = (lv) => ({ name: CAST[lv].name, css: CAST[lv].css, spec: CAST[lv], cpu: true, level: lv });
    if (S.mode === 'local') for (let i = 0; i < S.nPlayers; i++) list.push(human(i, 'P' + (i + 1)));
    else if (S.mode === 'demo') list.push(cpu('easy'), cpu('medium'));
    else list.push(human(0, 'YOU'), cpu(S.diff));
    for (const p of list) {
      p.F = buildFox(p.spec, p.css, false);
      p.G = null; p.rec = []; p.score = 0; p.time = 0; p.tickets = 0; p.bonks = 0; p.done = false; p.finished = false;
    }
    S.players = list;
    S.result = null;
    S.firstTurn = true;
    S.paused = false;
    startTurn(0);
  }

  function startTurn(i) {
    S.turn = i;
    const p = S.players[i];
    S.runner = R.newRunner();
    if (p.cpu) p.ai = R.newAI(p.level);
    p.rec = [];
    S.correct = Math.floor(Math.random() * 3);
    for (const d of doors) { d.open = 0; d.opening = false; d.hinge.rotation.y = 0; d.crack.visible = false; d.mat.color.set(COL.mirror); }
    for (let j = 0; j < i; j++) if (!S.players[j].G) S.players[j].G = buildFox(S.players[j].spec, S.players[j].css, true);
    S.runT = 0; S.recT = 0; S.ff = false; S.segId = ''; S.segName = ''; S.caption = ''; S.count = '';
    S.holdPtr = S.holdUi = S.holdKey = false;
    S.lastInput = performance.now();
    if (!p.cpu && S.mode === 'local' && i > 0) {
      S.phase = 'handoff';
      S.msg = `Pass to ${p.name}. Tap to start your run.`;
    } else {
      S.phase = 'intro';
      S.msg = p.cpu ? `${p.name} runs next. Watch the timing.` : (S.players.length > 1 && i === 0 && S.mode === 'cpu' ? `Beat ${S.players[1].name}. Hold to run, let go to stop.` : 'Get ready. Hold to run, let go to stop.');
    }
    if (S.mode === 'demo') S.caption = `DEMO: ${p.name} shows you how. Tap MENU to play.`;
    S.pt = 0;
    emit(true);
  }

  function beginCountdown() {
    if (S.phase !== 'intro' && S.phase !== 'handoff') return;
    S.phase = 'countdown';
    S.pt = 0;
    S.clock = -2.4;
    S.count = '3';
    audio.S.count();
    emit(true);
  }

  function finishRun(finished) {
    const p = S.players[S.turn], r = S.runner;
    p.time = S.runT; p.tickets = r.tickets; p.bonks = r.bonks; p.finished = finished;
    p.score = R.scoreRun(S.runT, r.tickets, finished);
    p.done = true;
    S.phase = 'finish';
    S.pt = 0;
    S.ff = false;
    if (finished) { audio.S.whee(); audio.S.fanfare(); } else audio.S.lose();
    S.msg = finished ? `${p.name}: ${p.score} points in ${S.runT.toFixed(1)} seconds.` : `${p.name} ran out of time.`;
    S.pop = finished ? `${p.score}` : 'TIME';
    S.popT = 1.6;
    emit(true);
  }

  function showResults() {
    const ps = S.players;
    const rank = ps.slice().sort((a, b) => b.score - a.score || a.time - b.time);
    let title = '', gold = 0, xp = 0, myScore = null, stars = 0, newBest = false;
    if (S.mode === 'cpu') {
      const me = ps[0];
      myScore = me.score;
      stars = R.starsFor(myScore);
      const win = rank[0] === me || me.score === rank[0].score;
      title = win ? 'YOU WIN' : `${ps[1].name} WINS`;
      gold = win ? 20 + stars * 10 : 0;
      xp = win ? 40 : 10;
      if (win) audio.S.fanfare(); else audio.S.lose();
    } else if (S.mode === 'local') {
      myScore = rank[0].score;
      stars = R.starsFor(myScore);
      title = `${rank[0].name} WINS`;
      gold = 10 + stars * 5;
      xp = 20;
      audio.S.fanfare();
    } else {
      title = `${rank[0].name} WINS THE DEMO`;
      myScore = rank[0].score;
      stars = R.starsFor(myScore);
    }
    if (S.mode !== 'demo') {
      const hs = Math.max(...ps.filter((p) => !p.cpu).map((p) => p.score));
      if (hs > S.best) { S.best = hs; newBest = true; statSet('best', hs); }
      addGold(gold);
      statSet('xp', statGet('xp', 0) + xp);
      statSet('plays', statGet('plays', 0) + 1);
    }
    S.result = {
      title, score: myScore, best: S.best, newBest, gold, xp, stars, demo: S.mode === 'demo',
      rows: rank.map((p, i) => ({ place: i + 1, name: p.name, css: p.css, cpu: !!p.cpu, score: p.score, time: p.time.toFixed(1), tickets: p.tickets, bonks: p.bonks, finished: p.finished })),
    };
    S.rank = rank;
    S.phase = 'results';
    S.pt = 0;
    S.msg = title;
    S.caption = S.mode === 'demo' ? 'Your turn next. Open MENU and pick VS CPU or PASS & PLAY.' : '';
    emit(true);
  }

  function pickDoor(i, fromAi) {
    const r = S.runner, p = S.players[S.turn];
    if (S.phase !== 'run' || !r || r.mode !== 'door') return;
    if (i < 0 || i > 2 || r.doorTried.includes(i)) return;
    if (p.cpu && !fromAi) return;
    r.doorPick = i; r.mode = 'toDoor'; r.toT = 0; r.fromX = r.x;
    audio.S.click();
    emit(true);
  }

  function handleEvent(e, p, r) {
    if (e.type === 'ticket') { audio.S.ding(); S.pop = '+' + R.TICKET_PTS; S.popT = 0.7; }
    else if (e.type === 'bonk') {
      audio.S.bonk(0);
      S.shake = 0.35;
      S.pop = e.kind === 'barrel' ? 'TUMBLE' : e.kind === 'door' ? 'WRONG DOOR' : 'BONK';
      S.popT = 1.0;
    } else if (e.type === 'slip') { audio.S.slip(); S.pop = 'WHOA'; S.popT = 0.8; }
    else if (e.type === 'door') {
      S.msg = 'Mirror Hall. Only one door is real. Listen for the chime.';
      S.chimeT = 0.25;
      if (p.ai) p.ai.doorT = 0;
    } else if (e.type === 'finish') finishRun(true);
    emit(true);
  }

  function updateRun(dt) {
    const p = S.players[S.turn], r = S.runner;
    S.runT += dt;
    S.clock = S.runT;
    if (S.runT > 0.6) S.count = '';
    const hold = p.cpu ? R.aiThink(p.ai, r, S.clock, dt) : (S.holdPtr || S.holdUi || S.holdKey);
    const ev = [];
    if (r.mode === 'run' || r.mode === 'bonk') R.step(r, hold, dt, S.clock, ev);
    else if (r.mode === 'door') {
      S.chimeT -= dt;
      if (S.chimeT <= 0) { S.chimeT = 1.6; audio.S.chime((R.DOOR_X[S.correct] / 1.8) * 0.85); S.glint = 1; }
      if (p.cpu) {
        p.ai.doorT += dt;
        if (p.ai.doorT > p.ai.sk.doorDelay) { p.ai.doorT = 0; pickDoor(R.aiPickDoor(p.ai, S.correct, r.doorTried), true); }
      }
    } else if (r.mode === 'toDoor') {
      r.toT += dt;
      const u = Math.min(1, r.toT / 0.55);
      r.x = lerp(r.fromX, R.DOOR_X[r.doorPick], u);
      r.s = lerp(R.DOOR_STOP, R.DOOR_S - 0.35, u);
      if (u >= 1) {
        const d = doors[r.doorPick];
        if (r.doorPick === S.correct) {
          d.opening = true; r.doorDone = true; r.mode = 'run'; r.v = 3;
          audio.S.doorOpen();
          S.pop = 'REAL DOOR'; S.popT = 0.9;
          S.msg = 'Through! Now slide home.';
        } else {
          d.crack.visible = true; d.mat.color.set(0x8b8fa3);
          audio.S.glass((R.DOOR_X[r.doorPick] / 1.8) * 0.8);
          r.doorTried.push(r.doorPick);
          R.bonk(r, 'door', ev);
        }
      }
    }
    if (r.mode === 'bonk' && r.bonkKind === 'door') r.x += (R.LANE_X - r.x) * Math.min(1, dt * 4);
    if (r.doorDone && r.mode === 'run' && r.s > R.DOOR_S + 0.5) r.x += (R.LANE_X - r.x) * Math.min(1, dt * 3);
    for (const e of ev) handleEvent(e, p, r);
    if (S.phase !== 'run') return;
    const seg = R.segAt(r.s);
    if (seg.id !== S.segId) {
      S.segId = seg.id; S.segName = seg.name;
      if (seg.id !== 'mirror' || r.mode !== 'door') S.msg = R.TIPS[seg.id];
      if (S.mode === 'demo') S.caption = `${p.name}: ${R.TIPS[seg.id]}`;
      emit(true);
    }
    S.recT += dt;
    while (S.recT >= 0.05) { S.recT -= 0.05; p.rec.push(r.s, r.x, r.hop, r.spin, r.mode === 'toDoor' ? 4 : Math.abs(r.v)); }
    if (r.mode === 'run' && Math.abs(r.v) > 0.5) {
      S.stepT -= dt * Math.abs(r.v);
      if (S.stepT <= 0) { S.stepT = 1.15; audio.S.step(0.8); }
    }
    if (S.runT > R.MAX_RUN) finishRun(false);
  }

  function update(dt) {
    S.pt += dt;
    if (S.popT > 0) { S.popT -= dt; if (S.popT <= 0) { S.pop = ''; emit(true); } }
    if (S.phase === 'intro') {
      S.clock += dt;
      if (S.pt > (S.firstTurn ? 0.9 : 1.4)) { S.firstTurn = false; beginCountdown(); }
    } else if (S.phase === 'handoff') {
      S.clock += dt;
    } else if (S.phase === 'countdown') {
      S.clock = S.pt - 2.4;
      const c = S.pt < 0.8 ? '3' : S.pt < 1.6 ? '2' : '1';
      if (c !== S.count) { S.count = c; audio.S.count(); emit(true); }
      if (S.pt >= 2.4) {
        S.phase = 'run'; S.count = 'GO'; S.runT = 0; S.clock = 0;
        audio.unlock(); audio.S.go();
        S.lastInput = performance.now();
        emit(true);
      }
    } else if (S.phase === 'run') {
      const p = S.players[S.turn];
      const n = p.cpu && S.ff ? 3 : 1;
      for (let k = 0; k < n && S.phase === 'run'; k++) updateRun(dt);
    } else if (S.phase === 'finish') {
      S.clock += dt;
      const r = S.runner;
      r.s = Math.min(47.6, r.s + dt * Math.max(0.5, 4 - S.pt * 3));
      if (S.pt > 2.3) {
        if (S.turn + 1 < S.players.length) startTurn(S.turn + 1);
        else showResults();
      }
    } else {
      S.clock += dt;
      if (S.phase === 'results' && S.mode === 'demo' && S.pt > 7) newGame('demo');
    }
    if (world && S.keyTimer > 0) { S.keyTimer -= dt; if (S.keyTimer <= 0) S.holdKey = false; }
    /* hint after 3 s idle */
    const idle = (performance.now() - S.lastInput) / 1000 > 3;
    const p = S.players[S.turn], r = S.runner;
    let hint = '';
    if (idle && p && !p.cpu) {
      if (S.phase === 'handoff') hint = 'TAP TO START';
      else if (S.phase === 'run' && r.mode === 'door') hint = 'TAP A DOOR';
      else if (S.phase === 'run' && r.mode === 'run' && r.v === 0 && !(S.holdPtr || S.holdUi || S.holdKey)) hint = 'HOLD TO RUN';
    }
    if (hint !== S.hint) { S.hint = hint; emit(true); }
  }

  /* ---------------- visuals per frame ---------------- */
  const _mat = new THREE.Matrix4(), _pos = new V3(), _q = new THREE.Quaternion(), _scl = new V3();
  let lastTiltDir = 0;
  function updateWorldBits(dt, realT) {
    const t = S.clock;
    const r = S.runner;
    const rs = r ? r.s : 0;
    const live = S.phase === 'run';
    const pan = (s) => clamp((s - rs) / 8, -0.8, 0.8);
    hammers.forEach((h, i) => {
      const a = R.hammerAngle(i, t);
      h.g.rotation.z = a;
      if (live && h.last !== 0 && Math.sign(a) !== Math.sign(h.last)) {
        const d = Math.abs(rs - R.HAMMERS[i].s);
        if (d < 12) audio.S.whoosh(pan(R.HAMMERS[i].s), 1 - d / 12);
      }
      h.last = a;
    });
    jets.forEach((j, i) => {
      const st = R.jetState(i, t), ph = R.jetPhase(i, t);
      if (st === 1) {
        const k = 1 - (R.JET_P - ph) / R.JET_WARN;
        const fl = 0.5 + 0.5 * Math.sin(realT * 40);
        j.mat.emissive.setRGB(0.9 * k * fl, 0.65 * k * fl, 0.05);
      } else if (st === 2) j.mat.emissive.setRGB(0.5, 0.5, 0.55);
      else j.mat.emissive.setRGB(0, 0, 0);
      const power = st === 2 ? Math.sin((Math.PI * ph) / R.JET_ON) : 0;
      j.puff.visible = power > 0.02;
      j.puff.scale.y = 0.1 + power * 3.4;
      j.puffMat.opacity = power * 0.55;
      if (live && st !== j.last) {
        const d = Math.abs(rs - R.JETS[i]);
        if (d < 10) {
          if (st === 1 && i === 0) audio.S.hiss(pan(R.JETS[1]), 1 - d / 10);
          if (st === 2) audio.S.puff(pan(R.JETS[i]), (1 - d / 10) * 0.7);
        }
      }
      j.last = st;
    });
    barrel.rotation.z = t * R.BARREL_SPIN;
    audio.rumble(live ? Math.max(0, 1 - Math.abs(rs - R.BARREL_C) / 9) : 0);
    const ang = R.tiltAngle(t);
    plank.rotation.x = ang;
    const dir = Math.sign(Math.cos((t * 2 * Math.PI) / R.TILT_P + 0.5));
    if (live && dir !== lastTiltDir && Math.abs(rs - R.PLANK_C) < 10) audio.S.creak(1 - Math.abs(rs - R.PLANK_C) / 10);
    lastTiltDir = dir;
    for (const d of doors) {
      if (d.opening) d.open = Math.min(1, d.open + dt * 2.5);
      d.hinge.rotation.y = d.open * 1.7;
    }
    S.glint = Math.max(0, S.glint - dt * 1.4);
    const showGlint = live && r && r.mode === 'door';
    glint.material.opacity = showGlint ? S.glint * 0.85 : 0;
    glint.position.set(R.DOOR_X[S.correct] + 0.45, FY + 2.9, zOf(R.DOOR_S) + 0.15);
    glint.rotation.z = realT * 2;
    glint.scale.setScalar(0.6 + S.glint * 0.6);
    /* tickets */
    const showT = S.phase !== 'results' && S.phase !== 'left';
    R.TICKETS.forEach((s, i) => {
      const vis = showT && !(r && r.got[i]);
      _pos.set(R.LANE_X, R.floorY(s, t) + 1.55 + Math.sin(realT * 3 + i) * 0.1, zOf(s));
      _q.setFromAxisAngle(UP, realT * 2 + i);
      _scl.setScalar(vis ? 1 : 0);
      tMesh.setMatrixAt(i, _mat.compose(_pos, _q, _scl));
      _scl.set(vis ? 1.14 : 0, vis ? 1.22 : 0, vis ? 2.2 : 0);
      tInk.setMatrixAt(i, _mat.compose(_pos, _q, _scl));
    });
    tMesh.instanceMatrix.needsUpdate = true;
    tInk.instanceMatrix.needsUpdate = true;
    /* bulbs */
    S.bulbT += dt;
    if (S.bulbT > 0.13) {
      S.bulbT = 0; S.bulbTick++;
      const c0 = new THREE.Color(0xfff2b0), c1 = new THREE.Color(0xff8a3a), c2 = new THREE.Color(0x6a4a50);
      for (let i = 0; i < bulbPos.length; i++) { const k = (i + S.bulbTick) % 4; bulbs.setColorAt(i, k === 0 ? c0 : k === 2 ? c1 : c2); }
      bulbs.instanceColor.needsUpdate = true;
    }
    if (wheel) wheel.rotation.z += dt * 0.08;
  }

  function placeFoxes(dt, realT) {
    const ps = S.players, ph = S.phase, r = S.runner;
    const t = S.clock;
    ps.forEach((p, j) => {
      const F = p.F;
      if (!F) return;
      if (ph === 'results') {
        const k = S.rank ? S.rank.indexOf(p) : j;
        const pd = PODIUM[Math.max(0, Math.min(3, k))];
        F.rig.visible = true;
        F.rig.position.set(pd[0], pd[1], zOf(PODIUM_S));
        F.rig.rotation.y = 2.3;
        F.inner.rotation.set(0, 0, 0);
        F.inner.position.y = k === 0 ? Math.abs(Math.sin(realT * 5)) * 0.4 : 0;
        animFox(F, dt, 0, k === 0 ? 'cheer' : 'idle', realT);
        if (p.G) p.G.rig.visible = false;
        return;
      }
      if (ph === 'left') { F.rig.visible = false; if (p.G) p.G.rig.visible = false; return; }
      if (j === S.turn && r) {
        F.rig.visible = true;
        F.rig.position.set(r.x, R.floorY(r.s, t), zOf(r.s));
        let yaw = Math.PI;
        if (r.mode === 'toDoor') yaw = Math.atan2(R.DOOR_X[r.doorPick] - r.fromX, -(R.DOOR_S - 0.35 - R.DOOR_STOP));
        F.rig.rotation.y = yaw;
        F.inner.position.y = r.hop;
        F.inner.rotation.x = r.mode === 'bonk' ? -r.spin * Math.PI * 2 : 0;
        if (F.sh) F.sh.scale.setScalar(Math.max(0.4, 1 - r.hop * 0.2));
        let pose = 'idle';
        if (ph === 'finish') pose = 'cheer';
        else if (r.mode === 'bonk') pose = r.bonkT > R.BONK_TIME ? 'dizzy' : 'tumble';
        const spd = ph === 'finish' ? 0 : r.mode === 'toDoor' ? 4 : r.mode === 'run' ? Math.abs(r.v) : 0;
        animFox(F, dt, spd, pose, realT);
      } else if (j > S.turn) {
        const k = j - S.turn - 1;
        F.rig.visible = true;
        F.rig.position.set(-1.5 + k * 1.3, 0, zOf(-3.6 - k * 0.4));
        F.rig.rotation.y = Math.PI - 0.4;
        F.inner.position.y = 0; F.inner.rotation.set(0, 0, 0);
        animFox(F, dt, 0, 'idle', realT + j);
      } else {
        F.rig.visible = false;
      }
      /* ghosts of earlier runs race alongside */
      const Gh = p.G;
      if (Gh) {
        const show = j < S.turn && (ph === 'run' || ph === 'countdown' || ph === 'intro' || ph === 'handoff');
        Gh.rig.visible = show && p.rec.length > 0;
        if (Gh.rig.visible) {
          const n = p.rec.length / 5;
          const k = ph === 'run' ? Math.min(n - 1, Math.floor(S.runT / 0.05)) : 0;
          const i = k * 5, s = p.rec[i], x = p.rec[i + 1];
          const near = clamp((s - (R.DOOR_STOP - 1.5)) / 1.5, 0, 1) * (1 - clamp((s - (R.DOOR_S + 0.5)) / 2, 0, 1));
          const slot = R.GHOST_X[Math.min(j, R.GHOST_X.length - 1)];
          Gh.rig.position.set(x + (slot - R.LANE_X) * (1 - near), R.floorY(s, t), zOf(s));
          Gh.rig.rotation.y = Math.PI;
          Gh.inner.position.y = p.rec[i + 2];
          Gh.inner.rotation.x = -p.rec[i + 3] * Math.PI * 2;
          animFox(Gh, dt, ph === 'run' && k < n - 1 ? p.rec[i + 4] : 0, k >= n - 1 && ph === 'run' ? 'cheer' : 'idle', realT);
        }
      }
    });
  }

  /* ---------------- camera: fitted from points into the free screen area ---------------- */
  const camera = new THREE.PerspectiveCamera(world ? world.camera.fov : 45, W / H, 0.1, 500);
  const wcam = new THREE.PerspectiveCamera(camera.fov, camera.aspect, 0.1, 500);
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };
  const goalPos = new V3(10, 8, 20), goalQ = new THREE.Quaternion(), camBase = new V3(10, 8, 20);
  const _look = new THREE.Matrix4(), _c = new V3(), _r = new V3(), _u = new V3(), _f = new V3(), _d = new V3(), _t = new V3();
  const D = (x, y, z) => new V3(x, y, z).normalize();
  const boxPts = (s0, s1, x0, x1, y0, y1) => {
    const out = [];
    for (const s of [s0, s1]) for (const x of [x0, x1]) for (const y of [y0, y1]) out.push(new V3(x, y, zOf(s)));
    return out;
  };
  function fit(pts, dir) {
    _f.copy(dir).negate();
    _r.crossVectors(_f, UP).normalize();
    _u.crossVectors(_r, _f).normalize();
    _c.set(0, 0, 0);
    const mn = new V3(Infinity, Infinity, Infinity), mx = new V3(-Infinity, -Infinity, -Infinity);
    for (const p of pts) { mn.min(p); mx.max(p); }
    _c.addVectors(mn, mx).multiplyScalar(0.5);
    const fw = Math.max(60, W - safe.left - safe.right), fh = Math.max(60, H - safe.top - safe.bottom);
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), ht = (vt * W) / H;
    const vtE = (vt * fh) / H, htE = (ht * fw) / W;
    let d = 3;
    for (const p of pts) {
      _d.subVectors(p, _c);
      const x = _d.dot(_r), y = _d.dot(_u), zz = _d.dot(dir);
      d = Math.max(d, zz + Math.abs(x) / htE, zz + Math.abs(y) / vtE);
    }
    d *= 1.05;
    const wpp = (2 * d * vt) / H;
    const fx = safe.left + fw / 2, fy = safe.top + fh / 2;
    goalPos.copy(_c).addScaledVector(dir, d).addScaledVector(_r, -(fx - W / 2) * wpp).addScaledVector(_u, (fy - H / 2) * wpp);
    _t.copy(goalPos).add(_f);
    _look.lookAt(goalPos, _t, UP);
    goalQ.setFromRotationMatrix(_look);
  }
  function computeGoal() {
    if (world) readSize();
    const portrait = H > W * 1.05;
    camera.fov = world ? world.camera.fov : portrait ? 60 : 42;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const ph = S.phase, r = S.runner;
    if (ph === 'results' || ph === 'left') fit(boxPts(50.6, 52.6, -2.6, 3.2, 0, 3.7), portrait ? D(0.75, 0.4, -0.7) : D(0.85, 0.36, -0.75));
    else if (r && ph === 'run' && (r.mode === 'door' || r.mode === 'toDoor' || (r.mode === 'bonk' && r.bonkKind === 'door'))) fit(boxPts(37.6, 40.8, -2.7, 2.7, FY, FY + 4.3), D(0.18, 0.5, 1));
    else if (ph === 'intro' || ph === 'handoff' || ph === 'countdown') fit(boxPts(-4.5, portrait ? 5 : 9, -2.6, 3.2, 0, FY + 3.2), portrait ? D(0.6, 0.7, 0.9) : D(1, 0.48, 0.5));
    else if (r) {
      const s = r.s;
      const a = portrait ? s - 1.8 : s - 2.5, b = portrait ? s + 6.5 : s + 8.5;
      const lo = Math.min(FY, R.floorY(s, S.clock)) - 0.2;
      fit(boxPts(a, b, -2.2, 2.4, lo, FY + 3.4), portrait ? D(0.8, 0.6, 0.62) : D(1, 0.48, 0.42));
    }
  }
  function updateCamera(dt, snap) {
    computeGoal();
    const k = snap ? 1 : 1 - Math.exp(-dt * 3.2);
    camBase.lerp(goalPos, k);
    camera.quaternion.slerp(goalQ, k);
    camera.position.copy(camBase);
    if (S.shake > 0) {
      S.shake = Math.max(0, S.shake - dt);
      const a = S.shake * 0.5;
      camera.position.x += (Math.random() - 0.5) * a;
      camera.position.y += (Math.random() - 0.5) * a;
    }
    camera.updateMatrixWorld();
    /* mirror the local camera into world space */
    scene.updateWorldMatrix(true, false);
    wcam.position.copy(camera.position);
    scene.localToWorld(wcam.position);
    scene.getWorldQuaternion(_q);
    wcam.quaternion.copy(_q).multiply(camera.quaternion);
    wcam.fov = camera.fov; wcam.aspect = camera.aspect;
    wcam.updateProjectionMatrix();
    wcam.updateMatrixWorld();
  }

  /* ---------------- input ---------------- */
  function doorAt(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1, ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    camera.updateMatrixWorld();
    const r = S.runner;
    let best = -1, bd = 0.35;
    for (let i = 0; i < 3; i++) {
      if (r.doorTried.includes(i)) continue;
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const dx of [-R.DOOR_W / 2, R.DOOR_W / 2]) for (const dy of [0, 3.2]) {
        _t.set(R.DOOR_X[i] + dx, FY + dy, zOf(R.DOOR_S)).project(camera);
        x0 = Math.min(x0, _t.x); x1 = Math.max(x1, _t.x); y0 = Math.min(y0, _t.y); y1 = Math.max(y1, _t.y);
      }
      if (nx >= x0 - 0.03 && nx <= x1 + 0.03 && ny >= y0 - 0.05 && ny <= y1 + 0.05) return i;
      const dd = Math.hypot(nx - (x0 + x1) / 2, ny - (y0 + y1) / 2);
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }
  function touchInput() { S.lastInput = performance.now(); audio.unlock(); }
  let ptrDown = false;
  function onDown(e) {
    if (world) {
      if (e.target !== renderer.domElement) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    if (e.button != null && e.button > 0) return;
    touchInput();
    const p = S.players[S.turn], r = S.runner;
    if (S.paused || !p) return;
    if (S.phase === 'handoff') { beginCountdown(); ptrDown = true; S.holdPtr = true; return; }
    if ((S.phase === 'run' || S.phase === 'countdown' || S.phase === 'intro') && !p.cpu) {
      if (S.phase === 'run' && r.mode === 'door') { const i = doorAt(e); if (i >= 0) pickDoor(i); return; }
      ptrDown = true; S.holdPtr = true; emit(true);
      return;
    }
    if (S.phase === 'run' && p.cpu) { S.ff = !S.ff; emit(true); }
  }
  function onUp() {
    if (!ptrDown) return;
    ptrDown = false; S.holdPtr = false; emit(true);
  }
  const RUN_KEYS = [' ', 'Spacebar', 'ArrowRight', 'ArrowUp', 'w', 'W', 'd', 'D', 'Enter'];
  function onKey(e) {
    const down = e.type !== 'keyup';
    const k = e.key;
    const r = S.runner, p = S.players[S.turn];
    if (!p) return;
    if (down) touchInput();
    if (down && S.phase === 'run' && r && r.mode === 'door' && !p.cpu) {
      const map = { 1: 0, 2: 1, 3: 2, ArrowLeft: 0, a: 0, A: 0, ArrowUp: 1, w: 1, W: 1, ArrowRight: 2, d: 2, D: 2 };
      if (k in map) { pickDoor(map[k]); if (e.preventDefault && !world) e.preventDefault(); }
      return;
    }
    if (RUN_KEYS.includes(k)) {
      if (!world && e.preventDefault) e.preventDefault();
      if (down) {
        if (S.phase === 'handoff') beginCountdown();
        if (p.cpu && S.phase === 'run' && !e.repeat) { S.ff = !S.ff; emit(true); return; }
        if (!S.holdKey) { S.holdKey = true; emit(true); }
        S.keyTimer = 0.6;
      } else { S.holdKey = false; emit(true); }
    } else if ((k === 'f' || k === 'F') && down && p.cpu) { S.ff = !S.ff; emit(true); }
  }
  const cv = renderer.domElement;
  const noCtx = (e) => e.preventDefault();
  if (world) {
    window.addEventListener('pointerdown', onDown, true);
  } else {
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('contextmenu', noCtx);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
  }
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);

  /* ---------------- state out ---------------- */
  function hud() {
    const p = S.players[S.turn], r = S.runner;
    return {
      key: GAME.key, phase: S.phase, mode: S.mode, diff: S.diff, nPlayers: S.nPlayers, paused: S.paused,
      sound: audio.sound, music: audio.music, world: !!world,
      runner: p ? { name: p.name, css: p.css, cpu: !!p.cpu } : null,
      turn: S.turn + 1, turns: S.players.length,
      time: S.runT.toFixed(1), tickets: r ? r.tickets : 0, bonks: r ? r.bonks : 0,
      seg: S.segName, msg: S.msg, caption: S.mode === 'demo' ? S.caption : '', pop: S.pop, count: S.count,
      human: !!(p && !p.cpu && (S.phase === 'run' || S.phase === 'countdown' || S.phase === 'intro')),
      door: !!(r && p && !p.cpu && S.phase === 'run' && r.mode === 'door'),
      tried: r ? r.doorTried.slice() : [],
      holding: S.holdPtr || S.holdUi || S.holdKey,
      cpuRun: !!(p && p.cpu && S.phase === 'run'), ff: S.ff, hint: S.hint,
      players: S.players.map((q, i) => ({ name: q.name, css: q.css, cpu: !!q.cpu, score: q.done ? q.score : null, active: i === S.turn })),
      best: S.best, opponent: CAST[S.diff] ? CAST[S.diff].name : '', result: S.result,
    };
  }
  function emit(now) {
    if (now) { S.emitT = 0; try { onState(hud()); } catch (e) { console.error(e); } }
  }

  /* ---------------- loop ---------------- */
  let raf = 0, alive = true, last = performance.now(), realT = 0;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    realT += dt;
    const gdt = S.paused ? 0 : dt;
    update(gdt);
    updateWorldBits(gdt, realT);
    placeFoxes(gdt, realT);
    updateCamera(dt, false);
    if (!world) renderer.render(scene, camera);
    S.emitT += dt;
    if (S.emitT >= 0.1) emit(true);
  }

  newGame(S.mode);
  updateCamera(0, true);
  raf = requestAnimationFrame(frame);

  /* ---------------- API ---------------- */
  return {
    hud,
    setSafe(o = {}) {
      for (const k of ['top', 'bottom', 'left', 'right']) if (typeof o[k] === 'number') safe[k] = Math.max(0, o[k]);
    },
    start(mode) { touchInput(); newGame(mode || S.mode); },
    restart() { touchInput(); newGame(S.mode); },
    playAgain() { touchInput(); newGame(S.mode); },
    setDifficulty(d) { if (!CAST[d]) return; S.diff = d; if (S.mode === 'cpu') newGame('cpu'); else emit(true); },
    setPlayers(n) { S.nPlayers = clamp(n | 0, 2, 4); if (S.mode === 'local') newGame('local'); else emit(true); },
    hold(b) { if (b) touchInput(); S.holdUi = !!b; if (b && S.phase === 'handoff') beginCountdown(); emit(true); },
    pickDoor(i) { touchInput(); pickDoor(i); },
    go() { touchInput(); beginCountdown(); },
    fast() { const p = S.players[S.turn]; if (p && p.cpu) { S.ff = !S.ff; emit(true); } },
    pause(b) { S.paused = !!b; if (b) S.holdPtr = S.holdUi = S.holdKey = false; emit(true); },
    setSound(b) { audio.setSound(b); emit(true); },
    setMusic(b) { touchInput(); audio.setMusic(b); emit(true); },
    leave() { S.phase = 'left'; S.paused = false; S.msg = 'You left the funhouse.'; audio.rumble(0); emit(true); },
    key(e) { onKey(e); },
    get _state() { return S; }, /* test hook */
    get camera() { return world ? wcam : camera; },
    snapCam() { updateCamera(0, true); },
    destroy() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      if (world) window.removeEventListener('pointerdown', onDown, true);
      else {
        cv.removeEventListener('pointerdown', onDown);
        cv.removeEventListener('contextmenu', noCtx);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      }
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      if (ro) ro.disconnect();
      audio.close();
      const seen = new Set();
      const kill = (o) => {
        if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) if (!seen.has(m)) { seen.add(m); m.dispose(); }
      };
      scene.traverse(kill);
      if (env !== scene) env.traverse(kill);
      for (const t of textures) t.dispose();
      for (const g of Object.values(G)) g.dispose();
      if (world) world.parent.remove(scene);
      else { renderer.dispose(); if (cv.parentNode) cv.parentNode.removeChild(cv); }
    },
  };
}

export default createFunhouse;
