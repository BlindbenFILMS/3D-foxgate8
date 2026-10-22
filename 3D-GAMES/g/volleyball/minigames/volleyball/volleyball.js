/* 8 GATES 3D - VOLLEYBALL (beach 2 v 2)
   Game module: scene, rules flow, AI, camera, input. ES module, three.js r160 only.
   Standalone: makes its own renderer inside `container`.
   World mode: opts.world = { renderer, camera, parent } - builds only the court into a Group under parent. */

import * as THREE from '../../vendor/three/three.module.js';
import * as R from './volleyball-rules.js';
import { createAudio } from './volleyball-audio.js';

export const GAME = { key: 'volleyballCourt', name: 'VOLLEYBALL', maxPlayers: 4 };

const C = R.COURT;
const INK = 0x1a1626;
const ANIM_DUR = { pass: 0.45, set: 0.45, spike: 0.55, tip: 0.45, over: 0.45, block: 0.7, serve: 0.75, dive: 0.8, swing: 0.4 };

const DEMO_LINES = [
  'DEMO: TWO AI TEAMS SHOW YOU HOW IT WORKS.',
  'EACH SIDE GETS THREE TOUCHES: PASS, SET, SPIKE.',
  'TAP WHEN THE YELLOW RING CLOSES ON THE BALL.',
  'LISTEN: FOUR BEEPS. TAP ON THE LAST ONE.',
  'BALL LANDS IN THEIR SAND: YOUR POINT.',
  'HIT IT OUT OR INTO THE NET: THEIR POINT.',
  'SEE IT FLYING OUT? LET IT DROP.',
  'HOLD TO SERVE. RELEASE INSIDE THE WHITE ZONE.',
  'TAP THEIR COURT TO AIM YOUR SPIKE.',
  'FIRST TO 11 WINS. YOU MUST LEAD BY TWO.',
  'OPEN MENU TO PLAY PIP, HOPE OR NOBLE.'
];

const LINES = {
  pip:   { win: ['YES! DID YOU SEE THAT?', 'I DID IT!'], lose: ['OOPS. MY BAD!', 'HOW DID YOU DO THAT?'] },
  hope:  { win: ['I HEARD THAT ONE COMING.', 'THE SAND TELLS ME WHERE.'], lose: ['NICE. I WILL LISTEN CLOSER.', 'GOOD HIT. LOUD, TOO.'] },
  noble: { win: ['PREDICTABLE.', 'MY CHAIR SAW IT FIRST.'], lose: ['A MINOR MALFUNCTION.', 'RECALIBRATING.'] }
};

/* ------------------------------------------------------------------ helpers */

const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}

