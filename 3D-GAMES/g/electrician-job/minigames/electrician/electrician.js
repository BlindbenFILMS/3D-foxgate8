/* ELECTRICIAN JOB: 8 GATES 3D minigame module.
   Turn the wire tiles so power runs from the breaker panel to every fixture in the house.
   Race the CPU electrician (PIP / HOPE / NOBLE), pass and play, or watch the demo.
   Works standalone (own renderer) and in WORLD MODE (opts.world = { renderer, camera, parent }). */
import * as THREE from '../../vendor/three/three.module.js';
import * as RU from './electrician-rules.js';
import { makeAudio } from './electrician-audio.js';

export const GAME = { key: 'electricianJob', name: 'ELECTRICIAN JOB', maxPlayers: 4 };

const KEY = GAME.key;
const INK = 0x1a1626;
const YEL = 0xffd23a;
const RED = 0xec3013;
const TABLE_Y = 1.15;
const PLATE_Y = TABLE_Y + 0.03;
const WIRE_Y = TABLE_Y + 0.085;
const T = 1;

const CAST = {
  YOU: { name: 'YOU', torso: [0x2f6fd6, YEL, 0x1d3f7a], outfit: 'vest', hat: true },
  PIP: { name: 'PIP', torso: [YEL, 0xfff2b0, 0x9a7a18], outfit: 'tee', hat: true, level: 0 },
  HOPE: { name: 'HOPE', torso: [0xf4f1ea, 0x2f6fd6, 0x2f6fd6], outfit: 'coat', legs: 0x2f6fd6, glasses: true, cane: true, level: 1 },
  NOBLE: { name: 'NOBLE', torso: [0x5b2bc4, 0x1a1626, RED], outfit: 'coat', chair: true, redEyes: true, level: 2 }
};
const LOCAL_COLORS = [0x2f6fd6, RED, 0x2fa84f, 0x8a4fd6];
const LOCAL_NAMES = ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4'];
const ROOM_COLORS = [0x3d5a80, 0x6b3e5e, 0x3e6b4f, 0x7a5a2e];
const hex = c => '#' + c.toString(16).padStart(6, '0');

const DEMO_CAPTIONS = [
  'POWER FLOWS FROM THE BREAKER PANEL AT THE BACK.',
  'TAP A TILE TO TURN ITS WIRES A QUARTER TURN.',
  'YELLOW WIRES ARE LIVE. GREY WIRES ARE DEAD.',
  'LIGHT EVERY LAMP, FAN, TV AND FRIDGE.',
  'SPARKS MEAN A LOOSE LIVE WIRE. CLOSE IT UP.',
  'HOLD A TILE TO LOCK IT WHEN YOU KNOW IT IS RIGHT.',
  'FIRST ELECTRICIAN TO POWER THE WHOLE HOUSE WINS.',
  'TAP THE BOARD TO PLAY.'
];

