/* 8 GATES 3D: CAR WASH minigame module.
   Drag over a dirty car: SOAP the mud, RINSE the foam, DRY the drops. Wash as many cars as you can before the clock runs out.
   Standalone: builds its own renderer + lot. World mode (opts.world): builds only the wash bays into opts.world.parent. */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './carwash-rules.js';
import { createAudio } from './carwash-audio.js';

export const GAME = { key: 'carWash', name: 'CAR WASH', maxPlayers: 4 };

const INK = 0x1a1626;
const CAR_COLORS = [0xec3013, 0x3a86ff, 0xffd23a, 0x2ec4b6, 0xff7ab6, 0x8d5cf6, 0xf4f1ea, 0x5cc96b];
const MUD = 0x5a4330;
const CAR_SCALE = 1.25;
const BAY_GAP = 14;
const FOX_HOME = [-4.6, 2.2];
const PATH_IN = [[-3.6, -10], [-3.6, 0], [0, 0]];
const PATH_OUT = [[0, 0], [3.9, 0], [3.9, -10]];
const TOOL_COL = [0xfff0fa, 0x5ec8ff, 0xeaf6ff];

const CAST = {
  you:    { name: 'YOU',   torso: [0xe8762c, 0xfff1de, 0x2a9d8f], outfit: 'vest', mood: 'happy' },
  easy:   { name: 'PIP',   torso: [0xf2b630, 0xfff6dc, 0xec3013], outfit: 'tee', mood: 'happy' },
  medium: { name: 'HOPE',  torso: [0xd9692b, 0xfff1de, 0x3a6fd8], outfit: 'coat', mood: 'calm', legs: 0x2f5bd3, shades: true, cane: true },
  hard:   { name: 'NOBLE', torso: [0x7a3418, 0xf1e4d0, 0x22222a], outfit: 'coat', mood: 'smug', redEyes: true, chair: true },
  p2:     { name: 'P2',    torso: [0x9aa3ad, 0xffffff, 0xec3013], outfit: 'tee', mood: 'happy' },
  p3:     { name: 'P3',    torso: [0xe8762c, 0xfff1de, 0xff7ab6], outfit: 'dress', mood: 'happy' },
  p4:     { name: 'P4',    torso: [0xc9a27a, 0xfff6e8, 0x5cc96b], outfit: 'coat', mood: 'happy' }
};

/* ---------- shared toon kit ---------- */
let GRAD = null;
function gradMap() {
  if (GRAD) return GRAD;
  GRAD = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true;
  return GRAD;
}
const MATS = new Map();
function toon(c) { let m = MATS.get(c); if (!m) { m = new THREE.MeshToonMaterial({ color: c, gradientMap: gradMap() }); MATS.set(c, m); } return m; }
let OUTLINE = null;
function mesh(geo, mat, o = 0.035) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? toon(mat) : mat);
  if (o) {
    if (!OUTLINE) OUTLINE = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    if (!geo.boundingBox) geo.computeBoundingBox();
    const s = geo.boundingBox.getSize(new THREE.Vector3());
    const sh = new THREE.Mesh(geo, OUTLINE);
    sh.scale.set(1 + 2 * o / Math.max(s.x, 0.05), 1 + 2 * o / Math.max(s.y, 0.05), 1 + 2 * o / Math.max(s.z, 0.05));
    sh.raycast = () => {};
    m.add(sh);
  }
  return m;
}
function at(o, x, y, z, parent) { o.position.set(x, y, z); if (parent) parent.add(o); return o; }