/* merge parts [{ g, c, m }] into one non-indexed geometry with vertex colours */
function bake(parts) {
  let n = 0;
  const ready = parts.map((p) => {
    const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
    if (p.m) g.applyMatrix4(p.m);
    n += g.attributes.position.count;
    return [g, new THREE.Color(p.c == null ? 0xffffff : p.c)];
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const [g, c] of ready) {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += cnt;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

/* an outline copy: pushed out along normals (boxes are scaled instead) */
function pushed(g, t) {
  const isBox = g.type === 'BoxGeometry';
  const q = g.index ? g.toNonIndexed() : g.clone();
  const P = q.attributes.position, N = q.attributes.normal;
  if (isBox) {
    q.computeBoundingBox();
    const b = q.boundingBox, c = new THREE.Vector3(), h = new THREE.Vector3();
    b.getCenter(c); b.getSize(h).multiplyScalar(0.5);
    for (let i = 0; i < P.count; i++) {
      P.setXYZ(i,
        c.x + (P.getX(i) - c.x) * (h.x > 1e-4 ? (h.x + t) / h.x : 1),
        c.y + (P.getY(i) - c.y) * (h.y > 1e-4 ? (h.y + t) / h.y : 1),
        c.z + (P.getZ(i) - c.z) * (h.z > 1e-4 ? (h.z + t) / h.z : 1));
    }
  } else {
    for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) + N.getX(i) * t, P.getY(i) + N.getY(i) * t, P.getZ(i) + N.getZ(i) * t);
  }
  return q;
}

function shellOf(parts, t) {
  return bake(parts.map((p) => ({ g: pushed(p.g, p.t == null ? t : p.t), c: INK, m: p.m })));
}

function makeStore(save) {
  const K = GAME.key + '.';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(K + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };
  return {
    get(k, d) {
      if (save && typeof save.stat === 'function') { try { const v = save.stat(K + k, d); return v == null ? d : v; } catch (e) { /* fall back */ } }
      return ls.get(k, d);
    },
    set(k, v) {
      if (save && typeof save.setStat === 'function') { try { save.setStat(K + k, v); return; } catch (e) { /* fall back */ } }
      ls.set(k, v);
    },
    gold(n) {
      if (save && typeof save.addGold === 'function') { try { save.addGold(n); return; } catch (e) { /* fall back */ } }
      ls.set('gold', (ls.get('gold', 0) || 0) + n);
    },
    total() { return save ? null : ls.get('gold', 0); }
  };
}

/* ------------------------------------------------------------------ the game */

export async function createVolleyball({ container, onState = () => {}, opts = {} } = {}) {
  const world = opts.world || null;
  const kit = opts.kit || null;
  const rnd = Math.random;
  const isTouch = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
  const store = makeStore(opts.save);
  const settings = Object.assign({ sound: true, music: true, ballSound: false, autoRun: true, points: 11, diff: 0 }, store.get('settings', {}) || {});
  if (world) settings.music = false;
  if (opts.diff != null) settings.diff = opts.diff | 0;
  settings.diff = R.clamp(settings.diff | 0, 0, 2);
  const audio = createAudio({ sound: settings.sound, music: settings.music });
  audio.setBallSound(settings.ballSound);

  /* ---------- renderer, scene ---------- */
  let renderer, scene, envRoot;
  if (world) {
    renderer = world.renderer;
    scene = new THREE.Group();
    scene.name = GAME.key;
    world.parent.add(scene);
    envRoot = new THREE.Scene(); /* throw-away: lights, sky and beach never touch the town */
  } else {
    renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.6 : 2));
    const el = renderer.domElement;
    el.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent';
    container.appendChild(el);
    scene = new THREE.Scene();
    envRoot = scene;
  }
  const canvas = renderer.domElement;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  const wcam = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  const ray = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const grad = new THREE.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  const toon = (c, x = {}) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, x));
  const VCM = toon(0xffffff, { vertexColors: true });
  const INKM = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

  function inkMesh(parts, mat = VCM, t = 0.05) {
    const m = new THREE.Mesh(bake(parts), mat);
    if (t > 0) m.add(new THREE.Mesh(shellOf(parts, t), INKM));
    return m;
  }

  const court = new THREE.Group();
  scene.add(court);

  /* ---------- court (the playable object, always built) ---------- */
  let netMesh, ballMesh, ballShadow, crowd = null;
  const flatCircle = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });

  function buildCourt() {
    const pitW = C.halfW + 3.2, pitL = C.halfL + 3.6;
    const sand = new THREE.Mesh(new THREE.BoxGeometry(pitW * 2, 0.14, pitL * 2), toon('#f3d38c'));
    sand.position.y = -0.05;
    court.add(sand);

    const wood = '#b7773d', bw = 0.3;
    court.add(inkMesh([
      { g: new THREE.BoxGeometry(pitW * 2 + bw * 2, 0.3, bw), c: wood, m: M(0, 0.03, pitL + bw / 2) },
      { g: new THREE.BoxGeometry(pitW * 2 + bw * 2, 0.3, bw), c: wood, m: M(0, 0.03, -pitL - bw / 2) },
      { g: new THREE.BoxGeometry(bw, 0.3, pitL * 2), c: wood, m: M(pitW + bw / 2, 0.03, 0) },
      { g: new THREE.BoxGeometry(bw, 0.3, pitL * 2), c: wood, m: M(-pitW - bw / 2, 0.03, 0) }
    ]));

    const lw = 0.14, blue = '#1f4fd8';
    court.add(new THREE.Mesh(bake([
      { g: new THREE.BoxGeometry(lw, 0.03, C.halfL * 2 + lw), c: blue, m: M(C.halfW, 0.035, 0) },
      { g: new THREE.BoxGeometry(lw, 0.03, C.halfL * 2 + lw), c: blue, m: M(-C.halfW, 0.035, 0) },
      { g: new THREE.BoxGeometry(C.halfW * 2 + lw, 0.03, lw), c: blue, m: M(0, 0.035, C.halfL) },
      { g: new THREE.BoxGeometry(C.halfW * 2 + lw, 0.03, lw), c: blue, m: M(0, 0.035, -C.halfL) }
    ]), new THREE.MeshBasicMaterial({ vertexColors: true })));

    /* poles, tapes, antennas */
    const parts = [];
    for (const s of [-1, 1]) {
      parts.push({ g: new THREE.CylinderGeometry(0.13, 0.15, C.netH + 0.5, 12), c: '#e9e4da', m: M(s * C.netHalfW, (C.netH + 0.5) / 2, 0) });
      parts.push({ g: new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), c: '#ec3013', m: M(s * C.netHalfW, C.netH + 0.5, 0) });
      for (let i = 0; i < 9; i++) {
        parts.push({ g: new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), c: i % 2 ? '#ffffff' : '#ec3013', m: M(s * C.halfW, C.netH - C.netBand + 0.1 + i * 0.2, 0) });
      }
    }
    parts.push({ g: new THREE.BoxGeometry(C.netHalfW * 2, 0.1, 0.05), c: '#ffffff', m: M(0, C.netH - 0.05, 0) });
    parts.push({ g: new THREE.BoxGeometry(C.netHalfW * 2, 0.06, 0.04), c: '#ffffff', m: M(0, C.netH - C.netBand, 0) });
    court.add(inkMesh(parts, VCM, 0.035));

    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d');
    x.strokeStyle = '#1a1626'; x.lineWidth = 2;
    for (let i = 0; i <= 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set((C.netHalfW * 2) / 0.8, C.netBand / 0.8);
    tex.colorSpace = THREE.SRGBColorSpace;
    netMesh = new THREE.Mesh(new THREE.PlaneGeometry(C.netHalfW * 2, C.netBand - 0.1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
    netMesh.position.y = C.netH - C.netBand / 2 - 0.05;
    court.add(netMesh);

    /* ball */
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 128;
    const b = bc.getContext('2d');
    const cols = ['#ffd23a', '#1f4fd8', '#ffffff'];
    for (let i = 0; i < 6; i++) { b.fillStyle = cols[i % 3]; b.fillRect(i * 256 / 6, 0, 256 / 6 + 1, 128); }
    b.fillStyle = '#ffffff'; b.fillRect(0, 0, 256, 10); b.fillRect(0, 118, 256, 10);
    const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace;
    const bg = new THREE.SphereGeometry(C.ballR, 22, 14);
    ballMesh = new THREE.Mesh(bg, toon(0xffffff, { map: btex }));
    ballMesh.add(new THREE.Mesh(pushed(bg, 0.04), INKM));
    court.add(ballMesh);
    ballShadow = new THREE.Mesh(flatCircle, shadowMat);
    ballShadow.position.y = 0.04;
    court.add(ballShadow);
  }

  /* ---------- beach around the court (standalone only, never in the town) ---------- */
  function buildEnv() {
    envRoot.background = new THREE.Color('#8fd6ff');
    envRoot.fog = new THREE.Fog('#bfe7ff', 80, 220);
    envRoot.add(new THREE.HemisphereLight('#ffffff', '#d8b878', 1.7));
    const sun = new THREE.DirectionalLight('#fff4e0', 2.3);
    sun.position.set(8, 20, 12);
    envRoot.add(sun);

    const beach = new THREE.Mesh(new THREE.PlaneGeometry(500, 500).rotateX(-Math.PI / 2), toon('#edd28f'));
    beach.position.y = -0.08;
    envRoot.add(beach);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 300).rotateX(-Math.PI / 2), toon('#2fb5d8'));
    sea.position.set(0, -0.04, -40 - 150);
    envRoot.add(sea);

    const P = [];
    P.push({ g: new THREE.BoxGeometry(700, 0.05, 1.2), c: '#ffffff', m: M(0, -0.02, -40) });
    P.push({ g: new THREE.BoxGeometry(700, 0.05, 0.6), c: '#bff0ff', m: M(0, -0.02, -52) });
    const palm = (px, pz, s) => {
      let x0 = px, y0 = 0, lean = 0.06 * s;
      for (let i = 0; i < 6; i++) {
        P.push({ g: new THREE.CylinderGeometry(0.24 - i * 0.015, 0.3 - i * 0.015, 1.3, 8), c: i % 2 ? '#a8723f' : '#8e5d31', m: M(x0, y0 + 0.65, pz, 0, 0, -lean * i) });
        x0 += Math.sin(lean * i) * 1.3; y0 += Math.cos(lean * i) * 1.25;
      }
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        P.push({ g: new THREE.BoxGeometry(0.5, 0.08, 3.2), c: k % 2 ? '#2f9e4a' : '#3cbf5b', m: M(x0 + Math.sin(a) * 1.4, y0 - 0.25, pz + Math.cos(a) * 1.4, 0.35, a, 0) });
      }
      P.push({ g: new THREE.SphereGeometry(0.22, 8, 6), c: '#5a3a1e', m: M(x0 + 0.25, y0 - 0.25, pz) });
      P.push({ g: new THREE.SphereGeometry(0.22, 8, 6), c: '#5a3a1e', m: M(x0 - 0.2, y0 - 0.3, pz + 0.2) });
    };
    [[-15, -22, 1], [15, -26, -1], [-18, 6, 1], [17, 10, -1], [-13, 24, 1], [14, 28, -1], [-26, -8, -1], [26, -3, 1]].forEach((p) => palm(p[0], p[1], p[2]));

    /* bleachers both sides */
    for (const s of [-1, 1]) {
      for (let st = 0; st < 3; st++) {
        P.push({ g: new THREE.BoxGeometry(1.4, 0.6 + st * 0.6, 16), c: st % 2 ? '#ffffff' : '#ec3013', m: M(s * (12.6 + st * 1.4), (0.6 + st * 0.6) / 2, 0) });
      }
    }
    /* umbrellas */
    [[-20, -14, '#ec3013'], [21, -16, '#ffd23a'], [-21, 16, '#1f4fd8'], [20, 18, '#ec3013']].forEach(([ux, uz, c]) => {
      P.push({ g: new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6), c: '#ffffff', m: M(ux, 1.6, uz) });
      P.push({ g: new THREE.ConeGeometry(2.1, 0.9, 10), c, m: M(ux, 3.4, uz) });
      P.push({ g: new THREE.BoxGeometry(1.2, 0.08, 2.2), c: '#ffffff', m: M(ux + 1.6, 0.3, uz) });
    });
    /* clouds */
    for (let i = 0; i < 7; i++) {
      const cx = -90 + i * 30, cy = 34 + (i % 3) * 6, cz = -150 - (i % 2) * 30;
      for (let j = 0; j < 4; j++) P.push({ g: new THREE.SphereGeometry(4 + (j % 2) * 2, 10, 8), c: '#ffffff', m: M(cx + j * 5, cy + (j % 2) * 2, cz, 0, 0, 0, 1, 0.6, 1) });
    }
    envRoot.add(inkMesh(P, VCM, 0.06));

    /* crowd heads, bounce on points */
    const H = [];
    const shirt = ['#ec3013', '#ffd23a', '#1f4fd8', '#ffffff', '#2f9e4a', '#ef7d2d'];
    let n = 0;
    for (const s of [-1, 1]) {
      for (let st = 0; st < 3; st++) {
        for (let i = 0; i < 9; i++) {
          const z = -7 + i * 1.75 + (st % 2) * 0.8;
          const x = s * (12.6 + st * 1.4), y = 0.6 + st * 0.6;
          H.push({ g: new THREE.CapsuleGeometry(0.32, 0.4, 3, 8), c: shirt[(n++) % shirt.length], m: M(x, y + 0.55, z) });
          H.push({ g: new THREE.SphereGeometry(0.28, 10, 8), c: '#e8742a', m: M(x, y + 1.25, z) });
        }
      }
    }
    crowd = inkMesh(H, VCM, 0.04);
    envRoot.add(crowd);
  }

  buildCourt();
  if (!world) buildEnv();

  /* timing rings (one set per human), aim marker, serve marker, impact ring */
  function ringSet(color) {
    const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const outer = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.0, 48), mat(color, 1));
    const target = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 40), mat(0xffffff, 0.95));
    const back = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.54, 40), mat(INK, 0.6));
    outer.renderOrder = 22; target.renderOrder = 21; back.renderOrder = 20;
    const g = new THREE.Group(); g.add(back, target, outer); g.visible = false;
    court.add(g);
    return { g, outer, target, tick: -1, key: null };
  }
  const rings = { 1: ringSet(0xffd23a), 2: ringSet(0x7fd3ff) };
  const flatRing = (r0, r1, c) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false }));
    m.position.y = 0.06; m.visible = false; court.add(m); return m;
  };
  const aimMark = flatRing(0.45, 0.62, 0xec3013);
  const serveMark = flatRing(0.55, 0.75, 0xffd23a);
  const impact = flatRing(0.8, 1.0, 0xffffff);
  let aimUntil = 0, impactT = -9;

  /* ---------- foxes ---------- */
  function placeholderFox(o) {
    const fur = o.torso[1], jersey = o.torso[0], cream = o.torso[2], legC = o.legs || fur, dark = '#2b211c', eyeC = o.eyes || '#14101c';
    const root = new THREE.Group(), rig = new THREE.Group();
    root.add(rig);
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
    const sph = (r) => new THREE.SphereGeometry(r, 14, 10);
    const body = inkMesh([
      { g: cap(0.44, 0.45), c: jersey, m: M(0, 0, 0) },
      { g: new THREE.CylinderGeometry(0.455, 0.455, 0.09, 14), c: '#ffffff', m: M(0, 0.18, 0) },
      { g: new THREE.CylinderGeometry(0.47, 0.46, 0.3, 14), c: '#1d1a2b', m: M(0, -0.42, 0) },
      { g: new THREE.SphereGeometry(1, 14, 10), c: fur, m: M(0, -0.2, -0.78, 0.6, 0, 0, 0.26, 0.26, 0.55) },
      { g: sph(0.16), c: cream, m: M(0, 0.1, -1.24) }
    ]);
    body.position.y = 1.42;
    rig.add(body);
    const legs = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(s * 0.24, 0.95, 0);
      g.add(inkMesh([{ g: cap(0.17, 0.5), c: legC, m: M(0, -0.42, 0) }, { g: new THREE.BoxGeometry(0.28, 0.14, 0.44), c: dark, m: M(0, -0.86, 0.08) }]));
      rig.add(g); return g;
    });
    const arms = [-1, 1].map((s) => {
      const g = new THREE.Group(); g.position.set(s * 0.58, 1.86, 0);
      g.add(inkMesh([
        { g: cap(0.12, 0.46), c: fur, m: M(0, -0.34, 0) },
        { g: new THREE.CylinderGeometry(0.16, 0.15, 0.24, 10), c: jersey, m: M(0, -0.06, 0) },
        { g: sph(0.15), c: dark, m: M(0, -0.7, 0) }
      ], VCM, 0.04));
      rig.add(g); return g;
    });
    const head = new THREE.Group(); head.position.set(0, 2.24, 0);
    head.add(inkMesh([
      { g: sph(0.4), c: fur, m: M(0, 0, 0, 0, 0, 0, 1, 0.95, 1) },
      { g: sph(0.27), c: cream, m: M(0, -0.13, 0.2, 0, 0, 0, 1.15, 0.8, 1) },
      { g: new THREE.ConeGeometry(0.17, 0.44, 12), c: cream, m: M(0, -0.1, 0.5, Math.PI / 2, 0, 0) },
      { g: sph(0.075), c: dark, m: M(0, -0.08, 0.72) },
      { g: sph(0.065), c: eyeC, m: M(-0.15, 0.07, 0.35) },
      { g: sph(0.065), c: eyeC, m: M(0.15, 0.07, 0.35) },
      { g: new THREE.ConeGeometry(0.17, 0.44, 10), c: fur, m: M(-0.23, 0.42, -0.02, 0, 0, 0.18) },
      { g: new THREE.ConeGeometry(0.17, 0.44, 10), c: fur, m: M(0.23, 0.42, -0.02, 0, 0, -0.18) },
      { g: new THREE.ConeGeometry(0.09, 0.17, 8), c: dark, m: M(-0.27, 0.58, -0.02, 0, 0, 0.18) },
      { g: new THREE.ConeGeometry(0.09, 0.17, 8), c: dark, m: M(0.27, 0.58, -0.02, 0, 0, -0.18) }
    ]));
    rig.add(head);
    root.userData.P = { body, head, arms, legs, rig };
    return root;
  }

  /* the adapter: the world's fox maker when it is given, else the placeholder */
  function makeFox(o) {
    if (kit && typeof kit.makeFox === 'function') {
      try {
        const f = kit.makeFox({ torso: o.torso, outfit: o.outfit || 'tee', mood: o.mood || 'happy' });
        if (f && f.userData && f.userData.P) { f.userData.kit = true; return f; }
      } catch (e) { /* fall back to the placeholder */ }
    }
    return placeholderFox(o);
  }

  function addExtras(fox, extra) {
    const P = fox.userData.P;
    if (extra === 'hope') {
      const glasses = new THREE.Mesh(bake([
        { g: new THREE.BoxGeometry(0.26, 0.14, 0.06), c: '#0b0b10', m: M(-0.15, 0, 0) },
        { g: new THREE.BoxGeometry(0.26, 0.14, 0.06), c: '#0b0b10', m: M(0.15, 0, 0) },
        { g: new THREE.BoxGeometry(0.7, 0.04, 0.04), c: '#0b0b10', m: M(0, 0.04, -0.02) }
      ]), new THREE.MeshBasicMaterial({ vertexColors: true }));
      glasses.position.set(0, 0.07, 0.38);
      P.head.add(glasses);
      const cane = inkMesh([
        { g: new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), c: '#ffffff', m: M(0, 0, 0) },
        { g: new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6), c: '#ec3013', m: M(0, -0.72, 0) }
      ], VCM, 0.025);
      cane.position.set(0, 0.1, -0.5); cane.rotation.z = 0.75;
      P.body.add(cane);
    } else if (extra === 'pip') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.05, 6, 20).rotateX(Math.PI / 2), toon('#ffffff'));
      band.position.y = 0.16;
      P.head.add(band);
    } else if (extra === 'noble') {
      const chair = new THREE.Group();
      chair.add(inkMesh([
        { g: new THREE.BoxGeometry(1.25, 0.22, 1.1), c: '#232035', m: M(0, 1.0, -0.05) },
        { g: new THREE.BoxGeometry(1.25, 1.35, 0.2), c: '#232035', m: M(0, 1.72, -0.62) },
        { g: new THREE.BoxGeometry(1.25, 0.06, 0.22), c: '#ec3013', m: M(0, 2.42, -0.62) },
        { g: new THREE.BoxGeometry(0.18, 0.18, 0.95), c: '#3a3550', m: M(0.7, 1.32, 0) },
        { g: new THREE.BoxGeometry(0.18, 0.18, 0.95), c: '#3a3550', m: M(-0.7, 1.32, 0) },
        { g: new THREE.CylinderGeometry(0.3, 0.5, 0.45, 12), c: '#3a3550', m: M(0, 0.68, 0) }
      ]));
      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
      glow.position.y = 0.38;
      chair.add(glow);
      fox.add(chair);
      fox.userData.chair = chair;
      fox.userData.seated = true;
      if (fox.userData.kit) {
        for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); e.position.set(s * 0.15, 0.08, 0.37); P.head.add(e); }
      }
    }
  }

  function snapRest(fox) {
    const P = fox.userData.P;
    const keep = (o) => { if (o) o.userData.r0 = { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z }; };
    P.arms.forEach(keep); P.legs.forEach(keep); keep(P.head); keep(P.rig || null);
  }

  /* ---------- state ---------- */
  let mode = 'cpu', phase = 'serve', phaseEnd = 0, paused = false, now = 0;
  let players = [], match = R.createMatch({ target: settings.points });
  let plan = null, blockPlan = null, sched = [];
  let serve = { server: null };
  let result = null, msg = null, flash = null, say = null, caption = null;
  let rallyTouches = 0, demoLineT = 0, demoLine = 0, netShake = 0, crowdJump = 0;
  let lastInput = performance.now() / 1000, sawKeyup = false;
  const safe = { top: 0, bottom: 0, left: 0, right: 0 };
  const ball = { S: new THREE.Vector3(), V: new THREE.Vector3(), t0: 0, lastT: 0, p: new THREE.Vector3(0, C.ballR, 0), live: false, held: null,
    lastTouch: null, lastAction: '', touchSide: -1, touches: 0, hitNet: false, fault: '', serveUntouched: false, blockAt: null, spin: 0 };
  const input = { 1: { joy: { x: 0, y: 0 }, keys: {} }, 2: { joy: { x: 0, y: 0 }, keys: {} } };
  const pointers = new Map();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector2();

  const team = (s) => players.filter((p) => p.side === s);
  const partnerOf = (pl) => players.find((p) => p.side === pl.side && p !== pl);
  const diffOf = () => R.DIFFS[settings.diff];
  function teamName(s) {
    if (mode === 'local') return s === 0 ? 'PLAYER 1' : 'PLAYER 2';
    if (s === 0) return mode === 'demo' ? 'TEAM ACE' : 'YOU + ACE';
    return 'TEAM ' + diffOf().name;
  }
  const teamColor = (s) => (s === 0 ? '#ec3013' : diffOf().team);

  function makePlayer(id, side, slot, castKey, human, ai) {
    const cast = R.CAST[castKey];
    const fox = makeFox(cast);
    if (cast.extra) addExtras(fox, cast.extra);
    snapRest(fox);
    court.add(fox);
    const sh = new THREE.Mesh(flatCircle, shadowMat);
    sh.scale.setScalar(0.8); sh.position.y = 0.035;
    court.add(sh);
    return {
      id, side, slot, char: castKey, name: human === 2 ? 'P2' : cast.name, human, ai, fox, P: fox.userData.P, shadow: sh,
      run: human ? R.HUMAN.run : ai.run, pos: new THREE.Vector3(), vel: new THREE.Vector3(), home: { x: 0, z: 0 },
      face: side === 0 ? Math.PI : 0, anim: 'idle', animT0: 0, jump: null, wake: 0, manualUntil: 0, speed: 0, phase: 0,
      cur: { aL: 0, aR: 0, zL: 0, zR: 0, lL: 0, lR: 0, lean: 0, hx: 0, hz: 0 }
    };
  }

  function clearPlayers() {
    for (const p of players) {
      court.remove(p.fox); court.remove(p.shadow);
      p.fox.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    players = [];
  }

  function buildPlayers() {
    clearPlayers();
    const d = diffOf();
    const humanA = mode === 'demo' ? 0 : 1;
    const humanB = mode === 'local' ? 2 : 0;
    players.push(makePlayer(0, 0, 0, mode === 'local' ? 'p1' : 'you', humanA, humanA ? null : R.MATE));
    players.push(makePlayer(1, 0, 1, 'ace', 0, R.MATE));
    players.push(makePlayer(2, 1, 0, d.captain, humanB, humanB ? null : (mode === 'local' ? R.MATE : d)));
    players.push(makePlayer(3, 1, 1, d.partner, 0, mode === 'local' ? R.MATE : d));
    if (mode === 'demo') players[0].name = 'FOX';
  }

  /* ---------- messages ---------- */
  let msgId = 0;
  function setMsg(text, sub = '', tone = 'info', dur = 1.6) { msg = { text, sub, tone, id: ++msgId, until: now + dur }; emit(true); }
  function setFlash(text, tone = 'good', who = 1) { flash = { text, tone, who, id: ++msgId, until: now + 0.8 }; emit(true); }
  function setSay(pl, text, dur = 1.8) { say = { who: pl.name, text, id: ++msgId, until: now + dur }; emit(true); }
  function setCaption(text) { if (mode !== 'demo') return; caption = { text, id: ++msgId }; demoLineT = now + 4.5; }

  /* ---------- ball ---------- */
  function launch(S, v, t) {
    ball.S.copy(S); ball.V.set(v.x, v.y, v.z); ball.t0 = t; ball.lastT = t;
    ball.live = true; ball.held = null;
    ball.spin = Math.hypot(v.x, v.z) * 2;
  }
  function ballAt(t, out) {
    const d = t - ball.t0;
    return out.set(ball.S.x + ball.V.x * d, ball.S.y + ball.V.y * d - 0.5 * C.g * d * d, ball.S.z + ball.V.z * d);
  }
  function ballVel(t, out) { return out.set(ball.V.x, ball.V.y - C.g * (t - ball.t0), ball.V.z); }
  function netT() {
    if (Math.abs(ball.V.z) < 1e-6) return Infinity;
    const d = -ball.S.z / ball.V.z;
    return d > 1e-6 ? ball.t0 + d : Infinity;
  }
  function groundT() {
    const d = R.timeToY(ball.S, ball.V, C.g, C.ballR);
    return d > 1e-6 ? ball.t0 + d : Infinity;
  }

  function standPoint(p, side, act) {
    const s = R.sideSign(side);
    const off = act === 'set' ? 0.2 : (act === 'attack' || act === 'spike' || act === 'tip') ? 0.45 : 0.5;
    return { x: p.x, z: p.z + s * off };
  }
  const hitX = (pl) => (pl.pos.x >= 0 ? 2.2 : -2.2);
  function wakeAll() { for (const p of players) p.wake = now + (p.ai ? p.ai.react : 0); }

  function clearPlans(side) {
    if (plan && plan.side === side) plan = null;
    if (blockPlan && blockPlan.side === side) blockPlan = null;
    sched = sched.filter((h) => h.kind === 'serve' || h.player.side !== side);
  }

  function startJump(pl, dur, h) { pl.jump = { t0: now, dur, h }; audio.jump(); }

  /* ---------- planning the next touch ---------- */
  function planNext(side, touchNo, want) {
    plan = null;
    if (phase !== 'rally' || !ball.live) return;
    const sgn = R.sideSign(side);
    const top = R.apexY(ball.S, ball.V, C.g);
    let h = want === 'set' ? R.H.set : want === 'attack' ? R.H.spike : R.H.pass;
    if (top < h + 0.2) h = want === 'attack' ? R.H.set : R.H.pass;
    if (top < h + 0.1) h = R.H.dig;
    let dt = R.timeToY(ball.S, ball.V, C.g, h);
    if (dt < 0 || ball.t0 + dt < now + 0.12) { h = R.H.dig; dt = R.timeToY(ball.S, ball.V, C.g, h); }
    if (dt < 0) return;
    const tc = ball.t0 + dt;
    const Cp = ballAt(tc, new THREE.Vector3());
    if (Cp.z * sgn < 0.25) return;
    if (Math.abs(Cp.x) > C.halfW + 5 || Math.abs(Cp.z) > C.halfL + 5) return;
    const land = R.landing(ball.S, ball.V, C.g);
    const out = land ? !R.inCourt(land.x, land.z) : false;
    const cands = team(side).filter((p) => !(ball.touchSide === side && ball.lastTouch === p));
    let pl = null, best = Infinity;
    for (const p of cands) {
      const st = standPoint(Cp, side, want);
      const tt = Math.hypot(p.pos.x - st.x, p.pos.z - st.z) / p.run;
      if (tt < best) { best = tt; pl = p; }
    }
    if (!pl) return;
    const jump = want === 'attack' && h === R.H.spike;
    plan = { side, player: pl, tc, C: Cp, h, want, touchNo, jump, out, land, pressed: false, made: now, leave: false, jumped: false, called: false };
    if (!pl.human) aiDecide(plan);
    if (jump) setupBlock(1 - side, plan);
  }

  function aiDecide(p) {
    const pl = p.player, ai = pl.ai;
    const fromFoe = p.touchNo === 1 && ball.touchSide !== p.side;
    if (fromFoe && p.out && p.land) {
      const margin = R.outBy(p.land.x, p.land.z);
      if (rnd() < ai.judge || margin > 1.2) { p.leave = true; if (rnd() < 0.7) setSay(pl, 'OUT!'); return; }
    }
    let q = R.rollQuality(ai.q, rnd);
    const sp = Math.hypot(ball.V.x, ball.V.z);
    if (fromFoe && sp > 16 && rnd() < 0.35) q = Math.max(0, q - 1);
    let act = 'pass';
    if (p.want === 'set') act = 'set';
    else if (p.want === 'attack') act = p.jump && Math.abs(p.C.z) < 4.2 ? (rnd() < ai.tip ? 'tip' : 'spike') : 'over';
    if (p.touchNo >= 3) act = act === 'pass' || act === 'set' ? 'over' : act;
    sched.push({ t: p.tc, player: pl, action: act, q, kind: 'touch' });
  }

  function setupBlock(defSide, atk) {
    const x = atk.C.x;
    const cands = team(defSide);
    if (!cands.length) return;
    const score = (p) => Math.abs(p.pos.x - x) + Math.abs(p.pos.z) * 0.3;
    const bl = cands.reduce((a, b) => (score(a) <= score(b) ? a : b));
    blockPlan = { side: defSide, player: bl, x, tc: atk.tc, pressed: false, q: 0, jumped: false, made: now };
  }

  function checkBlock(pl, S, v) {
    const bp = blockPlan;
    blockPlan = null;
    if (!bp || bp.side === pl.side) return;
    const bl = bp.player;
    const nc = R.netCross(S, v, C.g);
    if (!nc) return;
    const dx = Math.abs(bl.pos.x - nc.x);
    const atNet = Math.abs(bl.pos.z) < 1.7;
    let prob = bl.human ? (bp.pressed ? [0, 0.15, 0.45, 0.8][bp.q] : 0) : bl.ai.block;
    if (!atNet || dx > 1.4 || nc.y > C.netH + 2.1) prob = 0;
    if (rnd() < prob) ball.blockAt = { blocker: bl, stuff: rnd() < 0.6 };
  }

  /* ---------- hits ---------- */
  function whiff(pl, h, label) {
    pl.anim = 'swing'; pl.animT0 = now;
    if (plan && plan.player === pl) plan = null;
    if (h.human && label) { setFlash(label, 'bad', pl.human); audio.miss(); }
  }

  function doHit(h) {
    if (h.kind === 'serve') return doServe(h);
    const pl = h.player, t = h.t;
    if (phase !== 'rally' || !ball.live) return;
    const S = ballAt(t, new THREE.Vector3());
    if (plan && plan.player === pl) plan = null;
    if (S.y < 0.4) return whiff(pl, h, 'TOO LATE');
    let act = h.action, q = h.q, dive = false;
    const sgn = R.sideSign(pl.side);
    const st = standPoint(S, pl.side, act);
    const d = Math.hypot(pl.pos.x - st.x, pl.pos.z - st.z);
    if (d > 1.8) {
      if (d < 3.4 && S.y < 2.8) { dive = true; q = Math.min(q, 1); if (act !== 'over') act = 'pass'; }
      else return whiff(pl, h, 'TOO FAR');
    }
    if ((act === 'spike' || act === 'tip') && S.y < 3.6) act = 'over';
    if (q <= 0) return whiff(pl, h, 'MISS');

    if (ball.touchSide === pl.side) ball.touches++; else { ball.touchSide = pl.side; ball.touches = 1; }
    if (ball.touches >= 3 && (act === 'pass' || act === 'set')) act = 'over';
    ball.serveUntouched = false; ball.lastTouch = pl; ball.hitNet = false; ball.fault = ''; ball.blockAt = null;
    rallyTouches++;

    const err = R.QUAL.err[q], pow = R.QUAL.pow[q], g = C.g;
    let v;
    if (act === 'pass' || act === 'set') {
      const mate = partnerOf(pl);
      const toHitter = act === 'set' || ball.touches >= 2;
      const T = toHitter ? { x: hitX(mate), y: R.H.spike, z: sgn * 1.3 } : { x: R.clamp(S.x * 0.35, -1.6, 1.6), y: R.H.set, z: sgn * 2.2 };
      T.x += R.gauss(rnd) * err * 1.1;
      T.z += R.gauss(rnd) * err * 1.1;
      T.z = sgn * Math.max(0.7, T.z * sgn);
      v = R.arcTo(S, T, Math.max(toHitter ? 7.6 : 7.0, S.y + 2.2) - (3 - q) * 0.3, g).v;
    } else {
      const foes = players.filter((o) => o.side !== pl.side).map((o) => o.pos);
      let T = h.aim ? { x: h.aim.x, z: h.aim.z } : R.openSpot(pl.side, foes, rnd, 0);
      if (act === 'tip') T = { x: R.clamp(S.x + (rnd() * 2 - 1) * 2, -3.5, 3.5), z: -sgn * (1.6 + rnd() * 1.2) };
      const ae = (pl.ai ? pl.ai.aimErr : R.HUMAN.aimErr) * err;
      T = { x: T.x + R.gauss(rnd) * ae, y: C.ballR, z: T.z + R.gauss(rnd) * ae };
      if (T.z * sgn > -0.8) T.z = -sgn * 1.2;
      if (act === 'spike') {
        let sp = (pl.ai ? pl.ai.spike : R.HUMAN.spike) * pow;
        if (Math.abs(S.z) > 4) sp *= 0.75;
        let sol = R.directTo(S, T, sp, g), nc = R.netCross(S, sol.v, g), tries = 0;
        const fix = !h.human || q >= 2 || rnd() < 0.5;
        while (fix && nc && !nc.clear && tries < 4) { sp *= 0.85; T.z -= sgn * 0.6; sol = R.directTo(S, T, sp, g); nc = R.netCross(S, sol.v, g); tries++; }
        if (fix && nc && !nc.clear) { sol = R.arcTo(S, T, C.netH + 1.8, g); act = 'over'; }
        v = sol.v;
      } else {
        const apex = act === 'tip' ? Math.max(S.y + 0.7, C.netH + 1.3) : Math.max(S.y + 1.6, 6.4);
        v = R.arcTo(S, T, apex, g).v;
      }
    }
    if (act === 'spike') checkBlock(pl, S, v); else if (blockPlan && blockPlan.side !== pl.side) blockPlan = null;
    launch(S, v, t);
    ball.lastAction = act;
    pl.anim = dive ? 'dive' : act; pl.animT0 = now;
    const pan = S.x / 6;
    if (act === 'pass' || act === 'over') audio.bump(pan); else if (act === 'set') audio.set(pan); else if (act === 'tip') audio.tip(pan); else audio.spike(pan);
    if (h.human) {
      const lbl = (dive ? 'DIVE! ' : '') + R.QUAL.label[q];
      setFlash(lbl, q === 3 ? 'good' : q === 2 ? 'ok' : 'meh', pl.human);
      if (q === 3) audio.perfect(); else if (q === 2) audio.good();
    }
    if (pl.char === 'hope' && rnd() < 0.15) setSay(pl, 'I HEAR IT.');
    if (mode === 'demo') {
      const map = { pass: 'PASS: FIRST TOUCH GOES UP TO THE SETTER.', set: 'SET: SECOND TOUCH FLOATS IT TO THE HITTER.', spike: 'SPIKE: THIRD TOUCH SMASHES IT OVER.', over: 'OVER: A SAFE LOB INTO OPEN SAND.', tip: 'TIP: A SOFT DROP JUST OVER THE NET.' };
      setCaption(map[act] || '');
    }
    wakeAll();
    afterLaunch(pl.side, act);
  }

  function afterLaunch(side, act) {
    plan = null;
    if (act !== 'spike') blockPlan = null;
    const nc = R.netCross(ball.S, ball.V, C.g);
    const tg = R.timeToY(ball.S, ball.V, C.g, C.ballR);
    if (nc && nc.t < tg) {
      if (nc.clear && !ball.blockAt) planNext(1 - side, 1, 'pass');
      return;
    }
    const next = ball.touches >= 2 || act === 'set' ? 'attack' : 'set';
    planNext(side, ball.touches + 1, next);
  }

  /* ---------- serve ---------- */
  function setupServe() {
    phase = 'serve';
    plan = null; blockPlan = null; sched = [];
    rallyTouches = 0;
    const s = match.serving, sgn = R.sideSign(s), os = -sgn;
    const srv = team(s)[match.serverIdx[s]];
    const mate = partnerOf(srv);
    serve = { server: srv, ready: false, charging: false, power: 0, chargeT0: 0, aimX: 0, tossed: false, who: srv.human, aiAt: now + 1.3 + rnd() * 0.6, idleFrom: now };
    srv.home = { x: sgn * 1.4, z: sgn * (C.halfL + 1.3) };
    mate.home = { x: -sgn * 1.8, z: sgn * 4.4 };
    const rec = team(1 - s);
    rec[0].home = { x: -2.2, z: os * 6.2 };
    rec[1].home = { x: 2.2, z: os * 6.2 };
    ball.live = false; ball.held = srv; ball.lastTouch = null; ball.touchSide = s; ball.touches = 0;
    ball.hitNet = false; ball.fault = ''; ball.blockAt = null; ball.serveUntouched = false; ball.lastAction = '';
    if (mode === 'demo') setCaption(srv.side === 0 ? 'SERVE: HOLD, THEN RELEASE IN THE WHITE ZONE.' : 'RECEIVE: PASS THE SERVE UP TO YOUR SETTER.');
    emit(true);
  }

  function startCharge(who) {
    if (phase !== 'serve' || !serve.server || serve.server.human !== who || serve.tossed || !serve.ready || serve.charging) return;
    serve.charging = true; serve.chargeT0 = now; serve.power = 0;
    emit(true);
  }
  function releaseServe(who) {
    if (!serve.charging || serve.server.human !== who) return;
    serve.charging = false;
    toss(serve.power, serve.aimX);
  }
  function toss(power, aimX) {
    const srv = serve.server;
    serve.tossed = true; serve.power = power; serve.aimX = aimX;
    const f = srv.face;
    const S = new THREE.Vector3(srv.pos.x + Math.sin(f) * 0.4, 2.5, srv.pos.z + Math.cos(f) * 0.4);
    launch(S, { x: 0, y: 5.4, z: 0 }, now);
    srv.anim = 'serve'; srv.animT0 = now;
    audio.toss();
    sched.push({ t: now + 5.4 / C.g, player: srv, kind: 'serve', power, aimX });
    emit(true);
  }
  function aiServe() {
    const srv = serve.server, ai = srv.ai;
    const fault = rnd() < ai.serveFault;
    const T = R.serveTarget(srv.side, rnd, fault);
    serve.ai = { T, jump: !fault && rnd() < ai.jumpServe };
    toss(0, T.x);
    if (serve.ai.jump) srv.jumpPlanned = true;
  }

  function doServe(h) {
    const srv = h.player, s = srv.side, sgn = R.sideSign(s);
    const S = ballAt(h.t, new THREE.Vector3());
    let v;
    if (srv.human) {
      const p = h.power;
      const T = { x: R.clamp(h.aimX, -C.halfW - 2, C.halfW + 2), y: C.ballR, z: -sgn * R.serveDepth(p) };
      if (p < R.SERVE_ZONE.net) v = R.arcTo(S, { x: T.x, y: C.ballR, z: -sgn * 2.2 }, S.y + 0.1, C.g).v;
      else {
        let apex = 5.4 + p * 1.6, sol = R.arcTo(S, T, apex, C.g), nc = R.netCross(S, sol.v, C.g), k = 0;
        while (nc && !nc.clear && k++ < 5) { apex += 0.5; sol = R.arcTo(S, T, apex, C.g); nc = R.netCross(S, sol.v, C.g); }
        v = sol.v;
      }
    } else {
      const { T, jump } = serve.ai || { T: R.serveTarget(s, rnd, false), jump: false };
      const Tt = { x: T.x, y: C.ballR, z: T.z };
      if (T.kind === 'net') v = R.arcTo(S, { x: T.x, y: C.ballR, z: -sgn * 2.0 }, S.y + 0.1, C.g).v;
      else if (jump) {
        S.y += 1.0;
        let sol = R.directTo(S, Tt, 15, C.g), nc = R.netCross(S, sol.v, C.g);
        if (nc && !nc.clear) sol = R.arcTo(S, Tt, srv.ai.serveApex, C.g);
        v = sol.v;
      } else v = R.arcTo(S, Tt, srv.ai.serveApex, C.g).v;
    }
    launch(S, v, h.t);
    ball.lastTouch = srv; ball.lastAction = 'serve'; ball.serveUntouched = true; ball.touchSide = s; ball.touches = 0;
    srv.anim = 'serve'; srv.animT0 = now - 0.32;
    audio.serve(S.x / 6);
    phase = 'rally';
    wakeAll();
    afterLaunch(s, 'serve');
    emit(true);
  }

  /* ---------- net and ground events ---------- */
  function onNet(t) {
    if (phase !== 'rally') return;
    const p = ballAt(t, new THREE.Vector3()), v = ballVel(t, new THREE.Vector3());
    const from = v.z < 0 ? 0 : 1;
    if (ball.blockAt && Math.abs(p.x) <= C.halfW + 0.15) {
      const b = ball.blockAt, bl = b.blocker;
      ball.blockAt = null;
      const as = R.sideSign(1 - bl.side), ds = R.sideSign(bl.side);
      ball.lastTouch = bl; ball.touchSide = bl.side; ball.touches = 1; ball.lastAction = 'block'; ball.serveUntouched = false;
      clearPlans(bl.side);
      audio.block(); netShake = 0.6;
      if (bl.human) setFlash('BLOCK!', 'good', bl.human); else setSay(bl, 'BLOCK!', 1.2);
      if (b.stuff) launch(new THREE.Vector3(p.x, Math.max(p.y, C.netH + 0.3), as * 0.12), { x: (rnd() * 2 - 1) * 1.5, y: -2.5, z: as * 6 }, t);
      else { launch(new THREE.Vector3(p.x, Math.max(p.y, C.netH + 0.3), ds * 0.12), { x: (rnd() * 2 - 1) * 1.2, y: 4.4, z: ds * 3.2 }, t); planNext(bl.side, 2, 'set'); }
      wakeAll();
      return;
    }
    if (Math.abs(p.x) > C.halfW + 0.15) { ball.fault = 'wide'; clearPlans(1 - from); return; }
    const top = C.netH + C.ballR * 0.6, bottom = C.netH - C.netBand - C.ballR;
    if (p.y < top && p.y > bottom) {
      ball.hitNet = true; netShake = 1;
      audio.net();
      const s = R.sideSign(from);
      launch(new THREE.Vector3(p.x, p.y, s * 0.1), { x: v.x * 0.3, y: Math.min(v.y, 0) * 0.3 + (p.y > C.netH - 0.3 ? 1.4 : -0.4), z: s * Math.abs(v.z) * 0.15 }, t);
      clearPlans(1 - from);
      if (ball.touchSide === from && ball.lastAction !== 'serve' && ball.touches < 3) planNext(from, ball.touches + 1, ball.touches >= 2 ? 'attack' : 'pass');
      if (mode === 'demo') setCaption('NET! THE BALL MUST GO OVER THE TOP TAPE.');
    } else if (p.y <= bottom) {
      ball.fault = 'under';
      clearPlans(1 - from);
    }
  }

  function onGround(t) {
    const p = ballAt(t, new THREE.Vector3()), v = ballVel(t, new THREE.Vector3());
    const pan = p.x / 6;
    audio.sand(pan, Math.min(0.7, 0.25 + Math.abs(v.y) * 0.03));
    if (phase === 'rally') { impact.position.set(p.x, 0.06, p.z); impactT = now; resolvePoint(p); }
    const vy = -v.y * 0.3;
    if (vy > 1.2) launch(new THREE.Vector3(p.x, C.ballR, p.z), { x: v.x * 0.35, y: vy, z: v.z * 0.35 }, t);
    else { ball.live = false; ball.p.set(p.x, C.ballR, p.z); }
  }

  function resolvePoint(p) {
    phase = 'point'; phaseEnd = now + 1.9;
    plan = null; blockPlan = null; sched = [];
    const landSide = p.z >= 0 ? 0 : 1;
    const lt = ball.lastTouch;
    const inb = R.inCourt(p.x, p.z) && !ball.fault;
    let win, why;
    if (inb) {
      win = 1 - landSide;
      if (lt && lt.side !== landSide) why = ball.serveUntouched ? 'ACE!' : ball.lastAction === 'spike' ? 'KILL!' : ball.lastAction === 'block' ? 'STUFF BLOCK!' : ball.lastAction === 'tip' ? 'TIP DROPS IN!' : 'IN!';
      else why = ball.hitNet ? 'NET!' : 'BALL DOWN';
    } else {
      win = lt ? 1 - lt.side : 1 - landSide;
      why = ball.fault === 'under' ? 'UNDER THE NET' : ball.fault === 'wide' ? 'WIDE OF THE ANTENNA' : 'OUT!';
    }
    match.longest = Math.max(match.longest, rallyTouches);
    R.awardPoint(match, win);
    const goodForYou = mode === 'local' ? true : win === 0;
    setMsg(why, 'POINT ' + teamName(win), mode === 'local' ? 'info' : (goodForYou ? 'good' : 'bad'), 1.8);
    for (const pl of players) { pl.anim = pl.side === win ? 'cheer' : 'sad'; pl.animT0 = now; }
    audio.whistle();
    audio.point(goodForYou);
    if (win === 0 || mode === 'local') { audio.cheer(); crowdJump = 1; } else audio.aww();
    if (mode === 'cpu' && rnd() < 0.45) {
      const cap = team(1)[0], L = LINES[cap.char];
      if (L) { const arr = win === 1 ? L.win : L.lose; setSay(cap, arr[(rnd() * arr.length) | 0]); }
    }
    if (mode === 'demo') setCaption(why.indexOf('OUT') >= 0 || why.indexOf('WIDE') >= 0 ? 'OUT: THE TEAM THAT TOUCHED IT LAST LOSES THE POINT.' : 'POINT! EVERY RALLY SCORES, WHOEVER SERVED.');
    emit(true);
  }

  function afterPoint() {
    if (match.over) return finish();
    const mp = R.matchPoint(match);
    if (mp >= 0) setMsg('MATCH POINT', teamName(mp), 'info', 1.4);
    setupServe();
  }

  function finish() {
    phase = 'over'; phaseEnd = now + 6;
    const w = match.winner;
    const d = diffOf();
    let gold = 0, xp = 0, stars = 0, newBest = false;
    const margin = match.score[w] - match.score[1 - w];
    let best = store.get('best', 0) || 0;
    if (mode === 'cpu' && w === 0) {
      stars = R.starsFor(match, 0);
      gold = d.gold + (stars - 1) * 5;
      xp = d.xp + stars * 5;
      store.gold(gold);
      store.set('xp', (store.get('xp', 0) || 0) + xp);
      store.set('wins', (store.get('wins', 0) || 0) + 1);
      const sk = 'stars.' + d.key;
      if (stars > (store.get(sk, 0) || 0)) store.set(sk, stars);
      if (margin > best) { best = margin; newBest = true; store.set('best', best); }
    }
    if (match.longest > (store.get('rally', 0) || 0)) store.set('rally', match.longest);
    const title = mode === 'local' ? (w === 0 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS') : mode === 'demo' ? teamName(w) + ' WINS' : (w === 0 ? 'YOU WIN' : teamName(1) + ' WINS');
    result = { win: mode === 'cpu' ? w === 0 : null, title, score: match.score.slice(), teams: [teamName(0), teamName(1)],
      best, newBest, gold, xp, stars, rally: match.longest, bestRally: store.get('rally', 0) || 0, diffName: d.name, mode };
    if (mode === 'cpu' && w !== 0) audio.lose(); else audio.win();
    for (const pl of players) { pl.anim = pl.side === w ? 'cheer' : 'sad'; pl.animT0 = now; }
    emit(true);
  }

  /* ---------- event loop for the ball (exact, frame-rate independent) ---------- */
  function sim() {
    for (let guard = 0; guard < 10; guard++) {
      let best = null;
      const consider = (t, k) => { if (t > ball.lastT + 1e-7 && t <= now && (!best || t < best.t)) best = { t, k }; };
      if (ball.live) { consider(netT(), 'net'); consider(groundT(), 'ground'); }
      for (const h of sched) if (h.t <= now && (!best || h.t < best.t)) best = { t: Math.max(h.t, ball.lastT), k: 'hit', h };
      if (!best) break;
      ball.lastT = best.t;
      if (best.k === 'hit') { sched = sched.filter((x) => x !== best.h); best.h.t = best.t; doHit(best.h); }
      else if (best.k === 'net') onNet(best.t);
      else onGround(best.t);
    }
    if (ball.live) ball.lastT = now;
  }

  /* ---------- human input ---------- */
  const realNow = () => performance.now() / 1000;
  function promptFor(who) {
    if (phase === 'serve' && serve.server && serve.server.human === who && !serve.tossed) return { who, action: 'SERVE', hold: true, ready: serve.ready };
    if (phase !== 'rally') return null;
    if (plan && plan.player.human === who && !plan.pressed && !plan.leave) {
      let a = plan.want === 'set' ? 'SET' : plan.want === 'attack' ? (plan.jump ? 'SPIKE' : 'OVER') : 'PASS';
      return { who, action: a, out: plan.out && plan.touchNo === 1 };
    }
    if (blockPlan && blockPlan.player.human === who && !blockPlan.pressed) return { who, action: 'BLOCK' };
    return null;
  }

  function press(who, action = 'smart', aim = null, src = '') {
    lastInput = realNow();
    audio.unlock();
    if (paused || phase === 'over' || mode === 'demo') return;
    if (phase === 'serve') {
      if (serve.charging && serve.who === who) { if (src === 'key' && !sawKeyup) releaseServe(who); return; }
      if (aim && serve.server && serve.server.human === who) serve.aimX = aim.x;
      startCharge(who);
      return;
    }
    if (phase !== 'rally') return;
    const pl = players.find((p) => p.human === who);
    if (!pl) return;
    if (plan && plan.player === pl && !plan.pressed) {
      if (plan.leave) return;
      const e = now - plan.tc;
      const q = R.qualityFromError(e);
      plan.pressed = true;
      if (aim) { aimMark.position.set(aim.x, 0.06, aim.z); aimUntil = now + 1.2; }
      if (q === 0) { whiff(pl, { human: true }, e < 0 ? 'TOO EARLY' : 'TOO LATE'); return; }
      let act;
      const want = plan.want, deep = Math.abs(plan.C.z) > 4.2;
      const attack = () => (plan.jump && !deep && plan.C.y > 3.6 ? 'spike' : 'over');
      if (action === 'smart' || action === 'serve') act = want === 'attack' ? attack() : want;
      else if (action === 'pass') act = 'pass';
      else if (action === 'set') act = 'set';
      else act = plan.C.y > 3.6 && !deep ? 'spike' : 'over';
      if (act === 'dig') act = 'pass';
      sched.push({ t: Math.max(now, plan.tc), player: pl, action: act, q, aim, kind: 'touch', human: true });
      return;
    }
    if (blockPlan && blockPlan.player === pl && !blockPlan.pressed) {
      blockPlan.pressed = true;
      blockPlan.q = R.qualityFromError(now - (blockPlan.tc - 0.2));
      startJump(pl, 0.7, 1.35);
      pl.anim = 'block'; pl.animT0 = now;
      if (blockPlan.q === 0) setFlash(now < blockPlan.tc - 0.2 ? 'BLOCK EARLY' : 'BLOCK LATE', 'meh', who);
    }
  }
  function release(who) { releaseServe(who); }

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -((e.clientY - r.top) / r.height) * 2 + 1;
    camera.updateMatrixWorld();
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(ground, hit) ? hit : null;
  }
  function onPointerDown(e) {
    if (e.target !== canvas) return;
    if (world) { e.preventDefault(); e.stopImmediatePropagation(); }
    else if (container && container.focus) { try { container.focus({ preventScroll: true }); } catch (er) { /* old browser */ } }
    const r = canvas.getBoundingClientRect();
    const who = mode === 'local' && e.clientY - r.top < r.height * 0.45 ? 2 : 1;
    const hit = pick(e);
    const mySide = who === 1 ? 0 : 1;
    let aim = null;
    if (hit && (hit.z >= 0 ? 0 : 1) !== mySide && R.inCourt(hit.x, hit.z, 1.5)) aim = { x: hit.x, z: hit.z };
    pointers.set(e.pointerId, { who, x0: e.clientX, aim0: serve.aimX || 0 });
    press(who, 'smart', aim, 'tap');
  }
  function onPointerMove(e) {
    const a = pointers.get(e.pointerId);
    if (!a) return;
    if (serve.charging && serve.who === a.who) {
      const r = canvas.getBoundingClientRect();
      serve.aimX = R.clamp(a.aim0 + ((e.clientX - a.x0) / Math.max(200, r.width)) * 14, -C.halfW - 2, C.halfW + 2);
    }
  }
  function onPointerUp(e) {
    const a = pointers.get(e.pointerId);
    if (!a) return;
    pointers.delete(e.pointerId);
    release(a.who);
  }

  const KEYMOVE = { w: [1, 'u'], a: [1, 'l'], s: [1, 'd'], d: [1, 'r'], arrowup: [0, 'u'], arrowleft: [0, 'l'], arrowdown: [0, 'd'], arrowright: [0, 'r'] };
  function key(e) {
    if (!e || !e.key) return;
    const up = e.type === 'keyup';
    if (up) sawKeyup = true;
    const k = e.key.toLowerCase();
    let handled = true;
    if (KEYMOVE[k]) {
      const who = KEYMOVE[k][0] === 1 ? 1 : (mode === 'local' ? 2 : 1);
      input[who].keys[KEYMOVE[k][1]] = up ? 0 : realNow();
      if (!up) lastInput = realNow();
    } else if (k === ' ' || k === 'spacebar') { if (up) release(1); else if (!e.repeat) press(1, 'smart', null, 'key'); }
    else if (k === 'enter') { const who = mode === 'local' ? 2 : 1; if (up) release(who); else if (!e.repeat) press(who, 'smart', null, 'key'); }
    else if (k === '1' || k === 'j') { if (!up && !e.repeat) press(1, 'pass', null, 'key'); }
    else if (k === '2' || k === 'k') { if (!up && !e.repeat) press(1, 'set', null, 'key'); }
    else if (k === '3' || k === 'l') { if (!up && !e.repeat) press(1, 'attack', null, 'key'); }
    else handled = false;
    if (handled && e.preventDefault) e.preventDefault();
  }
  function keyHeld(who, d) {
    const t = input[who].keys[d];
    if (!t) return 0;
    return sawKeyup || realNow() - t < 0.55 ? 1 : 0;
  }
  function manualVec(who) {
    const I = input[who];
    let x = I.joy.x + keyHeld(who, 'r') - keyHeld(who, 'l');
    let y = I.joy.y + keyHeld(who, 'u') - keyHeld(who, 'd');
    const l = Math.hypot(x, y);
    if (l < 0.15) return { x: 0, z: 0 };
    if (l > 1) { x /= l; y /= l; }
    return { x, z: -y };
  }

  /* ---------- movement and animation ---------- */
  function targetFor(pl) {
    const sgn = R.sideSign(pl.side);
    if (phase === 'serve') return pl.home;
    if (phase !== 'rally') return null;
    if (plan && plan.player === pl) return plan.leave ? null : standPoint(plan.C, pl.side, plan.want);
    if (blockPlan && blockPlan.player === pl) return { x: R.clamp(blockPlan.x, -C.halfW + 0.5, C.halfW - 0.5), z: sgn * 0.8 };
    if (plan && plan.side === pl.side) {
      if (plan.want === 'pass' || plan.want === 'dig') return { x: R.clamp(plan.C.x * 0.35, -1.6, 1.6), z: sgn * 2.2 };
      if (plan.want === 'set') return { x: hitX(pl), z: sgn * 3.6 };
      return { x: -plan.C.x * 0.3, z: sgn * 4.8 };
    }
    if (blockPlan && blockPlan.side === pl.side) return { x: R.clamp(-blockPlan.x * 0.5, -3, 3), z: sgn * 6.4 };
    return { x: pl.slot === 0 ? -2.3 : 2.3, z: sgn * 6.0 };
  }

  function movePlayers(dt) {
    for (const pl of players) {
      let vx = 0, vz = 0;
      const run = phase === 'serve' ? Math.max(pl.run, 9) : pl.run;
      const man = pl.human ? manualVec(pl.human) : null;
      if (man && (man.x || man.z) && !(phase === 'serve' && serve.server === pl)) {
        vx = man.x * run; vz = man.z * run; pl.manualUntil = now + 0.6;
      } else if (pl.human && (now < pl.manualUntil || (!settings.autoRun && phase === 'rally'))) {
        /* manual control: stand still */
      } else if (!pl.human && phase === 'rally' && now < pl.wake) {
        /* still reacting */
      } else {
        const t = targetFor(pl);
        if (t) {
          const dx = t.x - pl.pos.x, dz = t.z - pl.pos.z, d = Math.hypot(dx, dz);
          if (d > 0.04) { const s = Math.min(run, d * 7); vx = (dx / d) * s; vz = (dz / d) * s; }
        }
      }
      const k = 1 - Math.exp(-dt * 14);
      pl.vel.x += (vx - pl.vel.x) * k; pl.vel.z += (vz - pl.vel.z) * k;
      pl.pos.x += pl.vel.x * dt; pl.pos.z += pl.vel.z * dt;
      const sgn = R.sideSign(pl.side);
      pl.pos.x = R.clamp(pl.pos.x, -C.halfW - 3, C.halfW + 3);
      pl.pos.z = sgn * R.clamp(pl.pos.z * sgn, 0.5, C.halfL + 2.8);
      pl.speed = Math.hypot(pl.vel.x, pl.vel.z);
      let fa;
      if (phase === 'rally' && (ball.live || ball.held)) fa = Math.atan2(ball.p.x - pl.pos.x, ball.p.z - pl.pos.z);
      else if (pl.speed > 1.5 && phase !== 'rally') fa = Math.atan2(pl.vel.x, pl.vel.z);
      else fa = pl.side === 0 ? Math.PI : 0;
      if (phase === 'serve' && serve.server === pl && pl.speed < 1.5) fa = pl.side === 0 ? Math.PI : 0;
      let da = fa - pl.face;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      pl.face += da * (1 - Math.exp(-dt * 10));
    }
  }

  function animFox(pl, dt) {
    const P = pl.P, c = pl.cur, fox = pl.fox;
    const T = { aL: -0.25, aR: -0.25, zL: 0.06, zR: -0.06, lL: 0, lR: 0, lean: 0, hx: 0, hz: 0 };
    let a = pl.anim;
    const age = now - pl.animT0;
    if (a !== 'idle' && a !== 'cheer' && a !== 'sad' && age > (ANIM_DUR[a] || 0.6)) a = pl.anim = 'idle';
    if ((a === 'cheer' || a === 'sad') && phase !== 'point' && phase !== 'over') a = pl.anim = 'idle';
    const sp = pl.speed;
    pl.phase += dt * (3 + sp * 1.9);
    const useKit = fox.userData.kit && kit && typeof kit.animFox === 'function' && a === 'idle';
    if (useKit) { try { kit.animFox(fox, dt, sp); } catch (e) { /* kit failed: keep own pose */ } }
    if (a === 'idle') {
      const m = Math.min(1, sp / 5);
      T.lL = Math.sin(pl.phase) * 0.9 * m; T.lR = -T.lL;
      T.aL = -0.3 - T.lL * 0.5; T.aR = -0.3 + T.lL * 0.5;
      if ((phase === 'rally' || (phase === 'serve' && serve.server !== pl)) && sp < 1.2) { T.aL = T.aR = -0.65; T.zL = 0.18; T.zR = -0.18; T.lean = 0.14; }
    } else if (a === 'pass') { T.aL = T.aR = -1.15; T.zL = 0.3; T.zR = -0.3; T.lean = 0.28; }
    else if (a === 'over') { T.aL = T.aR = -1.3; T.zL = 0.3; T.zR = -0.3; T.lean = 0.18; }
    else if (a === 'set') { T.aL = T.aR = -2.85; T.zL = -0.12; T.zR = 0.12; }
    else if (a === 'spike') { if (age < 0.16) { T.aR = -3.1; T.aL = -2.5; } else { T.aR = -0.5; T.aL = -0.9; T.lean = 0.25; } }
    else if (a === 'tip') { T.aR = -2.9; T.aL = -1.6; }
    else if (a === 'block') { T.aL = T.aR = -3.05; T.zL = -0.08; T.zR = 0.08; }
    else if (a === 'serve') { if (age < 0.3) { T.aL = -2.9; T.aR = -2.7; } else { T.aR = -0.7; T.aL = -0.6; T.lean = 0.2; } }
    else if (a === 'dive') { T.aL = T.aR = -1.6; T.zL = 0.3; T.zR = -0.3; T.lean = 1.05; }
    else if (a === 'swing') { T.aL = T.aR = -1.3; T.lean = 0.2; }
    else if (a === 'cheer') { const w = Math.sin(now * 12) * 0.3; T.aL = -2.9 + w; T.aR = -2.9 - w; T.zL = -0.3; T.zR = 0.3; }
    else if (a === 'sad') { T.aL = T.aR = 0.1; T.hx = 0.45; T.lean = 0.12; }
    if (a === 'serve' && serve.server === pl && !serve.tossed) { T.aL = -1.2; T.aR = -0.4; }
    if (fox.userData.seated) { T.lL = T.lR = -1.45; T.lean = Math.min(T.lean, 0.3); }
    if (pl.char === 'hope' && phase === 'rally' && a === 'idle') T.hz = 0.22;
    const k = 1 - Math.exp(-dt * 16);
    for (const n in T) c[n] += (T[n] - c[n]) * k;
    const r0 = (o) => o.userData.r0 || { x: 0, y: 0, z: 0 };
    P.arms[0].rotation.x = r0(P.arms[0]).x + c.aL; P.arms[0].rotation.z = r0(P.arms[0]).z + c.zL;
    P.arms[1].rotation.x = r0(P.arms[1]).x + c.aR; P.arms[1].rotation.z = r0(P.arms[1]).z + c.zR;
    if (!useKit || fox.userData.seated) {
      P.legs[0].rotation.x = r0(P.legs[0]).x + c.lL;
      P.legs[1].rotation.x = r0(P.legs[1]).x + c.lR;
    }
    if (P.head) { P.head.rotation.x = r0(P.head).x + c.hx; P.head.rotation.z = r0(P.head).z + c.hz; }
    if (P.rig) P.rig.rotation.x = r0(P.rig).x + c.lean;
    let y = 0;
    if (pl.jump) {
      const u = (now - pl.jump.t0) / pl.jump.dur;
      if (u >= 1 || u < 0) pl.jump = null; else y = pl.jump.h * 4 * u * (1 - u);
    }
    if (a === 'dive') y -= 0.35 * Math.min(1, age * 5);
    if (fox.userData.seated) {
      y += 0.35 + Math.sin(now * 3 + pl.id) * 0.06;
      if (P.rig) P.rig.position.y = 0;
      if (fox.userData.chair) fox.userData.chair.position.y = -0.35;
    }
    fox.position.set(pl.pos.x, y, pl.pos.z);
    fox.rotation.y = pl.face;
    pl.shadow.position.set(pl.pos.x, 0.035, pl.pos.z);
    const ss = 0.85 - Math.min(0.4, Math.max(0, y) * 0.15);
    pl.shadow.scale.set(ss, 1, ss);
  }

  /* ---------- camera fit ---------- */
  const fitPts = [];
  const camPos = new THREE.Vector3(0, 16, 24), camLook = new THREE.Vector3(0, 0, 1);
  const goalPos = new THREE.Vector3(), goalLook = new THREE.Vector3();
  let camReady = false;
  function viewSize() {
    if (world) { const el = world.renderer.domElement; return [el.clientWidth || 1, el.clientHeight || 1]; }
    return [Math.max(1, container.clientWidth), Math.max(1, container.clientHeight)];
  }
  function fitCamera() {
    const [w, h] = viewSize();
    const portrait = h > w * 1.05;
    camera.fov = world ? (world.camera.fov || 50) : (portrait ? 60 : 42);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitPts.length = 0;
    const ex = C.halfW + 0.7, ez = C.halfL + 0.6;
    fitPts.push([ex, 0, ez], [-ex, 0, ez], [ex, 0, -ez], [-ex, 0, -ez], [C.netHalfW, C.netH + 0.4, 0], [-C.netHalfW, C.netH + 0.4, 0]);
    for (const p of players) fitPts.push([p.pos.x - 0.6, 0, p.pos.z + 0.9], [p.pos.x + 0.6, 0, p.pos.z + 0.9], [p.pos.x, 0, p.pos.z - 0.9], [p.pos.x, 3, p.pos.z]);
    const pitch = portrait ? 0.9 : 0.6;
    const fwd = new THREE.Vector3(0, -Math.sin(pitch), -Math.cos(pitch));
    const fx0 = -1 + (2 * safe.left) / w + 0.05, fx1 = 1 - (2 * safe.right) / w - 0.05;
    const fy0 = -1 + (2 * safe.bottom) / h + 0.06, fy1 = 1 - (2 * safe.top) / h - 0.05;
    const fw = Math.max(0.2, fx1 - fx0), fh = Math.max(0.2, fy1 - fy0);
    const target = new THREE.Vector3(0, 0, 0.5);
    let d = 26;
    const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
    for (let it = 0; it < 7; it++) {
      camera.position.copy(target).addScaledVector(fwd, -d);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const q of fitPts) {
        v.set(q[0], q[1], q[2]).project(camera);
        if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y;
      }
      const s = Math.max((x1 - x0) / fw, (y1 - y0) / fh);
      const dcx = (x0 + x1) / 2 - (fx0 + fx1) / 2, dcy = (y0 + y1) / 2 - (fy0 + fy1) / 2;
      const hh = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), hw = hh * camera.aspect;
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, dcx * hw).addScaledVector(up, dcy * hh);
      d = R.clamp(d * (1 + (s - 1) * 0.9), 8, 90);
    }
    goalPos.copy(target).addScaledVector(fwd, -d);
    goalLook.copy(target);
  }
  function placeCamera(dt, snap) {
    fitCamera();
    if (snap || !camReady) { camPos.copy(goalPos); camLook.copy(goalLook); camReady = true; }
    else { const k = 1 - Math.exp(-dt * 3); camPos.lerp(goalPos, k); camLook.lerp(goalLook, k); }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.updateMatrixWorld();
    if (world) {
      scene.updateWorldMatrix(true, false);
      wcam.position.copy(camera.position); scene.localToWorld(wcam.position);
      scene.getWorldQuaternion(_q); wcam.quaternion.copy(_q).multiply(camera.quaternion);
      wcam.fov = camera.fov; wcam.aspect = camera.aspect; wcam.updateProjectionMatrix(); wcam.updateMatrixWorld();
    }
  }

  /* ---------- per frame ---------- */
  function updateRings() {
    for (const who of [1, 2]) {
      const R1 = rings[who];
      let tgt = null, tc = 0, key = null;
      if (phase === 'rally' && plan && plan.player.human === who && !plan.pressed && !plan.leave) { tgt = plan.C; tc = plan.tc; key = plan; }
      else if (phase === 'rally' && blockPlan && blockPlan.player.human === who && !blockPlan.pressed) {
        tgt = tmpA.set(blockPlan.x, C.netH + 0.9, R.sideSign(blockPlan.side) * 0.4); tc = blockPlan.tc - 0.2; key = blockPlan;
      }
      const left = tc - now;
      if (!tgt || left > 1.1 || left < -0.25) { R1.g.visible = false; if (!tgt) R1.key = null; continue; }
      if (R1.key !== key) { R1.key = key; R1.tick = -1; }
      R1.g.visible = true;
      R1.g.position.copy(tgt);
      R1.g.quaternion.copy(camera.quaternion);
      const s = 0.48 + Math.max(0, left) * 3.0;
      R1.outer.scale.setScalar(s);
      R1.outer.material.opacity = left < 0 ? 0.5 : 1;
      const beats = [0.6, 0.4, 0.2, 0];
      while (R1.tick < 3 && left <= beats[R1.tick + 1]) {
        R1.tick++;
        if (left > -0.05) { if (R1.tick < 3) audio.tick(); else audio.cue(); }
      }
    }
  }

  function updateMarkers() {
    if (phase === 'serve' && serve.server && serve.server.human && !serve.tossed && serve.ready) {
      const sgn = R.sideSign(serve.server.side);
      const p = serve.charging ? serve.power : 0.5;
      serveMark.visible = true;
      serveMark.position.set(R.clamp(serve.aimX, -C.halfW - 2, C.halfW + 2), 0.06, -sgn * R.serveDepth(p));
      const ok = p >= R.SERVE_ZONE.net && p <= R.SERVE_ZONE.long && Math.abs(serve.aimX) <= C.halfW;
      serveMark.material.color.set(ok ? 0xffd23a : 0xec3013);
      serveMark.material.opacity = serve.charging ? 1 : 0.5;
    } else serveMark.visible = false;
    aimMark.visible = now < aimUntil;
    if (aimMark.visible) aimMark.material.opacity = Math.min(1, (aimUntil - now) * 2);
    const ia = now - impactT;
    impact.visible = ia >= 0 && ia < 0.6;
    if (impact.visible) { impact.scale.setScalar(0.6 + ia * 3); impact.material.opacity = 1 - ia / 0.6; }
  }

  function updateBallVisual(dt) {
    if (ball.live) ballAt(now, ball.p);
    else if (ball.held) {
      const s = ball.held, f = s.face;
      ball.p.set(s.pos.x + Math.sin(f) * 0.55 + Math.cos(f) * 0.25, 1.75, s.pos.z + Math.cos(f) * 0.55 - Math.sin(f) * 0.25);
    }
    ballMesh.position.copy(ball.p);
    if (ball.live) { ballMesh.rotation.x += dt * ball.spin; ballMesh.rotation.z += dt * ball.spin * 0.3; }
    ballShadow.position.set(ball.p.x, 0.04, ball.p.z);
    const hs = Math.max(0, ball.p.y);
    const s = 0.45 * (1 - Math.min(0.55, hs / 16));
    ballShadow.scale.set(s, 1, s);
    shadowMat.opacity = 0.32;
    netMesh.position.z = Math.sin(now * 45) * 0.06 * netShake;
    netShake = Math.max(0, netShake - dt * 2.5);
    if (crowd) { crowd.position.y = Math.abs(Math.sin(now * 14)) * 0.3 * crowdJump; crowdJump = Math.max(0, crowdJump - dt * 0.8); }
    const me = players.find((p) => p.human === 1);
    if (me && settings.ballSound) {
      const on = ball.live && phase === 'rally';
      const dd = Math.hypot(ball.p.x - me.pos.x, ball.p.z - me.pos.z);
      audio.setBall(on, 260 + (1 - Math.min(1, dd / 18)) * 520 + ball.p.y * 12, (ball.p.x - me.pos.x) / 5, 0.05);
    } else audio.setBall(false);
  }

  function updateRally() {
    if (plan) {
      const p = plan;
      if (p.jump && !p.jumped && now >= p.tc - 0.42) {
        p.jumped = true;
        const st = standPoint(p.C, p.side, 'attack');
        if (Math.hypot(p.player.pos.x - st.x, p.player.pos.z - st.z) < 2.6) startJump(p.player, 0.84, 1.5);
      }
      if (p.player.human && !p.called && p.out && p.touchNo === 1 && now >= p.tc - 0.65) {
        p.called = true;
        const mate = partnerOf(p.player);
        if (mate && !mate.human) setSay(mate, 'OUT! LET IT GO.', 1.4);
      }
      if (p.player.human && !p.pressed && now > p.tc + 0.24) {
        p.pressed = true;
        if (!p.out) { setFlash('MISSED', 'bad', p.player.human); audio.miss(); }
        else setFlash('GOOD LEAVE', 'good', p.player.human);
      }
    }
    if (blockPlan && !blockPlan.player.human && !blockPlan.jumped && now >= blockPlan.tc - 0.22) {
      blockPlan.jumped = true;
      const bl = blockPlan.player;
      if (Math.abs(bl.pos.z) < 2.2) { startJump(bl, 0.7, 1.35); bl.anim = 'block'; bl.animT0 = now; }
    }
  }

  function updateServe(dt) {
    const srv = serve.server;
    if (!srv) return;
    const arrived = Math.hypot(srv.pos.x - srv.home.x, srv.pos.z - srv.home.z) < 0.35;
    if (arrived && !serve.ready) { serve.ready = true; serve.idleFrom = realNow(); emit(true); }
    if (serve.charging) {
      const per = 1.7, x = ((now - serve.chargeT0) % per) / per;
      serve.power = x < 0.5 ? x * 2 : 2 - x * 2;
      const m = manualVec(srv.human);
      serve.aimX = R.clamp(serve.aimX + m.x * dt * 7, -C.halfW - 2, C.halfW + 2);
    }
    if (!srv.human && !serve.tossed) {
      if (!arrived) serve.aiAt = Math.max(serve.aiAt, now + 0.7);
      else if (now >= serve.aiAt) aiServe();
    }
    if (srv.jumpPlanned && serve.tossed && now >= ball.t0 + 0.05) { srv.jumpPlanned = false; startJump(srv, 0.7, 1.0); }
  }

  function update(dt) {
    if (phase === 'serve') updateServe(dt);
    sim();
    if (phase === 'rally') updateRally();
    if (phase === 'point' && now >= phaseEnd) afterPoint();
    if (phase === 'over' && mode === 'demo' && now >= phaseEnd) start('demo');
    if (msg && now > msg.until) { msg = null; emit(true); }
    if (flash && now > flash.until) { flash = null; emit(true); }
    if (say && now > say.until) { say = null; emit(true); }
    if (mode === 'demo' && now > demoLineT) { caption = { text: DEMO_LINES[demoLine++ % DEMO_LINES.length], id: ++msgId }; demoLineT = now + 4.5; emit(true); }
    movePlayers(dt);
  }

  let raf = 0, last = performance.now(), lastEmit = 0, alive = true;
  const steps = Math.max(1, Math.min(20, opts.timeScale | 0));
  function frame(t) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    if (!paused) for (let i = 0; i < steps; i++) { now += dt; update(dt); if (i < steps - 1) for (const p of players) animFox(p, dt); }
    for (const p of players) animFox(p, paused ? 0 : dt);
    updateBallVisual(paused ? 0 : dt);
    placeCamera(dt, false);
    updateRings();
    updateMarkers();
    if (!world) {
      const [w, h] = viewSize();
      const sz = renderer.getSize(tmpB);
      if (sz.x !== w || sz.y !== h) renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    }
    if (t - lastEmit > 100) emit();
  }

  /* ---------- HUD ---------- */
  function hud() {
    const d = diffOf();
    const p1 = promptFor(1), p2 = mode === 'local' ? promptFor(2) : null;
    const idle = realNow() - lastInput;
    let hint = null;
    if (mode !== 'demo' && !paused && p1 && idle > 3) {
      if (p1.action === 'SERVE') hint = p1.ready ? 'hold' : null;
      else if (!p1.out) hint = 'tap';
    }
    const mp = R.matchPoint(match);
    return {
      key: GAME.key, name: GAME.name, mode, phase, paused,
      diff: settings.diff, diffName: d.name, diffLabel: d.label,
      teams: [0, 1].map((s) => ({ name: teamName(s), score: match.score[s], color: teamColor(s), serving: match.serving === s })),
      target: match.target, matchPoint: mp >= 0 ? teamName(mp) : '',
      server: serve.server ? serve.server.name : '',
      serve: phase === 'serve' && serve.server && serve.server.human && !serve.tossed
        ? { who: serve.server.human, ready: !!serve.ready, charging: !!serve.charging, power: serve.power || 0, net: R.SERVE_ZONE.net, long: R.SERVE_ZONE.long }
        : null,
      prompt: p1, prompt2: p2,
      touches: ball.touches, touchSide: ball.touchSide,
      msg: msg ? { text: msg.text, sub: msg.sub, tone: msg.tone, id: msg.id } : null,
      flash: flash ? { text: flash.text, tone: flash.tone, who: flash.who, id: flash.id } : null,
      say: say ? { who: say.who, text: say.text, id: say.id } : null,
      caption: mode === 'demo' && caption ? caption.text : '',
      hint,
      settings: Object.assign({}, settings),
      result,
      gold: store.total(),
      best: store.get('best', 0) || 0
    };
  }
  let lastSig = '';
  function emit(force) {
    lastEmit = performance.now();
    const h = hud();
    if (!force) {
      const sig = JSON.stringify(h);
      if (sig === lastSig) return;
      lastSig = sig;
    } else lastSig = '';
    try { onState(h); } catch (e) { /* page error must not stop the game */ }
  }

  /* ---------- flow control ---------- */
  function start(m) {
    mode = m === 'local' || m === 'demo' ? m : 'cpu';
    buildPlayers();
    match = R.createMatch({ target: settings.points, first: mode === 'demo' ? (rnd() < 0.5 ? 0 : 1) : 0 });
    result = null; msg = null; flash = null; say = null; caption = null; demoLine = 0; demoLineT = now;
    setupServe();
    for (const p of players) { p.pos.set(p.home.x, 0, p.home.z); p.vel.set(0, 0, 0); p.face = p.side === 0 ? Math.PI : 0; }
    serve.ready = true;
    if (!serve.server.human) serve.aiAt = now + 1.4;
    lastInput = realNow();
    placeCamera(0, true);
    emit(true);
  }

  function saveSettings() {
    const s = Object.assign({}, settings);
    if (world) delete s.music;
    store.set('settings', Object.assign({}, store.get('settings', {}) || {}, s));
  }
  function setOpt(k, v) {
    if (!(k in settings)) return;
    settings[k] = v;
    if (k === 'sound') audio.setSound(v);
    if (k === 'music') audio.setMusic(v);
    if (k === 'ballSound') audio.setBallSound(v);
    saveSettings();
    if (k === 'diff' || k === 'points') start(mode);
    emit(true);
  }

  /* ---------- listeners ---------- */
  let ro = null;
  if (world) {
    window.addEventListener('pointerdown', onPointerDown, true);
  } else {
    canvas.addEventListener('pointerdown', onPointerDown);
    if (container) {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
      container.style.outline = 'none';
      container.addEventListener('keydown', key);
      container.addEventListener('keyup', key);
    }
    if (typeof ResizeObserver !== 'undefined' && container) { ro = new ResizeObserver(() => placeCamera(0, false)); ro.observe(container); }
  }
  window.addEventListener('pointermove', onPointerMove, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('pointercancel', onPointerUp, true);
  const onBlur = () => { for (const w of [1, 2]) { input[w].keys = {}; input[w].joy = { x: 0, y: 0 }; } };
  window.addEventListener('blur', onBlur);

  start(opts.mode || 'cpu');
  raf = requestAnimationFrame(frame);

  function destroy() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    if (world) window.removeEventListener('pointerdown', onPointerDown, true);
    else {
      canvas.removeEventListener('pointerdown', onPointerDown);
      if (container) { container.removeEventListener('keydown', key); container.removeEventListener('keyup', key); }
    }
    window.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    window.removeEventListener('pointercancel', onPointerUp, true);
    window.removeEventListener('blur', onBlur);
    if (ro) ro.disconnect();
    audio.close();
    const kill = (root) => root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    kill(scene);
    if (envRoot !== scene) kill(envRoot);
    grad.dispose();
    if (world) world.parent.remove(scene);
    else {
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    try { onState(null); } catch (e) { /* ignore */ }
  }

  return {
    hud,
    setSafe(s = {}) {
      safe.top = Math.max(0, +s.top || 0); safe.bottom = Math.max(0, +s.bottom || 0);
      safe.left = Math.max(0, +s.left || 0); safe.right = Math.max(0, +s.right || 0);
      placeCamera(0, false);
    },
    start(m) { audio.unlock(); start(m); },
    restart() { start(mode); },
    playAgain() { audio.unlock(); start(mode === 'demo' ? 'cpu' : mode); },
    key,
    get camera() { return world ? wcam : camera; },
    snapCam() { placeCamera(0, true); },
    destroy,
    /* page buttons */
    press(action = 'smart', who = 1) { press(who, action, null, 'button'); },
    release(action = 'smart', who = 1) { release(who); },
    joy(x = 0, y = 0, who = 1) { input[who].joy.x = R.clamp(+x || 0, -1, 1); input[who].joy.y = R.clamp(+y || 0, -1, 1); if (x || y) lastInput = realNow(); },
    pause(on) { paused = !!on; if (paused) { releaseServe(1); releaseServe(2); } emit(true); },
    setOpt,
    setDiff(i) { setOpt('diff', R.clamp(i | 0, 0, 2)); },
    setPoints(n) { setOpt('points', [7, 11, 15].includes(+n) ? +n : 11); },
    unlockAudio() { audio.unlock(); },
    /* test hook: a snapshot of the rally state, for automated checks */
    debug() {
      return { now, phase, live: ball.live, p: ball.p.toArray().map((v) => +v.toFixed(2)), V: ball.V.toArray().map((v) => +v.toFixed(2)), t0: +ball.t0.toFixed(2), lastT: +ball.lastT.toFixed(2),
        touches: ball.touches, side: ball.touchSide, last: ball.lastAction, plan: plan && { who: plan.player.name, tc: +plan.tc.toFixed(2), want: plan.want, leave: plan.leave }, sched: sched.map((h) => h.kind + ':' + (h.action || '') + '@' + h.t.toFixed(2)),
        players: players.map((q) => q.name + ' ' + q.pos.x.toFixed(1) + ',' + q.pos.z.toFixed(1)) };
    }
  };
}

export default createVolleyball;
