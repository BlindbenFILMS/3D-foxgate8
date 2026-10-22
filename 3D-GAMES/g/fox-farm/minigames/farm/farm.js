/* FOX FARM: an 8 GATES 3D minigame. Plant seeds, water them, pick what grows.
   Standalone: createFarm({ container, onState }).
   World mode: createFarm({ opts: { world: { renderer, camera, parent }, kit, save } }). */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './farm-rules.js';
import { createAudio } from './farm-audio.js';
import * as M from './farm-models.js';

export const GAME = { key: 'farmField', name: 'FOX FARM', maxPlayers: 4 };

const CAST = {
  you:   { name: 'YOU',   torso: [0xf07a2a, 0xfff3e0, 0xec3013], outfit: 'vest', color: '#ec3013' },
  pip:   { name: 'PIP',   torso: [0xffc23a, 0xfff6d8, 0xffd23a], outfit: 'tee',  color: '#ffd23a' },
  hope:  { name: 'HOPE',  torso: [0xe0813a, 0xfff3e0, 0x2f6fd8], outfit: 'coat', color: '#5b9bff', legColor: 0x2f6fd8, sunglasses: true, cane: true },
  noble: { name: 'NOBLE', torso: [0x9a4a2a, 0xf2e6d8, 0x2b2d3a], outfit: 'coat', color: '#c9c3ff', redEyes: true, chair: true },
};
const LOCAL = [
  { name: 'P1', torso: [0xf07a2a, 0xfff3e0, 0xec3013], color: '#ec3013' },
  { name: 'P2', torso: [0xffc23a, 0xfff6d8, 0xffd23a], color: '#ffd23a' },
  { name: 'P3', torso: [0xd9733a, 0xfff3e0, 0x2f6fd8], color: '#5b9bff' },
  { name: 'P4', torso: [0xc8642a, 0xfff3e0, 0x3aa65a], color: '#4cc46a' },
];
const ORDER = ['pip', 'hope', 'noble'];
const SECONDS = { cpu: 90, local: 60, demo: 75 };
const DEMO_TIPS = {
  intro: 'DEMO. HOPE and NOBLE race to grow the biggest harvest.',
  plant: 'Tap bare soil to plant. Pick CORN, CARROT or LETTUCE first.',
  thirsty: 'A blue drop means thirsty. Tap the crop to water it.',
  ripe: 'A spinning star means ripe. Tap to pick before it wilts.',
  crow: 'Crow! Tap it away or it eats your crop.',
  salad: 'One corn, one carrot, one lettuce makes a SALAD: +6.',
  corn: 'CORN grows slowest but scores 5. LETTUCE is quick for 2.',
  tap: 'Tap anywhere to play against PIP.',
};
const TIPS = {
  start: 'Tap bare soil to plant. Your fox walks over.',
  thirsty: 'Blue drop: thirsty. Tap it to water.',
  ripe: 'Star: ripe! Tap to pick it.',
  crow: 'A crow! Tap it to shoo it away.',
  wilt: 'Too late, it wilted. Tap to clear the soil.',
  salad: 'SALAD BOWL! One of each crop: +6.',
};

/* plot origins, player 0 first. Portrait stacks plots in depth, landscape spreads them wide. */
const PLOT_LAYOUT = {
  portrait: {
    2: [[0, 6.6], [0, -6.6]],
    3: [[0, 6.6], [-4.5, -6.6], [4.5, -6.6]],
    4: [[-4.5, 6.6], [4.5, 6.6], [-4.5, -6.6], [4.5, -6.6]],
  },
  landscape: {
    2: [[-4.5, 0], [4.5, 0]],
    3: [[0, 0], [-9, 0], [9, 0]],
    4: [[-4.5, 0], [4.5, 0], [-13.5, 0], [13.5, 0]],
  },
};