let G = null;
function geos() {
  if (G) return G;
  G = {};
  G.body = new THREE.BoxGeometry(4.4, 0.85, 2.0);
  G.cabin = new THREE.BoxGeometry(2.2, 0.8, 1.7);
  G.winSide = new THREE.BoxGeometry(0.95, 0.52, 0.02);
  G.winFront = new THREE.BoxGeometry(0.02, 0.6, 1.45);
  G.bumper = new THREE.BoxGeometry(0.28, 0.3, 2.06);
  G.lamp = new THREE.BoxGeometry(0.06, 0.18, 0.38);
  G.wheel = new THREE.CylinderGeometry(0.45, 0.45, 0.36, 16); G.wheel.rotateX(Math.PI / 2);
  G.hub = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12); G.hub.rotateX(Math.PI / 2);
  G.shadow = new THREE.CircleGeometry(1, 24); G.shadow.rotateX(-Math.PI / 2);
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = i / 10 * Math.PI * 2, r = 0.3 * [1, 0.8, 1.1, 0.9, 1.15, 0.78, 1.05, 0.92, 1.12, 0.85, 1][i];
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  G.mud = new THREE.ShapeGeometry(sh);
  G.foam = new THREE.IcosahedronGeometry(0.14, 1);
  G.drop = new THREE.SphereGeometry(0.065, 8, 6);
  G.particle = new THREE.IcosahedronGeometry(0.07, 0);
  G.spark = new THREE.OctahedronGeometry(0.12, 0);
  G.ring = new THREE.RingGeometry(0.46, 0.58, 28);
  G.limb = new THREE.CylinderGeometry(0.12, 0.1, 0.95, 8); G.limb.translate(0, -0.475, 0);
  G.arm = new THREE.CylinderGeometry(0.1, 0.085, 0.78, 8); G.arm.translate(0, -0.39, 0);
  G.foot = new THREE.BoxGeometry(0.22, 0.12, 0.34);
  G.paw = new THREE.SphereGeometry(0.12, 10, 8);
  G.torso = new THREE.CapsuleGeometry(0.42, 0.5, 4, 12);
  G.vest = new THREE.CylinderGeometry(0.45, 0.47, 0.62, 14);
  G.coat = new THREE.CylinderGeometry(0.46, 0.52, 0.95, 14);
  G.dress = new THREE.CylinderGeometry(0.42, 0.62, 0.85, 14);
  G.belly = new THREE.SphereGeometry(0.3, 12, 10);
  G.skull = new THREE.SphereGeometry(0.42, 16, 12);
  G.muzzle = new THREE.SphereGeometry(0.22, 12, 10);
  G.snout = new THREE.ConeGeometry(0.16, 0.36, 10); G.snout.rotateX(Math.PI / 2);
  G.nose = new THREE.SphereGeometry(0.06, 8, 6);
  G.ear = new THREE.ConeGeometry(0.15, 0.38, 8);
  G.earIn = new THREE.ConeGeometry(0.08, 0.24, 6);
  G.eye = new THREE.SphereGeometry(0.055, 8, 6);
  G.tail = new THREE.ConeGeometry(0.2, 0.9, 10); G.tail.translate(0, 0.45, 0);
  G.tailTip = new THREE.SphereGeometry(0.12, 8, 6);
  G.shades = new THREE.BoxGeometry(0.56, 0.13, 0.06);
  G.cane = new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6);
  G.wand = new THREE.CylinderGeometry(0.045, 0.055, 0.55, 8);
  return G;
}
function sharedMats() {
  return {
    mud: new THREE.MeshToonMaterial({ color: MUD, gradientMap: gradMap(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    foam: toon(0xfffafc), drop: toon(0x9fe8ff),
    glass: toon(0x1d3557),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ color: 0x5ff3ff }),
    red: new THREE.MeshBasicMaterial({ color: 0xff2a2a })
  };
}

/* ---------- foxes (adapter: world kit when given, else a placeholder with the same joints) ---------- */
function placeholderFox(spec, M) {
  const [fur, belly, cloth] = spec.torso;
  const root = new THREE.Group();
  const dark = new THREE.Color(fur).multiplyScalar(0.72).getHex();
  const legs = [-1, 1].map(sd => {
    const pv = at(new THREE.Group(), sd * 0.2, 1.0, 0, root);
    pv.add(mesh(G.limb, spec.legs ?? dark, 0.03));
    at(mesh(G.foot, 0x2a2230, 0), 0, -0.95, 0.08, pv);
    return pv;
  });
  const body = at(new THREE.Group(), 0, 1.0, 0, root);
  at(mesh(G.torso, fur, 0.035), 0, 0.55, 0, body);
  const og = spec.outfit === 'coat' ? G.coat : spec.outfit === 'dress' ? G.dress : G.vest;
  at(mesh(og, cloth, 0.03), 0, spec.outfit === 'coat' ? 0.42 : spec.outfit === 'dress' ? 0.3 : 0.5, 0, body);
  const bl = at(mesh(G.belly, belly, 0), 0, 0.62, 0.3, body); bl.scale.set(0.9, 1.1, 0.5);
  const tail = at(new THREE.Group(), 0, 0.2, -0.36, body); tail.rotation.x = -1.95;
  tail.add(mesh(G.tail, fur, 0)); at(mesh(G.tailTip, belly, 0), 0, 0.9, 0, tail);
  const head = at(new THREE.Group(), 0, 2.32, 0, root);
  head.add(mesh(G.skull, fur, 0.035));
  const mz = at(mesh(G.muzzle, belly, 0), 0, -0.12, 0.28, head); mz.scale.set(1, 0.75, 1);
  at(mesh(G.snout, fur, 0), 0, -0.06, 0.5, head);
  at(mesh(G.nose, 0x16121c, 0), 0, -0.06, 0.69, head);
  for (const sd of [-1, 1]) {
    const e = at(mesh(G.ear, fur, 0), sd * 0.25, 0.4, -0.02, head); e.rotation.z = -sd * 0.28;
    at(new THREE.Mesh(G.eye, spec.redEyes ? M.red : toon(0x16121c)), sd * 0.15, 0.09, 0.37, head);
  }
  const arms = [-1, 1].map(sd => {
    const pv = at(new THREE.Group(), sd * 0.52, 1.92, 0, root);
    pv.add(mesh(G.arm, spec.outfit === 'coat' ? cloth : fur, 0.03));
    at(mesh(G.paw, belly, 0), 0, -0.8, 0, pv);
    return pv;
  });
  root.userData.P = { body, head, arms, legs, tail };
  root.userData.placeholder = true;
  return root;
}

function makeFox(kit, spec, M) {
  let fox = null;
  if (kit && typeof kit.makeFox === 'function') {
    try { fox = kit.makeFox({ torso: spec.torso, outfit: spec.outfit, mood: spec.mood || 'happy' }); } catch (e) { fox = null; }
  }
  if (!fox || !fox.userData || !fox.userData.P) fox = placeholderFox(spec, M);
  const P = fox.userData.P;
  if (spec.shades && P.head) { at(new THREE.Mesh(G.shades, toon(0x0d0d12)), 0, 0.1, 0.4, P.head); }
  if (spec.cane && P.arms[0]) {
    const c = at(new THREE.Mesh(G.cane, toon(0xffffff)), 0, -1.35, 0.05, P.arms[0]);
    at(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), toon(0xec3013)), 0, -0.6, 0, c);
  }
  if (spec.chair) {
    const ch = at(new THREE.Group(), 0, 0, 0, fox);
    at(mesh(new THREE.BoxGeometry(0.95, 0.16, 0.85), 0x2b2d3a, 0.03), 0, 0.92, 0, ch);
    at(mesh(new THREE.BoxGeometry(0.95, 1.05, 0.14), 0x2b2d3a, 0.03), 0, 1.42, -0.46, ch);
    for (const sd of [-1, 1]) at(mesh(new THREE.BoxGeometry(0.1, 0.12, 0.7), 0xec3013, 0.02), sd * 0.52, 1.18, 0, ch);
    at(mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.18, 18), 0x3a3836, 0.03), 0, 0.45, 0, ch);
    const ring = at(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 24), M.glow), 0, 0.33, 0, ch); ring.rotation.x = Math.PI / 2;
    for (const l of P.legs) l.rotation.x = -1.45;
    fox.userData.chair = ch;
  }
  /* spray wand in the right paw */
  const wand = at(new THREE.Group(), 0, -0.82, 0.02, P.arms[1]);
  at(mesh(G.wand, 0xffd23a, 0), 0, -0.22, 0, wand);
  fox.userData.tip = at(new THREE.Object3D(), 0, -0.55, 0, wand);
  fox.userData.spec = spec;
  fox.userData.ph = Math.random() * 6;
  return fox;
}

function animFox(kit, fox, dt, speed) {
  const u = fox.userData, P = u.P;
  if (!u.placeholder && kit && typeof kit.animFox === 'function') { try { kit.animFox(fox, dt, speed); } catch (e) { /* keep going */ } }
  else {
    u.ph += dt * (2.5 + speed * 7);
    const sw = Math.min(1, speed) * 0.6;
    if (!u.chair) { P.legs[0].rotation.x = Math.sin(u.ph) * sw; P.legs[1].rotation.x = -Math.sin(u.ph) * sw; }
    P.body.position.y = 1.0 + Math.abs(Math.sin(u.ph)) * 0.05 * (0.3 + sw);
    if (P.tail) P.tail.rotation.z = Math.sin(u.ph * 0.6) * 0.25;
  }
  if (u.chair) { u.chair.position.y = Math.sin(u.ph * 0.5) * 0.06; P.body.position.y = 1.0 + u.chair.position.y; P.head.position.y = 2.32 + u.chair.position.y; }
}

