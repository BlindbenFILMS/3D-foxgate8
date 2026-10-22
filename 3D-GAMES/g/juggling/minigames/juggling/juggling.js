/* 8 GATES 3D: JUGGLING minigame module.
   A fox street performer juggles on a round stage. Tap the hand a prop is falling to, on the beat.
   Works standalone (own renderer) and in WORLD MODE (opts.world = { renderer, camera, parent }). */
import * as THREE from '../../vendor/three/three.module.js';
import * as R from './juggling-rules.js';
import { createAudio } from './juggling-audio.js';

export const GAME = { key: 'jugglingStage', name: 'JUGGLING', maxPlayers: 4 };

const INK = 0x1a1626;
const STAGE_H = 0.32;
const STAGE_R = 2.0;
const HAND_Y = STAGE_H + 1.52;
const HAND_Z = 0.55;
const CATCH_X = [-0.64, 0.64];
const THROW_X = [-0.27, 0.27];
const GRAV = 6.5;
const CRATE = new THREE.Vector3(1.45, STAGE_H + 0.62, -0.85);
const CENTER = new THREE.Vector3(0, 0, 0);
const WAIT_SPOTS = [[-2.85, 1.25], [2.85, 1.25], [-3.1, -0.9]];
const LEFT_KEYS = ['ArrowLeft', 'a', 'A', 'f', 'F', 'z', 'Z', '1'];
const RIGHT_KEYS = ['ArrowRight', 'd', 'D', 'j', 'J', 'l', 'L', 'm', 'M', '2'];

/* ---------- toon kit ---------- */
let GRAD = null;
function gradMap() {
  if (GRAD) return GRAD;
  const d = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  GRAD = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
  GRAD.generateMipmaps = false; GRAD.needsUpdate = true;
  return GRAD;
}
const matCache = new Map();
function toon(color) {
  const k = 'c' + color;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshToonMaterial({ color, gradientMap: gradMap() }));
  return matCache.get(k);
}
function vtoon() {
  if (!matCache.has('v')) matCache.set('v', new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: gradMap() }));
  return matCache.get('v');
}
function inkMat() {
  if (!matCache.has('ink')) matCache.set('ink', new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  return matCache.get('ink');
}
function basic(color, extra = {}) { return new THREE.MeshBasicMaterial({ color, ...extra }); }

/* merge parts into one vertex-coloured geometry */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function merge(parts) {
  const pos = [], nor = [], col = [];
  const c = new THREE.Color();
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    _e.set(...(p.rot || [0, 0, 0]));
    _q.setFromEuler(_e);
    _m4.compose(new THREE.Vector3(...(p.pos || [0, 0, 0])), _q, new THREE.Vector3(...(p.scale || [1, 1, 1])));
    g.applyMatrix4(_m4);
    c.set(p.color);
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      col.push(c.r, c.g, c.b);
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
/* outline shell: push every vertex out along its normal */
function inflate(geo, t) {
  const g = geo.clone();
  const P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) + N.getX(i) * t, P.getY(i) + N.getY(i) * t, P.getZ(i) + N.getZ(i) * t);
  g.computeBoundingSphere();
  return g;
}
function inked(geo, mat, t = 0.035) {
  const m = new THREE.Mesh(geo, mat);
  if (t > 0) { const s = new THREE.Mesh(inflate(geo, t), inkMat()); s.name = 'ink'; m.add(s); }
  return m;
}
const SPH = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const CAP = (r, l, s = 10) => new THREE.CapsuleGeometry(r, l, 4, s);
const CYL = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
const BOX = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const CONE = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);

/* ---------- placeholder fox (same joints as the world kit) ---------- */
function ownFox({ torso = ['#ec3013', '#fff3e0', '#1a1626'], legColor = null, eyeColor = '#1a1626', fur = '#f07a2a' } = {}) {
  const root = new THREE.Group();
  const white = '#fff3e0', ink = '#1a1626';
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(0.2 * s, 1.0, 0);
    const geo = merge([
      { geo: CAP(0.13, 0.62), color: legColor || torso[2], pos: [0, -0.45, 0] },
      { geo: SPH(0.16, 10, 8), color: ink, pos: [0, -0.93, 0.07], scale: [1, 0.6, 1.4] }
    ]);
    pivot.add(inked(geo, vtoon(), 0.03));
    root.add(pivot); legs.push(pivot);
  }
  const body = new THREE.Group(); body.position.y = 1.0; root.add(body);
  body.add(inked(merge([
    { geo: CAP(0.38, 0.5, 12), color: torso[0], pos: [0, 0.58, 0] },
    { geo: SPH(0.29, 12, 10), color: torso[1], pos: [0, 0.6, 0.24], scale: [1, 1.25, 0.55] },
    { geo: CAP(0.17, 0.5), color: fur, pos: [0, 0.18, -0.48], rot: [1.0, 0, 0] },
    { geo: SPH(0.17, 10, 8), color: white, pos: [0, -0.08, -0.85] }
  ]), vtoon(), 0.035));
  const head = new THREE.Group(); head.position.y = 1.28; body.add(head);
  head.add(inked(merge([
    { geo: SPH(0.42, 16, 12), color: fur, scale: [1.05, 0.92, 0.95] },
    { geo: SPH(0.2, 12, 10), color: white, pos: [0, -0.12, 0.32], scale: [1.05, 0.8, 1.3] },
    { geo: SPH(0.075, 8, 6), color: ink, pos: [0, -0.06, 0.59] },
    { geo: SPH(0.065, 8, 6), color: eyeColor, pos: [-0.16, 0.07, 0.355] },
    { geo: SPH(0.065, 8, 6), color: eyeColor, pos: [0.16, 0.07, 0.355] },
    { geo: SPH(0.12, 10, 8), color: white, pos: [-0.27, -0.1, 0.2], scale: [1, 0.8, 0.8] },
    { geo: SPH(0.12, 10, 8), color: white, pos: [0.27, -0.1, 0.2], scale: [1, 0.8, 0.8] },
    { geo: CONE(0.16, 0.4, 4), color: fur, pos: [-0.25, 0.42, 0], rot: [0, 0.78, 0.35] },
    { geo: CONE(0.16, 0.4, 4), color: fur, pos: [0.25, 0.42, 0], rot: [0, 0.78, -0.35] },
    { geo: CONE(0.08, 0.2, 4), color: ink, pos: [-0.29, 0.56, 0.02], rot: [0, 0.78, 0.35] },
    { geo: CONE(0.08, 0.2, 4), color: ink, pos: [0.29, 0.56, 0.02], rot: [0, 0.78, -0.35] }
  ]), vtoon(), 0.03));
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(0.5 * s, 0.95, 0);
    pivot.add(inked(merge([
      { geo: CAP(0.1, 0.5), color: torso[0], pos: [0, -0.36, 0] },
      { geo: SPH(0.13, 10, 8), color: white, pos: [0, -0.76, 0] }
    ]), vtoon(), 0.028));
    body.add(pivot); arms.push(pivot);
  }
  root.userData.P = { body, head, arms, legs };
  root.userData.own = true;
  root.userData.phase = Math.random() * 6;
  return root;
}
function ownAnim(fox, dt, speed) {
  const P = fox.userData.P;
  fox.userData.phase += dt * (speed > 0.05 ? 9 * Math.min(1.4, speed) : 2);
  const ph = fox.userData.phase;
  const amp = Math.min(1, speed);
  P.legs[0].rotation.x = Math.sin(ph) * 0.6 * amp;
  P.legs[1].rotation.x = -Math.sin(ph) * 0.6 * amp;
  P.body.position.y = 1.0 + (amp > 0.05 ? Math.abs(Math.sin(ph)) * 0.06 : Math.sin(ph) * 0.012);
  if (!fox.userData.armsBusy) {
    P.arms[0].rotation.set(-Math.sin(ph) * 0.45 * amp, 0, 0.08);
    P.arms[1].rotation.set(Math.sin(ph) * 0.45 * amp, 0, -0.08);
  }
}