export async function createFarm({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const touch = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  /* ---------- renderer / scene ---------- */
  let renderer;
  if (world) renderer = world.renderer;
  else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
  }
  const dom = renderer.domElement;
  const scene = world ? new THREE.Group() : new THREE.Scene();
  if (world) world.parent.add(scene);
  /* lights, sky, room: never into the world's group */
  const room = world ? new THREE.Scene() : scene;
  if (!world) M.buildRoom(room, { touch });

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const fitCam = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const camGoal = { pos: new THREE.Vector3(0, 20, 20), target: new THREE.Vector3() };
  const camTarget = new THREE.Vector3();
  camera.position.set(0, 24, 24); camera.lookAt(0, 0, 0);

  const audio = createAudio({ music: !world });

  /* ---------- save ---------- */
  const save = opts.save || null;
  const store = {
    get(k, d) {
      if (save && save.stat) return save.stat(k, d);
      try { const v = localStorage.getItem('farmField.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      if (save && save.setStat) return save.setStat(k, v);
      try { localStorage.setItem('farmField.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ }
    },
    addGold(n) {
      if (!n) return;
      if (save && save.addGold) return save.addGold(n);
      store.set('gold', (store.get('gold', 0) || 0) + n);
    },
  };

  /* ---------- batches (instanced crop parts) ---------- */
  const G = M.cropGeometries();
  const B = {
    bed: new M.Batch(scene, G.bed, { max: 60, ink: 0 }),
    seed: new M.Batch(scene, G.seed, { max: 120, ink: 0 }),
    leaf: new M.Batch(scene, G.leaf, { max: 260, ink: 0.025 }),
    lettuce: new M.Batch(scene, G.lettuce, { max: 70, ink: 0.03 }),
    lettuceLeaf: new M.Batch(scene, G.lettuceLeaf, { max: 300, ink: 0.025 }),
    frond: new M.Batch(scene, G.frond, { max: 320, ink: 0 }),
    carrotTop: new M.Batch(scene, G.carrotTop, { max: 60, ink: 0.025 }),
    carrot: new M.Batch(scene, G.carrot, { max: 20, ink: 0.03 }),
    stalk: new M.Batch(scene, G.stalk, { max: 60, ink: 0.025 }),
    cornLeaf: new M.Batch(scene, G.cornLeaf, { max: 260, ink: 0 }),
    cob: new M.Batch(scene, G.cob, { max: 130, ink: 0.025 }),
    husk: new M.Batch(scene, G.husk, { max: 130, ink: 0 }),
    tassel: new M.Batch(scene, G.tassel, { max: 60, ink: 0 }),
    drop: new M.Batch(scene, G.drop, { max: 140, ink: 0.02 }),
    star: new M.Batch(scene, G.star, { max: 60, ink: 0.02 }),
    ring: new M.Batch(scene, G.ring, { max: 40, ink: 0, basic: true }),
  };
  const batchList = Object.values(B);

  /* ---------- crows, pops ---------- */
  const crows = Array.from({ length: 6 }, () => { const c = M.makeCrow(); c.visible = false; scene.add(c); return c; });
  const pops = Array.from({ length: 10 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
    s.visible = false; s.renderOrder = 10; scene.add(s); return { s, t: 0, life: 0 };
  });

  /* ---------- state ---------- */
  let match = null, mode = 'cpu', level = store.get('level', 'pip'), opponents = 1, localPlayers = 2;
  let phase = 'play', paused = false, seed = 'corn', turn = 0, result = null;
  let plots = [], foxes = [], signs = [], plotGroup = null;
  let flyers = [], drops = [], leaving = [], msg = null, caption = null, menuReq = 0;
  let cursor = 4, showCursor = false, lastInput = performance.now(), hint = null, overTimer = 0;
  const seen = new Set();
  const busyStart = new WeakMap();
  let safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let time = 0, raf = 0, last = performance.now(), hudTimer = 0, dirty = true, alive = true, canTimer = 0, tickSec = -1;

  function size() {
    if (world) return { w: dom.clientWidth || 1, h: dom.clientHeight || 1 };
    return { w: container.clientWidth || 1, h: container.clientHeight || 1 };
  }
  function humanIdx() {
    if (!match || phase !== 'play') return -1;
    if (mode === 'cpu') return 0;
    if (mode === 'local') return turn;
    return -1;
  }
  function say(text, ms = 2600) { msg = { text, id: (msg ? msg.id : 0) + 1, until: performance.now() + ms }; dirty = true; }
  function tip(key) {
    if (mode === 'demo' || seen.has(key)) return;
    seen.add(key); say(TIPS[key], 3200);
  }

  /* ---------- building a match ---------- */
  function buildPlayers() {
    if (mode === 'local') return LOCAL.slice(0, localPlayers).map((c, i) => ({ ...c, name: 'P' + (i + 1), kind: 'human', level: 'human', cast: c }));
    if (mode === 'demo') return ['hope', 'noble'].map(k => ({ name: CAST[k].name, kind: 'cpu', level: k, cast: CAST[k], color: CAST[k].color }));
    const list = [{ name: 'YOU', kind: 'human', level: 'human', cast: CAST.you, color: CAST.you.color }];
    const start = ORDER.indexOf(level);
    for (let k = 0; k < opponents; k++) {
      const key = ORDER[(start + k) % 3];
      list.push({ name: CAST[key].name, kind: 'cpu', level: key, cast: CAST[key], color: CAST[key].color });
    }
    return list;
  }

  function clearMatchObjects() {
    foxes.forEach(f => scene.remove(f));
    signs.forEach(s => { scene.remove(s); s.material.dispose(); });
    if (plotGroup) { scene.remove(plotGroup); plotGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    foxes = []; signs = []; plotGroup = null;
  }

  let orient = null;
  function isPortrait() { const { w, h } = size(); return h > w * 1.05; }
  function buildPlots(players) {
    orient = isPortrait() ? 'portrait' : 'landscape';
    plots = PLOT_LAYOUT[orient][players.length].map(([x, z]) => ({ x, z }));
    plotGroup = new THREE.Group(); scene.add(plotGroup);
    const parts = [];
    const box = (w, h, d, x, y, z, color) => parts.push({ geo: new THREE.BoxGeometry(w, h, d).translate(x, y, z), color });
    plots.forEach((o, i) => {
      box(7.4, 0.14, 9.6, o.x, 0.07, o.z, 0x7b5236);
      box(7.4, 0.06, 0.5, o.x, 0.15, o.z + 4.55, new THREE.Color(players[i].color).getHex());
      for (let k = 0; k < 4; k++) box(6.6, 0.03, 0.22, o.x, 0.15, o.z + (k - 1.5) * R.GAP + R.GAP / 2 - 0.0, 0x6a4430);
      /* fence: back + two sides, front is open (the gate) */
      const wood = 0xc98c4f, wx = 3.95, wz0 = o.z - 5.0, wz1 = o.z + 4.4;
      for (let k = 0; k <= 4; k++) box(0.22, 1.1, 0.22, o.x - wx + (k * 2 * wx) / 4, 0.55, wz0, wood);
      for (let k = 1; k <= 4; k++) { box(0.22, 1.1, 0.22, o.x - wx, 0.55, wz0 + (k * (wz1 - wz0)) / 4, wood); box(0.22, 1.1, 0.22, o.x + wx, 0.55, wz0 + (k * (wz1 - wz0)) / 4, wood); }
      box(2 * wx, 0.14, 0.12, o.x, 0.75, wz0, 0xb67a40); box(2 * wx, 0.14, 0.12, o.x, 0.4, wz0, 0xb67a40);
      for (const sx of [-1, 1]) { box(0.12, 0.14, wz1 - wz0, o.x + sx * wx, 0.75, (wz0 + wz1) / 2, 0xb67a40); box(0.12, 0.14, wz1 - wz0, o.x + sx * wx, 0.4, (wz0 + wz1) / 2, 0xb67a40); }
      box(0.18, 1.6, 0.18, o.x - 1.3, 0.8, wz0 - 0.35, wood); box(0.18, 1.6, 0.18, o.x + 1.3, 0.8, wz0 - 0.35, wood);
    });
    const mesh = new THREE.Mesh(M.merge(parts), M.toon(0xffffff, { vertexColors: true }));
    plotGroup.add(M.withInk(mesh, 0.03));
    players.forEach((p, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
      s.position.set(plots[i].x, 1.9, plots[i].z - 5.35); s.scale.set(3.6, 0.9, 1);
      s.userData.text = ''; scene.add(s); signs.push(s);
    });
  }

  function updateSigns() {
    match.players.forEach((p, i) => {
      const txt = `${p.name}  ${p.score}`;
      if (signs[i] && signs[i].userData.text !== txt) {
        signs[i].userData.text = txt;
        signs[i].material.map = M.textSprite(txt, { bg: '#000000', color: p.color, size: 54, w: 384, h: 96 });
        signs[i].material.needsUpdate = true;
      }
    });
  }

  function newMatch() {
    clearMatchObjects();
    const players = buildPlayers();
    turn = 0;
    match = R.createMatch({ players, seconds: SECONDS[mode], seed: Math.floor(Math.random() * 1e9), active: mode === 'local' ? [0] : undefined });
    match.players.forEach((p, i) => { p.color = players[i].color; });
    buildPlots(players);
    players.forEach((pl, i) => {
      const f = M.makeFox({ ...pl.cast }, kit);
      f.scale.setScalar(0.78);
      scene.add(f); foxes.push(f);
    });
    flyers = []; drops = []; leaving = []; result = null; overTimer = 0; tickSec = -1;
    phase = 'play'; paused = false; caption = null;
    cursor = 4; hint = null; lastInput = performance.now();
    if (mode === 'demo') caption = DEMO_TIPS.intro;
    else if (mode === 'local') say('P1: your season. Plant, water, pick!', 3000);
    else tip('start');
    updateSigns(); fit(true); dirty = true;
  }

  /* ---------- camera fitting ---------- */
  function fitPoints() {
    const pts = [];
    const idx = mode === 'local' && match ? [turn] : plots.map((_, i) => i);
    for (const i of idx) {
      const o = plots[i]; if (!o) continue;
      for (const [x, z] of [[-4.1, -5.6], [4.1, -5.6], [-4.1, 6.3], [4.1, 6.3]]) pts.push(new THREE.Vector3(o.x + x, 0, o.z + z));
      pts.push(new THREE.Vector3(o.x - 3.6, 2.6, o.z - 5.2), new THREE.Vector3(o.x + 3.6, 2.6, o.z - 5.2), new THREE.Vector3(o.x, 2.4, o.z + 5.8));
    }
    if (!pts.length) pts.push(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 0, 5));
    return pts;
  }
  function lensFov(w, h) { return world ? (world.camera.fov || 50) : (h > w ? 56 : 42); }
  function fit(snap) {
    const { w, h } = size();
    const aspect = w / h, portrait = h > w;
    fitCam.fov = lensFov(w, h); fitCam.aspect = aspect; fitCam.updateProjectionMatrix();
    const pad = 10;
    let fx0 = -1 + (2 * (safe.left + pad)) / w, fx1 = 1 - (2 * (safe.right + pad)) / w;
    let fy0 = -1 + (2 * (safe.bottom + pad)) / h, fy1 = 1 - (2 * (safe.top + pad)) / h;
    if (fx1 - fx0 < 0.3) { fx0 = -0.9; fx1 = 0.9; }
    if (fy1 - fy0 < 0.3) { fy0 = -0.9; fy1 = 0.9; }
    const pitch = portrait ? 1.08 : 0.98;
    const dir = new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch));
    const pts = fitPoints();
    const target = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    target.y = 0.5;
    let d = 30;
    const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    for (let it = 0; it < 10; it++) {
      fitCam.position.copy(target).addScaledVector(dir, d); fitCam.lookAt(target); fitCam.updateMatrixWorld();
      let bx0 = 9, bx1 = -9, by0 = 9, by1 = -9;
      for (const p of pts) { v.copy(p).project(fitCam); bx0 = Math.min(bx0, v.x); bx1 = Math.max(bx1, v.x); by0 = Math.min(by0, v.y); by1 = Math.max(by1, v.y); }
      const s = Math.max((bx1 - bx0) / (fx1 - fx0), (by1 - by0) / (fy1 - fy0));
      const cx = (bx0 + bx1) / 2 - (fx0 + fx1) / 2, cy = (by0 + by1) / 2 - (fy0 + fy1) / 2;
      const halfH = Math.tan((fitCam.fov * Math.PI) / 360) * d, halfW = halfH * aspect;
      right.setFromMatrixColumn(fitCam.matrixWorld, 0); up.setFromMatrixColumn(fitCam.matrixWorld, 1);
      target.addScaledVector(right, cx * halfW).addScaledVector(up, cy * halfH);
      d = THREE.MathUtils.clamp(d * (1 + (s - 1) * 0.85), 6, 220);
    }
    fitCam.position.copy(target).addScaledVector(dir, d);
    camGoal.pos.copy(fitCam.position); camGoal.target.copy(target);
    if (snap) { camera.position.copy(camGoal.pos); camTarget.copy(camGoal.target); }
  }
  function aimCamera(dt) {
    const { w, h } = size();
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(camGoal.pos, k); camTarget.lerp(camGoal.target, k);
    camera.fov = lensFov(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.lookAt(camTarget); camera.updateMatrixWorld();
    if (world) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      const q = new THREE.Quaternion(); scene.getWorldQuaternion(q);
      wcam.quaternion.copy(q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2), hit = new THREE.Vector3();
  function screenOf(x, y, z) {
    const { w, h } = size();
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, ok: v.z < 1 };
  }
  function tileWorld(pi, i) { const p = R.tilePos(i), o = plots[pi]; return { x: o.x + p.x, z: o.z + p.z }; }

  function tapAt(px, py) {
    audio.unlock();
    lastInput = performance.now(); hint = null; dirty = true;
    if (mode === 'demo') { start('cpu'); return; }
    const hi = humanIdx(); if (hi < 0 || paused) return;
    /* crows first (they sit above the crop) */
    let best = -1, bd = 1e9;
    match.players[hi].tiles.forEach((t, i) => {
      if (!t.crow) return;
      const c = crowPos(hi, i, t.crow); const s = screenOf(c.x, c.y, c.z);
      const d = Math.hypot(s.x - px, s.y - py); if (d < 60 && d < bd) { bd = d; best = i; }
    });
    if (best < 0) {
      const { w, h } = size();
      ndc.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
      camera.updateMatrixWorld();
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(ground, hit)) return;
      match.players[hi].tiles.forEach((t, i) => {
        const p = tileWorld(hi, i); const d = Math.hypot(p.x - hit.x, p.z - hit.z);
        if (d < 1.3 && d < bd) { bd = d; best = i; }
      });
    }
    if (best < 0) { audio.play('tap'); return; }
    cursor = best;
    queueTile(hi, best);
  }
  function queueTile(hi, i) {
    const r = R.toggleQueue(match, hi, i, seed);
    if (r === 'queue') audio.play('queue');
    else if (r === 'unqueue') audio.play('unqueue');
    else if (r === 'full') say('Your fox has 6 jobs. Wait a moment.', 1800);
    const t = match.players[hi].tiles[i];
    if (r === 'queue' && t.stage === 'empty') audio.play('seed', seed);
    dirty = true;
  }
  function onPointerDown(e) {
    if (world) {
      if (e.target !== dom) return;
      e.preventDefault(); e.stopImmediatePropagation();
    }
    const r = dom.getBoundingClientRect();
    tapAt(e.clientX - r.left, e.clientY - r.top);
  }
  function onPointerMove(e) {
    if (e.pointerType !== 'mouse' || !match) return;
    const hi = humanIdx(); if (hi < 0) return;
    const r = dom.getBoundingClientRect(), { w, h } = size();
    ndc.set(((e.clientX - r.left) / w) * 2 - 1, -((e.clientY - r.top) / h) * 2 + 1);
    camera.updateMatrixWorld(); ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(ground, hit)) return;
    let best = -1, bd = 1.3;
    match.players[hi].tiles.forEach((_, i) => { const p = tileWorld(hi, i); const d = Math.hypot(p.x - hit.x, p.z - hit.z); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { cursor = best; showCursor = true; } else showCursor = false;
  }
  function key(e) {
    if (!e || !e.key) return;
    const k = e.key.toLowerCase();
    audio.unlock();
    if (k === 'escape') { menuReq++; dirty = true; return; }
    if (mode === 'demo' && (k === ' ' || k === 'enter')) { start('cpu'); return; }
    if (phase === 'turn' && (k === ' ' || k === 'enter')) { api.ready(); return; }
    if (phase === 'over' && (k === 'enter')) { api.restart(); return; }
    const hi = humanIdx(); if (hi < 0 || paused) return;
    lastInput = performance.now(); hint = null;
    const c = cursor % R.COLS, r = Math.floor(cursor / R.COLS);
    let handled = true;
    if (k === 'arrowleft' || k === 'a') cursor = r * R.COLS + Math.max(0, c - 1);
    else if (k === 'arrowright' || k === 'd') cursor = r * R.COLS + Math.min(R.COLS - 1, c + 1);
    else if (k === 'arrowup' || k === 'w') cursor = Math.max(0, r - 1) * R.COLS + c;
    else if (k === 'arrowdown' || k === 's') cursor = Math.min(R.ROWS - 1, r + 1) * R.COLS + c;
    else if (k === ' ' || k === 'enter') queueTile(hi, cursor);
    else if (k === '1') api.setSeed('corn');
    else if (k === '2') api.setSeed('carrot');
    else if (k === '3') api.setSeed('lettuce');
    else handled = false;
    if (handled) { showCursor = true; dirty = true; if (e.preventDefault) e.preventDefault(); }
  }

  /* ---------- events from the rules ---------- */
  function popAt(x, y, z, text, color = '#ffd23a', scale = 1) {
    const p = pops.find(q => !q.s.visible) || pops[0];
    p.s.material.map = M.textSprite(text, { color, size: 70, w: 384, h: 110 }); p.s.material.needsUpdate = true;
    p.s.position.set(x, y, z); p.s.scale.set(3.2 * scale, 0.92 * scale, 1); p.s.visible = true; p.t = 0; p.life = 1.2; p.y0 = y;
  }
  function handle(ev) {
    const hi = humanIdx();
    for (const e of ev) {
      const mine = e.p === hi || (mode === 'demo' && e.p === 0);
      const pos = e.tile != null && e.p != null ? tileWorld(e.p, e.tile) : null;
      switch (e.type) {
        case 'plant': if (mine) audio.play('plant'); if (mode === 'demo' && !seen.has('d-plant')) { seen.add('d-plant'); caption = DEMO_TIPS.plant; } break;
        case 'water': {
          if (mine) audio.play('water');
          for (let k = 0; k < 9; k++) drops.push({ x: pos.x + (Math.random() - 0.5) * 0.9, z: pos.z + (Math.random() - 0.5) * 0.7, y: 1.6 + Math.random() * 0.5, v: 0 });
          break;
        }
        case 'thirsty': if (e.p === hi) { audio.play('thirsty'); tip('thirsty'); } if (mode === 'demo' && !seen.has('d-th')) { seen.add('d-th'); caption = DEMO_TIPS.thirsty; } break;
        case 'ripe': if (mine) audio.play('ripe', e.crop); if (e.p === hi) tip('ripe'); if (mode === 'demo' && !seen.has('d-ripe')) { seen.add('d-ripe'); caption = DEMO_TIPS.ripe; } break;
        case 'pick': {
          audio.play('pick', e.crop, e.golden);
          const f = foxes[e.p], p = match.players[e.p];
          flyers.push({ crop: e.crop, golden: e.golden, x0: pos.x, z0: pos.z, p: e.p, t: 0, sx: plots[e.p].x + p.x, sz: plots[e.p].z + p.z });
          popAt(pos.x, 2.8, pos.z, `+${e.pts}`, e.golden ? '#ffd23a' : '#ffffff', e.golden ? 1.25 : 1);
          if (f) f.userData.hop = 0.35;
          if (mode === 'demo' && !seen.has('d-corn') && seen.has('d-ripe')) { seen.add('d-corn'); caption = DEMO_TIPS.corn; }
          updateSigns(); break;
        }
        case 'salad':
          audio.play('salad'); popAt(pos.x, 3.8, pos.z, `SALAD +${e.pts}`, '#ffd23a', 1.3);
          if (e.p === hi) tip('salad'); if (mode === 'demo' && !seen.has('d-salad')) { seen.add('d-salad'); caption = DEMO_TIPS.salad; }
          updateSigns(); break;
        case 'wilt': if (e.p === hi) { audio.play('wilt'); tip('wilt'); popAt(pos.x, 2.4, pos.z, 'WILTED', '#ff8a6a', 0.9); } break;
        case 'clear': if (mine) audio.play('clear'); break;
        case 'crow': if (e.p === hi || mode === 'demo') audio.play('crow'); if (e.p === hi) tip('crow'); if (mode === 'demo' && !seen.has('d-crow')) { seen.add('d-crow'); caption = DEMO_TIPS.crow; } break;
        case 'shoo': audio.play('shoo'); leaving.push({ x: pos.x, z: pos.z, y: cropTop(match.players[e.p].tiles[e.tile]) + 0.1, t: 0 }); break;
        case 'eaten': audio.play('eaten'); leaving.push({ x: pos.x, z: pos.z, y: 0.6, t: 0 }); if (e.p === hi || mode === 'demo') popAt(pos.x, 2.4, pos.z, 'CROW ATE IT', '#ff8a6a', 0.9); break;
        case 'over': onOver(); break;
        default: break;
      }
    }
    if (ev.length) dirty = true;
  }

  function onOver() {
    const rank = R.ranking(match);
    if (mode === 'demo') { overTimer = 4; caption = DEMO_TIPS.tap; return; }
    if (mode === 'local' && turn < localPlayers - 1) {
      phase = 'turn'; audio.play('turn');
      match.players[turn].queue = []; dirty = true; return;
    }
    phase = 'over';
    const rows = rank.map((pi, k) => ({ name: match.players[pi].name, score: match.players[pi].score, color: match.players[pi].color, place: k + 1, salads: match.players[pi].salads }));
    if (mode === 'cpu') {
      const me = match.players[0];
      const won = rank[0] === 0 || match.players[rank[0]].score === me.score;
      const place = rank.indexOf(0) + 1;
      const best = store.get('best', 0) || 0;
      const newBest = me.score > best;
      if (newBest) store.set('best', me.score);
      const gold = won ? 10 + Math.round(me.score / 4) : Math.round(me.score / 10);
      const xp = me.score + (won ? 20 : 0);
      store.addGold(gold); store.set('xp', (store.get('xp', 0) || 0) + xp);
      const stars = R.starsFor(me.score);
      const sk = 'stars.' + level; if (stars > (store.get(sk, 0) || 0)) store.set(sk, stars);
      result = { title: won ? 'YOU WIN THE HARVEST' : `${match.players[rank[0]].name} WINS`, won, place, score: me.score, best: Math.max(best, me.score), newBest, gold, xp, stars, rows, salads: me.salads };
      audio.play(won ? 'win' : 'lose');
    } else {
      const top = match.players[rank[0]];
      const tie = rank.length > 1 && match.players[rank[1]].score === top.score;
      result = { title: tie ? 'A TIE HARVEST' : `${top.name} WINS`, won: true, place: 1, score: top.score, best: store.get('best', 0) || 0, newBest: false, gold: 0, xp: 0, stars: R.starsFor(top.score), rows, salads: top.salads };
      audio.play('win');
    }
    dirty = true;
  }

  /* ---------- drawing ---------- */
  function cropTop(t) {
    if (!t || !t.crop) return 0.4;
    const g = t.stage === 'ripe' ? 1 : t.g;
    if (t.crop === 'corn') return 0.5 + 1.9 * Math.max(0.2, g);
    if (t.crop === 'carrot') return 0.4 + 0.6 * g;
    return 0.35 + 0.5 * g;
  }
  function crowPos(pi, i, c) {
    const p = tileWorld(pi, i), t = match.players[pi].tiles[i];
    const top = cropTop(t) + 0.05;
    if (c.state === 'fly') {
      const k = Math.min(1, c.t / R.CROW_FLY), e = 1 - (1 - k) * (1 - k);
      return { x: p.x + 7 * (1 - e), y: top + 7 * (1 - e) + Math.sin(k * Math.PI) * 1.2, z: p.z - 6 * (1 - e), k };
    }
    return { x: p.x, y: top, z: p.z, k: 1 };
  }

  const COL = {
    bedEmpty: 0x8a5a3b, bedWet: 0x55341f, bedDry: 0xa87650, bedDead: 0x7a5a40,
    sprout: 0x7cd14f, leaf: 0x4fae3a, lettuce: 0xb8e86a, lettuceGold: 0xffe066, frond: 0x3fa34d,
    carrot: 0xff8a1f, gold: 0xffc400, stalk: 0x6fb24a, cornLeaf: 0x5fa83e, cob: 0xffd23a, husk: 0x9bd05a, tassel: 0xe3c27a,
    dead: 0x8b6b3d, dead2: 0x6e5532, drop: 0x4fb3ff, star: 0xffd23a, starWarn: 0xff5a3a,
  };

  function drawTile(pi, i, t, tm) {
    const { x, z } = tileWorld(pi, i);
    const sway = Math.sin(tm * 1.7 + i * 1.3 + pi) * 0.07;
    const bedC = t.stage === 'empty' ? COL.bedEmpty : t.stage === 'withered' ? COL.bedDead : (t.stage === 'growing' && t.thirsty) ? COL.bedDry : COL.bedWet;
    B.bed.add(x, 0.14, z, { color: bedC });
    const vs = R.visualStage(t);
    if (vs === 'empty') return;
    const ripe = vs === 'ripe', dead = vs === 'withered';
    const pulse = ripe ? 1 + Math.sin(tm * 6 + i) * 0.035 : 1;
    if (vs === 'seed') {
      B.seed.add(x - 0.14, 0.32, z + 0.05, { color: 0xe8c98a, ry: 0.4 });
      B.seed.add(x + 0.12, 0.32, z - 0.08, { color: 0xe8c98a, ry: -0.6 });
    } else if (vs === 'sprout') {
      const k = 0.45 + ((t.g - 0.12) / 0.38) * 0.8;
      if (t.crop === 'carrot') for (let a = 0; a < 3; a++) B.frond.add(x, 0.24, z, { rz: (a - 1) * 0.35 + sway, rx: (a - 1) * 0.1, s: k * 0.8, color: COL.sprout });
      else for (let a = 0; a < 2; a++) B.leaf.add(x, 0.26, z, { ry: a * Math.PI + 0.4, rx: -0.55 + sway, s: k, color: COL.sprout });
    } else if (t.crop === 'lettuce') {
      const k = ripe || dead ? 1 : 0.55 + ((t.g - 0.5) / 0.5) * 0.4;
      const leafC = dead ? COL.dead : COL.leaf, headC = dead ? COL.dead2 : t.golden && ripe ? COL.lettuceGold : COL.lettuce;
      const sy = dead ? 0.55 : 1;
      B.lettuce.add(x, 0.3 + 0.28 * k * sy, z, { s: k * pulse, sy: k * pulse * sy * 0.92, color: headC });
      const n = ripe || dead ? 6 : 4;
      for (let a = 0; a < n; a++) B.lettuceLeaf.add(x, 0.3 + 0.12 * k, z, { ry: (a / n) * Math.PI * 2 + 0.3, rx: (dead ? -0.9 : -0.25) + sway * 0.6, s: k * pulse * 1.05, color: leafC });
    } else if (t.crop === 'carrot') {
      const k = ripe || dead ? 1 : 0.7 + ((t.g - 0.5) / 0.5) * 0.35;
      const n = ripe || dead ? 6 : 5;
      for (let a = 0; a < n; a++) B.frond.add(x, 0.3, z, { ry: (a / n) * Math.PI * 2, rx: dead ? 1.2 : 0.38, rz: sway, s: k * pulse * 1.1, color: dead ? COL.dead : COL.frond });
      if (ripe || dead || t.g > 0.8) B.carrotTop.add(x, 0.18, z, { s: (ripe ? 1 : 0.75) * pulse, color: dead ? COL.dead2 : t.golden && ripe ? COL.gold : COL.carrot });
    } else if (t.crop === 'corn') {
      const k = ripe || dead ? 1 : (t.g - 0.5) / 0.5;
      const hgt = 0.7 + 1.5 * k, bend = dead ? 0.55 : sway * 0.6;
      B.stalk.add(x, 0.2, z, { sx: 1.2, sz: 1.2, sy: hgt, rz: bend, color: dead ? COL.dead : COL.stalk });
      const nl = ripe || dead ? 4 : 3;
      for (let a = 0; a < nl; a++) {
        const hy = 0.2 + hgt * (0.25 + a * 0.18);
        B.cornLeaf.add(x - Math.sin(bend) * (hy - 0.2), hy, z, { ry: a * 2.3 + 0.5, rx: dead ? 1.1 : -0.35, s: 0.7 + k * 0.4, color: dead ? COL.dead : COL.cornLeaf });
      }
      if (ripe) {
        for (let c = 0; c < 2; c++) {
          const cy = 0.2 + hgt * (0.5 + c * 0.17), side = c ? -1 : 1;
          B.husk.add(x + side * 0.15, cy, z + 0.05, { rz: -side * 0.45, s: pulse, color: COL.husk });
          B.cob.add(x + side * 0.2, cy + 0.08, z + 0.1, { rz: -side * 0.45, s: pulse, color: t.golden ? COL.gold : COL.cob });
        }
        B.tassel.add(x - Math.sin(bend) * hgt, 0.2 + hgt, z, { color: COL.tassel, rz: bend });
      } else if (dead) B.tassel.add(x - Math.sin(bend) * hgt * 0.9, 0.2 + hgt * 0.9, z, { color: COL.dead2, rz: bend + 0.6 });
    }
    if (t.thirsty && t.stage === 'growing') {
      B.drop.add(x, cropTop(t) + 0.75 + Math.sin(tm * 4 + i) * 0.12, z, { s: 1.15, color: COL.drop });
    }
    if (ripe) {
      const warn = t.ripeT > R.RIPE_WINDOW - 3 && Math.sin(tm * 14) > 0;
      B.star.add(x, cropTop(t) + 0.8 + Math.sin(tm * 3 + i) * 0.1, z, { ry: tm * 3 + i, s: t.golden ? 1.6 : 1.1, color: warn ? COL.starWarn : COL.star });
    }
  }

  function drawFrame(dt) {
    time += dt;
    batchList.forEach(b => b.begin());
    if (match) {
      match.players.forEach((p, pi) => p.tiles.forEach((t, i) => drawTile(pi, i, t, time)));
      /* queue markers + cursor for the human playing now */
      const hi = humanIdx();
      if (hi >= 0) {
        const p = match.players[hi];
        p.queue.forEach((q, k) => { const w = tileWorld(hi, q.tile); B.ring.add(w.x, 0.24, w.z, { s: k === 0 ? 0.95 : 0.8, color: 0xffd23a }); });
        if (p.busy) { const w = tileWorld(hi, p.busy.tile); B.ring.add(w.x, 0.24, w.z, { s: 0.95 + Math.sin(time * 12) * 0.04, color: 0xffd23a }); }
        if (showCursor) { const w = tileWorld(hi, cursor); B.ring.add(w.x, 0.26, w.z, { s: 1.08, color: 0xffffff }); }
        if (hint) { const w = tileWorld(hi, hint.tile); B.ring.add(w.x, 0.27, w.z, { s: 1 + Math.sin(time * 6) * 0.08, color: 0xec3013 }); }
      }
      /* flying harvest */
      flyers = flyers.filter(f => {
        f.t += dt * 2.2; if (f.t >= 1) return false;
        const p = match.players[f.p];
        const tx = plots[f.p].x + p.x, tz = plots[f.p].z + p.z;
        const x = f.x0 + (tx - f.x0) * f.t, z = f.z0 + (tz - f.z0) * f.t, y = 0.6 + Math.sin(f.t * Math.PI) * 2.4 + f.t * 1.2;
        const s = 1.2 - f.t * 0.6, spin = f.t * 9;
        if (f.crop === 'corn') B.cob.add(x, y, z, { rz: spin, s, color: f.golden ? COL.gold : COL.cob });
        else if (f.crop === 'carrot') { B.carrot.add(x, y, z, { rz: spin, s, color: f.golden ? COL.gold : COL.carrot }); B.frond.add(x, y, z, { rz: spin, s: s * 0.8, color: COL.frond }); }
        else B.lettuce.add(x, y, z, { s: s * 0.9, color: f.golden ? COL.lettuceGold : COL.lettuce });
        return true;
      });
      drops = drops.filter(d => { d.v += 14 * dt; d.y -= d.v * dt; if (d.y < 0.3) return false; B.drop.add(d.x, d.y, d.z, { s: 0.45, color: COL.drop }); return true; });
    }
    batchList.forEach(b => b.end());
  }

  function drawCrows(dt) {
    let n = 0;
    const put = (x, y, z, flap, peck, ry) => {
      if (n >= crows.length) return;
      const c = crows[n++]; c.visible = true; c.position.set(x, y, z); c.rotation.y = ry;
      c.userData.wings[0].rotation.z = flap; c.userData.wings[1].rotation.z = -flap;
      c.userData.head.position.y = 0.58 - peck; c.userData.head.position.z = 0.32 + peck * 0.4;
    };
    if (match) match.players.forEach((p, pi) => p.tiles.forEach((t, i) => {
      if (!t.crow) return;
      const c = crowPos(pi, i, t.crow);
      if (t.crow.state === 'fly') put(c.x, c.y, c.z, Math.sin(time * 22) * 0.9, 0, -2.3);
      else put(c.x, c.y, c.z, Math.sin(time * 3) * 0.1, Math.max(0, Math.sin(time * 14)) * 0.18, 0.6 + Math.sin(time * 1.3) * 0.4);
    }));
    leaving = leaving.filter(l => {
      l.t += dt; if (l.t > 1.2) return false;
      put(l.x - l.t * 6, l.y + l.t * l.t * 7, l.z - l.t * 5, Math.sin(time * 26) * 1.0, 0, -0.9);
      return true;
    });
    for (let k = n; k < crows.length; k++) crows[k].visible = false;
  }

  function drawFoxes(dt) {
    if (!match) return;
    match.players.forEach((p, i) => {
      const f = foxes[i]; if (!f) return;
      const o = plots[i];
      f.userData.hop = Math.max(0, (f.userData.hop || 0) - dt);
      const hop = f.userData.hop > 0 ? Math.sin((f.userData.hop / 0.35) * Math.PI) * 0.35 : 0;
      f.position.set(o.x + p.x, hop, o.z + p.z);
      let dr = p.face - f.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      f.rotation.y += dr * Math.min(1, dt * 12);
      let act = null, actT = 0;
      if (p.busy) {
        if (!busyStart.has(p.busy)) busyStart.set(p.busy, p.busy.t);
        const T0 = busyStart.get(p.busy) || 1; act = p.busy.act; actT = 1 - p.busy.t / T0;
      }
      const lv = R.LEVELS[p.level] || R.LEVELS.human;
      M.poseFox(f, { t: time + i, walking: p.walking, speed: lv.speed, act, actT, kit, dt });
    });
  }

  function drawPops(dt) {
    pops.forEach(p => {
      if (!p.s.visible) return;
      p.t += dt; const k = p.t / p.life;
      if (k >= 1) { p.s.visible = false; return; }
      p.s.position.y = p.y0 + k * 1.4; p.s.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    });
  }

  /* ---------- HUD ---------- */
  function computeHint() {
    const hi = humanIdx();
    if (hi < 0 || paused || phase !== 'play' || match.over) { hint = null; return; }
    const p = match.players[hi];
    if (performance.now() - lastInput < 3000 || p.queue.length || p.busy) { hint = null; return; }
    const task = R.chooseTask(match, hi, 0);
    if (!task) { hint = null; return; }
    const w = tileWorld(hi, task.tile), s = screenOf(w.x, 0.6, w.z);
    hint = { tile: task.tile, x: Math.round(s.x), y: Math.round(s.y), act: task.act, seed: task.seed };
  }
  function hud() {
    const hi = humanIdx();
    const me = hi >= 0 ? match.players[hi] : null;
    const now = performance.now();
    if (msg && now > msg.until) msg = null;
    return {
      key: GAME.key, name: GAME.name, world: !!world, phase, mode, level, opponents, localPlayers, paused,
      time: match ? Math.ceil(match.time) : 0, seconds: match ? match.seconds : 0,
      seed,
      seeds: R.SEEDS.map((k, n) => ({ key: k, name: R.CROPS[k].name, pts: R.CROPS[k].pts, grow: R.CROPS[k].grow, selected: k === seed, num: n + 1 })),
      players: match ? match.players.map((p, i) => ({ name: p.name, score: p.score, color: p.color, you: i === hi, active: match.active.includes(i), salads: p.salads })) : [],
      you: hi, bowl: me ? { ...me.bowl } : null, queue: me ? me.queue.length : 0,
      msg: msg ? { text: msg.text, id: msg.id } : null,
      caption: mode === 'demo' ? caption : null,
      hint: hint ? { x: hint.x, y: hint.y, act: hint.act } : null,
      turn: mode === 'local' ? { index: turn, next: phase === 'turn' ? turn + 1 : turn, of: localPlayers, name: 'P' + ((phase === 'turn' ? turn + 1 : turn) + 1), last: match ? match.players[turn].score : 0 } : null,
      result, sound: audio.sound, music: audio.music, menuReq,
      best: store.get('best', 0) || 0,
    };
  }
  function emit() { try { onState(hud()); } catch (e) { console.error(e); } dirty = false; }

  /* ---------- loop ---------- */
  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000) * (opts.timeScale || 1); last = now;
    if (match && phase === 'play' && !paused && !match.over) {
      handle(R.step(match, dt));
      const s = Math.ceil(match.time);
      if (s <= 5 && s !== tickSec && s > 0) { tickSec = s; if (mode !== 'demo') audio.play('tick'); }
      /* HOPE plays by feel: soft cane taps as she walks */
      canTimer -= dt;
      if (canTimer <= 0) { canTimer = 0.42; match.players.forEach(p => { if (p.level === 'hope' && p.walking && mode !== 'demo') audio.play('cane'); }); }
    }
    if (overTimer > 0) { overTimer -= dt; if (overTimer <= 0 && mode === 'demo') newMatch(); }
    drawFoxes(dt); drawFrame(dt); drawCrows(dt); drawPops(dt);
    aimCamera(dt);
    hudTimer += dt;
    if (hudTimer > 0.1 || dirty) { hudTimer = 0; computeHint(); emit(); }
    if (!world) renderer.render(scene, camera);
  }

  /* ---------- resize / listeners ---------- */
  let ro = null;
  function relayoutIfNeeded() {
    if (!match || !orient) return;
    const o = isPortrait() ? 'portrait' : 'landscape';
    if (o === orient) return;
    signs.forEach(s => { scene.remove(s); s.material.dispose(); });
    if (plotGroup) { scene.remove(plotGroup); plotGroup.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
    signs = []; plotGroup = null;
    buildPlots(match.players);
    updateSigns(); fit(true);
  }
  function resize() {
    if (!world) { const { w, h } = size(); renderer.setSize(w, h); }
    relayoutIfNeeded();
    fit(false); dirty = true;
  }
  if (!world) {
    ro = new ResizeObserver(resize); ro.observe(container);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    window.addEventListener('keydown', key);
  } else {
    window.addEventListener('pointerdown', onPointerDown, true);
    dom.addEventListener('pointermove', onPointerMove);
  }
  let lastWH = '';
  const sizePoll = world ? setInterval(() => { const { w, h } = size(); const k = w + 'x' + h; if (k !== lastWH) { lastWH = k; relayoutIfNeeded(); fit(false); } }, 250) : 0;

  /* ---------- API ---------- */
  function start(m) {
    if (m) mode = m;
    if (!['cpu', 'local', 'demo'].includes(mode)) mode = 'cpu';
    newMatch(); emit();
  }
  const api = {
    hud,
    setSafe(s = {}) { safe = { top: s.top || 0, bottom: s.bottom || 0, left: s.left || 0, right: s.right || 0 }; fit(false); },
    start,
    key,
    get camera() { return world ? wcam : camera; },
    snapCam() { fit(true); aimCamera(1); },
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      if (sizePoll) clearInterval(sizePoll);
      if (world) { window.removeEventListener('pointerdown', onPointerDown, true); dom.removeEventListener('pointermove', onPointerMove); world.parent.remove(scene); }
      else {
        dom.removeEventListener('pointerdown', onPointerDown); dom.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('keydown', key);
        renderer.dispose(); if (dom.parentNode) dom.parentNode.removeChild(dom);
      }
      audio.close();
    },
    /* page actions */
    setSeed(k) { if (!R.CROPS[k]) return; seed = k; audio.unlock(); audio.play('seed', k); lastInput = performance.now(); dirty = true; emit(); },
    tap(x, y) { tapAt(x, y); },
    restart() { start(mode); },
    playAgain() { start(mode === 'demo' ? 'cpu' : mode); },
    setLevel(l) { if (!R.LEVELS[l] || l === 'human') return; level = l; store.set('level', l); if (mode === 'cpu') start('cpu'); else emit(); },
    setOpponents(n) { opponents = Math.max(1, Math.min(3, n | 0)); if (mode === 'cpu') start('cpu'); else emit(); },
    setLocalPlayers(n) { localPlayers = Math.max(2, Math.min(4, n | 0)); if (mode === 'local') start('local'); else emit(); },
    pause(on) { paused = !!on; last = performance.now(); emit(); },
    ready() {
      if (phase !== 'turn') return;
      turn++; match.active = [turn]; match.time = match.seconds; match.over = false; match.crowTimer = 8;
      phase = 'play'; tickSec = -1; lastInput = performance.now(); audio.unlock(); audio.play('turn');
      say(`P${turn + 1}: your season!`, 2200); fit(false); emit();
    },
    back() { phase = 'left'; paused = true; emit(); },
    setSound(on) { audio.setSound(on); emit(); },
    setMusic(on) { audio.setMusic(on); if (on) audio.unlock(); emit(); },
    unlock() { audio.unlock(); },
    debug() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, match }; },
  };

  start(opts.mode || 'cpu');
  if (world) { const { w, h } = size(); lastWH = w + 'x' + h; }
  else resize();
  fit(true);
  frame();
  return api;
}

export default createFarm;