/* ---------- small helpers ---------- */
function bez(P, t) { const u = 1 - t; return [u * u * P[0][0] + 2 * u * t * P[1][0] + t * t * P[2][0], u * u * P[0][1] + 2 * u * t * P[1][1] + t * t * P[2][1]]; }
function bezT(P, t) { const u = 1 - t; return [2 * u * (P[1][0] - P[0][0]) + 2 * t * (P[2][0] - P[1][0]), 2 * u * (P[1][1] - P[0][1]) + 2 * t * (P[2][1] - P[1][1])]; }
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function signTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#ec3013'; g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#ffffff'; g.font = '800 92px Archivo, Arial, sans-serif'; g.textBaseline = 'middle';
  g.fillText(text, 26, 84);
  g.fillStyle = '#ffd23a'; g.fillRect(0, 148, 512, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeSave(save) {
  const ls = (k, d) => { try { const v = localStorage.getItem('carWash.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lset = (k, v) => { try { localStorage.setItem('carWash.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  if (save) return {
    get: (k, d) => { try { return save.stat('carWash.' + k, d); } catch (e) { return d; } },
    set: (k, v) => { try { save.setStat('carWash.' + k, v); } catch (e) { /* ignore */ } },
    gold: n => { try { save.addGold(n); } catch (e) { /* ignore */ } }
  };
  return { get: ls, set: lset, gold: n => lset('gold', ls('gold', 0) + n) };
}

/* =================================================================== */
export async function createCarWash({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const timeScale = opts.timeScale > 0 ? opts.timeScale : 1;   /* test hook */
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const store = makeSave(opts.save);
  geos();
  const M = sharedMats();
  const audio = createAudio({ music: !world && opts.music !== false, sound: opts.sound !== false });

  /* ----- renderer / scene ----- */
  let renderer, canvas;
  const scene = world ? new THREE.Group() : new THREE.Scene();
  const env = world ? new THREE.Scene() : scene;   /* lights, sky, lot: thrown away in world mode */
  if (world) { world.parent.add(scene); renderer = world.renderer; canvas = renderer.domElement; }
  else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas = renderer.domElement;
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', outline: 'none' });
    container.appendChild(canvas);
    if (!container.hasAttribute('tabindex')) container.tabIndex = 0;
    container.style.outline = 'none';
  }
  const camera = new THREE.PerspectiveCamera(world ? world.camera.fov : 45, 1, 0.1, 400);
  camera.rotation.set(-0.36, 0.12, 0, 'YXZ');
  const wcam = new THREE.PerspectiveCamera(camera.fov, 1, 0.1, 400);
  const camGoal = new THREE.Vector3(0, 6, 18);
  let camSnap = true;

  /* ----- standalone lot ----- */
  if (!world) {
    scene.background = new THREE.Color(0x8fd3ff);
    scene.fog = new THREE.Fog(0x8fd3ff, 45, 110);
  }
  env.add(new THREE.HemisphereLight(0xffffff, 0x50607a, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9); sun.position.set(6, 12, 9); env.add(sun);
  {
    const lot = at(new THREE.Mesh(new THREE.PlaneGeometry(160, 120), toon(0x4c5262)), 0, -0.01, 0, env); lot.rotation.x = -Math.PI / 2;
    const wall = at(mesh(new THREE.BoxGeometry(60, 7, 1.2), 0xf4f1ea, 0.06), 6, 3.5, -17, env);
    at(mesh(new THREE.BoxGeometry(60.2, 0.8, 1.3), 0xec3013, 0), 0, 1.2, 0, wall);
    at(mesh(new THREE.BoxGeometry(56, 1.5, 0.1), 0x1d3557, 0), 0, -1.6, 0.62, wall);
    for (let i = 0; i < 3; i++) at(mesh(new THREE.ConeGeometry(0.3, 0.8, 10), 0xff8a1f, 0), -6 + i * 12, 0.4, 6.5, env);
    for (const x of [-12, 26]) {
      at(mesh(new THREE.CylinderGeometry(0.25, 0.3, 3, 8), 0x8b5a2b, 0.04), x, 1.5, -9, env);
      at(mesh(new THREE.IcosahedronGeometry(1.8, 1), 0x3fa34d, 0.05), x, 4, -9, env);
    }
  }

  /* ----- bays (the playable "machine") ----- */
  const signTex = signTexture('CAR WASH');
  function makeBay(i) {
    const g = at(new THREE.Group(), i * BAY_GAP, 0, 0, scene);
    at(mesh(new THREE.BoxGeometry(12.4, 0.12, 7.8), 0xd8d2c6, 0.03), 0.2, -0.04, 0.5, g);
    for (const z of [-1.95, 1.95]) at(mesh(new THREE.BoxGeometry(8, 0.02, 0.16), 0xffd23a, 0), 0, 0.03, z, g);
    at(mesh(new THREE.BoxGeometry(1.4, 0.02, 0.5), 0x3a3836, 0), 0, 0.03, 0, g);
    at(mesh(new THREE.BoxGeometry(2.4, 0.02, 0.6), 0x2a9d8f, 0), FOX_HOME[0], 0.03, FOX_HOME[1], g);
    at(mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), 0x9aa0a6, 0), -6.6, 2.2, -1.6, g);
    const sm = toon(0xec3013);
    const face = new THREE.MeshToonMaterial({ map: signTex, gradientMap: gradMap() });
    at(mesh(new THREE.BoxGeometry(3.4, 1.06, 0.16), [sm, sm, sm, sm, face, sm], 0), -6.6, 4.6, -1.6, g);
    at(mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 16), 0xff7ab6, 0), 6.3, 1.1, -1.8, g);
    at(mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xff7ab6, 0), 6.3, 2.2, -1.8, g);
    at(mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), 0x3a86ff, 0), 6.3, 1.3, 1.4, g);
    const reel = at(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 14), 0xffd23a, 0), -6.0, 0.6, 2.9, g); reel.rotation.z = Math.PI / 2;
    const reticle = new THREE.Mesh(G.ring, M.ring); reticle.visible = false; reticle.renderOrder = 5;
    return { i, g, car: null, state: 'empty', t: 0, fox: null, ctrl: 'none', ai: null, score: 0, cars: 0, carStart: 0,
      active: false, spraying: false, hasTarget: false, target: new THREE.Vector3(0, 1.1, 1.02), normal: new THREE.Vector3(0, 0, 1),
      emitAcc: 0, reticle, yaw: Math.PI, lastColor: -1, name: '' };
  }
  const bays = [makeBay(0), makeBay(1)];

  /* ----- cars ----- */
  function buildCar(bay) {
    let ci; do { ci = Math.floor(Math.random() * CAR_COLORS.length); } while (ci === bay.lastColor);
    bay.lastColor = ci;
    const color = CAR_COLORS[ci];
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshToonMaterial({ color, gradientMap: gradMap() });
    const clean = new THREE.Color(color), dirty = clean.clone().lerp(new THREE.Color(MUD), 0.55);
    const hit = [];
    hit.push(at(mesh(G.body, bodyMat, 0.04), 0, 0.93, 0, g));
    hit.push(at(mesh(G.cabin, bodyMat, 0.04), -0.25, 1.75, 0, g));
    for (const x of [-0.85, 0.35]) hit.push(at(new THREE.Mesh(G.winSide, M.glass), x, 1.78, 0.855, g));
    hit.push(at(new THREE.Mesh(G.winFront, M.glass), 0.86, 1.76, 0, g));
    at(new THREE.Mesh(G.winFront, M.glass), -1.36, 1.76, 0, g);
    for (const sd of [-1, 1]) {
      at(mesh(G.bumper, 0x3a3836, 0), sd * 2.25, 0.62, 0, g);
      at(new THREE.Mesh(G.lamp, toon(sd > 0 ? 0xfff3a0 : 0xff3b30)), sd * 2.21, 1.06, 0.62, g);
    }
    const wheels = [];
    for (const x of [-1.4, 1.4]) for (const z of [-0.95, 0.95]) {
      const w = at(mesh(G.wheel, 0x23202a, z > 0 ? 0.03 : 0), x, 0.45, z, g);
      if (z > 0) at(new THREE.Mesh(G.hub, toon(0xd8d8de)), 0, 0, 0.19, w);
      wheels.push(w);
    }
    const shadow = at(new THREE.Mesh(G.shadow, M.shadow), 0, 0.035, 0, g); shadow.scale.set(2.7, 1, 1.4);
    const car = { g, bodyMat, clean, dirty, hit, wheels, flash: 0, spots: R.pickSpots(), bob: Math.random() * 6 };
    const n = car.spots.length;
    car.mud = new THREE.InstancedMesh(G.mud, M.mud, n);
    car.foam = new THREE.InstancedMesh(G.foam, M.foam, n * 4);
    car.drop = new THREE.InstancedMesh(G.drop, M.drop, n * 3);
    for (const im of [car.mud, car.foam, car.drop]) { im.frustumCulled = false; im.raycast = () => {}; g.add(im); }
    const Z = new THREE.Vector3(0, 0, 1);
    for (const s of car.spots) {
      s.v = new THREE.Vector3(...s.p); s.nv = new THREE.Vector3(...s.n);
      s.q = new THREE.Quaternion().setFromUnitVectors(Z, s.nv).multiply(new THREE.Quaternion().setFromAxisAngle(Z, s.rot));
    }
    g.add(bay.reticle);
    return car;
  }
  function disposeCar(car) {
    if (!car) return;
    car.g.parent && car.g.parent.remove(car.g);
    car.bodyMat.dispose();
    for (const im of [car.mud, car.foam, car.drop]) im.dispose();
  }
  const FOAM_OFF = [[0, 0, 0.07, 1], [0.17, 0.07, 0.05, 0.8], [-0.15, 0.09, 0.05, 0.85], [0.03, -0.15, 0.05, 0.75]];
  const DROP_OFF = [[0.12, 0.1], [-0.1, -0.04], [0.04, -0.16]];
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _o = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  function updateSpots(car, time) {
    car.spots.forEach((s, i) => {
      const L = s.lvl, p = s.prog;
      const mudS = L === 0 ? 1 : L === 1 ? 1 - p : 0;
      const foamS = L === 0 ? p : L === 1 ? 1 - p : 0;
      const dropS = L === 1 ? p : L === 2 ? 1 - p : 0;
      _p.copy(s.v).addScaledVector(s.nv, 0.012);
      _s.setScalar(Math.max(1e-4, s.size * mudS)); car.mud.setMatrixAt(i, _m.compose(_p, s.q, _s));
      FOAM_OFF.forEach((f, k) => {
        _o.set(f[0], f[1], f[2]).multiplyScalar(s.size).applyQuaternion(s.q);
        _p.copy(s.v).add(_o);
        const wob = 1 + Math.sin(time * 5 + i + k * 1.7) * 0.07;
        _s.setScalar(Math.max(1e-4, s.size * foamS * f[3] * wob));
        car.foam.setMatrixAt(i * 4 + k, _m.compose(_p, _q.identity(), _s));
      });
      DROP_OFF.forEach((d, k) => {
        _o.set(d[0], d[1], 0.03).multiplyScalar(s.size).applyQuaternion(s.q);
        _p.copy(s.v).add(_o);
        _s.setScalar(Math.max(1e-4, dropS));
        car.drop.setMatrixAt(i * 3 + k, _m.compose(_p, _q.identity(), _s));
      });
    });
    car.mud.instanceMatrix.needsUpdate = car.foam.instanceMatrix.needsUpdate = car.drop.instanceMatrix.needsUpdate = true;
  }
  function placeOnPath(bay, P, t, scale) {
    const c = bay.car; if (!c) return;
    const [x, z] = bez(P, t), [dx, dz] = bezT(P, Math.min(t, 0.999));
    c.g.position.set(x, 0.02, z);
    c.g.rotation.y = Math.atan2(-dz, dx);
    c.g.scale.setScalar(CAR_SCALE * Math.max(0.001, scale));
    for (const w of c.wheels) w.rotation.z -= 0.25;
  }
  function newCar(bay) {
    disposeCar(bay.car);
    bay.car = buildCar(bay);
    bay.g.add(bay.car.g);
    bay.state = 'in'; bay.t = 0;
    placeOnPath(bay, PATH_IN, 0, 0);
    updateSpots(bay.car, 0);
  }

  /* ----- fx: spray particles + sparkles (instanced) ----- */
  function pool(geo, n, mat) {
    const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.raycast = () => {};
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < n; i++) { im.setMatrixAt(i, _m.makeScale(0, 0, 0)); im.setColorAt(i, c); }
    scene.add(im);
    return { im, parts: Array.from({ length: n }, () => ({ life: 1, max: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.1, gr: 0, r: 0 })), next: 0 };
  }
  const SPRAY = pool(G.particle, 260, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const SPARK = pool(G.spark, 90, new THREE.MeshBasicMaterial({ color: 0xffd23a }));
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _col = new THREE.Color();
  function spawn(P, from, vel, life, size, grav, color) {
    const k = P.next; P.next = (P.next + 1) % P.parts.length;
    const q = P.parts[k];
    q.p.copy(from); q.v.copy(vel); q.life = 0; q.max = life; q.s = size; q.gr = grav; q.r = Math.random() * 6;
    P.im.setColorAt(k, _col.setHex(color)); P.im.instanceColor.needsUpdate = true;
  }
  function stepPool(P, dt, spin) {
    let any = false;
    P.parts.forEach((q, i) => {
      if (q.life >= q.max) { if (q.max > 0) { q.max = 0; P.im.setMatrixAt(i, _m.makeScale(0, 0, 0)); any = true; } return; }
      q.life += dt; q.p.addScaledVector(q.v, dt); q.v.y += q.gr * dt;
      const k = 1 - q.life / q.max;
      _s.setScalar(Math.max(1e-4, q.s * (spin ? k : 0.5 + 0.5 * k)));
      if (spin) _q.setFromEuler(new THREE.Euler(q.r + q.life * 6, q.r * 2 + q.life * 4, 0)); else _q.identity();
      P.im.setMatrixAt(i, _m.compose(q.p, _q, _s)); any = true;
    });
    if (any) P.im.instanceMatrix.needsUpdate = true;
  }
  function toScene(v, from) { from.updateWorldMatrix(true, false); v.applyMatrix4(from.matrixWorld); return scene.worldToLocal(v); }
  function emitSpray(bay, tool) {
    const fox = bay.fox, car = bay.car; if (!fox || !car) return;
    toScene(_a.set(0, 0, 0), fox.userData.tip);
    toScene(_b.copy(bay.target), car.g);
    const T = tool === 2 ? 0.2 : 0.3, gr = tool === 2 ? 0 : -9;
    const v = _b.clone().sub(_a).multiplyScalar(1 / T); v.y -= 0.5 * gr * T;
    v.x += (Math.random() - 0.5) * 1.4; v.y += (Math.random() - 0.5) * 1.4; v.z += (Math.random() - 0.5) * 1.4;
    const size = tool === 0 ? 1.7 : tool === 1 ? 1.0 : 0.7;
    spawn(SPRAY, _a, v, T * (0.9 + Math.random() * 0.25), size * (0.7 + Math.random() * 0.6), gr, TOOL_COL[tool]);
  }
  function burst(carG, local, n, spread) {
    toScene(_a.copy(local), carG);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).multiplyScalar(spread);
      spawn(SPARK, _a, v, 0.5 + Math.random() * 0.4, 0.8 + Math.random() * 0.7, -4, Math.random() < 0.3 ? 0xffffff : 0xffd23a);
    }
  }

  /* ----- game state ----- */
  let mode = 'cpu', level = opts.level || 'medium', nPlayers = 2, players = [], turn = 0;
  let phase = 'intro', introT = 1.2, clock = R.ROUND_SECS, clockMax = R.ROUND_SECS, playT = 0, time = 0;
  let paused = false, result = null, message = '', msgId = 0, caption = '', capI = 0, capT = 0, idle = 0, endT = 0;
  let lastTick = 99;
  let best = store.get('best', 0);
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };

  function msg(t) { message = t; msgId++; emitNow = true; }
  function setFox(bay, spec) {
    if (bay.fox) bay.g.remove(bay.fox);
    bay.fox = spec ? makeFox(kit, spec, M) : null;
    bay.name = spec ? spec.name : '';
    if (bay.fox) { bay.fox.position.set(FOX_HOME[0], 0, FOX_HOME[1]); bay.fox.rotation.y = Math.PI * 0.75; bay.g.add(bay.fox); }
  }
  function resetBay(bay, ctrl, spec, aiLevel) {
    bay.ctrl = ctrl; bay.ai = ctrl === 'ai' ? R.aiCreate(aiLevel) : null;
    bay.score = 0; bay.cars = 0; bay.active = true; bay.spraying = false; bay.hasTarget = ctrl === 'ai';
    setFox(bay, spec);
    newCar(bay);
  }
  function clearBay(bay) {
    disposeCar(bay.car); bay.car = null; bay.state = 'empty'; bay.active = false; bay.ctrl = 'none';
    setFox(bay, null);
  }

  function start(m) {
    if (m) mode = ['cpu', 'local', 'demo'].includes(m) ? m : 'cpu';
    paused = false; result = null; turn = 0; pointerDown = false; keySpray = 0; endT = 0;
    if (mode === 'local') players = Array.from({ length: nPlayers }, (_, i) => ({ name: 'P' + (i + 1), spec: i === 0 ? { ...CAST.you, name: 'P1' } : CAST['p' + (i + 1)], score: 0, cars: 0 }));
    if (mode === 'demo') resetBay(bays[0], 'ai', CAST.medium, 'medium');
    else resetBay(bays[0], 'human', mode === 'local' ? players[0].spec : CAST.you, null);
    bays[1].g.visible = mode !== 'local';
    if (mode === 'local') clearBay(bays[1]);
    else resetBay(bays[1], 'ai', mode === 'demo' ? CAST.hard : CAST[level], mode === 'demo' ? 'hard' : level);
    clock = clockMax = mode === 'local' ? R.TURN_SECS : R.ROUND_SECS;
    phase = 'intro'; introT = 1.3; playT = 0; capI = 0; capT = 0; idle = 0; lastTick = 99;
    caption = mode === 'demo' ? R.DEMO_CAPTIONS[0] : '';
    msg(mode === 'demo' ? 'DEMO: WATCH AND LEARN' : mode === 'local' ? 'P1: GET READY' : 'GET READY');
    audio.spray(false);
    camSnap = camSnap || false;
    emitNow = true;
  }
  function ready() {
    if (phase !== 'turn') return;
    turn++;
    resetBay(bays[0], 'human', players[turn].spec, null);
    clock = clockMax = R.TURN_SECS; playT = 0; lastTick = 99;
    phase = 'intro'; introT = 1.3; idle = 0;
    msg(players[turn].name + ': GET READY');
  }

  function endTurn() {
    audio.spray(false); pointerDown = false; keySpray = 0;
    for (const b of bays) {
      if (!b.active) continue;
      if (b.car && b.state === 'wash') b.score += R.partialPoints(R.pctOf(b.car.spots));
      b.active = false; b.spraying = false;
    }
    if (mode === 'demo') { phase = 'over'; endT = 2.5; msg('TIME!'); return; }
    if (mode === 'local') {
      players[turn].score = bays[0].score; players[turn].cars = bays[0].cars;
      if (turn < players.length - 1) { phase = 'turn'; msg(`PASS TO ${players[turn + 1].name}`); return; }
      const ranked = players.slice().sort((a, b) => b.score - a.score);
      const top = ranked[0].score, tie = ranked[1] && ranked[1].score === top;
      const gold = Math.round(R.goldFor(top, true, 'easy') / 2), xp = R.xpFor(top, true);
      finish({
        title: tie ? 'DRAW' : ranked[0].name + ' WINS',
        win: true, score: top, secs: R.TURN_SECS, gold, xp,
        rows: ranked.map((p, i) => ({ name: p.name, score: p.score, cars: p.cars, win: i === 0 && !tie }))
      });
      return;
    }
    const you = bays[0].score, cpu = bays[1].score, win = you > cpu, tie = you === cpu;
    finish({
      title: win ? 'YOU WIN' : tie ? 'DRAW' : bays[1].name + ' WINS',
      win, score: you, secs: R.ROUND_SECS,
      gold: R.goldFor(you, win, level), xp: R.xpFor(you, win),
      rows: [{ name: 'YOU', score: you, cars: bays[0].cars, win }, { name: bays[1].name, score: cpu, cars: bays[1].cars, win: cpu > you }]
    });
  }
  function finish(r) {
    const newBest = r.score > best;
    if (newBest) { best = r.score; store.set('best', best); }
    if (r.gold > 0) store.gold(r.gold);
    store.set('xp', (store.get('xp', 0) || 0) + r.xp);
    store.set('played', (store.get('played', 0) || 0) + 1);
    result = { title: r.title, win: r.win, score: r.score, best, newBest, gold: r.gold, xp: r.xp, stars: R.starsFor(r.score, r.secs), rows: r.rows };
    phase = 'result';
    msg(r.title);
    (r.win ? audio.win : audio.lose)();
  }

  /* ----- input ----- */
  const ndc = new THREE.Vector2();
  let pointerDown = false, pointerId = null, keySpray = 0, keyMode = false;
  const keyAim = new THREE.Vector3(-1.5, 1.0, 1.02);
  function ndcFrom(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -((e.clientY - r.top) / Math.max(1, r.height)) * 2 + 1);
  }
  function humanBay() { return bays[0].ctrl === 'human' ? bays[0] : null; }
  function onDown(e) {
    if (world) { if (e.target !== canvas) return; e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.button > 0) return;
    audio.resume(); idle = 0;
    if (mode === 'demo') { start('cpu'); return; }
    pointerDown = true; pointerId = e.pointerId; keyMode = false; ndcFrom(e);
    if (!world) { try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } try { container.focus({ preventScroll: true }); } catch (er) { /* ignore */ } }
  }
  function onMove(e) {
    if (!pointerDown || e.pointerId !== pointerId) return;
    ndcFrom(e); idle = 0;
    if (world) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  function onUp(e) {
    if (e.pointerId !== pointerId) return;
    if (world && pointerDown) { e.preventDefault(); e.stopImmediatePropagation(); }
    pointerDown = false; pointerId = null;
  }
  function key(e) {
    if (!e || (e.type && e.type !== 'keydown')) return;
    const k = e.key;
    audio.resume(); idle = 0;
    const hb = humanBay();
    let used = true;
    if (k === 'ArrowLeft') keyAim.x -= 0.3;
    else if (k === 'ArrowRight') keyAim.x += 0.3;
    else if (k === 'ArrowUp') keyAim.y += 0.25;
    else if (k === 'ArrowDown') keyAim.y -= 0.25;
    else if (k === 'n' || k === 'N') {
      const car = hb && hb.car;
      if (car) {
        const st = R.stageOf(car.spots); let bi = -1, bd = Infinity;
        car.spots.forEach((s, i) => { if (s.lvl === st) { const d = s.v.distanceToSquared(keyAim); if (d < bd) { bd = d; bi = i; } } });
        if (bi >= 0) keyAim.copy(car.spots[bi].v);
      }
    } else if (k === ' ' || k === 'Enter') {
      if (mode === 'demo') { start('cpu'); }
      else if (phase === 'turn') ready();
      else if (phase === 'result') start();
      else keySpray = 0.28;
    } else used = false;
    if (used) {
      keyAim.x = Math.max(-2.4, Math.min(2.4, keyAim.x)); keyAim.y = Math.max(0.45, Math.min(2.2, keyAim.y));
      if (k.startsWith('Arrow') && keyAim.z < 0.9) keyAim.z = 1.02;
      keyMode = true;
      if (e.preventDefault) e.preventDefault();
    }
  }
  if (world) {
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
  } else {
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    container.addEventListener('keydown', key);
  }

  const ray = new THREE.Raycaster(), inv = new THREE.Matrix4();
  function pickTarget(bay) {
    const car = bay.car; if (!car) return false;
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    ray.ray.applyMatrix4(scene.matrixWorld);
    car.g.updateWorldMatrix(true, true);
    inv.copy(car.g.matrixWorld).invert();
    const hits = ray.intersectObjects(car.hit, false);
    if (hits.length) {
      bay.target.copy(hits[0].point).applyMatrix4(inv);
      bay.normal.copy(hits[0].face.normal).transformDirection(hits[0].object.matrixWorld).transformDirection(inv);
      return true;
    }
    const lr = ray.ray.clone().applyMatrix4(inv);
    if (lr.direction.z >= -1e-4) return false;
    const t = (1.02 - lr.origin.z) / lr.direction.z;
    lr.at(t, bay.target);
    bay.target.x = Math.max(-2.4, Math.min(2.4, bay.target.x)); bay.target.y = Math.max(0.45, Math.min(2.2, bay.target.y)); bay.target.z = 1.02;
    bay.normal.set(0, 0, 1);
    return true;
  }

  /* ----- per-bay update ----- */
  const _t = new THREE.Vector3();
  function updateBay(bay, dt) {
    const car = bay.car;
    if (car) {
      if (bay.state === 'in') {
        bay.t = Math.min(1, bay.t + dt / 1.3);
        const e = 1 - (1 - bay.t) * (1 - bay.t);
        placeOnPath(bay, PATH_IN, e, smooth(0, 0.25, bay.t));
        if (bay.t >= 1) { bay.state = 'wash'; bay.carStart = playT; }
      } else if (bay.state === 'wash') {
        car.bob += dt;
        car.g.position.y = 0.02 + Math.abs(Math.sin(car.bob * 2)) * 0.01;
      } else if (bay.state === 'shine') {
        bay.t += dt;
        car.g.position.y = 0.02 + Math.sin(bay.t * 20) * 0.04 * (1 - bay.t);
        if (bay.t > 0.7) { bay.state = 'out'; bay.t = 0; }
      } else if (bay.state === 'out') {
        bay.t = Math.min(1, bay.t + dt / 1.2);
        placeOnPath(bay, PATH_OUT, bay.t * bay.t, 1 - smooth(0.7, 1, bay.t));
        if (bay.t >= 1) { if (bay.active) newCar(bay); else { disposeCar(car); bay.car = null; bay.state = 'empty'; } }
      }
      if (bay.car === car) {
        if (car.flash > 0) { car.flash = Math.max(0, car.flash - dt * 1.6); car.bodyMat.emissive.setRGB(car.flash * 0.6, car.flash * 0.6, car.flash * 0.5); }
        const pct = R.pctOf(car.spots);
        car.bodyMat.color.copy(car.dirty).lerp(car.clean, Math.pow(pct, 0.8));
        updateSpots(car, time);
      }
    }
    /* controller */
    const playing = phase === 'play' && bay.active;
    bay.spraying = false;
    if (bay.ctrl === 'human' && bay.car) {
      if (pointerDown && playing) bay.hasTarget = pickTarget(bay);
      else if (keyMode) { bay.target.copy(keyAim); bay.normal.set(0, keyAim.z < 0.9 ? 1 : 0, keyAim.z < 0.9 ? 0 : 1); bay.hasTarget = true; }
      bay.spraying = playing && bay.hasTarget && (pointerDown || keySpray > 0);
    } else if (bay.ctrl === 'ai' && bay.car && bay.ai) {
      const st = R.stageOf(bay.car.spots);
      const on = playing && bay.state === 'wash' ? R.aiStep(bay.ai, bay.car.spots, st, dt) : false;
      bay.target.set(bay.ai.x, bay.ai.y, bay.ai.z); bay.hasTarget = true;
      bay.spraying = on;
    }
    const car2 = bay.car;
    const stage = car2 ? Math.min(2, R.stageOf(car2.spots)) : 0;
    if (bay.spraying && car2 && bay.state === 'wash') {
      const rate = bay.ctrl === 'ai' ? bay.ai.level.rate : R.PLAYER_RATE;
      const ev = R.brush(car2.spots, bay.target, dt, rate);
      const human = bay.ctrl === 'human';
      ev.pops.forEach(i => {
        burst(car2.g, car2.spots[i].v, 4, 2.2);
        if (human) audio.pop(car2.spots.filter(s => s.lvl > ev.stage - (ev.stageUp ? 1 : 0)).length, Math.min(2, car2.spots[i].lvl - 1));
      });
      if (ev.done) carDone(bay);
      else if (ev.stageUp && human) { msg(['', 'NOW RINSE!', 'NOW DRY!'][ev.stage] || ''); audio.stage(ev.stage); }
    }
    if (bay.spraying) {
      bay.emitAcc += dt * (bay.ctrl === 'ai' ? 34 : 46);
      while (bay.emitAcc >= 1) { bay.emitAcc--; emitSpray(bay, stage); }
    }
    if (bay.ctrl === 'human') audio.spray(bay.spraying && !paused, stage);
    /* reticle */
    const ret = bay.reticle;
    ret.visible = bay.ctrl === 'human' && !!bay.car && bay.state === 'wash' && phase === 'play' && (pointerDown || keyMode);
    if (ret.visible) {
      ret.position.copy(bay.target).addScaledVector(bay.normal, 0.04);
      ret.quaternion.setFromUnitVectors(_t.set(0, 0, 1), bay.normal);
      const s = 1 + Math.sin(time * 8) * 0.06; ret.scale.setScalar(s);
    }
    poseFox(bay, dt);
  }

  function carDone(bay) {
    const car = bay.car, secs = playT - bay.carStart, pts = R.carPoints(secs);
    bay.score += pts; bay.cars++;
    bay.state = 'shine'; bay.t = 0; car.flash = 1;
    for (let i = 0; i < 6; i++) burst(car.g, _t.set(-2 + i * 0.8, 1.2 + (i % 2) * 0.8, 0.6), 4, 3.2);
    audio.carDone(bay.ctrl !== 'human');
    if (bay.ctrl === 'human') msg(`+${pts} SPARKLING!`);
    emitNow = true;
  }

  function poseFox(bay, dt) {
    const fox = bay.fox; if (!fox) return;
    const P = fox.userData.P;
    let tx = 0, ty = 1.2, tz = 0;
    if (bay.car && bay.hasTarget) {
      bay.car.g.updateMatrix();
      _t.copy(bay.target).applyMatrix4(bay.car.g.matrix);
      tx = _t.x; ty = _t.y; tz = _t.z;
    }
    const gx = FOX_HOME[0] + Math.max(-0.3, Math.min(0.6, (tx + 1) * 0.12)), gz = FOX_HOME[1];
    const ox = fox.position.x, oz = fox.position.z;
    const k = 1 - Math.exp(-5 * dt);
    fox.position.x += (gx - ox) * k; fox.position.z += (gz - oz) * k;
    const speed = Math.hypot(fox.position.x - ox, fox.position.z - oz) / Math.max(dt, 1e-3);
    const dx = tx - fox.position.x, dz = tz - fox.position.z;
    const want = Math.atan2(dx, dz);
    let d = want - bay.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    bay.yaw += d * (1 - Math.exp(-8 * dt)); fox.rotation.y = bay.yaw;
    animFox(kit, fox, dt, speed);
    const shoulder = fox.userData.chair ? 1.95 : 1.92;
    const el = Math.atan2(ty - shoulder, Math.hypot(dx, dz));
    const aim = bay.spraying || bay.ctrl === 'ai' || pointerDown || keyMode;
    const target = aim ? -(Math.PI / 2 + el) : -0.35;
    const ra = P.arms[1], la = P.arms[0];
    ra.rotation.x += (target - ra.rotation.x) * (1 - Math.exp(-12 * dt));
    ra.rotation.z = 0;
    if (fox.userData.spec && fox.userData.spec.cane) { la.rotation.x = -0.35 + Math.sin(time * 3) * 0.12; la.rotation.z = -0.15; }
    else { la.rotation.x += ((aim ? target * 0.8 : -0.2) - la.rotation.x) * (1 - Math.exp(-10 * dt)); la.rotation.z = aim ? -0.35 : 0; }
    if (bay.spraying) ra.rotation.x += Math.sin(time * 40) * 0.02;
  }

  /* ----- camera fit ----- */
  function viewSize() {
    if (world) { const c = world.renderer.domElement; return [c.clientWidth || 1, c.clientHeight || 1]; }
    return [container.clientWidth || 1, container.clientHeight || 1];
  }
  const fitPts = [];
  for (let i = 0; i < 16; i++) fitPts.push(new THREE.Vector3());
  const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3(), _T = new THREE.Vector3(), _C = new THREE.Vector3();
  function computeGoal(out) {
    const [W, H] = viewSize(), aspect = W / H;
    camera.aspect = aspect;
    camera.fov = world ? world.camera.fov : (aspect < 0.8 ? 56 : 40);
    camera.updateProjectionMatrix();
    camera.rotation.set(aspect < 0.8 ? -0.42 : -0.36, aspect < 0.8 ? 0.3 : 0.12, 0, 'YXZ');
    camera.updateMatrix();
    const both = mode !== 'local' && aspect > 1.15;
    const xs = [-5.3, 3.0 + (both ? BAY_GAP : 0)], ys = [0, 3.0], zs = [-1.4, 2.8];
    let n = 0;
    for (const x of xs) for (const y of ys) for (const z of zs) fitPts[n++].set(x, y, z);
    const m = 10;
    let xl = -1 + 2 * (safe.left + m) / W, xr = 1 - 2 * (safe.right + m) / W, yt = 1 - 2 * (safe.top + m) / H, yb = -1 + 2 * (safe.bottom + m) / H;
    if (xr - xl < 0.3) { xl = -0.9; xr = 0.9; }
    if (yt - yb < 0.3) { yb = -0.9; yt = 0.9; }
    const tanV = Math.tan(camera.fov * Math.PI / 360), tanH = tanV * aspect;
    _f.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _r.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const cx = (xl + xr) / 2, cy = (yb + yt) / 2;
    _v.copy(_f).addScaledVector(_r, cx * tanH).addScaledVector(_u, cy * tanV);
    _T.set((xs[0] + xs[1]) / 2, 1.3, (zs[0] + zs[1]) / 2);
    const fits = s => {
      _C.copy(_T).addScaledVector(_v, -s);
      for (let i = 0; i < n; i++) {
        _t.copy(fitPts[i]).sub(_C);
        const z = _t.dot(_f); if (z < 0.5) return false;
        const x = _t.dot(_r) / (z * tanH), y = _t.dot(_u) / (z * tanV);
        if (x < xl || x > xr || y < yb || y > yt) return false;
      }
      return true;
    };
    let lo = 2, hi = 240;
    for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    out.copy(_T).addScaledVector(_v, -hi);
  }
  const _wq = new THREE.Quaternion();
  function updateCamera(dt) {
    computeGoal(camGoal);
    if (camSnap) { camera.position.copy(camGoal); camSnap = false; }
    else camera.position.lerp(camGoal, 1 - Math.exp(-4 * dt));
    camera.updateMatrixWorld();
    if (world) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      scene.getWorldQuaternion(_wq); wcam.quaternion.copy(_wq).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }

  /* ----- hint hand ----- */
  function hint() {
    const hb = humanBay();
    if (!hb || phase !== 'play' || paused || idle < 3 || !hb.car || hb.state !== 'wash') return null;
    const car = hb.car, st = R.stageOf(car.spots);
    let s = null, bd = Infinity;
    for (const sp of car.spots) if (sp.lvl === st) { const d = sp.v.distanceToSquared(hb.target); if (d < bd) { bd = d; s = sp; } }
    if (!s) return null;
    toScene(_a.copy(s.v), car.g).project(camera);
    const [W, H] = viewSize();
    return { x: Math.round((_a.x + 1) / 2 * W), y: Math.round((1 - _a.y) / 2 * H + Math.sin(time * 5) * 8) };
  }

  /* ----- hud ----- */
  function rows() {
    if (mode === 'local') return players.map((p, i) => ({ name: p.name, score: i === turn && phase !== 'result' ? bays[0].score : p.score, cars: i === turn && phase !== 'result' ? bays[0].cars : p.cars, active: i === turn, cpu: false }));
    return bays.map(b => ({ name: b.name, score: b.score, cars: b.cars, active: b.ctrl === 'human', cpu: b.ctrl === 'ai', pct: b.car ? Math.round(R.pctOf(b.car.spots) * 100) : 0 }));
  }
  function hud() {
    const b0 = bays[0], st = b0.car ? R.stageOf(b0.car.spots) : 0;
    return {
      key: GAME.key, name: GAME.name, phase, mode, level, levelName: R.LEVELS[level].name, levelTag: R.LEVELS[level].tag,
      players: nPlayers, turn, turnName: mode === 'local' && players[turn] ? players[turn].name : '',
      nextName: mode === 'local' && players[turn + 1] ? players[turn + 1].name : '',
      time: Math.max(0, Math.ceil(clock)), timeMax: clockMax,
      tool: R.TOOLS[Math.min(2, st)], toolIdx: b0.state === 'wash' ? st : (b0.state === 'shine' || b0.state === 'out') ? 3 : 0,
      carPct: b0.car ? Math.round(R.pctOf(b0.car.spots) * 100) : 0,
      rows: rows(), msg: message, msgId, caption, result, hint: hint(), best,
      sound: audio.sound, music: audio.music, paused, world: !!world
    };
  }
  let emitNow = true, emitAcc = 0;

  /* ----- main loop ----- */
  function update(dt) {
    time += dt; idle += dt;
    if (keySpray > 0) keySpray -= dt;
    if (phase === 'intro') {
      introT -= dt;
      if (introT <= 0) { phase = 'play'; audio.go(); msg(mode === 'demo' ? 'SOAP, RINSE, DRY' : 'GO! SOAP THE MUD'); }
    } else if (phase === 'play') {
      clock -= dt; playT += dt;
      const s = Math.ceil(clock);
      if (s <= 5 && s < lastTick && s > 0 && mode !== 'demo') { audio.tick(); lastTick = s; }
      if (clock <= 0) { clock = 0; endTurn(); }
    } else if (phase === 'over') {
      endT -= dt; if (endT <= 0) start('demo');
    }
    if (mode === 'demo') {
      capT += dt;
      if (capT > 4) { capT = 0; capI = (capI + 1) % R.DEMO_CAPTIONS.length; caption = R.DEMO_CAPTIONS[capI]; emitNow = true; }
    }
    for (const b of bays) updateBay(b, dt);
  }
  let raf = 0, last = performance.now(), dead = false;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * timeScale; last = now;
    if (world) scene.updateWorldMatrix(true, true); else scene.updateMatrixWorld();
    if (!paused) update(dt); else audio.spray(false);
    stepPool(SPRAY, paused ? 0 : dt, false);
    stepPool(SPARK, paused ? 0 : dt, true);
    updateCamera(dt);
    if (!world) {
      const [W, H] = viewSize();
      const sz = renderer.getSize(new THREE.Vector2());
      if (sz.x !== W || sz.y !== H) renderer.setSize(W, H, false);
      renderer.render(scene, camera);
    }
    emitAcc += dt;
    if (emitNow || emitAcc >= 0.1) { emitNow = false; emitAcc = 0; try { onState(hud()); } catch (e) { /* page error must not stop the game */ } }
  }

  let ro = null;
  if (!world && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => { const [W, H] = viewSize(); renderer.setSize(W, H, false); camSnap = true; });
    ro.observe(container);
  }

  start('cpu');
  camSnap = true;
  raf = requestAnimationFrame(frame);

  const api = {
    hud,
    setSafe(s = {}) {
      const n = { top: +s.top || 0, bottom: +s.bottom || 0, left: +s.left || 0, right: +s.right || 0 };
      if (n.top !== safe.top || n.bottom !== safe.bottom || n.left !== safe.left || n.right !== safe.right) { Object.assign(safe, n); }
    },
    start(m) { audio.resume(); start(m || mode); },
    restart() { audio.resume(); start(mode); },
    playAgain() { audio.resume(); start(mode === 'demo' ? 'cpu' : mode); },
    ready() { audio.resume(); ready(); },
    setLevel(l) { if (R.LEVELS[l]) { level = l; if (mode === 'cpu') start('cpu'); else emitNow = true; } },
    setPlayers(n) { nPlayers = Math.max(2, Math.min(4, n | 0)); if (mode === 'local') start('local'); else emitNow = true; },
    pause(on) { paused = !!on; if (paused) { pointerDown = false; audio.spray(false); } emitNow = true; },
    setSound(on) { audio.setSound(on); emitNow = true; },
    setMusic(on) { audio.resume(); audio.setMusic(on); emitNow = true; },
    toggleSound() { audio.setSound(!audio.sound); emitNow = true; },
    toggleMusic() { audio.resume(); audio.setMusic(!audio.music); emitNow = true; },
    key,
    get camera() { return world ? wcam : camera; },
    snapCam() { camSnap = true; updateCamera(0); },
    destroy() {
      dead = true; cancelAnimationFrame(raf);
      if (world) {
        window.removeEventListener('pointerdown', onDown, true);
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onUp, true);
        world.parent.remove(scene);
      } else {
        canvas.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        container.removeEventListener('keydown', key);
        if (ro) ro.disconnect();
        renderer.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
      for (const b of bays) disposeCar(b.car);
      SPRAY.im.dispose(); SPARK.im.dispose(); signTex.dispose();
      audio.close();
    }
  };
  return api;
}

export default createCarWash;