/* ---------- small helpers ---------- */
function gradMap() {
  const d = new Uint8Array([80, 80, 80, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
}

function glowTexture(inner = 'rgba(255,240,160,1)', outer = 'rgba(255,200,40,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, 'rgba(255,210,58,0.55)'); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
/* one coloured part: geometry baked with a transform and vertex colour */
function part(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function merge(parts) {
  let total = 0;
  for (const g of parts) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  m.computeBoundingSphere();
  return m;
}
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 14, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 14),
  cap: new THREE.CapsuleGeometry(1, 1, 4, 10)
};

/* =====================================================================
   createElectricianJob
   ===================================================================== */
export async function createElectricianJob({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const save = opts.save || null;
  const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  /* ---------- save ---------- */
  const stat = (k, def) => {
    if (save && save.stat) return save.stat(KEY + '.' + k, def);
    try { const v = localStorage.getItem(KEY + '.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  };
  const setStat = (k, v) => {
    if (save && save.setStat) return save.setStat(KEY + '.' + k, v);
    try { localStorage.setItem(KEY + '.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ }
  };
  const addGold = n => {
    if (save && save.addGold) return save.addGold(n);
    setStat('gold', (stat('gold', 0) || 0) + n);
  };

  /* ---------- renderer / scene ---------- */
  let renderer = null;
  if (!world) {
    renderer = new THREE.WebGLRenderer({ antialias: !touch || (window.devicePixelRatio || 1) < 2, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
  }
  const dom = world ? world.renderer.domElement : renderer.domElement;

  const scene = world ? new THREE.Group() : new THREE.Scene();
  if (world) world.parent.add(scene);
  const env = world ? new THREE.Scene() : scene; /* lights + room: thrown away in world mode */

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const wcam = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const camGoal = { pos: new THREE.Vector3(0, 9, 9), tgt: new THREE.Vector3(0, TABLE_Y, 0) };
  const camTgt = camGoal.tgt.clone();
  camera.position.copy(camGoal.pos); camera.lookAt(camTgt);

  /* ---------- materials ---------- */
  const GRAD = gradMap();
  const mats = [];
  const keep = m => (mats.push(m), m);
  const toonVC = keep(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD }));
  const toonCache = {};
  const toon = (c, emissive = 0, ei = 0) => {
    const k = c + ':' + emissive + ':' + ei;
    return toonCache[k] || (toonCache[k] = keep(new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, emissive, emissiveIntensity: ei })));
  };
  const inkCache = {};
  const ink = (th = 0.03) => {
    const k = th.toFixed(3);
    if (inkCache[k]) return inkCache[k];
    const m = keep(new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
    m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * ' + k + ';'); };
    m.customProgramCacheKey = () => 'ink' + k;
    return (inkCache[k] = m);
  };
  const withInk = (mesh, th = 0.03) => { const s = new THREE.Mesh(mesh.geometry, ink(th)); s.raycast = () => {}; mesh.add(s); return mesh; };
  const vcMesh = (parts, th = 0.03) => withInk(new THREE.Mesh(merge(parts), toonVC), th);

  const wireOff = keep(new THREE.MeshToonMaterial({ color: 0xd9d3c7, gradientMap: GRAD }));
  const wireOn = keep(new THREE.MeshToonMaterial({ color: YEL, gradientMap: GRAD, emissive: 0xffa800, emissiveIntensity: 0.55 }));
  const wireOffLocked = keep(new THREE.MeshToonMaterial({ color: 0xa9b7c9, gradientMap: GRAD }));
  const glowOff = keep(new THREE.MeshToonMaterial({ color: 0x3a3836, gradientMap: GRAD }));
  const glowOn = {
    lamp: keep(new THREE.MeshBasicMaterial({ color: 0xfff1a8 })),
    fan: keep(new THREE.MeshBasicMaterial({ color: YEL })),
    tv: keep(new THREE.MeshBasicMaterial({ color: 0x6fe3ff })),
    fridge: keep(new THREE.MeshBasicMaterial({ color: 0x9fffb0 })),
    toaster: keep(new THREE.MeshBasicMaterial({ color: 0xff7a2a }))
  };
  const glowTex = glowTexture();
  const sparkTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,240,180,0)');
  const plateMat = keep(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD, emissive: 0x000000 }));
  const shadowMat = keep(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));

  /* ---------- lights + room (env) ---------- */
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x3a3346, 1.15);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-4, 10, 7);
  env.add(hemi, sun);
  if (!world) {
    scene.background = new THREE.Color(0x15131b);
    const rp = [];
    rp.push(part(G.box, 0x3b3346, 0, -0.05, 0, 0, 0, 0, 40, 0.1, 40));
    for (let i = -5; i <= 5; i++) rp.push(part(G.box, 0x332c3d, i * 3.2, 0.005, 0, 0, 0, 0, 0.06, 0.02, 40));
    rp.push(part(G.box, 0x253445, 0, 4, -12, 0, 0, 0, 40, 8.4, 0.3));
    rp.push(part(G.box, 0x1e2a38, 0, 0.25, -11.8, 0, 0, 0, 40, 0.5, 0.3));
    rp.push(part(G.box, 0xffe9a8, -6, 4.6, -11.8, 0, 0, 0, 3.4, 2.4, 0.1));
    rp.push(part(G.box, INK, -6, 4.6, -11.75, 0, 0, 0, 3.6, 0.12, 0.1));
    rp.push(part(G.box, INK, -6, 4.6, -11.75, 0, 0, 0, 0.12, 2.6, 0.1));
    rp.push(part(G.box, 0x2b3a2e, 7, 3, -11.6, 0, 0, 0, 3, 4, 0.2));
    for (let i = 0; i < 6; i++) rp.push(part(G.box, i % 2 ? YEL : INK, 7, 1.3 + i * 0.6, -11.45, 0, 0, 0.7, 3.2, 0.18, 0.05));
    const room = new THREE.Mesh(merge(rp), toonVC);
    scene.add(room);
  }

  /* ---------- fox adapter ---------- */
  function placeholderFox(o) {
    const [c1, c2, c3] = o.torso || [0xe8742a, 0xffffff, 0x333333];
    const FUR = 0xe8742a, CREAM = 0xfff4e6, DARK = 0x2a2230;
    const root = new THREE.Group();
    const body = new THREE.Group(); body.position.y = 1.12; root.add(body);
    const bp = [
      part(G.cap, c1, 0, 0.55, 0, 0, 0, 0, 0.4, 0.42, 0.34),
      part(G.sph, o.outfit === 'vest' ? c2 : CREAM, 0, 0.62, 0.22, 0, 0, 0, 0.24, 0.3, 0.14),
      part(G.box, c3, 0, 0.12, 0, 0, 0, 0, 0.82, 0.12, 0.7),
      part(G.cone, FUR, 0, 0.35, -0.5, -2.2, 0, 0, 0.22, 0.75, 0.22),
      part(G.sph, CREAM, 0, 0.1, -0.78, 0, 0, 0, 0.14, 0.14, 0.14)
    ];
    if (o.outfit === 'coat' || o.outfit === 'dress') bp.push(part(G.cone, c1, 0, 0.05, 0, 0, 0, 0, 0.5, 0.5, 0.42));
    if (o.outfit === 'vest') {
      bp.push(part(G.box, c2, -0.18, 0.75, 0.3, 0, 0, 0, 0.06, 0.5, 0.06));
      bp.push(part(G.box, c2, 0.18, 0.75, 0.3, 0, 0, 0, 0.06, 0.5, 0.06));
      bp.push(part(G.box, 0x7a4e30, 0, 0.2, 0, 0, 0, 0, 0.86, 0.12, 0.74));
    }
    body.add(vcMesh(bp, 0.035));
    const head = new THREE.Group(); head.position.y = 1.3; body.add(head);
    const eye = o.redEyes ? RED : DARK;
    head.add(vcMesh([
      part(G.sph, FUR, 0, 0, 0, 0, 0, 0, 0.4, 0.37, 0.38),
      part(G.cone, CREAM, 0, -0.07, 0.38, Math.PI / 2, 0, 0, 0.17, 0.36, 0.15),
      part(G.sph, DARK, 0, -0.06, 0.57, 0, 0, 0, 0.06, 0.05, 0.05),
      part(G.sph, CREAM, -0.2, -0.12, 0.22, 0, 0, 0, 0.13, 0.1, 0.1),
      part(G.sph, CREAM, 0.2, -0.12, 0.22, 0, 0, 0, 0.13, 0.1, 0.1),
      part(G.cone, FUR, -0.22, 0.38, -0.02, 0, 0, 0.3, 0.13, 0.32, 0.08),
      part(G.cone, FUR, 0.22, 0.38, -0.02, 0, 0, -0.3, 0.13, 0.32, 0.08),
      part(G.cone, DARK, -0.235, 0.47, 0.0, 0, 0, 0.3, 0.06, 0.14, 0.05),
      part(G.cone, DARK, 0.235, 0.47, 0.0, 0, 0, -0.3, 0.06, 0.14, 0.05),
      part(G.sph, eye, -0.14, 0.07, 0.32, 0, 0, 0, 0.055, 0.075, 0.04),
      part(G.sph, eye, 0.14, 0.07, 0.32, 0, 0, 0, 0.055, 0.075, 0.04)
    ], 0.03));
    const arms = [-1, 1].map(s => {
      const a = new THREE.Group(); a.position.set(s * 0.46, 0.92, 0); body.add(a);
      a.add(vcMesh([part(G.cap, c1, 0, -0.3, 0, 0, 0, 0, 0.12, 0.34, 0.12), part(G.sph, DARK, 0, -0.62, 0, 0, 0, 0, 0.13, 0.13, 0.13)], 0.03));
      return a;
    });
    const legs = [-1, 1].map(s => {
      const l = new THREE.Group(); l.position.set(s * 0.2, 1.15, 0); root.add(l);
      l.add(vcMesh([part(G.cap, o.legs || c3, 0, -0.5, 0, 0, 0, 0, 0.15, 0.5, 0.15), part(G.box, DARK, 0, -1.08, 0.08, 0, 0, 0, 0.26, 0.14, 0.4)], 0.03));
      return l;
    });
    root.userData.P = { body, head, arms, legs };
    root.userData.own = true;
    return root;
  }

  function makeFox(o) {
    let fox;
    if (kit && kit.makeFox) {
      fox = kit.makeFox({ torso: o.torso, outfit: o.outfit, mood: o.mood || 'happy' });
      if (o.legs && fox.userData.P) fox.userData.P.legs.forEach(l => l.traverse(m => { if (m.isMesh && m.material && m.material.color) { m.material = m.material.clone(); m.material.color.setHex(o.legs); } }));
    } else fox = placeholderFox(o);
    const P = fox.userData.P;
    /* extras, attached to the posing joints so they work on the world's fox too */
    if (o.hat) {
      const h = vcMesh([
        part(G.sph, o.torso[0] === YEL ? 0xff9f1a : YEL, 0, 0.22, 0, 0, 0, 0, 0.41, 0.3, 0.41),
        part(G.cyl, o.torso[0] === YEL ? 0xff9f1a : YEL, 0, 0.2, 0.08, 0, 0, 0, 0.5, 0.04, 0.5),
        part(G.box, INK, 0, 0.36, 0, 0, 0, 0, 0.08, 0.2, 0.62)
      ], 0.025);
      h.position.y = 0.2; P.head.add(h);
    }
    if (o.glasses) {
      P.head.add(vcMesh([part(G.box, 0x111111, 0, 0.08, 0.35, 0, 0, 0, 0.5, 0.13, 0.06), part(G.box, 0x111111, 0, 0.08, 0.2, 0, 0, 0, 0.56, 0.04, 0.3)], 0.015));
    }
    if (o.redEyes && fox.userData.own !== true) {
      P.head.add(new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: RED })).translateY(0.08).translateZ(0.34));
      P.head.children[P.head.children.length - 1].scale.set(0.42, 0.06, 0.05);
    }
    if (o.cane) {
      const c = vcMesh([part(G.cyl, 0xffffff, 0, -0.95, 0.12, 0.12, 0, 0, 0.028, 1.15, 0.028), part(G.cyl, RED, 0, -1.48, 0.18, 0.12, 0, 0, 0.032, 0.14, 0.032)], 0.015);
      P.arms[0].add(c);
    }
    if (o.chair) {
      const ch = new THREE.Group();
      ch.add(vcMesh([
        part(G.cyl, 0x2a2f3a, 0, 0.62, 0, 0, 0, 0, 0.62, 0.16, 0.62),
        part(G.box, 0x2a2f3a, 0, 1.3, -0.5, -0.12, 0, 0, 0.9, 1.2, 0.16),
        part(G.box, 0x3a4252, -0.58, 0.92, 0, 0, 0, 0, 0.12, 0.12, 0.8),
        part(G.box, 0x3a4252, 0.58, 0.92, 0, 0, 0, 0, 0.12, 0.12, 0.8)
      ], 0.03));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0x6fe3ff }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.38; ch.add(ring);
      fox.userData.chair = ch;
      const holder = new THREE.Group(); holder.add(ch); holder.add(fox);
      holder.userData.P = P; holder.userData.fox = fox; holder.userData.chair = ch; holder.userData.sit = true;
      P.legs.forEach(l => { l.rotation.x = -1.45; });
      return holder;
    }
    return fox;
  }

  function animFox(f, dt, speed, t) {
    const P = f.userData.P; if (!P) return;
    if (kit && kit.animFox && !f.userData.sit) { kit.animFox(f.userData.fox || f, dt, speed); }
    else if (!f.userData.sit) {
      const ph = t * (speed > 0.05 ? 9 : 2.2);
      const sw = speed > 0.05 ? 0.6 : 0;
      P.legs[0].rotation.x = Math.sin(ph) * sw;
      P.legs[1].rotation.x = -Math.sin(ph) * sw;
      P.body.position.y = 1.12 + Math.abs(Math.sin(ph)) * (speed > 0.05 ? 0.06 : 0.02);
    }
    if (f.userData.sit && f.userData.chair) f.userData.chair.position.y = Math.sin(t * 2.4) * 0.06, f.userData.fox.position.y = (f.userData.fox.userData.own ? -0.34 : 0.05) + Math.sin(t * 2.4) * 0.06;
    /* arm poses: reach is driven by f.userData.reach (0..1), cheer by f.userData.cheer */
    const reach = f.userData.reach || 0, cheer = f.userData.cheer || 0;
    const idle = Math.sin(t * 2.2 + (f.userData.seed || 0)) * 0.06;
    P.arms[1].rotation.x = -1.35 * reach - 2.6 * cheer + idle;
    P.arms[1].rotation.z = 0.12 + 0.2 * cheer;
    P.arms[0].rotation.x = -2.6 * cheer - idle * 0.5 + (f.userData.cane ? -0.25 : 0);
    P.arms[0].rotation.z = -0.12 - 0.2 * cheer;
    P.head.rotation.x = 0.25 * reach - 0.2 * cheer;
    f.userData.reach = Math.max(0, reach - dt * 2.8);
  }

  /* ---------- the job board (playable object) ---------- */
  const boardRoot = new THREE.Group();
  scene.add(boardRoot);
  let view = null;      /* current main board view */
  let n = 4;

  function colX(c) { return (c - (n - 1) / 2) * T; }
  function rowZ(r) { return (r - (n - 1) / 2) * T; }

  function wireGeo(mask) {
    const parts = [part(G.cyl, 0xffffff, 0, 0, 0, 0, 0, 0, 0.15, 0.1, 0.15)];
    for (let d = 0; d < 4; d++) {
      if (!(mask & (1 << d))) continue;
      const x = RU.DC[d] * 0.25, z = RU.DR[d] * 0.25;
      parts.push(part(G.box, 0xffffff, x, 0, z, 0, 0, 0, d % 2 ? 0.5 : 0.15, 0.08, d % 2 ? 0.15 : 0.5));
    }
    const g = merge(parts); g.deleteAttribute('color');
    return g;
  }
  const wireGeos = {};
  const wg = mask => wireGeos[mask] || (wireGeos[mask] = wireGeo(mask));

  function fixtureModel(type) {
    const g = new THREE.Group();
    let glow, glowPos = new THREE.Vector3(0, 0.5, 0), spin = null;
    const DK = 0x2a2230;
    if (type === 'lamp') {
      g.add(vcMesh([part(G.cyl, RED, 0, 0.05, 0, 0, 0, 0, 0.2, 0.08, 0.2), part(G.cyl, 0x8d8a93, 0, 0.25, 0, 0, 0, 0, 0.03, 0.36, 0.03), part(G.cyl, 0x8d8a93, 0, 0.44, 0, 0, 0, 0, 0.08, 0.06, 0.08)], 0.02));
      glow = new THREE.Mesh(G.sph, glowOff); glow.scale.set(0.15, 0.17, 0.15); glow.position.set(0, 0.6, 0); glowPos.set(0, 0.62, 0);
    } else if (type === 'fan') {
      g.add(vcMesh([part(G.cyl, DK, 0, 0.04, 0, 0, 0, 0, 0.18, 0.06, 0.18), part(G.cyl, 0x8d8a93, 0, 0.28, 0, 0, 0, 0, 0.03, 0.46, 0.03)], 0.02));
      spin = vcMesh([0, 1, 2].map(k => part(G.box, 0x6fb3ff, Math.cos(k * 2.094) * 0.17, 0, Math.sin(k * 2.094) * 0.17, 0, -k * 2.094, 0.25, 0.3, 0.02, 0.1)), 0.015);
      spin.position.set(0, 0.55, 0); g.add(spin);
      glow = new THREE.Mesh(G.sph, glowOff); glow.scale.setScalar(0.07); glow.position.set(0, 0.55, 0); glowPos.set(0, 0.6, 0);
    } else if (type === 'tv') {
      g.add(vcMesh([part(G.box, DK, 0, 0.04, 0, 0, 0, 0, 0.3, 0.06, 0.18), part(G.box, DK, 0, 0.15, 0, 0, 0, 0, 0.06, 0.2, 0.06), part(G.box, 0x23202b, 0, 0.42, 0, 0, 0, 0, 0.62, 0.4, 0.08)], 0.02));
      glow = new THREE.Mesh(G.box, glowOff); glow.scale.set(0.54, 0.32, 0.02); glow.position.set(0, 0.42, 0.045); glowPos.set(0, 0.42, 0.1);
    } else if (type === 'fridge') {
      g.add(vcMesh([part(G.box, 0xf2efe8, 0, 0.36, 0, 0, 0, 0, 0.42, 0.7, 0.36), part(G.box, 0x8d8a93, 0.13, 0.5, 0.19, 0, 0, 0, 0.04, 0.22, 0.03), part(G.box, 0xc9c4ba, 0, 0.5, 0.18, 0, 0, 0, 0.42, 0.02, 0.02)], 0.02));
      glow = new THREE.Mesh(G.box, glowOff); glow.scale.set(0.16, 0.1, 0.02); glow.position.set(-0.08, 0.6, 0.185); glowPos.set(0, 0.75, 0);
    } else {
      g.add(vcMesh([part(G.box, 0xbfc4cc, 0, 0.18, 0, 0, 0, 0, 0.44, 0.3, 0.28), part(G.box, DK, 0.25, 0.22, 0, 0, 0, 0, 0.04, 0.1, 0.04)], 0.02));
      glow = new THREE.Mesh(G.box, glowOff); glow.scale.set(0.3, 0.02, 0.18); glow.position.set(0, 0.335, 0); glowPos.set(0, 0.4, 0);
    }
    g.add(glow);
    return { g, glow, glowPos, spin, type };
  }

  function buildView(board) {
    if (view) { boardRoot.remove(view.group); disposeTree(view.group, true); }
    n = board.n;
    const group = new THREE.Group();
    const half = n * T / 2;
    /* table + plates */
    const tp = [
      part(G.box, 0x2b2834, 0, TABLE_Y - 0.09, 0, 0, 0, 0, n * T + 0.5, 0.18, n * T + 0.5),
      part(G.box, 0x7a4e30, 0, TABLE_Y - 0.21, 0, 0, 0, 0, n * T + 0.62, 0.08, n * T + 0.62)
    ];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tp.push(part(G.box, 0x7a4e30, sx * (half + 0.05), (TABLE_Y - 0.25) / 2, sz * (half + 0.05), 0, 0, 0, 0.18, TABLE_Y - 0.25, 0.18));
    const table = vcMesh(tp, 0.04);
    group.add(table);
    const pp = [];
    for (const t of board.tiles) {
      const room = (t.r < n / 2 ? 0 : 2) + (t.c < n / 2 ? 0 : 1);
      pp.push(part(G.box, ROOM_COLORS[room], colX(t.c), PLATE_Y, rowZ(t.r), 0, 0, 0, 0.93, 0.05, 0.93));
    }
    const plates = new THREE.Mesh(merge(pp), plateMat);
    group.add(plates);
    /* breaker panel behind row 0 */
    const px = colX(board.rootCol), pz = -half - 0.42;
    const panel = vcMesh([
      part(G.box, 0x5d6470, px, TABLE_Y + 0.55, pz, 0, 0, 0, 0.95, 1.35, 0.26),
      part(G.box, 0x48505c, px, TABLE_Y + 0.55, pz + 0.135, 0, 0, 0, 0.8, 1.15, 0.02),
      part(G.box, YEL, px, TABLE_Y + 1.12, pz + 0.15, 0, 0, 0, 0.8, 0.12, 0.02),
      part(G.box, INK, px - 0.2, TABLE_Y + 1.12, pz + 0.16, 0, 0, 0.7, 0.06, 0.13, 0.02),
      part(G.box, INK, px + 0.2, TABLE_Y + 1.12, pz + 0.16, 0, 0, 0.7, 0.06, 0.13, 0.02),
      part(G.box, RED, px + 0.22, TABLE_Y + 0.6, pz + 0.2, 0, 0, 0, 0.1, 0.3, 0.08),
      part(G.box, 0x2a2230, px - 0.12, TABLE_Y + 0.65, pz + 0.15, 0, 0, 0, 0.3, 0.5, 0.03),
      part(G.box, 0x5d6470, px, TABLE_Y + 0.1, pz + 0.3, 0, 0, 0, 0.3, 0.12, 0.3)
    ], 0.035);
    group.add(panel);
    const feed = new THREE.Mesh(G.box, wireOn);
    feed.scale.set(0.15, 0.08, 0.6); feed.position.set(px, WIRE_Y, -half + 0.0 - 0.18);
    group.add(feed);
    const led = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: 0x5dff7a }));
    led.scale.setScalar(0.06); led.position.set(px - 0.3, TABLE_Y + 0.95, pz + 0.16); group.add(led);
    mats.push(led.material);
    /* tiles */
    const tiles = board.tiles.map(t => {
      const tg = new THREE.Group();
      tg.position.set(colX(t.c), WIRE_Y, rowZ(t.r));
      const mesh = new THREE.Mesh(wg(t.mask), wireOff);
      tg.add(mesh);
      group.add(tg);
      let fx = null;
      if (t.fixture) {
        fx = fixtureModel(t.fixture);
        fx.g.position.set(colX(t.c), TABLE_Y + 0.05, rowZ(t.r));
        fx.g.scale.setScalar(0.95);
        group.add(fx.g);
      }
      const lock = new THREE.Mesh(G.box, toon(YEL));
      lock.scale.set(0.16, 0.06, 0.16); lock.position.set(colX(t.c) + 0.32, WIRE_Y + 0.02, rowZ(t.r) + 0.32);
      lock.visible = false; group.add(lock);
      return { t, tg, mesh, fx, lock, turns: 0, angle: 0, lit: false, on: false };
    });
    /* hint ring + keyboard cursor */
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.47, 32), new THREE.MeshBasicMaterial({ color: YEL, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; group.add(ring);
    const cur = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 4, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    cur.rotation.x = -Math.PI / 2; cur.rotation.z = Math.PI / 4; cur.visible = false; group.add(cur);
    /* glow + sparks: one Points each */
    const mkPoints = (max, tex, size) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3));
      g.setDrawRange(0, 0);
      const m = new THREE.PointsMaterial({ map: tex, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
      const p = new THREE.Points(g, m); p.frustumCulled = false; group.add(p);
      return p;
    };
    const glows = mkPoints(32, glowTex, 1.1);
    const sparks = mkPoints(64, sparkTex, 0.5);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), shadowMat);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.025; shadow.scale.setScalar(n * 0.75);
    group.add(shadow);
    boardRoot.add(group);
    view = { group, tiles, plates, ring, cur, glows, sparks, board, spinIn: 0 };
    return view;
  }

  function disposeTree(o, keepShared) {
    o.traverse(m => {
      if (m.geometry && !Object.values(G).includes(m.geometry) && !Object.values(wireGeos).includes(m.geometry)) m.geometry.dispose();
      if (!keepShared && m.material && m.material.dispose) m.material.dispose();
    });
  }

  /* ---------- opponent stations: a monitor + a fox ---------- */
  let stations = [];
  function drawMonitor(st) {
    const g = st.ctx, W = 256;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
    g.fillStyle = hex(st.color); g.fillRect(0, 0, W, 34);
    const cc = new THREE.Color(st.color); const lum = 0.299 * cc.r + 0.587 * cc.g + 0.114 * cc.b;
    g.fillStyle = lum > 0.35 ? '#000' : '#fff'; g.font = 'bold 22px Archivo, Arial, sans-serif'; g.textBaseline = 'middle';
    g.fillText(st.name, 10, 18);
    const pct = Math.round(st.pct * 100) + '%';
    g.fillText(pct, W - 10 - g.measureText(pct).width, 18);
    const b = st.board, nn = b.n, pad = 14, cs = (W - pad * 2) / nn, oy = 40;
    const pw = st.power;
    g.lineCap = 'square';
    for (const t of b.tiles) {
      const cx = pad + t.c * cs + cs / 2, cy = oy + t.r * (cs * 0.84) + cs * 0.42;
      g.strokeStyle = '#3a3836'; g.lineWidth = 2; g.strokeRect(pad + t.c * cs + 2, oy + t.r * cs * 0.84 + 2, cs - 4, cs * 0.84 - 4);
      const on = pw && pw.powered[t.i];
      g.strokeStyle = on ? '#ffd23a' : '#8a8580'; g.lineWidth = Math.max(3, cs * 0.14);
      for (let d = 0; d < 4; d++) if (t.mask & (1 << d)) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + RU.DC[d] * cs / 2, cy + RU.DR[d] * cs * 0.42); g.stroke(); }
      if (t.fixture) { g.fillStyle = on ? '#ffffff' : '#3a3836'; g.fillRect(cx - cs * 0.16, cy - cs * 0.16, cs * 0.32, cs * 0.32); }
    }
    if (st.done) {
      g.fillStyle = '#ec3013'; g.fillRect(0, W - 44, W, 44);
      g.fillStyle = '#fff'; g.font = 'bold 26px Archivo, Arial, sans-serif';
      g.fillText('DONE ' + st.timeText, 10, W - 22);
    }
    st.tex.needsUpdate = true;
  }

  function clearStations() {
    for (const s of stations) { scene.remove(s.group); disposeTree(s.group, true); s.tex.dispose(); s.mat.dispose(); }
    stations = [];
  }

  function makeStation(castKey, color, board) {
    const cast = CAST[castKey];
    const group = new THREE.Group();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mon = new THREE.Group();
    mon.add(vcMesh([
      part(G.box, 0x23202b, 0, 0, -0.06, 0, 0, 0, 1.5, 1.5, 0.1),
      part(G.box, hex(color) === '#000000' ? 0x333333 : color, 0, -0.8, -0.06, 0, 0, 0, 1.5, 0.08, 0.12)
    ], 0.03));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 1.38), mat);
    screen.position.z = 0.0; mon.add(screen);
    mon.position.set(0, TABLE_Y + 1.05, 0);
    mon.rotation.x = -0.55;
    group.add(mon);
    group.add(vcMesh([
      part(G.box, 0x7a4e30, 0, TABLE_Y - 0.1, 0.05, 0, 0, 0, 1.7, 0.16, 1.0),
      part(G.box, 0x7a4e30, 0, (TABLE_Y - 0.15) / 2, 0.05, 0, 0, 0, 0.2, TABLE_Y - 0.15, 0.2),
      part(G.box, 0x3a3836, 0, TABLE_Y + 0.25, -0.1, -0.5, 0, 0, 0.1, 0.6, 0.1)
    ], 0.03));
    const fox = makeFox(cast);
    fox.position.set(1.25, 0, 0.25);
    fox.rotation.y = -0.35;
    fox.userData.seed = Math.random() * 6;
    fox.userData.cane = !!cast.cane;
    group.add(fox);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.position.set(0.6, 0.025, 0.2); sh.scale.set(1.6, 1, 0.9); group.add(sh);
    scene.add(group);
    const lv = RU.LEVELS[cast.level ?? 0];
    const st = {
      castKey, name: cast.name, color, group, mon, fox, canvas, ctx: canvas.getContext('2d'), tex, mat,
      board: RU.clone(board), power: null, ai: { cur: -1 }, R: RU.rng(board.seed ^ (castKey.length * 7919)),
      moveSec: lv.moveSec, mistake: lv.mistake, think: lv.think,
      timer: 0.6 + Math.random() * 0.6, time: 0, moves: 0, done: false, pct: 0, timeText: '', place: 0
    };
    st.power = RU.computePower(st.board.tiles, st.board.n, st.board.root);
    st.pct = st.power.lit / Math.max(1, st.power.fixtures);
    drawMonitor(st);
    return st;
  }

  function layoutStations() {
    const k = stations.length; if (!k) return;
    const half = n * T / 2;
    const portrait = aspect() < 1.05;
    stations.forEach((s, i) => {
      s.fox.position.x = 1.25; s.fox.rotation.y = -0.35;
      if (portrait) {
        const span = 3.0;
        s.group.position.set((i - (k - 1) / 2) * span - 0.5, 0, -half - 2.1);
        s.group.rotation.y = 0;
      } else {
        const side = i % 2 === 0 ? 1 : -1;
        const row = Math.floor(i / 2);
        s.group.position.set(side * (half + 2.1), 0, -half + 0.8 + row * 2.6 - (k === 1 ? -0.2 : 0));
        s.group.rotation.y = side > 0 ? -0.5 : 0.5;
        if (side < 0) { s.fox.position.x = -1.25; s.fox.rotation.y = 0.35; }
      }
    });
  }

  /* ---------- player fox ---------- */
  let pfox = null;
  function setPlayerFox(cast) {
    if (pfox) { scene.remove(pfox); if (pfox.userData.shadow) scene.remove(pfox.userData.shadow); disposeTree(pfox, true); }
    pfox = makeFox(cast);
    pfox.userData.seed = 1.3;
    pfox.userData.cane = !!cast.cane;
    pfox.userData.z = 0;
    pfox.rotation.y = Math.PI / 2;
    pfox.position.set(-n * T / 2 - 0.85, 0, 0);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03;
    pfox.userData.shadow = sh; scene.add(sh);
    scene.add(pfox);
  }
  let lastShadow = null;

  /* ---------- game state ---------- */
  const audio = makeAudio({ music: world ? false : stat('music', true) !== false, sfx: stat('sound', true) !== false });
  const S = {
    phase: 'ready', mode: 'cpu', level: Math.max(0, Math.min(2, stat('level', 0) | 0)),
    opponents: Math.max(1, Math.min(3, stat('opponents', 1) | 0)), localPlayers: 2,
    board: null, start: null, power: null, time: 0, moves: 0, minMoves: 0,
    readyT: 0, idle: 0, hintIdx: -1, paused: false, result: null, banner: '', caption: '',
    turn: 0, localResults: [], seed: 1, demoAI: null, demoT: 0, demoCap: 0, demoCapT: 0, demoRestart: 0,
    cursor: { r: 0, c: 0, on: false }, celebrate: 0, finishedOrder: []
  };

  function aspect() { const s = size(); return s.w / Math.max(1, s.h); }
  function size() {
    if (world) return { w: dom.clientWidth || 1, h: dom.clientHeight || 1 };
    return { w: container.clientWidth || 1, h: container.clientHeight || 1 };
  }

  function newSeed() { return (Math.random() * 1e9) | 0; }

  function startBoard(seed) {
    const lv = RU.LEVELS[S.level];
    const board = RU.generate(lv.size, seed);
    S.start = RU.clone(board);
    S.board = board;
    S.minMoves = RU.minMoves(board.tiles);
    buildView(board);
    view.spinIn = 1;
    view.tiles.forEach(v => { v.angle = (1 + Math.floor(Math.random() * 3)) * Math.PI; });
    S.power = RU.computePower(board.tiles, board.n, board.root);
    refreshPower(true);
  }

  function resetForTurn() {
    S.board = RU.clone(S.start);
    buildView(S.board);
    view.spinIn = 1;
    view.tiles.forEach(v => { v.angle = (1 + Math.floor(Math.random() * 3)) * Math.PI; });
    S.power = RU.computePower(S.board.tiles, S.board.n, S.board.root);
    refreshPower(true);
  }

  function start(mode = S.mode) {
    if (!['cpu', 'local', 'demo'].includes(mode)) mode = 'cpu';
    S.mode = mode; S.phase = 'ready'; S.readyT = 1.3; S.time = 0; S.moves = 0; S.result = null; S.idle = 0;
    S.turn = 0; S.localResults = []; S.paused = false; S.celebrate = 0; S.finishedOrder = []; S.banner = 'GET READY';
    S.seed = newSeed();
    plateMat.emissive.setHex(0x000000);
    clearStations();
    startBoard(S.seed);
    const lv = RU.LEVELS[S.level];
    if (mode === 'cpu') {
      setPlayerFox(CAST.YOU);
      const order = [lv.opp, ...['PIP', 'HOPE', 'NOBLE'].filter(k => k !== lv.opp)];
      for (let i = 0; i < S.opponents; i++) {
        const k = order[i];
        stations.push(makeStation(k, k === 'PIP' ? YEL : k === 'HOPE' ? 0x2f6fd6 : 0x8a4fd6, S.board));
      }
    } else if (mode === 'local') {
      setPlayerFox({ ...CAST.YOU, torso: [LOCAL_COLORS[0], YEL, 0x1d3f7a] });
    } else {
      setPlayerFox(CAST.HOPE);
      S.demoAI = { ai: { cur: -1 }, R: RU.rng(S.seed), timer: 1.2 };
      stations.push(makeStation('PIP', YEL, S.board));
      S.demoCap = 0; S.demoCapT = 0;
    }
    layoutStations();
    fit(true);
    emit();
  }

  function refreshPower(silent) {
    const old = S.power;
    const p = RU.computePower(S.board.tiles, S.board.n, S.board.root);
    S.power = p;
    let newlyLit = 0, dark = 0;
    view.tiles.forEach((v, i) => {
      const on = p.powered[i];
      v.mesh.material = on ? wireOn : (v.t.locked ? wireOffLocked : wireOff);
      if (v.fx) {
        const lit = on;
        if (lit !== v.lit) { if (lit) newlyLit++; else dark++; }
        v.lit = lit;
        v.fx.glow.material = lit ? glowOn[v.fx.type] : glowOff;
      }
      v.lock.visible = !!v.t.locked;
    });
    /* glow points at lit fixtures */
    const gp = view.glows.geometry.attributes.position;
    let k = 0;
    for (const v of view.tiles) if (v.fx && v.lit && k < 32) { gp.setXYZ(k++, v.fx.g.position.x, v.fx.g.position.y + v.fx.glowPos.y, v.fx.g.position.z); }
    gp.needsUpdate = true; view.glows.geometry.setDrawRange(0, k);
    /* loose live ends */
    view.loose = [];
    for (const t of S.board.tiles) {
      if (!p.powered[t.i]) continue;
      for (let d = 0; d < 4; d++) {
        if (!(t.mask & (1 << d)) || (t.isRoot && d === 0)) continue;
        const rr = t.r + RU.DR[d], cc = t.c + RU.DC[d];
        const out = rr < 0 || cc < 0 || rr >= n || cc >= n;
        if (out || !(S.board.tiles[rr * n + cc].mask & (1 << RU.OPP(d)))) view.loose.push([colX(t.c) + RU.DC[d] * 0.46, rowZ(t.r) + RU.DR[d] * 0.46]);
      }
    }
    if (!silent) {
      if (newlyLit) audio.light(p.lit);
      else if (dark) audio.dark();
      if (old && p.loose > old.loose && !newlyLit) audio.spark();
    }
    return { newlyLit, dark };
  }

  function tileTap(i, who = 'you') {
    if (S.phase !== 'play' || S.paused) return false;
    const t = S.board.tiles[i]; if (!t) return false;
    const v = view.tiles[i];
    if (t.locked) { audio.turnBack(); v.angle += 0.25; return false; }
    RU.tap(S.board, i);
    v.turns++;
    if (who === 'you') { S.moves++; S.hintIdx = -1; S.idle = 0; }
    audio.click();
    refreshPower(false);
    if (pfox) { pfox.userData.reach = 1; pfox.userData.z = rowZ(t.r); }
    if (S.power.solved) finishPlayer();
    emit();
    return true;
  }

  function tileLock(i) {
    if (S.phase !== 'play' || S.paused) return;
    const t = S.board.tiles[i]; if (!t) return;
    t.locked = !t.locked;
    t.locked ? audio.lock() : audio.unlock();
    refreshPower(true);
    emit();
  }

  function fmt(t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return (m ? m + ':' + (s < 10 ? '0' : '') : '') + s.toFixed(1);
  }

  function finishPlayer() {
    S.celebrate = 2.2;
    if (pfox) pfox.userData.cheer = 1;
    plateMat.emissive.setHex(0x2a2410);
    if (S.mode === 'cpu') {
      S.finishedOrder.push('you');
      const place = S.finishedOrder.length;
      endCpu(place);
    } else if (S.mode === 'local') {
      S.localResults[S.turn] = { name: LOCAL_NAMES[S.turn], time: S.time, moves: S.moves, color: LOCAL_COLORS[S.turn] };
      audio.win();
      if (S.turn + 1 < S.localPlayers) {
        S.phase = 'pass'; S.banner = 'JOB DONE ' + fmt(S.time);
      } else endLocal();
    } else {
      S.phase = 'done'; S.banner = 'HOUSE POWERED'; audio.win(); S.demoRestart = 3.5;
    }
  }

  function rewards(win, place) {
    const lv = RU.LEVELS[S.level];
    const sc = RU.scoreJob(n, S.time, S.moves, S.minMoves);
    const bestKey = 'best.' + S.level;
    const prev = stat(bestKey, 0) || 0;
    let gold = 0, xp = 0;
    if (win) { gold = [15, 30, 50][S.level] + sc.stars * 5; xp = gold * 2; }
    else if (place === 2) { gold = Math.round([15, 30, 50][S.level] / 3); xp = gold; }
    const best = Math.max(prev, win || place === 2 ? sc.score : 0);
    if (best > prev) setStat(bestKey, best);
    if (gold) addGold(gold);
    if (xp) setStat('xp', (stat('xp', 0) || 0) + xp);
    if (win) setStat('wins', (stat('wins', 0) || 0) + 1);
    return { ...sc, best, gold, xp, newBest: best > prev, level: lv.name };
  }

  function endCpu(place) {
    S.phase = 'done';
    const win = place === 1;
    const second = place === 2 && stations.length > 1;
    const rw = rewards(win, second ? 2 : 9);
    win ? audio.win() : audio.lose();
    stations.forEach(s => { if (!s.done) s.fox.userData.reach = 0; });
    const lines = [];
    const all = [{ name: 'YOU', time: S.power.solved ? S.time : null, color: CAST.YOU.torso[0] }, ...stations.map(s => ({ name: s.name, time: s.done ? s.time : null, color: s.color }))];
    all.sort((a, b) => (a.time ?? 1e9) - (b.time ?? 1e9));
    all.forEach((a, i) => lines.push({ place: i + 1, name: a.name, text: a.time == null ? 'STILL WIRING' : fmt(a.time) + 's', color: hex(a.color), you: a.name === 'YOU' }));
    S.result = {
      win, title: win ? 'HOUSE POWERED' : (second ? 'SECOND PLACE' : 'TOO SLOW'),
      sub: win ? 'YOU BEAT ' + stations.map(s => s.name).join(', ') : stations.find(s => s.done)?.name + ' FINISHED FIRST',
      score: win ? rw.score : 0, best: rw.best, gold: rw.gold, xp: rw.xp, stars: win ? rw.stars : 0, newBest: rw.newBest,
      time: fmt(S.time), moves: S.moves, minMoves: S.minMoves, lines, level: rw.level
    };
    S.banner = '';
    emit();
  }

  function endLocal() {
    S.phase = 'done';
    const rs = S.localResults.slice().sort((a, b) => a.time - b.time || a.moves - b.moves);
    const w = rs[0];
    S.time = w.time; S.moves = w.moves;
    const rw = rewards(true, 1);
    S.result = {
      win: true, title: w.name + ' WINS', sub: 'FASTEST JOB ' + fmt(w.time) + 's',
      score: rw.score, best: rw.best, gold: rw.gold, xp: rw.xp, stars: rw.stars, newBest: rw.newBest,
      time: fmt(w.time), moves: w.moves, minMoves: S.minMoves, level: rw.level,
      lines: rs.map((r, i) => ({ place: i + 1, name: r.name, text: fmt(r.time) + 's  ' + r.moves + ' TURNS', color: hex(r.color), you: i === 0 }))
    };
    S.banner = '';
    emit();
  }

  function nextTurn() {
    if (S.phase !== 'pass') return;
    S.turn++;
    S.time = 0; S.moves = 0; S.idle = 0; S.celebrate = 0;
    plateMat.emissive.setHex(0x000000);
    setPlayerFox({ ...CAST.YOU, torso: [LOCAL_COLORS[S.turn], YEL, 0x1d3f7a] });
    resetForTurn();
    S.phase = 'ready'; S.readyT = 1.3; S.banner = LOCAL_NAMES[S.turn];
    fit(false);
    emit();
  }

  /* ---------- AI ---------- */
  function stepStation(s, dt) {
    if (s.done || S.phase !== 'play') return;
    s.time += dt;
    s.timer -= dt;
    if (s.timer > 0) return;
    const i = RU.aiPick(s.board, s.ai, s.R, s.mistake);
    if (i >= 0) { RU.tap(s.board, i); s.moves++; }
    s.fox.userData.reach = 1;
    s.power = RU.computePower(s.board.tiles, s.board.n, s.board.root);
    s.pct = s.power.solved ? 1 : Math.min(0.99, (s.board.tiles.filter(t => t.mask === t.solved).length) / s.board.tiles.length);
    s.timer = s.moveSec * (0.65 + s.R() * 0.7) + (s.R() < 0.18 ? s.think * 2.5 : 0);
    if (s.power.solved) {
      s.done = true; s.timeText = fmt(s.time); s.fox.userData.cheer = 1;
      S.finishedOrder.push(s.name);
      audio.cpuDone();
      if (S.mode === 'cpu' && S.finishedOrder.length === 1) S.banner = s.name + ' IS DONE';
      if (S.mode === 'cpu' && stations.every(x => x.done)) { drawMonitor(s); endCpu(stations.length + 1); return; }
    }
    drawMonitor(s);
  }

  function stepDemo(dt) {
    const d = S.demoAI;
    S.demoCapT += dt;
    if (S.demoCapT > 3.6) { S.demoCapT = 0; S.demoCap = (S.demoCap + 1) % DEMO_CAPTIONS.length; emit(); }
    if (S.phase === 'done') {
      S.demoRestart -= dt;
      if (S.demoRestart <= 0) start('demo');
      return;
    }
    if (S.phase !== 'play') return;
    d.timer -= dt;
    if (d.timer <= 0) {
      const i = RU.aiPick(S.board, d.ai, d.R, 0.08);
      d.timer = 0.75 + d.R() * 0.5;
      if (i >= 0) { tileTap(i, 'ai'); S.hintIdx = i; }
    }
  }

  /* ---------- camera fit ---------- */
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };
  const _v = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
  function fitPoints() {
    const pts = [];
    const h = n * T / 2 + 0.2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { pts.push(new THREE.Vector3(sx * h, TABLE_Y, sz * h)); pts.push(new THREE.Vector3(sx * h, TABLE_Y + 0.7, sz * h)); }
    pts.push(new THREE.Vector3(colX(S.board ? S.board.rootCol : 0), TABLE_Y + 1.3, -h - 0.4));
    if (pfox) { const x = -n * T / 2 - 0.85; pts.push(new THREE.Vector3(x - 0.5, 0.2, 0), new THREE.Vector3(x - 0.5, 3.0, 0)); }
    for (const s of stations) {
      s.group.updateMatrix();
      for (const p of [[-0.8, TABLE_Y + 1.7, 0], [0.8, TABLE_Y + 1.7, 0], [-0.8, TABLE_Y + 0.3, 0.4], [1.6, 2.9, 0.3], [1.6, 0.1, 0.3]]) {
        const v = new THREE.Vector3(...p);
        if (s.fox.position.x < 0 && p[0] === 1.6) v.x = -1.6;
        pts.push(v.applyMatrix4(s.group.matrix));
      }
    }
    return pts;
  }

  function fit(snap) {
    const { w: W, h: H } = size();
    const asp = W / H;
    camera.aspect = asp;
    camera.fov = world ? (world.camera.fov || 50) : (asp < 1 ? 52 : 38);
    camera.updateProjectionMatrix();
    const pitch = asp < 1 ? 1.08 : 0.92;
    const dir = new THREE.Vector3(0, -Math.sin(pitch), -Math.cos(pitch));
    const fx0 = (safe.left / W) * 2 - 1, fx1 = 1 - (safe.right / W) * 2;
    const fy1 = 1 - (safe.top / H) * 2, fy0 = (safe.bottom / H) * 2 - 1;
    const fw = Math.max(0.2, fx1 - fx0) * 0.94, fh = Math.max(0.2, fy1 - fy0) * 0.94;
    const gx = (fx0 + fx1) / 2, gy = (fy0 + fy1) / 2;
    const pts = fitPoints();
    const tgt = new THREE.Vector3();
    pts.forEach(p => tgt.add(p)); tgt.multiplyScalar(1 / pts.length);
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    let d = 12;
    const bbox = () => {
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) { _v.copy(p).project(camera); x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); }
      return { x0, x1, y0, y1 };
    };
    const place = dd => { camera.position.copy(tgt).addScaledVector(dir, -dd); camera.lookAt(tgt); camera.updateMatrixWorld(); };
    for (let it = 0; it < 3; it++) {
      let lo = 2, hi = 120;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2; place(mid);
        const b = bbox();
        if (b.x1 - b.x0 <= fw && b.y1 - b.y0 <= fh && b.x0 > -3 && b.y0 > -3) hi = mid; else lo = mid;
      }
      d = hi; place(d);
      const b = bbox();
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      _r.setFromMatrixColumn(camera.matrixWorld, 0); _u.setFromMatrixColumn(camera.matrixWorld, 1);
      tgt.addScaledVector(_r, (cx - gx) * d * tanH * asp);
      tgt.addScaledVector(_u, (cy - gy) * d * tanH);
    }
    place(d);
    camGoal.pos.copy(camera.position); camGoal.tgt.copy(tgt);
    if (snap) camTgt.copy(tgt);
    else { camera.position.copy(camCur.pos); camera.lookAt(camCur.tgt); }
    if (snap) { camCur.pos.copy(camGoal.pos); camCur.tgt.copy(camGoal.tgt); }
  }
  const camCur = { pos: camera.position.clone(), tgt: camTgt.clone() };

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WIRE_Y);
  const ndc = new THREE.Vector2();
  function pickTile(clientX, clientY) {
    if (!S.board) return -1;
    const rc = dom.getBoundingClientRect();
    ndc.set(((clientX - rc.left) / rc.width) * 2 - 1, -((clientY - rc.top) / rc.height) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, hit)) return -1;
    const c = Math.round(hit.x / T + (n - 1) / 2), r = Math.round(hit.z / T + (n - 1) / 2);
    if (r < 0 || c < 0 || r >= n || c >= n) return -1;
    if (Math.abs(hit.x - colX(c)) > 0.52 || Math.abs(hit.z - rowZ(r)) > 0.52) return -1;
    return r * n + c;
  }

  let press = null;
  function onDown(e) {
    if (world && e.target !== dom) return;
    if (world) { e.preventDefault(); e.stopImmediatePropagation(); }
    audio.resume();
    S.idle = 0; S.hintIdx = -1; S.cursor.on = false;
    if (S.mode === 'demo') { start('cpu'); return; }
    if (S.phase !== 'play' || S.paused) return;
    const i = pickTile(e.clientX, e.clientY);
    if (i < 0) return;
    if (press && press.timer) clearTimeout(press.timer);
    press = { id: e.pointerId, i, x: e.clientX, y: e.clientY, done: false };
    press.timer = setTimeout(() => { if (press && !press.done) { press.done = true; tileLock(press.i); } }, 430);
  }
  function onMove(e) {
    if (!press || e.pointerId !== press.id) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 14) { clearTimeout(press.timer); press = null; }
  }
  function onUp(e) {
    if (!press || e.pointerId !== press.id) return;
    clearTimeout(press.timer);
    if (!press.done) { press.done = true; tileTap(press.i); }
    press = null;
  }
  const cap = world ? true : false;
  const target = world ? window : dom;
  target.addEventListener('pointerdown', onDown, cap);
  window.addEventListener('pointermove', onMove, cap);
  window.addEventListener('pointerup', onUp, cap);
  window.addEventListener('pointercancel', onUp, cap);

  function key(e) {
    const k = e.key;
    audio.resume();
    if (S.mode === 'demo' && (k === 'Enter' || k === ' ')) { start('cpu'); return; }
    if (S.phase === 'pass' && (k === 'Enter' || k === ' ')) { nextTurn(); return; }
    if (S.phase !== 'play' || S.paused) return;
    const c = S.cursor;
    let used = true;
    if (k === 'ArrowUp' || k === 'w') c.r = Math.max(0, c.r - 1);
    else if (k === 'ArrowDown' || k === 's') c.r = Math.min(n - 1, c.r + 1);
    else if (k === 'ArrowLeft' || k === 'a') c.c = Math.max(0, c.c - 1);
    else if (k === 'ArrowRight' || k === 'd') c.c = Math.min(n - 1, c.c + 1);
    else if (k === ' ' || k === 'Enter') tileTap(c.r * n + c.c);
    else if (k === 'l' || k === 'L') tileLock(c.r * n + c.c);
    else if (k === 'h' || k === 'H') S.idle = 99;
    else used = false;
    if (used) { c.on = true; if (k !== 'h' && k !== 'H') S.idle = 0; if (e.preventDefault) e.preventDefault(); }
  }
  const onKey = e => { if (e.target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) return; key(e); };
  if (!world) window.addEventListener('keydown', onKey);

  /* ---------- resize ---------- */
  let ro = null, lastAspectClass = null;
  function resize() {
    const { w, h } = size();
    if (renderer) renderer.setSize(w, h, false);
    const cls = w / h < 1.05;
    if (cls !== lastAspectClass) { lastAspectClass = cls; layoutStations(); }
    fit(false);
  }
  if (!world && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(container); }

  /* ---------- HUD ---------- */
  let lastEmit = 0;
  const hintPos = new THREE.Vector3();
  function hud() {
    const p = S.power || { lit: 0, fixtures: 0, loose: 0 };
    const lv = RU.LEVELS[S.level];
    let hint = null;
    if (S.hintIdx >= 0 && view && (S.phase === 'play') && S.mode !== 'demo') {
      const t = S.board.tiles[S.hintIdx];
      hintPos.set(colX(t.c), WIRE_Y, rowZ(t.r)).project(camera);
      const { w, h } = size();
      hint = { x: Math.round((hintPos.x + 1) / 2 * w), y: Math.round((1 - hintPos.y) / 2 * h) };
    }
    let caption = '';
    if (S.mode === 'demo') caption = DEMO_CAPTIONS[S.demoCap];
    else if (S.phase === 'play') caption = p.loose > 0 ? 'SPARKS: LOOSE LIVE WIRE. TURN IT TO MEET A NEIGHBOUR.' : (S.moves < 3 ? 'TAP A TILE TO TURN IT. HOLD TO LOCK IT.' : 'LIGHT EVERY FIXTURE. NO LOOSE WIRES.');
    else if (S.phase === 'pass') caption = 'PASS THE PHONE TO ' + LOCAL_NAMES[S.turn + 1] + '.';
    const players = [];
    if (S.mode === 'cpu' || S.mode === 'demo') {
      players.push({ name: S.mode === 'demo' ? 'HOPE' : 'YOU', color: hex(S.mode === 'demo' ? 0x2f6fd6 : 0x2f6fd6), pct: Math.round((p.lit / Math.max(1, p.fixtures)) * 100), done: !!(S.power && S.power.solved), time: fmt(S.time), you: S.mode !== 'demo' });
      stations.forEach(s => players.push({ name: s.name, color: hex(s.color), pct: Math.round(s.pct * 100), done: s.done, time: s.done ? s.timeText : fmt(s.time), you: false }));
    } else {
      for (let i = 0; i < S.localPlayers; i++) {
        const r = S.localResults[i];
        players.push({ name: LOCAL_NAMES[i], color: hex(LOCAL_COLORS[i]), pct: r ? 100 : (i === S.turn ? Math.round((p.lit / Math.max(1, p.fixtures)) * 100) : 0), done: !!r, time: r ? fmt(r.time) : (i === S.turn ? fmt(S.time) : '--'), you: i === S.turn });
      }
    }
    return {
      key: KEY, phase: S.phase, mode: S.mode, paused: S.paused,
      level: S.level, levelName: lv.name, levels: RU.LEVELS.map(l => ({ id: l.id, name: l.name, opp: l.opp, size: l.size })),
      opponent: lv.opp, opponents: S.opponents, localPlayers: S.localPlayers,
      size: n, time: S.time, timeText: fmt(S.time), par: RU.parTime(n),
      moves: S.moves, minMoves: S.minMoves, lit: p.lit, fixtures: p.fixtures, loose: p.loose,
      locked: S.board ? S.board.tiles.filter(t => t.locked).length : 0,
      players, turn: S.turn, turnName: LOCAL_NAMES[S.turn],
      pass: S.phase === 'pass' ? { next: LOCAL_NAMES[S.turn + 1], done: LOCAL_NAMES[S.turn], time: fmt(S.time) } : null,
      banner: S.banner, caption, hint, result: S.result,
      sound: audio.sfx, music: audio.music, world: !!world,
      best: stat('best.' + S.level, 0) || 0, gold: save ? null : (stat('gold', 0) || 0)
    };
  }
  let lastHud = null;
  function emit() { lastHud = hud(); try { onState(lastHud); } catch (e) { console.error(e); } }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), clock = 0, alive = true;
  const q = new THREE.Quaternion();
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    clock += dt;
    if (world) {
      const { w, h } = size();
      if (Math.abs(camera.aspect - w / h) > 0.001) { const cls = w / h < 1.05; if (cls !== lastAspectClass) { lastAspectClass = cls; layoutStations(); } fit(false); }
    }
    if (!S.paused) update(dt);
    /* camera glide */
    const k = 1 - Math.exp(-dt * 5);
    camCur.pos.lerp(camGoal.pos, k); camCur.tgt.lerp(camGoal.tgt, k);
    camera.position.copy(camCur.pos); camera.lookAt(camCur.tgt);
    camera.updateMatrixWorld();
    if (world) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      scene.getWorldQuaternion(q); wcam.quaternion.copy(q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    } else {
      renderer.render(scene, camera);
    }
    if (now - lastEmit > 100) { lastEmit = now; emit(); }
  }

  function update(dt) {
    if (!view) return;
    const t = clock;
    if (S.phase === 'ready') {
      S.readyT -= dt;
      if (S.readyT <= 0) { S.phase = 'play'; S.banner = 'GO'; audio.go(); setTimeout(() => { if (S.banner === 'GO') { S.banner = ''; emit(); } }, 700); emit(); }
    } else if (S.phase === 'play') {
      S.time += dt;
      S.idle += dt;
      if (S.idle > 3 && S.mode !== 'demo' && S.hintIdx < 0) { S.hintIdx = RU.hintTile(S.board, S.power); emit(); }
    }
    /* tiles turn toward their goal angle */
    for (const v of view.tiles) {
      const goal = -v.turns * Math.PI / 2;
      v.angle += (goal - v.angle) * (1 - Math.exp(-dt * (view.spinIn > 0 ? 6 : 22)));
      v.tg.rotation.y = v.angle;
      if (v.fx && v.fx.spin && v.lit) v.fx.spin.rotation.y += dt * 14;
    }
    view.spinIn = Math.max(0, view.spinIn - dt);
    /* hint ring */
    if (S.hintIdx >= 0 && (S.phase === 'play')) {
      const tt = S.board.tiles[S.hintIdx];
      view.ring.visible = true;
      view.ring.position.set(colX(tt.c), WIRE_Y + 0.07, rowZ(tt.r));
      view.ring.scale.setScalar(1 + Math.sin(t * 7) * 0.1);
    } else view.ring.visible = false;
    view.cur.visible = S.cursor.on && S.phase === 'play';
    if (view.cur.visible) view.cur.position.set(colX(S.cursor.c), WIRE_Y + 0.06, rowZ(S.cursor.r));
    /* sparks at loose live ends */
    const sp = view.sparks.geometry.attributes.position;
    let k = 0;
    if (view.loose) for (const [x, z] of view.loose) for (let j = 0; j < 3 && k < 64; j++) sp.setXYZ(k++, x + (Math.random() - 0.5) * 0.18, WIRE_Y + 0.05 + Math.random() * 0.2, z + (Math.random() - 0.5) * 0.18);
    sp.needsUpdate = true; view.sparks.geometry.setDrawRange(0, k);
    view.sparks.material.size = 0.4 + Math.random() * 0.35;
    view.glows.material.size = 1.0 + Math.sin(t * 3) * 0.08;
    /* AI */
    if (S.mode === 'cpu') for (const s of stations) stepStation(s, dt);
    else if (S.mode === 'demo') { stepDemo(dt); for (const s of stations) { stepStation(s, dt); if (s.done && S.phase === 'play') { /* PIP keeps cheering */ } } }
    /* foxes */
    if (pfox) {
      const tz = pfox.userData.z || 0;
      const dz = tz - pfox.position.z;
      const sp2 = Math.abs(dz) > 0.05 ? 1 : 0;
      pfox.position.z += Math.sign(dz) * Math.min(Math.abs(dz), dt * 4.5);
      pfox.position.x = -n * T / 2 - 0.85;
      pfox.rotation.y = Math.PI / 2 + (sp2 ? Math.sign(dz) * -0.6 : 0);
      animFox(pfox, dt, sp2, t);
      if (pfox.userData.shadow) pfox.userData.shadow.position.set(pfox.position.x, 0.03, pfox.position.z);
      if (S.celebrate > 0) { S.celebrate -= dt; pfox.position.y = Math.abs(Math.sin(t * 9)) * 0.35; if (S.celebrate <= 0) { pfox.position.y = 0; pfox.userData.cheer = 0; } }
    }
    for (const s of stations) {
      animFox(s.fox, dt, 0, t);
      if (s.done) s.fox.position.y = (s.fox.userData.sit ? 0 : Math.abs(Math.sin(t * 8)) * 0.25);
    }
  }

  /* ---------- API ---------- */
  function setSafe(s = {}) {
    let ch = false;
    for (const k of ['top', 'bottom', 'left', 'right']) { const v = Math.max(0, +s[k] || 0); if (v !== safe[k]) { safe[k] = v; ch = true; } }
    if (ch) fit(false);
  }

  const api = {
    hud: () => lastHud || hud(),
    setSafe,
    start(mode) { audio.resume(); start(mode || 'cpu'); },
    key,
    get camera() { return world ? wcam : camera; },
    snapCam() { camCur.pos.copy(camGoal.pos); camCur.tgt.copy(camGoal.tgt); camera.position.copy(camGoal.pos); camera.lookAt(camGoal.tgt); camera.updateMatrixWorld(); },
    restart() { audio.resume(); start(S.mode === 'demo' ? 'cpu' : S.mode); },
    playAgain() { audio.resume(); start(S.mode === 'demo' ? 'cpu' : S.mode); },
    nextTurn() { audio.resume(); nextTurn(); },
    setLevel(l) { S.level = Math.max(0, Math.min(2, l | 0)); setStat('level', S.level); start(S.mode === 'demo' ? 'cpu' : S.mode); },
    setOpponents(k) { S.opponents = Math.max(1, Math.min(3, k | 0)); setStat('opponents', S.opponents); start('cpu'); },
    setLocalPlayers(k) { S.localPlayers = Math.max(2, Math.min(4, k | 0)); start('local'); },
    hint() { if (S.phase === 'play') { S.hintIdx = RU.hintTile(S.board, S.power); emit(); } },
    tap(i) { return tileTap(i); },
    lock(i) { tileLock(i); },
    pause(on) { S.paused = !!on; emit(); },
    toggleSound() { audio.setSfx(!audio.sfx); setStat('sound', audio.sfx); emit(); },
    toggleMusic() { audio.setMusic(!audio.music); if (!world) setStat('music', audio.music); emit(); },
    /* test hook: solve the board by itself */
    autoSolve() { if (S.phase !== 'play') return; for (const t of S.board.tiles) { t.locked = false; while (t.mask !== t.solved) { RU.tap(S.board, t.i); view.tiles[t.i].turns++; S.moves++; } } refreshPower(false); if (S.power.solved) finishPlayer(); emit(); },
    destroy() {
      alive = false; cancelAnimationFrame(raf);
      target.removeEventListener('pointerdown', onDown, cap);
      window.removeEventListener('pointermove', onMove, cap);
      window.removeEventListener('pointerup', onUp, cap);
      window.removeEventListener('pointercancel', onUp, cap);
      if (!world) window.removeEventListener('keydown', onKey);
      if (ro) ro.disconnect();
      if (press && press.timer) clearTimeout(press.timer);
      audio.close();
      clearStations();
      if (view) disposeTree(view.group, true);
      if (pfox) disposeTree(pfox, true);
      if (world) { world.parent.remove(scene); }
      else {
        disposeTree(scene, false);
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      mats.forEach(m => m.dispose && m.dispose());
      glowTex.dispose(); sparkTex.dispose(); GRAD.dispose();
    }
  };

  /* go: the game starts at once */
  start(S.mode);
  resize();
  fit(true);
  raf = requestAnimationFrame(frame);
  return api;
}

export default createElectricianJob;