/* ---------- props ---------- */
function makeProp(def) {
  const g = new THREE.Group();
  if (def.kind === 'ball') {
    g.add(inked(SPH(0.14, 16, 12), toon(def.color), 0.03));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.141, 0.018, 6, 20), toon(INK));
    band.rotation.y = Math.PI / 2; g.add(band);
  } else if (def.kind === 'club') {
    g.add(inked(merge([
      { geo: CYL(0.035, 0.05, 0.28, 10), color: '#f4f1ea', pos: [0, -0.2, 0] },
      { geo: SPH(0.11, 12, 10), color: def.color, pos: [0, 0.08, 0], scale: [1, 1.9, 1] },
      { geo: SPH(0.05, 8, 6), color: '#ec3013', pos: [0, -0.36, 0] },
      { geo: CYL(0.075, 0.075, 0.05, 10), color: '#ec3013', pos: [0, -0.06, 0] }
    ]), vtoon(), 0.026));
  } else {
    g.add(inked(merge([
      { geo: CYL(0.035, 0.045, 0.52, 10), color: '#8a5a2b', pos: [0, -0.06, 0] },
      { geo: CYL(0.07, 0.05, 0.12, 10), color: '#3a3836', pos: [0, 0.22, 0] }
    ]), vtoon(), 0.026));
    const flame = new THREE.Mesh(CONE(0.11, 0.32, 10), basic(0xff8a1f, { transparent: true, opacity: 0.95 }));
    flame.position.y = 0.42; g.add(flame);
    const core = new THREE.Mesh(CONE(0.06, 0.2, 8), basic(0xffe680));
    core.position.y = 0.37; g.add(core);
    g.userData.flame = flame;
  }
  return g;
}

/* ---------- stage (the playable object; goes in the group) ---------- */
function signTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ffd23a'; x.fillRect(0, 0, 512, 256);
  x.fillStyle = '#ec3013'; x.fillRect(0, 0, 512, 22); x.fillRect(0, 234, 512, 22);
  x.fillStyle = '#1a1626';
  x.font = '900 46px Archivo, "Arial Black", Impact, sans-serif'; x.textBaseline = 'top';
  x.fillText('8 GATES', 28, 40);
  x.font = '900 104px Archivo, "Arial Black", Impact, sans-serif';
  x.fillText('JUGGLE', 22, 100);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function buildStage(group) {
  const parts = [];
  /* striped skirt: 24 vertical panels */
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) / N * Math.PI * 2;
    const w = 2 * Math.PI * STAGE_R / N * 1.04;
    parts.push({ geo: BOX(w, STAGE_H, 0.08), color: i % 2 ? '#ffd23a' : '#ec3013', pos: [Math.sin(a) * STAGE_R, STAGE_H / 2, Math.cos(a) * STAGE_R], rot: [0, a, 0] });
  }
  parts.push({ geo: CYL(STAGE_R + 0.06, STAGE_R + 0.06, 0.08, 32), color: '#a8692f', pos: [0, STAGE_H - 0.02, 0] });
  parts.push({ geo: CYL(STAGE_R - 0.05, STAGE_R - 0.05, 0.05, 32), color: '#d9a066', pos: [0, STAGE_H + 0.01, 0] });
  /* prop crate */
  parts.push({ geo: BOX(0.62, 0.5, 0.62), color: '#8a5a2b', pos: [CRATE.x, STAGE_H + 0.27, CRATE.z] });
  parts.push({ geo: BOX(0.66, 0.08, 0.66), color: '#ec3013', pos: [CRATE.x, STAGE_H + 0.5, CRATE.z] });
  parts.push({ geo: BOX(0.66, 0.08, 0.66), color: '#1a1626', pos: [CRATE.x, STAGE_H + 0.1, CRATE.z] });
  /* sign post */
  parts.push({ geo: CYL(0.05, 0.05, 2.5, 8), color: '#3a3836', pos: [-1.55, 1.25 + STAGE_H, -1.15] });
  parts.push({ geo: BOX(1.5, 0.78, 0.08), color: '#1a1626', pos: [-1.55, 2.3 + STAGE_H, -1.18] });
  /* low step at the front */
  parts.push({ geo: BOX(1.1, 0.16, 0.42), color: '#a8692f', pos: [0, 0.08, STAGE_R + 0.2] });
  const geo = merge(parts);
  const mesh = inked(geo, vtoon(), 0.03);
  group.add(mesh);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.66), new THREE.MeshBasicMaterial({ map: signTexture() }));
  sign.position.set(-1.55, 2.3 + STAGE_H, -1.13); group.add(sign);
  const chalk = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.9, 40), basic(0xfff3e0));
  chalk.rotation.x = -Math.PI / 2; chalk.position.y = STAGE_H + 0.04; group.add(chalk);
  return mesh;
}

