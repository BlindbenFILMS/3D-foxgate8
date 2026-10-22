/* ORCHARD — 8 GATES 3D minigame. Foxes race to pick ripe fruit from three trees.
   Standalone: makes its own renderer. World mode: builds into opts.world.parent. */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './orchard-rules.js';
import { createAudio } from './orchard-audio.js';

export const GAME = { key: 'fruitOrchard', name: 'ORCHARD', maxPlayers: 4 };

const INK = 0x1a1626;
const DEG = Math.PI / 180;
const FUR = '#e8743b', CREAM = '#fff3e0', PAW = '#3a2a22';

const CAST = {
  you:   { name: 'YOU',   tag: '#ec3013', torso: ['#ec3013', '#3a3836', '#ffd23a'], outfit: 'vest' },
  pip:   { name: 'PIP',   tag: '#ffd23a', torso: ['#ffd23a', '#e0a800', '#ffffff'], outfit: 'tee' },
  hope:  { name: 'HOPE',  tag: '#4f8ff7', torso: ['#f4f1ea', '#2f6fd6', '#1a1626'], outfit: 'coat', glasses: true, cane: true },
  noble: { name: 'NOBLE', tag: '#c7c3bd', torso: ['#2b2d42', '#8d99ae', '#ec3013'], outfit: 'coat', chair: true, redEyes: true },
};
const LOCAL_COLORS = ['#ec3013', '#2a9d8f', '#ffd23a', '#4f8ff7'];
const LINES = {
  pip: 'PIP: Ooh, shiny ones! I am grabbing all of them!',
  hope: 'HOPE: I will listen for the ripe chime. Good luck.',
  noble: 'NOBLE: My chair has never missed a ripe fruit.',
};
const DEMO_CAPTIONS = [
  'Tap a ripe fruit. Your fox runs over and picks it.',
  'Ripe fruit is full colour and bobs. Green fruit scores almost nothing.',
  'Pick ripe fruit in a row for a streak bonus.',
  'Tap a trunk to shake the tree. Catch falling fruit for extra points.',
  'Fruit that hits the ground bruises. It is worth half.',
  'Golden apples are worth 30, but they spoil fast.',
  'HOPE plays by ear. Every ripe fruit chimes, left or right.',
];

/* ---------------- toon kit ---------------- */
let GRAD = null;
function gradient() {
  if (!GRAD) {
    GRAD = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
    GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
    GRAD.generateMipmaps = false;
    GRAD.needsUpdate = true;
  }
  return GRAD;
}