/* ---------- room (standalone only; goes in the throw-away env scene) ---------- */
function groundTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#3d3566'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#2a2448'; x.lineWidth = 6;
  x.strokeRect(0, 0, 64, 64); x.strokeRect(64, 64, 64, 64); x.strokeRect(64, 0, 64, 64); x.strokeRect(0, 64, 64, 64);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildRoom(env, touch) {
  env.background = new THREE.Color(0x0b1630);
  env.fog = new THREE.Fog(0x0b1630, 22, 48);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshToonMaterial({ map: groundTexture(), gradientMap: gradMap() }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; env.add(ground);
  const parts = [];
  /* back wall with a gate arch */
  parts.push({ geo: BOX(26, 7, 0.6), color: '#4b3b78', pos: [0, 3.5, -7] });
  parts.push({ geo: BOX(4.6, 5.0, 0.2), color: '#ffd23a', pos: [0, 2.5, -6.62] });
  parts.push({ geo: BOX(3.8, 4.4, 0.2), color: '#13203f', pos: [0, 2.2, -6.5] });
  parts.push({ geo: CYL(2.3, 2.3, 0.2, 24), color: '#ffd23a', pos: [0, 5.0, -6.62], rot: [Math.PI / 2, 0, 0] });
  parts.push({ geo: CYL(1.9, 1.9, 0.2, 24), color: '#13203f', pos: [0, 4.4, -6.5], rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) {
    parts.push({ geo: BOX(2.4, 3.2, 0.2), color: '#2b2350', pos: [s * 7, 3.0, -6.6] });
    parts.push({ geo: BOX(2.0, 2.6, 0.2), color: '#ffd23a', pos: [s * 7, 3.0, -6.5] });
    parts.push({ geo: CYL(0.09, 0.09, 6, 8), color: '#1a1626', pos: [s * 6.4, 3, -2.2] });
    parts.push({ geo: BOX(0.9, 0.5, 0.9), color: '#ec3013', pos: [s * 4.6, 0.25, 2.8] });
    parts.push({ geo: BOX(0.9, 0.5, 0.9), color: '#3a6ff7', pos: [s * 5.6, 0.25, 1.6] });
  }
  env.add(inked(merge(parts), vtoon(), 0.04));
  /* string lights */
  const bulbs = [];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18, x = -6.4 + u * 12.8;
    bulbs.push([x, 5.9 - Math.sin(u * Math.PI) * 1.1, -2.2]);
  }
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, x = -6.4 + u * 12.8;
    bulbs.push([x, 5.4 - Math.sin(u * Math.PI) * 0.7, -6.2 + u * 0]);
  }
  const inst = new THREE.InstancedMesh(SPH(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbs.length);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  bulbs.forEach((b, i) => { m.makeTranslation(b[0], b[1], b[2]); inst.setMatrixAt(i, m); inst.setColorAt(i, col.set(i % 3 === 0 ? '#ec3013' : i % 3 === 1 ? '#ffd23a' : '#fff3e0')); });
  env.add(inst);
  const wire = new THREE.BufferGeometry().setFromPoints(bulbs.slice(0, 19).map(b => new THREE.Vector3(b[0], b[1] + 0.1, b[2])));
  env.add(new THREE.Line(wire, new THREE.LineBasicMaterial({ color: INK })));
  /* spotlight cone */
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: touch ? 0.05 : 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  cone.position.set(0, 4.75, 0); env.add(cone);
}
function addLights(env) {
  env.add(new THREE.HemisphereLight(0xcfdcff, 0x3a2a55, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(4, 10, 7); env.add(d);
  const r = new THREE.DirectionalLight(0x9fb4ff, 0.6); r.position.set(-6, 4, -4); env.add(r);
}

/* ---------- helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (a, n) => ((a % n) + n) % n;
const lerp = (a, b, t) => a + (b - a) * t;
function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function loadLS(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

/* =================================================================== */
export async function createJuggling({ container = null, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const touch = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  const KEY = GAME.key;

  /* ---------- settings ---------- */
  const stored = loadLS(KEY + '.settings', {});
  const cfg = {
    mode: opts.mode || stored.mode || 'cpu',
    level: opts.level || stored.level || 'hope',
    players: stored.players || 2,
    rounds: stored.rounds || 2
  };
  if (cfg.mode === 'demo') cfg.mode = 'cpu';
  const settings = {
    sound: stored.sound !== false,
    music: world ? false : stored.music !== false,
    cues: stored.cues !== false,
    assist: !!stored.assist
  };
  function persist() { saveLS(KEY + '.settings', { mode: cfg.mode, level: cfg.level, players: cfg.players, rounds: cfg.rounds, sound: settings.sound, music: world ? stored.music : settings.music, cues: settings.cues, assist: settings.assist }); }

  /* ---------- three setup ---------- */
  let renderer, root, env;
  if (world) {
    renderer = world.renderer;
    root = new THREE.Group(); root.name = 'jugglingStage';
    world.parent.add(root);
    env = new THREE.Scene(); /* throw-away: lights and room never touch the town */
    addLights(env);
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !touch || (window.devicePixelRatio || 1) < 2, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.75 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    root = new THREE.Scene();
    env = root;
    buildRoom(env, touch);
    addLights(env);
  }
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const wcam = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const camGoal = { pos: new THREE.Vector3(0, 3, 12), quat: new THREE.Quaternion() };
  camera.position.copy(camGoal.pos);

  buildStage(root);

  /* hand cue rings */
  const rings = [0, 1].map(h => {
    const target = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 6, 36), basic(0xfff3e0, { transparent: true, opacity: 0.5, depthTest: false }));
    const approach = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 36), basic(0xffd23a, { transparent: true, opacity: 0, depthTest: false }));
    target.renderOrder = approach.renderOrder = 10;
    target.position.set(CATCH_X[h], HAND_Y, HAND_Z + 0.05);
    approach.position.copy(target.position);
    root.add(target, approach);
    return { target, approach, flash: 0 };
  });

  /* blob shadows */
  const shadowGeo = new THREE.CircleGeometry(1, 20);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
  function blob(r) { const m = new THREE.Mesh(shadowGeo, shadowMat); m.rotation.x = -Math.PI / 2; m.scale.setScalar(r); root.add(m); return m; }

  /* props pool */
  const props = R.PROPS.map((def, i) => {
    const mesh = makeProp(def); mesh.visible = false; root.add(mesh);
    const sh = blob(0.14); sh.visible = false;
    return { i, def, mesh, sh, state: 'off', target: null, active: false, zoff: (i % 3 - 1) * 0.06 };
  });

  /* ---------- fox adapter ---------- */
  const CAST = {
    player: c => ({ torso: [c || '#ec3013', '#fff3e0', '#1a1626'], outfit: 'vest', mood: 'happy' }),
    pip: () => ({ torso: ['#ffd23a', '#fff3e0', '#3a3836'], outfit: 'tee', mood: 'happy' }),
    hope: () => ({ torso: ['#3a6ff7', '#fff3e0', '#3a6ff7'], legColor: '#3a6ff7', outfit: 'coat', mood: 'calm' }),
    noble: () => ({ torso: ['#2b2350', '#ec3013', '#1a1626'], eyeColor: '#ff1a1a', outfit: 'coat', mood: 'proud' })
  };
  function headFrame(head) {
    head.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(head);
    const inv = new THREE.Matrix4().copy(head.matrixWorld).invert();
    const a = box.min.clone().applyMatrix4(inv), b = box.max.clone().applyMatrix4(inv);
    const min = a.clone().min(b), max = a.clone().max(b);
    return { min, max, size: max.clone().sub(min), center: min.clone().add(max).multiplyScalar(0.5) };
  }
  function makeFox(o) {
    const look = (CAST[o.cast] || CAST.player)(o.color);
    let g = null;
    if (kit && typeof kit.makeFox === 'function') {
      try { g = kit.makeFox({ torso: look.torso, outfit: look.outfit, mood: look.mood }); } catch (e) { g = null; }
    }
    const own = !(g && g.userData && g.userData.P);
    if (own) g = ownFox(look);
    const P = g.userData.P;
    const arms = [...P.arms].sort((a, b) => a.position.x - b.position.x);
    const fox = { g, P, own, arms, armRest: arms.map(a => a.quaternion.clone()), legRest: P.legs.map(l => l.quaternion.clone()), cast: o.cast, pos: new THREE.Vector3(), goal: new THREE.Vector3(), face: 0, faceGoal: 0, hop: 0, bow: 0, flinch: 0, seated: false, hand: [new THREE.Vector3(), new THREE.Vector3()] };
    /* accessories */
    const hf = headFrame(P.head);
    if (o.cast === 'hope') {
      const glasses = new THREE.Mesh(merge([
        { geo: BOX(own ? 0.26 : hf.size.x * 0.3, own ? 0.15 : hf.size.y * 0.16, 0.05), color: '#0a0a12', pos: [own ? -0.17 : -hf.size.x * 0.19, 0, 0] },
        { geo: BOX(own ? 0.26 : hf.size.x * 0.3, own ? 0.15 : hf.size.y * 0.16, 0.05), color: '#0a0a12', pos: [own ? 0.17 : hf.size.x * 0.19, 0, 0] },
        { geo: BOX(own ? 0.9 : hf.size.x * 0.82, 0.035, 0.04), color: '#0a0a12', pos: [0, own ? 0.05 : hf.size.y * 0.04, -0.02] }
      ]), vtoon());
      if (own) glasses.position.set(0, 0.08, 0.39);
      else glasses.position.set(hf.center.x, hf.center.y + hf.size.y * 0.08, hf.max.z - hf.size.z * 0.12);
      P.head.add(glasses);
      if (!own) P.legs.forEach(l => l.traverse(n => { if (n.isMesh && n.material && n.material.color && n.name !== 'ink') { n.material = n.material.clone(); n.material.color.set('#3a6ff7'); } }));
      const cane = new THREE.Mesh(merge([
        { geo: CYL(0.028, 0.028, 1.5, 8), color: '#f4f1ea', pos: [0, 0.75, 0] },
        { geo: CYL(0.032, 0.032, 0.22, 8), color: '#ec3013', pos: [0, 0.12, 0] },
        { geo: SPH(0.04, 8, 6), color: '#f4f1ea', pos: [0, 1.5, 0] }
      ]), vtoon());
      cane.position.set(0.82, 0.0, -0.2); cane.rotation.z = 0.16;
      g.add(cane);
    }
    if (o.cast === 'noble') {
      fox.seated = true;
      if (!own) {
        for (const s of [-1, 1]) {
          const eye = new THREE.Mesh(SPH(hf.size.x * 0.06, 8, 6), basic(0xff1a1a));
          eye.position.set(hf.center.x + s * hf.size.x * 0.18, hf.center.y + hf.size.y * 0.08, hf.max.z - hf.size.z * 0.08);
          P.head.add(eye);
        }
      } else {
        for (const s of [-1, 1]) {
          const glow = new THREE.Mesh(SPH(0.04, 8, 6), basic(0xff3030));
          glow.position.set(s * 0.16, 0.07, 0.4); P.head.add(glow);
        }
      }
      const chair = new THREE.Group();
      chair.add(inked(merge([
        { geo: BOX(0.95, 0.16, 0.8), color: '#2b3350', pos: [0, 0.89, -0.05] },
        { geo: BOX(0.95, 1.0, 0.14), color: '#2b3350', pos: [0, 1.42, -0.48], rot: [-0.12, 0, 0] },
        { geo: BOX(0.12, 0.1, 0.7), color: '#ec3013', pos: [-0.52, 1.1, -0.05] },
        { geo: BOX(0.12, 0.1, 0.7), color: '#ec3013', pos: [0.52, 1.1, -0.05] },
        { geo: CYL(0.12, 0.16, 0.5, 10), color: '#5a6788', pos: [0, 0.58, -0.05] },
        { geo: CYL(0.5, 0.58, 0.14, 20), color: '#2b3350', pos: [0, 0.28, -0.05] }
      ]), vtoon(), 0.03));
      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 30), basic(0xff3030));
      glow.rotation.x = Math.PI / 2; glow.position.set(0, 0.18, -0.05); chair.add(glow);
      g.add(chair);
      fox.chair = chair;
    }
    fox.shadow = blob(0.7);
    root.add(g);
    return fox;
  }
  function disposeFox(f) {
    root.remove(f.g); root.remove(f.shadow);
  }
  function animFox(f, dt, speed) {
    if (!f.own && kit && typeof kit.animFox === 'function') { try { kit.animFox(f.g, dt, f.seated ? 0 : speed); } catch (e) { ownAnimSafe(f, dt, speed); } }
    else ownAnim(f.g, dt, f.seated ? 0 : speed);
    if (f.seated) {
      f.P.legs.forEach(l => { l.rotation.set(-1.45, 0, 0); });
    }
  }
  function ownAnimSafe(f, dt, speed) { if (f.own) ownAnim(f.g, dt, speed); }

  /* aim an arm so its paw points at a target (group-local) */
  const _v = new THREE.Vector3(), _dir = new THREE.Vector3(), _down = new THREE.Vector3(0, -1, 0), _aq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
  function aimArm(arm, targetLocal) {
    _v.copy(targetLocal);
    root.localToWorld(_v);
    arm.parent.updateWorldMatrix(true, false);
    arm.parent.worldToLocal(_v);
    _dir.copy(_v).sub(arm.position);
    if (_dir.lengthSq() < 1e-6) return;
    _dir.normalize();
    _aq.setFromUnitVectors(_down, _dir);
    arm.quaternion.copy(_aq);
  }

  /* ---------- game state ---------- */
  const S = {
    mode: cfg.mode, players: [], order: [], turnIdx: 0, phase: 'ready', phaseT: 0,
    awaitingTap: false, count: 3,
    P: 3, combo: 0, maxCombo: 0, drops: 0, roundScore: 0, timeLeft: R.ROUND_TIME, elapsed: 0,
    T: [], roundStart: 0, endReason: '',
    toast: null, toastId: 0, caption: null, captionIdx: 0, captionT: 0,
    lastInput: 0, fast: false, paused: false, result: null, best: 0, catches: 0, perfects: 0
  };
  let now = 0;
  let foxes = [];

  function statGet(k, d) { if (save && save.stat) { try { return save.stat(KEY + '.' + k, d); } catch (e) { /* fall through */ } } return loadLS(KEY + '.' + k, d); }
  function statSet(k, v) { if (save && save.setStat) { try { save.setStat(KEY + '.' + k, v); return; } catch (e) { /* fall through */ } } saveLS(KEY + '.' + k, v); }
  S.best = statGet('best', 0) || 0;

  const audio = createAudio({ music: settings.music });
  audio.set({ sound: settings.sound, music: settings.music, cues: settings.cues });

  const cur = () => S.players[S.order[S.turnIdx] ? S.order[S.turnIdx].player : 0];
  const curIsHuman = () => { const p = cur(); return !!p && !p.cpu; };
  const okWin = () => R.windows(curIsHuman() && settings.assist).ok;

  function slotTime(k) {
    if (k < 0) return S.T[0] + k * 0.45;
    while (S.T.length <= k) S.T.push(S.T[S.T.length - 1] + R.beatAt(now - S.roundStart, S.P));
    return S.T[k];
  }
  const handOf = k => mod(k, 2);
  const catchPos = (h, z = 0) => new THREE.Vector3(CATCH_X[h], HAND_Y, HAND_Z + z);
  const throwPos = (h, z = 0) => new THREE.Vector3(THROW_X[h], HAND_Y - 0.06, HAND_Z + z);

  function toast(text, kind = 'info', sub = '') { S.toastId++; S.toast = { id: S.toastId, text, kind, sub }; dirty = true; }

  /* ---------- match flow ---------- */
  function setupMatch(mode) {
    S.mode = mode;
    foxes.forEach(disposeFox); foxes = [];
    const list = R.makePlayers(mode, { level: cfg.level, players: cfg.players });
    S.players = list.map((p, i) => ({ ...p, score: 0, roundScores: [], idx: i }));
    S.players.forEach(p => { p.fox = makeFox(p); foxes.push(p.fox); });
    S.rounds = mode === 'demo' ? 1 : cfg.rounds;
    S.order = R.turnOrder(S.players.length, S.rounds);
    S.turnIdx = 0; S.result = null; S.fast = false;
    S.captionIdx = 0; S.captionT = 0;
    S.caption = mode === 'demo' ? 'PIP vs NOBLE. Watch how they catch.' : null;
    /* place foxes */
    S.players.forEach((p, i) => {
      const spot = i === 0 ? [0, 0] : WAIT_SPOTS[(i - 1) % WAIT_SPOTS.length];
      p.fox.pos.set(spot[0], 0, spot[1]); p.fox.goal.copy(p.fox.pos);
    });
    clearProps();
    beginTurn(true);
    snapSoon = true;
  }
  function beginTurn(first) {
    const p = cur();
    /* walk the performer to the centre, everyone else to the side */
    let w = 0;
    S.players.forEach(q => {
      if (q === p) { q.fox.goal.set(0, 0, 0); }
      else { const s = WAIT_SPOTS[w++ % WAIT_SPOTS.length]; q.fox.goal.set(s[0], 0, s[1]); }
    });
    S.phase = 'ready'; S.phaseT = 0;
    const humans = S.players.filter(q => !q.cpu).length;
    S.awaitingTap = !p.cpu && humans > 1 && !first;
    S.fast = false;
    S.combo = 0; S.drops = 0; S.roundScore = 0; S.timeLeft = R.ROUND_TIME; S.P = 3;
    S.lastInput = now;
    const r = S.order[S.turnIdx].round + 1;
    if (S.awaitingTap) toast('PASS TO ' + p.name, 'turn', 'Round ' + r + ' of ' + S.rounds);
    else toast(p.cpu ? p.name + ' JUGGLES' : (p.name === 'YOU' ? 'YOUR TURN' : p.name + "'S TURN"), 'turn', 'Round ' + r + ' of ' + S.rounds);
    dirty = true;
  }
  function beginCount() {
    if (S.phase !== 'ready') return;
    S.awaitingTap = false;
    S.phase = 'count'; S.phaseT = 0; S.count = 3;
    audio.sfx('count');
    dirty = true;
  }
  function clearProps() {
    props.forEach(pr => { pr.state = 'off'; pr.active = false; pr.target = null; pr.ending = null; pr.plan = null; pr.reenter = false; pr.retire = false; pr.entering = false; pr.mesh.visible = false; pr.sh.visible = false; pr.mesh.scale.setScalar(1); });
  }
  function startRound() {
    S.phase = 'play'; S.phaseT = 0;
    S.roundStart = now; S.elapsed = 0; S.P = 3;
    S.combo = 0; S.drops = 0; S.roundScore = 0; S.timeLeft = R.ROUND_TIME; S.catches = 0; S.perfects = 0; S.maxCombo = 0;
    clearProps();
    const b = R.beatAt(0, 3);
    const lead = curIsHuman() ? 1.35 : 0.95;
    S.T = [now + lead];
    for (let i = 0; i < 3; i++) {
      const pr = props[i];
      const target = i;
      pr.active = true; pr.state = 'held'; pr.target = target;
      pr.hand = (target + 1) % 2; pr.fromCatch = false;
      pr.tHold0 = now; pr.tThrow = slotTime(target) - lead; pr.slotInHand = i === 2 ? 1 : 0;
      pr.mesh.visible = true; pr.sh.visible = true; pr.mesh.scale.setScalar(1);
      pr.cued = 0;
    }
    void b;
    audio.sfx('go');
    dirty = true;
  }
  function endRound(reason) {
    if (S.phase !== 'play') return;
    S.phase = 'end'; S.phaseT = 0; S.endReason = reason;
    const p = cur();
    p.score += S.roundScore; p.roundScores.push(S.roundScore);
    p.fox.bow = 1;
    props.forEach(pr => { if (pr.state === 'flight' || pr.state === 'held') pr.ending = reason; });
    if (reason === 'time') { audio.sfx('end'); audio.sfx('cheer'); toast('TIME', 'info', '+' + S.roundScore + ' this turn'); }
    else { toast('3 DROPS', 'drop', '+' + S.roundScore + ' this turn'); audio.sfx('end'); }
    S.fast = false; audio.mute(false);
    dirty = true;
  }
  function nextTurn() {
    S.turnIdx++;
    if (S.turnIdx >= S.order.length) return finishMatch();
    beginTurn(false);
  }
  function finishMatch() {
    S.phase = 'result'; S.phaseT = 0;
    clearProps();
    const st = R.standings(S.players);
    const humans = S.players.filter(p => !p.cpu);
    let title;
    if (st.draw) title = 'DRAW';
    else { const w = S.players[st.winners[0]]; title = w.name === 'YOU' ? 'YOU WIN' : w.name + ' WINS'; }
    const you = humans.length ? humans.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    const youScore = S.mode === 'cpu' && humans[0] ? humans[0].score : (you ? you.score : 0);
    const win = S.mode === 'cpu' ? (!st.draw && humans[0] && st.winners.includes(humans[0].idx)) : S.mode === 'local';
    const stars = S.mode === 'demo' ? 0 : R.starsFor(youScore, S.rounds);
    const gold = R.goldFor({ win, level: cfg.level, stars, mode: S.mode });
    const xp = S.mode === 'demo' ? 0 : R.xpFor(youScore);
    let newBest = false;
    if (S.mode !== 'demo' && youScore > S.best) { S.best = youScore; newBest = true; statSet('best', S.best); }
    if (gold > 0) { if (save && save.addGold) { try { save.addGold(gold); } catch (e) { /* ignore */ } } else statSet('gold', (statGet('gold', 0) || 0) + gold); }
    if (xp > 0) statSet('xp', (statGet('xp', 0) || 0) + xp);
    if (S.mode === 'cpu' && win) statSet('wins', (statGet('wins', 0) || 0) + 1);
    S.result = {
      title, win: !!win, draw: st.draw,
      lines: S.players.map(p => ({ name: p.name, score: p.score, rounds: p.roundScores.slice(), winner: st.winners.includes(p.idx) })).sort((a, b) => b.score - a.score),
      youName: you ? you.name : null, youScore, best: S.best, newBest, gold, xp, stars, mode: S.mode
    };
    S.players.forEach(p => { if (st.winners.includes(p.idx)) p.fox.hop = 1.2; });
    audio.sfx(win || S.mode === 'demo' ? 'win' : 'lose');
    if (win) audio.sfx('cheer');
    S.caption = null;
    dirty = true;
  }

  /* ---------- pattern ---------- */
  const isLive = pr => pr.active && (pr.state === 'flight' || pr.state === 'held');
  const activeCount = () => props.filter(pr => pr.active && pr.state !== 'retiring').length;
  const liveCount = () => props.filter(isLive).length;
  function hasResidue(r, P) { return props.some(pr => isLive(pr) && pr.target !== null && mod(pr.target, P) === mod(r, P)); }
  const pendingEntry = () => props.some(pr => pr.active && pr.state === 'drop' && pr.reenter);

  function throwProp(pr) {
    const h = pr.hand;
    const tgt = pr.target;
    const p0 = throwPos(h, pr.zoff);
    const p1 = catchPos(handOf(tgt), pr.zoff);
    let t1 = slotTime(tgt);
    const t0 = now;
    const T = Math.max(0.28, t1 - t0);
    pr.state = 'flight'; pr.t0 = t0; pr.t1 = t0 + T; pr.p0 = p0;
    pr.v0 = p1.clone().sub(p0).divideScalar(T); pr.v0.y += 0.5 * GRAV * T;
    pr.spin = pr.def.kind === 'ball' ? 0 : (T > 1.2 ? 2 : 1) * (h === 0 ? -1 : 1);
    pr.cued = 0; pr.entering = false;
    pr.plan = cur() && cur().cpu ? R.cpuPlan(cur().level, S.P) : null;
    audio.sfx('throw', h === 0 ? -0.5 : 0.5);
  }
  function enterProp(pr, slot) {
    const p0 = CRATE.clone();
    const p1 = catchPos(handOf(slot), pr.zoff);
    const t1 = slotTime(slot);
    const T = Math.max(0.5, t1 - now);
    pr.active = true; pr.state = 'flight'; pr.target = slot; pr.t0 = now; pr.t1 = now + T; pr.p0 = p0;
    pr.v0 = p1.clone().sub(p0).divideScalar(T); pr.v0.y += 0.5 * GRAV * T;
    pr.spin = pr.def.kind === 'ball' ? 0 : 1; pr.entering = true; pr.cued = 0; pr.reenter = false; pr.ending = null;
    pr.mesh.visible = true; pr.sh.visible = true; pr.mesh.scale.setScalar(1);
    pr.plan = cur() && cur().cpu ? R.cpuPlan(cur().level, S.P) : null;
    audio.sfx('pop');
  }
  function catchProp(pr, tc) {
    const k = pr.target;
    const err = tc - slotTime(k);
    const human = curIsHuman();
    const g = R.grade(err, human && settings.assist) || 'ok';
    S.combo++; S.catches++; if (g === 'perfect') S.perfects++;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    const pts = R.points(g, pr.def.value, S.combo);
    S.roundScore += pts;
    const h = handOf(k);
    rings[h].flash = 1;
    audio.sfx(g, h === 0 ? -0.6 : 0.6);
    if (human || S.mode === 'demo' || g === 'perfect') toast(g.toUpperCase(), g, '+' + pts);
    if (S.combo > 0 && S.combo % 10 === 0) { foxes.forEach(f => { if (f !== cur().fox) f.hop = 1; }); audio.sfx('cheer'); }

    /* pattern changes */
    const count = activeCount();
    const wanted = R.wantedBalls(S.combo);
    let entered = null;
    if (wanted > count && count < R.MAX_BALLS && !pendingEntry()) {
      const spare = props.find(q => !q.active);
      if (spare) {
        if (S.P > count) {
          /* fill a hole */
          const r = findHoleResidue();
          if (r !== null) entered = { pr: spare, slot: holeSlot(r, now + 0.9) };
        } else {
          const old = S.P; S.P = old + 1;
          entered = { pr: spare, slot: k + old };
        }
      }
    } else if (S.P > count && S.P > R.MIN_BALLS && !hasResidue(k - 1, S.P)) {
      S.P -= 1;
    }
    /* hold, then throw to the next slot */
    pr.state = 'held'; pr.hand = h; pr.fromCatch = true; pr.tHold0 = tc;
    pr.target = k + S.P;
    const dwell = Math.min(0.12, R.beatAt(now - S.roundStart, S.P) * 0.28);
    pr.tThrow = tc + dwell;
    pr.slotInHand = 0;
    if (entered) {
      enterProp(entered.pr, entered.slot);
      const nm = entered.pr.def.kind === 'club' ? 'CLUB IN' : entered.pr.def.kind === 'torch' ? 'TORCH IN' : 'BALL IN';
      toast(nm, 'level', entered.pr.def.kind === 'club' ? 'x2 points' : entered.pr.def.kind === 'torch' ? 'x3 points' : '');
      audio.sfx('level');
    }
    dirty = true;
  }
  function findHoleResidue() {
    for (let r = 0; r < S.P; r++) if (!hasResidue(r, S.P)) return r;
    return null;
  }
  function holeSlot(r, minTime) {
    /* smallest slot with residue r whose time is after minTime */
    let k = S.T.length > 0 ? 0 : 0;
    /* start from the slot nearest now */
    let lo = 0;
    for (let i = 0; i < S.T.length; i++) if (S.T[i] <= now) lo = i;
    k = lo + mod(r - lo, S.P);
    while (slotTime(k) < minTime) k += S.P;
    return k;
  }
  function dropProp(pr, counted) {
    pr.state = 'drop';
    const t = now - pr.t0;
    pr.dpos = pr.p0.clone().addScaledVector(pr.v0, t); pr.dpos.y -= 0.5 * GRAV * t * t;
    pr.dvel = pr.v0.clone(); pr.dvel.y -= GRAV * t;
    pr.dvel.z += 0.8; pr.dT = 0; pr.bounces = 0;
    pr.target = null;
    if (counted) {
      S.drops++; S.combo = 0;
      const p = cur();
      p.fox.flinch = 1;
      audio.sfx('drop', pr.hand === 0 ? -0.5 : 0.5);
      toast('DROP', 'drop', S.drops + ' of ' + R.MAX_DROPS);
      /* at the minimum the prop comes back from the crate, above it the prop is retired */
      pr.reenter = activeCount() <= R.MIN_BALLS;
      if (!pr.reenter) { pr.retire = true; }
      if (S.drops >= R.MAX_DROPS) endRound('drops');
    }
    dirty = true;
  }

  /* ---------- input ---------- */
  /* exact sim time at the moment of input, between frames */
  function preciseNow() {
    if (S.paused) return now;
    return now + clamp((performance.now() - lastReal) / 1000, 0, 0.1) * timeScale;
  }
  function handTap(h) {
    audio.resume();
    S.lastInput = now;
    const tn = preciseNow();
    if (S.paused) return;
    if (S.phase === 'ready' && S.awaitingTap) { beginCount(); return; }
    if (S.phase !== 'play' || !curIsHuman()) return;
    const f = cur().fox; f['kick' + h] = 1;
    let best = null, bestErr = 1e9;
    for (const pr of props) {
      if (pr.state !== 'flight' || pr.target === null || pr.ending) continue;
      if (handOf(pr.target) !== h) continue;
      const e = tn - slotTime(pr.target);
      if (Math.abs(e) < Math.abs(bestErr)) { best = pr; bestErr = e; }
    }
    const w = okWin();
    if (best && Math.abs(bestErr) <= w) { catchProp(best, tn); return; }
    if (best && bestErr < -w && bestErr > -R.EARLY_ZONE) {
      S.combo = 0; toast('TOO EARLY', 'early', 'combo lost'); audio.sfx('early', h === 0 ? -0.5 : 0.5); return;
    }
    audio.sfx('whiff', h === 0 ? -0.5 : 0.5);
  }
  function tapAt(clientX) {
    /* left or right of the performer's centre on screen */
    camera.updateMatrixWorld();
    const el = renderer.domElement;
    const rect = el.getBoundingClientRect();
    _v.set(0, HAND_Y, HAND_Z).project(camera);
    const sx = rect.left + (_v.x * 0.5 + 0.5) * rect.width;
    handTap(clientX < sx ? 0 : 1);
  }
  function onPointerStandalone(e) {
    e.preventDefault();
    tapAt(e.clientX);
  }
  function onPointerWorld(e) {
    if (e.target !== renderer.domElement) return;
    e.preventDefault(); e.stopImmediatePropagation();
    tapAt(e.clientX);
  }
  function onKey(e) {
    if (e.repeat) return false;
    if (LEFT_KEYS.includes(e.key)) { handTap(0); return true; }
    if (RIGHT_KEYS.includes(e.key)) { handTap(1); return true; }
    if (e.key === ' ' || e.key === 'Enter') {
      if (S.phase === 'ready' && S.awaitingTap) { audio.resume(); beginCount(); return true; }
    }
    return false;
  }
  function onKeyStandalone(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (onKey(e)) e.preventDefault();
  }
  function onFirstGesture() { audio.resume(); }

  if (world) {
    window.addEventListener('pointerdown', onPointerWorld, true);
  } else {
    renderer.domElement.addEventListener('pointerdown', onPointerStandalone);
    window.addEventListener('keydown', onKeyStandalone);
    window.addEventListener('pointerdown', onFirstGesture, true);
  }

  /* ---------- camera fit ---------- */
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };
  let snapSoon = true;
  const PITCH = -0.13;
  const camQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(PITCH, 0, 0, 'YXZ'));
  const camR = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ);
  const camU = new THREE.Vector3(0, 1, 0).applyQuaternion(camQ);
  const camF = new THREE.Vector3(0, 0, -1).applyQuaternion(camQ);
  function viewSize() {
    if (world) { const el = world.renderer.domElement; return { w: el.clientWidth || 1, h: el.clientHeight || 1 }; }
    return { w: container.clientWidth || 1, h: container.clientHeight || 1 };
  }
  function fitPoints() {
    const pts = [];
    const portrait = viewSize().h > viewSize().w * 1.05;
    const b = R.beatAt(Math.max(0, now - S.roundStart), S.P);
    const T = S.P * b;
    const apex = HAND_Y + GRAV * T * T / 8 + 0.35;
    pts.push(new THREE.Vector3(-1.2, apex, HAND_Z), new THREE.Vector3(1.2, apex, HAND_Z));
    pts.push(new THREE.Vector3(-STAGE_R, 0, STAGE_R + 0.3), new THREE.Vector3(STAGE_R, 0, STAGE_R + 0.3));
    pts.push(new THREE.Vector3(-STAGE_R, STAGE_H, -0.6), new THREE.Vector3(STAGE_R, STAGE_H, -0.6));
    pts.push(new THREE.Vector3(0, STAGE_H + 3.0, 0));
    if (!portrait) {
      S.players.forEach(p => { if (p !== cur()) { pts.push(p.fox.goal.clone().add(new THREE.Vector3(0, 2.9, 0)), p.fox.goal.clone().add(new THREE.Vector3(Math.sign(p.fox.goal.x) * 0.5, 0, 0.4))); } });
    }
    return pts;
  }
  function computeCamGoal() {
    const { w: W, h: H } = viewSize();
    const aspect = W / H;
    const portrait = H > W * 1.05;
    const fov = world ? (world.camera.fov || 50) : (portrait ? 54 : 40);
    camera.fov = fov; camera.aspect = aspect; camera.updateProjectionMatrix();
    const ty = Math.tan(THREE.MathUtils.degToRad(fov) / 2), tx = ty * aspect;
    const m = 0.05;
    const fl = clamp(safe.left / W * 2 - 1 + m, -1, 0.6), fr = clamp(1 - safe.right / W * 2 - m, -0.6, 1);
    const fb = clamp(safe.bottom / H * 2 - 1 + m, -1, 0.6), ft = clamp(1 - safe.top / H * 2 - m, -0.6, 1);
    const pts = fitPoints();
    const c = new THREE.Vector3();
    const box = new THREE.Box3().setFromPoints(pts); box.getCenter(c);
    const loc = pts.map(p => { const d = p.clone().sub(c); return [d.dot(camR), d.dot(camU), d.dot(camF)]; });
    const span = (d) => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y, z] of loc) { const dz = Math.max(0.5, d + z); const nx = x / dz / tx, ny = y / dz / ty; x0 = Math.min(x0, nx); x1 = Math.max(x1, nx); y0 = Math.min(y0, ny); y1 = Math.max(y1, ny); }
      return { x0, x1, y0, y1 };
    };
    let lo = 1, hi = 120;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2, s = span(mid);
      if (s.x1 - s.x0 <= fr - fl && s.y1 - s.y0 <= ft - fb) hi = mid; else lo = mid;
    }
    const d = hi, s = span(d);
    const ox = ((s.x0 + s.x1) / 2 - (fl + fr) / 2) * d * tx;
    const oy = ((s.y0 + s.y1) / 2 - (fb + ft) / 2) * d * ty;
    camGoal.pos.copy(c).addScaledVector(camF, -d).addScaledVector(camR, ox).addScaledVector(camU, oy);
    camGoal.quat.copy(camQ);
  }
  function mirrorCam() {
    camera.updateMatrixWorld(); root.updateWorldMatrix(true, false);
    wcam.position.copy(camera.position); root.localToWorld(wcam.position);
    root.getWorldQuaternion(_q); wcam.quaternion.copy(_q).multiply(camera.quaternion);
    wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
  }
  function snapCam() {
    computeCamGoal();
    camera.position.copy(camGoal.pos); camera.quaternion.copy(camGoal.quat);
    camera.updateMatrixWorld();
    if (world) mirrorCam();
  }

  /* ---------- resize (standalone) ---------- */
  let ro = null;
  function resize() {
    if (world) return;
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    snapSoon = true;
  }
  if (!world) {
    ro = new ResizeObserver(resize); ro.observe(container); resize();
  }

  /* ---------- HUD ---------- */
  let dirty = true, hudT = 0;
  function nextIncoming() {
    let best = null;
    for (const pr of props) if (pr.state === 'flight' && pr.target !== null && !pr.ending) { const t = slotTime(pr.target); if (!best || t < best.t) best = { t, h: handOf(pr.target) }; }
    return best;
  }
  function hud() {
    const p = cur();
    const turn = S.order[S.turnIdx] || { round: 0 };
    const inc = nextIncoming();
    const showHint = S.phase === 'play' && curIsHuman() && !S.paused && (now - S.lastInput > 3) && inc;
    return {
      key: GAME.key, name: GAME.name,
      phase: S.phase, mode: S.mode, level: cfg.level, levelName: (R.LEVELS[cfg.level] || R.LEVELS.hope).name,
      rounds: S.rounds, round: Math.min(S.rounds, turn.round + 1),
      turn: S.turnIdx, turns: S.order.length,
      players: S.players.map((q, i) => ({ name: q.name, cpu: !!q.cpu, rank: q.cpu ? (R.LEVELS[q.level] || {}).rank || '' : '', score: q.score + (q === p && (S.phase === 'play') ? S.roundScore : 0), active: q === p && S.phase !== 'result', idx: i })),
      active: p ? p.name : '', isHuman: curIsHuman(), awaitingTap: S.phase === 'ready' && S.awaitingTap,
      count: S.phase === 'count' ? S.count : null,
      time: Math.max(0, S.timeLeft), timeMax: R.ROUND_TIME,
      drops: S.drops, maxDrops: R.MAX_DROPS,
      combo: S.combo, mult: R.multiplier(S.combo), balls: S.phase === 'play' ? activeCount() : 3,
      props: props.filter(pr => pr.active).map(pr => pr.def.kind),
      roundScore: S.roundScore,
      toast: S.toast, caption: S.caption,
      hint: showHint ? (inc.h === 0 ? 'L' : 'R') : null,
      fast: S.fast, paused: S.paused,
      settings: { ...settings },
      config: { mode: cfg.mode, level: cfg.level, players: cfg.players, rounds: cfg.rounds },
      best: S.best,
      result: S.result,
      world: !!world
    };
  }
  function emit() { dirty = false; hudT = 0; try { onState(hud()); } catch (e) { console.error(e); } }

  /* ---------- per-frame ---------- */
  const _p = new THREE.Vector3();
  function propPos(pr, out) {
    if (pr.state === 'held') {
      const h = pr.hand;
      if (pr.fromCatch) {
        const u = clamp((now - pr.tHold0) / Math.max(0.01, pr.tThrow - pr.tHold0), 0, 1);
        const a = catchPos(h, pr.zoff), b = throwPos(h, pr.zoff);
        out.copy(a).lerp(b, u); out.y -= Math.sin(u * Math.PI) * 0.14;
      } else {
        out.copy(throwPos(h, pr.zoff)); out.x += (pr.slotInHand ? (h === 0 ? -0.12 : 0.12) : 0); out.y += pr.slotInHand ? 0.08 : 0;
      }
    } else if (pr.state === 'flight') {
      const t = now - pr.t0;
      out.copy(pr.p0).addScaledVector(pr.v0, t); out.y -= 0.5 * GRAV * t * t;
    } else if (pr.state === 'drop') {
      out.copy(pr.dpos);
    }
    return out;
  }
  function floorAt(x, z) { return Math.hypot(x, z) < STAGE_R ? STAGE_H + 0.05 : 0.0; }

  function stepSim(dt) {
    now += dt;
    S.phaseT += dt;
    const p = cur();

    if (S.phase === 'ready') {
      const arrived = foxes.every(f => f.pos.distanceTo(f.goal) < 0.05);
      if (!S.awaitingTap && (arrived && S.phaseT > (p && p.cpu ? 1.0 : 0.8))) beginCount();
    } else if (S.phase === 'count') {
      const step = 0.6;
      const c = 3 - Math.floor(S.phaseT / step);
      if (c !== S.count) {
        S.count = c;
        if (c > 0) audio.sfx('count');
        dirty = true;
      }
      if (S.phaseT >= step * 3) startRound();
    } else if (S.phase === 'play') {
      S.timeLeft -= dt; S.elapsed += dt;
      if (S.mode === 'demo') {
        S.captionT += dt;
        if (S.captionT > 4.5) { S.captionT = 0; S.captionIdx = (S.captionIdx + 1) % R.DEMO_CAPTIONS.length; dirty = true; }
        S.caption = R.DEMO_CAPTIONS[S.captionIdx];
      }
      if (S.timeLeft <= 0) endRound('time');
    } else if (S.phase === 'end') {
      if (S.phaseT > 2.0) nextTurn();
    }

    /* props */
    const human = curIsHuman();
    for (const pr of props) {
      if (pr.state === 'held') {
        if (now >= pr.tThrow) {
          if (pr.ending === 'time' || S.phase !== 'play') { pr.state = 'off'; pr.mesh.visible = false; pr.sh.visible = false; continue; }
          throwProp(pr);
        }
      }
      if (pr.state === 'flight') {
        const T = pr.t1;
        if (pr.ending || S.phase !== 'play') {
          if (now >= T) {
            if (pr.ending === 'drops' || S.phase === 'end' && S.endReason === 'drops') { dropProp(pr, false); }
            else { pr.state = 'off'; pr.mesh.visible = false; pr.sh.visible = false; rings[handOf(pr.target)].flash = 0.6; audio.sfx('ok', handOf(pr.target) ? 0.6 : -0.6); }
          }
          continue;
        }
        const tk = slotTime(pr.target);
        /* audio cues on human turns */
        if (human && settings.cues) {
          const ahead = tk - now;
          const h = handOf(pr.target);
          if (pr.cued < 1 && ahead < 0.55 && ahead > 0.2) { audio.cue(h, (ahead - 0.25) / timeScale, false); pr.cued = 1; }
          if (pr.cued < 2 && ahead <= 0.2 && ahead > -0.05) { audio.cue(h, Math.max(0, ahead) / timeScale, true); pr.cued = 2; }
        }
        if (!human && pr.plan) {
          if (pr.plan.miss) { if (now > tk + R.WINDOWS.ok) dropProp(pr, true); }
          else if (now >= tk + pr.plan.err) catchProp(pr, tk + pr.plan.err);
        } else if (now > tk + okWin()) {
          dropProp(pr, true);
        }
        if (S.phase !== 'play') continue;
      }
      if (pr.state === 'drop') {
        pr.dT += dt;
        pr.dvel.y -= GRAV * 1.4 * dt;
        pr.dpos.addScaledVector(pr.dvel, dt);
        const fy = floorAt(pr.dpos.x, pr.dpos.z) + 0.12;
        if (pr.dpos.y < fy) {
          pr.dpos.y = fy;
          if (pr.dvel.y < -1) { pr.dvel.y *= -0.45; pr.bounces++; if (pr.bounces < 3) audio.sfx('bounce'); }
          else pr.dvel.y = 0;
          pr.dvel.x *= 0.8; pr.dvel.z *= 0.8;
        }
        if (pr.dT > 1.3) {
          const fade = clamp(1 - (pr.dT - 1.3) / 0.3, 0, 1);
          pr.mesh.scale.setScalar(Math.max(0.01, fade));
        }
        if (pr.dT > 1.6) {
          pr.mesh.visible = false; pr.sh.visible = false;
          if (S.phase === 'play' && pr.reenter) {
            const r = findHoleResidue();
            if (r !== null) enterProp(pr, holeSlot(r, now + 1.0));
            else { pr.state = 'off'; pr.active = false; }
          } else { pr.state = 'off'; pr.active = false; pr.reenter = false; }
          pr.retire = false;
        }
      }
    }
  }

  let timeScale = 1;
  function updateVisuals(dt) {
    const p = cur();
    /* props */
    for (const pr of props) {
      if (pr.state === 'off') continue;
      propPos(pr, _p);
      pr.mesh.position.copy(_p);
      if (pr.state === 'flight' && pr.spin) {
        const u = clamp((now - pr.t0) / (pr.t1 - pr.t0), 0, 1);
        pr.mesh.rotation.set(0, 0, -pr.spin * u * Math.PI * 2);
      } else if (pr.state === 'held') {
        pr.mesh.rotation.set(0, 0, pr.hand === 0 ? 0.35 : -0.35);
      } else if (pr.state === 'drop') {
        pr.mesh.rotation.z += pr.dvel.x * dt * -3; pr.mesh.rotation.x += pr.dvel.z * dt * 3;
      } else if (pr.def.kind === 'ball') {
        pr.mesh.rotation.x += dt * 4;
      }
      if (pr.def.kind === 'ball' && pr.state === 'flight') pr.mesh.rotation.x += dt * 6;
      if (pr.mesh.userData.flame) { const f = pr.mesh.userData.flame; f.scale.set(1 + Math.sin(now * 31) * 0.12, 1 + Math.sin(now * 23) * 0.2, 1); }
      const fy = floorAt(_p.x, _p.z);
      pr.sh.position.set(_p.x, fy + 0.01, _p.z);
      const hgt = Math.max(0, _p.y - fy);
      pr.sh.scale.setScalar(0.14 + hgt * 0.02);
      pr.sh.visible = pr.mesh.visible;
    }
    /* rings */
    const inc = [null, null];
    for (const pr of props) if (pr.state === 'flight' && pr.target !== null && !pr.ending) { const h = handOf(pr.target), t = slotTime(pr.target); if (!inc[h] || t < inc[h].t) inc[h] = { t, pr }; }
    const show = S.phase === 'play';
    const w = okWin();
    for (let h = 0; h < 2; h++) {
      const r = rings[h];
      r.flash = Math.max(0, r.flash - dt * 3);
      r.target.visible = show; r.approach.visible = show && !!inc[h];
      r.target.material.opacity = 0.45 + r.flash * 0.55;
      r.target.scale.setScalar(1 + r.flash * 0.6);
      r.target.material.color.set(r.flash > 0.05 ? 0xffd23a : 0xfff3e0);
      if (inc[h]) {
        const ahead = inc[h].t - now;
        const k = clamp(ahead / 0.7, 0, 1);
        r.approach.scale.setScalar(1 + k * 2.4);
        r.approach.material.opacity = (1 - k) * 0.95 * (curIsHuman() ? 1 : 0.55);
        r.approach.material.color.set(Math.abs(ahead) <= w ? 0xffd23a : 0xfff3e0);
      }
    }
    /* foxes */
    for (const q of S.players) {
      const f = q.fox;
      const d = _v.copy(f.goal).sub(f.pos); d.y = 0;
      const dist = d.length();
      let speed = 0;
      if (dist > 0.02) {
        const step = Math.min(dist, 2.6 * dt);
        f.pos.addScaledVector(d.normalize(), step);
        speed = 1;
        f.faceGoal = Math.atan2(d.x, d.z);
      } else {
        f.pos.copy(f.goal);
        f.faceGoal = q === p && S.phase !== 'result' ? 0 : Math.atan2(-f.pos.x, -f.pos.z + 3);
        if (S.phase === 'result') f.faceGoal = 0;
      }
      let da = f.faceGoal - f.face; da = Math.atan2(Math.sin(da), Math.cos(da));
      f.face += da * Math.min(1, dt * 8);
      const r = Math.hypot(f.pos.x, f.pos.z);
      const base = STAGE_H * smooth(STAGE_R + 0.25, STAGE_R - 0.1, r);
      f.hop = Math.max(0, f.hop - dt * 1.6);
      const hopY = f.hop > 0 ? Math.abs(Math.sin(f.hop * Math.PI * 3)) * 0.35 * Math.min(1, f.hop) : 0;
      const floatY = f.seated ? 0.06 + Math.sin(now * 2.2 + q.idx) * 0.05 : 0;
      f.g.position.set(f.pos.x, base + hopY + floatY, f.pos.z);
      f.g.rotation.y = f.face;
      const juggling = q === p && (S.phase === 'play' || S.phase === 'count' || S.phase === 'end') && dist < 0.05;
      f.g.userData.armsBusy = juggling;
      animFox(f, dt, speed);
      /* bow / flinch */
      f.bow = Math.max(0, f.bow - dt * 0.7);
      f.flinch = Math.max(0, f.flinch - dt * 3);
      const bowA = Math.sin(Math.min(1, f.bow) * Math.PI) * 0.45;
      f.P.body.rotation.x = bowA + f.flinch * -0.15;
      if (f.chair) f.chair.rotation.x = -f.P.body.rotation.x * 0;
      if (juggling) {
        for (let h = 0; h < 2; h++) {
          let tgt = new THREE.Vector3((h === 0 ? -0.44 : 0.44), HAND_Y - 0.12, HAND_Z - 0.05);
          const held = props.find(pr => pr.state === 'held' && pr.hand === h);
          if (held) { propPos(held, tgt); tgt.y -= 0.12; }
          else if (inc[h] && S.phase === 'play') {
            const ahead = inc[h].t - now;
            const u = 1 - clamp(ahead / 0.4, 0, 1);
            tgt.lerp(catchPos(h).add(new THREE.Vector3(0, -0.12, 0)), u);
          }
          const kick = f['kick' + h] || 0;
          if (kick > 0) { tgt.y += kick * 0.12; f['kick' + h] = Math.max(0, kick - dt * 8); }
          f.hand[h].lerp(tgt, 1 - Math.exp(-dt * 24));
          aimArm(f.arms[h], f.hand[h]);
        }
      } else {
        f.hand[0].set(-0.44, HAND_Y - 0.4, 0.2); f.hand[1].set(0.44, HAND_Y - 0.4, 0.2);
        if (f.own) { /* ownAnim already set rest swing */ }
        else f.arms.forEach((a, i) => a.quaternion.slerp(f.armRest[i], Math.min(1, dt * 6)));
        if (S.phase === 'result' && f.hop > 0) { f.arms.forEach(a => a.rotation.set(Math.PI * 0.9, 0, 0)); }
      }
      f.shadow.position.set(f.pos.x, base + 0.012, f.pos.z);
      f.shadow.scale.setScalar(0.62 - hopY * 0.3);
    }
  }

  let raf = 0, last = performance.now(), lastReal = performance.now(), alive = true;
  function frame(t) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.1, Math.max(0, (t - last) / 1000)); last = t; lastReal = performance.now();
    if (S.paused) dt = 0;
    timeScale = S.fast ? 5 : 1;
    const steps = S.fast ? 5 : 1;
    for (let i = 0; i < steps; i++) stepSim(dt);
    updateVisuals(dt * steps);
    if (S.phase === 'play') audio.setTempo(R.beatAt(now - S.roundStart, S.P) * 2);
    /* camera */
    computeCamGoal();
    if (snapSoon) { camera.position.copy(camGoal.pos); camera.quaternion.copy(camGoal.quat); snapSoon = false; }
    else { camera.position.lerp(camGoal.pos, 1 - Math.exp(-dt * 3)); camera.quaternion.slerp(camGoal.quat, 1 - Math.exp(-dt * 3)); }
    camera.updateMatrixWorld();
    if (world) mirrorCam();
    else renderer.render(root, camera);
    hudT += dt;
    if (dirty || hudT > 0.1 || (S.paused && hudT === 0)) emit();
  }

  /* ---------- go ---------- */
  setupMatch(cfg.mode);
  snapCam();
  emit();
  raf = requestAnimationFrame(frame);

  function restartWith(mode) {
    audio.mute(false);
    S.paused = false;
    setupMatch(mode || S.mode);
    emit();
  }

  const api = {
    hud,
    setSafe(s) { Object.assign(safe, { top: 0, bottom: 0, left: 0, right: 0 }, s || {}); snapSoon = true; },
    start(mode, o = {}) {
      if (o.level) cfg.level = o.level;
      if (o.players) cfg.players = clamp(o.players | 0, 2, 4);
      if (o.rounds) cfg.rounds = clamp(o.rounds | 0, 1, 3);
      const m = mode || cfg.mode;
      if (m !== 'demo') cfg.mode = m;
      persist();
      restartWith(m);
    },
    key(e) { return onKey(e); },
    get camera() { return world ? wcam : camera; },
    snapCam,
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      if (world) {
        window.removeEventListener('pointerdown', onPointerWorld, true);
        world.parent.remove(root);
      } else {
        renderer.domElement.removeEventListener('pointerdown', onPointerStandalone);
        window.removeEventListener('keydown', onKeyStandalone);
        window.removeEventListener('pointerdown', onFirstGesture, true);
        if (ro) ro.disconnect();
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      audio.close();
    },
    /* buttons */
    tap(h) { handTap(h === 'R' || h === 1 ? 1 : 0); },
    left() { handTap(0); },
    right() { handTap(1); },
    begin() { audio.resume(); if (S.phase === 'ready') beginCount(); },
    restart() { restartWith(S.mode); },
    playAgain() { restartWith(S.mode); },
    fast(on) { if (!curIsHuman() && S.phase !== 'result') { S.fast = on === undefined ? !S.fast : !!on; audio.mute(S.fast); dirty = true; } },
    pause(on) { S.paused = !!on; audio.mute(S.paused); dirty = true; emit(); },
    setLevel(l) { if (R.LEVELS[l]) { cfg.level = l; persist(); dirty = true; } },
    setPlayers(n) { cfg.players = clamp(n | 0, 2, 4); persist(); dirty = true; },
    setRounds(n) { cfg.rounds = clamp(n | 0, 1, 3); persist(); dirty = true; },
    setMode(m) { if (m === 'cpu' || m === 'local') cfg.mode = m; persist(); dirty = true; },
    setOption(k, v) {
      if (!(k in settings)) return;
      settings[k] = !!v;
      audio.set({ sound: settings.sound, music: settings.music, cues: settings.cues });
      if (k === 'sound' || k === 'music') audio.resume();
      persist(); dirty = true; emit();
    },
    resumeAudio() { audio.resume(); },
    get rules() { return R.RULES_TEXT.slice(); }
  };
  /* test hook: add ?jgdebug to the page URL */
  if (typeof location !== 'undefined' && /[?&]jgdebug/.test(location.search)) {
    api._peek = () => { const n = nextIncoming(); return n ? { ahead: n.t - preciseNow(), hand: n.h, phase: S.phase, P: S.P, live: liveCount(), active: activeCount() } : { phase: S.phase, P: S.P }; };
    window.__jg = api;
  }
  return api;
}

export default createJuggling;