function M4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}
function merge(list) {
  const pos = [], nor = [];
  for (const [g, m] of list) {
    const gg = g.index ? g.toNonIndexed() : g.clone();
    if (m) gg.applyMatrix4(m);
    pos.push(gg.attributes.position.array); nor.push(gg.attributes.normal.array);
    gg.dispose(); g.dispose();
  }
  const cat = (arrs) => { const n = arrs.reduce((s, a) => s + a.length, 0); const out = new Float32Array(n); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(cat(pos), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(cat(nor), 3));
  geo.computeBoundingSphere();
  return geo;
}

export async function createOrchard({ container, onState = () => {}, opts = {} }) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const touch = (typeof window !== 'undefined') && ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window);

  /* disposables */
  const geos = new Set(), mats = new Set(), texs = new Set();
  const G = (g) => { geos.add(g); return g; };
  const matCache = new Map();
  function toon(color, extra) {
    const key = extra ? null : color;
    if (key && matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient(), ...(extra || {}) });
    mats.add(m); if (key) matCache.set(key, m);
    return m;
  }
  const basic = (color, extra) => { const m = new THREE.MeshBasicMaterial({ color, ...(extra || {}) }); mats.add(m); return m; };
  const inkMat = basic(INK, { side: THREE.BackSide });
  function ink(mesh, s = 1.06) { const sh = new THREE.Mesh(mesh.geometry, inkMat); sh.scale.setScalar(s); sh.raycast = () => {}; mesh.add(sh); return sh; }
  function mesh(geo, mat, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(G(geo), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }

  /* ---------------- renderer / scene ---------------- */
  let renderer = null, root = null;
  const scene = new THREE.Group();
  scene.name = 'orchard';
  let env;
  if (world) {
    world.parent.add(scene);
    env = new THREE.Scene(); /* throw-away: lights + room never touch the town */
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.fastStart = false;
    const el = renderer.domElement;
    el.style.display = 'block'; el.style.width = '100%'; el.style.height = '100%'; el.style.touchAction = 'none';
    container.appendChild(el);
    root = new THREE.Scene();
    root.background = new THREE.Color('#8fd3ef');
    root.fog = new THREE.Fog('#8fd3ef', 38, 90);
    root.add(scene);
    env = root;
  }

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
  const wcam = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
  const view = { w: 1, h: 1 };
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };

  function readSize() {
    if (world) {
      const el = world.renderer.domElement;
      view.w = Math.max(1, el.clientWidth); view.h = Math.max(1, el.clientHeight);
    } else {
      view.w = Math.max(1, container.clientWidth); view.h = Math.max(1, container.clientHeight);
    }
  }
  readSize();
  if (renderer) renderer.setSize(view.w, view.h, false);
  let ro = null;
  if (!world && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => { readSize(); renderer.setSize(view.w, view.h, false); });
    ro.observe(container);
  }

  /* ---------------- environment (room) ---------------- */
  function buildEnv() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x5f8a3c, 1.3);
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
    sun.position.set(6, 12, 9);
    env.add(hemi, sun);
    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    env.add(amb);
    const room = new THREE.Group(); room.name = 'orchard-room';
    env.add(room);
    mesh(new THREE.CircleGeometry(80, 40), toon('#9bd16a'), room, 0, -0.08, 0).rotation.x = -Math.PI / 2;
    /* hills */
    const hills = merge([
      [new THREE.SphereGeometry(1, 18, 10), M4(-22, -4, -34, 0, 0, 0, 16, 10, 8)],
      [new THREE.SphereGeometry(1, 18, 10), M4(4, -6, -40, 0, 0, 0, 22, 13, 9)],
      [new THREE.SphereGeometry(1, 18, 10), M4(28, -4, -32, 0, 0, 0, 15, 9, 8)],
    ]);
    mesh(hills, toon('#6fb556'), room);
    /* back row of trees, simple */
    const bush = [];
    for (let i = 0; i < 9; i++) {
      const x = -24 + i * 6 + (i % 2) * 1.5;
      bush.push([new THREE.SphereGeometry(1, 12, 8), M4(x, 3.4, -16 - (i % 3), 0, 0, 0, 2.6, 2.2, 2.2)]);
    }
    mesh(merge(bush), toon('#3f8f45'), room);
    const trunks = [];
    for (let i = 0; i < 9; i++) trunks.push([new THREE.CylinderGeometry(0.3, 0.4, 2.4, 8), M4(-24 + i * 6 + (i % 2) * 1.5, 1.2, -16 - (i % 3))]);
    mesh(merge(trunks), toon('#7a4e2c'), room);
    /* barn */
    const barn = new THREE.Group(); barn.position.set(-15, 0, -9); barn.rotation.y = 0.5; room.add(barn);
    const bw = mesh(new THREE.BoxGeometry(5, 3.6, 4), toon('#c83a28'), barn, 0, 1.8, 0); ink(bw, 1.03);
    const roof = mesh(new THREE.CylinderGeometry(0.01, 3.4, 2, 4, 1), toon('#3a3836'), barn, 0, 4.6, 0); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.85);
    mesh(new THREE.BoxGeometry(1.6, 2.2, 0.1), toon('#fff3e0'), barn, 0, 1.1, 2.03);
    /* clouds */
    const cl = [];
    [[-14, 13, -30], [6, 15, -36], [22, 12, -28], [-30, 11, -26]].forEach(([x, y, z]) => {
      cl.push([new THREE.SphereGeometry(1, 12, 8), M4(x, y, z, 0, 0, 0, 3, 1.6, 1.6)]);
      cl.push([new THREE.SphereGeometry(1, 12, 8), M4(x + 2.4, y + 0.5, z, 0, 0, 0, 2.2, 1.6, 1.4)]);
      cl.push([new THREE.SphereGeometry(1, 12, 8), M4(x - 2.2, y - 0.2, z, 0, 0, 0, 1.8, 1.2, 1.2)]);
    });
    mesh(merge(cl), basic('#ffffff'), room);
    /* sun */
    mesh(new THREE.CircleGeometry(3, 24), basic('#ffd23a', { fog: false }), room, 20, 20, -50);
  }
  buildEnv();

  /* ---------------- the playable plot (lives in the group) ---------------- */
  const plotW = 19.4, plotZ0 = -3.6, plotZ1 = 5.4;
  function buildPlot() {
    const g = new THREE.Group(); g.name = 'plot'; scene.add(g);
    const grass = mesh(new THREE.BoxGeometry(plotW, 0.14, plotZ1 - plotZ0), toon('#7cc456'), g, 0, -0.05, (plotZ0 + plotZ1) / 2);
    ink(grass, 1.004);
    /* dirt walkway rows */
    mesh(new THREE.PlaneGeometry(plotW - 1, 1.6), toon('#d9b77a'), g, 0, 0.03, 3.2).rotation.x = -Math.PI / 2;
    /* low wooden border */
    const rails = [];
    const hz = (plotZ1 - plotZ0) / 2, cz = (plotZ0 + plotZ1) / 2, hw = plotW / 2;
    rails.push([new THREE.BoxGeometry(plotW + 0.3, 0.3, 0.22), M4(0, 0.12, plotZ0)]);
    rails.push([new THREE.BoxGeometry(plotW + 0.3, 0.3, 0.22), M4(0, 0.12, plotZ1)]);
    rails.push([new THREE.BoxGeometry(0.22, 0.3, hz * 2), M4(-hw, 0.12, cz)]);
    rails.push([new THREE.BoxGeometry(0.22, 0.3, hz * 2), M4(hw, 0.12, cz)]);
    for (let i = 0; i <= 8; i++) {
      const x = -hw + (i * plotW) / 8;
      rails.push([new THREE.BoxGeometry(0.32, 0.55, 0.32), M4(x, 0.25, plotZ0)]);
      rails.push([new THREE.BoxGeometry(0.32, 0.55, 0.32), M4(x, 0.25, plotZ1)]);
    }
    mesh(merge(rails), toon('#a0672c'), g);
    /* baskets by the walkway, one per fox slot */
    const crates = [];
    for (let i = 0; i < 4; i++) crates.push([new THREE.CylinderGeometry(0.42, 0.32, 0.5, 10), M4(-7.6 + i * 0.95, 0.25, 4.7)]);
    mesh(merge(crates), toon('#c08a4a'), g);
    return g;
  }
  buildPlot();

  /* ---------------- trees ---------------- */
  const shadowGeo = G(new THREE.CircleGeometry(1, 20));
  const shadowMat = basic('#000000', { transparent: true, opacity: 0.2, depthWrite: false });
  const treeViews = [];
  let TG = null;
  function treeGeo() {
    if (TG) return TG;
    const C = R.CANOPY;
    TG = {
      trunk: G(merge([
        [new THREE.CylinderGeometry(0.3, 0.44, 3.5, 10), M4(0, 1.75, 0)],
        [new THREE.CylinderGeometry(0.13, 0.2, 1.6, 7), M4(-0.55, 3.0, 0, 0, 0, 0.8)],
        [new THREE.CylinderGeometry(0.13, 0.2, 1.6, 7), M4(0.55, 3.1, 0, 0, 0, -0.8)],
        [new THREE.CylinderGeometry(0.7, 0.9, 0.3, 12), M4(0, 0.1, 0)],
      ])),
      leaves: G(merge([
        [new THREE.SphereGeometry(1, 22, 14), M4(0, C.y - 0.6, 0, 0, 0, 0, C.rx, C.ry, C.rz)],
        [new THREE.SphereGeometry(1, 14, 10), M4(-1.15, C.y + 0.35, -0.55, 0, 0, 0, 0.95)],
        [new THREE.SphereGeometry(1, 14, 10), M4(1.1, C.y + 0.45, -0.5, 0, 0, 0, 1.0)],
        [new THREE.SphereGeometry(1, 14, 10), M4(0, C.y + 0.8, -0.6, 0, 0, 0, 1.05)],
        [new THREE.SphereGeometry(1, 14, 10), M4(-1.85, C.y - 0.75, -0.7, 0, 0, 0, 0.8)],
        [new THREE.SphereGeometry(1, 14, 10), M4(1.85, C.y - 0.7, -0.7, 0, 0, 0, 0.8)],
      ])),
    };
    return TG;
  }
  function buildTrees(o) {
    for (const tv of treeViews) scene.remove(tv.g);
    treeViews.length = 0;
    for (const tr of o.trees) {
      const g = new THREE.Group(); g.position.set(tr.x, 0, tr.z); scene.add(g);
      const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.04; sh.scale.set(2.2, 1.6, 1); g.add(sh);
      const trunk = new THREE.Mesh(treeGeo().trunk, toon('#8a5a33')); g.add(trunk);
      ink(trunk, 1.05);
      const canopy = new THREE.Group(); canopy.position.y = 0.6; g.add(canopy);
      const leaves = new THREE.Mesh(treeGeo().leaves, toon(['#4fae4a', '#45a35a', '#5bb54a'][tr.i % 3])); canopy.add(leaves);
      leaves.scale.x = tr.sx || 1;
      ink(leaves, 1.035);
      treeViews.push({ g, canopy, tr });
    }
  }

  /* ---------------- fruit ---------------- */
  const fruitGeo = G(new THREE.SphereGeometry(0.34, 14, 10));
  const fruitViews = new Map();
  const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
  function buildFruit(o) {
    for (const fv of fruitViews.values()) { scene.remove(fv.m); fv.m.material.dispose(); }
    fruitViews.clear();
    for (const f of o.fruits) {
      const m = new THREE.Mesh(fruitGeo, new THREE.MeshToonMaterial({ color: '#8cc63f', gradientMap: gradient(), emissive: new THREE.Color(0) }));
      if (!touch) ink(m, 1.13); /* phone budget: no fruit outlines */
      scene.add(m);
      fruitViews.set(f.id, { m, f, spin: 0, sx: f.x, sy: f.y, sz: f.z });
    }
  }
  function fruitShape(m, kind, s) {
    if (kind === 'pear') m.scale.set(s * 0.9, s * 1.22, s * 0.9);
    else if (kind === 'plum') m.scale.set(s * 0.9, s * 1.05, s * 0.9);
    else m.scale.setScalar(s);
  }
  function updateFruit(o, time, dt) {
    for (const fv of fruitViews.values()) {
      const { m, f } = fv;
      const K = R.KINDS[f.kind];
      if (f.stage === R.STAGE.GONE) { m.visible = false; continue; }
      m.visible = true;
      const tv = treeViews[f.tree];
      let wob = 0;
      if (tv) wob = tv.canopy.rotation.z;
      const k = Math.min(1, f.t / Math.max(0.01, f.dur));
      let s = 1, x = f.x, y = f.y, z = f.z;
      m.material.emissive.setRGB(0, 0, 0);
      switch (f.stage) {
        case R.STAGE.BUD: s = 0.28 + 0.12 * k; m.material.color.set(K.unripe); break;
        case R.STAGE.UNRIPE: s = 0.42 + 0.5 * k; tmpC.set(K.unripe); tmpC2.set(K.ripe); m.material.color.copy(tmpC).lerp(tmpC2, Math.pow(k, 3) * 0.55); break;
        case R.STAGE.RIPE:
          s = 1 + Math.sin(time * 5 + f.id) * 0.05; y += Math.sin(time * 3 + f.id) * 0.04;
          m.material.color.set(K.ripe);
          if (f.kind === 'gold') m.material.emissive.setRGB(0.35 + 0.25 * Math.sin(time * 8), 0.25, 0);
          break;
        case R.STAGE.OVER: s = 1; y -= 0.12 * k; tmpC.set(K.ripe); tmpC2.set(K.over); m.material.color.copy(tmpC).lerp(tmpC2, 0.3 + 0.6 * k); break;
        case R.STAGE.FALLING: fv.spin += dt * 9; m.rotation.x = fv.spin; break;
        case R.STAGE.GROUND: {
          tmpC.set(f.fellFrom === R.STAGE.RIPE ? K.ripe : K.over); tmpC2.set(K.over);
          m.material.color.copy(tmpC).lerp(tmpC2, 0.45 + 0.4 * k);
          s = 0.95 * (k > 0.8 ? 1 - (k - 0.8) * 4 : 1);
          break;
        }
      }
      if (f.stage <= R.STAGE.OVER) {
        x += Math.sin(wob) * (y - 0.6) * 1.0;
        m.rotation.set(0, 0, wob);
      } else if (f.stage === R.STAGE.GROUND) m.rotation.set(0.4, 0, 0.3);
      fruitShape(m, f.kind, Math.max(0.05, s));
      m.position.set(x, y, z);
      fv.sx = x; fv.sy = y; fv.sz = z;
    }
  }

  /* fruit flying into a basket */
  const flyers = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(fruitGeo, new THREE.MeshToonMaterial({ color: '#e2322b', gradientMap: gradient() }));
    mats.add(m.material); m.visible = false; scene.add(m);
    flyers.push({ m, t: 1, from: new THREE.Vector3(), fox: null });
  }
  let flyerIdx = 0;
  function launchFlyer(ev) {
    const fl = flyers[flyerIdx++ % flyers.length];
    fl.m.material.color.set(R.KINDS[ev.kind][ev.wasStage === R.STAGE.OVER ? 'over' : ev.wasStage === R.STAGE.UNRIPE ? 'unripe' : 'ripe']);
    fl.from.set(ev.x, ev.y, ev.z); fl.t = 0; fl.fox = ev.fox; fl.m.visible = true;
  }
  const tmpV = new THREE.Vector3();
  function updateFlyers(dt) {
    for (const fl of flyers) {
      if (fl.t >= 1) { fl.m.visible = false; continue; }
      fl.t = Math.min(1, fl.t + dt / 0.28);
      const fv = foxViews.find((v) => v.st === fl.fox);
      if (!fv) { fl.t = 1; continue; }
      tmpV.set(fv.wrap.position.x, 2.0, fv.wrap.position.z);
      fl.m.position.lerpVectors(fl.from, tmpV, fl.t);
      fl.m.position.y += Math.sin(fl.t * Math.PI) * 0.8;
      fl.m.scale.setScalar(1 - fl.t * 0.6);
    }
  }

  /* text sprites: score pops + name tags */
  function textSprite(w = 256, h = 96) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; texs.add(tex);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }); mats.add(mat);
    const sp = new THREE.Sprite(mat); sp.renderOrder = 20;
    return { sp, cv, tex, ctx: cv.getContext('2d') };
  }
  function drawText(t, text, color, { box = false, size = 64 } = {}) {
    const { ctx, cv } = t;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.font = `800 ${size}px Archivo, "Arial Black", Arial, sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    if (box) {
      const w = Math.min(cv.width - 4, ctx.measureText(text).width + 28);
      ctx.fillStyle = '#000000'; ctx.fillRect((cv.width - w) / 2, 8, w, cv.height - 16);
      ctx.fillStyle = color; ctx.fillRect((cv.width - w) / 2, cv.height - 14, w, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillText(text, cv.width / 2, cv.height / 2 - 2);
    } else {
      ctx.lineWidth = 12; ctx.strokeStyle = '#1a1626'; ctx.strokeText(text, cv.width / 2, cv.height / 2);
      ctx.fillStyle = color; ctx.fillText(text, cv.width / 2, cv.height / 2);
    }
    t.tex.needsUpdate = true;
  }
  const pops = [];
  for (let i = 0; i < 8; i++) { const t = textSprite(); t.sp.visible = false; t.sp.scale.set(1.9, 0.72, 1); scene.add(t.sp); pops.push({ ...t, life: 0, y0: 0 }); }
  let popIdx = 0;
  function pop(x, y, z, text, color) {
    const p = pops[popIdx++ % pops.length];
    drawText(p, text, color);
    p.life = 1; p.y0 = y; p.sp.position.set(x, y, z + 0.6); p.sp.visible = true;
  }
  function updatePops(dt) {
    for (const p of pops) {
      if (p.life <= 0) { p.sp.visible = false; continue; }
      p.life -= dt / 0.95;
      p.sp.position.y = p.y0 + 0.4 + (1 - p.life) * 1.2;
      p.sp.material.opacity = Math.min(1, p.life * 3);
    }
  }

  /* ---------------- foxes ---------------- */
  function placeholderFox({ torso = CAST.you.torso, outfit = 'vest' }) {
    const root = new THREE.Group();
    const body = new THREE.Group(); body.position.y = 1.05; body.userData.y0 = 1.05; root.add(body);
    const tor = mesh(new THREE.CapsuleGeometry(0.42, 0.5, 4, 12), toon(torso[0]), body, 0, 0.5, 0); ink(tor, 1.07);
    mesh(new THREE.CylinderGeometry(0.445, 0.445, 0.13, 14), toon(torso[2]), body, 0, 0.14, 0);
    if (outfit === 'coat' || outfit === 'dress') { const sk = mesh(new THREE.CylinderGeometry(0.45, 0.64, 0.5, 14), toon(torso[0]), body, 0, -0.08, 0); ink(sk, 1.05); }
    const head = new THREE.Group(); head.position.y = 1.42; body.add(head);
    const furHead = mesh(merge([
      [new THREE.SphereGeometry(0.42, 18, 12), null],
      [new THREE.ConeGeometry(0.2, 0.44, 12), M4(0, -0.07, 0.42, Math.PI / 2)],
      [new THREE.ConeGeometry(0.15, 0.4, 4), M4(-0.24, 0.43, -0.02, 0, 0, 0.35)],
      [new THREE.ConeGeometry(0.15, 0.4, 4), M4(0.24, 0.43, -0.02, 0, 0, -0.35)],
    ]), toon(FUR), head);
    ink(furHead, 1.06);
    mesh(merge([
      [new THREE.SphereGeometry(1, 12, 8), M4(0, -0.17, 0.3, 0, 0, 0, 0.26, 0.17, 0.2)],
      [new THREE.SphereGeometry(1, 10, 8), M4(-0.27, -0.08, 0.22, 0, 0, 0, 0.13, 0.11, 0.1)],
      [new THREE.SphereGeometry(1, 10, 8), M4(0.27, -0.08, 0.22, 0, 0, 0, 0.13, 0.11, 0.1)],
    ]), toon(CREAM), head);
    const eyes = mesh(merge([
      [new THREE.SphereGeometry(0.058, 8, 6), M4(-0.15, 0.08, 0.36)],
      [new THREE.SphereGeometry(0.058, 8, 6), M4(0.15, 0.08, 0.36)],
      [new THREE.SphereGeometry(0.065, 8, 6), M4(0, -0.06, 0.64)],
    ]), basic('#1a1626'), head);
    const arms = [], legs = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Group(); a.position.set(s * 0.52, 0.86, 0); body.add(a);
      mesh(new THREE.CapsuleGeometry(0.12, 0.42, 3, 8), toon(torso[0]), a, 0, -0.3, 0);
      mesh(new THREE.SphereGeometry(0.13, 10, 8), toon(PAW), a, 0, -0.62, 0);
      arms.push(a);
      const l = new THREE.Group(); l.position.set(s * 0.2, 1.05, 0); root.add(l);
      mesh(new THREE.CapsuleGeometry(0.15, 0.5, 3, 8), toon(torso[1]), l, 0, -0.48, 0);
      mesh(new THREE.BoxGeometry(0.24, 0.13, 0.38), toon(PAW), l, 0, -0.97, 0.07);
      legs.push(l);
    }
    const tail = new THREE.Group(); tail.position.set(0, 0.15, -0.36); tail.rotation.x = -1.1; body.add(tail);
    const tm = mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), toon(FUR), tail, 0, 0.45, 0); if (!touch) ink(tm, 1.07);
    mesh(new THREE.SphereGeometry(0.21, 10, 8), toon(CREAM), tail, 0, 0.88, 0);
    root.scale.setScalar(0.94);
    root.userData.P = { body, head, arms, legs, tail, eyes };
    return root;
  }

  /* the adapter: world kit fox when given, otherwise our own placeholder */
  function makeFox(o) {
    let fox = null, usingKit = false;
    if (kit && typeof kit.makeFox === 'function') {
      try { fox = kit.makeFox({ torso: o.torso, outfit: o.outfit, mood: o.mood || 'happy' }); usingKit = !!fox; } catch (e) { fox = null; }
    }
    if (!fox) fox = placeholderFox(o);
    const P = fox.userData.P || (fox.userData.P = {});
    const anchor = P.body || fox;
    /* basket on the back */
    const basket = new THREE.Group(); basket.position.set(0, 0.5, -0.52); anchor.add(basket);
    mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.38, 10), toon('#a0672c'), basket);
    const heap = mesh(new THREE.SphereGeometry(0.27, 10, 8), toon('#e2322b'), basket, 0, 0.16, 0); heap.visible = false;
    P.basket = basket; P.heap = heap;
    if (o.glasses && P.head) {
      const gl = mesh(new THREE.BoxGeometry(0.64, 0.14, 0.07), basic('#111111'), P.head, 0, 0.09, 0.39);
      ink(gl, 1.1);
    }
    if (o.cane && P.arms && P.arms[1]) {
      const cane = new THREE.Group(); cane.position.set(0, -0.62, 0.05); cane.rotation.x = 0.35; P.arms[1].add(cane);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 6), basic('#ffffff'), cane, 0, -0.55, 0);
      mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.22, 6), basic('#ec3013'), cane, 0, -1.08, 0);
    }
    if (o.redEyes && P.head) {
      mesh(merge([[new THREE.SphereGeometry(0.07, 8, 6), M4(-0.15, 0.08, 0.37)], [new THREE.SphereGeometry(0.07, 8, 6), M4(0.15, 0.08, 0.37)]]), basic('#ff2a1a'), P.head);
    }
    const lift = new THREE.Group(); lift.add(fox);
    let chair = null;
    if (o.chair) {
      chair = new THREE.Group(); lift.add(chair);
      const seat = mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.2, 18), toon('#2b2d42'), chair, 0, 0.52, 0); ink(seat, 1.06);
      const back = mesh(new THREE.BoxGeometry(0.95, 0.9, 0.14), toon('#2b2d42'), chair, 0, 1.05, -0.5); ink(back, 1.06);
      const ring = mesh(new THREE.TorusGeometry(0.58, 0.05, 6, 24), basic('#ff3b3b'), chair, 0, 0.4, 0); ring.rotation.x = Math.PI / 2;
      mesh(new THREE.ConeGeometry(0.22, 0.4, 10), basic('#ff8a6a', { transparent: true, opacity: 0.7 }), chair, 0, 0.18, 0).rotation.x = Math.PI;
      fox.position.y = 0.5;
    }
    const wrap = new THREE.Group(); wrap.add(lift);
    const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.045; sh.scale.setScalar(0.62); wrap.add(sh);
    wrap.userData = { fox, P, usingKit, lift, chair, phase: Math.random() * 6, face: Math.PI };
    return wrap;
  }

  function placeholderAnim(ud, dt, speed, time) {
    const { P } = ud;
    ud.phase += dt * (2 + speed * 1.6);
    const amt = Math.min(1, speed / 4);
    const sw = Math.sin(ud.phase) * amt * 0.75;
    if (P.legs) { P.legs[0].rotation.x = sw; P.legs[1].rotation.x = -sw; }
    if (P.arms) { P.arms[0].rotation.set(-sw * 0.8, 0, -0.12); P.arms[1].rotation.set(sw * 0.8, 0, 0.12); }
    if (P.body) {
      P.body.position.y = (P.body.userData.y0 || 1.05) + Math.abs(Math.sin(ud.phase)) * 0.07 * amt + Math.sin(time * 2.2) * 0.012;
      P.body.rotation.set(0.06 * amt, 0, 0);
    }
    if (P.tail) P.tail.rotation.z = Math.sin(time * 3 + ud.phase) * 0.25;
  }

  function poseFox(v, dt, time) {
    const ud = v.wrap.userData, st = v.st, P = ud.P;
    if (ud.usingKit && typeof kit.animFox === 'function') kit.animFox(ud.fox, dt, st.moving);
    else placeholderAnim(ud, dt, st.moving, time);
    let lift = 0;
    const a = st.act;
    const arms = (rx, rz = 0.18) => { if (P.arms) { P.arms[0].rotation.set(rx, 0, -rz); P.arms[1].rotation.set(rx, 0, rz); } };
    if (a) {
      const k = Math.min(1, a.t / a.dur), up = Math.sin(k * Math.PI);
      if (a.type === 'reach') arms(-2.75 * Math.min(1, up * 1.6));
      else if (a.type === 'jump') { arms(-2.95 * Math.min(1, up * 1.6)); lift = up * 1.15; }
      else if (a.type === 'stoop') { if (P.body) P.body.rotation.x = 0.75 * up; arms(-1.1 * up); }
      else if (a.type === 'shake') { arms(-1.45, 0.05); if (P.body) P.body.rotation.z = Math.sin(time * 46) * 0.12; }
    } else if (st.cheer > 0) {
      arms(-2.8 + Math.sin(time * 14) * 0.3, 0.35);
      lift = Math.abs(Math.sin(time * 9)) * 0.35;
    } else {
      /* arms up when fruit is falling right above */
      for (const f of orchard.fruits) {
        if (f.stage === R.STAGE.FALLING && f.y < 4.5 && Math.hypot(f.x - st.x, f.z - st.z) < 1.2) { arms(-2.6, 0.4); break; }
      }
    }
    if (ud.chair) {
      lift += 0.08 * Math.sin(time * 3 + ud.phase);
      if (P.legs) { P.legs[0].rotation.x = -1.45; P.legs[1].rotation.x = -1.45; }
    }
    ud.lift.position.y = lift;
    if (P.heap) {
      P.heap.visible = st.picks > 0;
      P.heap.scale.set(1, Math.min(1, 0.25 + st.picks / 14), 1);
    }
    /* turn smoothly */
    let d = st.face - ud.face;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    ud.face += d * Math.min(1, dt * 12);
    v.wrap.rotation.y = ud.face;
    v.wrap.position.set(st.x, 0, st.z);
  }

  let foxViews = [];
  const youRing = new THREE.Mesh(G(new THREE.RingGeometry(0.62, 0.8, 28)), basic('#ffd23a', { transparent: true, opacity: 0.95, depthWrite: false }));
  youRing.rotation.x = -Math.PI / 2; youRing.position.y = 0.055; scene.add(youRing);
  const targetRing = new THREE.Mesh(G(new THREE.RingGeometry(0.28, 0.4, 24)), basic('#ffd23a', { transparent: true, opacity: 0.9, depthWrite: false }));
  targetRing.rotation.x = -Math.PI / 2; targetRing.position.y = 0.06; targetRing.visible = false; scene.add(targetRing);

  function buildFoxes(list) {
    for (const v of foxViews) {
      scene.remove(v.wrap);
      if (!v.wrap.userData.usingKit) v.wrap.traverse((o) => { if (o.isMesh && o.geometry !== shadowGeo && o.geometry !== fruitGeo && geos.has(o.geometry)) { geos.delete(o.geometry); o.geometry.dispose(); } });
      if (v.tag) { scene.remove(v.tag.sp); v.tag.tex.dispose(); v.tag.sp.material.dispose(); texs.delete(v.tag.tex); mats.delete(v.tag.sp.material); }
    }
    foxViews = list.map((st) => {
      const c = st.cast;
      const wrap = makeFox(c);
      wrap.position.set(st.x, 0, st.z);
      scene.add(wrap);
      let tag = null;
      if (!st.you || list.length > 1) {
        tag = textSprite(256, 72); drawText(tag, st.name, st.color, { box: true, size: 44 });
        tag.sp.scale.set(1.6, 0.45, 1); scene.add(tag.sp);
      }
      return { st, wrap, tag };
    });
  }

  /* ---------------- game state ---------------- */
  const audio = createAudio({ sound: opts.sound !== false, music: world ? false : opts.music !== false });
  const store = {
    get(k, d) {
      if (save && typeof save.stat === 'function') return save.stat(GAME.key + '.' + k, d);
      try { const v = localStorage.getItem(GAME.key + '.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      if (save && typeof save.setStat === 'function') return save.setStat(GAME.key + '.' + k, v);
      try { localStorage.setItem(GAME.key + '.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ }
    },
    gold(n) {
      if (!n) return;
      if (save && typeof save.addGold === 'function') save.addGold(n);
      else this.set('gold', (this.get('gold', 0) || 0) + n);
    },
  };

  const S = {
    phase: 'count', mode: opts.mode || 'cpu', level: opts.level || 'hope', rivals: Math.max(1, Math.min(3, opts.rivals || 1)),
    nLocal: Math.max(2, Math.min(4, opts.players || 2)), turn: 0, turnScores: [],
    time: R.ROUND_TIME, countT: 0, lastCount: 0, paused: false,
    msg: null, msgT: 0, caption: null, capIdx: 0, capT: 0, result: null, seed: 1, lastInput: 0, demoRestart: 0,
  };
  let orchard = R.makeOrchard(1);
  let foxes = [];
  let aiRnd = R.rng(99);
  let clock = 0;

  function say(text, t = 1.8) { S.msg = text; S.msgT = t; dirty = true; }

  function rivalsFor(level, n) {
    const order = [level, ...R.LEVEL_ORDER.filter((l) => l !== level)];
    return order.slice(0, n);
  }

  function setupRound(newSeed) {
    if (newSeed) S.seed = (Math.random() * 1e9) | 0;
    readSize();
    orchard = R.makeOrchard(S.seed, view.h > view.w * 1.05 ? R.LAYOUT_TALL : R.LAYOUT_WIDE);
    layoutFit(orchard);
    aiRnd = R.rng(S.seed ^ 0x5eed);
    buildTrees(orchard);
    buildFruit(orchard);
    const homes = (n) => Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * 3.2, z: 3.2 }));
    let list = [];
    if (S.mode === 'cpu') {
      const rs = rivalsFor(S.level, S.rivals);
      const h = homes(rs.length + 1);
      list.push(mk({ name: 'YOU', you: true, color: CAST.you.tag, cast: CAST.you }, h[0]));
      rs.forEach((l, i) => list.push(mk({ name: CAST[l].name, ai: l, color: CAST[l].tag, cast: CAST[l] }, h[i + 1])));
      S.time = R.ROUND_TIME;
    } else if (S.mode === 'local') {
      const c = LOCAL_COLORS[S.turn];
      list.push(mk({ name: 'PLAYER ' + (S.turn + 1), you: true, color: c, cast: { torso: [c, '#3a3836', '#ffffff'], outfit: ['vest', 'tee', 'coat', 'dress'][S.turn] } }, { x: 0, z: 3.2 }));
      S.time = R.TURN_TIME;
    } else {
      const pair = S.seed % 2 ? ['pip', 'hope'] : ['hope', 'noble'];
      const h = homes(2);
      pair.forEach((l, i) => list.push(mk({ name: CAST[l].name, ai: l, color: CAST[l].tag, cast: CAST[l] }, h[i])));
      S.time = 45;
    }
    foxes = list;
    buildFoxes(foxes);
    S.result = null;
    S.countT = S.mode === 'demo' ? 0.4 : 2.9;
    S.lastCount = 4;
    S.phase = 'count';
    S.lastInput = clock;
    if (S.mode === 'cpu') say(LINES[S.level], 2.9);
    else if (S.mode === 'local') say('PLAYER ' + (S.turn + 1) + ': PICK AS MUCH RIPE FRUIT AS YOU CAN', 2.9);
    else { S.capIdx = 0; S.capT = 0; S.caption = DEMO_CAPTIONS[0]; S.msg = null; }
    snapCam();
    dirty = true;
  }
  function mk(o, h) {
    const st = R.makeFoxState(o.name, o, h.x, h.z);
    st.cast = o.cast; st.color = o.color;
    return st;
  }
  const you = () => (S.mode === 'demo' ? null : foxes.find((f) => f.you) || null);

  function endRound() {
    audio.play('end');
    for (const f of foxes) { f.task = null; f.act = null; }
    if (S.mode === 'local') {
      S.turnScores[S.turn] = foxes[0].score;
      if (S.turn < S.nLocal - 1) { S.phase = 'pass'; dirty = true; return; }
      const rows = S.turnScores.map((sc, i) => ({ name: 'PLAYER ' + (i + 1), score: sc, color: LOCAL_COLORS[i], you: false }));
      rows.sort((a, b) => b.score - a.score);
      const top = rows[0];
      const tie = rows.length > 1 && rows[1].score === top.score;
      const best = Math.max(store.get('best', 0) || 0, top.score);
      store.set('best', best);
      const gold = tie ? 0 : 5 + Math.floor(top.score / 40);
      store.gold(gold);
      S.result = { title: tie ? 'TIE GAME' : top.name + ' WINS', win: !tie, score: top.score, best, gold, xp: 0, stars: R.starsFor(top.score, 'local'), rows, mode: 'local' };
      audio.play('win');
      S.phase = 'result';
    } else if (S.mode === 'cpu') {
      const rows = foxes.map((f) => ({ name: f.name, score: f.score, color: f.color, you: f.you })).sort((a, b) => b.score - a.score);
      const me = you();
      const win = rows[0].you && !(rows[1] && rows[1].score === rows[0].score);
      const prevBest = store.get('best', 0) || 0;
      const best = Math.max(prevBest, me.score);
      store.set('best', best);
      const mult = { pip: 1, hope: 1.5, noble: 2 }[S.level] || 1;
      const gold = win ? Math.round((10 + Math.floor(me.score / 20)) * mult) : 0;
      const xp = win ? 20 + Math.floor(me.score / 10) : 0;
      store.gold(gold);
      if (xp) store.set('xp', (store.get('xp', 0) || 0) + xp);
      const stars = R.starsFor(me.score, 'cpu');
      S.result = {
        title: win ? 'YOU WIN' : (rows[0].score === me.score ? 'TIE GAME' : rows[0].name + ' WINS'),
        win, score: me.score, best, newBest: me.score > prevBest, gold, xp, stars, rows, mode: 'cpu',
        streak: me.bestStreak, picks: me.picks,
      };
      for (const f of foxes) if (f.name === rows[0].name && rows[0].score > 0) f.cheer = 3;
      audio.play(win ? 'win' : 'lose');
      S.phase = 'result';
    } else {
      const rows = foxes.map((f) => ({ name: f.name, score: f.score, color: f.color })).sort((a, b) => b.score - a.score);
      for (const f of foxes) if (f.name === rows[0].name) f.cheer = 2.5;
      S.caption = rows[0].name + ' WINS THE DEMO ROUND WITH ' + rows[0].score + '. NEW ROUND SOON.';
      S.phase = 'demoEnd'; S.demoRestart = 3.2;
    }
    dirty = true;
  }

  /* ---------------- events -> look + sound ---------------- */
  function handleEvents(ev) {
    const me = you();
    for (const e of ev) {
      const pan = e.f ? e.f.x / 8 : e.tree ? e.tree.x / 8 : e.fox ? e.fox.x / 8 : 0;
      switch (e.type) {
        case 'pick': {
          const mine = e.fox === me;
          launchFlyer(e);
          pop(e.x, e.y, e.z, '+' + e.pts, e.fox.color);
          if (e.gold) audio.play('gold', pan);
          else if (e.how === 'catch') audio.play('catch', pan);
          else if (e.ripe) audio.play('pick', e.fox.streak, pan);
          else if (e.how === 'ground') audio.play('ground', pan);
          else if (e.wasStage === R.STAGE.OVER) audio.play('over', pan);
          else audio.play('unripe', pan);
          if (mine) {
            if (e.gold) say('GOLDEN APPLE +' + e.pts);
            else if (e.how === 'catch') say('NICE CATCH +' + e.pts, 1.2);
            else if (!e.ripe && e.wasStage === R.STAGE.UNRIPE) say('TOO GREEN. WAIT FOR FULL COLOUR', 1.6);
            else if (e.fox.streak >= 3 && e.ripe) say('STREAK x' + e.fox.streak, 1.0);
          }
          dirty = true;
          break;
        }
        case 'shake':
          audio.play('shake', pan);
          if (e.fox === me && e.n === 0) say('NOTHING RIPE ON THAT TREE', 1.4);
          break;
        case 'shakeFail': audio.play('shakeFail', pan); if (e.fox === me) say('THAT TREE NEEDS A REST', 1.3); break;
        case 'land': audio.play('land', pan); break;
        case 'ripe': if (S.phase === 'play') audio.play('ripe', pan); break;
        case 'miss': if (e.fox === me) say('TOO SLOW', 1.0); break;
      }
    }
  }

  /* ---------------- camera fit ---------------- */
  const goal = { pos: new THREE.Vector3(0, 8, 22), target: new THREE.Vector3(0, 2.5, 0), fov: 40 };
  const camTarget = new THREE.Vector3(0, 2.5, 0);
  const fitPts = [];
  const C = R.CANOPY;
  const fitPtsTight = [];
  function layoutFit(o) {
    fitPts.length = 0; fitPtsTight.length = 0;
    const h = o.half;
    for (const x of [-9.4, 9.4]) for (const z of [plotZ0, plotZ1]) fitPts.push(new THREE.Vector3(x, 0, z));
    for (const x of [-h, h]) fitPts.push(new THREE.Vector3(x, C.y + 1.8, R.TREE_Z));
    fitPts.push(new THREE.Vector3(0, C.y + 2.2, R.TREE_Z - 0.5));
    for (const x of [-h - 0.3, h + 0.3]) for (const z of [plotZ0 + 1.6, R.PLAY.maxZ + 0.5]) fitPtsTight.push(new THREE.Vector3(x, 0, z));
    for (const x of [-h, h]) fitPtsTight.push(new THREE.Vector3(x, C.y + 1.4, R.TREE_Z + 0.6));
    fitPtsTight.push(new THREE.Vector3(0, C.y + 2.0, R.TREE_Z));
  }
  const _back = new THREE.Vector3(), _right = new THREE.Vector3(1, 0, 0), _up = new THREE.Vector3(), _c = new THREE.Vector3(), _p = new THREE.Vector3();
  function computeGoal() {
    readSize();
    const W = view.w, H = view.h;
    let l = Math.min(safe.left, W * 0.4), r = Math.min(safe.right, W * 0.4), t = Math.min(safe.top, H * 0.45), b = Math.min(safe.bottom, H * 0.45);
    const fw = Math.max(40, W - l - r), fh = Math.max(40, H - t - b);
    const portrait = H > W * 1.05;
    const fov = world ? (world.camera.fov || 50) : portrait ? 56 : 40;
    const tv = Math.tan((fov * DEG) / 2), th = tv * (W / H);
    const tvF = tv * (fh / H) * 0.96, thF = th * (fw / W) * 0.96;
    const el = portrait ? 0.5 : 0.38;
    const az = 0;
    _back.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    _right.set(Math.cos(az), 0, -Math.sin(az));
    _up.crossVectors(_back, _right);
    const pts = portrait ? fitPtsTight.slice() : fitPts.slice();
    for (const f of foxes) { pts.push(_p.clone().set(f.x, 0, f.z)); pts.push(_p.clone().set(f.x, 3, f.z)); }
    const box = new THREE.Box3().setFromPoints(pts);
    box.getCenter(_c);
    /* balance vertically in screen space: solve per point */
    let d = 1;
    for (const p of pts) {
      _p.subVectors(p, _c);
      const px = _p.dot(_right), py = _p.dot(_up), pz = _p.dot(_back);
      d = Math.max(d, pz + Math.abs(px) / thF, pz + Math.abs(py) / tvF);
    }
    const ox = ((l + (W - r)) / 2 - W / 2) / (W / 2);
    const oy = ((t + (H - b)) / 2 - H / 2) / (H / 2);
    const shift = new THREE.Vector3().addScaledVector(_right, -ox * d * th).addScaledVector(_up, oy * d * tv);
    goal.target.copy(_c).add(shift);
    goal.pos.copy(_c).addScaledVector(_back, d).add(shift);
    goal.fov = fov;
    if (root && root.fog) { root.fog.near = d * 1.5; root.fog.far = d * 4.5; }
  }
  function aimCamera(dt, snap) {
    computeGoal();
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    camera.position.lerp(goal.pos, k);
    camTarget.lerp(goal.target, k);
    camera.fov = goal.fov;
    camera.aspect = view.w / view.h;
    camera.updateProjectionMatrix();
    camera.lookAt(camTarget);
    camera.updateMatrixWorld();
    if (world) mirrorCam();
  }
  const _q = new THREE.Quaternion();
  function mirrorCam() {
    camera.updateMatrixWorld(); scene.updateWorldMatrix(true, false);
    wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
    scene.getWorldQuaternion(_q); wcam.quaternion.copy(_q).multiply(camera.quaternion);
    wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
  }
  function snapCam() { aimCamera(0, true); }

  /* ---------------- input ---------------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function toScreen(x, y, z, out) {
    _p.set(x, y, z).project(camera);
    out.x = (_p.x * 0.5 + 0.5) * view.w; out.y = (-_p.y * 0.5 + 0.5) * view.h; out.z = _p.z;
    return out;
  }
  const scr = { x: 0, y: 0, z: 0 }, scr2 = { x: 0, y: 0, z: 0 };
  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
  }
  function tapAt(sx, sy) {
    const me = you();
    if (!me || S.phase !== 'play' || S.paused) return;
    camera.updateMatrixWorld();
    S.lastInput = clock;
    audio.unlock();
    /* 1. fruit near the tap (screen space, generous radius) */
    const rad = Math.max(30, Math.min(view.w, view.h) * 0.06);
    let best = null, bd = rad;
    for (const fv of fruitViews.values()) {
      const f = fv.f;
      if (!(R.pickable(f) || f.stage === R.STAGE.FALLING)) continue;
      toScreen(fv.sx, fv.sy, fv.sz, scr);
      let d = Math.hypot(scr.x - sx, scr.y - sy);
      if (f.stage === R.STAGE.RIPE) d -= 10;
      if (f.stage === R.STAGE.FALLING) d -= 6;
      if (d < bd) { bd = d; best = f; }
    }
    if (best) {
      if (best.stage === R.STAGE.FALLING) { const L = R.landing(best); R.setTask(me, { type: 'move', x: L.x, z: L.z }); }
      else R.setTask(me, { type: 'pick', fid: best.id });
      audio.play('tap');
      return;
    }
    /* 2. trunk = shake */
    for (const tr of orchard.trees) {
      toScreen(tr.x, 0.3, tr.z, scr); toScreen(tr.x, 3.2, tr.z, scr2);
      if (segDist(sx, sy, scr.x, scr.y, scr2.x, scr2.y) < Math.max(26, rad * 0.8)) { R.setTask(me, { type: 'shake', tree: tr.i }); audio.play('tap'); return; }
    }
    /* 3. ground = walk */
    ndc.set((sx / view.w) * 2 - 1, -(sy / view.h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.ray.intersectPlane(ground, new THREE.Vector3());
    if (hit) R.setTask(me, { type: 'move', x: Math.max(orchard.minX, Math.min(orchard.maxX, hit.x)), z: Math.max(R.PLAY.minZ, Math.min(R.PLAY.maxZ, hit.z)) });
  }
  function onPointerDown(e) {
    const el = world ? world.renderer.domElement : renderer.domElement;
    if (world) {
      if (e.target !== el) return;
      e.preventDefault(); e.stopImmediatePropagation();
    }
    const rect = el.getBoundingClientRect();
    tapAt(((e.clientX - rect.left) / rect.width) * view.w, ((e.clientY - rect.top) / rect.height) * view.h);
  }
  const unlockOnce = () => { audio.unlock(); window.removeEventListener('pointerdown', unlockOnce, true); window.removeEventListener('keydown', unlockOnce, true); };
  window.addEventListener('pointerdown', unlockOnce, true);
  window.addEventListener('keydown', unlockOnce, true);
  if (world) window.addEventListener('pointerdown', onPointerDown, true);
  else renderer.domElement.addEventListener('pointerdown', onPointerDown);

  function nearestTree(x) { let b = orchard.trees[0]; for (const t of orchard.trees) if (Math.abs(t.x - x) < Math.abs(b.x - x)) b = t; return b; }
  function key(e) {
    const k = (e.key || '').toLowerCase();
    if (k === 'enter') {
      if (S.phase === 'pass') { api.ready(); return; }
      if (S.phase === 'result') { api.restart(); return; }
    }
    const me = you();
    if (!me || S.phase !== 'play' || S.paused) return;
    S.lastInput = clock; audio.unlock();
    const dirs = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] };
    if (dirs[k]) {
      const [dx, dz] = dirs[k];
      R.setTask(me, { type: 'move', x: Math.max(orchard.minX, Math.min(orchard.maxX, me.x + dx * 1.5)), z: Math.max(R.PLAY.minZ, Math.min(R.PLAY.maxZ, me.z + dz * 1.5)) });
      if (e.preventDefault) e.preventDefault();
      return;
    }
    if (k === ' ' || k === 'spacebar') {
      let best = null, bd = 2.6;
      for (const f of orchard.fruits) {
        if (!R.pickable(f)) continue;
        const d = Math.hypot(f.x - me.x, f.z - me.z) - (f.stage === R.STAGE.RIPE ? 0.8 : 0);
        if (d < bd) { bd = d; best = f; }
      }
      if (best) R.setTask(me, { type: 'pick', fid: best.id });
      else api.shake();
      if (e.preventDefault) e.preventDefault();
      return;
    }
    if (k === 'e') api.shake();
  }
  const onWinKey = (e) => { if (e.target && /input|textarea|select/i.test(e.target.tagName || '')) return; key(e); };
  if (!world) window.addEventListener('keydown', onWinKey);

  /* ---------------- hud ---------------- */
  let dirty = true, emitT = 0;
  function hintPos() {
    const me = you();
    if (!me || S.phase !== 'play' || S.paused || me.task || me.act || clock - S.lastInput < 3) return null;
    let best = null, bd = 1e9;
    for (const fv of fruitViews.values()) {
      if (fv.f.stage !== R.STAGE.RIPE) continue;
      const d = Math.hypot(fv.f.x - me.x, fv.f.z - me.z);
      if (d < bd) { bd = d; best = fv; }
    }
    if (!best) return null;
    toScreen(best.sx, best.sy, best.sz, scr);
    return { x: Math.round(scr.x), y: Math.round(scr.y) };
  }
  function hud() {
    const me = you();
    let players;
    if (S.mode === 'local') {
      players = Array.from({ length: S.nLocal }, (_, i) => ({
        name: 'PLAYER ' + (i + 1), color: LOCAL_COLORS[i],
        score: i === S.turn && S.phase !== 'result' ? foxes[0].score : (S.turnScores[i] ?? null),
        active: i === S.turn && S.phase !== 'result', you: i === S.turn, streak: i === S.turn ? foxes[0].streak : 0,
      }));
    } else {
      players = foxes.map((f) => ({ name: f.name, color: f.color, score: f.score, streak: f.streak, you: !!f.you, ai: f.ai, active: true }));
    }
    let shakeReady = false;
    if (me) shakeReady = nearestTree(me.x).cool <= 0;
    return {
      key: GAME.key, phase: S.phase, mode: S.mode, level: S.level, levelName: R.LEVELS[S.level].name, levelRank: R.LEVELS[S.level].rank,
      rivals: S.rivals, players: S.nLocal, nLocal: S.nLocal, paused: S.paused,
      time: Math.max(0, Math.ceil(S.time)), timeLow: S.phase === 'play' && S.time <= 10,
      count: S.phase === 'count' && S.mode !== 'demo' ? Math.max(1, Math.ceil(S.countT - 0.4)) : null,
      turn: S.mode === 'local' ? { idx: S.turn, of: S.nLocal, name: 'PLAYER ' + (S.turn + 1), color: LOCAL_COLORS[S.turn] } : null,
      scores: players,
      you: me ? { score: me.score, streak: me.streak, picks: me.picks } : null,
      msg: S.msg, caption: S.mode === 'demo' ? S.caption : null,
      pass: S.phase === 'pass' ? { next: 'PLAYER ' + (S.turn + 2), color: LOCAL_COLORS[S.turn + 1], prev: 'PLAYER ' + (S.turn + 1), prevScore: S.turnScores[S.turn] } : null,
      result: S.phase === 'result' ? S.result : null,
      hint: hintPos(), shakeReady,
      sound: audio.sound, music: audio.music,
      best: store.get('best', 0) || 0,
    };
  }
  function emit() { try { onState(hud()); } catch (e) { console.error(e); } }

  /* ---------------- loop ---------------- */
  let raf = 0, last = performance.now(), alive = true;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    clock += dt;
    const ev = [];
    if (!S.paused) {
      if (S.phase === 'count') {
        S.countT -= dt;
        const c = Math.ceil(S.countT - 0.4);
        if (S.mode !== 'demo' && c !== S.lastCount && c >= 1 && c <= 3) { S.lastCount = c; audio.play('tick'); dirty = true; }
        if (S.countT <= 0) {
          S.phase = 'play';
          if (S.mode !== 'demo') { audio.play('go'); say('PICK!', 0.9); }
          dirty = true;
        }
        R.stepOrchard(orchard, dt * 0.25, []);
      } else if (S.phase === 'play') {
        S.time -= dt;
        R.stepOrchard(orchard, dt, ev);
        R.stepAI(orchard, foxes, dt, aiRnd, false);
        R.stepFoxes(orchard, foxes, dt, ev, false);
        handleEvents(ev);
        if (S.mode === 'demo') {
          S.capT += dt;
          if (S.capT > 4.6) { S.capT = 0; S.capIdx = (S.capIdx + 1) % DEMO_CAPTIONS.length; S.caption = DEMO_CAPTIONS[S.capIdx]; dirty = true; }
        }
        if (S.time <= 0) { S.time = 0; endRound(); }
      } else if (S.phase === 'demoEnd') {
        S.demoRestart -= dt;
        if (S.demoRestart <= 0) setupRound(true);
      } else {
        R.stepOrchard(orchard, dt * 0.3, []);
      }
    }
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) { S.msg = null; dirty = true; } }
    /* visuals */
    for (const tv of treeViews) {
      const s = tv.tr.shakeT;
      tv.canopy.rotation.z = Math.sin(clock * 0.9 + tv.tr.i) * 0.012 + (s > 0 ? Math.sin(s * 42) * 0.07 * (s / 0.9) : 0);
    }
    updateFruit(orchard, clock, dt);
    for (const v of foxViews) {
      poseFox(v, dt, clock);
      if (v.tag) { v.tag.sp.position.set(v.st.x, 3.6 + (v.wrap.userData.chair ? 0.5 : 0), v.st.z); }
    }
    const me = you();
    youRing.visible = !!me;
    if (me) { youRing.position.x = me.x; youRing.position.z = me.z; youRing.scale.setScalar(1 + Math.sin(clock * 5) * 0.05); }
    const tp = me && me.task ? R.standPoint(orchard, me.task) : null;
    targetRing.visible = !!tp && S.phase === 'play';
    if (tp) { targetRing.position.x = tp.x; targetRing.position.z = tp.z; targetRing.rotation.z = clock * 2; }
    updateFlyers(dt);
    updatePops(dt);
    aimCamera(dt, false);
    if (renderer) renderer.render(root, camera);
    emitT += dt;
    if (dirty || emitT > 0.1) { emitT = 0; dirty = false; emit(); }
  }

  /* ---------------- api ---------------- */
  const api = {
    hud,
    setSafe(s = {}) {
      safe.top = +s.top || 0; safe.bottom = +s.bottom || 0; safe.left = +s.left || 0; safe.right = +s.right || 0;
    },
    start(mode = 'cpu') {
      S.mode = ['cpu', 'local', 'demo'].includes(mode) ? mode : 'cpu';
      S.turn = 0; S.turnScores = []; S.paused = false;
      setupRound(true);
    },
    restart() { api.start(S.mode); },
    ready() { if (S.phase === 'pass') { S.turn++; setupRound(false); } },
    key,
    get camera() { return world ? wcam : camera; },
    snapCam,
    pause(b = true) { S.paused = !!b; dirty = true; },
    setLevel(l) { if (R.LEVELS[l]) { S.level = l; dirty = true; } },
    setRivals(n) { S.rivals = Math.max(1, Math.min(3, n | 0)); dirty = true; },
    setPlayers(n) { S.nLocal = Math.max(2, Math.min(4, n | 0)); dirty = true; },
    setSound(b) { audio.setSound(b); if (b) audio.unlock(); dirty = true; },
    setMusic(b) { audio.setMusic(b); if (b) audio.unlock(); dirty = true; },
    shake() {
      const me = you();
      if (!me || S.phase !== 'play' || S.paused) return;
      S.lastInput = clock; audio.unlock();
      R.setTask(me, { type: 'shake', tree: nearestTree(me.x).i });
    },
    tap(x, y) { tapAt(x, y); },
    unlockAudio() { audio.unlock(); },
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', unlockOnce, true); window.removeEventListener('keydown', unlockOnce, true);
      if (world) { window.removeEventListener('pointerdown', onPointerDown, true); world.parent.remove(scene); }
      else {
        window.removeEventListener('keydown', onWinKey);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        if (ro) ro.disconnect();
      }
      audio.close();
      for (const fv of fruitViews.values()) fv.m.material.dispose();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      for (const t of texs) t.dispose();
      if (renderer) { renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }
    },
  };

  S.mode = ['cpu', 'local', 'demo'].includes(opts.mode) ? opts.mode : 'cpu';
  setupRound(true);
  aimCamera(0, true);
  raf = requestAnimationFrame(frame);
  emit();
  return api;
}

export default createOrchard;
